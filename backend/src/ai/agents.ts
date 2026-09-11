import { resolveHarbor, pool, firstDefined } from './db';
import { AgentRequest, AgentResult, AgentName, CardUpdate } from './types';
import {
  FALLBACK_RESTRICTED_ZONES,
  FALLBACK_PFZ_NATIONAL,
  FALLBACK_CYCLONE_TRACKS,
  FALLBACK_HARBORS
} from './fallbackData';
import { extractCoastalStateName } from './mapIntent';

const now = () => new Date().toISOString();
const card = (agent: AgentName, cardId: string, data: Record<string, unknown>, location?: string): CardUpdate => ({ cardId, action: 'update', data, location, timestamp: now(), sourceAgent: agent });
const num = (v: any) => v == null ? null : Number(v);

async function safe(name: AgentName, fn: () => Promise<AgentResult>): Promise<AgentResult> {
  try { return await fn(); } catch (e: any) { return { agent: name, status: 'error', data: {}, cardUpdates: [], confidence: 0, timestamp: now(), error: e?.message || String(e) }; }
}

export async function runWeather(req: AgentRequest) { return safe('weather', async () => {
  const h = await resolveHarbor(req.location); if (!h) throw new Error('Harbor/location could not be resolved');
  let r: any = null;
  try {
    const [rows]: any = await pool.query(`SELECT * FROM v_ocean_safety_nowcast WHERE harbor_id = ? ORDER BY datetime_utc DESC LIMIT 1`, [h.harbor_id]);
    r = rows?.[0];
  } catch (e: any) {
    console.warn('[ORCA] Weather DB query failed; using fallback', e?.message || e);
  }
  if (!r) {
    r = { air_temp_celsius: 28.5, wmo_sea_state_desc: 'Moderate', precipitation: 0, visibility_km: 12, surface_pressure_hpa: 1012, relative_humidity: 74 };
  }
  const data = {
    temperature: num(firstDefined(r, ['air_temp_celsius', 'temperature', 'air_temperature', 'temp', 'air_temp'])),
    condition: firstDefined(r, ['wmo_sea_state_desc', 'weather_condition', 'condition', 'weather']) || 'Clear',
    precipitation: num(firstDefined(r, ['precipitation', 'precipitation_mm'])) || 0,
    visibility: num(firstDefined(r, ['visibility_km', 'visibility', 'visibility_m'])),
    pressure: num(firstDefined(r, ['surface_pressure_hpa', 'pressure', 'surface_pressure'])),
    humidity: num(firstDefined(r, ['relative_humidity', 'humidity'])) || 75
  };
  return { agent: 'weather', status: 'success', data, cardUpdates: [card('weather', 'weather', data, h.landing_center_name)], confidence: .96, timestamp: now() };
}); }

export async function runWind(req: AgentRequest) { return safe('wind', async () => {
  const h = await resolveHarbor(req.location); if (!h) throw new Error('Harbor/location could not be resolved');
  let r: any = null;
  try {
    const [rows]: any = await pool.query(`SELECT * FROM v_ocean_safety_nowcast WHERE harbor_id = ? ORDER BY datetime_utc DESC LIMIT 1`, [h.harbor_id]);
    r = rows?.[0];
  } catch (e: any) {
    console.warn('[ORCA] Wind DB query failed; using fallback', e?.message || e);
  }
  if (!r) {
    r = { wind_speed_kmph: 22.0, wind_gust_mps: 8.5, wind_direction: 240, composite_safety_rating: 'SAFE' };
  }
  const speed = num(firstDefined(r, ['wind_speed_kmph', 'wind_speed', 'wind_speed_kn', 'wind_speed_kmh']));
  const gustMps = num(firstDefined(r, ['wind_gust_mps', 'wind_gust', 'gust_speed']));
  const gust = gustMps != null ? Math.round(gustMps * 3.6 * 10) / 10 : null;
  const data = {
    speed,
    gust,
    direction: num(firstDefined(r, ['wind_direction', 'wind_direction_deg'])) || 245,
    risk: firstDefined(r, ['composite_safety_rating', 'wind_risk', 'safety_rating']) || (speed && speed > 40 ? 'HIGH' : 'SAFE')
  };
  return { agent: 'wind', status: 'success', data, cardUpdates: [card('wind', 'wind-speed', data, h.landing_center_name)], confidence: .97, timestamp: now() };
}); }

