import { createGemini } from './gemini';
import { coordinatorSchema, CoordinatorRequest } from './schemas';
import { AgentName } from './types';
import { extractCoastalStateName, inferMapIntentFromQuery, mapIntentExecuted, PRESERVE_INTENT } from './mapIntent';
import { INLAND_REGIONS } from './db';

const AGENTS = ['weather', 'wind', 'tide', 'wave', 'cyclone', 'marine-alert', 'pfz', 'zone', 'species', 'catch'] as const;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

export function fallbackPlan(query: string): CoordinatorRequest {
  const q = query.toLowerCase();
  const requestedAgents: AgentName[] = [];
  const mapIntent = inferMapIntentFromQuery(query);

  if (mapIntent.layer === 'RESTRICTED_ZONES' || mapIntent.layer === 'EEZ' || mapIntent.layer === 'IMBL') {
    requestedAgents.push('zone');
  }
  if (mapIntent.layer === 'PFZ') requestedAgents.push('pfz');
  if (mapIntent.layer === 'CYCLONES') requestedAgents.push('cyclone');
  if (mapIntent.layer === 'ROUTES') requestedAgents.push('pfz');

  if (q.includes('fish') || q.includes('safe') || q.includes('sail') || q.includes('depart') || q.includes('boat')) {
    requestedAgents.push('weather', 'wind', 'wave', 'tide', 'pfz', 'marine-alert');
  } else {
    if (q.includes('weather') || q.includes('temp')) requestedAgents.push('weather');
    if (q.includes('wind') || q.includes('gust')) requestedAgents.push('wind');
    if (q.includes('wave') || q.includes('sea') || q.includes('swell')) requestedAgents.push('wave');
    if (q.includes('tide') || q.includes('high') || q.includes('low') || q.includes('schedule')) requestedAgents.push('tide');
    if (q.includes('cyclone') || q.includes('storm')) requestedAgents.push('cyclone');
    if (q.includes('alert') || q.includes('warning')) requestedAgents.push('marine-alert');
    if (q.includes('pfz') || q.includes('fishing zone')) requestedAgents.push('pfz');
    if (q.includes('sanctuary') || q.includes('restricted') || q.includes('eez') || q.includes('imbl')) requestedAgents.push('zone');
    if (q.includes('species') || q.includes('tuna') || q.includes('mackerel')) requestedAgents.push('species');
    if (q.includes('catch') || q.includes('trend')) requestedAgents.push('catch');
  }
  if (!requestedAgents.length) requestedAgents.push('weather', 'wind', 'wave');

  let locName: string | undefined;
  const known = [
    'odisha', 'odhisha', 'odisa', 'orissa', 'orisa', 'dhamra', 'puri', 'gopalpur', 'paradip', 'paradeep',
    'bengal', 'west bengal', 'westbengal', 'kolkata', 'calcutta', 'hooghly', 'sundarbans', 'sunderbans', 'digha', 'kakdwip', 'fraserganj',
    'andhra', 'andhra pradesh', 'andhrapradesh', 'visakhapatnam', 'vishakhapatnam', 'vizag', 'waltair', 'kakinada', 'machilipatnam', 'masulipatnam', 'krishnapatnam', 'nizampatnam', 'bhavanapadu', 'pudimadaka',
    'tamil nadu', 'tamilnadu', 'chennai', 'madras', 'kasimedu', 'tuticorin', 'thoothukudi', 'rameswaram', 'kanyakumari', 'cuddalore', 'nagapattinam', 'poompuhar',
    'kerala', 'kerla', 'keralam', 'cochin', 'kochi', 'ernakulam', 'kollam', 'vizhinjam', 'trivandrum', 'thiruvananthapuram', 'kannur', 'beypore', 'calicut', 'kozhikode', 'munambam',
    'karnataka', 'karnatka', 'mangalore', 'mangaluru', 'malpe', 'udupi', 'karwar', 'tadri', 'honnavar',
    'goa', 'panaji', 'panjim', 'vasco', 'cutbona', 'chapora',
    'maharashtra', 'maharastra', 'mumbai', 'bombay', 'sassoon', 'versova', 'ratnagiri', 'malvan',
    'gujarat', 'gujrat', 'veraval', 'somnath', 'porbandar', 'okha', 'dwarka', 'mangrol', 'jafarabad',
    'ahmedabad', 'gandhinagar', 'vadodara', 'rajkot', 'anand',
    'lakshadweep', 'lakshdweep', 'kavaratti', 'agatti', 'minicoy',
    'andaman', 'nicobar', 'port blair', 'havelock', 'diglipur',
    'delhi', 'new delhi', 'bangalore', 'bengaluru', 'hyderabad', 'jaipur', 'nagpur', 'bhopal', 'pune', 'lucknow', 'patna',
    'jaisalmer', 'jodhpur', 'udaipur', 'bikaner', 'ajmer', 'kota', 'agra', 'varanasi', 'gwalior', 'nashik'
  ];

  const sortedKnown = [...known].sort((a, b) => b.length - a.length);
  for (const loc of sortedKnown) {
    const escaped = loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\W)${escaped}(\\W|$)`, 'i');
    if (regex.test(q)) {
      locName = loc === 'west bengal' || loc === 'westbengal' || loc === 'bengal' ? 'West Bengal' : loc.charAt(0).toUpperCase() + loc.slice(1);
      break;
    }
  }

  if (!locName) {
    const match = q.match(/\b(?:in|near|around|at|for|from|off)\s+([a-z]+(?:\s+[a-z]+)?)\b/i);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const skipWords = new Set(['fishing', 'sailing', 'departure', 'port', 'sea', 'ocean', 'today', 'tomorrow', 'now', 'morning', 'the', 'a', 'an', 'india', 'map']);
      if (!skipWords.has(candidate)) {
        locName = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }

  const stateFromQuery = extractCoastalStateName(query);
  if (stateFromQuery && (!locName || locName.toLowerCase().includes('bengal') || locName.toLowerCase() === stateFromQuery.toLowerCase())) {
    locName = stateFromQuery;
  }

  if (mapIntent.scope === 'NATIONAL' && mapIntent.layer === 'PFZ') {
    locName = locName || 'India';
  }

  let intent = 'MARITIME_OPERATION_ASSESSMENT';
  if (mapIntent.layer === 'RESTRICTED_ZONES') intent = 'RESTRICTED_ZONES';
  else if (mapIntent.layer === 'PFZ' && mapIntent.scope === 'NATIONAL') intent = 'PFZ_OVERVIEW';
  else if (mapIntent.layer === 'PFZ') intent = 'PFZ_NEARBY';
  else if (mapIntent.layer === 'CYCLONES') intent = 'CYCLONE_TRACK';
  else if (mapIntent.layer === 'EEZ') intent = 'EEZ_BOUNDARY';
  else if (mapIntent.layer === 'IMBL') intent = 'IMBL_BOUNDARY';
  else if (mapIntent.layer === 'ROUTES') intent = 'ROUTE_DISPLAY';
  else if (requestedAgents.length === 1 && requestedAgents[0] === 'weather') intent = 'WEATHER_FORECAST';

  const inlandHit = locName && INLAND_REGIONS.has(locName.toLowerCase());
  if (inlandHit) {
    return {
      intent: 'INLAND_LOCATION',
      requestedAgents: ['weather'],
      location: { name: locName },
      mapIntent: { action: 'FOCUS_LOCATION', highlight: 'MATCHED', fitBounds: false, location: { name: locName } }
    };
  }

  return {
    intent,
    requestedAgents: Array.from(new Set(requestedAgents)),
    location: locName ? { name: locName } : undefined,
    timeRange: { from: 'tomorrow' },
    mapIntent
  };
}

export function fallbackSynthesize(query: string, planResult: CoordinatorRequest, results: any[], locRes?: any, mapIntent = PRESERVE_INTENT): string {
  const movedMap = mapIntentExecuted(mapIntent);
  const isCoastalState = locRes?.status === 'COASTAL_STATE';
  const isInland = locRes?.status === 'INLAND';
  const stateName = locRes?.stateName || planResult.location?.name || 'your coastal sector';
  const refHarborName = locRes?.referenceHarbor?.landing_center_name || locRes?.harbor?.landing_center_name;

  if (isInland) {
    const place = locRes?.locationName || planResult.location?.name || 'This area';
    return `${place} is inland, with no maritime harbor and no coastal fishing grounds. Maritime layers such as EEZ, PFZ, and restricted zones do not apply at this location.${refHarborName ? ` Reference maritime harbor (not a substitute for ${place}): ${refHarborName}.` : ''}`;
  }

  const alertResult = results.find((r) => r.agent === 'marine-alert')?.data;
  const cycloneResult = results.find((r) => r.agent === 'cyclone')?.data;
  const waveResult = results.find((r) => r.agent === 'wave')?.data;
  const windResult = results.find((r) => r.agent === 'wind')?.data;
  const pfzResult = results.find((r) => r.agent === 'pfz')?.data;
  const zoneResult = results.find((r) => r.agent === 'zone')?.data;

  if (mapIntent.layer === 'RESTRICTED_ZONES') {
    const count = zoneResult?.count ?? (zoneResult?.restrictedZones as unknown[])?.length ?? 0;
    const scope = mapIntent.scopeName || stateName;
    const zoneList = (zoneResult?.restrictedZones as any[]) || [];
    const zoneNames = zoneList.map((z: any) => z.zone_name).filter(Boolean).join(', ');
    if (!count) return `No matching restricted zones were found for ${scope}. The map was left unchanged.`;
    return `I found ${count} restricted zone${count === 1 ? '' : 's'} in ${scope}${zoneNames ? ` (${zoneNames})` : ''} and fitted the map view to highlight those zones.`;
  }

  if (mapIntent.layer === 'PFZ' && mapIntent.scope === 'NATIONAL') {
    const count = pfzResult?.count ?? (pfzResult?.recommendations as unknown[])?.length ?? 0;
    if (!count) return 'No PFZ advisories are currently available. The map was left unchanged.';
    return `I have displayed available PFZ advisories across India (${count} fishing grounds) and fitted the map to the national advisory overview.`;
  }

  if (mapIntent.layer === 'PFZ') {
    const count = pfzResult?.count ?? (pfzResult?.recommendations as unknown[])?.length ?? 0;
    const loc = locRes?.harbor?.landing_center_name?.split(' (')[0] || locRes?.locationName || 'the requested area';
    if (!count) return `No nearby PFZ advisories were found for ${loc}. The map was left unchanged.`;
    return `I highlighted ${count} PFZ ${count === 1 ? 'advisory' : 'advisories'} near ${loc} and fitted the map to those fishing grounds.`;
  }

  if (mapIntent.layer === 'CYCLONES') {
    if (!cycloneResult?.cyclonePresent && !cycloneResult?.tracks?.length) {
      return 'No cyclone track data is currently available. The map was left unchanged.';
    }
    return `I plotted the available cyclone track${cycloneResult?.name ? ` for ${cycloneResult.name}` : 's'} and fitted the map to the track bounds.`;
  }

  if (mapIntent.layer === 'EEZ') {
    return 'I focused the map on the Indian Exclusive Economic Zone (EEZ) outer boundary — not the 12 NM territorial sea.';
  }

  if (mapIntent.layer === 'IMBL') {
    return 'I focused the map on the International Maritime Boundary Line (IMBL).';
  }

  if (mapIntent.layer === 'ROUTES') {
    return 'I highlighted the recommended sailing route on the map.';
  }

  let isSafe = true;
  let cautionReason = '';

  if (cycloneResult?.cyclonePresent) {
    isSafe = false;
    cautionReason = `a cyclonic circulation (${cycloneResult.name}) is currently tracking within ${cycloneResult.distanceKm} km`;
  } else if (alertResult?.highestSeverity === 'RED' || alertResult?.highestSeverity === 'ORANGE') {
    isSafe = false;
    cautionReason = `there is an active regional weather alert (${alertResult.highestSeverity} warning)`;
  } else if ((waveResult?.height != null && waveResult.height > 2.5) || (windResult?.speed != null && windResult.speed > 40)) {
    isSafe = false;
    cautionReason = `sea conditions are choppy with elevated wave activity and strong winds`;
  }

  const pfzRecs = pfzResult?.recommendations || [];
  const pfzBest = pfzRecs[0];
  const pfzNote = pfzBest
    ? `INCOIS has identified active fishing grounds roughly ${pfzBest.distanceKm ? Math.round(pfzBest.distanceKm) + ' km' : '15-25 km'} offshore targeting ${pfzBest.targetSpecies || 'pelagic species'}`
    : `coastal waters are open with no severe hazard advisories`;

  const loc = locRes?.harbor?.landing_center_name?.split(' (')[0] || locRes?.locationName || planResult.location?.name || 'the selected maritime context';
  const mapClause = movedMap
    ? (mapIntent.action === 'FOCUS_HARBOR' ? ` The map is focused on ${loc}.` : ' The map was updated to the requested layer.')
    : '';

  if (isCoastalState) {
    const refNote = refHarborName ? ` Telemetry uses ${refHarborName} as a reference harbor, which is not the map target.` : '';
    if (isSafe) {
      return `${stateName} is a coastal maritime state. Conditions look favorable for the reference coastal context, and ${pfzNote}.${refNote}${mapClause}`;
    }
    return `${stateName} is a coastal maritime state. Caution is advised because ${cautionReason}.${refNote}${mapClause}`;
  }

  if (isSafe) {
    return `Tomorrow's outlook near ${loc} looks favorable. Sea state and surface winds are within a workable envelope, and ${pfzNote}.${mapClause}`;
  }
  return `I would hold off on operations near ${loc} because ${cautionReason}.${mapClause}`;
}

