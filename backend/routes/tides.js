// ---------------------------------------------------------------------------
// Route: /api/v1/tides — Tide Predictions
// SQL Source: fact_tide_predictions
// Supports Survey of India / INCOIS Primary reference station geospatial fallback
// ---------------------------------------------------------------------------
const router = require('express').Router();
const { pool } = require('../config/db');

// In-memory cache of primary tide gauge observatory harbors
let gaugeHarborsCache = null;

async function getGaugeHarbors() {
  if (gaugeHarborsCache) return gaugeHarborsCache;
  const [rows] = await pool.query(
    `SELECT DISTINCT h.harbor_id, h.landing_center_name, h.latitude, h.longitude, t.port_name
     FROM fact_tide_predictions t
     JOIN dim_fishing_harbors h ON t.harbor_id = h.harbor_id`
  );
  gaugeHarborsCache = rows;
  return gaugeHarborsCache;
}

// Great-circle Haversine distance in km
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Helper to query tides with upcoming priority and fallback
async function queryTidesForHarbor(harborId, date, maxRows) {
  let query, params;
  if (date) {
    query = `SELECT tide_id, harbor_id, port_name, prediction_datetime_utc,
                    tide_height_meters, tide_phase
             FROM fact_tide_predictions
             WHERE harbor_id = ? AND DATE(prediction_datetime_utc) = ?
             ORDER BY prediction_datetime_utc`;
    params = [harborId, date];
    const [rows] = await pool.query(query, params);
    return rows;
  }

  // Try upcoming tides first
  query = `SELECT tide_id, harbor_id, port_name, prediction_datetime_utc,
                  tide_height_meters, tide_phase
           FROM fact_tide_predictions
           WHERE harbor_id = ? AND prediction_datetime_utc >= UTC_TIMESTAMP()
           ORDER BY prediction_datetime_utc
           LIMIT ?`;
  params = [harborId, maxRows];
  let [rows] = await pool.query(query, params);

  // If no upcoming rows (e.g. past timestamp or historical mock), fallback to latest available
  if (rows.length === 0) {
    const fallbackQuery = `SELECT tide_id, harbor_id, port_name, prediction_datetime_utc,
                                  tide_height_meters, tide_phase
                           FROM fact_tide_predictions
                           WHERE harbor_id = ?
                           ORDER BY prediction_datetime_utc DESC
                           LIMIT ?`;
    const [fbRows] = await pool.query(fallbackQuery, [harborId, maxRows]);
    rows = fbRows.reverse();
  }

  return rows;
}

// GET /api/v1/tides?harbor_id=X — Upcoming tides for a harbor (with nearest-neighbor fallback)
// GET /api/v1/tides?harbor_id=X&date=YYYY-MM-DD — Tides for a specific date
// GET /api/v1/tides?harbor_id=X&limit=20 — Control number of results
router.get('/', async (req, res, next) => {
  try {
    const { harbor_id, date, limit } = req.query;
    if (!harbor_id) {
      return res.status(400).json({ error: 'harbor_id query parameter is required' });
    }

    const maxRows = limit ? parseInt(limit, 10) : 10;
    const requestedHarborId = parseInt(harbor_id, 10);

    // 1. Direct query for requested harbor
    let rows = await queryTidesForHarbor(requestedHarborId, date, maxRows);

    if (rows.length > 0) {
      return res.json({
        harbor_id: requestedHarborId,
        count: rows.length,
        is_reference_station: false,
        data: rows,
      });
    }

    // 2. Nearest-neighbor fallback if requested harbor is a minor landing center without a direct gauge
    const [targetHarbors] = await pool.query(
      `SELECT harbor_id, landing_center_name, latitude, longitude FROM dim_fishing_harbors WHERE harbor_id = ?`,
      [requestedHarborId]
    );

    if (targetHarbors.length > 0 && targetHarbors[0].latitude && targetHarbors[0].longitude) {
      const target = targetHarbors[0];
      const gauges = await getGaugeHarbors();

      let nearest = null;
      let minDistance = Infinity;

      for (const g of gauges) {
        const dist = haversineKm(
          Number(target.latitude),
          Number(target.longitude),
          Number(g.latitude),
          Number(g.longitude)
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearest = g;
        }
      }

      if (nearest) {
        const fallbackRows = await queryTidesForHarbor(nearest.harbor_id, date, maxRows);
        return res.json({
          harbor_id: requestedHarborId,
          count: fallbackRows.length,
          is_reference_station: true,
          reference_harbor_id: nearest.harbor_id,
          reference_port_name: nearest.port_name || nearest.landing_center_name,
          distance_km: Math.round(minDistance * 10) / 10,
          data: fallbackRows,
        });
      }
    }

    // If no harbor or gauge found
    res.json({ harbor_id: requestedHarborId, count: 0, data: [] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
