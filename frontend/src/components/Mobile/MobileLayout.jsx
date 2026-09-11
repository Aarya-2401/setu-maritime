import { useState, useEffect, useMemo, useRef } from 'react'
import MapSection from '../MapSection/MapSection'
import {
  IconLocation,
  IconChevronDown,
  IconCloud,
  IconWind,
  IconWave,
  IconTide,
  IconSun,
  IconSend,
  IconHome,
  IconMap,
  IconBell,
  IconMessageSquare,
  IconShield,
  IconCompass,
  IconMaximize,
  IconMinimize
} from '../Icons'
import DetailModal from '../Modal/DetailModal'
import { detectInlandLocation } from '../../data/inlandDetector'
import { askOrcaAI } from '../../services/aiService'
import { executeMapIntent } from '../../utils/mapIntentExecutor'
import { QUICK_PROMPTS } from '../../data/mockData'
import { calculateETA } from '../../data/decisionLogic'
import { getUNLocode, getFormattedHarborTag } from '../../data/harborCodes'
import './MobileLayout.css'

const WIND_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function degToCompass(deg) {
  if (deg == null) return 'Direction unavailable'
  const idx = Math.round(deg / 45) % 8
  return WIND_DIRS[idx]
}

function getBeaufortScale(kmph) {
  if (kmph == null || kmph === '--' || isNaN(kmph)) return null
  const speed = Number(kmph)
  if (speed < 1) return { num: 0, desc: 'Calm', effect: 'Sea like a mirror' }
  if (speed <= 5) return { num: 1, desc: 'Light air', effect: 'Ripples with appearance of scales' }
  if (speed <= 11) return { num: 2, desc: 'Light breeze', effect: 'Small wavelets, crests glassy' }
  if (speed <= 19) return { num: 3, desc: 'Gentle breeze', effect: 'Large wavelets, scattered whitecaps' }
  if (speed <= 28) return { num: 4, desc: 'Moderate breeze', effect: 'Small waves, fairly frequent whitecaps' }
  if (speed <= 38) return { num: 5, desc: 'Fresh breeze', effect: 'Moderate waves, many whitecaps' }
  if (speed <= 49) return { num: 6, desc: 'Strong breeze', effect: 'Large waves, extensive white foam crests' }
  return { num: 7, desc: 'High wind / Gale', effect: 'Sea heaps up, white foam streaks' }
}

function formatTideTime(dtStr) {
  if (!dtStr) return '--'
  try {
    const d = new Date(dtStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return dtStr
  }
}

function formatTideDate(dtStr) {
  if (!dtStr) return '--'
  try {
    const d = new Date(dtStr)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return dtStr
  }
}

function getMessageUUID() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
}

function formatCurrentTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatCurrentDate(date) {
  const day = date.getDate()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, marginTop: '2px' }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function MobileLayout({
  harbor,
  harbors,
  onSelectHarbor,
  onSelectUserLocation,
  onSetInlandLocation,
  onDisengageInland,
  isUserLocationActive = false,
  userLocationTag,
  hasLiveMarineData = true,
  liveWeather = null,
  safetyData,
  safetyHistory,
  assessment,
  operationalStatus,
  dashboardContext = 'HARBOR_TELEMETRY',
  queryTarget = null,
  cardUpdates = [],
  onOpenAssessment,
  loading,
  hasApiError,
  tides,
  tideMeta,
  advisories,
  routes,
  restrictedZones,
  maritimeBoundaries,
  selectedRouteId,
  onSelectRoute,
  mapFocusTarget,
  userLocation,
  messages,
  onAddMessage,
  onTriggerKeralaDemo,
  onMapFocus,
  onUpdateDynamicAdvisories,
  onUpdateDynamicZones,
  onUpdateDashboardIntent,
  onUpdateCardUpdates,
  onUpdateQueryTarget
}) {
  const [activeNav, setActiveNav] = useState('home')
  const [activeModal, setActiveModal] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [showCopilotCard, setShowCopilotCard] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const chatScrollRef = useRef(null)
  const inputRef = useRef(null)

  // Live ticking clock for dynamic time and date
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-scroll chat messages container when new message arrives or typing changes
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages, typing])

  // Group harbors by coastal state for the native selection overlay
  const groupedHarbors = useMemo(() => {
    if (!harbors || harbors.length === 0) return {}
    const groups = {}
    harbors.forEach((h) => {
      const stateName = h.state || 'Other Maritime Zones'
      if (!groups[stateName]) groups[stateName] = []
      groups[stateName].push(h)
    })
    return groups
  }, [harbors])

  // Determine current display location text
  const locationText = useMemo(() => {
    if (isUserLocationActive && userLocation?.label) return userLocation.label
    if (harbor?.landing_center_name && harbor?.state) {
      return `${harbor.landing_center_name}, ${harbor.state}`
    }
    if (harbor?.landing_center_name) return harbor.landing_center_name
    return 'Jaipur, Rajasthan'
  }, [isUserLocationActive, userLocation, harbor])

  // Telemetry metric formatting
  const locationName = isUserLocationActive && userLocation?.label
    ? userLocation.label
    : (harbor?.landing_center_name || 'Coastal Station')
  const airTemp = safetyData?.air_temp_celsius != null ? Math.round(safetyData.air_temp_celsius) : null
  const tempVal = airTemp != null ? `${airTemp} °C` : '-- °C'
  const displayTempVal = airTemp != null ? `${airTemp} °C` : (liveWeather?.temp != null ? `${Math.round(liveWeather.temp)} °C` : '26 °C')
  const pressureVal = safetyData?.surface_pressure_hpa != null ? `${Number(safetyData.surface_pressure_hpa).toFixed(0)} hPa` : '-- hPa'
  const visibilityVal = safetyData?.visibility_km != null ? `${Number(safetyData.visibility_km).toFixed(1)} km` : '-- km'

  const windSpeedKmph = safetyData?.wind_speed_kmph != null ? Math.round(safetyData.wind_speed_kmph) : null
  const windKnots = windSpeedKmph != null ? Math.round(windSpeedKmph * 0.539957) : null
  const windDisplay = windKnots != null ? `${windKnots} kn` : (windSpeedKmph != null ? `${Math.round(windSpeedKmph * 0.54)} kn` : '8 kn')
  const windVal = windSpeedKmph != null ? `${windSpeedKmph} km/h` : '--'
  const gustsMps = safetyData?.wind_gust_mps
  const gustsKmph = gustsMps != null ? Math.round(gustsMps * 3.6) : null
  const gustsText = gustsKmph != null ? `${gustsKmph} km/h` : '--'
  const windRotation = safetyData?.wind_direction_deg != null ? Number(safetyData.wind_direction_deg) : null
  const beaufort = windSpeedKmph != null ? getBeaufortScale(windSpeedKmph) : null

  const waveHeight =
    safetyData?.significant_wave_height_m != null
      ? Number(safetyData.significant_wave_height_m).toFixed(1)
      : null
  const waveVal = waveHeight != null ? `${waveHeight} m` : '-- m'
  const displayWaveVal = waveHeight != null ? `${waveHeight} m` : (currentTideHeight != null ? `${currentTideHeight.toFixed(1)} m` : '1.3 m')
  const swell = safetyData?.swell_wave_height_m != null ? Number(safetyData.swell_wave_height_m) : null
  const seaState = safetyData?.wmo_sea_state_desc || '--'

  // Tide telemetry
  const highTide = tides && tides.length > 0
    ? tides.filter((t) => t.tide_phase === 'HIGH' || t.tide_phase === 'H')[0] ||
      tides.reduce((a, b) => (Number(b.tide_height_meters) > Number(a.tide_height_meters) ? b : a))
    : null

  const lowTide = tides && tides.length > 0
    ? tides.filter((t) => t.tide_phase === 'LOW' || t.tide_phase === 'L')[0] ||
      tides.reduce((a, b) => (Number(b.tide_height_meters) < Number(a.tide_height_meters) ? b : a))
    : null

  const currentTideHeight = tides && tides.length > 0 ? Number(tides[0].tide_height_meters) : null
  const tideVal = currentTideHeight != null ? `${currentTideHeight.toFixed(1)} m` : '-- m'
  const upcomingEvent = safetyData?.upcoming_tide_event || '--'
  const isReference = Boolean(tideMeta?.isReferenceStation)
  const referencePort = tideMeta?.referencePortName || (tides && tides.length > 0 ? tides[0].port_name : '')
  const distanceKm = tideMeta?.distanceKm

  const timeVal = formatCurrentTime(currentTime)
  const dateVal = formatCurrentDate(currentTime)

  // Auto-focus chat input when switching to chat tab
  useEffect(() => {
    if (activeNav === 'chat') {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [activeNav])

  // Assessment and Safety Factors Resolution for Alerts View
  const assessmentStatus = assessment?.status || 'SAFE'
  const decisionLabel = assessment?.decisionLabel || 'SAFE TO DEPART'
  const statusColor =
    assessmentStatus === 'DANGER'
      ? '#ef4444'
      : assessmentStatus === 'CAUTION'
      ? '#f59e0b'
      : '#10b981'

  const directiveText =
    assessment?.actionableDirective ||
    (assessmentStatus === 'SAFE'
      ? 'All ocean and regulatory checks are satisfied. Safe for coastal departure and operations.'
      : assessmentStatus === 'CAUTION'
      ? 'Elevated wave swell or boundary proximity detected. Exercise caution and verify route coordinates.'
      : 'Severe maritime hazard or sanctuary boundary breach detected. Hold departure until conditions clear.')

  const selectedRoute = assessment?.selectedRoute || (routes && routes.length > 0 ? routes[0] : null)
  const locode = harbor ? getUNLocode(harbor) : 'UN/LOCODE'
  const harborTag = harbor ? getFormattedHarborTag(harbor) : 'HAR-01'

  const activePFZ = selectedRoute || (advisories && advisories.length > 0 ? advisories[0] : null)
  const isCurrentlyInland = isUserLocationActive && assessment?.isUserLocation
  const hasRecommendation = isCurrentlyInland || Boolean(activePFZ && safetyData)
  const recommendationState = isCurrentlyInland
    ? 'INLAND POSITION CLEAR'
    : assessment?.status === 'SAFE'
    ? 'ROUTE AUTHORIZED'
    : assessment?.status === 'CAUTION'
    ? 'ROUTE CAUTION'
    : assessment?.status === 'DANGER'
    ? 'ROUTE RESTRICTED'
    : hasApiError
    ? 'DATA UNAVAILABLE'
    : 'ASSESSMENT PENDING'

  const hasConversation = messages && messages.some((m) => m.role === 'user' || m.role === 'assistant')

  const rawFactors = assessment?.factors || []
  const oceanFactors = useMemo(() => {
    const list = rawFactors.filter((f) => f.category === 'OPERATIONAL_OCEAN')
    if (list.length > 0) return list
    return [
      {
        name: 'Significant Wave Height',
        value: safetyData?.significant_wave_height_m != null ? `${Number(safetyData.significant_wave_height_m).toFixed(1)} m` : (waveVal !== '-- m' ? waveVal : '1.3 m'),
        threshold: '< 2.0 m (Safe Envelope)',
        state: Number(safetyData?.significant_wave_height_m || 1.3) > 2.0 ? 'CAUTION' : 'PASS',
        tone: Number(safetyData?.significant_wave_height_m || 1.3) > 2.0 ? 'moderate' : 'good'
      },
      {
        name: 'Sustained Surface Wind',
        value: safetyData?.wind_speed_kmph != null ? `${Math.round(safetyData.wind_speed_kmph)} km/h` : (windVal !== '-- kn' ? windVal : '8 km/h'),
        threshold: '< 30 km/h (Normal Sailing)',
        state: Number(safetyData?.wind_speed_kmph || 8) > 30 ? 'CAUTION' : 'PASS',
        tone: Number(safetyData?.wind_speed_kmph || 8) > 30 ? 'moderate' : 'good'
      },
      {
        name: 'Atmospheric Visibility',
        value: safetyData?.visibility_km != null ? `${Number(safetyData.visibility_km).toFixed(1)} km` : '10.0 km',
        threshold: '> 5.0 km (Optimal Line of Sight)',
        state: 'PASS',
        tone: 'good'
      },
      {
        name: 'Tidal & Sea State',
        value: safetyData?.wmo_sea_state_desc || 'Moderate',
        threshold: 'Operable Coastal Envelope',
        state: 'PASS',
        tone: 'good'
      }
    ]
  }, [rawFactors, safetyData, waveVal, windVal])

  const geoFactors = useMemo(() => {
    const list = rawFactors.filter((f) => f.category === 'GEOSPATIAL_REGULATORY')
    if (list.length > 0) return list
    return [
      {
        name: 'Indian Sovereign EEZ',
        value: 'Inside Indian EEZ',
        threshold: '< 200 NM Indian EEZ Limit',
        state: 'PASS',
        tone: 'good'
      },
      {
        name: 'International Boundary (IMBL)',
        value: 'Safe Buffer (> 12 NM)',
        threshold: 'Clear of Sovereign Boundary Line',
        state: 'PASS',
        tone: 'good'
      },
      {
        name: 'Marine Sanctuary Geofence',
        value: 'Zero Sanctuary Overlap',
        threshold: 'Avoid Marine Protected Habitats',
        state: 'PASS',
        tone: 'good'
      }
    ]
  }, [rawFactors])

  const DEFAULT_MOBILE_CHIPS = [
    'Fish near Kerala tomorrow',
    'Nearest PFZ',
    'Tide now',
    'Weather tomorrow',
    'Alerts'
  ]

  // Suggestion pills resolution: inland suggestions if present on last assistant message, else default reference pills
  const activeSuggestions = useMemo(() => {
    if (messages && messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg?.role === 'assistant' && Array.isArray(lastMsg.suggestions) && lastMsg.suggestions.length > 0) {
        return lastMsg.suggestions.slice(0, 5)
      }
    }
    return DEFAULT_MOBILE_CHIPS
  }, [messages])

  const mobilePreviousMapIntentRef = useRef(null)

  // Unified message sender for both typed input and suggestion pills
  async function handleSendMessage(text) {
    const trimmed = (text || '').trim()
    if (!trimmed || typing) return

    const userMsg = {
      id: getMessageUUID(),
      role: 'user',
      text: trimmed,
      time: formatCurrentTime(new Date())
    }
    onAddMessage(userMsg)
    setChatInput('')
    setTyping(true)

    const context = {
      selectedHarborId: harbor?.harbor_id,
      previousMapIntent: mobilePreviousMapIntentRef.current,
      previousLocation: harbor ? {
        name: harbor.landing_center_name,
        latitude: Number(harbor.latitude),
        longitude: Number(harbor.longitude)
      } : undefined
    }

    try {
      const aiResponse = await askOrcaAI(trimmed, context)
      if (aiResponse && aiResponse.success && aiResponse.answer) {
        const effectiveIntent = aiResponse.mapIntent || aiResponse.mapUpdate || { action: 'PRESERVE' }
        mobilePreviousMapIntentRef.current = effectiveIntent
        executeMapIntent(effectiveIntent, aiResponse, {
          onSelectHarbor,
          onMapFocus,
          onSetInlandLocation,
          onSelectUserLocation,
          onDisengageInland,
          onUpdateDynamicAdvisories,
          onUpdateDynamicZones,
          onUpdateDashboardIntent,
          onUpdateCardUpdates,
          onUpdateQueryTarget
        })

        const reply = {
          id: getMessageUUID(),
          role: 'assistant',
          text: aiResponse.answer,
          time: formatCurrentTime(new Date()),
          suggestions: aiResponse.suggestions || []
        }
        onAddMessage(reply)
        setTyping(false)
        return
      }
    } catch (err) {
      console.warn('AI endpoint unavailable, using local maritime fallback:', err?.message || err)
    }

    // Local fallback reply
    setTimeout(() => {
      const harborName = harbor?.landing_center_name || 'your harbor'
      const isSafe = (safetyData?.composite_safety_rating || '').toUpperCase().includes('SAFE')
      const pfzTop = advisories && advisories.length > 0 ? advisories[0] : null
      const pfzInfo = pfzTop
        ? `INCOIS has mapped productive fishing zones roughly ${pfzTop.distance_km} km offshore targeting ${pfzTop.target_species}`
        : `no severe weather advisories are reported in this coastal sector`

      const replyText = isSafe
        ? `Conditions look favorable for heading out near ${harborName} tomorrow. The sea state and surface winds are comfortable, and ${pfzInfo}.`
        : `I recommend exercising caution or holding off on departures near ${harborName} tomorrow due to elevated coastal conditions.`

      const reply = {
        id: getMessageUUID(),
        role: 'assistant',
        text: replyText,
        time: formatCurrentTime(new Date()),
        suggestions: ['Is it safe to depart?', 'Recommended route', 'Nearest PFZ']
      }
      onAddMessage(reply)
      setTyping(false)
    }, 450)
  }

  function handleFormSubmit(e) {
    e.preventDefault()
    handleSendMessage(chatInput)
  }

  return (
    <div className={`mobile-layout mobile-layout--${activeNav}`}>
      {/* 1. Branded Top Header Row (Matching Reference Design) */}
      <header className="mobile-header">
        <div className="mobile-header__brand" title="SETU-ADAM01 Maritime Intelligence" onClick={() => setActiveNav('home')}>
          <img
            src="/favicon-512x512.png"
            alt="SETU"
            className="mobile-header__logo"
          />
          <span className="mobile-header__title">SETU-ADAM01</span>
        </div>

        <div className="mobile-header__location-pill" title="Tap to select location">
          <IconLocation size={12} color="#38bdf8" />
          <span className="mobile-header__location-text">
            {locationText}
          </span>
          <IconChevronDown size={8} color="#38bdf8" />

          {/* Native select overlay for modal-free harbor and user location selection */}
          <select
            className="mobile-header__select-overlay"
            value={isUserLocationActive ? 'user_location' : (harbor?.harbor_id || '')}
            onChange={(e) => {
              if (e.target.value === 'user_location') {
                if (onSelectUserLocation) onSelectUserLocation()
              } else {
                onSelectHarbor(Number(e.target.value))
              }
            }}
            aria-label="Select harbor or user location"
          >
            {userLocation?.city && (
              <optgroup label="USER DETECTED LOCATION">
                <option value="user_location">
                  {userLocationTag} — {userLocation.label} (Current Position)
                </option>
              </optgroup>
            )}
            {Object.keys(groupedHarbors).length > 0 ? (
              Object.entries(groupedHarbors).map(([stateName, list]) => (
                <optgroup key={stateName} label={`${stateName.toUpperCase()} (${list.length})`}>
                  {list.map((h) => (
                    <option key={h.harbor_id} value={h.harbor_id}>
                      {h.landing_center_name}, {h.state}
                    </option>
                  ))}
                </optgroup>
              ))
            ) : (
              <option value={harbor?.harbor_id || ''}>
                {harbor ? `${harbor.landing_center_name}, ${harbor.state}` : 'Loading harbors...'}
              </option>
            )}
          </select>
        </div>
      </header>

      {/* 2. Top 4 Telemetry Information Capsules: Weather, Wind/Wave, Tide/Wave, Time */}
      {activeNav === 'home' && (
        <section className="mobile-telemetry-capsules" aria-label="Key Maritime Telemetry">
          <button
            type="button"
            className="mobile-telemetry-capsule"
            onClick={() => setActiveModal('weather')}
            title="Air Temperature & Weather Details"
            aria-label="View Weather Details"
          >
            <div className="mobile-capsule-row">
              <span className="mobile-capsule-icon">
                <IconCloud size={14} color="#38bdf8" />
              </span>
              <span className="mobile-capsule-val">{displayTempVal}</span>
            </div>
            <span className="mobile-capsule-lbl">Air Temp</span>
          </button>

          <button
            type="button"
            className="mobile-telemetry-capsule"
            onClick={() => setActiveModal('wind')}
            title="Wind Speed & Surface Dynamics"
            aria-label="View Wind Details"
          >
            <div className="mobile-capsule-row">
              <span className="mobile-capsule-icon">
                <IconWind size={14} color="#38bdf8" />
              </span>
              <span className="mobile-capsule-val">{windDisplay}</span>
            </div>
            <span className="mobile-capsule-lbl">Wind Speed</span>
          </button>

          <button
            type="button"
            className="mobile-telemetry-capsule"
            onClick={() => setActiveModal(hasLiveMarineData ? 'waves' : 'weather')}
            title="Wave Height & Maritime Conditions"
            aria-label="View Wave Details"
          >
            <div className="mobile-capsule-row">
              <span className="mobile-capsule-icon">
                <IconWave size={14} color="#38bdf8" />
              </span>
              <span className="mobile-capsule-val">{displayWaveVal}</span>
            </div>
            <span className="mobile-capsule-lbl">Wave Height</span>
          </button>

          <button
            type="button"
            className="mobile-telemetry-capsule"
            title="Operational Maritime Clock"
            aria-label="Current Local Time"
          >
            <div className="mobile-capsule-row">
              <span className="mobile-capsule-icon">
                <IconSun size={14} color="#38bdf8" />
              </span>
              <span className="mobile-capsule-val">{timeVal}</span>
            </div>
            <span className="mobile-capsule-lbl">{dateVal}</span>
          </button>
        </section>
      )}

      {/* 2. Live Map Section (Map First on Home and Maximized on Map Tab) */}
      <section
        className={`mobile-map-section ${activeNav === 'map' ? 'mobile-map-section--maximized mobile-tab-view' : ''}`}
        id="mobile-map-section"
        aria-label="Live Maritime Map"
      >
        <div className="mobile-map-header">
          <div className="mobile-map-header__titles">
            <h3 className="mobile-map-title">
              {activeNav === 'map' ? 'Expanded Maritime Chart' : 'Live Map'}
            </h3>
            <p className="mobile-map-subtitle">
              {hasLiveMarineData
                ? `Wind · Waves · Fishing zones near ${locationText}`
                : `Weather · Surface Winds · Radar near ${locationText}`}
            </p>
          </div>
          <div className="mobile-map-header__actions">
            <div className="mobile-live-badge">
              <span className="mobile-live-dot" />
              <span className="mobile-live-text">Live</span>
            </div>
            {activeNav === 'home' ? (
              <button
                type="button"
                className="mobile-expand-btn"
                onClick={() => setActiveNav('map')}
                title="Expand Map to full screen"
                aria-label="Expand Map"
              >
                <IconMaximize size={13} color="#38bdf8" />
              </button>
            ) : (
              <button
                type="button"
                className="mobile-expand-btn"
                onClick={() => setActiveNav('home')}
                title="Return to Home Overview"
                aria-label="Minimize Map"
              >
                <IconMinimize size={13} color="#38bdf8" />
              </button>
            )}
          </div>
        </div>

        <div className={`mobile-map-card ${activeNav === 'map' ? 'mobile-map-card--expanded' : ''}`}>
          <MapSection
            harbor={harbor}
            harbors={harbors}
            onSelectHarbor={onSelectHarbor}
            safetyData={safetyData}
            advisories={advisories}
            routes={routes}
            restrictedZones={restrictedZones}
            maritimeBoundaries={maritimeBoundaries}
            selectedRouteId={selectedRouteId || assessment?.selectedRoute?.advisory_id}
            onSelectRoute={onSelectRoute}
            assessment={assessment}
            onOpenAssessment={() => setActiveNav('alerts')}
            loading={loading}
            hasApiError={hasApiError}
            mapFocusTarget={mapFocusTarget}
            userLocation={userLocation}
            isUserLocationActive={isUserLocationActive}
            hasLiveMarineData={hasLiveMarineData}
            liveWeather={liveWeather}
            isMobile={true}
          />
        </div>
      </section>

      {/* Dedicated Mobile Alerts & Departure Assessment View */}
      {activeNav === 'alerts' && (
        <section className="mobile-tab-view mobile-alerts-view" aria-label="Departure & Route Assessment">
          <div className="mobile-alerts-header">
            <div className="mobile-alerts-header__title-wrap">
              <span className="mobile-alerts-header__icon" style={{ borderColor: statusColor }}>
                <IconShield size={16} color={statusColor} />
              </span>
              <div>
                <h3 className="mobile-alerts-header__title">Departure Assessment</h3>
                <span className="mobile-alerts-header__sub">
                  {locationText} [{isUserLocationActive ? 'YOU · INLAND' : `UN/LOCODE: ${locode}`}]
                </span>
              </div>
            </div>
            <div className="mobile-alerts-status-pill" style={{ borderColor: statusColor, color: statusColor }}>
              <span className="mobile-alerts-status-dot" style={{ backgroundColor: statusColor }} />
              <span>{assessmentStatus}</span>
            </div>
          </div>

          {/* Hero Decision Banner */}
          <div className="mobile-alerts-banner" style={{ borderColor: statusColor }}>
            <div className="mobile-alerts-banner__top">
              <span className="mobile-alerts-banner__decision" style={{ color: statusColor }}>
                {decisionLabel}
              </span>
              <span className="mobile-alerts-banner__badge">Feed: Live Nowcast</span>
            </div>
            <p className="mobile-alerts-banner__directive">
              {directiveText}
            </p>
          </div>

          {/* Route & ETA Card */}
          {selectedRoute && (
            <div className="mobile-alerts-route-card">
              <div className="mobile-alerts-route-top">
                <IconCompass size={14} color="#38bdf8" />
                <span className="mobile-alerts-route-name">
                  {selectedRoute.route_name || selectedRoute.advisory_id || 'Active Transit Corridor'}
                </span>
              </div>
              <div className="mobile-alerts-route-grid">
                <div className="mobile-alerts-route-item">
                  <span className="mobile-alerts-route-label">Target Area</span>
                  <span className="mobile-alerts-route-val">{selectedRoute.target_area_name || 'Offshore Fishing Sector'}</span>
                </div>
                <div className="mobile-alerts-route-item">
                  <span className="mobile-alerts-route-label">Distance</span>
                  <span className="mobile-alerts-route-val">{selectedRoute.distance_nm ? `${selectedRoute.distance_nm} NM` : '--'}</span>
                </div>
                <div className="mobile-alerts-route-item">
                  <span className="mobile-alerts-route-label">Estimated Transit</span>
                  <span className="mobile-alerts-route-val">{calculateETA(selectedRoute.distance_nm)}</span>
                </div>
                <div className="mobile-alerts-route-item">
                  <span className="mobile-alerts-route-label">Boundary Status</span>
                  <span className="mobile-alerts-route-val mobile-alerts-route-val--good">Compliant Corridor</span>
                </div>
              </div>
            </div>
          )}

          {/* Operational Oceanographic Factors */}
          <div className="mobile-alerts-section-title">
            <IconWave size={14} color="#38bdf8" />
            <span>Operational Ocean Factors</span>
          </div>
          <div className="mobile-alerts-factors-list">
            {oceanFactors.map((f, idx) => (
              <div key={idx} className="mobile-alerts-factor-row">
                <div className="mobile-alerts-factor-info">
                  <span className="mobile-alerts-factor-name">{f.name}</span>
                  <span className="mobile-alerts-factor-threshold">Threshold: {f.threshold}</span>
                </div>
                <div className="mobile-alerts-factor-right">
                  <span className="mobile-alerts-factor-value">{f.value}</span>
                  <span className={`mobile-factor-badge mobile-factor-badge--${f.tone}`}>
                    {f.state}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Geospatial & Regulatory Compliance */}
          <div className="mobile-alerts-section-title">
            <IconShield size={14} color="#38bdf8" />
            <span>Geospatial & Marine Sanctuary Compliance</span>
          </div>
          <div className="mobile-alerts-factors-list">
            {geoFactors.map((f, idx) => (
              <div key={idx} className="mobile-alerts-factor-row">
                <div className="mobile-alerts-factor-info">
                  <span className="mobile-alerts-factor-name">{f.name}</span>
                  <span className="mobile-alerts-factor-threshold">Rule: {f.threshold}</span>
                </div>
                <div className="mobile-alerts-factor-right">
                  <span className="mobile-alerts-factor-value">{f.value}</span>
                  <span className={`mobile-factor-badge mobile-factor-badge--${f.tone}`}>
                    {f.state}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="mobile-alerts-actions">
            <button
              type="button"
              className="mobile-alerts-action-btn mobile-alerts-action-btn--primary"
              onClick={() => setActiveNav('map')}
            >
              <IconMap size={15} color="#04121a" />
              <span>View Route on Live Map</span>
            </button>
            <button
              type="button"
              className="mobile-alerts-action-btn mobile-alerts-action-btn--secondary"
              onClick={() => setActiveNav('chat')}
            >
              <IconMessageSquare size={15} color="#38bdf8" />
              <span>Ask SETU Copilot</span>
            </button>
          </div>
        </section>
      )}

      {/* 5. SETU Chatbot Section (Kept mounted for Home and Chat tabs to preserve message history) */}
      <section
        className={`mobile-chat-section ${activeNav === 'chat' ? 'mobile-chat-section--maximized mobile-tab-view' : ''}`}
        id="mobile-chat-section"
        aria-label="SETU Maritime Assistant"
      >
        <div className={`mobile-chat-card ${activeNav === 'chat' ? 'mobile-chat-card--maximized' : ''}`}>
          <div className="mobile-chat-header">
            <div className="mobile-chat-identity">
              <span className="mobile-chat-title">SETU</span>
              <span className="mobile-chat-sep">/</span>
              <span className="mobile-chat-subtitle">Adam-01</span>
            </div>
            <div className="mobile-chat-header__actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className={`copilot-toggle-btn ${showCopilotCard ? 'copilot-toggle-btn--active' : ''}`}
                onClick={() => setShowCopilotCard((prev) => !prev)}
                title={showCopilotCard ? 'Hide Navigation Briefing Box' : 'Show Navigation Briefing Box'}
                aria-expanded={showCopilotCard}
              >
                <span className="copilot-toggle-dot" />
                <span>{showCopilotCard ? 'AUTO BRIEFING · ON' : 'AUTO BRIEFING · OFF'}</span>
              </button>
              {activeNav === 'home' ? (
                <button
                  type="button"
                  className="mobile-expand-btn"
                  onClick={() => setActiveNav('chat')}
                  title="Maximize Chat to full screen"
                  aria-label="Maximize Chat"
                >
                  <IconMaximize size={13} color="#38bdf8" />
                </button>
              ) : (
                <button
                  type="button"
                  className="mobile-expand-btn"
                  onClick={() => setActiveNav('home')}
                  title="Return to Home Overview"
                  aria-label="Minimize Chat"
                >
                  <IconMinimize size={13} color="#38bdf8" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Decision Briefing Box Overlaid Directly over the Chatbox with No Layout Shift */}
          {showCopilotCard && (
            <div className="mobile-briefing-overlay" role="region" aria-label="Navigation Copilot Auto Briefing">
              <div className="mobile-briefing-overlay__header">
                <div className="mobile-briefing-overlay__brand">
                  <span className="mobile-briefing-overlay__badge">NAV COPILOT</span>
                  <span className={`mobile-briefing-overlay__status mobile-briefing-overlay__status--${assessment?.tone || 'good'}`}>
                    ● {recommendationState}
                  </span>
                </div>
                <button
                  type="button"
                  className="mobile-briefing-overlay__close-btn"
                  onClick={() => setShowCopilotCard(false)}
                  aria-label="Close Navigation Briefing"
                >
                  Close
                </button>
              </div>

              <div className="mobile-briefing-overlay__body">
                {isCurrentlyInland ? (
                  <>
                    <div className="mobile-briefing-overlay__position">
                      <span className="mobile-briefing-overlay__pos-label">Position:</span>
                      <span className="mobile-briefing-overlay__pos-val">{userLocation?.label || 'User Location'}</span>
                      <span className="mobile-briefing-overlay__pos-tag">YOU (Inland)</span>
                    </div>

                    <div className="mobile-briefing-overlay__target">
                      <strong>Terrestrial Zone: Clear Operational Profile</strong>
                      <span> — Gateway: {harbor?.landing_center_name || 'Veraval Fishing Harbor, Gujarat'}</span>
                    </div>

                    <div className="mobile-briefing-overlay__why">
                      <div className="mobile-briefing-overlay__why-title">Why this assessment?</div>
                      <ul className="mobile-briefing-overlay__why-list">
                        <li>
                          <CheckIcon />
                          <span>Zero maritime EEZ, IMBL, or coral sanctuary restrictions at this coordinate</span>
                        </li>
                        <li>
                          <CheckIcon />
                          <span>Surface wind: {safetyData?.wind_speed_kmph != null ? `${Math.round(safetyData.wind_speed_kmph)} km/h` : 'calm'}</span>
                        </li>
                        <li>
                          <CheckIcon />
                          <span>Air temp: {safetyData?.air_temp_celsius != null ? `${Math.round(safetyData.air_temp_celsius)} °C` : '--'} · Visibility: {safetyData?.visibility_km != null ? `${Number(safetyData.visibility_km).toFixed(1)} km` : 'optimal'}</span>
                        </li>
                        <li>
                          <CheckIcon />
                          <span>Maritime telemetry referenced to coastal hub: {harbor?.landing_center_name || 'Veraval'}</span>
                        </li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mobile-briefing-overlay__position">
                      <span className="mobile-briefing-overlay__pos-label">Terminal:</span>
                      <span className="mobile-briefing-overlay__pos-val">{harbor?.landing_center_name || 'Harbor unavailable'}</span>
                      <span className="mobile-briefing-overlay__pos-tag">{harbor ? getUNLocode(harbor) : '--'}</span>
                    </div>

                    <div className="mobile-briefing-overlay__target">
                      <strong>{activePFZ ? `PFZ-${activePFZ.advisory_id?.slice(-4) || 'ZONE'}` : 'Recommendation pending'}</strong>
                      {activePFZ && <span> — {activePFZ.target_species || 'Target species not provided'}</span>}
                    </div>

                    <div className="mobile-briefing-overlay__why">
                      <div className="mobile-briefing-overlay__why-title">{hasRecommendation ? 'Why this recommendation?' : 'Data status'}</div>
                      {hasRecommendation ? (
                        <ul className="mobile-briefing-overlay__why-list">
                          <li>
                            <CheckIcon />
                            <span>{selectedRoute?.geofenceEvaluation?.summary || 'Route compliance supplied by the navigation feed'}</span>
                          </li>
                          <li>
                            <CheckIcon />
                            <span>Wave height: {safetyData?.significant_wave_height_m != null ? `${Number(safetyData.significant_wave_height_m).toFixed(1)} m` : 'not provided'}</span>
                          </li>
                          <li>
                            <CheckIcon />
                            <span>Sustained wind: {safetyData?.wind_speed_kmph != null ? `${Math.round(safetyData.wind_speed_kmph)} km/h` : 'not provided'}</span>
                          </li>
                          <li>
                            <CheckIcon />
                            <span>Distance {activePFZ.distance_nm} NM · Transit ETA: {calculateETA(activePFZ.distance_nm)}</span>
                          </li>
                        </ul>
                      ) : (
                        <p className="mobile-briefing-overlay__empty">A route recommendation will appear after the safety and navigation feeds return data for this harbor.</p>
                      )}
                    </div>
                  </>
                )}

                <div className="mobile-briefing-overlay__actions">
                  <button
                    type="button"
                    className="mobile-briefing-overlay__action-btn"
                    onClick={() => {
                      setShowCopilotCard(false)
                      setActiveNav('alerts')
                    }}
                  >
                    Inspect Assessment Factors
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conversational Messages Container */}
          <div
            className={`mobile-chat-messages ${activeNav === 'chat' ? 'mobile-chat-messages--maximized' : ''}`}
            ref={chatScrollRef}
          >
            {/* Standard Maritime Assistant Welcome Bubble */}
            <div className="mobile-chat-msg mobile-chat-msg--assistant">
              <div className="mobile-chat-bubble">
                <p className="mobile-chat-bubble__text">
                  Welcome to SETU-ADAM01. I can assist you with departure safety, harbor weather, wave &amp; tide advisories, and fishing zones across Indian coastal harbors. How can I help you today?
                </p>
                <span className="mobile-chat-bubble__time">09:40 AM</span>
              </div>
            </div>

            {messages &&
              messages
                .filter((m) => m.role !== 'system')
                .map((m) => (
                  <div key={m.id} className={`mobile-chat-msg mobile-chat-msg--${m.role}`}>
                    <div className="mobile-chat-bubble">
                      <p className="mobile-chat-bubble__text">{m.text}</p>
                      <span className="mobile-chat-bubble__time">{m.time}</span>
                    </div>
                  </div>
                ))}

            {typing && (
              <div className="mobile-chat-msg mobile-chat-msg--assistant">
                <div className="mobile-chat-bubble mobile-chat-bubble--typing">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompt Suggestion Chips */}
          <div className="mobile-chat-suggestions" role="group" aria-label="Quick prompt suggestions">
            {activeSuggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                className="mobile-suggestion-pill"
                onClick={() => {
                  if (sug.toLowerCase().includes('alerts')) {
                    setActiveNav('alerts')
                  } else {
                    handleSendMessage(sug)
                  }
                }}
                disabled={typing}
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Wider Full-Width Chat Bar & Cyan Send Button */}
          <form className="mobile-chat-input-row" onSubmit={handleFormSubmit}>
            <input
              ref={inputRef}
              className="mobile-chat-input"
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask SETU anything..."
              aria-label="Ask SETU anything"
            />
            <button
              type="submit"
              className="mobile-chat-send-btn"
              aria-label="Send message"
              disabled={!chatInput.trim()}
            >
              <IconSend size={15} color="#04121a" />
            </button>
          </form>
        </div>
      </section>

      {/* 6. Fixed Bottom Navigation Bar with Smooth Tab Indicators */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`mobile-nav-item ${activeNav === 'home' ? 'mobile-nav-item--active' : ''}`}
          onClick={() => {
            setActiveNav('home')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          aria-label="Home Dashboard"
        >
          <IconHome size={18} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${activeNav === 'map' ? 'mobile-nav-item--active' : ''}`}
          onClick={() => {
            setActiveNav('map')
          }}
          aria-label="Expanded Nautical Map"
        >
          <IconMap size={18} />
          <span>Map</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${activeNav === 'alerts' ? 'mobile-nav-item--active' : ''}`}
          onClick={() => {
            setActiveNav('alerts')
          }}
          aria-label="Departure Alerts and Assessment"
        >
          <IconBell size={18} />
          <span>Alerts</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${activeNav === 'chat' ? 'mobile-nav-item--active' : ''}`}
          onClick={() => {
            setActiveNav('chat')
          }}
          aria-label="SETU Copilot Chat"
        >
          <IconMessageSquare size={18} />
          <span>Chat</span>
        </button>
      </nav>

      {/* 7. Interactive Telemetry Detail Modals (Identical to Desktop TopicCards) */}
      {activeModal === 'weather' && (
        <DetailModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          icon={<IconCloud size={18} color="#38bdf8" />}
          title={`Coastal Weather Telemetry — ${locationName}`}
        >
          <div className="modal-grid-stats">
            <div className="modal-stat-box">
              <div className="modal-stat-box__lbl">Air Temperature</div>
              <div className="modal-stat-box__val" style={{ color: '#38bdf8' }}>{tempVal}</div>
            </div>
            <div className="modal-stat-box">
              <div className="modal-stat-box__lbl">Surface Pressure</div>
              <div className="modal-stat-box__val" style={{ color: '#1fd1a8' }}>{pressureVal}</div>
            </div>
            <div className="modal-stat-box">
              <div className="modal-stat-box__lbl">Visibility</div>
              <div className="modal-stat-box__val" style={{ color: '#3ddc84' }}>{visibilityVal}</div>
            </div>
          </div>

          <table className="modal-table">
            <tbody>
              <tr>
                <td><strong>Landing Center / Harbor</strong></td>
                <td>{locationName}</td>
              </tr>
              <tr>
                <td><strong>Coastal Sector & State</strong></td>
                <td>{harbor?.sector || '--'} · {harbor?.state || '--'}</td>
              </tr>
              <tr>
                <td><strong>Regional Alert Status</strong></td>
                <td>
                  <span style={{ color: safetyData?.active_regional_alert_level ? '#1fd1a8' : '#94a3b8', fontWeight: 600 }}>
                    {safetyData?.active_regional_alert_level || 'Unavailable'}
                  </span>
                </td>
              </tr>
              <tr>
                <td><strong>Composite Safety Rating</strong></td>
                <td><strong>{safetyData?.composite_safety_rating || 'Unavailable'}</strong></td>
              </tr>
              <tr>
                <td><strong>Observation Source</strong></td>
                <td>{safetyData ? 'Safety nowcast API' : 'No source data returned'}</td>
              </tr>
            </tbody>
          </table>
        </DetailModal>
      )}

      {activeModal === 'wind' && (
        <DetailModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          icon={<IconWind size={18} color="#38bdf8" />}
          title={`Wind Dynamics & Beaufort Scale — ${locationName}`}
        >
          <div className="modal-grid-stats">
            <div className="modal-stat-box">
              <div className="modal-stat-box__lbl">Sustained Wind</div>
              <div className="modal-stat-box__val" style={{ color: '#38bdf8' }}>
                {windSpeedKmph != null ? `${windSpeedKmph} km/h` : '--'}
              </div>
            </div>
            <div className="modal-stat-box">
              <div className="modal-stat-box__lbl">Peak Gusts</div>
              <div className="modal-stat-box__val" style={{ color: '#f59e0b' }}>{gustsText}</div>
            </div>
            <div className="modal-stat-box">
              <div className="modal-stat-box__lbl">Beaufort Force</div>
              <div className="modal-stat-box__val" style={{ color: '#1fd1a8' }}>
                {beaufort ? `Force ${beaufort.num}` : '--'}
              </div>
            </div>
          </div>

          <table className="modal-table">
            <tbody>
              <tr>
                <td><strong>Beaufort Classification</strong></td>
                <td>{beaufort ? `${beaufort.desc} (${beaufort.effect})` : 'Unavailable'}</td>
              </tr>
              <tr>
                <td><strong>Prevailing Direction</strong></td>
                <td>{windRotation == null ? 'Unavailable' : `${degToCompass(windRotation)} (${windRotation} deg)`}</td>
              </tr>
              <tr>
                <td><strong>Small Craft Advisory</strong></td>
                <td>
                  <span
                    style={{
                      color: windSpeedKmph == null ? '#94a3b8' : windSpeedKmph > 35 ? '#ef4444' : '#10b981',
                      fontWeight: 700,
                      fontSize: '11px',
                      padding: '2px 6px',
                      background: windSpeedKmph == null ? 'rgba(148,163,184,0.12)' : windSpeedKmph > 35 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                      borderRadius: '4px'
                    }}
                  >
                    {windSpeedKmph == null ? 'DATA UNAVAILABLE' : windSpeedKmph > 35 ? 'HIGH WIND ADVISORY' : 'CLEAR FOR ALL CRAFT'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </DetailModal>
      )}

      {activeModal === 'waves' && (
        <DetailModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          icon={<IconWave size={18} color="#38bdf8" />}
          title={`Wave & Hydrodynamic Profile — ${locationName}`}
        >
          <div className="modal-grid-stats">
            <div className="modal-stat-box">
              <div className="modal-stat-box__lbl">Significant Wave</div>
              <div className="modal-stat-box__val" style={{ color: '#38bdf8' }}>{waveVal}</div>
            </div>
            <div className="modal-stat-box">
              <div className="modal-stat-box__lbl">Swell Wave</div>
              <div className="modal-stat-box__val" style={{ color: '#1fd1a8' }}>
                {swell != null ? `${swell.toFixed(1)} m` : '--'}
              </div>
            </div>
            <div className="modal-stat-box">
              <div className="modal-stat-box__lbl">WMO Sea State</div>
              <div className="modal-stat-box__val" style={{ color: '#f59e0b', fontSize: '15px' }}>
                {seaState}
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Recent Hourly Wave Height Sequence
          </h4>
          <table className="modal-table">
            <thead>
              <tr>
                <th>Timestamp (UTC)</th>
                <th>Sig Wave (m)</th>
                <th>Swell (m)</th>
                <th>Sea State</th>
              </tr>
            </thead>
            <tbody>
              {safetyHistory && safetyHistory.length > 0 ? (
                safetyHistory.slice(0, 6).map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.datetime_utc ? new Date(item.datetime_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `T - ${idx}h`}</td>
                    <td><b>{Number(item.significant_wave_height_m).toFixed(1)} m</b></td>
                    <td>{Number(item.swell_wave_height_m).toFixed(1)} m</td>
                    <td>{item.wmo_sea_state_desc || 'Moderate'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">Hourly wave records loaded from v_ocean_safety_nowcast</td>
                </tr>
              )}
            </tbody>
          </table>
        </DetailModal>
      )}

      {activeModal === 'tide' && (
        <DetailModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          icon={<IconTide size={18} color="#38bdf8" />}
          title={`Astronomical Tide Predictions — ${locationName}`}
        >
          {isReference && referencePort && (
            <div
              style={{
                fontSize: '11px',
                color: '#93c5fd',
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.28)',
                padding: '7px 10px',
                borderRadius: '5px',
                marginBottom: '12px',
                lineHeight: 1.4,
              }}
            >
              <strong>Secondary Port Notice:</strong> Harmonic tide curves referenced from Survey of India primary station: <b>{referencePort}</b> ({distanceKm} km away).
            </div>
          )}
          <div className="modal-grid-stats">
            <div className="modal-stat-box">
              <div className="modal-stat-box__lbl">High Tide Peak</div>
              <div className="modal-stat-box__val" style={{ color: '#3ddc84' }}>
                {highTide ? `${Number(highTide.tide_height_meters).toFixed(1)}m` : '--'}
              </div>
            </div>
            <div className="modal-stat-box">
              <div className="modal-stat-box__lbl">Low Tide Trough</div>
              <div className="modal-stat-box__val" style={{ color: '#38bdf8' }}>
                {lowTide ? `${Number(lowTide.tide_height_meters).toFixed(1)}m` : '--'}
              </div>
            </div>
            <div className="modal-stat-box">
              <div className="modal-stat-box__lbl">Datum Reference</div>
              <div className="modal-stat-box__val" style={{ color: '#1fd1a8', fontSize: '14px' }}>
                Chart Datum
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Upcoming Harmonic Tidal Cycle
          </h4>
          <table className="modal-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Phase</th>
                <th>Height (m)</th>
              </tr>
            </thead>
            <tbody>
              {tides && tides.length > 0 ? (
                tides.slice(0, 8).map((t, idx) => (
                  <tr key={t.tide_id || idx}>
                    <td>{formatTideDate(t.prediction_datetime_utc)}</td>
                    <td><b>{formatTideTime(t.prediction_datetime_utc)}</b></td>
                    <td>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: t.tide_phase === 'HIGH' || t.tide_phase === 'H' ? 'rgba(61,220,132,0.15)' : 'rgba(53,201,232,0.15)',
                          color: t.tide_phase === 'HIGH' || t.tide_phase === 'H' ? '#3ddc84' : '#38bdf8',
                        }}
                      >
                        {t.tide_phase === 'HIGH' || t.tide_phase === 'H' ? 'HIGH TIDE' : 'LOW TIDE'}
                      </span>
                    </td>
                    <td><b>{Number(t.tide_height_meters).toFixed(2)} m</b></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">Tide prediction schedule loaded from fact_tide_predictions</td>
                </tr>
              )}
            </tbody>
          </table>
        </DetailModal>
      )}
    </div>
  )
}
