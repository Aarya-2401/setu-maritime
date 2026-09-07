// ---------------------------------------------------------------------------
// Route: /api/v1/harbors — Fishing Harbor Reference Data
// SQL Source: dim_fishing_harbors + dim_fishing_harbor_facilities
// ---------------------------------------------------------------------------
const router = require('express').Router();
const { pool } = require('../config/db');

// GET /api/v1/harbors — List all 56 fishing harbors
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT harbor_id, landing_center_name, sector, state, district,
              latitude, longitude, harbor_type, vessel_capacity,
              regional_language, facilities
       FROM dim_fishing_harbors
       ORDER BY state, landing_center_name`
    );
    res.json({ count: rows.length, data: rows });
  } catch (err) {
    console.error('Error in /api/v1/harbors:', err);
    res.status(500).json({ error: 'DB Query Failed', message: err?.message, code: err?.code, sqlMessage: err?.sqlMessage });
  }
});

// GET /api/v1/harbors/:id — Single harbor by ID
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM dim_fishing_harbors WHERE harbor_id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Harbor not found' });
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
});

// GET /api/v1/harbors/:id/facilities — 1NF facility list for a harbor
router.get('/:id/facilities', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT facility_name FROM dim_fishing_harbor_facilities WHERE harbor_id = ?`,
      [req.params.id]
    );
    res.json({ harbor_id: parseInt(req.params.id), count: rows.length, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
