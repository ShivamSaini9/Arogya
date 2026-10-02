import express from "express";
import { query } from "../db/database.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { isPositiveInteger } from "../utils.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const result = await query(`
    SELECT
      c.id AS centre_id,
      c.name AS centre_name,
      c.location,
      c.city,
      t.id AS test_id,
      t.name AS test_name,
      t.price
    FROM diagnostic_centres c
    LEFT JOIN diagnostic_tests t ON t.centre_id = c.id
    ORDER BY c.id, t.id
  `);

  const centres = [];
  for (const row of result.rows) {
    let centre = centres.find(c => c.id === row.centre_id);
    if (!centre) {
      centre = {
        id: row.centre_id,
        name: row.centre_name,
        location: row.location,
        city: row.city,
        tests: []
      };
      centres.push(centre);
    }

    if (row.test_id) {
      centre.tests.push({
        id: row.test_id,
        name: row.test_name,
        price: row.price
      });
    }
  }

  res.json({ centres });
});

router.get("/:id/tests", async (req, res) => {
  if (!isPositiveInteger(req.params.id)) {
    return res.status(400).json({ error: "Invalid centre id" });
  }

  const centre = await query(
    "SELECT id, name, location, city FROM diagnostic_centres WHERE id = $1",
    [Number(req.params.id)]
  );
  if (!centre.rowCount) return res.status(404).json({ error: "Centre not found" });

  const tests = await query(
    "SELECT id, name, price FROM diagnostic_tests WHERE centre_id = $1 ORDER BY id",
    [Number(req.params.id)]
  );

  res.json({ centre: centre.rows[0], tests: tests.rows });
});

router.post("/", authenticate, requireAdmin, async (req, res) => {
  const { name, location, city } = req.body;
  if (!name || !location || !city) {
    return res.status(400).json({ error: "name, location and city are required" });
  }

  const result = await query(
    `INSERT INTO diagnostic_centres (name, location, city)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name.trim(), location.trim(), city.trim()]
  );

  res.status(201).json({ centre: result.rows[0] });
});

router.post("/:id/tests", authenticate, requireAdmin, async (req, res) => {
  if (!isPositiveInteger(req.params.id)) {
    return res.status(400).json({ error: "Invalid centre id" });
  }

  const { name, price } = req.body;
  if (!name || Number.isNaN(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ error: "Valid test name and non-negative price are required" });
  }

  const centre = await query("SELECT id FROM diagnostic_centres WHERE id = $1", [Number(req.params.id)]);
  if (!centre.rowCount) return res.status(404).json({ error: "Centre not found" });

  const result = await query(
    `INSERT INTO diagnostic_tests (centre_id, name, price)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [Number(req.params.id), name.trim(), Number(price)]
  );

  res.status(201).json({ test: result.rows[0] });
});

export default router;
