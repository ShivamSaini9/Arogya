import express from "express";
import authRoutes from "./routes/auth.routes.js";
import centreRoutes from "./routes/centre.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "diagnostic-booking-api" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/centres", centreRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/payments", paymentRoutes);

  app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "Endpoint not found" });
    }
    res.status(404).send("Not found");
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
