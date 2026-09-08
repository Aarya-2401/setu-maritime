import { Express } from 'express';
import { runOrca } from '../ai/graph';

export function registerAiRoute(app: Express) {
  app.post('/api/v1/ai/chat', async (req, res) => {
    try {
      const query = String(req.body?.query || '').trim();
      if (!query) return res.status(400).json({ success:false, error:'query is required' });
      const state:any = await runOrca(query);
      const locStatus = state.locationResolution?.status || (state.resolvedHarbor ? 'SUPPORTED' : 'UNKNOWN');
      const latestMapUpdate = (state.mapUpdates || []).at(-1);

      res.json({
        success: true,
        answer: state.answer,
        locationStatus: locStatus,
        location: state.locationResolution?.locationName || state.resolvedHarbor?.landing_center_name || null,
        harborId: state.resolvedHarbor?.harbor_id || null,
        resolvedHarbor: state.resolvedHarbor,
        suggestions: state.locationResolution?.suggestions || [],
        agentsExecuted: state.plan?.requestedAgents || [],
        plan: state.plan,
        cardUpdates: state.cardUpdates || [],
        mapUpdate: (locStatus === 'SUPPORTED' || locStatus === 'COASTAL_STATE') ? (latestMapUpdate || (state.resolvedHarbor ? {
          action: 'recenter',
          harborId: state.resolvedHarbor.harbor_id,
          location: {
            name: state.resolvedHarbor.landing_center_name,
            latitude: state.resolvedHarbor.latitude,
            longitude: state.resolvedHarbor.longitude
          },
          zoom: 11
        } : null)) : null,
        agentResults: state.results || [],
        timestamp: new Date().toISOString()
      });
    } catch (error:any) {
      console.error('ORCA AI error:',error);
      res.status(500).json({success:false,error:error?.message || 'AI request failed'});
    }
  });
}
