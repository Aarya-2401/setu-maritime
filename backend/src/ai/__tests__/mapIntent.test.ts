import test from 'node:test';
import assert from 'node:assert/strict';
import { mapIntentSchema } from '../schemas';
import {
  inferMapIntentFromQuery,
  normalizeMapIntent,
  inheritMapIntent,
  extractCoastalStateName,
  PRESERVE_INTENT
} from '../mapIntent';
import { resolveLocation, LocationResolution } from '../db';
import type { AgentResult, MapIntent } from '../types';
import { runPfz, runZone, runWeather, runCyclone } from '../agents';
import { fallbackPlan, fallbackSynthesize } from '../coordinator';
// @ts-ignore
import { executeMapIntent } from '../../../../frontend/src/utils/mapIntentExecutor.js';

test('1. MapIntent schema validation', () => {
  const preserve = mapIntentSchema.safeParse({
    action: 'PRESERVE',
    highlight: 'NONE',
    fitBounds: false
  });
  assert.equal(preserve.success, true, 'PRESERVE schema should be valid');

  const fitLayer = mapIntentSchema.safeParse({
    action: 'FIT_LAYER',
    layer: 'RESTRICTED_ZONES',
    scope: 'STATE',
    scopeName: 'West Bengal',
    targetIds: ['IND-MPA-005'],
    highlight: 'ALL',
    fitBounds: true,
    bounds: [[21.5, 88.0], [22.4, 89.2]]
  });
  assert.equal(fitLayer.success, true, 'FIT_LAYER schema with bounds should be valid');

  const invalid = mapIntentSchema.safeParse({
    action: 'INVALID_ACTION',
    layer: 'NOT_A_LAYER'
  });
  assert.equal(invalid.success, false, 'Invalid action and layer should fail validation');
});

test('2. Query: show restricted areas in west bengal', () => {
  const query = 'show restricted areas in west bengal';
  const inferred = inferMapIntentFromQuery(query);

  assert.equal(inferred.action, 'FIT_LAYER');
  assert.equal(inferred.layer, 'RESTRICTED_ZONES');
  assert.equal(inferred.scope, 'STATE');
  assert.equal(inferred.scopeName, 'West Bengal');

  const mockPlan = {
    planId: 'p1',
    intent: 'zone_lookup',
    requestedAgents: ['zone'],
    mapIntent: inferred,
    requiresApproval: false
  };

  const mockResults: AgentResult[] = [{
    agent: 'zone',
    status: 'success',
    data: {
      restrictedZones: [{
        zone_id: 'IND-MPA-005',
        zone_name: 'Sundarbans National Park (Marine & Estuarine Biosphere)',
        state: 'West Bengal',
        latitude: 21.94,
        longitude: 88.9,
        area_km2: 1330
      }],
      count: 1
    },
    cardUpdates: [],
    confidence: 0.95,
    timestamp: new Date().toISOString()
  }];

  const mockLocRes: LocationResolution = {
    status: 'COASTAL_STATE',
    locationType: 'COASTAL_STATE',
    locationName: 'West Bengal',
    stateName: 'West Bengal',
    harbor: null
  };

  const normalized = normalizeMapIntent(mockPlan as any, mockResults, mockLocRes, query);
  assert.equal(normalized.action, 'FIT_LAYER');
  assert.equal(normalized.layer, 'RESTRICTED_ZONES');
  assert.equal(normalized.scope, 'STATE');
  assert.equal(normalized.targetIds?.includes('IND-MPA-005'), true);
  assert.ok(normalized.bounds, 'Should compute bounding box for matching zones');
});

test('3. Query: can you show me the restricted zones in map (conversational follow-up)', () => {
  const followUpQuery = 'can you show me the restricted zones in map';
  const context = {
    previousMapIntent: {
      action: 'FIT_LAYER' as const,
      layer: 'RESTRICTED_ZONES' as const,
      scope: 'STATE' as const,
      scopeName: 'West Bengal'
    },
    previousQueryTarget: 'West Bengal'
  };

  const inherited = inheritMapIntent(followUpQuery, inferMapIntentFromQuery(followUpQuery), context);
  assert.ok(inherited, 'Should inherit previous intent context');
  assert.equal(inherited?.layer, 'RESTRICTED_ZONES');
  assert.equal(inherited?.scope, 'STATE');
  assert.equal(inherited?.scopeName, 'West Bengal');
});

