import { mapIntentSchema } from './schemas';
import type { CoordinatorRequest } from './schemas';
import type { AgentResult, ConversationContext, MapIntent, MapLayer } from './types';
import { COASTAL_STATE_REFS } from './db';
import type { LocationResolution } from './db';

export const PRESERVE_INTENT: MapIntent = {
  action: 'PRESERVE',
  highlight: 'NONE',
  fitBounds: false
};

const VALID_LAYERS: MapLayer[] = ['PFZ', 'ROUTES', 'RESTRICTED_ZONES', 'EEZ', 'IMBL', 'CYCLONES', 'WAVES', 'HARBORS'];

export function isReferentialMapQuery(query: string): boolean {
  const q = query.toLowerCase();
  const hasExplicitDomain = /\b(restricted|sanctuary|sanctuaries|eez|imbl|cyclone|pfz|pfzs|fishing zone|weather|wave|swell|tide|wind)\b/i.test(q);
  if (hasExplicitDomain) return false;
  return (
    /\b(show|display|highlight|zoom|fit)\b[\s\S]{0,30}\b(them|those|it|that)\b/i.test(q) ||
    /\b(zoom into them|highlight them|show them|plot them|view them)\b/i.test(q)
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractCoastalStateName(query: string): string | undefined {
  const q = query.toLowerCase();
  const sorted = [...COASTAL_STATE_REFS].sort((a, b) => b.stateName.length - a.stateName.length);
  for (const cs of sorted) {
    if (cs.aliases.some((alias) => new RegExp(`(^|\\W)${escapeRegex(alias)}(\\W|$)`, 'i').test(q))) {
      return cs.stateName;
    }
  }
  return undefined;
}

export function inferMapIntentFromQuery(query: string): MapIntent {
  const q = query.toLowerCase();
  const asksShow = /\b(show|display|highlight|map|zoom|fit|plot|draw)\b/.test(q);
  const stateName = extractCoastalStateName(query);

  const locMatch = q.match(/\b(?:near|around|at|for|from|off|in)\s+([a-z]+(?:\s+[a-z]+)?)\b/i);
  let extractedLocName: string | undefined;
  if (locMatch && locMatch[1]) {
    const candidate = locMatch[1].trim();
    const skipWords = new Set(['fishing', 'sailing', 'departure', 'port', 'harbor', 'harbour', 'sea', 'ocean', 'today', 'tomorrow', 'now', 'morning', 'the', 'a', 'an', 'india', 'map', 'active', 'those', 'them', 'there']);
    if (!skipWords.has(candidate.toLowerCase())) {
      extractedLocName = candidate.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }

  if (/\beez\b/.test(q) || /exclusive economic/.test(q)) {
    return {
      action: 'FIT_LAYER',
      layer: 'EEZ',
      scope: 'NATIONAL',
      scopeName: 'India',
      highlight: 'ALL',
      fitBounds: true
    };
  }

  if (/\bimbl\b/.test(q) || /international maritime boundary/.test(q)) {
    return {
      action: 'FIT_LAYER',
      layer: 'IMBL',
      scope: 'NATIONAL',
      highlight: 'ALL',
      fitBounds: true
    };
  }

  if (/restricted|sanctuary|marine protected|fishing ban|monsoon ban|closed area/.test(q)) {
    const targetScope = stateName || extractedLocName;
    return {
      action: 'FIT_LAYER',
      layer: 'RESTRICTED_ZONES',
      scope: stateName ? 'STATE' : (extractedLocName ? 'NEAR_LOCATION' : 'REGION'),
      scopeName: targetScope,
      highlight: 'ALL',
      fitBounds: true
    };
  }

  if (/\bpfzs?\b|potential fishing|fishing zone/.test(q)) {
    const hasState = Boolean(stateName);
    const nearby = /\b(near|nearest|best|closest|around)\b/i.test(q);
    const isIndia = /\b(across\s+india|entire\s+country|nationwide|all\s+available\s+pfz|all\s+pfzs?\s+across\s+india)\b/i.test(q) || (/\bindia\b/i.test(q) && !nearby);
    const national = !hasState && !nearby && (isIndia || (asksShow && /map/.test(q)));
    if (national) {
      return {
        action: 'FIT_LAYER',
        layer: 'PFZ',
        scope: 'NATIONAL',
        scopeName: 'India',
        highlight: 'ALL',
        fitBounds: true
      };
    }
    const targetScope = stateName || extractedLocName;
    return {
      action: 'FIT_LAYER',
      layer: 'PFZ',
      scope: stateName ? 'STATE' : 'NEAR_LOCATION',
      scopeName: targetScope,
      highlight: stateName ? 'ALL' : 'MATCHED',
      fitBounds: true
    };
  }

  if (/\bcyclone\b/.test(q) && (asksShow || /track/.test(q))) {
    return {
      action: 'FIT_LAYER',
      layer: 'CYCLONES',
      scope: 'NATIONAL',
      highlight: 'ALL',
      fitBounds: true
    };
  }

  if (/alternative routes?/.test(q)) {
    return {
      action: 'FOCUS_LAYER',
      layer: 'ROUTES',
      scope: 'CURRENT_HARBOR',
      highlight: 'ALL',
      fitBounds: true
    };
  }

  if (/recommended route|sailing route|show .*route/.test(q)) {
    return {
      action: 'FOCUS_LAYER',
      layer: 'ROUTES',
      scope: 'CURRENT_HARBOR',
      highlight: 'MATCHED',
      fitBounds: true
    };
  }

  if ((/show .*(weather|wave)/.test(q) || /(weather|wave).*(on (the )?map)/.test(q)) && asksShow) {
    return {
      action: 'FOCUS_LAYER',
      layer: 'WAVES',
      scope: 'CURRENT_HARBOR',
      highlight: 'MATCHED',
      fitBounds: false
    };
  }

  if (/show .*\bharbor\b/.test(q) || /show .*\bport\b/.test(q)) {
    return {
      action: 'FOCUS_HARBOR',
      layer: 'HARBORS',
      scope: 'CURRENT_HARBOR',
      highlight: 'MATCHED',
      fitBounds: true
    };
  }

  if (/\b(depart|departure|safe to sail|safe to go)\b/.test(q)) {
    return {
      action: 'FOCUS_HARBOR',
      layer: 'HARBORS',
      scope: 'CURRENT_HARBOR',
      highlight: 'MATCHED',
      fitBounds: true
    };
  }

  return { ...PRESERVE_INTENT };
}

export function stripHallucinatedTargets(intent: MapIntent): MapIntent {
  return {
    ...intent,
    harborId: undefined,
    targetIds: undefined,
    location: intent.location?.name ? { name: intent.location.name } : undefined
  };
}

export function parseCoordinatorMapIntent(raw: unknown): MapIntent | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const parsed = mapIntentSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn('[ORCA] Invalid mapIntent from coordinator; defaulting to PRESERVE', parsed.error.flatten());
    return undefined;
  }
  const intent = parsed.data as MapIntent;
  if (intent.layer && !VALID_LAYERS.includes(intent.layer)) {
    console.warn('[ORCA] Invalid map layer from coordinator:', intent.layer);
    return { ...PRESERVE_INTENT };
  }
  return stripHallucinatedTargets(intent);
}

export function inheritMapIntent(
  query: string,
  planIntent: MapIntent | undefined,
  context?: ConversationContext
): MapIntent | undefined {
  const prev = context?.previousMapIntent;
  if (!prev || prev.action === 'PRESERVE') return planIntent;

  const isRefQuery = isReferentialMapQuery(query) || (/\b(show|display|fit|zoom)\b/i.test(query) && /\b(those|them|that|these)\b/i.test(query));
  if (isRefQuery) {
    const layer = (/\b(restrict|sanctuary)\b/i.test(query) ? 'RESTRICTED_ZONES' : (/\bpfz/i.test(query) ? 'PFZ' : prev.layer));
    return {
      ...prev,
      action: layer ? 'FIT_LAYER' : prev.action,
      layer: layer || prev.layer,
      fitBounds: true,
      highlight: prev.highlight && prev.highlight !== 'NONE' ? prev.highlight : 'ALL'
    };
  }

  // If current intent specifies an explicit layer different from prev, never contaminate it
  if (planIntent?.layer && prev?.layer && planIntent.layer !== prev.layer) {
    return planIntent;
  }

  // If query explicitly names a location or state, never inherit previous scopeName
  const locMatch = query.match(/\b(?:near|around|at|for|from|off|in)\s+([a-z]+(?:\s+[a-z]+)?)\b/i);
  const skipWords = new Set(['fishing', 'sailing', 'departure', 'port', 'harbor', 'harbour', 'sea', 'ocean', 'today', 'tomorrow', 'now', 'morning', 'the', 'a', 'an', 'india', 'map', 'active', 'those', 'them', 'there', 'area', 'areas']);
  const hasExplicitLocation = Boolean(extractCoastalStateName(query)) || Boolean(locMatch && locMatch[1] && !skipWords.has(locMatch[1].trim().toLowerCase()));
  if (hasExplicitLocation) {
    return planIntent;
  }

  // If current intent matches layer but has no explicit scope, inherit previous scope
  if (planIntent && prev.layer && planIntent.layer === prev.layer && !planIntent.scopeName && prev.scopeName) {
    return {
      ...planIntent,
      scope: prev.scope || planIntent.scope,
      scopeName: prev.scopeName
    };
  }

  return planIntent;
}

function idsFromZones(results: AgentResult[]): string[] {
  const zone = results.find((r) => r.agent === 'zone');
  const rows = (zone?.data?.restrictedZones as Array<{ zone_id?: string }>) || [];
  return rows.map((z) => String(z.zone_id)).filter(Boolean);
}

function boundsFromZones(results: AgentResult[]): [[number, number], [number, number]] | undefined {
  const zone = results.find((r) => r.agent === 'zone');
  const rows = (zone?.data?.restrictedZones as Array<{ latitude?: number; longitude?: number; area_km2?: number }>) || [];
  if (!rows.length) return undefined;
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  let validCount = 0;
  for (const r of rows) {
    const lat = Number(r.latitude);
    const lon = Number(r.longitude);
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
      const radiusDeg = (Math.sqrt(Number(r.area_km2 || 100)) / 111.32) + 0.15;
      minLat = Math.min(minLat, lat - radiusDeg);
      maxLat = Math.max(maxLat, lat + radiusDeg);
      minLon = Math.min(minLon, lon - radiusDeg);
      maxLon = Math.max(maxLon, lon + radiusDeg);
      validCount++;
    }
  }
  return validCount > 0 ? [[minLat, minLon], [maxLat, maxLon]] : undefined;
}

