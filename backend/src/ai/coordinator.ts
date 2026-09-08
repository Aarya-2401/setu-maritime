import { createGemini } from './gemini';
import { coordinatorSchema, CoordinatorRequest } from './schemas';

const AGENTS = ['weather','wind','tide','wave','cyclone','marine-alert','pfz','zone','species','catch'] as const;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

export function fallbackPlan(query: string): CoordinatorRequest {
  const q = query.toLowerCase();
  const requestedAgents: any[] = [];
  if (q.includes('fish') || q.includes('safe') || q.includes('sail') || q.includes('depart') || q.includes('boat')) {
    requestedAgents.push('weather', 'wind', 'wave', 'tide', 'pfz', 'marine-alert');
  } else {
    if (q.includes('weather') || q.includes('temp')) requestedAgents.push('weather');
    if (q.includes('wind') || q.includes('gust')) requestedAgents.push('wind');
    if (q.includes('wave') || q.includes('sea') || q.includes('swell')) requestedAgents.push('wave');
    if (q.includes('tide') || q.includes('high') || q.includes('low') || q.includes('schedule')) requestedAgents.push('tide');
    if (q.includes('cyclone') || q.includes('storm')) requestedAgents.push('cyclone');
    if (q.includes('alert') || q.includes('warning')) requestedAgents.push('marine-alert');
    if (q.includes('pfz') || q.includes('zone')) requestedAgents.push('pfz');
    if (q.includes('sanctuary') || q.includes('restricted') || q.includes('eez') || q.includes('imbl')) requestedAgents.push('zone');
    if (q.includes('species') || q.includes('tuna') || q.includes('mackerel')) requestedAgents.push('species');
    if (q.includes('catch') || q.includes('trend')) requestedAgents.push('catch');
  }
  if (!requestedAgents.length) requestedAgents.push('weather', 'wind', 'wave', 'pfz');

  let locName: string | undefined;
  const known = [
    'odisha', 'odhisha', 'odisa', 'orissa', 'orisa', 'dhamra', 'puri', 'gopalpur', 'paradip', 'paradeep',
    'bengal', 'west bengal', 'westbengal', 'kolkata', 'calcutta', 'hooghly', 'sundarbans', 'sunderbans', 'digha', 'kakdwip', 'fraserganj',
    'andhra', 'andhra pradesh', 'andhrapradesh', 'visakhapatnam', 'vizag', 'kakinada', 'machilipatnam', 'krishnapatnam',
    'tamil nadu', 'tamilnadu', 'chennai', 'madras', 'kasimedu', 'tuticorin', 'thoothukudi', 'rameswaram', 'kanyakumari', 'cuddalore',
    'kerala', 'kerla', 'cochin', 'kochi', 'ernakulam', 'kollam', 'vizhinjam', 'trivandrum', 'kannur', 'beypore', 'calicut',
    'karnataka', 'karnatka', 'mangalore', 'mangaluru', 'malpe', 'udupi', 'karwar', 'tadri', 'honnavar',
    'goa', 'panaji', 'panjim', 'vasco', 'cutbona',
    'maharashtra', 'maharastra', 'mumbai', 'bombay', 'sassoon', 'versova', 'ratnagiri', 'malvan',
    'gujarat', 'gujrat', 'veraval', 'somnath', 'porbandar', 'okha', 'dwarka', 'mangrol',
    'lakshadweep', 'lakshdweep', 'kavaratti', 'agatti', 'minicoy',
    'andaman', 'nicobar', 'port blair',
    'delhi', 'new delhi', 'bangalore', 'bengaluru', 'hyderabad', 'jaipur', 'nagpur', 'bhopal', 'pune', 'lucknow', 'patna',
    'jaisalmer', 'jodhpur', 'udaipur', 'bikaner', 'ajmer', 'kota', 'agra', 'varanasi', 'gwalior', 'nashik'
  ];
  for (const loc of known) {
    if (q.includes(loc)) {
      locName = loc.charAt(0).toUpperCase() + loc.slice(1);
      break;
    }
  }

  // Extract location after prepositions if not found in known list (e.g. "near atlantis", "in nagpur", "around shimla")
  if (!locName) {
    const match = q.match(/\b(?:in|near|around|at|for|from|off)\s+([a-z]+(?:\s+[a-z]+)?)\b/i);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const skipWords = new Set(['fishing', 'sailing', 'departure', 'port', 'sea', 'ocean', 'today', 'tomorrow', 'now', 'morning', 'the', 'a', 'an']);
      if (!skipWords.has(candidate)) {
        locName = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }

  return {
    intent: 'MARITIME_OPERATION_ASSESSMENT',
    requestedAgents: Array.from(new Set(requestedAgents)),
    location: locName ? { name: locName } : undefined,
    timeRange: { from: 'tomorrow' },
  };
}

export function fallbackSynthesize(query: string, planResult: CoordinatorRequest, results: any[], locRes?: any): string {
  const isCoastalState = locRes?.status === 'COASTAL_STATE';
  const stateName = locRes?.stateName || planResult.location?.name || 'your coastal sector';
  const refHarborName = locRes?.harbor?.landing_center_name;
  const otherHarbors = (locRes?.suggestions || []).slice(0, 3).join(', ');

  const alertResult = results.find(r => r.agent === 'marine-alert')?.data;
  const cycloneResult = results.find(r => r.agent === 'cyclone')?.data;
  const waveResult = results.find(r => r.agent === 'wave')?.data;
  const windResult = results.find(r => r.agent === 'wind')?.data;
  const pfzResult = results.find(r => r.agent === 'pfz')?.data;

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

  if (isCoastalState && refHarborName) {
    const switchNote = otherHarbors ? ` You can also switch to other ${stateName} landing centers like ${otherHarbors}.` : '';
    if (isSafe) {
      return `${stateName} is a coastal maritime state. I have selected ${refHarborName} as your maritime reference point and centered the radar map. Conditions look favorable: sea state and surface winds are well within safe operating limits, and ${pfzNote}.${switchNote}`;
    } else {
      return `${stateName} is a coastal maritime state. I have selected ${refHarborName} as your reference point. Caution is advised because ${cautionReason}. I have updated your title cards with the latest telemetry.${switchNote}`;
    }
  }

  const loc = planResult.location?.name || 'your coastal sector';
  if (isSafe) {
    return `Yes, conditions look favorable for heading out near ${loc} tomorrow. Sea state and surface winds are well within safe operating limits, and ${pfzNote}. I have updated your dashboard title cards with the live weather, wind, wave, and tide telemetry, and centered the radar map on ${loc}.`;
  } else {
    return `I would recommend holding off on operations near ${loc} tomorrow because ${cautionReason}. It would be safer to remain in port until conditions settle. I have updated your dashboard title cards with the latest wind and wave readings so you can monitor conditions closely.`;
  }
}

export async function plan(query: string): Promise<CoordinatorRequest> {
  const fb = fallbackPlan(query);
  try {
    const model: any = createGemini().withStructuredOutput(coordinatorSchema as any);
    const prompt = `You are ORCA's Coordinator Agent for a marine decision-support system. Route the user's request to the minimum set of specialized agents needed. Available agents: ${AGENTS.join(', ')}. Extract location, time range, species and operation when present. Return only schema. User query: ${query}`;
    return await withTimeout(model.invoke(prompt), 8000, fb);
  } catch (err) {
    return fb;
  }
}

export async function synthesize(query: string, planResult: CoordinatorRequest, results: any[], locRes?: any) {
  const fb = fallbackSynthesize(query, planResult, results, locRes);
  try {
    const model = createGemini();
    const compact = results.map(r => ({ agent: r.agent, status: r.status, data: r.data, assessment: r.assessment })).filter(Boolean);
    const isCoastalState = locRes?.status === 'COASTAL_STATE';
    const prompt = `You are SETU-ADAM01, an intelligent maritime operations co-pilot and tactical advisor.
CRITICAL ZERO-EMOJI POLICY: Never use emojis anywhere in your response.
COMMUNICATION STYLE:
- Speak in a natural, conversational, fluid, and empathetic human voice—like an experienced marine officer or coastal advisor chatting with a skipper or fisherman.
- Absolutely DO NOT use static robotic templates, uppercase military headers (like "OPERATIONAL CLEARANCE: AUTHORIZED", "REPORT", "SUMMARY ASSESSMENT"), bulleted data sheets, or robotic scripts.
- Answer the user's question directly and conversationally in 2 to 3 concise, natural sentences.
- Do NOT dump raw numerical sensor tables (exact temperatures, wind speeds, wave heights, or tide data). The user's screen already features dedicated live title cards (Weather, Wind, Waves, Tides) that display those numbers.
- Mention qualitative conditions (e.g., calm seas, light swells, comfortable breeze) and highlight active INCOIS fishing hotspots and target species if relevant.
- Reassure the user naturally that their title cards have been updated with the live readings and the radar map has centered on their location.
${isCoastalState ? `- IMPORTANT: The user specified a coastal maritime state (${locRes.stateName}). Explicitly state that ${locRes.stateName} is a coastal maritime state, that you have selected ${locRes.harbor?.landing_center_name} as the reference point, and mention that they can switch to other supported state landing centers.` : ''}

User Query: "${query}"
Target Area / Plan: ${JSON.stringify(planResult)}
Location Resolution: ${JSON.stringify(locRes || {})}
Telemetry & Agent Findings: ${JSON.stringify(compact)}`;

    const promise = model.invoke(prompt)
      .then((msg: any) => typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
    return await withTimeout(promise, 10000, fb);
  } catch (err) {
    return fb;
  }
}

