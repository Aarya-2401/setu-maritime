import { useState, useEffect, useMemo, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  Polyline,
  Tooltip,
  useMap
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import DetailModal from '../Modal/DetailModal'
import { IconRadar, IconCompass, IconGlobe, IconLayers, IconMaximize, IconMinimize } from '../Icons'
import {
  getFormattedHarborTag,
  getUNLocode,
  getHarborAuthority,
  getMaritimeStandardTag
} from '../../data/harborCodes'
import { calculateETA, checkZoneTraverse } from '../../data/decisionLogic'
import { KERALA_DEMO_ROUTE, KERALA_DEMO_ADVISORY } from '../../data/keralaDemoData'
import './MapSection.css'

// Self-contained custom SVG radar ping marker icon
function createHarborMarkerIcon(locode = 'IN-HAR') {
  return L.divIcon({
    className: 'custom-harbor-marker',
    html: `
      <div class="harbor-marker-pin">
        <span class="harbor-marker-pulse"></span>
        <span class="harbor-marker-core"></span>
        <span class="harbor-marker-tag">${locode}</span>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  })
}

// Self-contained custom SVG user location marker icon
function createUserMarkerIcon() {
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="user-marker-pin">
        <span class="user-marker-pulse"></span>
        <span class="user-marker-core"></span>
        <span class="user-marker-tag">YOU</span>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  })
}

// Dynamic map camera controller with smooth cinematic flight animation
function MapCameraController({ centerLat, centerLon, focusTarget }) {
  const map = useMap()
  const prevTargetTime = useRef(null)
  const prevCenterKey = useRef(null)

  useEffect(() => {
    // Priority 1: Fit bounds if bounding box is commanded (e.g. state zones, national PFZ, EEZ, IMBL, Cyclones)
    if (focusTarget && focusTarget.bounds && Array.isArray(focusTarget.bounds) && focusTarget.bounds.length >= 2) {
      if (focusTarget.timestamp !== prevTargetTime.current) {
        prevTargetTime.current = focusTarget.timestamp
        try {
          map.fitBounds(focusTarget.bounds, {
            padding: [45, 45],
            maxZoom: focusTarget.maxZoom || 11,
            animate: true,
            duration: 2.0
          })
        } catch (e) {
          console.warn('[MapCameraController] fitBounds failed:', e)
        }
        return
      }
    }

    // Priority 2: Smooth cinematic flyTo if a specific target coordinate is commanded
    if (focusTarget && focusTarget.lat && focusTarget.lon) {
      if (focusTarget.timestamp !== prevTargetTime.current) {
        prevTargetTime.current = focusTarget.timestamp
        map.flyTo([Number(focusTarget.lat), Number(focusTarget.lon)], focusTarget.zoom || 11, {
          duration: 2.2,
          easeLinearity: 0.25
        })
        return
      }
    }

    // Priority 3: Recenter to selected harbor if harbor changes
    const centerKey = `${centerLat},${centerLon}`
    if (centerLat && centerLon && prevCenterKey.current !== centerKey) {
      prevCenterKey.current = centerKey
      if (!focusTarget || focusTarget.timestamp !== prevTargetTime.current) {
        map.setView([centerLat, centerLon], 8, { animate: true })
      }
    }
  }, [centerLat, centerLon, focusTarget, map])

  return null
}

// Ensure Leaflet map recalculates viewport dimensions smoothly
function MapInvalidator() {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 150)

    const handleResize = () => {
      map.invalidateSize()
    }
    window.addEventListener('resize', handleResize)

    const container = map.getContainer()
    let observer = null
    if (typeof ResizeObserver !== 'undefined' && container) {
      observer = new ResizeObserver(() => {
        map.invalidateSize()
      })
      observer.observe(container)
    }

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
      if (observer) observer.disconnect()
    }
  }, [map])
  return null
}

function CheckPassIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CheckWarnIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function CheckFailIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// Reusable geospatial layers: Departure Marker, Wave Radius, Routes, PFZ, MPAs, EEZ/IMBL
function MapLayers({
  coords,
  locationName,
  harbor,
  hasHarbor,
  safetyRating,
  waveHeight,
  windSpeed,
  loading,
  layerWaves,
  layerRoutes,
  routes,
  layerPFZ,
  advisories,
  layerMPA,
  restrictedZones,
  layerEEZ,
  maritimeBoundaries,
  selectedRouteId,
  onSelectRoute,
  userLocation,
  harborCoords,
  mapFocusTarget
}) {
  const locode = getUNLocode(harbor)
  const harborMarkerIcon = useMemo(() => createHarborMarkerIcon(locode), [locode])
  const originCoords = harborCoords || coords

  // Group and sort EEZ Outer Boundary (200 NM limit)
  const eezPoints = useMemo(() => {
    if (!maritimeBoundaries || maritimeBoundaries.length === 0) return []
    return maritimeBoundaries
      .filter((b) => (b.boundary_type || '').toUpperCase().includes('EEZ'))
      .sort((a, b) => Number(a.point_order) - Number(b.point_order))
      .map((b) => [Number(b.latitude), Number(b.longitude)])
  }, [maritimeBoundaries])

  // Group IMBL lines by neighbor_country
  const imblGroups = useMemo(() => {
    if (!maritimeBoundaries || maritimeBoundaries.length === 0) return {}
    const groups = maritimeBoundaries
      .filter((b) => (b.boundary_type || '').toUpperCase().includes('IMBL'))
      .reduce((acc, b) => {
        const country = b.neighbor_country || 'International'
        if (!acc[country]) acc[country] = []
        acc[country].push(b)
        return acc
      }, {})

    Object.values(groups).forEach((pts) => {
      pts.sort((a, b) => Number(a.point_order) - Number(b.point_order))
    })
    return groups
  }, [maritimeBoundaries])

  return (
    <>
      {/* Active Departure Harbor Marker */}
      {hasHarbor && (
        <Marker position={originCoords} icon={harborMarkerIcon}>
          <Popup>
            <div style={{ color: '#0f172a', fontSize: '11.5px', minWidth: '220px' }}>
              <strong style={{ fontSize: '13px', color: '#1e40af', display: 'block', marginBottom: '2px' }}>{harbor?.landing_center_name || locationName}</strong>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '3px', fontWeight: 700, fontSize: '10px' }}>
                  {getUNLocode(harbor)}
                </span>
                <span style={{ color: '#0284c7', fontSize: '11px', fontWeight: 700 }}>
                  {getFormattedHarborTag(harbor)}
                </span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                  ({harbor?.harbor_type || 'Harbor'})
                </span>
              </div>
              <div style={{ fontSize: '10.5px', color: '#cbd5e1', marginBottom: '3px' }}>
                <b>Authority:</b> {getHarborAuthority(harbor)}
              </div>
              <div style={{ color: '#059669', fontWeight: 700, marginBottom: '3px' }}>
                ● {safetyRating}
              </div>
              <div style={{ marginBottom: '3px' }}>
                Wave: <b>{waveHeight != null ? `${waveHeight}m` : '--'}</b> · Wind: <b>{windSpeed != null ? `${windSpeed} km/h` : '--'}</b>
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                Facilities: {harbor?.facilities || 'Cold Storage, Fuel, Ice Plant'}
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      {/* 1. Wave Hazard Perimeter Circle */}
      {hasHarbor && layerWaves && !loading && waveHeight != null && (
        <Circle
          center={originCoords}
          radius={20000 + waveHeight * 6000}
          pathOptions={{
            color: waveHeight > 3.0 ? '#ef4444' : waveHeight > 2.0 ? '#f59e0b' : '#35c9e8',
            fillColor: waveHeight > 3.0 ? '#ef4444' : waveHeight > 2.0 ? '#f59e0b' : '#35c9e8',
            fillOpacity: 0.08,
            weight: 1.5,
          }}
        />
      )}

      {/* 2. Geofenced Sailing Route Corridors with Visual Dominance for Selected Corridor */}
      {layerRoutes &&
        routes &&
        routes.slice(0, 10).map((route, idx) => {
          const destLat = Number(route.target_lat)
          const destLon = Number(route.target_lon)
          if (!destLat || !destLon) return null

          const isSelected =
            route.advisory_id === selectedRouteId ||
            (!selectedRouteId && idx === 0)

          // Real-time geometric check against all 10 restricted zones on the map
          let clientZoneViolation = null
          if (restrictedZones && restrictedZones.length > 0) {
            for (const z of restrictedZones) {
              const check = checkZoneTraverse(originCoords[0], originCoords[1], destLat, destLon, z)
              if (check.traverses) {
                clientZoneViolation = check
                break
              }
            }
          }

          const rStatus = route.geofencing_compliance_status || ''
          const isTraverseViolation =
            Boolean(clientZoneViolation) ||
            route.violates_restricted_zone ||
            rStatus.includes('TRAVERSES') ||
            rStatus.includes('RESTRICTED') ||
            rStatus.includes('SANCTUARY') ||
            rStatus.includes('BAN')

          const violatedZoneName =
            clientZoneViolation?.zone ||
            route.intersected_sanctuary ||
            route.nearest_protected_zone ||
            'Restricted Marine Zone'

          const isCaution = rStatus.includes('CAUTION')
          const isWarning = rStatus.includes('WARNING') || isTraverseViolation

          // Visual Hierarchy: Selected corridor is visually prominent and thicker
          const rColor = isTraverseViolation
            ? '#ef4444'
            : isWarning
            ? '#ef4444'
            : isCaution
            ? '#f59e0b'
            : isSelected
            ? '#06b6d4'
            : '#10b981'

          const weight = isSelected ? (isTraverseViolation ? 4.6 : 4.0) : (isTraverseViolation ? 2.4 : 1.8)
          const dashArray = isSelected ? (isTraverseViolation ? '6, 4' : 'none') : '6, 6'
          const opacity = isSelected ? 1.0 : 0.45

          return (
            <Polyline
              key={route.advisory_id || idx}
              positions={[originCoords, [destLat, destLon]]}
              pathOptions={{
                color: rColor,
                weight,
                dashArray,
                opacity,
              }}
              eventHandlers={{
                click: () => {
                  if (onSelectRoute) onSelectRoute(route.advisory_id)
                }
              }}
            >
              <Tooltip sticky direction="top">
                <span>
                  {isSelected ? 'RECOMMENDED CORRIDOR: ' : `Route Candidate ${idx + 1}: `}
                  {route.bearing_compass} ({route.distance_nm} NM) · ETA: {calculateETA(route.distance_nm)} —{' '}
                  <b style={{ color: rColor }}>
                    {isTraverseViolation
                      ? `SANCTUARY VIOLATION (${violatedZoneName})`
                      : isCaution
                      ? 'CAUTION'
                      : isWarning
                      ? 'WARNING'
                      : 'CLEAR'}
                  </b>
                </span>
              </Tooltip>
              <Popup>
                <div style={{ color: '#0f172a', fontSize: '11.5px', maxWidth: '250px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ color: isTraverseViolation ? '#ef4444' : isSelected ? '#0284c7' : '#1e40af' }}>
                      {isTraverseViolation
                        ? 'Sanctuary Violation'
                        : isSelected
                        ? 'Recommended Route Corridor'
                        : `Route Candidate #${idx + 1}`}
                    </strong>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: `${rColor}15`,
                        color: rColor,
                        border: `1px solid ${rColor}40`
                      }}
                    >
                      {isSelected ? 'ACTIVE' : 'OPTION'}
                    </span>
                  </div>
                  <div><strong>Departure:</strong> {route.departure_harbor}</div>
                  <div><strong>Target Species:</strong> {route.target_species}</div>
                  <div><strong>Bearing:</strong> {route.bearing_compass} · <strong>Distance:</strong> {route.distance_nm} NM ({route.distance_km} km)</div>
                  <div><strong>Estimated Transit (ETA):</strong> <b>{calculateETA(route.distance_nm)}</b></div>
                  <div><strong>Nearest Sanctuary:</strong> {violatedZoneName}</div>
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '4px 7px',
                      background: `${rColor}15`,
                      border: `1px solid ${rColor}40`,
                      borderRadius: '3px',
                      color: rColor,
                      fontWeight: 700,
                      fontSize: '10px',
                      lineHeight: '1.3'
                    }}
                  >
                    {isTraverseViolation
                      ? `RESTRICTED PASSAGE: Vector traverses ${violatedZoneName}. Unauthorized transit or fishing is prohibited under maritime exclusion regulations.`
                      : `Status: ${rStatus}`}
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '3px',
                        background: isSelected ? '#0284c7' : '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        if (onSelectRoute) onSelectRoute(route.advisory_id)
                      }}
                    >
                      {isSelected ? 'Corridor Active' : 'Select Corridor'}
                    </button>
                  </div>
                </div>
              </Popup>
            </Polyline>
          )
        })}

      {/* 3. Restricted Marine Protected Areas (Contextual or Target Layer) */}
      {layerMPA &&
        restrictedZones &&
        restrictedZones.map((zone) => {
          const zLat = Number(zone.latitude)
          const zLon = Number(zone.longitude)
          if (!zLat || !zLon) return null

          const isTargetLayer = mapFocusTarget?.layer === 'RESTRICTED_ZONES'
          const isHighlighted =
            isTargetLayer &&
            ((Array.isArray(mapFocusTarget?.highlightedZoneIds) &&
              mapFocusTarget.highlightedZoneIds.includes(zone.zone_id)) ||
              (mapFocusTarget?.scopeName &&
                (zone.state?.toLowerCase().includes(mapFocusTarget.scopeName.toLowerCase()) ||
                  zone.zone_name?.toLowerCase().includes(mapFocusTarget.scopeName.toLowerCase()))))

          const isPFZActive = mapFocusTarget?.layer === 'PFZ'
          const isGiantBan = Number(zone.area_km2 || 0) > 20000

          return (
            <Circle
              key={zone.zone_id}
              center={[zLat, zLon]}
              radius={Math.sqrt(Number(zone.area_km2 || 100)) * (isHighlighted ? 1200 : 1000)}
              pathOptions={{
                color: isHighlighted ? '#e11d48' : (isPFZActive ? '#f43f5e55' : '#f43f5e'),
                fillColor: isHighlighted ? '#e11d48' : (isPFZActive ? '#f43f5e22' : '#f43f5e'),
                fillOpacity: isHighlighted ? 0.42 : (isPFZActive ? 0.04 : 0.16),
                dashArray: isHighlighted ? '3, 3' : '5, 5',
                weight: isHighlighted ? 3.5 : (isPFZActive ? 1 : 1.8),
              }}
              interactive={!isPFZActive || !isGiantBan}
            >
              <Tooltip sticky direction="bottom">
                <span style={{ color: isHighlighted ? '#be123c' : '#9f1239', fontWeight: 700 }}>
                  {isHighlighted ? 'TARGET RESTRICTED: ' : 'Restricted: '}
                  {zone.zone_name}
                </span>
              </Tooltip>
              <Popup>
                <div style={{ color: '#0f172a', fontSize: '11.5px', maxWidth: '230px' }}>
                  <strong style={{ color: '#be123c' }}>{zone.zone_name}</strong><br />
                  <span>Classification: <b>{zone.zone_type}</b> ({zone.state})</span><br />
                  <span>Area: {zone.area_km2} km² · Jurisdiction: {zone.jurisdiction_nm} NM</span><br />
                  <p style={{ marginTop: '4px', fontSize: '10.5px', color: '#475569' }}>
                    {zone.restriction_details}
                  </p>
                  <span style={{ fontSize: '10px', color: '#be123c', fontWeight: 600 }}>
                    Active Period: {zone.active_months}
                  </span>
                </div>
              </Popup>
            </Circle>
          )
        })}

      {/* 4. PFZ Potential Fishing Zone Hotspots — Interactive and Highlighted on Top of Contextual Layers */}
      {layerPFZ &&
        advisories &&
        (mapFocusTarget?.scope === 'NATIONAL' || mapFocusTarget?.layer === 'PFZ' || mapFocusTarget?.highlightAll
          ? advisories
          : advisories.slice(0, 10)
        ).map((adv, idx) => {
          const pLat = Number(adv.pfz_latitude ?? adv.latitude ?? adv.lat)
          const pLon = Number(adv.pfz_longitude ?? adv.longitude ?? adv.lon)
          if (!pLat || !pLon || isNaN(pLat) || isNaN(pLon)) return null

          const advId = String(adv.advisory_id || adv.advisoryId || adv.id || `pfz-${idx}`)
          const isTargetLayer = mapFocusTarget?.layer === 'PFZ'
          const isTargetHighlighted =
            isTargetLayer &&
            (mapFocusTarget?.highlightAll ||
              mapFocusTarget?.scope === 'NATIONAL' ||
              (Array.isArray(mapFocusTarget?.highlightedPfzIds) &&
                (mapFocusTarget.highlightedPfzIds.includes(advId) ||
                  mapFocusTarget.highlightedPfzIds.includes(adv.advisory_id) ||
                  mapFocusTarget.highlightedPfzIds.includes(adv.advisoryId) ||
                  mapFocusTarget.highlightedPfzIds.includes(adv.id))))

          const isSelected =
            advId === selectedRouteId ||
            adv.advisory_id === selectedRouteId ||
            isTargetHighlighted ||
            (!selectedRouteId && !mapFocusTarget?.highlightedPfzIds && idx === 0 && !isTargetLayer)

          const targetSpecies = adv.target_species || adv.targetSpecies || 'Commercial Pelagic Species'
          const bearingCompass = adv.bearing_compass || adv.bearingCompass || 'Offshore'
          const bearingDeg = adv.bearing_deg ?? adv.bearingDeg ?? 0
          const distKm = adv.distance_km ?? adv.distanceKm
          const distNm = adv.distance_nm ?? adv.distanceNm ?? (distKm ? +(distKm / 1.852).toFixed(1) : null)
          const sstVal = adv.sst_celsius ?? adv.sst
          const depthVal = adv.depth_contour_m ?? adv.depth
          const gearVal = adv.recommended_gear || adv.gear || 'Gillnet / Trawl'
          const refHarbor = adv.reference_harbor || adv.referenceHarbor || adv.landing_center_name || adv.state || 'Advisory Base'

          return (
            <CircleMarker
              key={advId}
              center={[pLat, pLon]}
              radius={isTargetHighlighted ? 8 : (isSelected ? 7 : 5)}
              pathOptions={{
                color: isTargetHighlighted ? '#06b6d4' : (isSelected ? '#0284c7' : '#10b981'),
                fillColor: isTargetHighlighted ? '#22d3ee' : (isSelected ? '#38bdf8' : '#34d399'),
                fillOpacity: isTargetHighlighted ? 0.95 : (isSelected ? 0.85 : 0.65),
                weight: isTargetHighlighted ? 2.5 : 1.5,
              }}
              eventHandlers={{
                click: () => {
                  if (onSelectRoute) onSelectRoute(advId)
                }
              }}
            >
              <Tooltip sticky direction="top">
                <div style={{ fontWeight: 700, color: '#0284c7', fontSize: '11px' }}>
                  <span style={{ color: '#059669', marginRight: '4px' }}>[PFZ]</span>
                  {targetSpecies}
                  <div style={{ fontWeight: 500, color: '#475569', fontSize: '10px' }}>
                    {distNm ? `${distNm} NM (${distKm} km)` : (distKm ? `${distKm} km` : 'Active ground')} · {refHarbor}
                  </div>
                </div>
              </Tooltip>
              <Popup>
                <div style={{ color: '#0f172a', fontSize: '11.5px', minWidth: '230px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ color: isSelected ? '#0284c7' : '#059669', fontSize: '12px' }}>
                      PFZ-{advId.slice(-4)}
                    </strong>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: isSelected ? '#0284c718' : '#10b98118',
                        color: isSelected ? '#0284c7' : '#059669',
                        border: `1px solid ${isSelected ? '#0284c740' : '#10b98140'}`
                      }}
                    >
                      {isSelected ? 'SELECTED CORRIDOR' : 'POTENTIAL FISHING ZONE'}
                    </span>
                  </div>
                  <div>Target Species: <b>{targetSpecies}</b></div>
                  <div>Reference Harbor: <b>{refHarbor}</b> ({adv.state || 'India'})</div>
                  {bearingCompass && <div>Bearing: <b>{bearingCompass} ({bearingDeg}°)</b></div>}
                  {distKm != null && (
                    <div>Distance: <b>{distNm != null ? `${distNm} NM ` : ''}({distKm} km)</b> · ETA: <b>{calculateETA(distNm || distKm / 1.852)}</b></div>
                  )}
                  <div>SST: <b>{sstVal != null ? `${sstVal}°C` : 'N/A'}</b> · Depth: <b>{depthVal != null ? `${depthVal}m` : 'N/A'}</b></div>
                  <div>Recommended Gear: <em>{gearVal}</em></div>
                  {adv.bulletin && (
                    <p style={{ marginTop: '5px', fontSize: '10px', color: '#64748b', lineHeight: 1.3 }}>
                      {adv.bulletin}
                    </p>
                  )}
                  <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: isSelected ? '#0284c7' : '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        if (onSelectRoute) onSelectRoute(advId)
                      }}
                    >
                      {isSelected ? 'Corridor Active' : 'Select This Route'}
                    </button>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

      {/* 5. Indian Exclusive Economic Zone (EEZ) 200 NM Outer Limit */}
      {layerEEZ && eezPoints.length > 1 && (
        <Polyline
          positions={eezPoints}
          pathOptions={{
            color: '#f59e0b',
            weight: 2.4,
            dashArray: '8, 6',
            opacity: 0.9,
          }}
        >
          <Tooltip sticky direction="top">
            <span style={{ color: '#d97706', fontWeight: 700 }}>
              200 NM Indian EEZ Outer Boundary (High Seas Limit)
            </span>
          </Tooltip>
          <Popup>
            <div style={{ color: '#0f172a', fontSize: '11.5px', maxWidth: '250px' }}>
              <strong style={{ color: '#d97706', fontSize: '12px' }}>
                Indian Exclusive Economic Zone (EEZ)
              </strong><br />
              <span>Outer Sovereign Limit: <b>200 NM (370.4 km)</b></span><br />
              <p style={{ marginTop: '5px', fontSize: '10.5px', color: '#475569', lineHeight: '1.4' }}>
                Demarcates sovereign rights for exploration, exploitation, conservation, and management of marine living and non-living natural resources under UNCLOS 1982. Waters beyond this boundary constitute the High Seas.
              </p>
              <div
                style={{
                  marginTop: '6px',
                  padding: '3px 6px',
                  background: '#f59e0b18',
                  border: '1px solid #f59e0b40',
                  borderRadius: '3px',
                  color: '#b45309',
                  fontWeight: 600,
                  fontSize: '10px'
                }}
              >
                UNCLOS Sovereign Maritime Jurisdiction (20 Coordinates)
              </div>
            </div>
          </Popup>
        </Polyline>
      )}

      {/* 6. International Maritime Boundary Lines (IMBL) */}
      {layerEEZ &&
        Object.entries(imblGroups).map(([country, pts]) => {
          const polyCoords = pts.map((p) => [Number(p.latitude), Number(p.longitude)])
          if (polyCoords.length < 2) return null
          return (
            <Polyline
              key={`imbl-${country}`}
              positions={polyCoords}
              pathOptions={{
                color: '#f43f5e',
                weight: 2.6,
                dashArray: '6, 4',
                opacity: 0.95,
              }}
            >
              <Tooltip sticky direction="top">
                <span style={{ color: '#be123c', fontWeight: 700 }}>
                  IMBL — India / {country} Border
                </span>
              </Tooltip>
              <Popup>
                <div style={{ color: '#0f172a', fontSize: '11.5px', maxWidth: '240px' }}>
                  <strong style={{ color: '#be123c', fontSize: '12px' }}>
                    International Maritime Boundary Line (IMBL)
                  </strong><br />
                  <span>Border: <b>India — {country}</b></span><br />
                  <span>Territorial Waters Jurisdiction: <b>{pts[0]?.jurisdiction_nm || 12} NM</b></span><br />
                  <p style={{ marginTop: '5px', fontSize: '10.5px', color: '#475569', lineHeight: '1.4' }}>
                    {pts[0]?.description || `Bilateral maritime delimitation between India and ${country}.`}
                  </p>
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '3px 6px',
                      background: '#f43f5e15',
                      border: '1px solid #f43f5e40',
                      borderRadius: '3px',
                      color: '#be123c',
                      fontWeight: 700,
                      fontSize: '10px'
                    }}
                  >
                    WARNING: Crossing IMBL without international naval clearance is prohibited.
                  </div>
                </div>
              </Popup>
            </Polyline>
          )
        })}

      {/* Active Tropical Cyclone Warning Tracks */}
      {(() => {
        const cycloneTracks = Array.isArray(mapFocusTarget?.cyclones)
          ? mapFocusTarget.cyclones
          : (mapFocusTarget?.cyclones?.tracks || [])
        if (!cycloneTracks || cycloneTracks.length === 0) return null
        const trackPositions = cycloneTracks
          .map((t) => [Number(t.latitude), Number(t.longitude)])
          .filter(([lat, lon]) => !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0)
        if (trackPositions.length === 0) return null

        return (
          <>
            <Polyline
              positions={trackPositions}
              pathOptions={{
                color: '#ef4444',
                weight: 3.5,
                dashArray: '5, 5',
                opacity: 0.95
              }}
            >
              <Tooltip sticky direction="top">
                <span style={{ color: '#ef4444', fontWeight: 700 }}>
                  Cyclone Advisory Track ({cycloneTracks[0]?.name || cycloneTracks[0]?.cycloneId || 'Active Cyclone'})
                </span>
              </Tooltip>
            </Polyline>
            {cycloneTracks
              .filter((_, idx) => idx % 5 === 0 || idx === cycloneTracks.length - 1)
              .map((pt, idx) => (
                <Circle
                  key={`cyc-pt-${idx}`}
                  center={[Number(pt.latitude), Number(pt.longitude)]}
                  radius={18000}
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.35,
                    weight: 2
                  }}
                >
                  <Popup>
                    <div style={{ color: '#0f172a', fontSize: '11.5px' }}>
                      <strong style={{ color: '#dc2626' }}>
                        {pt.name || pt.cycloneId || 'Cyclone Track Point'}
                      </strong><br />
                      <span>Intensity: {pt.intensity || 'Active'}</span><br />
                      <span>Position: {Number(pt.latitude).toFixed(2)}°N, {Number(pt.longitude).toFixed(2)}°E</span><br />
                      <span>Time: {pt.timestamp ? new Date(pt.timestamp).toUTCString() : 'Observed'}</span>
                    </div>
                  </Popup>
                </Circle>
              ))}
          </>
        )
      })()}

      {/* Real-time User Geolocation Position Marker */}
      {userLocation && userLocation.lat && userLocation.lon && (
        <Marker
          position={[Number(userLocation.lat), Number(userLocation.lon)]}
          icon={createUserMarkerIcon()}
          zIndexOffset={1000}
        >
          <Popup className="custom-maritime-popup">
            <div className="popup-title">Current Location</div>
            <div className="popup-detail">
              Detected Position: {Number(userLocation.lat).toFixed(4)}°N, {Number(userLocation.lon).toFixed(4)}°E
            </div>
          </Popup>
          <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
            Your Position ({Number(userLocation.lat).toFixed(3)}°N, {Number(userLocation.lon).toFixed(3)}°E)
          </Tooltip>
        </Marker>
      )}
    </>
  )
}

