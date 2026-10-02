import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db/database.js";
import { env } from "../config/env.js";
import { authenticate } from "../middleware/auth.js";
import { isValidEmail } from "../utils.js";

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.jwtSecret,
    { expiresIn: "1d" }
  );
}

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "Name must contain at least 2 characters" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Valid email is required" });
  }
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Password must contain at least 6 characters" });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);

    if (existing.rowCount) {
      return res.status(409).json({ error: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    const user = result.rows[0];
    return res.status(201).json({
      message: "Signup successful",
      token: createToken(user),
      user
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Email is already registered" });
    }
    throw error;
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!isValidEmail(email) || typeof password !== "string") {
    return res.status(400).json({ error: "Valid email and password are required" });
  }

  const result = await query(
    "SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = $1",
    [email.trim().toLowerCase()]
  );

  if (!result.rowCount || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const user = result.rows[0];
  delete user.password_hash;

  return res.json({
    message: "Login successful",
    token: createToken(user),
    user
  });
});

router.get("/me", authenticate, async (req, res) => {
  const result = await query(
    "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
    [req.user.id]
  );

  if (!result.rowCount) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ user: result.rows[0] });
});

export default router;
