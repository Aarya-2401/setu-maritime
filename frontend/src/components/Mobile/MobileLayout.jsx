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
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
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
  isUserLocationActive = false,
  userLocationTag,
  hasLiveMarineData = true,
  liveWeather = null,
  safetyData,
  safetyHistory,
  assessment,
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
  onMapFocus
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
  const pressureVal = safetyData?.surface_pressure_hpa != null ? `${Number(safetyData.surface_pressure_hpa).toFixed(0)} hPa` : '-- hPa'
  const visibilityVal = safetyData?.visibility_km != null ? `${Number(safetyData.visibility_km).toFixed(1)} km` : '-- km'

  const windSpeedKmph = safetyData?.wind_speed_kmph != null ? Math.round(safetyData.wind_speed_kmph) : null
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
        threshold: '< 200 NM Outer Territorial Limit',
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

  // Suggestion pills resolution: inland suggestions if present on last assistant message, else default pills
  const activeSuggestions = useMemo(() => {
    if (messages && messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg?.role === 'assistant' && Array.isArray(lastMsg.suggestions) && lastMsg.suggestions.length > 0) {
        return lastMsg.suggestions
      }
    }
    return QUICK_PROMPTS
  }, [messages])

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

    // Check if query targets user location or an inland region
    const inlandMatch = detectInlandLocation(trimmed)
    if (inlandMatch?.isUserPositionQuery && onSelectUserLocation) {
      onSelectUserLocation()
    } else if (inlandMatch && onSetInlandLocation) {
      onSetInlandLocation(inlandMatch)
    }

    // Proactively scan user text against recognized coastal harbors
    const lower = trimmed.toLowerCase()
    let detectedHarbor = null
    if (harbors && harbors.length > 0) {
      detectedHarbor = harbors.find((h) => {
        const name = (h.landing_center_name || '').toLowerCase()
        const dist = (h.district || '').toLowerCase()
        const state = (h.state || '').toLowerCase()
        return (
          (lower.includes(dist) && dist.length > 3) ||
          (lower.includes(name) && name.length > 3) ||
          (lower.includes(state) && state.length > 3) ||
          (lower.includes('kolkata') && (h.harbor_id === 47 || state.includes('bengal'))) ||
          (lower.includes('calcutta') && (h.harbor_id === 47 || state.includes('bengal'))) ||
          (lower.includes('hooghly') && (h.harbor_id === 47 || state.includes('bengal'))) ||
          (lower.includes('sundarban') && (h.harbor_id === 48 || state.includes('bengal'))) ||
          (lower.includes('digha') && h.harbor_id === 45) ||
          (lower.includes('chennai') && (name.includes('chennai') || dist.includes('chennai') || name.includes('kasimedu'))) ||
          (lower.includes('mumbai') && (name.includes('mumbai') || name.includes('sassoon') || dist.includes('mumbai'))) ||
          (lower.includes('cochin') && (name.includes('cochin') || name.includes('kochi'))) ||
          (lower.includes('kochi') && (name.includes('cochin') || name.includes('kochi'))) ||
          (lower.includes('vizag') && (name.includes('visakhapatnam') || dist.includes('visakhapatnam'))) ||
          ((lower.includes('visakhapatnam') || lower.includes('vishakhapatnam')) && (name.includes('visakhapatnam') || dist.includes('visakhapatnam'))) ||
          ((lower.includes('paradip') || lower.includes('paradeep')) && name.includes('paradip')) ||
          ((lower.includes('odisha') || lower.includes('odhisha') || lower.includes('orissa')) && (state.includes('odisha') || h.harbor_id === 41)) ||
          ((lower.includes('kerala') || lower.includes('kerla')) && (state.includes('kerala') || h.harbor_id === 19)) ||
          ((lower.includes('gujarat') || lower.includes('gujrat')) && (state.includes('gujarat') || h.harbor_id === 1)) ||
          ((lower.includes('maharashtra') || lower.includes('maharastra')) && (state.includes('maharashtra') || h.harbor_id === 6)) ||
          ((lower.includes('karnataka') || lower.includes('karnatka')) && (state.includes('karnataka') || h.harbor_id === 14)) ||
          (lower.includes('dhamra') && name.includes('dhamra')) ||
          (lower.includes('puri') && (dist.includes('puri') || name.includes('puri'))) ||
          (lower.includes('goa') && (state.includes('goa') || name.includes('goa')))
        )
      })
      if (detectedHarbor && onSelectHarbor) {
        onSelectHarbor(detectedHarbor.harbor_id)
        if (onMapFocus && detectedHarbor.latitude && detectedHarbor.longitude) {
          onMapFocus({
            lat: Number(detectedHarbor.latitude),
            lon: Number(detectedHarbor.longitude),
            zoom: 11,
            label: detectedHarbor.landing_center_name,
            timestamp: Date.now()
          })
        }
      }
    }

    try {
      const aiResponse = await askOrcaAI(trimmed)
      if (aiResponse && aiResponse.success && aiResponse.answer) {
        if (aiResponse.isInland || aiResponse.locationStatus === 'INLAND') {
          // Inland location: retain fallback harbor (harbor_id 1, Veraval) in background
          if (aiResponse.harborId && onSelectHarbor) {
            onSelectHarbor(aiResponse.harborId)
          }

          if (aiResponse.mapUpdate?.location && onMapFocus) {
            onMapFocus({
              lat: Number(aiResponse.mapUpdate.location.latitude),
              lon: Number(aiResponse.mapUpdate.location.longitude),
              zoom: aiResponse.mapUpdate.zoom || 10,
              label: aiResponse.mapUpdate.location.name,
              timestamp: Date.now()
            })
          }

          if (onSetInlandLocation && aiResponse.mapUpdate?.location) {
            onSetInlandLocation({
              lat: Number(aiResponse.mapUpdate.location.latitude),
              lon: Number(aiResponse.mapUpdate.location.longitude),
              place: aiResponse.location || aiResponse.mapUpdate.location.name,
              label: aiResponse.mapUpdate.location.name
            })
          } else if (onSelectUserLocation) {
            onSelectUserLocation()
          }
        } else if (aiResponse.locationStatus === 'SUPPORTED' || aiResponse.locationStatus === 'COASTAL_STATE') {
          if (aiResponse.harborId && onSelectHarbor) {
            onSelectHarbor(aiResponse.harborId)
          } else if (aiResponse.resolvedHarbor?.harbor_id && onSelectHarbor) {
            onSelectHarbor(aiResponse.resolvedHarbor.harbor_id)
          }

          if (aiResponse.mapUpdate?.location && onMapFocus) {
            onMapFocus({
              lat: Number(aiResponse.mapUpdate.location.latitude),
              lon: Number(aiResponse.mapUpdate.location.longitude),
              zoom: aiResponse.mapUpdate.zoom || 11,
              label: aiResponse.mapUpdate.location.name,
              timestamp: Date.now()
            })
          }
        }

        const replySuggestions =
          aiResponse.suggestions && aiResponse.suggestions.length > 0
            ? aiResponse.suggestions
            : inlandMatch
            ? inlandMatch.suggestions
            : []

        const reply = {
          id: getMessageUUID(),
          role: 'assistant',
          text: aiResponse.answer,
          time: formatCurrentTime(new Date()),
          suggestions: replySuggestions
        }
        onAddMessage(reply)
        setTyping(false)
        return
      }
    } catch (err) {
      console.warn('AI endpoint unavailable, using local maritime telemetry engine:', err.message)
    }

    // Inland location detection fallback
    if (inlandMatch) {
      setTimeout(() => {
        const place = inlandMatch.place
        const reply = {
          id: getMessageUUID(),
          role: 'assistant',
          text: `${place} is an inland location with no open coastline. I have updated your dashboard title cards with the live local weather and surface winds for ${place}, centered your locality radar map on ${place}, and maintained Veraval Fishing Harbor, Gujarat as your regional maritime reference point.`,
          time: formatCurrentTime(new Date()),
          suggestions: inlandMatch.suggestions
        }
        onAddMessage(reply)
        setTyping(false)
      }, 450)
      return
    }

    // Local fallback reply
    setTimeout(() => {
      const activeH = detectedHarbor || harbor
      const harborName = activeH?.landing_center_name || 'your harbor'
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
        time: formatCurrentTime(new Date())
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
      {/* 1. Branded Top Header Row */}
      <header className="mobile-header">
        <div className="mobile-header__brand" title="SETU Maritime Intelligence" onClick={() => setActiveNav('home')}>
          <img
            src="/favicon-512x512.png"
            alt="SETU"
            className="mobile-header__logo"
          />
          <span className="mobile-header__title">SETU</span>
        </div>

        <div className="mobile-header__location-pill" title="Tap to select location">
          <IconLocation size={12} color={isUserLocationActive ? '#10b981' : '#38bdf8'} />
          <span className="mobile-header__station-tag">
            {isUserLocationActive
              ? userLocationTag
              : harbor
              ? getFormattedHarborTag(harbor)
              : 'HAR · --'}
          </span>
          <span
            className="mobile-header__locode-badge"
            style={isUserLocationActive ? { borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10b981' } : {}}
          >
            {isUserLocationActive ? 'YOU' : harbor ? getUNLocode(harbor) : 'UN/LOCODE'}
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

      {/* 1b. Operational Decision / Safety Clearance Banner (Matches Desktop TopBar) */}
      {activeNav === 'home' && (
        <div className="mobile-clearance-wrap">
          <button
            type="button"
            className={`mobile-decision-btn mobile-decision-btn--${assessment?.tone || 'good'}`}
            onClick={() => setActiveNav('alerts')}
            title="View Departure & Route Assessment Breakdown"
          >
            <span className="mobile-decision-dot" />
            <span className="mobile-decision-txt">
              {assessment?.decisionLabel || 'SAFE TO DEPART'}
            </span>
            <span className="mobile-decision-cta">WHY?</span>
          </button>
        </div>
      )}

      {/* 2. Telemetry Information Capsules (Home Tab Only) */}
      {activeNav === 'home' && (
        <section className={`mobile-telemetry-capsules mobile-tab-view${!hasLiveMarineData ? ' mobile-telemetry-capsules--two' : ''}`} aria-label="Harbor telemetry capsules">
          <button
            type="button"
            className="mobile-telemetry-capsule"
            onClick={() => setActiveModal('weather')}
            title="Weather telemetry: tap for full observation details"
            aria-label="View Weather Details"
          >
            <span className="mobile-capsule-icon">
              <IconCloud size={14} color="#38bdf8" />
            </span>
            <div className="mobile-capsule-info">
              <span className="mobile-capsule-val">{tempVal}</span>
              <span className="mobile-capsule-lbl">Weather</span>
            </div>
          </button>

          <button
            type="button"
            className="mobile-telemetry-capsule"
            onClick={() => setActiveModal('wind')}
            title="Wind dynamics: tap for Beaufort scale and advisory"
            aria-label="View Wind Details"
          >
            <span className="mobile-capsule-icon">
              <IconWind size={14} color="#38bdf8" />
            </span>
            <div className="mobile-capsule-info">
              <span className="mobile-capsule-val">{windVal}</span>
              <span className="mobile-capsule-lbl">Wind</span>
            </div>
          </button>

          {hasLiveMarineData && (
            <>
              <button
                type="button"
                className="mobile-telemetry-capsule"
                onClick={() => setActiveModal('waves')}
                title="Wave and sea state: tap for hourly sequence and swell profile"
                aria-label="View Waves Details"
              >
                <span className="mobile-capsule-icon">
                  <IconWave size={14} color="#38bdf8" />
                </span>
                <div className="mobile-capsule-info">
                  <span className="mobile-capsule-val">{waveVal}</span>
                  <span className="mobile-capsule-lbl">Waves</span>
                </div>
              </button>

              <button
                type="button"
                className="mobile-telemetry-capsule"
                onClick={() => setActiveModal('tide')}
                title="Tidal cycle: tap for harmonic predictions and high/low peaks"
                aria-label="View Tide Details"
              >
                <span className="mobile-capsule-icon">
                  <IconTide size={14} color="#38bdf8" />
                </span>
                <div className="mobile-capsule-info">
                  <span className="mobile-capsule-val">{tideVal}</span>
                  <span className="mobile-capsule-lbl">Tide</span>
                </div>
              </button>
            </>
          )}
        </section>
      )}

      {/* 3. Dedicated Mobile Alerts & Departure Assessment View */}
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

      {/* 4. Live Map Section (Kept mounted for Home and Map tabs to preserve Leaflet tile caching) */}
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

      {/* 5. SETU Chatbot Section (Kept mounted for Home and Chat tabs to preserve message history) */}
      <section
        className={`mobile-chat-section ${activeNav === 'chat' ? 'mobile-chat-section--maximized mobile-tab-view' : ''}`}
        id="mobile-chat-section"
        aria-label="SETU Maritime Assistant"
      >
        <div className={`mobile-chat-card ${activeNav === 'chat' ? 'mobile-chat-card--maximized' : ''}`}>
          <div className="mobile-chat-header">
            <div className="mobile-chat-avatar">
              <img
                src="/favicon-512x512.png"
                alt="SETU E6"
                className="mobile-chat-avatar-img"
              />
            </div>
            <div className="mobile-chat-identity">
              <span className="mobile-chat-title">SETU</span>
              <span className="mobile-chat-subtitle">
                {activeNav === 'chat' ? 'Adam-01 Autonomous Maritime Copilot' : 'Adam-01'}
              </span>
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

          {/* Navigation Decision Briefing Box (Matches Desktop) */}
          {showCopilotCard && (
            <div className="copilot-decision-card" style={{ margin: '0 0 12px 0' }}>
              <div className="copilot-decision-card__top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="copilot-badge">NAV COPILOT</span>
                  <span className={`copilot-status copilot-status--${assessment?.tone || 'good'}`}>
                    ● {recommendationState}
                  </span>
                </div>
                <button
                  type="button"
                  className="copilot-decision-card__hide-btn"
                  onClick={() => setShowCopilotCard(false)}
                  title="Hide Navigation Briefing Box"
                >
                  Hide
                </button>
              </div>

              {isCurrentlyInland ? (
                <>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '5px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <span>Position:</span>
                    <b style={{ color: '#e2e8f0' }}>{userLocation?.label || 'User Location'}</b>
                    <span style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '0 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 700 }}>
                      YOU
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                      (Inland Non-Maritime)
                    </span>
                  </div>

                  <div className="copilot-decision-card__target">
                    <strong>Terrestrial Zone: Clear Operational Profile</strong>
                    <span> — Gateway: {harbor?.landing_center_name || 'Veraval Fishing Harbor, Gujarat'}</span>
                  </div>

                  <div className="copilot-decision-card__why">
                    <div className="copilot-why-title">Why this assessment?</div>
                    <ul className="copilot-why-list">
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
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '5px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <span>Terminal:</span>
                    <b style={{ color: '#e2e8f0' }}>{harbor?.landing_center_name || 'Harbor unavailable'}</b>
                    <span style={{ background: 'rgba(53, 201, 232, 0.12)', border: '1px solid rgba(53, 201, 232, 0.3)', color: '#38bdf8', padding: '0 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 700 }}>
                      {harbor ? getUNLocode(harbor) : '--'}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                      ({harbor ? getFormattedHarborTag(harbor) : '--'})
                    </span>
                  </div>

                  <div className="copilot-decision-card__target">
                    <strong>{activePFZ ? `PFZ-${activePFZ.advisory_id?.slice(-4) || 'ZONE'}` : 'Recommendation pending'}</strong>
                    {activePFZ && <span> — {activePFZ.target_species || 'Target species not provided'}</span>}
                  </div>

                  <div className="copilot-decision-card__why">
                    <div className="copilot-why-title">{hasRecommendation ? 'Why this recommendation?' : 'Data status'}</div>
                    {hasRecommendation ? (
                      <ul className="copilot-why-list">
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
                      <p className="copilot-decision-card__empty">A route recommendation will appear after the safety and navigation feeds return data for this harbor.</p>
                    )}
                  </div>
                </>
              )}

              <div className="copilot-decision-card__actions">
                <button className="copilot-action-btn" onClick={() => setActiveNav('alerts')}>
                  Inspect Assessment Factors
                </button>
              </div>
            </div>
          )}

          {hasConversation ? (
            <>
              <div
                className={`mobile-chat-messages ${activeNav === 'chat' ? 'mobile-chat-messages--maximized' : ''}`}
                ref={chatScrollRef}
              >
                {messages &&
                  messages.filter((m) => m.role !== 'system').map((m) => (
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

              {/* Interactive Suggestion Pills in Active Conversation */}
              <div className="mobile-chat-suggestions" role="group" aria-label="Quick suggested queries">
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
                    onTouchStart={() => {}}
                    disabled={typing}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className={`mobile-empty-state ${activeNav === 'chat' ? 'mobile-empty-state--maximized' : ''}`} ref={chatScrollRef}>
              <div className="mobile-empty-state__content">
                <span className="mobile-empty-state__section-label">MARITIME COPILOT</span>

                <p className="mobile-empty-state__standing-by">
                  SETU-ADAM01 is standing by.
                </p>
                <p className="mobile-empty-state__scope">
                  Ask about departure safety, weather, waves, tides, PFZs, or recommended sailing routes for your selected harbor.
                </p>

                <div className="mobile-empty-state__harbor-context">
                  <span className="mobile-empty-state__harbor-label">SELECTED HARBOR</span>
                  <span className="mobile-empty-state__harbor-name">
                    {harbor?.landing_center_name || 'Harbor loading...'}
                    {harbor?.state ? ` · ${harbor.state}` : ''}
                  </span>
                </div>

                <div className="mobile-empty-state__actions">
                  <button
                    type="button"
                    className="mobile-action mobile-action--primary"
                    onClick={() => handleSendMessage('Is it safe to depart?')}
                    disabled={typing}
                  >
                    Is it safe to depart?
                  </button>
                  <div className="mobile-empty-state__actions-row">
                    <button
                      type="button"
                      className="mobile-action mobile-action--secondary"
                      onClick={() => handleSendMessage('Recommended route')}
                      disabled={typing}
                    >
                      Recommended route
                    </button>
                    <button
                      type="button"
                      className="mobile-action mobile-action--secondary"
                      onClick={() => handleSendMessage('Nearest PFZ')}
                      disabled={typing}
                    >
                      Nearest PFZ
                    </button>
                  </div>
                  <div className="mobile-empty-state__actions-row">
                    <button
                      type="button"
                      className="mobile-action mobile-action--secondary"
                      onClick={() => handleSendMessage('Weather conditions')}
                      disabled={typing}
                    >
                      Weather conditions
                    </button>
                    <button
                      type="button"
                      className="mobile-action mobile-action--secondary"
                      onClick={() => handleSendMessage('Tide forecast')}
                      disabled={typing}
                    >
                      Tide forecast
                    </button>
                    <button
                      type="button"
                      className="mobile-action mobile-action--secondary"
                      onClick={() => setActiveNav('alerts')}
                    >
                      Active alerts
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rounded Input Field & Cyan Circular Send Button */}
          <form className="mobile-chat-input-row" onSubmit={handleFormSubmit}>
            <input
              ref={inputRef}
              className="mobile-chat-input"
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Ask about ${harbor?.landing_center_name || 'this harbor'}...`}
              aria-label={`Ask about ${harbor?.landing_center_name || 'this harbor'}`}
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