export default function MapSection({
  harbor,
  safetyData,
  advisories,
  routes,
  restrictedZones,
  maritimeBoundaries,
  selectedRouteId,
  onSelectRoute,
  assessment,
  onOpenAssessment,
  loading,
  hasApiError,
  mapFocusTarget,
  userLocation,
  isMobile = false,
  isUserLocationActive = false,
  hasLiveMarineData = true,
  liveWeather = null
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const layerWaves = true
  const layerPFZ = true
  const layerRoutes = true
  const layerMPA = true
  const layerEEZ = true

  // Close expanded map on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded])

  const hasHarbor = Boolean(harbor && harbor.latitude && harbor.longitude)
  const harborLat = hasHarbor ? Number(harbor.latitude) : 15.0
  const harborLon = hasHarbor ? Number(harbor.longitude) : 76.0
  const harborCoords = [harborLat, harborLon]

  const activeLat = (isUserLocationActive && userLocation?.lat) ? Number(userLocation.lat) : harborLat
  const activeLon = (isUserLocationActive && userLocation?.lon) ? Number(userLocation.lon) : harborLon
  const coords = [activeLat, activeLon]

  const isInland = isUserLocationActive && !hasLiveMarineData
  const locationName = isUserLocationActive && userLocation?.label
    ? userLocation.label
    : (harbor?.landing_center_name || 'Harbor unavailable')

  // Ensure Kerala fallback route and advisory are present when Cochin harbor is active
  const effectiveRoutes = useMemo(() => {
    if (routes && routes.length > 0) return routes
    if (harbor?.harbor_id === 19) return [KERALA_DEMO_ROUTE]
    return []
  }, [routes, harbor])

  const effectiveAdvisories = useMemo(() => {
    if (advisories && advisories.length > 0) return advisories
    if (harbor?.harbor_id === 19) return [KERALA_DEMO_ADVISORY]
    return []
  }, [advisories, harbor])

  const waveHeight = safetyData?.significant_wave_height_m != null ? Number(safetyData.significant_wave_height_m) : null
  const windSpeed = safetyData?.wind_speed_kmph != null ? Number(safetyData.wind_speed_kmph) : null
  const safetyRating = safetyData?.composite_safety_rating || 'SAFE FOR FISHING'
  const hasRouteData = Array.isArray(effectiveRoutes) && effectiveRoutes.length > 0
  const hasZoneData = Array.isArray(restrictedZones) && restrictedZones.length > 0

  // Selected Route or Active Route Object
  const activeRoute = useMemo(() => {
    if (!effectiveRoutes || effectiveRoutes.length === 0) return null
    return effectiveRoutes.find((r) => r.advisory_id === selectedRouteId) || effectiveRoutes[0]
  }, [effectiveRoutes, selectedRouteId])

  // Real-time evaluation of the active route for the map geofence HUD
  const activeViolation = useMemo(() => {
    if (!activeRoute || !restrictedZones || restrictedZones.length === 0) return null
    for (const z of restrictedZones) {
      const check = checkZoneTraverse(harborCoords[0], harborCoords[1], Number(activeRoute.target_lat), Number(activeRoute.target_lon), z)
      if (check.traverses) return z.zone_name
    }
    return activeRoute.violates_restricted_zone ? (activeRoute.intersected_sanctuary || 'Restricted Marine Sanctuary') : null
  }, [activeRoute, restrictedZones, harborCoords])

  const hasSanctuaryViolation = Boolean(activeViolation)
  const isTopCaution = activeRoute?.geofencing_compliance_status?.includes('CAUTION') || activeRoute?.geofencing_compliance_status?.includes('IMBL')

  const complianceStatus = isInland
    ? 'Inland Position Clear'
    : !hasRouteData
    ? 'Route data unavailable'
    : hasSanctuaryViolation
    ? 'Restricted Zone Violation'
    : isTopCaution
    ? 'IMBL Proximity Caution'
    : 'EEZ Clear Route'

  const complianceColor = isInland
    ? '#10b981'
    : !hasRouteData
    ? '#94a3b8'
    : hasSanctuaryViolation
    ? '#ef4444'
    : isTopCaution
    ? '#f59e0b'
    : '#10b981'

  const mapLayerProps = {
    coords,
    harborCoords,
    locationName,
    harbor,
    hasHarbor,
    safetyRating,
    waveHeight,
    windSpeed,
    loading,
    layerWaves,
    layerRoutes,
    routes: effectiveRoutes,
    layerPFZ,
    advisories: effectiveAdvisories,
    layerMPA,
    restrictedZones,
    layerEEZ,
    maritimeBoundaries,
    selectedRouteId,
    onSelectRoute,
    userLocation,
    mapFocusTarget
  }
  const geofenceStatus = !hasRouteData
    ? 'UNAVAILABLE'
    : hasSanctuaryViolation
    ? 'BLOCKED'
    : isTopCaution
    ? 'CAUTION'
    : 'CLEAR'
  const waveImpact = waveHeight == null ? 'NO DATA' : waveHeight > 3 ? 'HAZARD' : waveHeight > 2 ? 'MODERATE' : 'LOW IMPACT'
  const waveImpactTone = waveHeight == null ? 'neutral' : waveHeight > 3 ? 'bad' : waveHeight > 2 ? 'warn' : 'good'
  const windImpact = windSpeed == null ? 'NO DATA' : windSpeed > 45 ? 'GALE' : windSpeed > 30 ? 'MODERATE' : 'FAVORABLE'
  const windImpactTone = windSpeed == null ? 'neutral' : windSpeed > 45 ? 'bad' : windSpeed > 30 ? 'warn' : 'good'

  return (
    <>
      <section className="map-section">
        <div className="map-section__map-wrap">
          <MapContainer
            center={coords}
            zoom={hasHarbor ? 8 : 5}
            scrollWheelZoom={false}
            className="map-section__map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              keepBuffer={1}
              updateWhenIdle={true}
              updateWhenZooming={false}
            />
            <MapCameraController centerLat={activeLat} centerLon={activeLon} focusTarget={mapFocusTarget} />
            <MapInvalidator />
            <MapLayers {...mapLayerProps} />
          </MapContainer>

          {/* Active Target Focus Lock Banner (desktop only) */}
          {!isMobile && mapFocusTarget?.label && (
            <div className="map-radar-lock-banner">
              <span className="radar-lock-ping" />
              <span className="radar-lock-text">{mapFocusTarget.label}</span>
            </div>
          )}

          {/* Floating Frosted Glass Header Overlay on Map (desktop only) */}
          {!isMobile && (
            <div className="map-overlay-header">
              <div className="map-overlay-header__left">
                <div className="map-glass-icon" title="Navigation Radar Telemetry">
                  <IconRadar size={13} color="#35c9e8" />
                </div>
                <span className="map-overlay-header__title">
                  {isInland ? 'Locality radar' : 'Navigation radar'}
                </span>
                <button
                  className="map-section__compliance-pill"
                  style={{
                    color: complianceColor,
                    background: `${complianceColor}18`,
                    borderColor: `${complianceColor}40`,
                    cursor: onOpenAssessment ? 'pointer' : 'default'
                  }}
                  onClick={onOpenAssessment}
                  title="Click to view full operational assessment"
                >
                  {complianceStatus}
                </button>
                <span className="map-overlay-header__station">
                  {locationName}
                </span>
              </div>

              <div className="map-overlay-header__actions">
                <button
                  className="map-section__expand-btn"
                  onClick={() => setIsExpanded(true)}
                  title="Expand map with background blur (Shortcut: M)"
                >
                  <IconMaximize size={13} color="#35c9e8" />
                  <span>Expand</span>
                </button>
                <button
                  className="map-section__route-btn"
                  onClick={() => setModalOpen(true)}
                  title={isInland ? 'View fallback Gujarat maritime routes (Shortcut: R)' : 'Open full Geofence Compliance & Route Verification table (Shortcut: R)'}
                >
                  {isInland ? `Gateway Routes (${routes?.length || 0})` : `Routes (${routes?.length || 0})`}
                </button>
                <div
                  className="map-section__badge"
                  title={`Telemetry node online · Feed: ${assessment?.dataFreshness || 'Live'}`}
                >
                  <span className={`map-section__dot${loading ? ' map-section__dot--pulse' : ''}`} />
                  <span>{loading ? 'Syncing...' : hasApiError ? 'Offline' : 'Live Telemetry'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Floating Geofence & Operational Clearance HUD on Map (desktop only) */}
          {!isMobile && (
            <div className="map-geofence-hud">
              {isInland ? (
                <>
                  <div className="map-geofence-hud__section">
                    <div className="map-geofence-hud__header">
                      <div className="map-geofence-hud__title-wrap">
                        <div className="map-glass-icon map-glass-icon--sm" title="Terrestrial Locality Status">
                          <IconGlobe size={11} color="#35c9e8" />
                        </div>
                        <span className="hud-title">LOCALITY STATUS</span>
                      </div>
                      <span className="hud-badge hud-badge--pass">
                        INLAND REGION
                      </span>
                    </div>
                    <div className="map-geofence-hud__checks">
                      <div className="hud-check">
                        <span className="hud-icon"><CheckPassIcon /></span>
                        <span>Terrain: Non-maritime</span>
                      </div>
                      <div className="hud-check">
                        <span className="hud-icon"><CheckPassIcon /></span>
                        <span>Corridor: Zero boundary limits</span>
                      </div>
                      <div className="hud-check">
                        <span className="hud-icon"><CheckPassIcon /></span>
                        <span>Gateway: {harbor?.landing_center_name || 'Veraval, Gujarat'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="map-geofence-hud__divider" />

                  <div className="map-geofence-hud__section">
                    <div className="map-geofence-hud__header">
                      <div className="map-geofence-hud__title-wrap">
                        <div className="map-glass-icon map-glass-icon--sm" title="Surface Atmospheric Conditions">
                          <IconCompass size={11} color="#35c9e8" />
                        </div>
                        <span className="hud-title">SURFACE WEATHER</span>
                      </div>
                      {onOpenAssessment && (
                        <button className="hud-why-btn" onClick={onOpenAssessment} title="Open Assessment Breakdown">
                          Why?
                        </button>
                      )}
                    </div>
                    <div className="map-geofence-hud__checks">
                      <div className="hud-metric">
                        <span>Temp: <b>{liveWeather?.air_temp_celsius != null ? `${Math.round(liveWeather.air_temp_celsius)}°C` : (safetyData?.air_temp_celsius != null ? `${Math.round(safetyData.air_temp_celsius)}°C` : '--')}</b></span>
                        <span className="hud-metric-pill hud-metric-pill--pass">
                          Normal
                        </span>
                      </div>
                      <div className="hud-metric">
                        <span>Wind: <b>{liveWeather?.wind_speed_kmph != null ? `${Math.round(liveWeather.wind_speed_kmph)} km/h` : (safetyData?.wind_speed_kmph != null ? `${Math.round(safetyData.wind_speed_kmph)} km/h` : '--')}</b></span>
                        <span className="hud-metric-pill hud-metric-pill--pass">
                          Calm
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="map-geofence-hud__section">
                    <div className="map-geofence-hud__header">
                      <div className="map-geofence-hud__title-wrap">
                        <div className="map-glass-icon map-glass-icon--sm" title="Geospatial Satellite Monitoring">
                          <IconGlobe size={11} color="#35c9e8" />
                        </div>
                        <span className="hud-title">GEOSPATIAL STATUS</span>
                      </div>
                      <span className={`hud-badge ${geofenceStatus === 'BLOCKED' ? 'hud-badge--fail' : geofenceStatus === 'UNAVAILABLE' ? 'hud-badge--neutral' : geofenceStatus === 'CAUTION' ? 'hud-badge--warn' : 'hud-badge--pass'}`}>
                        {geofenceStatus}
                      </span>
                    </div>
                    <div className="map-geofence-hud__checks">
                      <div className="hud-check">
                        <span className="hud-icon">{hasRouteData ? <CheckPassIcon /> : <CheckWarnIcon />}</span>
                        <span>EEZ: {hasRouteData ? 'route evaluated' : 'route data required'}</span>
                      </div>
                      <div className="hud-check">
                        <span className="hud-icon">{!hasRouteData || isTopCaution ? <CheckWarnIcon /> : <CheckPassIcon />}</span>
                        <span>IMBL: {!hasRouteData ? 'not evaluated' : isTopCaution ? 'caution' : 'clear'}</span>
                      </div>
                      <div className="hud-check">
                        <span className="hud-icon">{!hasRouteData || !hasZoneData ? <CheckWarnIcon /> : hasSanctuaryViolation ? <CheckFailIcon /> : <CheckPassIcon />}</span>
                        <span>Restricted: {!hasRouteData ? 'not evaluated' : !hasZoneData ? 'zone data required' : hasSanctuaryViolation ? `traverses ${activeViolation}` : 'clear'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="map-geofence-hud__divider" />

                  <div className="map-geofence-hud__section">
                    <div className="map-geofence-hud__header">
                      <div className="map-geofence-hud__title-wrap">
                        <div className="map-glass-icon map-glass-icon--sm" title="Ocean Sensor Feeds">
                          <IconCompass size={11} color="#35c9e8" />
                        </div>
                        <span className="hud-title">OPERATIONAL STATUS</span>
                      </div>
                      {onOpenAssessment && (
                        <button className="hud-why-btn" onClick={onOpenAssessment} title="Open Assessment Breakdown">
                          Why?
                        </button>
                      )}
                    </div>
                    <div className="map-geofence-hud__checks">
                      <div className="hud-metric">
                        <span>Wave: <b>{waveHeight != null ? `${waveHeight.toFixed(1)}m` : '--'}</b></span>
                        <span className={`hud-metric-pill hud-metric-pill--${waveImpactTone}`}>
                          {waveImpact}
                        </span>
                      </div>
                      <div className="hud-metric">
                        <span>Wind: <b>{windSpeed != null ? `${Math.round(windSpeed)} km/h` : '--'}</b></span>
                        <span className={`hud-metric-pill hud-metric-pill--${windImpactTone}`}>
                          {windImpact}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Map Legend (desktop only) */}
          {!isMobile && (
            <div className="map-section__legend">
              <div className="map-legend__header">
                <div className="map-glass-icon map-glass-icon--xs" title="Geospatial Key">
                  <IconLayers size={10} color="#35c9e8" />
                </div>
                <span className="map-section__legend-title">Geospatial Key</span>
              </div>
              <div className="map-legend__grid">
                <div className="map-legend__item">
                  <span className="legend-dot" style={{ background: '#10b981' }} />
                  <span>PFZ Hotspot</span>
                </div>
                <div className="map-legend__item">
                  <span className="legend-line" style={{ borderTop: '3px solid #06b6d4' }} />
                  <span>Recommended Route</span>
                </div>
                <div className="map-legend__item">
                  <span className="legend-line" style={{ borderTop: '2px dashed #94a3b8' }} />
                  <span>Alternative Route</span>
                </div>
                <div className="map-legend__item">
                  <span className="legend-dot" style={{ background: '#f43f5e' }} />
                  <span>Restricted Sanctuary</span>
                </div>
                <div className="map-legend__item">
                  <span className="legend-line" style={{ borderTop: '2px dashed #f59e0b' }} />
                  <span>200 NM EEZ Limit</span>
                </div>
                <div className="map-legend__item">
                  <span className="legend-line" style={{ borderTop: '2px dashed #f43f5e' }} />
                  <span>IMBL Border</span>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Wave Height Gradient Legend at bottom-left */}
          {isMobile && (
            <div className="mobile-wave-legend" aria-label="Wave height scale in meters">
              <span className="mobile-wave-legend__title">Wave Height (m)</span>
              <div className="mobile-wave-legend__bar" />
              <div className="mobile-wave-legend__scale">
                <span>0</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4+</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Expanded Fullscreen Map Overlay with Background Blur */}
      {isExpanded && (
        <div className="map-expanded__portal">
          <div
            className="map-expanded__backdrop"
            onClick={() => setIsExpanded(false)}
          />

          <div className="map-expanded__card">
            {/* Expanded Top Header */}
              <div className="map-expanded__header">
                <div className="map-expanded__header-left">
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="map-expanded__station-tag">
                      {getFormattedHarborTag(harbor)}
                    </span>
                    <span className="map-expanded__locode-badge">
                      {getUNLocode(harbor)}
                    </span>
                  </div>
                  <div>
                    <div className="map-expanded__title-row">
                      <h3 className="map-expanded__title">Geospatial Radar & Tactical Navigation</h3>
                      <button
                        className="map-section__compliance-pill"
                        style={{
                          color: complianceColor,
                          background: `${complianceColor}18`,
                          borderColor: `${complianceColor}40`,
                          cursor: onOpenAssessment ? 'pointer' : 'default'
                        }}
                        onClick={onOpenAssessment}
                      >
                        {complianceStatus}
                      </button>
                    </div>
                    <div className="map-expanded__meta">
                      Departure: <b>{locationName}</b> [{getUNLocode(harbor)} · {harbor?.state || ''}] · Wave: <b>{waveHeight != null ? `${waveHeight}m` : '--'}</b> · Wind: <b>{windSpeed != null ? `${windSpeed} km/h` : '--'}</b>
                    </div>
                  </div>
                </div>

                <div className="map-expanded__header-right">

                  <button
                    className="map-expanded__retract-btn"
                    onClick={() => setIsExpanded(false)}
                    title="Retract map back to dashboard view (Esc)"
                  >
                    <IconMinimize size={13} color="currentColor" />
                    <span>Retract Map</span>
                  </button>
                </div>
              </div>

              {/* Fullscreen Map Viewport */}
              <div className="map-expanded__body">
                <MapContainer
                  center={coords}
                  zoom={9}
                  scrollWheelZoom={true}
                  className="map-expanded__map"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    keepBuffer={1}
                    updateWhenIdle={true}
                    updateWhenZooming={false}
                  />
                  <MapCameraController centerLat={activeLat} centerLon={activeLon} focusTarget={mapFocusTarget} />
                  <MapInvalidator />
                  <MapLayers {...mapLayerProps} />
                </MapContainer>

                {/* Floating Geospatial Key */}
                <div className="map-section__legend map-section__legend--expanded">
                  <div className="map-legend__header">
                    <div className="map-glass-icon map-glass-icon--xs" title="Geospatial Key">
                      <IconLayers size={10} color="#35c9e8" />
                    </div>
                    <span className="map-section__legend-title">Geospatial Key</span>
                  </div>
                  <div className="map-legend__grid">
                    <div className="map-legend__item">
                      <span className="legend-dot" style={{ background: '#10b981' }} />
                      <span>PFZ Hotspot</span>
                    </div>
                    <div className="map-legend__item">
                      <span className="legend-line" style={{ borderTop: '3px solid #06b6d4' }} />
                      <span>Recommended Route</span>
                    </div>
                    <div className="map-legend__item">
                      <span className="legend-line" style={{ borderTop: '2px dashed #94a3b8' }} />
                      <span>Alternative Route</span>
                    </div>
                    <div className="map-legend__item">
                      <span className="legend-dot" style={{ background: '#f43f5e' }} />
                      <span>Restricted Sanctuary</span>
                    </div>
                    <div className="map-legend__item">
                      <span className="legend-line" style={{ borderTop: '2px dashed #f59e0b' }} />
                      <span>200 NM EEZ Limit</span>
                    </div>
                    <div className="map-legend__item">
                      <span className="legend-line" style={{ borderTop: '2px dashed #f43f5e' }} />
                      <span>IMBL Border</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Route Options & Geofence Verification Modal */}
      <DetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        icon={<IconCompass size={18} color="#35c9e8" />}
        title={`Route Options & Compliance Verification — ${locationName} [${getUNLocode(harbor)}]`}
      >
        <div className="modal-grid-stats">
          <div className="modal-stat-box">
            <div className="modal-stat-box__lbl">Route Options</div>
            <div className="modal-stat-box__val" style={{ color: '#35c9e8' }}>
              {routes?.length || 0}
            </div>
          </div>
          <div className="modal-stat-box">
            <div className="modal-stat-box__lbl">Sanctuary / Ban Hazards</div>
            <div
              className="modal-stat-box__val"
              style={{
                color: hasSanctuaryViolation ? '#ef4444' : '#10b981',
              }}
            >
              {routes?.filter(
                (r) =>
                  r.violates_restricted_zone ||
                  r.geofencing_compliance_status?.includes('TRAVERSES') ||
                  r.geofencing_compliance_status?.includes('RESTRICTED') ||
                  r.geofencing_compliance_status?.includes('BAN') ||
                  (restrictedZones &&
                    restrictedZones.some((z) =>
                      checkZoneTraverse(coords[0], coords[1], Number(r.target_lat), Number(r.target_lon), z).traverses
                    ))
              ).length || 0}
            </div>
          </div>

          <div className="modal-stat-box">
            <div className="modal-stat-box__lbl">Boundary Engine</div>
            <div className="modal-stat-box__val" style={{ color: '#1fd1a8', fontSize: '13px' }}>
              200 NM EEZ & UNCLOS
            </div>
          </div>
        </div>

        <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
          Available Sailing Route Candidates (v_geofenced_sailing_route)
        </h4>

        <table className="modal-table">
          <thead>
            <tr>
              <th>Target Species</th>
              <th>Bearing</th>
              <th>Distance</th>
              <th>ETA (12 kt)</th>
              <th>Compliance Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {routes && routes.length > 0 ? (
              routes.slice(0, 15).map((r, idx) => {
                const isC = r.geofencing_compliance_status?.includes('CAUTION')
                const isW = r.geofencing_compliance_status?.includes('WARNING')
                const isV = r.violates_restricted_zone || r.geofencing_compliance_status?.includes('TRAVERSES')
                const badgeColor = isV || isW ? '#ef4444' : isC ? '#f59e0b' : '#10b981'
                const isSelected = r.advisory_id === selectedRouteId || (!selectedRouteId && idx === 0)

                return (
                  <tr key={r.advisory_id || idx} style={{ background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'transparent' }}>
                    <td><b>{r.target_species}</b></td>
                    <td>{r.bearing_compass}</td>
                    <td>{r.distance_nm} NM ({r.distance_km} km)</td>
                    <td><b>{calculateETA(r.distance_nm)}</b></td>
                    <td>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: `${badgeColor}18`,
                          color: badgeColor,
                          border: `1px solid ${badgeColor}40`,
                        }}
                      >
                        {isV ? 'RESTRICTED VIOLATION' : r.geofencing_compliance_status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`route-select-row-btn ${isSelected ? 'route-select-row-btn--active' : ''}`}
                        onClick={() => {
                          if (onSelectRoute) onSelectRoute(r.advisory_id)
                          setModalOpen(false)
                        }}
                      >
                        {isSelected ? 'Active' : 'Select'}
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan="6">No active sailing route candidates registered for this harbor</td>
              </tr>
            )}
          </tbody>
        </table>
      </DetailModal>
    </>
  )
}
