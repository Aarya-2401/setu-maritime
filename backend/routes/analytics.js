// ---------------------------------------------------------------------------
// Route: /api/v1/analytics — Fisheries Analytics Domain
// SQL Source: v_fisheries_productivity_analytics + dim_species_trend_diagnostics
// ---------------------------------------------------------------------------
const router = require('express').Router();
const { pool } = require('../config/db');

// GET /api/v1/analytics/catch-trends?state=X — Catch data by state
// GET /api/v1/analytics/catch-trends?species=X — Catch data by species
// GET /api/v1/analytics/catch-trends?year=2023 — Catch data by year
router.get('/catch-trends', async (req, res, next) => {
  try {
    const { state, species, year } = req.query;
    let conditions = [];
    let params = [];

    if (state) {
      conditions.push('state = ?');
      params.push(state);
    }
    if (species) {
      conditions.push('species_group = ?');
      params.push(species);
    }
    if (year) {
      conditions.push('year = ?');
      params.push(parseInt(year, 10));
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const query = `SELECT * FROM v_fisheries_productivity_analytics ${where}
                   ORDER BY year DESC, quarter, state`;

    const [rows] = await pool.query(query, params);
    res.json({ count: rows.length, data: rows });
  } catch (err) { next(err); }
});

// GET /api/v1/analytics/species — All 14 species diagnostic profiles
router.get('/species', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM dim_species_trend_diagnostics ORDER BY species_group`
    );
    res.json({ count: rows.length, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