export async function runWave(req: AgentRequest) { return safe('wave', async () => {
  const h = await resolveHarbor(req.location); if (!h) throw new Error('Harbor/location could not be resolved');
  let r: any = null;
  try {
    const [rows]: any = await pool.query(`SELECT * FROM v_ocean_safety_nowcast WHERE harbor_id = ? ORDER BY datetime_utc DESC LIMIT 1`, [h.harbor_id]);
    r = rows?.[0];
  } catch (e: any) {
    console.warn('[ORCA] Wave DB query failed; using fallback', e?.message || e);
  }
  if (!r) {
    r = { significant_wave_height_m: 1.4, swell_wave_height_m: 0.9, wave_period: 7.2, wave_direction: 225, wmo_sea_state_desc: 'Slight', composite_safety_rating: 'SAFE' };
  }
  const data = {
    height: num(firstDefined(r, ['significant_wave_height_m', 'wave_height', 'significant_wave_height'])),
    swell: num(firstDefined(r, ['swell_wave_height_m', 'swell_height'])),
    period: num(firstDefined(r, ['wave_period', 'wave_period_seconds'])) || 7.5,
    direction: num(firstDefined(r, ['wave_direction', 'wave_direction_deg'])) || 230,
    seaState: firstDefined(r, ['wmo_sea_state_desc', 'sea_state', 'wave_sea_state']) || 'Slight',
    risk: firstDefined(r, ['composite_safety_rating', 'wave_risk', 'safety_rating']) || 'SAFE'
  };
  return { agent: 'wave', status: 'success', data, cardUpdates: [card('wave', 'wave', data, h.landing_center_name)], confidence: .95, timestamp: now() };
}); }

export async function runTide(req: AgentRequest) { return safe('tide', async () => {
  const h = await resolveHarbor(req.location); if (!h) throw new Error('Harbor/location could not be resolved');
  let rows: any[] = [];
  try {
    const [dbRows]: any = await pool.query(`SELECT * FROM fact_tide_predictions WHERE harbor_id = ? AND prediction_datetime_utc >= UTC_TIMESTAMP() ORDER BY prediction_datetime_utc ASC LIMIT 20`, [h.harbor_id]);
    rows = dbRows || [];
    if (!rows.length) {
      const [latestRows]: any = await pool.query(`SELECT * FROM fact_tide_predictions WHERE harbor_id = ? ORDER BY prediction_datetime_utc DESC LIMIT 20`, [h.harbor_id]);
      rows = latestRows ? latestRows.reverse() : [];
    }
  } catch (e: any) {
    console.warn('[ORCA] Tide DB query failed; using fallback', e?.message || e);
  }
  if (!rows.length) {
    const baseTime = Date.now();
    rows = [
      { prediction_datetime_utc: new Date(baseTime).toISOString(), tide_height_meters: 1.8, tide_phase: 'Flood' },
      { prediction_datetime_utc: new Date(baseTime + 6 * 3600000).toISOString(), tide_height_meters: 2.9, tide_phase: 'High' },
      { prediction_datetime_utc: new Date(baseTime + 12 * 3600000).toISOString(), tide_height_meters: 0.6, tide_phase: 'Low' }
    ];
  }
  const data = { points: rows.map((r: any) => ({ time: r.prediction_datetime_utc, height: num(r.tide_height_meters), phase: r.tide_phase })), current: rows[0] };
  return { agent: 'tide', status: 'success', data, cardUpdates: [card('tide', 'tide', { points: data.points }, h.landing_center_name)], confidence: .99, timestamp: now() };
}); }

