# EVE Healthcare — Diagnostic Booking Service

A small backend-focused diagnostic test booking service built for the EVE Healthcare SDE Intern assignment.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- JWT authentication
- bcrypt password hashing
- React + Vite for a small demo UI
- Docker / Docker Compose

The implementation intentionally avoids Redis, Celery, queues and other unnecessary infrastructure. The goal is a simple codebase that is easy to explain in an interview.

## Architecture

```text
React UI
   |
   v
Express API
   |
   +-- Auth routes       -> users
   +-- Centre routes     -> diagnostic_centres, diagnostic_tests
   +-- Booking routes    -> bookings
   +-- Payment routes    -> payments, webhook_events
   |
   v
PostgreSQL
```

Backend structure:

```text
src/
  app.js
  config/
    env.js
  db/
    database.js
  middleware/
    auth.js
  routes/
    auth.routes.js
    centre.routes.js
    booking.routes.js
    payment.routes.js
  utils.js

database/
  schema.sql

tests/
  health.test.js
  utils.test.js
```

## Run locally

### Option 1 — Docker

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

### Option 2 — Local Node + PostgreSQL

Prerequisites:

- Node.js 20+
- PostgreSQL 14+

Create a PostgreSQL database named `eve_healthcare`.

Create `.env`:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eve_healthcare
JWT_SECRET=replace-with-a-random-secret
DB_SSL=false
```

Then:

```bash
npm install
npm run dev
```

The application creates the required tables and sample centres/tests automatically on startup. If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are configured, it also creates that admin account once.

## Authentication

### Signup

`POST /api/auth/signup`

```json
{
  "name": "Shivam Saini",
  "email": "shivam@example.com",
  "password": "secret123"
}
```

The API returns a JWT token.

Public signup always creates a `patient`. Admin privileges are not accepted from the signup request.

### Demo admin

For the assignment demo, Docker creates an admin account using:

```text
Email: admin@example.com
Password: admin123
```

Change these values in `docker-compose.yml` for your own submission. Public signup cannot create admin accounts.

### Login

`POST /api/auth/login`

```json
{
  "email": "shivam@example.com",
  "password": "secret123"
}
```

Use the returned token:

```text
Authorization: Bearer <JWT>
```

## Diagnostic Centres & Tests

### Get centres

`GET /api/centres`

Public endpoint. Returns centres and the tests offered by each centre.

### Get tests for one centre

`GET /api/centres/:id/tests`

### Add centre

`POST /api/centres`

Admin only.

```json
{
  "name": "New Diagnostic Centre",
  "location": "Bistupur",
  "city": "Jamshedpur"
}
```

### Add test

`POST /api/centres/:id/tests`

Admin only.

```json
{
  "name": "Vitamin D",
  "price": 900
}
```

## Booking API

All booking endpoints require JWT authentication.

### Create booking

`POST /api/bookings`

```json
{
  "centre_id": 1,
  "test_id": 1,
  "appointment_time": "2030-01-10T10:00:00Z"
}
```

Important implementation details:

- The appointment must be in the future.
- The test must belong to the selected centre.
- The amount is read from the database, not accepted from the client.
- New bookings start as `PENDING`.

### Get my bookings

`GET /api/bookings`

A patient can only see their own bookings.

### Get one booking

`GET /api/bookings/:id`

Patients can only access their own booking. Admins can access any booking.

### Cancel booking

`PATCH /api/bookings/:id/cancel`

Only the booking owner or an admin can cancel it.

## Simulated Payment

### Process payment

`POST /api/payments`

Authentication required.

```json
{
  "booking_id": 1,
  "simulate_status": "SUCCESS"
}
```

For a failure simulation:

```json
{
  "booking_id": 1,
  "simulate_status": "FAILED"
}
```

State changes:

```text
PENDING + SUCCESS -> CONFIRMED
PENDING + FAILED  -> FAILED
```

Payments are stored in the `payments` table.

## Payment Webhook & Idempotency

`POST /api/payments/webhook`

Example:

```json
{
  "event_id": "evt_1001",
  "event_type": "payment.succeeded",
  "booking_id": 1,
  "status": "SUCCESS",
  "transaction_id": "provider_txn_1001",
  "amount": 350
}
```

### How idempotency works

`event_id` is unique in `webhook_events`.

The webhook handler performs these operations inside one PostgreSQL transaction:

1. Insert the event with `ON CONFLICT (event_id) DO NOTHING`.
2. If the event already exists, return `200` with `idempotent: true`.
3. Lock the booking using `FOR UPDATE`.
4. Insert the payment if its transaction id is new.
5. Update the booking status.
6. Commit everything together.

If processing fails, the transaction rolls back, including the webhook event insert. The provider can therefore retry safely.

## Booking State

```text
             SUCCESS
PENDING ----------------> CONFIRMED
   |
   | FAILED
   v
 FAILED

PENDING/CONFIRMED -----> CANCELLED
```

A cancelled booking cannot later be confirmed by a webhook.

## Database Design

- `users` — authentication and roles.
- `diagnostic_centres` — diagnostic locations.
- `diagnostic_tests` — tests offered by a centre and their prices.
- `bookings` — user appointment and booking state.
- `payments` — simulated payment records.
- `webhook_events` — processed provider events for idempotency.

The booking stores `amount` as a snapshot of the test price at booking time. This means a later test-price change does not change an existing booking.

## Tests

Run:

```bash
npm test
```

The current tests cover basic API health and validation utilities. With more time, I would add database-backed integration tests for:

- signup/login
- unauthorized booking access
- centre/test mismatch
- successful and failed payments
- duplicate webhook delivery

## Important Assumptions

- Payments are simulated; no real gateway is integrated.
- Appointment slot capacity is outside the scope of the assignment.
- `event_id` is supplied by the simulated payment provider and is the webhook idempotency key.
- Public users are patients; admin accounts are created separately rather than allowing users to self-register as admins.

## What I would improve with more time

- More integration tests and test database setup.
- Webhook signature verification.
- Appointment-slot availability and double-booking prevention.
- Pagination for large booking/centre lists.
- Structured logging and request IDs.
- Refresh tokens / secure cookie-based authentication for a production frontend.