test('4. Query: show all PFZs in India', () => {
  const query = 'show all PFZs in India';
  const inferred = inferMapIntentFromQuery(query);

  assert.equal(inferred.action, 'FIT_LAYER');
  assert.equal(inferred.layer, 'PFZ');
  assert.equal(inferred.scope, 'NATIONAL');
  assert.equal(inferred.highlight, 'ALL');

  const mockPlan = {
    planId: 'p2',
    intent: 'pfz_lookup',
    requestedAgents: ['pfz'],
    mapIntent: inferred,
    requiresApproval: false
  };

  const mockResults: AgentResult[] = [{
    agent: 'pfz',
    status: 'success',
    data: {
      recommendations: [
        { advisory_id: 'PFZ-001', pfz_latitude: 20.5, pfz_longitude: 69.5 },
        { advisory_id: 'PFZ-002', pfz_latitude: 9.8, pfz_longitude: 76.2 },
        { advisory_id: 'PFZ-003', pfz_latitude: 19.8, pfz_longitude: 86.1 }
      ]
    },
    cardUpdates: [],
    confidence: 0.95,
    timestamp: new Date().toISOString()
  }];

  const mockLocRes: LocationResolution = {
    status: 'SUPPORTED',
    locationType: 'REGION',
    locationName: 'India',
    harbor: null
  };

  const normalized = normalizeMapIntent(mockPlan as any, mockResults, mockLocRes, query);
  assert.equal(normalized.action, 'FIT_LAYER');
  assert.equal(normalized.layer, 'PFZ');
  assert.equal(normalized.scope, 'NATIONAL');
  assert.equal(normalized.highlight, 'ALL');
  assert.equal(normalized.targetIds?.length, 3);
  assert.ok(normalized.bounds, 'National PFZ must provide nationwide bounding box');
});

test('5. Query: show PFZ near Veraval', () => {
  const query = 'show PFZ near Veraval';
  const inferred = inferMapIntentFromQuery(query);

  assert.equal(inferred.action, 'FIT_LAYER');
  assert.equal(inferred.layer, 'PFZ');
  assert.equal(inferred.scope, 'NEAR_LOCATION');

  const mockPlan = {
    planId: 'p3',
    intent: 'pfz_lookup',
    requestedAgents: ['pfz'],
    mapIntent: inferred,
    requiresApproval: false
  };

  const mockResults: AgentResult[] = [{
    agent: 'pfz',
    status: 'success',
    data: {
      recommendations: [
        { advisory_id: 'PFZ-VER-01', pfz_latitude: 20.85, pfz_longitude: 70.32 }
      ]
    },
    cardUpdates: [],
    confidence: 0.95,
    timestamp: new Date().toISOString()
  }];

  const mockLocRes: LocationResolution = {
    status: 'SUPPORTED',
    locationType: 'HARBOR',
    locationName: 'Veraval',
    harbor: {
      harbor_id: 1,
      landing_center_name: 'Veraval',
      latitude: '20.9000',
      longitude: '70.3700'
    } as any
  };

  const normalized = normalizeMapIntent(mockPlan as any, mockResults, mockLocRes, query);
  assert.equal(normalized.action, 'FIT_LAYER');
  assert.equal(normalized.layer, 'PFZ');
  assert.equal(normalized.harborId, 1);
  assert.equal(normalized.targetIds?.includes('PFZ-VER-01'), true);
});

test('6. Query: can I fish near Jaisalmer? (Inland detection)', async () => {
  const locRes = await resolveLocation('Jaisalmer');
  assert.equal(locRes.status, 'INLAND', 'Jaisalmer must be identified as INLAND');
  assert.equal(locRes.locationType, 'INLAND');
  assert.equal(locRes.harbor, null, 'Inland query must not be replaced by Veraval harbor');

  const mockPlan = {
    planId: 'p4',
    intent: 'general_safety',
    requestedAgents: [],
    requiresApproval: false
  };

  const normalized = normalizeMapIntent(mockPlan as any, [], locRes, 'can I fish near Jaisalmer?');
  assert.equal(normalized.action, 'FOCUS_LOCATION');
  assert.ok(normalized.location?.name?.includes('Jaisalmer'), 'Location name should contain Jaisalmer');
  assert.ok(normalized.location?.latitude != null, 'Inland coordinates must be present');
});

test('7. Query: can I fish near Odisha? (Coastal State handling)', async () => {
  const locRes = await resolveLocation('Odisha');
  assert.equal(locRes.status, 'COASTAL_STATE', 'Odisha must be identified as COASTAL_STATE');
  assert.equal(locRes.locationType, 'COASTAL_STATE');
  assert.equal(locRes.stateName, 'Odisha');
  assert.ok(locRes.harbor, 'Should assign a representative reference harbor for Odisha (e.g. Paradip)');
  assert.ok(locRes.referenceHarbor?.landing_center_name.includes('Paradip'), 'Reference harbor must be Paradip');
});

test('8. Query: what is the weather tomorrow? (Preserve map view)', () => {
  const query = 'what is the weather tomorrow?';
  const inferred = inferMapIntentFromQuery(query);
  assert.equal(inferred.action, 'PRESERVE', 'General weather question must have PRESERVE action');

  const mockPlan = {
    planId: 'p5',
    intent: 'weather_inquiry',
    requestedAgents: ['weather'],
    mapIntent: inferred,
    requiresApproval: false
  };

  const mockLocRes: LocationResolution = {
    status: 'SUPPORTED',
    locationType: 'HARBOR',
    locationName: 'Veraval',
    harbor: { harbor_id: 1, landing_center_name: 'Veraval' } as any
  };

  const normalized = normalizeMapIntent(mockPlan as any, [], mockLocRes, query);
  assert.equal(normalized.action, 'PRESERVE', 'Normalized MapIntent must be PRESERVE without recentering');
});

