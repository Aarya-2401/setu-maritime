import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { plan, synthesize } from './coordinator';
import { agentRunners } from './agents';
import { resolveLocation, LocationResolution, pool } from './db';
import { AgentRequest, AgentResult } from './types';

const OrcaState = Annotation.Root({
  query: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => '' }),
  plan: Annotation<any>({ reducer: (x, y) => y ?? x, default: () => ({}) }),
  locationResolution: Annotation<LocationResolution>({ reducer: (x, y) => y ?? x, default: () => ({ status: 'UNKNOWN' }) }),
  resolvedHarbor: Annotation<any>({ reducer: (x, y) => y ?? x, default: () => null }),
  results: Annotation<AgentResult[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  answer: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => '' }),
  cardUpdates: Annotation<any[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  mapUpdates: Annotation<any[]>({ reducer: (a, b) => a.concat(b), default: () => [] })
});

type State = typeof OrcaState.State;

export async function runOrca(query: string) {
  const graph = new StateGraph(OrcaState)
    .addNode('coordinate', async (s: State) => ({ plan: await plan(s.query) }))
    .addNode('execute', async (s: State) => {
      const p = s.plan;
      const locRes = await resolveLocation(p.location);

      // Handle INLAND location: retain fallback to Gujarat (Veraval ID 1) in background,
      // but instruct dashboard to display queried inland locality over the map and title cards
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

        const mapUpdates = [{
          action: 'recenter',
          targetType: 'inland',
          locationName: place,
          location: {
            name: place,
            latitude: coords.latitude,
            longitude: coords.longitude
          },
          zoom: 10,
          fallbackHarborId: fallbackHarbor?.harbor_id || 1
        }];

        const cardUpdates = [
          { card: 'weather', status: 'LIVE_INLAND', location: place },
          { card: 'wind', status: 'LIVE_INLAND', location: place },
          { card: 'wave', status: 'INACTIVE_INLAND', note: 'Wave telemetry disabled for inland position' },
          { card: 'tide', status: 'INACTIVE_INLAND', note: 'Tidal telemetry disabled for inland position' }
        ];

        return {
          locationResolution: locRes,
          resolvedHarbor: fallbackHarbor,
          results: [],
          cardUpdates,
          mapUpdates,
          answer: `${place} is an inland location with no open coastline. I have updated your dashboard title cards with the live local weather and surface winds for ${place}, centered your locality radar map on ${place}, and maintained Veraval Fishing Harbor, Gujarat as your regional maritime reference point.`
        };
      }

      if (locRes.status === 'UNKNOWN' && p.location?.name) {
        let fallbackHarbor: any = null;
        try {
          const [rows]: any = await pool.query('SELECT * FROM dim_fishing_harbors WHERE harbor_id = 1 LIMIT 1');
          if (rows.length) fallbackHarbor = rows[0];
        } catch (e) {
          console.warn('Fallback harbor query failed:', e);
        }

        return {
          locationResolution: locRes,
          resolvedHarbor: fallbackHarbor,
          results: [],
          cardUpdates: [],
          mapUpdates: [],
          answer: `I could not locate a designated fishing harbor for "${p.location.name}". SETU monitors 56 major fishing harbors across coastal India. I have maintained Veraval, Gujarat as your fallback maritime baseline. You can choose a coastal station from the suggestions below.`
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
        operation: p.operation
      };

      const results = await Promise.all(p.requestedAgents.map((a: any) => agentRunners[a](req)));
      const mapUpdates = results.flatMap((r: any) => r.mapUpdate ? [r.mapUpdate] : []);
      if (mapUpdates.length === 0 && h) {
        mapUpdates.push({
          action: 'recenter',
          harborId: h.harbor_id,
          location: {
            name: h.landing_center_name,
            latitude: Number(h.latitude),
            longitude: Number(h.longitude)
          },
          zoom: 11
        });
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
        mapUpdates
      };
    })
    .addNode('synthesize', async (s: State) => {
      // If answer was already set by inland/unknown checks, preserve it
      if (s.answer) return { answer: s.answer };
      return { answer: await synthesize(s.query, s.plan, s.results, s.locationResolution) };
    })
    .addEdge(START, 'coordinate')
    .addEdge('coordinate', 'execute')
    .addEdge('execute', 'synthesize')
    .addEdge('synthesize', END)
    .compile();
  return await graph.invoke({ query } as any);
}