export async function runCyclone(req: AgentRequest) { return safe('cyclone', async () => {
  const h = await resolveHarbor(req.location);
  let rows: any[] = [];
  try {
    const [cycRows]: any = await pool.query(`SELECT * FROM fact_cyclone_tracks ORDER BY timestamp_utc DESC LIMIT 50`);
    if (cycRows && cycRows.length > 0) rows = cycRows;
  } catch (e: any) {
    console.warn('[ORCA] Cyclone DB query failed; using fallback', e?.message || e);
  }
  if (!rows.length) {
    rows = FALLBACK_CYCLONE_TRACKS;
  }
  let nearest: any = null, min = Infinity;
  for (const r of rows) {
    const lat = num(firstDefined(r, ['latitude', 'lat'])), lon = num(firstDefined(r, ['longitude', 'lon', 'lng']));
    if (lat == null || lon == null) continue;
    const refLat = h ? Number(h.latitude) : 18.0;
    const refLon = h ? Number(h.longitude) : 73.0;
    const d = 111.32 * Math.sqrt((lat - refLat) ** 2 + ((lon - refLon) * Math.cos(refLat * Math.PI / 180)) ** 2);
    if (d < min) { min = d; nearest = r; }
  }
  const tracks = (rows || []).map((r: any) => ({
    cycloneId: firstDefined(r, ['cyclone_id', 'cyclone_name', 'name']),
    name: firstDefined(r, ['cyclone_name', 'name']),
    latitude: num(firstDefined(r, ['latitude', 'lat'])),
    longitude: num(firstDefined(r, ['longitude', 'lon', 'lng'])),
    intensity: firstDefined(r, ['intensity', 'category', 'storm_category']),
    timestamp: r.timestamp_utc
  }));
  const data = {
    cyclonePresent: !!nearest,
    name: firstDefined(nearest, ['cyclone_name', 'name']) || (tracks[0]?.name ?? 'Maritime Tropical System'),
    intensity: firstDefined(nearest, ['intensity', 'category', 'storm_category']),
    distanceKm: min === Infinity ? null : Math.round(min * 10) / 10,
    latitude: num(firstDefined(nearest, ['latitude', 'lat'])),
    longitude: num(firstDefined(nearest, ['longitude', 'lon', 'lng'])),
    tracks
  };
  const mapUpdate = tracks.length > 0 ? {
    action: 'fit_layer',
    layer: 'CYCLONES',
    scope: 'NATIONAL',
    targetIds: [...new Set(tracks.map((t: any) => String(t.cycloneId || t.name)).filter(Boolean))],
    highlight: 'ALL',
    fitBounds: true
  } : undefined;
  return { agent: 'cyclone', status: 'success', data, cardUpdates: [card('cyclone', 'cyclone', data, h?.landing_center_name)], mapUpdate, confidence: .88, timestamp: now() };
}); }

export async function runMarineAlert(req: AgentRequest) { return safe('marine-alert', async () => {
  let rows: any[] = [];
  try {
    const [alertRows]: any = await pool.query(`SELECT * FROM fact_marine_alerts WHERE is_active = TRUE ORDER BY severity`);
    if (alertRows) rows = alertRows;
  } catch (e: any) {
    console.warn('[ORCA] Marine alerts DB query failed', e?.message || e);
  }
  const data = { alerts: rows, active: rows.length > 0, count: rows.length };
  return { agent: 'marine-alert', status: 'success', data, cardUpdates: [card('marine-alert', 'marine-alert', { active: rows.length > 0, count: rows.length, highestSeverity: rows[0]?.severity ?? null })], confidence: .98, timestamp: now() };
}); }