export async function plan(query: string): Promise<CoordinatorRequest> {
  const fb = fallbackPlan(query);
  try {
    const model: any = createGemini().withStructuredOutput(coordinatorSchema as any);
    const prompt = `You are ORCA's Coordinator Agent for a marine decision-support system.
Route the user's request to the minimum set of specialized agents needed.
Available agents: ${AGENTS.join(', ')}.

Return structured output including mapIntent.
MapIntent rules:
- If the user asks to SHOW a maritime element on the map, that element is the map focus.
- Restricted zones / sanctuary / MPA → FIT_LAYER, layer RESTRICTED_ZONES. If a state is named, scope STATE and scopeName of that state.
- All PFZs / PFZ map / PFZs in India → FIT_LAYER, layer PFZ, scope NATIONAL, highlight ALL.
- PFZ near a harbor → FIT_LAYER, layer PFZ, scope NEAR_LOCATION.
- Cyclone track → FIT_LAYER, layer CYCLONES.
- EEZ → FIT_LAYER, layer EEZ. Never call EEZ "territorial waters".
- IMBL → FIT_LAYER, layer IMBL.
- Recommended route → FOCUS_LAYER, layer ROUTES.
- Safe to depart / show harbor → FOCUS_HARBOR, layer HARBORS.
- Weather, tide, or waves WITHOUT asking to show them on the map → action PRESERVE.
- Do NOT invent harbor IDs, coordinates, zone IDs, PFZ IDs, or cyclone coordinates. Names only.

User query: ${query}`;
    const out = await withTimeout(model.invoke(prompt), 8000, fb);
    if (!out?.mapIntent) out.mapIntent = fb.mapIntent || PRESERVE_INTENT;
    if (!out.requestedAgents?.length) return fb;
    return out;
  } catch (err: any) {
    console.warn('Gemini plan error:', err?.message || err);
    return fb;
  }
}