test('9. Query: what are the waves near Veraval? (Preserve map view)', () => {
  const query = 'what are the waves near Veraval?';
  const inferred = inferMapIntentFromQuery(query);
  assert.equal(inferred.action, 'PRESERVE', 'Wave condition inquiry without show command must PRESERVE');
});

test('10. Query: show cyclone track', () => {
  const query = 'show cyclone track';
  const inferred = inferMapIntentFromQuery(query);
  assert.equal(inferred.action, 'FIT_LAYER');
  assert.equal(inferred.layer, 'CYCLONES');
  assert.equal(inferred.scope, 'NATIONAL');
  assert.equal(inferred.fitBounds, true);
});

test('11. Query: show EEZ (Exclusive Economic Zone outer boundary)', () => {
  const query = 'show EEZ';
  const inferred = inferMapIntentFromQuery(query);
  assert.equal(inferred.action, 'FIT_LAYER');
  assert.equal(inferred.layer, 'EEZ');
  assert.equal(inferred.scope, 'NATIONAL');
  assert.equal(inferred.fitBounds, true);
});

test('12. Query: show IMBL (International Maritime Boundary Line)', () => {
  const query = 'show IMBL';
  const inferred = inferMapIntentFromQuery(query);
  assert.equal(inferred.action, 'FIT_LAYER');
  assert.equal(inferred.layer, 'IMBL');
  assert.equal(inferred.scope, 'NATIONAL');
  assert.equal(inferred.fitBounds, true);
});

test('13. Query: PFZs in Kerala (ONE STORY: MapIntent, CardIntent, and Answer)', async () => {
  const query = 'PFZs in Kerala';
  const inferred = inferMapIntentFromQuery(query);

  assert.equal(inferred.action, 'FIT_LAYER');
  assert.equal(inferred.layer, 'PFZ');
  assert.equal(inferred.scope, 'STATE');
  assert.equal(inferred.scopeName, 'Kerala');
  assert.equal(inferred.highlight, 'ALL');
  assert.equal(inferred.fitBounds, true);

  const plan = fallbackPlan(query);
  assert.equal(plan.intent, 'PFZ_STATE');
  assert.equal(plan.mapIntent?.layer, 'PFZ');
  assert.equal(plan.mapIntent?.scope, 'STATE');

  const pfzResult = await runPfz({
    query,
    location: { name: 'Kerala' },
    locationType: 'COASTAL_STATE',
    mapIntent: inferred
  });

  assert.equal(pfzResult.status, 'success');
  const recs = ((pfzResult.data as any).recommendations as any[]) || [];
  assert.ok(recs.length >= 5, `Expected multiple PFZs in Kerala, got ${recs.length}`);
  assert.ok(recs.every((r: any) => (r.state || '').toLowerCase() === 'kerala'), 'All advisories must be in Kerala');

  // CardIntent check: location must be "Kerala Waters", not a single harbor
  assert.ok(pfzResult.cardUpdates.length > 0, 'Must produce PFZ card update');
  const pfzCard = pfzResult.cardUpdates[0] as any;
  assert.equal(pfzCard.location, 'Kerala Waters', 'Card location must be Kerala Waters');
  assert.equal(pfzCard.data.scope, 'STATE');
  assert.equal(pfzCard.data.state, 'Kerala');

  // MapIntent normalization check
  const locRes = await resolveLocation('Kerala');
  const normalized = normalizeMapIntent(plan, [pfzResult], locRes, query);
  assert.equal(normalized.action, 'FIT_LAYER');
  assert.equal(normalized.layer, 'PFZ');
  assert.equal(normalized.scope, 'STATE');
  assert.equal(normalized.scopeName, 'Kerala');
  assert.equal(normalized.highlight, 'ALL');
  assert.equal(normalized.harborId, undefined, 'Harbor ID must not be pinned to a single harbor');
  assert.equal(normalized.location, undefined, 'Location must not be pinned to a single harbor');
  assert.ok(normalized.bounds, 'Must compute bounding box across all Kerala PFZs');
  const [[minLat, minLon], [maxLat, maxLon]] = normalized.bounds;
  assert.ok(minLat < 9.0 && maxLat > 11.5, `Bounds [${minLat}, ${maxLat}] must span Kerala coast`);

  // Answer synthesis check: must tell the same story
  const synthesized = fallbackSynthesize(query, plan, [pfzResult], locRes, normalized);
  assert.ok(synthesized.includes('Kerala waters'), 'Answer must mention Kerala waters');
  assert.ok(!synthesized.includes('Cochin Fishing Harbor (Thoppumpady)'), 'Answer must not collapse to single harbor name');
});