function idsFromPfz(results: AgentResult[]): string[] {
  const pfz = results.find((r) => r.agent === 'pfz');
  const recs = (pfz?.data?.recommendations as Array<any>) || [];
  return recs.map((r) => String(r.id || r.advisoryId || r.advisory_id)).filter(Boolean);
}

function boundsFromPfz(results: AgentResult[], isNational: boolean): [[number, number], [number, number]] | undefined {
  if (isNational) {
    return [[7.0, 68.0], [23.5, 89.5]];
  }
  const pfz = results.find((r) => r.agent === 'pfz');
  const recs = (pfz?.data?.recommendations as Array<any>) || [];
  if (!recs.length) return undefined;
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  let validCount = 0;
  for (const r of recs) {
    const lat = Number(r.latitude ?? r.pfz_latitude);
    const lon = Number(r.longitude ?? r.pfz_longitude);
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
      minLat = Math.min(minLat, lat - 0.2);
      maxLat = Math.max(maxLat, lat + 0.2);
      minLon = Math.min(minLon, lon - 0.2);
      maxLon = Math.max(maxLon, lon + 0.2);
      validCount++;
    }
  }
  return validCount > 0 ? [[minLat, minLon], [maxLat, maxLon]] : undefined;
}

function idsFromCyclones(results: AgentResult[]): string[] {
  const cyc = results.find((r) => r.agent === 'cyclone');
  const tracks = (cyc?.data?.tracks as Array<{ cycloneId?: string }>) || [];
  if (tracks.length) return [...new Set(tracks.map((t) => String(t.cycloneId)).filter(Boolean))];
  const name = cyc?.data?.name;
  return name ? [String(name)] : [];
}