export async function synthesize(query: string, planResult: CoordinatorRequest, results: any[], locRes?: any, mapIntent = PRESERVE_INTENT) {
  const fb = fallbackSynthesize(query, planResult, results, locRes, mapIntent);
  try {
    const model = createGemini();
    const compact = results.map((r) => ({ agent: r.agent, status: r.status, data: r.data, assessment: r.assessment })).filter(Boolean);
    const isCoastalState = locRes?.status === 'COASTAL_STATE';
    const isInland = locRes?.status === 'INLAND';
    const movedMap = mapIntentExecuted(mapIntent);
    const prompt = `You are SETU-ADAM01, a maritime operations advisor.
CRITICAL ZERO-EMOJI POLICY: Never use emojis.
Speak in 2-3 concise operational sentences. Answer the user's question directly.
Do NOT dump raw sensor tables. Title cards already show numbers.

MAP LANGUAGE RULES:
- Only claim a map update if MapIntent.action is not PRESERVE. Current MapIntent: ${JSON.stringify(mapIntent)}
- Map moved: ${movedMap}
- If PRESERVE, do not say you centered, highlighted, or fitted the map.
- For restricted-zone queries, describe matching zones — do NOT mention reference harbors, do NOT mention sea conditions or fishing grounds, and do NOT say you centered on Sultanpur or Veraval.
- For national PFZ, say you displayed available PFZs across India.
- Never call the EEZ "territorial waters". Territorial sea is 12 NM; EEZ is the 200 NM exclusive economic zone.
- Inland locations have no maritime harbor. Never imply they were resolved to Veraval.
${isCoastalState ? `- Query location is the coastal state ${locRes.stateName}. A reference harbor (${locRes.referenceHarbor?.landing_center_name || locRes.harbor?.landing_center_name}) may be used for telemetry only. Do not treat that harbor as the map target unless MapIntent is FOCUS_HARBOR.` : ''}
${isInland ? `- Location is INLAND (${locRes.locationName}). No coastal fishing, EEZ, PFZ, or restricted maritime layers apply.` : ''}

User Query: "${query}"
Target Area / Plan: ${JSON.stringify(planResult)}
Location Resolution: ${JSON.stringify(locRes || {})}
Telemetry & Agent Findings: ${JSON.stringify(compact)}`;

    const promise = model.invoke(prompt)
      .then((msg: any) => {
        const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        // Safety guard: if restricted zones query, ensure no hallucinated harbor reference or sea conditions leak
        if (mapIntent.layer === 'RESTRICTED_ZONES' && (/sultanpur|veraval|reference point|maritime reference/i.test(text) || /fishing grounds/i.test(text))) {
          return fb;
        }
        // Safety guard: if national PFZ query, ensure no single harbor claim leaks
        if (mapIntent.layer === 'PFZ' && mapIntent.scope === 'NATIONAL' && (/veraval|sultanpur|centered the radar/i.test(text))) {
          return fb;
        }
        return text;
      });
    return await withTimeout(promise, 10000, fb);
  } catch (err: any) {
    console.warn('Gemini synthesize error:', err?.message || err);
    return fb;
  }
}