test('14. Query: Show PFZs near Mangalore on the map (Arbitrary Harbor PFZ)', async () => {
  const query = 'Show PFZs near Mangalore on the map';
  const inferred = inferMapIntentFromQuery(query);

  assert.equal(inferred.action, 'FIT_LAYER');
  assert.equal(inferred.layer, 'PFZ');

  const plan = fallbackPlan(query);
  assert.equal(plan.mapIntent?.layer, 'PFZ');
  assert.equal(plan.dashboardIntent?.context, 'PFZ_OVERVIEW');
  assert.equal(plan.dashboardIntent?.queryTarget, 'Mangalore');

  const pfzResult = await runPfz({
    query,
    location: { name: 'Mangalore' },
    locationType: 'HARBOR',
    mapIntent: inferred
  });

  assert.equal(pfzResult.status, 'success');
  const recs = ((pfzResult.data as any).recommendations as any[]) || [];
  assert.ok(recs.length > 0, 'Must return PFZ advisories for Mangalore');

  assert.ok(pfzResult.cardUpdates.length > 0, 'Must produce PFZ card update');
  const pfzCard = pfzResult.cardUpdates[0] as any;
  assert.ok(pfzCard.location.includes('Mangalore') || pfzCard.location.includes('Karnataka'), 'Card location must reflect Mangalore or Karnataka');
});

test('15. Query: Show restricted zones near Paradip (Arbitrary Harbor Sanctuary Resolution)', async () => {
  const query = 'Show restricted zones near Paradip';
  const inferred = inferMapIntentFromQuery(query);

  assert.equal(inferred.action, 'FIT_LAYER');
  assert.equal(inferred.layer, 'RESTRICTED_ZONES');

  const plan = fallbackPlan(query);
  assert.equal(plan.mapIntent?.layer, 'RESTRICTED_ZONES');
  assert.equal(plan.dashboardIntent?.context, 'RESTRICTED_ZONES');
  assert.equal(plan.dashboardIntent?.queryTarget, 'Paradip');

  const zoneResult = await runZone({
    query,
    location: { name: 'Paradip' },
    locationType: 'HARBOR',
    mapIntent: inferred
  });

  assert.equal(zoneResult.status, 'success');
  const zones = ((zoneResult.data as any).restrictedZones as any[]) || [];
  assert.ok(zones.length > 0, 'Must find restricted zones near Paradip (e.g. Gahirmatha)');
  const zoneNames = zones.map((z: any) => z.zone_name || z.name);
  assert.ok(
    zoneNames.some((n: string) => n.includes('Gahirmatha') || n.includes('Bhitarkanika') || n.includes('East Coast')),
    'Must include Odisha sanctuaries near Paradip'
  );

  assert.ok(zoneResult.cardUpdates.length > 0, 'Must produce zone card update');
  const zoneCard = zoneResult.cardUpdates[0] as any;
  assert.equal(zoneCard.cardId, 'zone');
});

test('16. Query: What will the weather be tomorrow near Mumbai? (Arbitrary Harbor Weather & PRESERVE Map)', async () => {
  const query = 'What will the weather be tomorrow near Mumbai?';
  const inferred = inferMapIntentFromQuery(query);

  assert.equal(inferred.action, 'PRESERVE');

  const plan = fallbackPlan(query);
  assert.equal(plan.mapIntent?.action, 'PRESERVE');
  assert.equal(plan.dashboardIntent?.context, 'WEATHER_FORECAST');
  assert.equal(plan.dashboardIntent?.queryTarget, 'Mumbai');

  const weatherResult = await runWeather({
    query,
    location: { name: 'Mumbai' },
    locationType: 'HARBOR',
    mapIntent: inferred
  });

  assert.equal(weatherResult.status, 'success');
  const locRes = await resolveLocation('Mumbai');
  const synthesized = fallbackSynthesize(query, plan, [weatherResult], locRes, inferred);
  assert.ok(synthesized.includes('Mumbai'), 'Answer must mention Mumbai');
  assert.ok(!synthesized.includes('Veraval'), 'Answer must not default to Veraval');
});

test('17. Query: Show cyclone activity near Odisha (Arbitrary State Cyclone Tracking)', async () => {
  const query = 'Show cyclone activity near Odisha';
  const inferred = inferMapIntentFromQuery(query);

  assert.equal(inferred.action, 'FIT_LAYER');
  assert.equal(inferred.layer, 'CYCLONES');

  const plan = fallbackPlan(query);
  assert.equal(plan.mapIntent?.layer, 'CYCLONES');
  assert.equal(plan.dashboardIntent?.context, 'CYCLONE_TRACK');
  assert.equal(plan.dashboardIntent?.queryTarget, 'Odisha');

  const cycloneResult = await runCyclone({
    query,
    location: { name: 'Odisha' },
    locationType: 'COASTAL_STATE',
    mapIntent: inferred
  });

  assert.equal(cycloneResult.status, 'success');
  assert.ok(cycloneResult.cardUpdates.length > 0, 'Must produce cyclone card update');
  const cycloneCard = cycloneResult.cardUpdates[0] as any;
  assert.equal(cycloneCard.cardId, 'cyclone');
});

