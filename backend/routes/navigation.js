// ---------------------------------------------------------------------------
// Route: /api/v1/navigation — Geofencing & Navigation Domain
// SQL Source: v_geofenced_sailing_route + dim_restricted_zones
// ---------------------------------------------------------------------------
const router = require('express').Router();
const { pool } = require('../config/db');

// Geometric line-segment to circular boundary intersection test for all Restricted Zones & Sanctuaries
function checkZoneTraverse(dLat, dLon, tLat, tLon, zone) {
  const zLat = Number(zone.latitude);
  const zLon = Number(zone.longitude);
  const zRadiusKm = Math.sqrt(Number(zone.area_km2 || 100));
  const cosLat = Math.cos((zLat * Math.PI) / 180);

  // Local Cartesian projection (km) centered at Zone (0, 0)
  const xA = (dLon - zLon) * cosLat * 111.32;
  const yA = (dLat - zLat) * 111.32;
  const xB = (tLon - zLon) * cosLat * 111.32;
  const yB = (tLat - zLat) * 111.32;
  const dA = Math.sqrt(xA * xA + yA * yA);
  const dB = Math.sqrt(xB * xB + yB * yB);

  const dx = xB - xA;
  const dy = yB - yA;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? Math.max(0, Math.min(1, -(xA * dx + yA * dy) / lenSq)) : 0;
  const xC = xA + t * dx;
  const yC = yA + t * dy;
  const dMin = Math.sqrt(xC * xC + yC * yC);

  // Case 1: Target PFZ point lies directly inside the restricted zone
  if (dB <= zRadiusKm) {
    return {
      traverses: true,
      type: 'TARGET_IN_RESTRICTED_ZONE',
      zone: zone.zone_name,
      dMin,
      zRadiusKm
    };
  }

  // Case 2: Departure is outside zone, but vector trajectory cuts through it
  if (dA > zRadiusKm && dMin <= zRadiusKm) {
    return {
      traverses: true,
      type: 'CUTS_THROUGH_RESTRICTED_ZONE',
      zone: zone.zone_name,
      dMin,
      zRadiusKm
    };
  }

  // Case 3: Departure harbor is on/inside the perimeter, and vector penetrates deeper toward core
  if (dA <= zRadiusKm && (dMin < dA - 0.5 || dB <= zRadiusKm)) {
    return {
      traverses: true,
      type: 'PENETRATES_ZONE_CORE',
      zone: zone.zone_name,
      dMin,
      zRadiusKm
    };
  }

  // Case 4: Departure is inside zone and vector runs inside the zone
  if (dA <= zRadiusKm && dMin <= zRadiusKm) {
    return {
      traverses: true,
      type: 'INSIDE_RESTRICTED_ZONE',
      zone: zone.zone_name,
      dMin,
      zRadiusKm
    };
  }

  return { traverses: false };
}

// GET /api/v1/navigation/routes?harbor_id=X — Sailing routes from a harbor with comprehensive geofencing
router.get('/routes', async (req, res, next) => {
  try {
    const { harbor_id } = req.query;

    let query, params;

    if (harbor_id) {
      query = `SELECT * FROM v_geofenced_sailing_route
               WHERE advisory_id IN (
                 SELECT advisory_id FROM fact_pfz_advisories WHERE harbor_id = ?
               )
               ORDER BY distance_km ASC`;
      params = [parseInt(harbor_id, 10)];
    } else {
      query = `SELECT * FROM v_geofenced_sailing_route ORDER BY distance_km ASC LIMIT 100`;
      params = [];
    }

    const [rows] = await pool.query(query, params);

    // Fetch ALL active restricted zones (MPAs, seasonal fishing bans, turtle sanctuaries)
    const [zones] = await pool.query(
      `SELECT zone_id, zone_name, zone_type, latitude, longitude, area_km2
       FROM dim_restricted_zones`
    );

    const evaluatedRoutes = rows.map((route) => {
      const dLat = Number(route.departure_lat);
      const dLon = Number(route.departure_lon);
      const tLat = Number(route.target_lat);
      const tLon = Number(route.target_lon);

      for (const zone of zones) {
        const zoneCheck = checkZoneTraverse(dLat, dLon, tLat, tLon, zone);
        if (zoneCheck.traverses) {
          return {
            ...route,
            violates_restricted_zone: true,
            intersected_sanctuary: zoneCheck.zone,
            sanctuary_violation_type: zoneCheck.type,
            geofencing_compliance_status: `WARNING: TRAVERSES ${zoneCheck.zone.toUpperCase()} (RESTRICTED ZONE VIOLATION)`
          };
        }
      }

      return {
        ...route,
        violates_restricted_zone: false
      };
    });

    res.json({ count: evaluatedRoutes.length, data: evaluatedRoutes });
  } catch (err) { next(err); }
});

// GET /api/v1/navigation/restricted-zones — All marine protected areas & fishing bans
router.get('/restricted-zones', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT z.*, b.boundary_type, b.jurisdiction_nm
       FROM dim_restricted_zones z
       LEFT JOIN dim_maritime_boundaries b ON z.boundary_id = b.boundary_id
       ORDER BY z.zone_name`
    );
    res.json({ count: rows.length, data: rows });
  } catch (err) { next(err); }
});

// GET /api/v1/navigation/maritime-boundaries — 200 NM EEZ & International Maritime Boundary Lines
router.get('/maritime-boundaries', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT boundary_id, boundary_type, country, neighbor_country, jurisdiction_nm, latitude, longitude, point_order, description
       FROM dim_maritime_boundaries
       ORDER BY boundary_type, neighbor_country, point_order ASC`
    );
    res.json({ count: rows.length, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
