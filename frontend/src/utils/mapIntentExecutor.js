// ---------------------------------------------------------------------------
// Centralized MapIntent Executor for SETU-ADAM01
// Strictly executes backend MapIntents without frontend heuristic pre-routing.
// ---------------------------------------------------------------------------

/**
 * Execute a validated backend MapIntent against the dashboard and Leaflet map.
 * @param {Object} mapIntent - The normalized MapIntent from backend
 * @param {Object} payload - The complete AI response payload
 * @param {Object} handlers - UI dispatcher functions
 */
export function executeMapIntent(mapIntent, payload, handlers = {}) {
  let intent = mapIntent;
  if ((!intent || !intent.action) && payload?.mapUpdate) {
    const mu = payload.mapUpdate;
    if (mu.action === 'fit_layer' || mu.action === 'focus_layer') {
      intent = {
        action: mu.action.toUpperCase(),
        layer: mu.layer,
        scope: mu.scope,
        scopeName: mu.scopeName,
        targetIds: mu.targetIds,
        highlight: mu.highlight,
        bounds: mu.bounds
      };
    } else if (mu.action === 'recenter') {
      intent = {
        action: 'FOCUS_HARBOR',
        harborId: mu.harborId,
        location: mu.location
      };
    }
  }

  if (!intent || !intent.action) {
    return;
  }

  const {
    onSelectHarbor,
    onMapFocus,
    onSetInlandLocation,
    onDisengageInland,
    onUpdateDynamicAdvisories,
    onUpdateDynamicZones,
    onUpdateDashboardIntent,
    onUpdateCardUpdates,
    onUpdateQueryTarget
  } = handlers;

  // Always propagate dashboard intent, card updates, and query target to maintain UI consistency
  if (onUpdateDashboardIntent) {
    if (payload?.dashboardIntent) {
      onUpdateDashboardIntent(payload.dashboardIntent);
    } else if (intent.layer === 'RESTRICTED_ZONES') {
      onUpdateDashboardIntent({ context: 'RESTRICTED_ZONES', queryTarget: intent.scopeName });
    } else if (intent.layer === 'PFZ') {
      onUpdateDashboardIntent({ context: 'PFZ_OVERVIEW', queryTarget: intent.scopeName });
    } else if (intent.layer === 'CYCLONES') {
      onUpdateDashboardIntent({ context: 'CYCLONE_TRACK' });
    } else if (intent.layer === 'ROUTES') {
      onUpdateDashboardIntent({ context: 'NAVIGATION_ROUTE' });
    }
  }

  if (onUpdateCardUpdates && payload?.cardUpdates) {
    onUpdateCardUpdates(payload.cardUpdates);
  }

  if (onUpdateQueryTarget) {
    const qTarget = payload?.queryTarget || payload?.dashboardIntent?.queryTarget || intent?.scopeName || intent?.location?.name;
    if (qTarget) onUpdateQueryTarget(qTarget);
  }

  const action = intent.action;
  const layer = intent.layer;
  const scope = intent.scope;
  const targetIds = intent.targetIds || [];

  console.log('[ORCA Executor] Executing MapIntent: ' + action + ' - Layer: ' + (layer || 'NONE') + ' - Scope: ' + (scope || 'NONE'));

  // Disengage inland terrestrial view for maritime actions
  const isTargetInland = Boolean(payload?.isInland || payload?.locationStatus === 'INLAND' || action === 'FOCUS_LOCATION');
  if (!isTargetInland && onDisengageInland) {
    onDisengageInland();
  }

  // Synchronize active maritime harbor if a valid harbor was resolved and scope is not national
  const resolvedHarborId = intent.harborId || payload?.harborId || payload?.resolvedHarbor?.harbor_id;
  if (resolvedHarborId && scope !== 'NATIONAL' && onSelectHarbor) {
    onSelectHarbor(Number(resolvedHarborId));
  }

  // 1. PRESERVE - Leave map view and layers completely untouched
  if (action === 'PRESERVE') {
    return;
  }

  // 2. FOCUS_HARBOR - Recenter to specified harbor
  if (action === 'FOCUS_HARBOR' || (action === 'FIT_LAYER' && layer === 'HARBORS')) {
    const harborId = intent.harborId || payload?.harborId;
    if (harborId && onSelectHarbor) {
      onSelectHarbor(Number(harborId));
    }
    const lat = intent.location?.latitude || payload?.location?.latitude;
    const lon = intent.location?.longitude || payload?.location?.longitude;
    const name = intent.location?.name || payload?.location?.name || 'Selected Harbor';
    if (lat && lon && onMapFocus) {
      onMapFocus({
        lat: Number(lat),
        lon: Number(lon),
        zoom: 11,
        label: name,
        timestamp: Date.now()
      });
    }
    return;
  }

  // 3. FOCUS_LOCATION - Inland terrestrial or arbitrary coordinate target
  if (action === 'FOCUS_LOCATION') {
    const lat = intent.location?.latitude ?? payload?.location?.latitude;
    const lon = intent.location?.longitude ?? payload?.location?.longitude;
    const name = intent.location?.name || payload?.location?.name || 'Target Location';

    if (payload?.isInland || payload?.locationStatus === 'INLAND') {
      if (onSetInlandLocation && lat != null && lon != null) {
        onSetInlandLocation({
          lat: Number(lat),
          lon: Number(lon),
          place: name,
          label: name,
          city: name.split(',')[0]?.trim(),
          state: name.split(',')[1]?.trim() || 'Inland'
        });
      }
    }

    if (lat != null && lon != null && onMapFocus) {
      onMapFocus({
        lat: Number(lat),
        lon: Number(lon),
        zoom: 10,
        label: name,
        timestamp: Date.now()
      });
    }
    return;
  }

  // 4. FIT_LAYER / FOCUS_LAYER - Specialized maritime layers
  if (action === 'FIT_LAYER' || action === 'FOCUS_LAYER') {
    // A. RESTRICTED_ZONES
    if (layer === 'RESTRICTED_ZONES') {
      if (payload?.mapData?.restrictedZones && onUpdateDynamicZones) {
        onUpdateDynamicZones(payload.mapData.restrictedZones);
      }
      if (onUpdateDynamicAdvisories) {
        onUpdateDynamicAdvisories(null);
      }
      const rawScope = intent.scopeName || payload?.queryTarget || 'Maritime';
      const cleanScope = rawScope.replace(/\s*\(Bunder\)/i, '').replace(/\s*Fish\s+Landing\s+Center/i, '').replace(/\s*Fishing\s+Harbor/i, '').trim();
      const label = `${cleanScope} Restricted Zones`;

      if (onMapFocus) {
        onMapFocus({
          type: 'RESTRICTED_ZONE',
          layer: 'RESTRICTED_ZONES',
          scope: intent.scope || 'REGION',
          scopeName: intent.scopeName || cleanScope,
          label,
          location: intent.location || payload?.location || null,
          entityIds: targetIds,
          bounds: intent.bounds,
          highlightedZoneIds: targetIds,
          timestamp: Date.now()
        });
      }
      return;
    }

    // B. PFZ (Potential Fishing Zones)
    if (layer === 'PFZ') {
      const isNational = scope === 'NATIONAL';
      const isState = scope === 'STATE';
      if (payload?.mapData?.pfz && onUpdateDynamicAdvisories) {
        onUpdateDynamicAdvisories(payload.mapData.pfz);
      }
      if (onUpdateDynamicZones) {
        onUpdateDynamicZones(null);
      }
      const rawScope = intent.scopeName || payload?.queryTarget;
      const cleanScope = rawScope ? rawScope.replace(/\s*\(Bunder\)/i, '').replace(/\s*Fish\s+Landing\s+Center/i, '').replace(/\s*Fishing\s+Harbor/i, '').trim() : null;

      let label = 'Potential Fishing Zone';
      if (isNational) {
        label = 'National PFZ View (India)';
      } else if (isState) {
        label = `${cleanScope || 'State'} PFZ Hotspots`;
      } else if (cleanScope) {
        label = `${cleanScope} PFZ Hotspots`;
      }

      if (onMapFocus) {
        onMapFocus({
          type: 'PFZ',
          layer: 'PFZ',
          scope: isNational ? 'NATIONAL' : (isState ? 'STATE' : 'NEAR_LOCATION'),
          scopeName: intent.scopeName || cleanScope,
          label,
          location: intent.location || payload?.location || null,
          entityIds: targetIds,
          bounds: intent.bounds,
          highlightedPfzIds: targetIds,
          lat: intent.location?.latitude,
          lon: intent.location?.longitude,
          zoom: isNational ? 5 : (isState ? 8 : 10),
          timestamp: Date.now()
        });
      }
      return;
    }

    // C. CYCLONES
    if (layer === 'CYCLONES') {
      if (onMapFocus) {
        onMapFocus({
          type: 'CYCLONE',
          layer: 'CYCLONES',
          scope: 'NATIONAL',
          label: 'Active Cyclone Track & Proximity Radar',
          location: intent.location || null,
          entityIds: targetIds,
          bounds: intent.bounds,
          cyclones: payload?.mapData?.cyclones,
          timestamp: Date.now()
        });
      }
      return;
    }

    // D. EEZ
    if (layer === 'EEZ') {
      if (onMapFocus) {
        onMapFocus({
          type: 'EEZ',
          layer: 'EEZ',
          scope: 'NATIONAL',
          label: 'Indian Exclusive Economic Zone (200 NM)',
          location: null,
          entityIds: [],
          bounds: intent.bounds || [[5.5, 66.5], [23.8, 94.5]],
          timestamp: Date.now()
        });
      }
      return;
    }

    // E. IMBL
    if (layer === 'IMBL') {
      if (onMapFocus) {
        onMapFocus({
          type: 'IMBL',
          layer: 'IMBL',
          scope: 'NATIONAL',
          label: 'International Maritime Boundary Line (IMBL)',
          location: null,
          entityIds: [],
          bounds: intent.bounds || [[8.5, 78.5], [10.5, 80.5]],
          timestamp: Date.now()
        });
      }
      return;
    }

    // F. ROUTES
    if (layer === 'ROUTES') {
      if (onMapFocus) {
        onMapFocus({
          type: 'ROUTE',
          layer: 'ROUTES',
          scope: 'CURRENT_HARBOR',
          label: 'Recommended Navigation Corridor',
          location: intent.location || null,
          entityIds: targetIds,
          timestamp: Date.now()
        });
      }
      return;
    }
  }

  // 5. CLEAR_FOCUS
  if (action === 'CLEAR_FOCUS') {
    if (onMapFocus) {
      onMapFocus(null);
    }
  }
}