test('18. TEST 1: Query: Show me all PFZs near Mangalore on the map (Local PFZ Bounds and Sector: Karnataka)', async () => {
  const query = 'Show me all PFZs near Mangalore on the map. Update the dashboard cards with Mangalore-specific PFZ information.';
  const inferred = inferMapIntentFromQuery(query);
  assert.equal(inferred.layer, 'PFZ');
  assert.equal(inferred.scope, 'NEAR_LOCATION');

  const plan = fallbackPlan(query);
  assert.equal(plan.location?.name, 'Mangalore');
  assert.equal(plan.dashboardIntent?.primaryCard, 'pfz');

  const pfzResult = await runPfz({
    query,
    location: { name: 'Mangalore' },
    mapIntent: inferred
  });

  assert.equal(pfzResult.status, 'success');
  assert.equal((pfzResult.data as any).isNational, false, 'PFZs near Mangalore must NOT be national scope');
  assert.equal((pfzResult.data as any).scope, 'NEAR_LOCATION');
  assert.ok(((pfzResult.data as any).recommendations || []).length > 0, 'Must have PFZ recommendations near Mangalore');

  const card = pfzResult.cardUpdates[0]?.data as any;
  assert.equal(card.state, 'Karnataka', 'State must be Karnataka, not Gujarat');
  assert.equal(card.sector, 'Karnataka', 'Sector must be Karnataka');

  const normalized = normalizeMapIntent(plan, [pfzResult], { status: 'SUPPORTED', locationName: 'Mangalore' }, query);
  assert.equal(normalized.layer, 'PFZ');
  assert.ok(normalized.bounds, 'Must compute bounds');
  // Bounds must be in Karnataka region (lat around 12-14), not spanning Gujarat or all India
  const [minCoords, maxCoords] = normalized.bounds!;
  assert.ok(minCoords[0] >= 10 && minCoords[0] <= 14, `Min latitude ${minCoords[0]} should be near Karnataka`);
  assert.ok(maxCoords[0] <= 16, `Max latitude ${maxCoords[0]} should not span northern India`);
});

test('19. TEST 2: Sequence: Mangalore PFZ followed by Paradip Restricted Zones (Layer Isolation and Consistent Story)', async () => {
  const previousMapIntent = {
    action: 'FIT_LAYER' as const,
    layer: 'PFZ' as const,
    scope: 'NEAR_LOCATION' as const,
    scopeName: 'Mangalore',
    highlight: 'ALL' as const,
    fitBounds: true
  };
  const context = {
    previousMapIntent,
    lastQueryTarget: 'Mangalore',
    lastRelevantDomain: 'PFZ'
  };

  const turn2Query = 'Show me the restricted maritime zones near Paradip on the map. Update the dashboard with the relevant restricted-zone information.';
  const inferred = inferMapIntentFromQuery(turn2Query);
  assert.equal(inferred.layer, 'RESTRICTED_ZONES');

  // Must NOT inherit previous PFZ layer!
  const inherited = inheritMapIntent(turn2Query, inferred, context);
  assert.equal(inherited?.layer, 'RESTRICTED_ZONES', 'Must keep RESTRICTED_ZONES, not inherit PFZ');

  const plan = fallbackPlan(turn2Query, context);
  assert.equal(plan.mapIntent?.layer, 'RESTRICTED_ZONES');
  assert.equal(plan.location?.name, 'Paradip');
  assert.equal(plan.dashboardIntent?.context, 'RESTRICTED_ZONES');

  const zoneResult = await runZone({
    query: turn2Query,
    location: { name: 'Paradip' },
    mapIntent: inferred
  });
  assert.equal(zoneResult.status, 'success');
  assert.ok(((zoneResult.data as any).restrictedZones || []).length > 0, 'Must find restricted zones near Paradip');

  const normalized = normalizeMapIntent(plan, [zoneResult], { status: 'SUPPORTED', locationName: 'Paradip' }, turn2Query, context);
  assert.equal(normalized.layer, 'RESTRICTED_ZONES');
  assert.equal(normalized.action, 'FIT_LAYER');

  const synthesis = fallbackSynthesize(turn2Query, plan, [zoneResult], { status: 'SUPPORTED', locationName: 'Paradip' }, normalized);
  assert.ok(synthesis.includes('restricted zone'), 'Must explain restricted zones');
  assert.ok(!synthesis.includes("Tomorrow's outlook near Paradip"), 'Must not fall back to generic weather');
});

test('20. TEST 3: Mumbai Weather (Map View Preserved, Unrelated Cards Untouched)', async () => {
  const query = 'What will the weather be tomorrow near Mumbai?';
  const inferred = inferMapIntentFromQuery(query);
  assert.equal(inferred.action, 'PRESERVE', 'Weather question without show-on-map must preserve map view');

  const plan = fallbackPlan(query);
  assert.equal(plan.location?.name, 'Mumbai');
  assert.equal(plan.mapIntent?.action, 'PRESERVE');
  assert.equal(plan.dashboardIntent?.primaryCard, 'weather');

  const weatherResult = await runWeather({
    query,
    location: { name: 'Mumbai' },
    mapIntent: plan.mapIntent as MapIntent
  });
  assert.equal(weatherResult.status, 'success');
  const card = weatherResult.cardUpdates[0]?.data as any;
  assert.equal(card.state, 'Maharashtra', 'Mumbai must resolve to Maharashtra');
  assert.equal(card.sector, 'Maharashtra');

  const synthesis = fallbackSynthesize(query, plan, [weatherResult], { status: 'SUPPORTED', locationName: 'Mumbai' }, plan.mapIntent as MapIntent);
  assert.ok(synthesis.includes('weather near Mumbai'), 'Must answer with Mumbai weather');
  assert.ok(!synthesis.includes('map was updated'), 'Must not claim map moved');
});