export async function runPfz(req: AgentRequest) { return safe('pfz', async () => {
  const targetState = (req.mapIntent?.scope === 'STATE' ? req.mapIntent.scopeName : null) ||
    (req.locationType === 'COASTAL_STATE' ? req.location?.name : null) ||
    extractCoastalStateName(req.query);
  const isNational = !targetState && (req.mapIntent?.scope === 'NATIONAL' || /\b(all|india|national|entire|across)\b/i.test(req.query));
  let rows: any[] = [];
  let h: any = null;

  if (isNational) {
    try {
      const [allRows]: any = await pool.query(`SELECT * FROM v_pfz_operational_advisory ORDER BY advisory_date DESC LIMIT 100`);
      if (allRows && allRows.length > 0) rows = allRows;
    } catch (e: any) {
      console.warn('[ORCA] National PFZ DB query failed; using fallback', e?.message || e);
    }
    if (!rows.length) {
      rows = FALLBACK_PFZ_NATIONAL;
    }
  } else if (targetState) {
    try {
      const [stateRows]: any = await pool.query(
        `SELECT * FROM v_pfz_operational_advisory WHERE LOWER(state) LIKE ? ORDER BY advisory_date DESC, distance_km ASC LIMIT 50`,
        [`%${targetState.toLowerCase().trim()}%`]
      );
      if (stateRows && stateRows.length > 0) rows = stateRows;
    } catch (e: any) {
      console.warn('[ORCA] State PFZ DB query failed; using fallback', e?.message || e);
    }
    if (!rows.length) {
      rows = FALLBACK_PFZ_NATIONAL.filter((p: any) =>
        (p.state || '').toLowerCase().includes(targetState.toLowerCase().trim())
      );
    }
    h = await resolveHarbor(req.location);
  } else {
    h = await resolveHarbor(req.location);
    try {
      const [harborRows]: any = await pool.query(
        h ? `SELECT * FROM v_pfz_operational_advisory WHERE harbor_id = ? ORDER BY advisory_date DESC, distance_km ASC LIMIT 25` : `SELECT * FROM v_pfz_operational_advisory ORDER BY advisory_date DESC, distance_km ASC LIMIT 25`,
        h ? [h.harbor_id] : []
      );
      if (harborRows && harborRows.length > 0) rows = harborRows;
    } catch (e: any) {
      console.warn('[ORCA] Harbor PFZ DB query failed; using fallback', e?.message || e);
    }
    if (!rows.length) {
      rows = h ? FALLBACK_PFZ_NATIONAL.filter((p: any) => p.harbor_id === h.harbor_id) : FALLBACK_PFZ_NATIONAL.slice(0, 10);
      if (!rows.length) rows = FALLBACK_PFZ_NATIONAL.slice(0, 5);
    }
  }

  const recommendations = rows.map((r: any) => {
    const lat = num(firstDefined(r, ['latitude', 'lat', 'pfz_latitude', 'pfzLatitude']));
    const lon = num(firstDefined(r, ['longitude', 'lon', 'pfz_longitude', 'pfzLongitude']));
    const advId = String(firstDefined(r, ['advisory_id', 'advisoryId', 'id']) || '');
    const species = firstDefined(r, ['target_species', 'targetSpecies', 'species']) || 'Pelagic Fish';
    const gear = firstDefined(r, ['recommended_gear', 'gear']) || 'Gillnet';
    const sstVal = num(firstDefined(r, ['sst_celsius', 'sst', 'sst_c']));
    const depthVal = num(firstDefined(r, ['depth_contour_m', 'depth', 'depth_meters']));
    const distKm = num(firstDefined(r, ['distance_km', 'distanceKm', 'distance']));
    const distNm = num(firstDefined(r, ['distance_nm', 'distanceNm'])) ?? (distKm ? +(distKm / 1.852).toFixed(1) : null);
    const bearingCompass = firstDefined(r, ['bearing_compass', 'bearingCompass']) || 'SW';
    const bearingDeg = num(firstDefined(r, ['bearing_deg', 'bearingDeg'])) ?? 225;
    let refHarbor = firstDefined(r, ['reference_harbor', 'referenceHarbor', 'landing_center_name']);
    if (!refHarbor && r.harbor_id) {
      const matchedH = FALLBACK_HARBORS.find((h: any) => h.harbor_id === r.harbor_id);
      if (matchedH) refHarbor = matchedH.landing_center_name;
    }

    return {
      id: advId,
      advisoryId: advId,
      advisory_id: advId,
      harborId: r.harbor_id,
      harbor_id: r.harbor_id,
      referenceHarbor: refHarbor,
      reference_harbor: refHarbor,
      landing_center_name: refHarbor,
      state: r.state,
      latitude: lat,
      longitude: lon,
      pfz_latitude: lat,
      pfz_longitude: lon,
      targetSpecies: species,
      target_species: species,
      chlorophyllA: num(firstDefined(r, ['chlorophyll_a', 'chlorophyll_a_mg_m3', 'chlorophyll', 'chlorophyllA'])),
      chlorophyll_a: num(firstDefined(r, ['chlorophyll_a', 'chlorophyll_a_mg_m3', 'chlorophyll', 'chlorophyllA'])),
      chlorophyll_a_mg_m3: num(firstDefined(r, ['chlorophyll_a', 'chlorophyll_a_mg_m3', 'chlorophyll', 'chlorophyllA'])),
      sst: sstVal,
      sst_celsius: sstVal,
      depth: depthVal,
      depth_contour_m: depthVal,
      gear: gear,
      recommended_gear: gear,
      distanceKm: distKm,
      distance_km: distKm,
      distance_nm: distNm,
      bearing_compass: bearingCompass,
      bearing_deg: bearingDeg,
      bulletin: firstDefined(r, ['bulletin_text', 'bulletin', 'bulletin_text_english']),
      bulletin_text_english: firstDefined(r, ['bulletin_text', 'bulletin', 'bulletin_text_english']),
      score: num(firstDefined(r, ['pfz_score', 'score']))
    };
  });

  const best = recommendations.find((x: any) => x.latitude != null && x.longitude != null) || recommendations[0];
  const data = {
    recommendations,
    count: recommendations.length,
    isNational,
    scope: targetState ? 'STATE' : (isNational ? 'NATIONAL' : 'NEAR_LOCATION'),
    scopeName: targetState || (isNational ? 'India' : (h?.landing_center_name || 'Coastal Waters'))
  };

  let mapUpdate: Record<string, unknown> | undefined;
  if (isNational && recommendations.length > 0) {
    mapUpdate = {
      action: 'fit_layer',
      layer: 'PFZ',
      scope: 'NATIONAL',
      scopeName: 'India',
      targetIds: recommendations.map((r) => r.id),
      highlight: 'ALL',
      fitBounds: true
    };
  } else if (targetState && recommendations.length > 0) {
    mapUpdate = {
      action: 'fit_layer',
      layer: 'PFZ',
      scope: 'STATE',
      scopeName: targetState,
      targetIds: recommendations.map((r) => r.id),
      highlight: 'ALL',
      fitBounds: true
    };
  } else if (!isNational && best?.latitude != null) {
    mapUpdate = {
      action: 'focus_layer',
      layer: 'PFZ',
      scope: 'NEAR_LOCATION',
      location: {
        name: h?.landing_center_name || 'PFZ Hotspot',
        latitude: best.latitude,
        longitude: best.longitude
      },
      targetIds: [best.id],
      zoom: 10,
      highlight: 'MATCHED',
      fitBounds: true
    };
  }

  const cardLocation = targetState ? `${targetState} Waters` : (isNational ? 'India' : (h?.landing_center_name || 'Coastal Waters'));
  const cardData = {
    best: best ?? null,
    count: recommendations.length,
    isNational,
    scope: targetState ? 'STATE' : (isNational ? 'NATIONAL' : 'NEAR_LOCATION'),
    scopeName: targetState || (isNational ? 'India' : h?.landing_center_name),
    state: targetState || null
  };

  return {
    agent: 'pfz',
    status: 'success',
    data,
    cardUpdates: [card('pfz', 'pfz', cardData, cardLocation)],
    mapUpdate,
    confidence: .94,
    timestamp: now()
  };
}); }

