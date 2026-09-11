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
import type { AgentResult } from '../types';
import { runPfz } from '../agents';
import { fallbackPlan, fallbackSynthesize } from '../coordinator';

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