test('21. TEST 4: National PFZs Across India (National Extent and All PFZs Shown)', async () => {
  const query = 'Show me all available PFZs across India on the map.';
  const inferred = inferMapIntentFromQuery(query);
  assert.equal(inferred.action, 'FIT_LAYER');
  assert.equal(inferred.layer, 'PFZ');
  assert.equal(inferred.scope, 'NATIONAL');
  assert.equal(inferred.scopeName, 'India');

  const plan = fallbackPlan(query);
  assert.equal(plan.mapIntent?.scope, 'NATIONAL');
  assert.equal(plan.dashboardIntent?.scope, 'NATIONAL');

  const pfzResult = await runPfz({
    query,
    location: { name: 'India' },
    mapIntent: inferred
  });
  assert.equal(pfzResult.status, 'success');
  assert.equal((pfzResult.data as any).isNational, true);
  assert.equal((pfzResult.data as any).scope, 'NATIONAL');
  assert.equal((pfzResult.data as any).scopeName, 'India');
  assert.ok(((pfzResult.data as any).recommendations || []).length > 20, 'National query must return comprehensive advisories');

  const normalized = normalizeMapIntent(plan, [pfzResult], { status: 'SUPPORTED', locationName: 'India' }, query);
  assert.equal(normalized.scope, 'NATIONAL');
  assert.equal(normalized.scopeName, 'India');
  assert.ok(normalized.bounds, 'National PFZ must have bounds');
  const [sw, ne] = normalized.bounds!;
  assert.ok(sw[0] <= 8.5 && ne[0] >= 20.0, 'Bounds must span Indian coastline');
});

test('22. TEST 5: Conversational Follow-Up "What species are reported there?"', async () => {
  const context = {
    previousMapIntent: {
      action: 'FIT_LAYER' as const,
      layer: 'PFZ' as const,
      scope: 'NATIONAL' as const,
      scopeName: 'India',
      highlight: 'ALL' as const,
      fitBounds: true
    },
    lastQueryTarget: 'India',
    lastRelevantDomain: 'PFZ'
  };

  const query = 'What species are reported there?';
  const plan = fallbackPlan(query, context);
  assert.equal(plan.location?.name, 'India', 'Must resolve there to India');
  assert.ok(plan.requestedAgents.includes('species'), 'Must request species agent');
  assert.ok(plan.requestedAgents.includes('pfz'), 'Must request pfz agent for target species');
  assert.equal(plan.mapIntent?.action, 'PRESERVE', 'Follow-up question must preserve map view');

  const pfzResult = await runPfz({
    query,
    location: { name: 'India' },
    mapIntent: plan.mapIntent as MapIntent
  });

  const synthesis = fallbackSynthesize(query, plan, [pfzResult], { status: 'UNKNOWN' }, plan.mapIntent as MapIntent);
  assert.ok(synthesis.includes('species'), 'Synthesis must answer with species');
  assert.ok(!synthesis.includes("Tomorrow's outlook near the selected maritime context looks favorable"), 'Must not fall back to generic harbor weather');
});