function boundsFromCyclones(results: AgentResult[]): [[number, number], [number, number]] | undefined {
  const cyc = results.find((r) => r.agent === 'cyclone');
  const tracks = (cyc?.data?.tracks as Array<{ latitude?: number; longitude?: number }>) || [];
  if (!tracks.length) return undefined;
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  let validCount = 0;
  for (const t of tracks) {
    const lat = Number(t.latitude);
    const lon = Number(t.longitude);
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
      minLat = Math.min(minLat, lat - 0.5);
      maxLat = Math.max(maxLat, lat + 0.5);
      minLon = Math.min(minLon, lon - 0.5);
      maxLon = Math.max(maxLon, lon + 0.5);
      validCount++;
    }
  }
  return validCount > 0 ? [[minLat, minLon], [maxLat, maxLon]] : undefined;
}

export function normalizeMapIntent(
  plan: CoordinatorRequest,
  results: AgentResult[],
  locRes: LocationResolution,
  query: string,
  context?: ConversationContext
): MapIntent {
  const inferred = inferMapIntentFromQuery(query);
  let intent = inheritMapIntent(query, parseCoordinatorMapIntent(plan.mapIntent) || inferred, context) || inferred;

  if (!intent || !intent.action) intent = { ...PRESERVE_INTENT };

  if (locRes.status === 'INLAND') {
    const coords = locRes.coordinates;
    return {
      action: 'FOCUS_LOCATION',
      highlight: 'MATCHED',
      fitBounds: false,
      location: {
        name: locRes.locationName,
        latitude: coords?.latitude,
        longitude: coords?.longitude
      }
    };
  }

  if (intent.action === 'PRESERVE') {
    return { ...PRESERVE_INTENT };
  }

  if (intent.layer === 'RESTRICTED_ZONES') {
    const ids = idsFromZones(results);
    if (!ids.length) {
      console.log('[ORCA] MapIntent: no matching restricted zones; PRESERVE');
      return { ...PRESERVE_INTENT };
    }
    const targetScopeName = locRes.stateName || (locRes.harbor ? locRes.harbor.landing_center_name?.split(' (')[0] : (locRes.locationName || intent.scopeName));
    return {
      action: 'FIT_LAYER',
      layer: 'RESTRICTED_ZONES',
      scope: intent.scope || (locRes.status === 'COASTAL_STATE' ? 'STATE' : 'REGION'),
      scopeName: targetScopeName,
      targetIds: ids,
      highlight: 'ALL',
      fitBounds: true,
      bounds: boundsFromZones(results)
    };
  }

  if (intent.layer === 'PFZ') {
    const ids = idsFromPfz(results);
    if (!ids.length) {
      console.log('[ORCA] MapIntent: no PFZ records; PRESERVE');
      return { ...PRESERVE_INTENT };
    }
    const national = intent.scope === 'NATIONAL';
    const isState = !national && (intent.scope === 'STATE' || locRes.status === 'COASTAL_STATE') && intent.scope !== 'NEAR_LOCATION';
    const targetScopeName = national ? 'India' : (locRes.stateName || (locRes.harbor ? locRes.harbor.landing_center_name?.split(' (')[0] : (locRes.locationName || intent.scopeName)));
    return {
      action: 'FIT_LAYER',
      layer: 'PFZ',
      scope: national ? 'NATIONAL' : (isState ? 'STATE' : (intent.scope || 'NEAR_LOCATION')),
      scopeName: targetScopeName,
      targetIds: ids,
      highlight: (national || isState) ? 'ALL' : 'MATCHED',
      fitBounds: true,
      bounds: boundsFromPfz(results, national),
      harborId: (!national && !isState) ? locRes.harbor?.harbor_id : undefined,
      location: locRes.harbor && !national && !isState ? {
        name: locRes.harbor.landing_center_name,
        latitude: Number(locRes.harbor.latitude),
        longitude: Number(locRes.harbor.longitude)
      } : undefined
    };
  }

  if (intent.layer === 'CYCLONES') {
    const ids = idsFromCyclones(results);
    if (!ids.length) {
      console.log('[ORCA] MapIntent: no cyclone tracks; PRESERVE');
      return { ...PRESERVE_INTENT };
    }
    return {
      action: 'FIT_LAYER',
      layer: 'CYCLONES',
      scope: 'NATIONAL',
      targetIds: ids,
      highlight: 'ALL',
      fitBounds: true,
      bounds: boundsFromCyclones(results)
    };
  }

  if (intent.layer === 'EEZ' || intent.layer === 'IMBL') {
    return {
      action: 'FIT_LAYER',
      layer: intent.layer,
      scope: intent.scope || 'NATIONAL',
      scopeName: intent.scopeName || 'India',
      highlight: 'ALL',
      fitBounds: true,
      bounds: intent.layer === 'EEZ' ? [[5.5, 66.5], [23.8, 94.5]] : [[8.5, 78.5], [10.5, 80.5]]
    };
  }

  if (intent.layer === 'ROUTES') {
    return {
      action: intent.action === 'FOCUS_LAYER' ? 'FOCUS_LAYER' : 'FIT_LAYER',
      layer: 'ROUTES',
      scope: 'CURRENT_HARBOR',
      highlight: intent.highlight || 'MATCHED',
      fitBounds: true,
      harborId: locRes.harbor?.harbor_id
    };
  }

  if (intent.action === 'FOCUS_HARBOR' || intent.layer === 'HARBORS') {
    const h = locRes.harbor;
    if (!h) return { ...PRESERVE_INTENT };
    return {
      action: 'FOCUS_HARBOR',
      layer: 'HARBORS',
      scope: 'CURRENT_HARBOR',
      harborId: h.harbor_id,
      highlight: 'MATCHED',
      fitBounds: true,
      location: {
        name: h.landing_center_name,
        latitude: Number(h.latitude),
        longitude: Number(h.longitude)
      }
    };
  }

  if (intent.action === 'FOCUS_LOCATION') {
    const coords = locRes.coordinates;
    const h = locRes.harbor;
    return {
      action: 'FOCUS_LOCATION',
      highlight: 'MATCHED',
      fitBounds: false,
      location: {
        name: locRes.locationName,
        latitude: coords?.latitude ?? (h ? Number(h.latitude) : undefined),
        longitude: coords?.longitude ?? (h ? Number(h.longitude) : undefined)
      }
    };
  }

  return intent;
}

export function mapIntentExecuted(intent: MapIntent): boolean {
  return Boolean(intent && intent.action && intent.action !== 'PRESERVE');
}
