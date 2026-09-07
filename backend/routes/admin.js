// ---------------------------------------------------------------------------
// Route: /admin — EJS Server-Rendered Admin Dashboard
// ---------------------------------------------------------------------------
const router = require('express').Router();
const { pool } = require('../config/db');

// GET /admin/ — Dashboard home
router.get('/', async (req, res, next) => {
  try {
    // Fetch row counts for all tables
    const tables = [
      'dim_fishing_harbors', 'dim_fishing_harbor_facilities',
      'dim_maritime_boundaries', 'dim_restricted_zones',
      'dim_species_trend_diagnostics',
      'fact_pfz_advisories', 'fact_coastal_weather_hourly',
      'fact_wave_sea_state_hourly', 'fact_sst_hourly_stations',
      'fact_tide_predictions', 'fact_cyclone_tracks',
      'fact_marine_alerts', 'fact_fish_catch_statistics',
      'fact_ocean_currents', 'fact_sst_regional_grid',
      'fact_chlorophyll_regional_grid',
    ];

    const counts = {};
    let totalRows = 0;
    for (const t of tables) {
      const [rows] = await pool.query(`SELECT COUNT(*) AS cnt FROM ${t}`);
      counts[t] = rows[0].cnt;
      totalRows += rows[0].cnt;
    }

    res.render('index', { counts, totalRows, tables });
  } catch (err) { next(err); }
});

// GET /admin/harbors — Harbor data browser
router.get('/harbors', async (req, res, next) => {
  try {
    const [harbors] = await pool.query(
      `SELECT h.*, COUNT(f.facility_name) AS facility_count
       FROM dim_fishing_harbors h
       LEFT JOIN dim_fishing_harbor_facilities f ON h.harbor_id = f.harbor_id
       GROUP BY h.harbor_id
       ORDER BY h.state, h.landing_center_name`
    );
    res.render('harbors', { harbors });
  } catch (err) { next(err); }
});

// GET /admin/api-docs — API documentation
router.get('/api-docs', async (req, res) => {
  res.render('api-docs');
});

module.exports = router;