test('23. TEST 6: Scenario 6: 3-Turn Conversation on Paradip Restricted Zones', async () => {
  // Turn 1: "Show restricted zones near Paradip."
  const turn1Query = 'Show restricted zones near Paradip.';
  const t1Inferred = inferMapIntentFromQuery(turn1Query);
  assert.equal(t1Inferred.layer, 'RESTRICTED_ZONES');
  assert.equal(t1Inferred.scopeName, 'Paradip');

  const t1Plan = fallbackPlan(turn1Query);
  assert.equal(t1Plan.dashboardIntent?.context, 'RESTRICTED_ZONES');
  assert.ok(t1Plan.requestedAgents.includes('zone'));

  const t1ZoneResult = await runZone({ query: turn1Query, location: { name: 'Paradip' }, mapIntent: t1Inferred });
  const t1Normalized = normalizeMapIntent(t1Plan, [t1ZoneResult], { status: 'SUPPORTED', locationName: 'Paradip' }, turn1Query);
  assert.equal(t1Normalized.layer, 'RESTRICTED_ZONES');
  assert.equal(t1Normalized.scopeName, 'Paradip');

  // Turn 2: "What restrictions apply there?"
  const t2Context = {
    previousMapIntent: t1Normalized,
    lastQueryTarget: 'Paradip',
    lastRelevantDomain: 'RESTRICTED_ZONES',
    lastDashboardContext: 'RESTRICTED_ZONES'
  };
  const turn2Query = 'What restrictions apply there?';
  const t2Plan = fallbackPlan(turn2Query, t2Context);
  assert.equal(t2Plan.location?.name, 'Paradip', 'Must resolve there to Paradip');
  assert.ok(t2Plan.requestedAgents.includes('zone'), 'Must request zone agent');
  assert.equal(t2Plan.mapIntent?.action, 'PRESERVE', 'Follow-up question preserves map');
  assert.equal(t2Plan.dashboardIntent?.context, 'RESTRICTED_ZONES');

  const t2Synth = fallbackSynthesize(turn2Query, t2Plan, [t1ZoneResult], { status: 'SUPPORTED', locationName: 'Paradip' }, t2Plan.mapIntent as MapIntent);
  assert.ok(t2Synth.includes('restrictions') || t2Synth.includes('restricted'), 'Must explain restrictions');
  assert.ok(!t2Synth.includes("Tomorrow's outlook"), 'Must have zero weather leakage');

  // Turn 3: "Show those restricted areas on the map."
  const turn3Query = 'Show those restricted areas on the map.';
  const t3Inferred = inferMapIntentFromQuery(turn3Query);
  const t3Inherited = inheritMapIntent(turn3Query, t3Inferred, t2Context);
  assert.equal(t3Inherited?.layer, 'RESTRICTED_ZONES', 'Must keep RESTRICTED_ZONES');
  assert.equal(t3Inherited?.scopeName, 'Paradip', 'Must retain Paradip scope');
  assert.equal(t3Inherited?.action, 'FIT_LAYER');
});

test('24. TEST 7: Scenario 7: Haldia PFZ followed by Mangalore PFZ (Zero Stale Sultanpur Label Bleed)', async () => {
  // Turn 1: "Show PFZs near Haldia Fishing Harbor."
  const turn1Query = 'Show PFZs near Haldia Fishing Harbor.';
  const t1Inferred = inferMapIntentFromQuery(turn1Query);
  const t1Plan = fallbackPlan(turn1Query);
  const t1PfzResult = await runPfz({ query: turn1Query, location: { name: 'Haldia' }, mapIntent: t1Inferred });
  const t1Normalized = normalizeMapIntent(t1Plan, [t1PfzResult], { status: 'SUPPORTED', locationName: 'Haldia', stateName: 'West Bengal' }, turn1Query);

  const t1Context = {
    previousMapIntent: t1Normalized,
    lastQueryTarget: 'Haldia',
    lastRelevantDomain: 'PFZ'
  };

  // Turn 2: "Show PFZs near Mangalore."
  const turn2Query = 'Show PFZs near Mangalore.';
  const t2Inferred = inferMapIntentFromQuery(turn2Query);
  assert.equal(t2Inferred.scopeName, 'Mangalore');

  const t2Inherited = inheritMapIntent(turn2Query, t2Inferred, t1Context);
  assert.equal(t2Inherited?.scopeName, 'Mangalore', 'Must use Mangalore and NOT inherit Haldia/Sultanpur scope');

  const t2Plan = fallbackPlan(turn2Query, t1Context);
  assert.equal(t2Plan.location?.name, 'Mangalore');

  const t2PfzResult = await runPfz({ query: turn2Query, location: { name: 'Mangalore' }, mapIntent: t2Inferred });
  const t2Normalized = normalizeMapIntent(t2Plan, [t2PfzResult], {
    status: 'SUPPORTED',
    locationName: 'Mangalore',
    harbor: { harbor_id: 18, landing_center_name: 'Mangalore Old Port (Bunder)', state: 'Karnataka' } as any
  }, turn2Query, t1Context);

  assert.equal(t2Normalized.layer, 'PFZ');
  assert.equal(t2Normalized.scopeName, 'Mangalore Old Port', 'Scope name must be Mangalore, never Sultanpur');
  assert.ok(!t2Normalized.scopeName?.includes('Sultanpur'), 'Must not contain Sultanpur');
});

