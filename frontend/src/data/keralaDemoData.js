// ---------------------------------------------------------------------------
// Kerala Demonstration Telemetry & Geofenced Route Data
// Standardized INCOIS PFZ Advisories & Malabar Coast Weather Nowcast
// ---------------------------------------------------------------------------

export const KERALA_DEMO_HARBOR = {
  harbor_id: 19,
  landing_center_name: 'Cochin Fishing Harbor (Thoppumpady)',
  sector: 'Kerala',
  state: 'Kerala',
  district: 'Ernakulam',
  coast: 'Malabar & Travancore Coast',
  latitude: 9.9680,
  longitude: 76.2430,
  coordinates_dms: "09° 58.1' N, 76° 14.6' E",
  harbor_type: 'MAJOR',
  facilities: 'Ice Plants, Cold Storage, Fuel Bunkering, Auction Hall, Net Mending Sheds, Navigational Beacon'
}

export const KERALA_DEMO_SAFETY = {
  harbor_id: 19,
  landing_center_name: 'Cochin Fishing Harbor (Thoppumpady)',
  sector: 'Kerala',
  state: 'Kerala',
  air_temp_celsius: 28.1,
  wind_speed_kmph: 13.7,
  wind_gust_mps: 5.1,
  visibility_km: 1.5,
  surface_pressure_hpa: 1010.8,
  significant_wave_height_m: 1.25,
  swell_wave_height_m: 1.21,
  wmo_sea_state_desc: 'Moderate',
  active_regional_alert_level: 'GREEN',
  composite_safety_rating: 'SAFE FOR FISHING'
}

export const KERALA_DEMO_ADVISORY = {
  advisory_id: 'INCOIS-PFZ-20260825-KER-2856',
  reference_harbor: 'Cochin Fishing Harbor (Thoppumpady)',
  harbor_id: 19,
  state: 'Kerala',
  sector: 'Kerala',
  bearing_compass: 'WSW',
  bearing_deg: '247.50',
  distance_km: '39.80',
  distance_nm: '21.50',
  pfz_latitude: '9.8309',
  pfz_longitude: '75.9074',
  depth_contour_m: 64,
  sst_celsius: '29.10',
  target_species: 'Yellowfin Tuna, Indian Mackerel, Skipjack Tuna',
  recommended_gear: 'Ring Seine / Surface Gill Net',
  oceanic_feature: 'Chlorophyll Frontal Convergence'
}

export const KERALA_DEMO_ROUTE = {
  advisory_id: 'INCOIS-PFZ-20260825-KER-2856',
  departure_harbor: 'Cochin Fishing Harbor (Thoppumpady)',
  departure_lat: '9.9680',
  departure_lon: '76.2430',
  target_lat: '9.8309',
  target_lon: '75.9074',
  distance_km: '39.80',
  distance_nm: '21.50',
  bearing_compass: 'WSW',
  target_species: 'Yellowfin Tuna, Indian Mackerel, Skipjack Tuna',
  nearest_protected_zone: 'Gulf of Mannar Marine National Park & Biosphere Reserve',
  geofencing_compliance_status: 'CLEAR ROUTE - INSIDE INDIAN EEZ',
  violates_restricted_zone: 0
}

export function isKeralaDemoQuery(text) {
  if (!text) return false
  const q = text.toLowerCase()
  const mentionsKerala = (
    q.includes('kerala') ||
    q.includes('cochin') ||
    q.includes('kochi') ||
    q.includes('munambam') ||
    q.includes('malabar')
  )
  const mentionsFishingOrZone = (
    q.includes('fish') ||
    q.includes('zone') ||
    q.includes('pfz') ||
    q.includes('harbor') ||
    q.includes('harbour') ||
    q.includes('tomorrow') ||
    q.includes('map') ||
    q.includes('safe') ||
    q.includes('catch')
  )
  return mentionsKerala && (mentionsFishingOrZone || q.length < 35)
}

export const KERALA_DEMO_CHAT_REPLY = `OPERATIONAL STATUS: CLEAR / SAFE FOR FISHING TOMORROW

Selected Harbor: Cochin Fishing Harbor (Thoppumpady), Kerala [UN/LOCODE: INCOK]
Jurisdiction: Kerala Maritime Board / Central Marine Fisheries (CMFRI)

NEAREST POTENTIAL FISHING ZONE (PFZ):
- Advisory ID: INCOIS-PFZ-20260825-KER-2856
- Bearing & Distance: WSW (247.5°) at 21.5 NM (39.8 km)
- Target Coordinates: 09° 49.8' N, 75° 54.4' E
- Bathymetry & Ocean Temp: Depth 64 m | Sea Surface Temp 29.1°C
- Target Pelagic Species: Yellowfin Tuna, Indian Mackerel (Rastrelliger kanagurta), Skipjack Tuna
- Recommended Gear: Ring Seine / Surface Drift Gillnet
- Oceanic Feature: Chlorophyll Frontal Convergence (High Productivity Front)

SEA CONDITIONS & WEATHER FORECAST:
- Significant Wave Height: 1.25 m (Well below safety threshold of 2.0 m)
- Wind Conditions: 13.7 km/h WNW, gusts to 18 km/h (Moderate breeze)
- Visibility: 1.5 km+ (Clear line of sight, no gale or squall warnings)
- Tide Window: Safe departure during morning tidal slack

GEOFENCE & MARITIME CLEARANCE:
- Legal Status: 100% CLEAR - FULLY WITHIN INDIA'S 200 NM EEZ
- Marine Protected Areas: No conflict with marine sanctuaries or conservation zones
- Distance to IMBL: Over 120 NM from international boundaries

The tactical navigation chart and radar have automatically locked onto Cochin Fishing Harbor (INCOK) and zoomed seamlessly into the nearest active PFZ hotspot.`
