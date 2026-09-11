import { Express } from 'express';
import { runOrca } from '../ai/graph';

export function registerAiRoute(app: Express) {
  app.post('/api/v1/ai/chat', async (req, res) => {
    try {
      const query = String(req.body?.query || '').trim();
      if (!query) return res.status(400).json({ success: false, error: 'query is required' });
      const context = req.body?.context;

      console.log(`[ORCA] Query: "${query}"`);
      const state: any = await runOrca(query, context);

      const locStatus = state.locationResolution?.status || (state.resolvedHarbor ? 'SUPPORTED' : 'UNKNOWN');
      const latestMapUpdate = (state.mapUpdates || []).at(-1) || null;
      const mapIntent = state.mapIntent || { action: 'PRESERVE' };

      console.log(`[ORCA] Coordinator intent: ${state.plan?.intent || 'MARITIME_OPERATION_ASSESSMENT'}`);
      console.log(`[ORCA] Location resolution: ${locStatus} · ${state.locationResolution?.locationName || 'None'}`);
      console.log(`[ORCA] MapIntent:`, JSON.stringify(mapIntent));

      const locationCoords = state.locationResolution?.coordinates;
      const resolvedHarbor = state.resolvedHarbor;

      res.json({
        success: true,
        answer: state.answer,
        intent: state.plan?.intent,
        locationStatus: locStatus,
        isInland: locStatus === 'INLAND',
        location: {
          name: state.locationResolution?.locationName || resolvedHarbor?.landing_center_name || null,
          type: state.locationResolution?.locationType || locStatus,
          latitude: locationCoords?.latitude ?? (resolvedHarbor ? Number(resolvedHarbor.latitude) : null),
          longitude: locationCoords?.longitude ?? (resolvedHarbor ? Number(resolvedHarbor.longitude) : null)
        },
        harborId: resolvedHarbor?.harbor_id || null,
        resolvedHarbor,
        referenceHarbor: state.locationResolution?.referenceHarbor || null,
        suggestions: state.locationResolution?.suggestions || [],
        agentsExecuted: state.plan?.requestedAgents || [],
        plan: state.plan,
        mapIntent,
        dashboardIntent: state.dashboardIntent || state.plan?.dashboardIntent || null,
        queryTarget: state.dashboardIntent?.queryTarget || state.plan?.dashboardIntent?.queryTarget || state.locationResolution?.stateName || state.locationResolution?.locationName || null,
        mapData: state.mapData || {},
        cardUpdates: state.cardUpdates || [],
        mapUpdate: latestMapUpdate,
        agentResults: state.results || [],
        freshness: state.results?.map((r: any) => ({ agent: r.agent, freshness: r.freshness })).filter(Boolean) || [],
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[ORCA] AI error:', error);
      res.status(500).json({ success: false, error: error?.message || 'AI request failed' });
    }
  });
}
