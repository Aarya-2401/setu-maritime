// ---------------------------------------------------------------------------
// Route: /api/v1/pfz — PFZ Advisory Domain
// SQL Source: v_pfz_operational_advisory
// ---------------------------------------------------------------------------
const router = require('express').Router();
const { pool } = require('../config/db');

// GET /api/v1/pfz/advisories?harbor_id=X — All PFZ zones from a harbor
router.get('/advisories', async (req, res, next) => {
  try {
    const { harbor_id } = req.query;

    let query, params;

    if (harbor_id) {
      query = `SELECT * FROM v_pfz_operational_advisory WHERE harbor_id = ? ORDER BY advisory_date DESC`;
      params = [parseInt(harbor_id, 10)];
    } else {
      // Return latest advisory batch across all harbors
      query = `SELECT * FROM v_pfz_operational_advisory
               WHERE advisory_date = (SELECT MAX(advisory_date) FROM fact_pfz_advisories)
               ORDER BY distance_km ASC`;
      params = [];
    }

    const [rows] = await pool.query(query, params);
    res.json({ count: rows.length, data: rows });
  } catch (err) { next(err); }
});

// GET /api/v1/pfz/advisories/latest — Latest advisory batch (all harbors)
router.get('/advisories/latest', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM v_pfz_operational_advisory
       WHERE advisory_date = (SELECT MAX(advisory_date) FROM fact_pfz_advisories)
       ORDER BY distance_km ASC`
    );
    res.json({ count: rows.length, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
