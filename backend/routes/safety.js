// ---------------------------------------------------------------------------
// Route: /api/v1/safety — Marine Safety Domain
// SQL Source: v_ocean_safety_nowcast + fact_marine_alerts
// ---------------------------------------------------------------------------
const router = require('express').Router();
const { pool } = require('../config/db');

// GET /api/v1/safety/nowcast?harbor_id=X — Latest safety snapshot for a harbor
// GET /api/v1/safety/nowcast?harbor_id=X&hours=24 — Hourly history for charts
router.get('/nowcast', async (req, res, next) => {
  try {
    const { harbor_id, hours } = req.query;
    if (!harbor_id) {
      return res.status(400).json({ error: 'harbor_id query parameter is required' });
    }

    const limit = hours ? parseInt(hours, 10) : 1;

    const [rows] = await pool.query(
      `SELECT * FROM v_ocean_safety_nowcast
       WHERE harbor_id = ?
       ORDER BY datetime_utc DESC
       LIMIT ?`,
      [parseInt(harbor_id, 10), limit]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No safety data found for this harbor' });
    }

    // Return single object for latest, array for history
    res.json({
      harbor_id: parseInt(harbor_id, 10),
      count: rows.length,
      data: limit === 1 ? rows[0] : rows,
    });
  } catch (err) { next(err); }
});

// GET /api/v1/safety/nowcast/all — Latest snapshot for ALL harbors (for map coloring)
router.get('/nowcast/all', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT v.* FROM v_ocean_safety_nowcast v
       INNER JOIN (
         SELECT harbor_id, MAX(datetime_utc) AS max_dt
         FROM v_ocean_safety_nowcast
         GROUP BY harbor_id
       ) latest ON v.harbor_id = latest.harbor_id AND v.datetime_utc = latest.max_dt
       ORDER BY v.harbor_id`
    );
    res.json({ count: rows.length, data: rows });
  } catch (err) { next(err); }
});

// GET /api/v1/safety/alerts — All active marine alerts
router.get('/alerts', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM fact_marine_alerts WHERE is_active = TRUE ORDER BY severity`
    );
    res.json({ count: rows.length, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
