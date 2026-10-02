import pg from "pg";
import { env } from "../config/env.js";
import bcrypt from "bcryptjs";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.dbSsl ? { rejectUnauthorized: false } : false
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function initDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'patient'
        CHECK (role IN ('patient', 'admin')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS diagnostic_centres (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      location VARCHAR(255) NOT NULL,
      city VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS diagnostic_tests (
      id SERIAL PRIMARY KEY,
      centre_id INTEGER NOT NULL REFERENCES diagnostic_centres(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      test_id INTEGER NOT NULL REFERENCES diagnostic_tests(id),
      centre_id INTEGER NOT NULL REFERENCES diagnostic_centres(id),
      appointment_time TIMESTAMPTZ NOT NULL,
      amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      transaction_id VARCHAR(100) UNIQUE NOT NULL,
      amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
      status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id SERIAL PRIMARY KEY,
      event_id VARCHAR(100) UNIQUE NOT NULL,
      booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
      event_type VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL,
      payload JSONB NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_tests_centre_id ON diagnostic_tests(centre_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
  `);

  await seedDatabase();
  await seedAdmin();
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const normalizedEmail = email.toLowerCase();
  const existing = await query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
  if (existing.rowCount) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')`,
    ["Administrator", normalizedEmail, passwordHash]
  );
}

async function seedDatabase() {
  const { rows } = await query("SELECT COUNT(*)::int AS count FROM diagnostic_centres");
  if (rows[0].count > 0) return;

  const centres = [
    ["Arogya Central Diagnostics", "Main Road", "Jamshedpur"],
    ["CityCare Diagnostics", "Bistupur", "Jamshedpur"],
    ["HealthFirst Labs", "Sakchi", "Jamshedpur"]
  ];

  for (const centre of centres) {
    const result = await query(
      `INSERT INTO diagnostic_centres (name, location, city)
       VALUES ($1, $2, $3) RETURNING id`,
      centre
    );
    const centreId = result.rows[0].id;

    const tests = [
      ["Complete Blood Count (CBC)", 350],
      ["Thyroid Profile", 550],
      ["Lipid Profile", 650]
    ];

    for (const [name, price] of tests) {
      await query(
        `INSERT INTO diagnostic_tests (centre_id, name, price)
         VALUES ($1, $2, $3)`,
        [centreId, name, price]
      );
    }
  }
}
