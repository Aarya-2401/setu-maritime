import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { plan, synthesize } from './coordinator';
import { agentRunners } from './agents';
import { resolveLocation, LocationResolution, pool } from './db';
import { AgentRequest, AgentResult, ConversationContext, MapIntent } from './types';
import { normalizeMapIntent, PRESERVE_INTENT } from './mapIntent';

const OrcaState = Annotation.Root({
  query: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => '' }),
  context: Annotation<ConversationContext | undefined>({ reducer: (x, y) => y ?? x, default: () => undefined }),
  plan: Annotation<any>({ reducer: (x, y) => y ?? x, default: () => ({}) }),
  locationResolution: Annotation<LocationResolution>({ reducer: (x, y) => y ?? x, default: () => ({ status: 'UNKNOWN' }) }),
  resolvedHarbor: Annotation<any>({ reducer: (x, y) => y ?? x, default: () => null }),
  results: Annotation<AgentResult[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  answer: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => '' }),
  cardUpdates: Annotation<any[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  mapUpdates: Annotation<any[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  mapIntent: Annotation<MapIntent>({ reducer: (x, y) => y ?? x, default: () => ({ ...PRESERVE_INTENT }) }),
  mapData: Annotation<Record<string, unknown>>({ reducer: (x, y) => y ?? x, default: () => ({}) }),
  dashboardIntent: Annotation<any>({ reducer: (x, y) => y ?? x, default: () => undefined })
});

type State = typeof OrcaState.State;

