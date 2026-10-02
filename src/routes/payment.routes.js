import express from "express";
import { query, withTransaction } from "../db/database.js";
import { authenticate } from "../middleware/auth.js";
import { isPositiveInteger } from "../utils.js";

const router = express.Router();

/**
 * Simulated payment endpoint.
 * Only the booking owner (or admin) can initiate payment.
 */
router.post("/", authenticate, async (req, res) => {
  const { booking_id, simulate_status = "SUCCESS" } = req.body;

  if (!isPositiveInteger(booking_id)) {
    return res.status(400).json({ error: "Valid booking_id is required" });
  }

  const requestedStatus = String(simulate_status).toUpperCase();
  if (!["SUCCESS", "FAILED"].includes(requestedStatus)) {
    return res.status(400).json({ error: "simulate_status must be SUCCESS or FAILED" });
  }

  const result = await query("SELECT * FROM bookings WHERE id = $1", [Number(booking_id)]);
  if (!result.rowCount) return res.status(404).json({ error: "Booking not found" });

  const booking = result.rows[0];

  if (booking.user_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "You are not allowed to pay for this booking" });
  }

  if (booking.status !== "PENDING") {
    return res.status(400).json({
      error: `Payment is allowed only for PENDING bookings. Current status: ${booking.status}`
    });
  }

  const transactionId = `SIM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const payment = await withTransaction(async client => {
    const paymentResult = await client.query(
      `INSERT INTO payments (booking_id, transaction_id, amount, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, booking_id, transaction_id, amount, status, created_at`,
      [booking.id, transactionId, booking.amount, requestedStatus]
    );

    await client.query(
      `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2`,
      [requestedStatus === "SUCCESS" ? "CONFIRMED" : "FAILED", booking.id]
    );

    return paymentResult.rows[0];
  });

  res.json({
    message: requestedStatus === "SUCCESS" ? "Payment successful" : "Payment failed",
    payment
  });
});

/**
 * Simulated provider webhook.
 * event_id is the idempotency key.
 *
 * The event insert + payment insert + booking update happen in one transaction.
 * Therefore a failed processing attempt can be safely retried.
 */
router.post("/webhook", async (req, res) => {
  const {
    event_id,
    event_type = "payment.updated",
    booking_id,
    status,
    transaction_id,
    amount
  } = req.body;

  if (!event_id || typeof event_id !== "string") {
    return res.status(400).json({ error: "event_id is required" });
  }
  if (!isPositiveInteger(booking_id)) {
    return res.status(400).json({ error: "Valid booking_id is required" });
  }

  const paymentStatus = String(status || "").toUpperCase();
  if (!["SUCCESS", "FAILED"].includes(paymentStatus)) {
    return res.status(400).json({ error: "status must be SUCCESS or FAILED" });
  }

  try {
    const result = await withTransaction(async client => {
      // UNIQUE(event_id) + ON CONFLICT makes duplicate delivery safe.
      const event = await client.query(
        `INSERT INTO webhook_events
          (event_id, booking_id, event_type, status, payload)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (event_id) DO NOTHING
         RETURNING id`,
        [
          event_id.trim(),
          Number(booking_id),
          event_type,
          paymentStatus,
          req.body
        ]
      );

      if (!event.rowCount) {
        return { duplicate: true };
      }

      const bookingResult = await client.query(
        "SELECT * FROM bookings WHERE id = $1 FOR UPDATE",
        [Number(booking_id)]
      );

      if (!bookingResult.rowCount) {
        const error = new Error("Booking not found");
        error.statusCode = 404;
        throw error;
      }

      const booking = bookingResult.rows[0];

      // Never let a later webhook turn a cancelled booking into a confirmed one.
      if (booking.status === "CANCELLED") {
        return { ignored: true, bookingStatus: booking.status };
      }

      const finalStatus = paymentStatus === "SUCCESS" ? "CONFIRMED" : "FAILED";
      const txnId = transaction_id?.trim() || `WEBHOOK_${event_id.trim()}`;

      const existingPayment = await client.query(
        "SELECT id FROM payments WHERE transaction_id = $1",
        [txnId]
      );

      let payment = null;
      if (!existingPayment.rowCount) {
        const paymentResult = await client.query(
          `INSERT INTO payments
            (booking_id, transaction_id, amount, status)
           VALUES ($1, $2, $3, $4)
           RETURNING id, booking_id, transaction_id, amount, status, created_at`,
          [booking.id, txnId, amount ?? booking.amount, paymentStatus]
        );
        payment = paymentResult.rows[0];
      }

      await client.query(
        `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2`,
        [finalStatus, booking.id]
      );

      return { duplicate: false, payment, bookingStatus: finalStatus };
    });

    if (result.duplicate) {
      return res.status(200).json({
        status: "duplicate",
        message: "Webhook was already processed",
        idempotent: true
      });
    }

    if (result.ignored) {
      return res.status(200).json({
        status: "ignored",
        message: "Booking was already cancelled",
        idempotent: false
      });
    }

    return res.status(200).json({
      status: "processed",
      idempotent: false,
      payment: result.payment,
      booking_status: result.bookingStatus
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    if (error.code === "23505") {
      return res.status(409).json({ error: "Duplicate payment transaction" });
    }
    throw error;
  }
});

export default router;