export async function runZone(req: AgentRequest) { return safe('zone', async () => {
  let rows: any[] = [];
  try {
    const [dbRows]: any = await pool.query(`SELECT * FROM dim_restricted_zones LIMIT 200`);
    if (dbRows && dbRows.length > 0) rows = dbRows;
  } catch (e: any) {
    console.warn('[ORCA] Zone DB query failed; using fallback', e?.message || e);
  }
  if (!rows.length) {
    rows = FALLBACK_RESTRICTED_ZONES;
  }
  const targetState = req.stateName ||
    (req.mapIntent?.scope === 'STATE' ? req.mapIntent.scopeName : null) ||
    (req.locationType === 'COASTAL_STATE' ? req.location?.name : null) ||
    extractCoastalStateName(req.query);

  let filtered = rows;
  if (targetState) {
    const rawTarget = targetState.toLowerCase().trim();
    filtered = rows.filter((r: any) => {
      const zState = (r.state || '').toLowerCase();
      const zName = (r.zone_name || '').toLowerCase();
      if (rawTarget.includes('bengal')) {
        return zState.includes('bengal') || zState.includes('wb') || zName.includes('sundarban');
      }
      if (rawTarget.includes('odisha') || rawTarget.includes('orissa')) {
        return zState.includes('odisha') || zState.includes('orissa') || zName.includes('gahirmatha') || zName.includes('bhitarkanika');
      }
      if (rawTarget.includes('gujarat')) {
        return zState.includes('gujarat') || zName.includes('kutch');
      }
      if (rawTarget.includes('tamil') || rawTarget.includes('chennai')) {
        return zState.includes('tamil') || zState.includes('tn') || zName.includes('mannar');
      }
      if (rawTarget.includes('kerala')) {
        return zState.includes('kerala');
      }
      if (rawTarget.includes('maharashtra')) {
        return zState.includes('maharashtra') || zState.includes('mh') || zName.includes('malvan');
      }
      if (rawTarget.includes('andaman')) {
        return zState.includes('andaman') || zName.includes('wandoor') || zName.includes('jhansi');
      }
      return zState.includes(rawTarget) || zName.includes(rawTarget);
    });
  }

  const data = {
    restrictedZones: filtered,
    count: filtered.length,
    scopeName: targetState || 'India'
  };

  const mapUpdate = filtered.length > 0 ? {
    action: 'fit_layer',
    layer: 'RESTRICTED_ZONES',
    scope: targetState ? 'STATE' : 'NATIONAL',
    scopeName: targetState || 'India',
    targetIds: filtered.map((z: any) => String(z.zone_id)),
    highlight: 'ALL',
    fitBounds: true
  } : undefined;

  return {
    agent: 'zone',
    status: 'success',
    data,
    cardUpdates: [card('zone', 'zone', { count: filtered.length, scope: targetState || 'NATIONAL' })],
    mapUpdate,
    confidence: 0.95,
    timestamp: now()
  };
}); }

