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
    onUpdateDynamicZones
  } = handlers;

  const action = intent.action;
  const layer = intent.layer;
  const scope = intent.scope;
  const targetIds = intent.targetIds || [];

  console.log('[ORCA Executor] Executing MapIntent: ' + action + ' - Layer: ' + (layer || 'NONE') + ' - Scope: ' + (scope || 'NONE'));

  // 1. PRESERVE - Leave map view and layers completely untouched
  if (action === 'PRESERVE') {
    return;
  }

  // Maritime operations automatically disengage inland locality view
  if (action === 'FOCUS_HARBOR' || action === 'FIT_LAYER' || action === 'FOCUS_LAYER') {
    if (onDisengageInland) {
      onDisengageInland();
    }
  }

  // 2. FOCUS_HARBOR - Recenter to specified harbor
  if (action === 'FOCUS_HARBOR' || (action === 'FIT_LAYER' && layer === 'HARBORS')) {
    const harborId = intent.harborId || payload?.harborId;
    if (harborId && onSelectHarbor) {
      onSelectHarbor(harborId);
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
      const label = intent.scopeName
        ? 'Restricted Zones: ' + intent.scopeName
        : 'Marine Protected Areas and Sanctuaries';

      if (onMapFocus) {
        onMapFocus({
          layer: 'RESTRICTED_ZONES',
          bounds: intent.bounds,
          highlightedZoneIds: targetIds,
          label,
          timestamp: Date.now()
        });
      }
      return;
    }

    // B. PFZ (Potential Fishing Zones)
    if (layer === 'PFZ') {
      const isNational = scope === 'NATIONAL';
      if (payload?.mapData?.pfz && onUpdateDynamicAdvisories) {
        onUpdateDynamicAdvisories(payload.mapData.pfz);
      }
      const label = isNational
        ? 'National PFZ View (India)'
        : (intent.scopeName ? 'PFZ Hotspots: ' + intent.scopeName : 'Potential Fishing Zone');

      if (onMapFocus) {
        onMapFocus({
          layer: 'PFZ',
          scope: isNational ? 'NATIONAL' : 'NEAR_LOCATION',
          bounds: intent.bounds,
          highlightedPfzIds: targetIds,
          lat: intent.location?.latitude,
          lon: intent.location?.longitude,
          zoom: isNational ? 5 : 10,
          label,
          timestamp: Date.now()
        });
      }
      return;
    }

    // C. CYCLONES
    if (layer === 'CYCLONES') {
      if (onMapFocus) {
        onMapFocus({
          layer: 'CYCLONES',
          bounds: intent.bounds,
          cyclones: payload?.mapData?.cyclones,
          label: 'Active Cyclone Track and Proximity Radar',
          timestamp: Date.now()
        });
      }
      return;
    }

    // D. EEZ
    if (layer === 'EEZ') {
      if (onMapFocus) {
        onMapFocus({
          layer: 'EEZ',
          bounds: intent.bounds || [[5.5, 66.5], [23.8, 94.5]],
          label: 'Indian Exclusive Economic Zone (200 NM)',
          timestamp: Date.now()
        });
      }
      return;
    }

    // E. IMBL
    if (layer === 'IMBL') {
      if (onMapFocus) {
        onMapFocus({
          layer: 'IMBL',
          bounds: intent.bounds || [[8.5, 78.5], [10.5, 80.5]],
          label: 'International Maritime Boundary Line (IMBL)',
          timestamp: Date.now()
        });
      }
      return;
    }

    // F. ROUTES
    if (layer === 'ROUTES') {
      if (onMapFocus) {
        onMapFocus({
          layer: 'ROUTES',
          label: 'Recommended Navigation Corridor',
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
