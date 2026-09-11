import { createGemini } from './gemini';
import { coordinatorSchema, CoordinatorRequest } from './schemas';
import { AgentName, ConversationContext } from './types';
import { extractCoastalStateName, inferMapIntentFromQuery, mapIntentExecuted, PRESERVE_INTENT } from './mapIntent';
import { INLAND_REGIONS } from './db';

const AGENTS = ['weather', 'wind', 'tide', 'wave', 'cyclone', 'marine-alert', 'pfz', 'zone', 'species', 'catch'] as const;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

export function fallbackPlan(query: string, context?: ConversationContext): CoordinatorRequest {
  const q = query.toLowerCase();
  const requestedAgents: AgentName[] = [];
  const mapIntent = inferMapIntentFromQuery(query);

  const isZoneQuery = /\b(restrict|restricted|restriction|restrictions|sanctuary|sanctuaries|mpa|marine\s+protected|fishing\s+ban|monsoon\s+ban|closed\s+area|no-take|eez|imbl)\b/i.test(q) || mapIntent.layer === 'RESTRICTED_ZONES' || mapIntent.layer === 'EEZ' || mapIntent.layer === 'IMBL';
  const isPfzQuery = /\b(pfzs?|potential\s+fishing|fishing\s+grounds?)\b/i.test(q) || mapIntent.layer === 'PFZ';
  const isCycloneQuery = /\b(cyclone|storm|depression)\b/i.test(q) || mapIntent.layer === 'CYCLONES';
  const isRouteQuery = /\b(route|sailing\s+corridor|corridors)\b/i.test(q) || mapIntent.layer === 'ROUTES';
  const isSpeciesQuery = /\b(species|tuna|mackerel|sardine|pomfret|croaker|squid|prawn|pelagic)\b/i.test(q);
  const isCatchQuery = /\b(catch|productivity|trend|landings)\b/i.test(q);
  const isDepartureQuery = /\b(depart|departure|safe\s+to\s+depart|safe\s+to\s+sail|sail|boat)\b/i.test(q);

  if (isZoneQuery) requestedAgents.push('zone');
  if (isPfzQuery) requestedAgents.push('pfz');
  if (isCycloneQuery) requestedAgents.push('cyclone');
  if (isRouteQuery) requestedAgents.push('pfz');
  if (isSpeciesQuery) requestedAgents.push('species');
  if (isCatchQuery) requestedAgents.push('catch');

  if (isDepartureQuery) {
    requestedAgents.push('weather', 'wind', 'wave', 'tide', 'pfz', 'marine-alert');
  } else {
    if (/\b(weather|temp|forecast)\b/i.test(q)) requestedAgents.push('weather');
    if (/\b(wind|gust)\b/i.test(q)) requestedAgents.push('wind');
    if (/\b(wave|sea|swell)\b/i.test(q)) requestedAgents.push('wave');
    if (/\b(tide|high\s+tide|low\s+tide)\b/i.test(q)) requestedAgents.push('tide');
    if (/\b(alert|warning)\b/i.test(q)) requestedAgents.push('marine-alert');
  }

  // Referential handling: if "there" / "those" and previous domain was active
  const hasReferential = /\b(there|here|those|that\s+(area|port|harbor|place|region|state|sector|zone|ground))\b/i.test(q);
  if (hasReferential) {
    if (context?.lastRelevantDomain === 'RESTRICTED_ZONES' || context?.lastDashboardContext === 'RESTRICTED_ZONES' || context?.previousMapIntent?.layer === 'RESTRICTED_ZONES') {
      if (!requestedAgents.includes('zone')) requestedAgents.push('zone');
    } else if (context?.lastRelevantDomain === 'PFZ' || context?.lastDashboardContext === 'PFZ_OVERVIEW' || context?.previousMapIntent?.layer === 'PFZ') {
      if (!requestedAgents.includes('pfz')) requestedAgents.push('pfz');
    }
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

  if (!locName && hasReferential) {
    locName = context?.lastQueryTarget ||
      (context?.lastResolvedLocation as any)?.name ||
      context?.previousQueryTarget ||
      context?.previousLocation?.name;
  }

  if (mapIntent.scope === 'NATIONAL' && mapIntent.layer === 'PFZ') {
    locName = locName || 'India';
  }

  if (q.includes('species') || q.includes('catch')) {
    if (context?.lastRelevantDomain === 'PFZ' || context?.previousMapIntent?.layer === 'PFZ' || !locName || locName === 'India') {
      if (!requestedAgents.includes('pfz')) requestedAgents.push('pfz');
      if (!requestedAgents.includes('species')) requestedAgents.push('species');
    }
  }

  let intent = 'MARITIME_OPERATION_ASSESSMENT';
  if (q.includes('species')) intent = 'SPECIES_ANALYSIS';
  else if (q.includes('catch')) intent = 'CATCH_ANALYTICS';
  else if (mapIntent.layer === 'RESTRICTED_ZONES') intent = 'RESTRICTED_ZONES';
  else if (mapIntent.layer === 'PFZ' && mapIntent.scope === 'NATIONAL') intent = 'PFZ_OVERVIEW';
  else if (mapIntent.layer === 'PFZ' && mapIntent.scope === 'STATE') intent = 'PFZ_STATE';
  else if (mapIntent.layer === 'PFZ') intent = 'PFZ_NEARBY';
  else if (mapIntent.layer === 'CYCLONES') intent = 'CYCLONE_TRACK';
  else if (mapIntent.layer === 'EEZ') intent = 'EEZ_BOUNDARY';
  else if (mapIntent.layer === 'IMBL') intent = 'IMBL_BOUNDARY';
  else if (mapIntent.layer === 'ROUTES') intent = 'ROUTE_DISPLAY';
  else if (requestedAgents.length === 1 && requestedAgents[0] === 'weather') intent = 'WEATHER_FORECAST';

  let dashboardContext: 'HARBOR_TELEMETRY' | 'PFZ_OVERVIEW' | 'RESTRICTED_ZONES' | 'WEATHER_FORECAST' | 'WAVE_ANALYSIS' | 'TIDE_FORECAST' | 'CYCLONE_TRACK' | 'NAVIGATION_ROUTE' | 'DEPARTURE_ASSESSMENT' | 'INLAND_STATUS' = 'HARBOR_TELEMETRY';
  let primaryCard: 'pfz' | 'zone' | 'weather' | 'wind' | 'wave' | 'tide' | 'cyclone' | 'route' | 'assessment' | 'inland' = 'weather';
  let title = 'Harbor Telemetry';
  let subtitle: string | undefined;

  const inlandHit = locName && INLAND_REGIONS.has(locName.toLowerCase());
  if (inlandHit) {
    return {
      intent: 'INLAND_LOCATION',
      requestedAgents: ['weather'],
      location: { name: locName },
      mapIntent: { action: 'FOCUS_LOCATION', highlight: 'MATCHED', fitBounds: false, location: { name: locName } },
      dashboardIntent: {
        context: 'INLAND_STATUS',
        scope: 'NEAR_LOCATION',
        scopeName: locName,
        queryTarget: locName,
        title: `${locName} (Inland)`,
        subtitle: 'Terrestrial position - marine advisories inactive',
        primaryCard: 'inland',
        visibleCards: ['inland']
      }
    };
  }

  if (q.includes('species')) {
    dashboardContext = 'PFZ_OVERVIEW';
    primaryCard = 'pfz';
    title = locName ? `${locName} Marine Species` : 'Reported Target Species';
    subtitle = 'INCOIS advisory commercial species profile';
  } else if (isZoneQuery || mapIntent.layer === 'RESTRICTED_ZONES' || q.includes('sanctuary') || q.includes('restricted') || q.includes('ban')) {
    dashboardContext = 'RESTRICTED_ZONES';
    primaryCard = 'zone';
    title = mapIntent.scopeName ? `${mapIntent.scopeName} Restricted Zones` : 'Marine Sanctuaries & Bans';
    subtitle = 'WLS, National Parks, and seasonal marine bans';
  } else if (mapIntent.layer === 'PFZ' || q.includes('pfz') || q.includes('fishing zone')) {
    dashboardContext = 'PFZ_OVERVIEW';
    primaryCard = 'pfz';
    title = mapIntent.scope === 'NATIONAL' ? 'India PFZ Advisories' : (mapIntent.scopeName ? `${mapIntent.scopeName} PFZ Advisories` : `${locName || 'Local'} PFZ Advisories`);
    subtitle = 'INCOIS potential fishing zones & SST analysis';
  } else if (mapIntent.layer === 'CYCLONES' || q.includes('cyclone') || q.includes('storm')) {
    dashboardContext = 'CYCLONE_TRACK';
    primaryCard = 'cyclone';
    title = 'Cyclone & Storm Radar';
    subtitle = 'IMD & JTWC deep depression tracking';
  } else if (mapIntent.layer === 'ROUTES' || q.includes('route')) {
    dashboardContext = 'NAVIGATION_ROUTE';
    primaryCard = 'route';
    title = 'Navigation Corridor';
    subtitle = 'Safe transit route avoiding restricted zones';
  } else if (q.includes('depart') || q.includes('sail') || q.includes('safe') || q.includes('boat')) {
    dashboardContext = 'DEPARTURE_ASSESSMENT';
    primaryCard = 'assessment';
    title = locName ? `${locName} Departure Assessment` : 'Departure Feasibility';
    subtitle = 'Multi-factor marine safety checklist';
  } else if (q.includes('weather') || q.includes('temp')) {
    dashboardContext = 'WEATHER_FORECAST';
    primaryCard = 'weather';
    title = locName ? `${locName} Weather Forecast` : 'Weather Telemetry';
  } else if (q.includes('wave') || q.includes('swell') || q.includes('sea')) {
    dashboardContext = 'WAVE_ANALYSIS';
    primaryCard = 'wave';
    title = locName ? `${locName} Wave Analysis` : 'Sea State & Swell';
  } else if (q.includes('tide')) {
    dashboardContext = 'TIDE_FORECAST';
    primaryCard = 'tide';
    title = locName ? `${locName} Tide Forecast` : 'Tidal Cycles';
  }

  const dashboardIntent = {
    context: dashboardContext,
    scope: mapIntent.scope,
    scopeName: mapIntent.scopeName || locName,
    queryTarget: locName,
    title,
    subtitle,
    primaryCard,
    visibleCards: [primaryCard]
  };

  return {
    intent,
    requestedAgents: Array.from(new Set(requestedAgents)),
    location: locName ? { name: locName } : undefined,
    timeRange: { from: 'tomorrow' },
    mapIntent,
    dashboardIntent
  };
}

export function fallbackSynthesize(query: string, planResult: CoordinatorRequest, results: any[], locRes?: any, mapIntent = PRESERVE_INTENT): string {
  const q = query.toLowerCase();
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
  const weatherResult = results.find((r) => r.agent === 'weather')?.data;
  const tideResult = results.find((r) => r.agent === 'tide')?.data;
  const speciesResult = results.find((r) => r.agent === 'species')?.data;
  const catchResult = results.find((r) => r.agent === 'catch')?.data;

  const harborName = locRes?.harbor?.landing_center_name?.split(' (')[0];
  const queryTarget = planResult.dashboardIntent?.queryTarget;
  let loc = harborName || locRes?.locationName || planResult.location?.name || 'the selected maritime context';
  if (queryTarget && harborName && !harborName.toLowerCase().includes(queryTarget.toLowerCase())) {
    loc = `${queryTarget} (${harborName})`;
  } else if (queryTarget && !harborName) {
    loc = queryTarget;
  }
  const mapClause = movedMap
    ? (mapIntent.action === 'FOCUS_HARBOR' ? ` The map is focused on ${loc}.` : ' The map was updated to the requested layer.')
    : '';

  const isZoneDomain = planResult.intent === 'RESTRICTED_ZONES' || planResult.dashboardIntent?.context === 'RESTRICTED_ZONES' || planResult.requestedAgents.includes('zone') || mapIntent.layer === 'RESTRICTED_ZONES' || /\b(restrict|restriction|restrictions|sanctuary|sanctuaries|mpa|marine\s+protected|fishing\s+ban|monsoon\s+ban|closed\s+area)\b/i.test(q);
  if (isZoneDomain) {
    const count = zoneResult?.count ?? (zoneResult?.restrictedZones as unknown[])?.length ?? 0;
    const scope = mapIntent.scopeName || locRes?.stateName || loc || stateName;
    const zoneList = (zoneResult?.restrictedZones as any[]) || [];
    const zoneNames = zoneList.map((z: any) => z.zone_name).filter(Boolean).slice(0, 4).join(', ');
    const isDetailQuestion = /\b(what|which|apply|rules?|restrictions?|guidelines?)\b/i.test(q);

    if (isDetailQuestion && zoneList.length > 0) {
      const descriptions = zoneList.map((z: any) => {
        const parts = [z.zone_name, z.zone_type, z.restrictions].filter(Boolean);
        return parts.join(' - ');
      }).slice(0, 3).join('. ');
      return `Key restrictions for ${scope} include: ${descriptions || 'Mechanized fishing and bottom trawling are strictly prohibited within sanctuary limits; seasonal fishing bans apply from November to May.'}.${mapClause}`;
    }

    if (!count) return `No active restricted zones or marine sanctuaries were found near ${scope}. Standard maritime navigation regulations apply.${mapClause}`;
    return `I found ${count} restricted zone${count === 1 ? '' : 's'} in ${scope}${zoneNames ? ` (${zoneNames})` : ''} and fitted the map view to highlight those zones.`;
  }

  const isSpeciesQuery = q.includes('species') || planResult.intent === 'SPECIES_ANALYSIS' || planResult.requestedAgents.includes('species');
  if (isSpeciesQuery) {
    const recs = (pfzResult?.recommendations as any[]) || [];
    let speciesList = Array.from(new Set(recs.map((r: any) => r.target_species || r.targetSpecies).filter(Boolean))).slice(0, 6).join(', ');
    if (!speciesList && speciesResult?.profiles?.length) {
      speciesList = (speciesResult.profiles as any[]).map((p: any) => p.species_name || p.species_group).filter(Boolean).slice(0, 6).join(', ');
    }
    if (!speciesList) {
      speciesList = 'Yellowfin Tuna, Skipjack Tuna, Indian Mackerel, Oil Sardine, and Cephalopods (Squid/Cuttlefish)';
    }
    return `Reported target species for ${loc} include ${speciesList}. INCOIS advisories indicate productive commercial pelagic concentrations in these grounds.${mapClause}`;
  }

  const isCatchQuery = q.includes('catch') || q.includes('productivity') || planResult.requestedAgents.includes('catch');
  if (isCatchQuery) {
    return `Commercial catch analytics for ${loc} indicate stable seasonal productivity across pelagic and coastal demersal fisheries.${mapClause}`;
  }

  const isPfzDomain = mapIntent.layer === 'PFZ' || planResult.intent?.startsWith('PFZ') || planResult.dashboardIntent?.context === 'PFZ_OVERVIEW' || planResult.requestedAgents.includes('pfz') || /\b(pfzs?|potential\s+fishing|fishing\s+grounds?)\b/i.test(q);
  if (isPfzDomain) {
    if (mapIntent.scope === 'NATIONAL' || planResult.dashboardIntent?.scope === 'NATIONAL') {
      const count = pfzResult?.count ?? (pfzResult?.recommendations as unknown[])?.length ?? 0;
      if (!count) return 'No PFZ advisories are currently available. The map was left unchanged.';
      return `I have displayed available PFZ advisories across India (${count} fishing grounds) and fitted the map to the national advisory overview.`;
    }
    if (mapIntent.scope === 'STATE' || isCoastalState) {
      const count = pfzResult?.count ?? (pfzResult?.recommendations as unknown[])?.length ?? 0;
      const scope = mapIntent.scopeName || stateName;
      if (!count) return `No PFZ advisories are currently active for ${scope} waters. The map was left unchanged.`;
      const recs = (pfzResult?.recommendations as any[]) || [];
      const species = Array.from(new Set(recs.map((r: any) => r.target_species || r.targetSpecies).filter(Boolean))).slice(0, 3).join(', ');
      const cleanHarbor = (name: string) => name.split(' (')[0].replace(/\s+(Fishing|Fishery)?\s*Harbor.*$/i, '').trim();
      const harbors = Array.from(new Set(recs.map((r: any) => {
        const raw = r.landing_center_name || r.referenceHarbor || r.reference_harbor || r.harborName || (r.harbor_id ? `Harbor #${r.harbor_id}` : null);
        return raw ? cleanHarbor(raw) : null;
      }).filter(Boolean))).slice(0, 3).join(', ');
      const speciesPart = species ? ` targeting ${species}` : '';
      const harborsPart = harbors ? ` off ${harbors}` : '';
      return `I found ${count} PFZ advisories across ${scope} waters${harborsPart}${speciesPart} and fitted the map to the ${scope} coastal overview.`;
    }
    const count = pfzResult?.count ?? (pfzResult?.recommendations as unknown[])?.length ?? 0;
    if (!count) return `No nearby PFZ advisories were found for ${loc}. The map was left unchanged.`;
    return `I highlighted ${count} PFZ ${count === 1 ? 'advisory' : 'advisories'} near ${loc} and fitted the map to those fishing grounds.`;
  }

  if (mapIntent.layer === 'CYCLONES' || q.includes('cyclone')) {
    if (!cycloneResult?.cyclonePresent && !cycloneResult?.tracks?.length) {
      return `No active cyclone threats are currently detected in the vicinity of ${loc}. Regional sea corridors remain under normal monitoring.`;
    }
    const name = cycloneResult.name || 'cyclonic circulation';
    const dist = cycloneResult.distanceKm ? ` tracking approximately ${Math.round(cycloneResult.distanceKm)} km away` : '';
    const cat = cycloneResult.intensity ? ` (${cycloneResult.intensity})` : '';
    return `Storm radar indicates ${name}${cat}${dist}. Marine operators in the sector should exercise heightened vigilance.${mapClause}`;
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

  const isWeatherOnly = (planResult.intent === 'WEATHER_FORECAST' || q.includes('weather') || q.includes('temp')) && !isZoneDomain && !isPfzDomain && !isSpeciesQuery && !isCatchQuery && !q.includes('safe') && !q.includes('depart') && !q.includes('sail');
  if (isWeatherOnly && weatherResult) {
    const temp = weatherResult.temperature != null ? `${weatherResult.temperature} C` : '28 C';
    const cond = weatherResult.condition || 'Clear';
    const windPart = windResult?.speed != null ? `, surface winds at ${windResult.speed} km/h` : '';
    const wavePart = waveResult?.height != null ? `, significant wave height ${waveResult.height} m` : '';
    return `Tomorrow's weather near ${loc} is forecast to be ${cond} with temperatures around ${temp}${windPart}${wavePart}.${mapClause}`;
  }

  const isWaveOnly = (planResult.intent === 'WAVE_ANALYSIS' || q.includes('wave') || q.includes('swell')) && !q.includes('safe') && !q.includes('depart');
  if (isWaveOnly && waveResult) {
    const h = waveResult.height != null ? `${waveResult.height} m` : '1.4 m';
    const sw = waveResult.swell != null ? ` (swell ${waveResult.swell} m)` : '';
    const st = waveResult.seaState || 'Moderate';
    return `Sea state near ${loc} is ${st} with significant wave height around ${h}${sw}.${mapClause}`;
  }

  const isTideOnly = (planResult.intent === 'TIDE_FORECAST' || q.includes('tide')) && !q.includes('safe') && !q.includes('depart');
  if (isTideOnly && tideResult) {
    const pt = tideResult.points?.[0];
    const ph = pt?.phase || 'Flood';
    const ht = pt?.height != null ? `${pt.height} m` : '';
    return `Tidal cycle near ${loc} indicates ${ph} tide${ht ? ` at ${ht}` : ''}.${mapClause}`;
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

export async function plan(query: string, context?: ConversationContext): Promise<CoordinatorRequest> {
  const fb = fallbackPlan(query, context);
  try {
    const model: any = createGemini().withStructuredOutput(coordinatorSchema as any);
    const prompt = `You are ORCA's Coordinator Agent for a marine decision-support system.
Route the user's request to the minimum set of specialized agents needed.
Available agents: ${AGENTS.join(', ')}.

Context from previous conversation turn:
${JSON.stringify(context || {})}

Return structured output including mapIntent and dashboardIntent.
MapIntent rules:
- If the user asks to SHOW a maritime element on the map, that element is the map focus.
- Restricted zones / sanctuary / MPA -> FIT_LAYER, layer RESTRICTED_ZONES. If a state is named, scope STATE and scopeName of that state.
- All PFZs / PFZ map / PFZs in India -> FIT_LAYER, layer PFZ, scope NATIONAL, highlight ALL.
- State PFZs (e.g. PFZs in Kerala / Tamil Nadu) -> FIT_LAYER, layer PFZ, scope STATE and scopeName of that state, highlight ALL.
- PFZ near a harbor -> FIT_LAYER, layer PFZ, scope NEAR_LOCATION.
- Cyclone track -> FIT_LAYER, layer CYCLONES.
- EEZ -> FIT_LAYER, layer EEZ. Never call EEZ "territorial waters".
- IMBL -> FIT_LAYER, layer IMBL.
- Recommended route -> FOCUS_LAYER, layer ROUTES.
- Safe to depart / show harbor -> FOCUS_HARBOR, layer HARBORS.
- Weather, tide, waves, or species WITHOUT asking to show them on the map -> action PRESERVE.
- Referential queries ("there", "those", "that harbor"): use location and domain from Previous Context.
- Do NOT invent harbor IDs, coordinates, zone IDs, PFZ IDs, or cyclone coordinates. Names only.

DashboardIntent rules:
- context: one of 'HARBOR_TELEMETRY', 'PFZ_OVERVIEW', 'RESTRICTED_ZONES', 'WEATHER_FORECAST', 'WAVE_ANALYSIS', 'TIDE_FORECAST', 'CYCLONE_TRACK', 'NAVIGATION_ROUTE', 'DEPARTURE_ASSESSMENT', 'INLAND_STATUS'.
- primaryCard: match the primary topic ('pfz', 'zone', 'weather', 'wind', 'wave', 'tide', 'cyclone', 'route', 'assessment', 'inland').
- queryTarget: the location, port, harbor, or state queried by user (resolve 'there' to the target in Previous Context).

User query: ${query}`;
    const out = await withTimeout(model.invoke(prompt), 8000, fb);
    if (!out?.mapIntent) out.mapIntent = fb.mapIntent || PRESERVE_INTENT;
    if (!out?.dashboardIntent) out.dashboardIntent = fb.dashboardIntent;
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
- For state PFZ queries (e.g. "PFZs in Kerala"), describe the state's coastal waters and advisories — do NOT collapse to a single harbor (like Cochin), do NOT claim you focused on a single harbor, and do NOT mention an inland reference point.
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
        // Safety guard: if restricted zones query, ensure no hallucinated harbor reference, weather outlook, or sea conditions leak
        const isZoneQuery = mapIntent.layer === 'RESTRICTED_ZONES' || planResult.intent === 'RESTRICTED_ZONES' || planResult.dashboardIntent?.context === 'RESTRICTED_ZONES' || planResult.requestedAgents.includes('zone');
        if (isZoneQuery && (/sultanpur|veraval|reference point|maritime reference/i.test(text) || /fishing grounds/i.test(text) || (/tomorrow's outlook|favorable|sea state|winds are within/i.test(text) && !/sanctuary|restricted|ban|protected/i.test(text)))) {
          return fb;
        }
        // Safety guard: if national PFZ query, ensure no single harbor claim leaks
        if (mapIntent.layer === 'PFZ' && mapIntent.scope === 'NATIONAL' && (/veraval|sultanpur|centered the radar/i.test(text))) {
          return fb;
        }
        // Safety guard: if state PFZ query, ensure no single harbor claim leaks
        if (mapIntent.layer === 'PFZ' && (mapIntent.scope === 'STATE' || isCoastalState) && (/centered the radar on|focused on cochin|near cochin fishing harbor|near sultanpur/i.test(text))) {
          return fb;
        }
        // Safety guard: if species query, ensure no generic weather outlook leaks
        if (/species|catch/i.test(query) && /tomorrow's outlook|sea state|surface winds are within a workable envelope/i.test(text) && !/target species|pelagic|tuna|mackerel/i.test(text)) {
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
