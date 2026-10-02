import express from "express";
import { query } from "../db/database.js";
import { authenticate } from "../middleware/auth.js";
import { isPositiveInteger, parseDate } from "../utils.js";

const router = express.Router();
router.use(authenticate);

router.post("/", async (req, res) => {
  const { centre_id, test_id, appointment_time } = req.body;

  if (!isPositiveInteger(centre_id) || !isPositiveInteger(test_id)) {
    return res.status(400).json({ error: "Valid centre_id and test_id are required" });
  }

  const appointment = parseDate(appointment_time);
  if (!appointment) {
    return res.status(400).json({ error: "Valid appointment_time is required" });
  }

  if (appointment <= new Date()) {
    return res.status(400).json({ error: "Appointment must be in the future" });
  }

  const test = await query(
    `SELECT t.id, t.name, t.price, t.centre_id, c.name AS centre_name
     FROM diagnostic_tests t
     JOIN diagnostic_centres c ON c.id = t.centre_id
     WHERE t.id = $1`,
    [Number(test_id)]
  );

  if (!test.rowCount) return res.status(404).json({ error: "Diagnostic test not found" });

  const selectedTest = test.rows[0];
  if (selectedTest.centre_id !== Number(centre_id)) {
    return res.status(400).json({ error: "Selected test is not offered by this centre" });
  }

  const result = await query(
    `INSERT INTO bookings
      (user_id, test_id, centre_id, appointment_time, amount, status)
     VALUES ($1, $2, $3, $4, $5, 'PENDING')
     RETURNING *`,
    [
      req.user.id,
      selectedTest.id,
      selectedTest.centre_id,
      appointment.toISOString(),
      selectedTest.price
    ]
  );

  res.status(201).json({
    message: "Booking created. Payment is pending.",
    booking: result.rows[0]
  });
});

router.get("/", async (req, res) => {
  const result = await query(
    `SELECT
       b.id, b.appointment_time, b.amount, b.status, b.created_at, b.updated_at,
       c.name AS centre_name, c.location,
       t.name AS test_name
     FROM bookings b
     JOIN diagnostic_centres c ON c.id = b.centre_id
     JOIN diagnostic_tests t ON t.id = b.test_id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [req.user.id]
  );

  res.json({ bookings: result.rows });
});

router.get("/:id", async (req, res) => {
  if (!isPositiveInteger(req.params.id)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const result = await query(
    `SELECT
       b.*, c.name AS centre_name, c.location,
       t.name AS test_name
     FROM bookings b
     JOIN diagnostic_centres c ON c.id = b.centre_id
     JOIN diagnostic_tests t ON t.id = b.test_id
     WHERE b.id = $1`,
    [Number(req.params.id)]
  );

  if (!result.rowCount) return res.status(404).json({ error: "Booking not found" });

  const booking = result.rows[0];
  if (booking.user_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "You are not allowed to access this booking" });
  }

  const payments = await query(
    "SELECT id, transaction_id, amount, status, created_at FROM payments WHERE booking_id = $1 ORDER BY id DESC",
    [booking.id]
  );

  res.json({ booking: { ...booking, payments: payments.rows } });
});

router.patch("/:id/cancel", async (req, res) => {
  if (!isPositiveInteger(req.params.id)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const result = await query("SELECT * FROM bookings WHERE id = $1", [Number(req.params.id)]);
  if (!result.rowCount) return res.status(404).json({ error: "Booking not found" });

  const booking = result.rows[0];
  if (booking.user_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "You are not allowed to cancel this booking" });
  }

  if (booking.status === "CANCELLED") {
    return res.status(400).json({ error: "Booking is already cancelled" });
  }
  if (booking.status === "FAILED") {
    return res.status(400).json({ error: "Failed bookings cannot be cancelled" });
  }

  const updated = await query(
    `UPDATE bookings
     SET status = 'CANCELLED', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [booking.id]
  );

  res.json({ message: "Booking cancelled", booking: updated.rows[0] });
});

export default router;