test('25. Integration: Scenario 1 - Mangalore PFZ AI response maps to UI context while preserving operational base', () => {
  const aiResponse = {
    success: true,
    queryTarget: 'Mangalore',
    dashboardIntent: { context: 'PFZ_OVERVIEW', queryTarget: 'Mangalore', primaryCard: 'pfz' },
    mapIntent: { action: 'FIT_LAYER', layer: 'PFZ', scope: 'NEAR_LOCATION', scopeName: 'Mangalore Old Port (Bunder)', targetIds: ['PFZ-KAR-001'] },
    cardUpdates: [{ cardId: 'pfz', action: 'update', data: { state: 'Karnataka' }, location: 'Mangalore Old Port (Bunder)' }]
  };
  let selectedHarborId = 1; // Operational base: Veraval (1)
  let mapFocusTarget: any = null;
  let dashboardContext = 'HARBOR_TELEMETRY';
  let queryTarget: any = null;
  let dynamicAdvisories: any = null;
  let dynamicZones: any = 'previous-zones';
  let cardUpdates: any[] = [];

  executeMapIntent(aiResponse.mapIntent, aiResponse, {
    onSelectHarbor: (id: number) => { selectedHarborId = id; },
    onMapFocus: (focus: any) => { mapFocusTarget = focus; },
    onUpdateDashboardIntent: (di: any) => { dashboardContext = di.context; },
    onUpdateQueryTarget: (t: any) => { queryTarget = t; },
    onUpdateCardUpdates: (cu: any) => { cardUpdates = cu; },
    onUpdateDynamicAdvisories: (adv: any) => { dynamicAdvisories = adv; },
    onUpdateDynamicZones: (z: any) => { dynamicZones = z; }
  });

  assert.equal(selectedHarborId, 1, 'Operational harbor MUST NOT change from Veraval (1)');
  assert.equal(dashboardContext, 'PFZ_OVERVIEW', 'Dashboard context must be PFZ_OVERVIEW');
  assert.equal(queryTarget, 'Mangalore', 'Query target must be Mangalore');
  assert.equal(mapFocusTarget.label, 'Mangalore Old Port PFZ Hotspots', 'Map focus label must say Mangalore');
  assert.equal(mapFocusTarget.layer, 'PFZ');
  assert.equal(dynamicZones, null, 'Previous dynamic zones must be cleared when PFZ is active');
  assert.equal(cardUpdates[0].data.state, 'Karnataka', 'Card state metadata must be Karnataka');
});

test('26. Integration: Scenario 2 - Paradip Restricted Zones response clears stale PFZ and focuses zones', () => {
  const aiResponse = {
    success: true,
    queryTarget: 'Paradip',
    dashboardIntent: { context: 'RESTRICTED_ZONES', queryTarget: 'Paradip', primaryCard: 'zone' },
    mapIntent: { action: 'FIT_LAYER', layer: 'RESTRICTED_ZONES', scope: 'REGION', scopeName: 'Paradip', targetIds: ['IND-OD-001'] },
    cardUpdates: [{ cardId: 'zone', action: 'update', data: { state: 'Odisha' }, location: 'Paradip' }]
  };
  let selectedHarborId = 1; // Operational base: Veraval (1)
  let mapFocusTarget: any = null;
  let dashboardContext = 'HARBOR_TELEMETRY';
  let queryTarget: any = null;
  let dynamicAdvisories: any = 'stale-mangalore-pfz';
  let dynamicZones: any = null;

  executeMapIntent(aiResponse.mapIntent, aiResponse, {
    onSelectHarbor: (id: number) => { selectedHarborId = id; },
    onMapFocus: (focus: any) => { mapFocusTarget = focus; },
    onUpdateDashboardIntent: (di: any) => { dashboardContext = di.context; },
    onUpdateQueryTarget: (t: any) => { queryTarget = t; },
    onUpdateCardUpdates: () => {},
    onUpdateDynamicAdvisories: (adv: any) => { dynamicAdvisories = adv; },
    onUpdateDynamicZones: (z: any) => { dynamicZones = z; }
  });

  assert.equal(selectedHarborId, 1, 'Operational harbor MUST NOT change from Veraval (1)');
  assert.equal(dashboardContext, 'RESTRICTED_ZONES');
  assert.equal(queryTarget, 'Paradip');
  assert.equal(mapFocusTarget.label, 'Paradip Restricted Zones');
  assert.equal(dynamicAdvisories, null, 'Stale PFZ advisories must be cleared when restricted zones are active');
});

test('27. Integration: Scenario 3 - Mumbai weather query preserves map and updates cards', () => {
  const aiResponse = {
    success: true,
    queryTarget: 'Mumbai',
    dashboardIntent: { context: 'WEATHER_FORECAST', queryTarget: 'Mumbai', primaryCard: 'weather' },
    mapIntent: { action: 'PRESERVE' },
    cardUpdates: [{ cardId: 'weather', action: 'update', data: { state: 'Maharashtra', temperature: 29 }, location: 'Mumbai' }]
  };
  let selectedHarborId = 1;
  let mapFocusTarget: any = null;
  let dashboardContext = 'HARBOR_TELEMETRY';
  let queryTarget: any = null;
  let cardUpdates: any[] = [];

  executeMapIntent(aiResponse.mapIntent, aiResponse, {
    onSelectHarbor: (id: number) => { selectedHarborId = id; },
    onMapFocus: (focus: any) => { mapFocusTarget = focus; },
    onUpdateDashboardIntent: (di: any) => { dashboardContext = di.context; },
    onUpdateQueryTarget: (t: any) => { queryTarget = t; },
    onUpdateCardUpdates: (cu: any) => { cardUpdates = cu; }
  });

  assert.equal(selectedHarborId, 1, 'Operational harbor must remain Veraval (1)');
  assert.equal(dashboardContext, 'WEATHER_FORECAST');
  assert.equal(queryTarget, 'Mumbai');
  assert.equal(mapFocusTarget, null, 'Map focus must remain untouched for PRESERVE intent');
  assert.equal(cardUpdates[0].data.state, 'Maharashtra', 'Card state metadata must be Maharashtra');
});
