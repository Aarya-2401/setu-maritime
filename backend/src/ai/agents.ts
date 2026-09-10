import { resolveHarbor, pool, firstDefined } from './db';
import { AgentRequest, AgentResult, AgentName, CardUpdate } from './types';

const now = () => new Date().toISOString();
const card = (agent: AgentName, cardId: string, data: Record<string, unknown>, location?: string): CardUpdate => ({ cardId, action: 'update', data, location, timestamp: now(), sourceAgent: agent });
const num = (v: any) => v == null ? null : Number(v);

async function safe(name: AgentName, fn: () => Promise<AgentResult>): Promise<AgentResult> {
  try { return await fn(); } catch (e: any) { return { agent: name, status: 'error', data: {}, cardUpdates: [], confidence: 0, timestamp: now(), error: e?.message || String(e) }; }
}

export async function runWeather(req: AgentRequest) { return safe('weather', async () => {
  const h = await resolveHarbor(req.location); if (!h) throw new Error('Harbor/location could not be resolved');
  const [rows]: any = await pool.query(`SELECT * FROM v_ocean_safety_nowcast WHERE harbor_id = ? ORDER BY datetime_utc DESC LIMIT 1`, [h.harbor_id]);
  const r = rows[0]; if (!r) throw new Error('No safety/weather data found');
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
  const [rows]: any = await pool.query(`SELECT * FROM v_ocean_safety_nowcast WHERE harbor_id = ? ORDER BY datetime_utc DESC LIMIT 1`, [h.harbor_id]);
  const r = rows[0]; if (!r) throw new Error('No wind data found');
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
  const [rows]: any = await pool.query(`SELECT * FROM v_ocean_safety_nowcast WHERE harbor_id = ? ORDER BY datetime_utc DESC LIMIT 1`, [h.harbor_id]);
  const r = rows[0]; if (!r) throw new Error('No wave data found');
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
  let [rows]: any = await pool.query(`SELECT * FROM fact_tide_predictions WHERE harbor_id = ? AND prediction_datetime_utc >= UTC_TIMESTAMP() ORDER BY prediction_datetime_utc ASC LIMIT 20`, [h.harbor_id]);
  if (!rows.length) {
    const [latestRows]: any = await pool.query(`SELECT * FROM fact_tide_predictions WHERE harbor_id = ? ORDER BY prediction_datetime_utc DESC LIMIT 20`, [h.harbor_id]);
    rows = latestRows.reverse();
  }
  if (!rows.length) throw new Error('No tide data found');
  const data = { points: rows.map((r: any) => ({ time: r.prediction_datetime_utc, height: num(r.tide_height_meters), phase: r.tide_phase })), current: rows[0] };
  return { agent: 'tide', status: 'success', data, cardUpdates: [card('tide', 'tide', { points: data.points }, h.landing_center_name)], confidence: .99, timestamp: now() };
}); }

export async function runCyclone(req: AgentRequest) { return safe('cyclone', async () => {
  const h = await resolveHarbor(req.location);
  const [rows]: any = await pool.query(`SELECT * FROM fact_cyclone_tracks ORDER BY timestamp_utc DESC LIMIT 50`);
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
  const [rows]: any = await pool.query(`SELECT * FROM fact_marine_alerts WHERE is_active = TRUE ORDER BY severity`);
  const data = { alerts: rows, active: rows.length > 0, count: rows.length };
  return { agent: 'marine-alert', status: 'success', data, cardUpdates: [card('marine-alert', 'marine-alert', { active: rows.length > 0, count: rows.length, highestSeverity: rows[0]?.severity ?? null })], confidence: .98, timestamp: now() };
}); }

export async function runPfz(req: AgentRequest) { return safe('pfz', async () => {
  const isNational = req.mapIntent?.scope === 'NATIONAL' || /\b(all|india|national|entire|across)\b/i.test(req.query);
  let rows: any[] = [];
  let h: any = null;

  if (isNational) {
    const [allRows]: any = await pool.query(`SELECT * FROM v_pfz_operational_advisory ORDER BY advisory_date DESC LIMIT 100`);
    rows = allRows;
  } else {
    h = await resolveHarbor(req.location);
    const [harborRows]: any = await pool.query(
      h ? `SELECT * FROM v_pfz_operational_advisory WHERE harbor_id = ? ORDER BY advisory_date DESC, distance_km ASC LIMIT 25` : `SELECT * FROM v_pfz_operational_advisory ORDER BY advisory_date DESC, distance_km ASC LIMIT 25`,
      h ? [h.harbor_id] : []
    );
    rows = harborRows;
  }

  const recommendations = rows.map((r: any) => ({
    id: String(r.advisory_id),
    advisoryId: String(r.advisory_id),
    harborId: r.harbor_id,
    referenceHarbor: r.reference_harbor,
    state: r.state,
    latitude: num(firstDefined(r, ['latitude', 'lat', 'pfz_latitude'])),
    longitude: num(firstDefined(r, ['longitude', 'lon', 'pfz_longitude'])),
    targetSpecies: firstDefined(r, ['target_species', 'species']),
    chlorophyllA: num(firstDefined(r, ['chlorophyll_a', 'chlorophyll', 'chlorophyllA'])),
    sst: num(firstDefined(r, ['sst', 'sst_c'])),
    depth: num(firstDefined(r, ['depth', 'depth_meters'])),
    gear: firstDefined(r, ['recommended_gear', 'gear']),
    distanceKm: num(firstDefined(r, ['distance_km', 'distance'])),
    bulletin: firstDefined(r, ['bulletin_text', 'bulletin', 'bulletin_text_english']),
    score: num(firstDefined(r, ['pfz_score', 'score']))
  }));

  const best = recommendations.find((x: any) => x.latitude != null && x.longitude != null) || recommendations[0];
  const data = { recommendations, count: recommendations.length, isNational };

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

  return { agent: 'pfz', status: 'success', data, cardUpdates: [card('pfz', 'pfz', { best: best ?? null, count: recommendations.length, isNational }, h?.landing_center_name)], mapUpdate, confidence: .94, timestamp: now() };
}); }

export async function runZone(req: AgentRequest) { return safe('zone', async () => {
  const [rows]: any = await pool.query(`SELECT * FROM dim_restricted_zones LIMIT 200`);
  const targetState = req.stateName ||
    (req.mapIntent?.scope === 'STATE' ? req.mapIntent.scopeName : null) ||
    (req.locationType === 'COASTAL_STATE' ? req.location?.name : null);

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