export async function runOrca(query: string, context?: ConversationContext) {
  const graph = new StateGraph(OrcaState)
    .addNode('coordinate', async (s: State) => ({ plan: await plan(s.query, s.context) }))
    .addNode('execute', async (s: State) => {
      const p = s.plan;
      const locRes = await resolveLocation(p.location);

      // Handle INLAND location: retain reference harbor in background for telemetry continuity,
      // but do NOT claim maritime conditions or substitute harbor for the queried inland point.
      if (locRes.status === 'INLAND') {
        const place = locRes.locationName || 'This area';
        let fallbackHarbor: any = null;
        try {
          const [rows]: any = await pool.query('SELECT * FROM dim_fishing_harbors WHERE harbor_id = 1 LIMIT 1');
          if (rows.length) fallbackHarbor = rows[0];
        } catch (e) {
          console.warn('Fallback harbor query failed:', e);
        }

        const coords = locRes.coordinates || { latitude: 26.9124, longitude: 75.7873 };

        const inlandIntent: MapIntent = {
          action: 'FOCUS_LOCATION',
          highlight: 'MATCHED',
          fitBounds: false,
          location: {
            name: place,
            latitude: coords.latitude,
            longitude: coords.longitude
          }
        };

        const mapUpdates = [{
          action: 'focus_location',
          targetType: 'inland',
          locationName: place,
          location: {
            name: place,
            latitude: coords.latitude,
            longitude: coords.longitude
          },
          zoom: 10
        }];

        const cardUpdates = [
          { card: 'weather', status: 'LIVE_INLAND', location: place },
          { card: 'wind', status: 'LIVE_INLAND', location: place },
          { card: 'wave', status: 'INACTIVE_INLAND', note: 'Wave telemetry disabled for inland position' },
          { card: 'tide', status: 'INACTIVE_INLAND', note: 'Tidal telemetry disabled for inland position' }
        ];

        return {
          locationResolution: locRes,
          resolvedHarbor: null,
          results: [],
          cardUpdates,
          mapUpdates,
          mapIntent: inlandIntent,
          dashboardIntent: {
            context: 'INLAND_STATUS',
            primaryCard: 'inland',
            queryTarget: place,
            title: `${place} (Inland)`,
            subtitle: 'Terrestrial position - marine advisories inactive'
          },
          mapData: {},
          answer: `${place} is an inland location with no open coastline or commercial maritime fishing harbor. Marine layers including EEZ boundaries, PFZ advisories, and marine sanctuaries do not apply at this terrestrial position.`
        };
      }

      const isNationalScope = p.mapIntent?.scope === 'NATIONAL' || p.intent === 'PFZ_OVERVIEW' || p.location?.name?.toLowerCase() === 'india' || p.mapIntent?.layer === 'EEZ' || p.mapIntent?.layer === 'IMBL';
      if (locRes.status === 'UNKNOWN' && p.location?.name && !isNationalScope) {
        let fallbackHarbor: any = null;
        try {
          const [rows]: any = await pool.query('SELECT * FROM dim_fishing_harbors WHERE harbor_id = 1 LIMIT 1');
          if (rows.length) fallbackHarbor = rows[0];
        } catch (e) {
          console.warn('Fallback harbor query failed:', e);
        }

        return {
          locationResolution: locRes,
          resolvedHarbor: null,
          results: [],
          cardUpdates: [],
          mapUpdates: [],
          mapIntent: { ...PRESERVE_INTENT },
          mapData: {},
          answer: `I could not locate a designated fishing harbor for "${p.location.name}". SETU monitors 56 major fishing harbors across coastal India. The map was left unchanged. You can choose a coastal station from the suggestions below.`
        };
      }

      const h = locRes.harbor;
      const req: AgentRequest = {
        query: s.query,
        location: h ? {
          name: h.landing_center_name,
          harborId: h.harbor_id,
          latitude: Number(h.latitude),
          longitude: Number(h.longitude)
        } : p.location,
        timeRange: p.timeRange,
        species: p.species,
        operation: p.operation,
        mapIntent: p.mapIntent,
        locationType: locRes.locationType,
        stateName: locRes.stateName
      };

      const results = await Promise.all(p.requestedAgents.map((a: any) => agentRunners[a](req)));

      // Deterministic normalization of MapIntent
      const normalizedIntent = normalizeMapIntent(p, results, locRes, s.query, s.context);

      // Collect structured domain data for frontend map consumption
      const zoneRes = results.find((r: any) => r.agent === 'zone');
      const pfzRes = results.find((r: any) => r.agent === 'pfz');
      const cycRes = results.find((r: any) => r.agent === 'cyclone');
      const mapData = {
        restrictedZones: (zoneRes?.data?.restrictedZones as any[]) || [],
        pfz: (pfzRes?.data?.recommendations as any[]) || [],
        cyclones: (cycRes?.data?.tracks as any[]) || []
      };

      // ONLY generate mapUpdates if the MapIntent action is NOT PRESERVE
      const mapUpdates: any[] = [];
      if (normalizedIntent.action !== 'PRESERVE') {
        let agentUpdate = results.find((r: any) => r.mapUpdate && r.mapUpdate.layer === normalizedIntent.layer)?.mapUpdate;
        if (!agentUpdate && normalizedIntent.action === 'FOCUS_HARBOR' && h) {
          agentUpdate = {
            action: 'recenter',
            harborId: h.harbor_id,
            location: {
              name: h.landing_center_name,
              latitude: Number(h.latitude),
              longitude: Number(h.longitude)
            },
            zoom: 11
          };
        } else if (!agentUpdate && normalizedIntent.layer) {
          agentUpdate = {
            action: normalizedIntent.action.toLowerCase(),
            layer: normalizedIntent.layer,
            scope: normalizedIntent.scope,
            scopeName: normalizedIntent.scopeName,
            targetIds: normalizedIntent.targetIds,
            highlight: normalizedIntent.highlight,
            fitBounds: normalizedIntent.fitBounds,
            bounds: normalizedIntent.bounds
          };
        }
        if (agentUpdate) {
          mapUpdates.push(agentUpdate);
        }
      }

      const resolvedTarget = locRes.stateName || (h ? h.landing_center_name : (p.location?.name || normalizedIntent.scopeName));
      const resolvedState = locRes.stateName || h?.state || null;
      const resolvedSector = locRes.stateName || h?.sector || h?.state || null;
      let dashboardIntent = p.dashboardIntent;
      if (!dashboardIntent) {
        dashboardIntent = {
          context: normalizedIntent.layer === 'RESTRICTED_ZONES' ? 'RESTRICTED_ZONES' :
                   (normalizedIntent.layer === 'PFZ' ? 'PFZ_OVERVIEW' :
                   (normalizedIntent.layer === 'CYCLONES' ? 'CYCLONE_TRACK' :
                   (normalizedIntent.layer === 'ROUTES' ? 'NAVIGATION_ROUTE' : 'HARBOR_TELEMETRY'))),
          primaryCard: normalizedIntent.layer === 'RESTRICTED_ZONES' ? 'zone' :
                       (normalizedIntent.layer === 'PFZ' ? 'pfz' :
                       (normalizedIntent.layer === 'CYCLONES' ? 'cyclone' :
                       (normalizedIntent.layer === 'ROUTES' ? 'route' : 'weather'))),
          scope: normalizedIntent.scope,
          scopeName: normalizedIntent.scopeName || resolvedTarget,
          queryTarget: resolvedTarget,
          state: resolvedState,
          sector: resolvedSector,
          title: normalizedIntent.scopeName || resolvedTarget || 'Maritime Telemetry'
        };
      } else {
        dashboardIntent = {
          ...dashboardIntent,
          queryTarget: dashboardIntent.queryTarget || resolvedTarget,
          scope: dashboardIntent.scope || normalizedIntent.scope,
          scopeName: dashboardIntent.scopeName || normalizedIntent.scopeName || resolvedTarget,
          state: dashboardIntent.state || resolvedState,
          sector: dashboardIntent.sector || resolvedSector
        };
      }

      return {
        locationResolution: locRes,
        resolvedHarbor: h ? {
          harbor_id: h.harbor_id,
          landing_center_name: h.landing_center_name,
          district: h.district,
          state: h.state,
          latitude: Number(h.latitude),
          longitude: Number(h.longitude)
        } : null,
        results,
        cardUpdates: results.flatMap((r: any) => r.cardUpdates),
        mapUpdates,
        mapIntent: normalizedIntent,
        dashboardIntent,
        mapData
      };
    })
    .addNode('synthesize', async (s: State) => {
      if (s.answer) return { answer: s.answer };
      return { answer: await synthesize(s.query, s.plan, s.results, s.locationResolution, s.mapIntent) };
    })
    .addEdge(START, 'coordinate')
    .addEdge('coordinate', 'execute')
    .addEdge('execute', 'synthesize')
    .addEdge('synthesize', END)
    .compile();
  return await graph.invoke({ query, context } as any);
}
