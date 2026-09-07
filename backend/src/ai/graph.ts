import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { plan, synthesize } from './coordinator';
import { agentRunners } from './agents';
import { resolveHarbor } from './db';
import { AgentRequest, AgentResult } from './types';

const OrcaState = Annotation.Root({
  query: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => '' }),
  plan: Annotation<any>({ reducer: (x, y) => y ?? x, default: () => ({}) }),
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
      const h = await resolveHarbor(p.location);
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
          location: {
            name: h.landing_center_name,
            latitude: Number(h.latitude),
            longitude: Number(h.longitude)
          },
          zoom: 11
        });
      }
      return {
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
    .addNode('synthesize', async (s: State) => ({ answer: await synthesize(s.query, s.plan, s.results) }))
    .addEdge(START, 'coordinate')
    .addEdge('coordinate', 'execute')
    .addEdge('execute', 'synthesize')
    .addEdge('synthesize', END)
    .compile();
  return await graph.invoke({ query } as any);
}