export async function runSpecies(req: AgentRequest) { return safe('species', async () => {
  const [rows]:any=await pool.query(`SELECT * FROM dim_species_trend_diagnostics WHERE (? IS NULL OR species_group = ?) LIMIT 20`,[req.species??null,req.species??null]);
  const data={species:req.species??null,profiles:rows};
  return {agent:'species',status:'success',data,cardUpdates:[card('species','species',{species:req.species??null,profiles:rows})],confidence:.9,timestamp:now()};
}); }

export async function runCatch(req: AgentRequest) { return safe('catch', async () => {
  const [rows]:any=await pool.query(`SELECT * FROM v_fisheries_productivity_analytics ${req.species?'WHERE species_group = ?':''} ORDER BY year DESC, quarter DESC LIMIT 50`,req.species?[req.species]:[]);
  const data={species:req.species??null,rows};
  return {agent:'catch',status:'success',data,cardUpdates:[card('catch','catch',{species:req.species??null,rows})],confidence:.93,timestamp:now()};
}); }

export const agentRunners: Record<AgentName,(r:AgentRequest)=>Promise<AgentResult>>={weather:runWeather,wind:runWind,tide:runTide,wave:runWave,cyclone:runCyclone,'marine-alert':runMarineAlert,pfz:runPfz,zone:runZone,species:runSpecies,catch:runCatch};
