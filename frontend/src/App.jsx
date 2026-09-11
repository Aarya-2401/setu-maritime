import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react'
import TopBar from './components/TopBar/TopBar'
import MapSection from './components/MapSection/MapSection'
import TopicCardsGrid from './components/TopicCards/TopicCardsGrid'
import ChatPanel from './components/ChatPanel/ChatPanel'
import { calculateGlobalAssessment, evaluateUserLocationAssessment } from './data/decisionLogic'
import { fetchLiveWeather, getCityStateAbbr } from './data/liveWeather'
import { executeMapIntent } from './utils/mapIntentExecutor'
import MobileLayout from './components/Mobile/MobileLayout'
import { useIsMobile } from './components/Mobile/useIsMobile'
import ErrorBoundary from './components/ErrorBoundary'

const AssessmentModal = lazy(() => import('./components/Modal/AssessmentModal'))
import {
  useHarbors,
  useSafetyNowcast,
  useTides,
  usePFZAdvisories,
  useNavigationRoutes,
  useMaritimeBoundaries
} from './data/useOrcaAPI'
import { KERALA_DEMO_HARBOR } from './data/keralaDemoData'
import { FALLBACK_RESTRICTED_ZONES } from './data/mockData'
import './App.css'

export default function App() {
  const { harbors, loading: harborsLoading, error: harborsError } = useHarbors()
  const [selectedHarborId, setSelectedHarborId] = useState(1)
  const [isUserLocationActive, setIsUserLocationActive] = useState(() => {
    try {
      const cached = localStorage.getItem('setu_user_location')
      return cached ? true : false
    } catch { return false }
  })
  const [selectedRouteId, setSelectedRouteId] = useState(null)
  const [mapFocusTarget, setMapFocusTarget] = useState(null)
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
  const [userLocation, setUserLocation] = useState(() => {
    try {
      const cached = localStorage.getItem('setu_user_location')
      return cached ? JSON.parse(cached) : null
    } catch { return null }
  })
  const [liveWeatherData, setLiveWeatherData] = useState(null)
  const [dynamicAdvisories, setDynamicAdvisories] = useState(null)
  const [dynamicZones, setDynamicZones] = useState(null)
  const [dashboardIntent, setDashboardIntent] = useState(null)
  const [dashboardContext, setDashboardContext] = useState('HARBOR_TELEMETRY')
  const [queryTarget, setQueryTarget] = useState(null)
  const [cardUpdates, setCardUpdates] = useState([])

  const isMobile = useIsMobile(768)

  const [currentTime, setCurrentTime] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Single flat messages state for active consultation session
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      role: 'system',
      text: '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])

  function handleAddMessage(msg) {
    setMessages((prev) => [...prev, msg])
  }

  // Automatic browser user-location detection on startup with silent fallback to Veraval Port
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      return
    }

    let active = true

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!active) return
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude

        // Reverse geocoding to obtain human-readable city, state
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
          .then((res) => res.json())
          .then((data) => {
            if (!active) return
            const addr = data?.address || {}
            const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || ''
            const state = addr.state || ''
            const label = city && state ? `${city}, ${state}` : city || state || 'Current Location'
            const locObj = { lat, lon, label, city, state }
            setUserLocation(locObj)
            setIsUserLocationActive(true)
            try { localStorage.setItem('setu_user_location', JSON.stringify(locObj)) } catch {}

            // Fetch live Open-Meteo atmospheric metrics
            fetchLiveWeather(lat, lon).then((wData) => {
              if (active && wData) {
                setLiveWeatherData(wData)
              }
            })
          })
          .catch(() => {
            if (!active) return
            const locObj = { lat, lon, label: 'Current Location' }
            setUserLocation(locObj)
            setIsUserLocationActive(true)
            try { localStorage.setItem('setu_user_location', JSON.stringify(locObj)) } catch {}
            fetchLiveWeather(lat, lon).then((wData) => {
              if (active && wData) {
                setLiveWeatherData(wData)
              }
            })
          })

        // Smoothly center the map on the user's detected coordinates if not already overridden by AI/user
        setMapFocusTarget((prev) => {
          if (prev && prev.label !== 'Default' && prev.label !== 'User Detected Position') {
            return prev
          }
          return {
            lat,
            lon,
            zoom: 10,
            label: 'User Detected Position',
            timestamp: Date.now()
          }
        })
      },
      (err) => {
        // Permission denied, timeout or unavailable:
        // Gracefully and silently fall back to Veraval Port (already default harbor_id: 1)
        console.info('Browser geolocation unavailable or denied, falling back to Veraval Port:', err?.message)
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000
      }
    )

    return () => {
      active = false
    }
  }, [])

  // Hydrate live weather and map focus from cached localStorage location on mount
  useEffect(() => {
    if (userLocation?.lat && userLocation?.lon && !liveWeatherData) {
      fetchLiveWeather(userLocation.lat, userLocation.lon).then((wData) => {
        if (wData) setLiveWeatherData(wData)
      })
      setMapFocusTarget((prev) => {
        if (prev && prev.label !== 'Default' && prev.label !== 'User Detected Position') {
          return prev
        }
        return {
          lat: userLocation.lat,
          lon: userLocation.lon,
          zoom: 10,
          label: 'User Detected Position',
          timestamp: Date.now()
        }
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Disengage inland mode whenever an explicit maritime focus target is active
  useEffect(() => {
    if (mapFocusTarget && (mapFocusTarget.layer || mapFocusTarget.bounds || (mapFocusTarget.label && mapFocusTarget.label !== 'User Detected Position' && !mapFocusTarget.label.toLowerCase().includes('inland')))) {
      setIsUserLocationActive(false)
    }
  }, [mapFocusTarget])

  // Find the selected harbor object from loaded harbors list (with Kerala fallback)
  const selectedHarbor = useMemo(() => {
    if (selectedHarborId === 19) {
      const found = harbors?.find((h) => h.harbor_id === 19)
      if (found) return found
      return KERALA_DEMO_HARBOR
    }
    if (!harbors || harbors.length === 0) {
      return null
    }
    return (
      harbors.find((h) => h.harbor_id === Number(selectedHarborId)) ||
      harbors[0] ||
      null
    )
  }, [harbors, selectedHarborId])

  function handleUpdateDashboardIntent(di) {
    setDashboardIntent(di)
    if (di?.context) {
      setDashboardContext(di.context)
    }
    if (di?.queryTarget) {
      setQueryTarget(di.queryTarget)
    }
  }

  // Reset selected route and target focus when harbor changes
  function handleSelectHarbor(id) {
    setSelectedHarborId(id)
    setIsUserLocationActive(false)
    setSelectedRouteId(null)
    setMapFocusTarget(null)
    setDynamicAdvisories(null)
    setDynamicZones(null)
    setDashboardContext('HARBOR_TELEMETRY')
    setQueryTarget(null)
    setCardUpdates([])
    setDashboardIntent(null)
  }

  // Switch to user location view
  function handleSelectUserLocation() {
    setIsUserLocationActive(true)
    setDynamicAdvisories(null)
    setDynamicZones(null)
    setDashboardContext('INLAND_STATUS')
    setQueryTarget(userLocation?.label || 'User Location')
    setCardUpdates([])
    setDashboardIntent(null)
    if (userLocation?.lat && userLocation?.lon) {
      setMapFocusTarget({
        lat: Number(userLocation.lat),
        lon: Number(userLocation.lon),
        zoom: 10,
        label: userLocation.label || 'User Detected Position',
        timestamp: Date.now()
      })
      if (!liveWeatherData) {
        fetchLiveWeather(userLocation.lat, userLocation.lon).then((data) => {
          if (data) setLiveWeatherData(data)
        })
      }
    }
  }

  // Set an inland query location on dashboard
  function handleSetInlandLocation(inlandObj) {
    setIsUserLocationActive(true)
    setDashboardContext('INLAND_STATUS')
    setCardUpdates([])
    setDashboardIntent(null)
    const lat = inlandObj.lat || (userLocation?.lat ? Number(userLocation.lat) : 26.9124)
    const lon = inlandObj.lon || (userLocation?.lon ? Number(userLocation.lon) : 75.7873)
    const label = inlandObj.label || (inlandObj.state ? `${inlandObj.place || inlandObj.city}, ${inlandObj.state}` : (inlandObj.place || 'Inland Position'))
    setQueryTarget(label)
    setUserLocation({
      lat,
      lon,
      label,
      city: inlandObj.city || inlandObj.place || 'Inland',
      state: inlandObj.state || 'India'
    })
    setMapFocusTarget({
      lat,
      lon,
      zoom: 10,
      label,
      timestamp: Date.now()
    })
    fetchLiveWeather(lat, lon).then((data) => {
      if (data) setLiveWeatherData(data)
    })
  }

  // Demonstration trigger: Synchronous maritime consultation switch & seamless map zoom to Kerala PFZ
  function handleTriggerKeralaDemo() {
    setIsUserLocationActive(false)
    setSelectedHarborId(19)
    setSelectedRouteId('INCOIS-PFZ-20260825-KER-2856')
    setMapFocusTarget({
      lat: 9.8309,
      lon: 75.9074,
      zoom: 11,
      label: 'Kerala PFZ Sector (09° 49.8\' N, 75° 54.4\' E)',
      timestamp: Date.now()
    })
  }

  // Atomic state updater function: applies AI response as one coherent UI context
  const applyAIResponse = useCallback((aiResponse) => {
    if (!aiResponse || !aiResponse.success) return

    const effectiveIntent = aiResponse.mapIntent || aiResponse.mapUpdate || { action: 'PRESERVE' }

    // 1. Atomically resolve and update queryTarget and dashboardContext
    const qTarget = aiResponse.queryTarget ||
      aiResponse.dashboardIntent?.queryTarget ||
      effectiveIntent.scopeName ||
      effectiveIntent.location?.name ||
      null

    if (qTarget) {
      setQueryTarget(qTarget)
    }

    if (aiResponse.dashboardIntent) {
      setDashboardIntent(aiResponse.dashboardIntent)
      if (aiResponse.dashboardIntent.context) {
        setDashboardContext(aiResponse.dashboardIntent.context)
      }
    } else if (effectiveIntent.layer === 'RESTRICTED_ZONES') {
      setDashboardContext('RESTRICTED_ZONES')
      if (qTarget) setDashboardIntent({ context: 'RESTRICTED_ZONES', queryTarget: qTarget })
    } else if (effectiveIntent.layer === 'PFZ') {
      setDashboardContext('PFZ_OVERVIEW')
      if (qTarget) setDashboardIntent({ context: 'PFZ_OVERVIEW', queryTarget: qTarget })
    } else if (effectiveIntent.layer === 'CYCLONES') {
      setDashboardContext('CYCLONE_TRACK')
    } else if (effectiveIntent.layer === 'ROUTES') {
      setDashboardContext('NAVIGATION_ROUTE')
    }

    // 2. Atomically update cardUpdates
    if (Array.isArray(aiResponse.cardUpdates)) {
      setCardUpdates(aiResponse.cardUpdates)
    }

    // 3. Atomically synchronize harbor and inland state
    const isTargetInland = Boolean(aiResponse.isInland || aiResponse.locationStatus === 'INLAND' || effectiveIntent.action === 'FOCUS_LOCATION')
    if (!isTargetInland) {
      setIsUserLocationActive(false)
    }
    const resolvedHarborId = aiResponse.harborId || aiResponse.resolvedHarbor?.harbor_id || effectiveIntent.harborId
    if (resolvedHarborId && effectiveIntent.scope !== 'NATIONAL') {
      setSelectedHarborId(Number(resolvedHarborId))
    }

    // 4. Atomically execute MapIntent
    executeMapIntent(effectiveIntent, aiResponse, {
      onSelectHarbor: (id) => setSelectedHarborId(Number(id)),
      onMapFocus: (focus) => setMapFocusTarget(focus),
      onSetInlandLocation: handleSetInlandLocation,
      onSelectUserLocation: handleSelectUserLocation,
      onDisengageInland: () => setIsUserLocationActive(false),
      onUpdateDynamicAdvisories: (adv) => setDynamicAdvisories(adv),
      onUpdateDynamicZones: (zones) => setDynamicZones(zones),
      onUpdateDashboardIntent: handleUpdateDashboardIntent,
      onUpdateCardUpdates: (cards) => setCardUpdates(cards),
      onUpdateQueryTarget: (target) => setQueryTarget(target)
    })
  }, [handleSetInlandLocation, handleSelectUserLocation, handleUpdateDashboardIntent])

  // Query live MySQL Views for the selected harbor - parallelized from t=0
  const { data: safetyData, history: safetyHistory, loading: safetyLoading, error: safetyError } =
    useSafetyNowcast(selectedHarborId)
  const { tides, tideMeta, loading: tidesLoading, error: tidesError } = useTides(selectedHarborId)
  const { advisories, loading: pfzLoading, error: pfzError } = usePFZAdvisories(selectedHarborId)
  const { routes, restrictedZones, loading: navigationLoading, error: navigationError } = useNavigationRoutes(selectedHarborId)
  const { boundaries: maritimeBoundaries, loading: boundariesLoading, error: boundariesError } = useMaritimeBoundaries()

  // Global Maritime Keyboard Shortcuts: M (Map), A (Assessment), R (Routes), ? (Copilot), Esc (Close)
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
        return
      }

      const key = e.key

      if (key === 'm' || key === 'M') {
        e.preventDefault()
        const expandBtn = document.querySelector('.map-section__expand-btn')
        if (expandBtn) expandBtn.click()
      } else if (key === 'a' || key === 'A') {
        e.preventDefault()
        setAssessmentModalOpen((prev) => !prev)
      } else if (key === 'r' || key === 'R') {
        e.preventDefault()
        const routeBtn = document.querySelector('.map-section__route-btn')
        if (routeBtn) routeBtn.click()
      } else if (key === '?') {
        e.preventDefault()
        const chatInput = document.querySelector('.chat-panel__input')
        if (chatInput) {
          chatInput.focus()
        }
      } else if (key === 'Escape') {
        setAssessmentModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Abbreviated user location tag, e.g. "JAI · RJ"
  const userLocationTag = useMemo(() => {
    return getCityStateAbbr(userLocation?.city, userLocation?.state)
  }, [userLocation])

  // Inland position has no oceanographic wave or tide telemetry
  const hasLiveMarineData = useMemo(() => {
    if (!isUserLocationActive) return true
    return false
  }, [isUserLocationActive])

  // When user location is active, inject live atmospheric metrics into safety data
  const effectiveSafetyData = useMemo(() => {
    if (isUserLocationActive && liveWeatherData) {
      return {
        ...safetyData,
        ...liveWeatherData,
        landing_center_name: userLocation?.label || 'User Location',
        sector: userLocation?.state ? `Inland (${userLocation.state})` : 'Inland Locality'
      }
    }
    return safetyData
  }, [isUserLocationActive, liveWeatherData, safetyData, userLocation])

  // Global telemetry separate from transient dashboard query contexts
  const globalTelemetry = useMemo(() => {
    const isUserLoc = isUserLocationActive && userLocation?.label
    const locName = isUserLoc ? userLocation.label : (selectedHarbor?.landing_center_name || 'Operational Base')
    const locState = isUserLoc ? (userLocation.state || 'India') : (selectedHarbor?.state || '')

    const airTemp = effectiveSafetyData?.air_temp_celsius != null
      ? Math.round(effectiveSafetyData.air_temp_celsius)
      : (liveWeatherData?.temp != null ? Math.round(liveWeatherData.temp) : null)

    const windSpeed = effectiveSafetyData?.wind_speed_kmph != null
      ? Math.round(effectiveSafetyData.wind_speed_kmph)
      : (liveWeatherData?.windSpeed != null ? Math.round(liveWeatherData.windSpeed) : null)

    const waveHeight = effectiveSafetyData?.significant_wave_height_m != null
      ? Number(effectiveSafetyData.significant_wave_height_m).toFixed(1)
      : null

    const currentTide = tides && tides.length > 0
      ? Number(tides[0].tide_height_meters).toFixed(1)
      : null

    return {
      weather: {
        value: airTemp != null ? `${airTemp}°C` : '--',
        rawValue: airTemp,
        unit: '°C',
        location: locName,
        state: locState,
        timestamp: effectiveSafetyData?.datetime_utc || new Date().toISOString(),
        source: isUserLoc ? 'Open-Meteo Atmospheric' : 'INCOIS / C-DAC Marine AWS'
      },
      wind: {
        value: windSpeed != null ? `${windSpeed} km/h` : '--',
        rawValue: windSpeed,
        unit: 'km/h',
        location: locName,
        state: locState,
        timestamp: effectiveSafetyData?.datetime_utc || new Date().toISOString(),
        source: isUserLoc ? 'Open-Meteo Wind' : 'INCOIS Nowcast Surface Wind'
      },
      wave: {
        value: waveHeight != null ? `${waveHeight} m` : (hasLiveMarineData ? '--' : 'N/A'),
        rawValue: waveHeight,
        unit: 'm',
        location: locName,
        state: locState,
        timestamp: effectiveSafetyData?.datetime_utc || new Date().toISOString(),
        source: 'INCOIS WaveWatch III'
      },
      tide: {
        value: currentTide != null ? `${currentTide} m` : (hasLiveMarineData ? '--' : 'N/A'),
        rawValue: currentTide,
        unit: 'm',
        location: locName,
        state: locState,
        timestamp: tides?.[0]?.tide_time || new Date().toISOString(),
        source: 'Survey of India / INCOIS Tide Prediction'
      },
      time: currentTime
    }
  }, [isUserLocationActive, userLocation, selectedHarbor, effectiveSafetyData, liveWeatherData, tides, hasLiveMarineData, currentTime])

  const effectiveAdvisories = dynamicAdvisories || advisories
  const effectiveZones = (dynamicZones && dynamicZones.length > 0)
    ? dynamicZones
    : ((restrictedZones && restrictedZones.length > 0) ? restrictedZones : FALLBACK_RESTRICTED_ZONES)

  // Unified single source of truth for departure decision and factor evaluation
  const globalAssessment = useMemo(() => {
    return calculateGlobalAssessment({
      harbor: selectedHarbor,
      safetyData: effectiveSafetyData,
      tides,
      advisories: effectiveAdvisories,
      routes,
      restrictedZones: effectiveZones,
      selectedRouteId
    })
  }, [selectedHarbor, effectiveSafetyData, tides, effectiveAdvisories, routes, effectiveZones, selectedRouteId])

  // Dynamic active assessment: if inland user location is active, tailor assessment to inland position
  const activeAssessment = useMemo(() => {
    if (isUserLocationActive && !hasLiveMarineData) {
      return evaluateUserLocationAssessment(userLocation, liveWeatherData, selectedHarbor)
    }
    return globalAssessment
  }, [isUserLocationActive, hasLiveMarineData, userLocation, liveWeatherData, selectedHarbor, globalAssessment])

  // Context-aware operational status distinguishing user queries from departure clearance
  const operationalStatus = useMemo(() => {
    if (dashboardContext === 'PFZ_OVERVIEW' && queryTarget) {
      return `${queryTarget.toUpperCase()} · PFZ ACTIVE`
    }
    if (dashboardContext === 'RESTRICTED_ZONES' && queryTarget) {
      return `${queryTarget.toUpperCase()} · RESTRICTED ZONES`
    }
    if (dashboardContext === 'CYCLONE_TRACK') {
      return 'CYCLONE RADAR ACTIVE'
    }
    if (isUserLocationActive && !hasLiveMarineData) {
      return 'INLAND POSITION CLEAR'
    }
    return activeAssessment?.decisionLabel || 'SAFE TO DEPART'
  }, [dashboardContext, queryTarget, isUserLocationActive, hasLiveMarineData, activeAssessment])

  const loading = harborsLoading || safetyLoading || tidesLoading || pfzLoading || navigationLoading || boundariesLoading
  const hasApiError = Boolean(harborsError || safetyError || tidesError || pfzError || navigationError || boundariesError)

  // Mobile Viewport Render (< 768px) - Clean, Single Header, No Scroll
  if (isMobile) {
    return (
      <ErrorBoundary>
        <div className="app-shell app-shell--mobile">
          <MobileLayout
            harbor={selectedHarbor}
            harbors={harbors}
            onSelectHarbor={handleSelectHarbor}
            onSelectUserLocation={handleSelectUserLocation}
            onSetInlandLocation={handleSetInlandLocation}
            onDisengageInland={() => setIsUserLocationActive(false)}
            isUserLocationActive={isUserLocationActive}
            userLocationTag={userLocationTag}
            hasLiveMarineData={hasLiveMarineData}
            liveWeather={liveWeatherData}
            safetyData={effectiveSafetyData}
            safetyHistory={safetyHistory}
            assessment={activeAssessment}
            operationalStatus={operationalStatus}
            dashboardContext={dashboardContext}
            queryTarget={queryTarget}
            cardUpdates={cardUpdates}
            onOpenAssessment={() => setAssessmentModalOpen(true)}
            loading={loading}
            hasApiError={hasApiError}
            tides={tides}
            tideMeta={tideMeta}
            advisories={effectiveAdvisories}
            routes={routes}
            restrictedZones={effectiveZones}
            maritimeBoundaries={maritimeBoundaries}
            selectedRouteId={selectedRouteId || activeAssessment?.selectedRoute?.advisory_id}
            onSelectRoute={setSelectedRouteId}
            mapFocusTarget={mapFocusTarget}
            userLocation={userLocation}
            messages={messages}
            onAddMessage={handleAddMessage}
            onTriggerKeralaDemo={handleTriggerKeralaDemo}
            onMapFocus={setMapFocusTarget}
            onUpdateDynamicAdvisories={setDynamicAdvisories}
            onUpdateDynamicZones={setDynamicZones}
            onUpdateDashboardIntent={handleUpdateDashboardIntent}
            onUpdateCardUpdates={setCardUpdates}
            onUpdateQueryTarget={setQueryTarget}
            globalTelemetry={globalTelemetry}
            onApplyAIResponse={applyAIResponse}
          />

          {assessmentModalOpen && (
            <Suspense fallback={null}>
              <AssessmentModal
                isOpen={assessmentModalOpen}
                onClose={() => setAssessmentModalOpen(false)}
                harbor={selectedHarbor}
                assessment={activeAssessment}
                onOpenRoutes={() => {
                  const btn = document.querySelector('.map-section__route-btn')
                  if (btn) btn.click()
                }}
              />
            </Suspense>
          )}
        </div>
      </ErrorBoundary>
    )
  }

  // Desktop Viewport Render (>= 768px) - 100% Preserved Desktop Layout
  return (
    <ErrorBoundary>
      <div className="app">
        {/* Accessibility: Skip to main content landmark */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Main Workspace: Semantic Landmark */}
        <main className="app__main" id="main-content">
          <TopBar
            harbor={selectedHarbor}
            harbors={harbors}
            onSelectHarbor={handleSelectHarbor}
            onSelectUserLocation={handleSelectUserLocation}
            isUserLocationActive={isUserLocationActive}
            userLocationTag={userLocationTag}
            hasLiveMarineData={hasLiveMarineData}
            userLocation={userLocation}
            safetyData={effectiveSafetyData}
            assessment={activeAssessment}
            operationalStatus={operationalStatus}
            onOpenAssessment={() => setAssessmentModalOpen(true)}
            loading={loading}
            hasApiError={hasApiError}
            globalTelemetry={globalTelemetry}
            tides={tides}
            dashboardContext={dashboardContext}
            queryTarget={queryTarget}
            mapFocusTarget={mapFocusTarget}
          />

        <div className="app__content">
          <MapSection
            harbor={selectedHarbor}
            harbors={harbors}
            onSelectHarbor={handleSelectHarbor}
            safetyData={effectiveSafetyData}
            advisories={effectiveAdvisories}
            routes={routes}
            restrictedZones={effectiveZones}
            maritimeBoundaries={maritimeBoundaries}
            selectedRouteId={selectedRouteId || activeAssessment?.selectedRoute?.advisory_id}
            onSelectRoute={setSelectedRouteId}
            assessment={activeAssessment}
            onOpenAssessment={() => setAssessmentModalOpen(true)}
            loading={loading}
            hasApiError={hasApiError}
            mapFocusTarget={mapFocusTarget}
            userLocation={userLocation}
            isUserLocationActive={isUserLocationActive}
            hasLiveMarineData={hasLiveMarineData}
            liveWeather={liveWeatherData}
          />
          <TopicCardsGrid
            harbor={selectedHarbor}
            safetyData={effectiveSafetyData}
            safetyHistory={safetyHistory}
            tides={tides}
            tideMeta={tideMeta}
            loading={loading}
            hasLiveMarineData={hasLiveMarineData}
            userLocation={userLocation}
            isUserLocationActive={isUserLocationActive}
            dashboardContext={dashboardContext}
            queryTarget={queryTarget}
            cardUpdates={cardUpdates}
            advisories={effectiveAdvisories}
            restrictedZones={effectiveZones}
            routes={routes}
          />
        </div>
      </main>

      {/* AI Assistant Co-Pilot with Navigation Decision Widget */}
      <ChatPanel
        harbor={selectedHarbor}
        harbors={harbors}
        safetyData={effectiveSafetyData}
        tides={tides}
        advisories={effectiveAdvisories}
        messages={messages}
        onAddMessage={handleAddMessage}
        assessment={activeAssessment}
        operationalStatus={operationalStatus}
        selectedRoute={activeAssessment?.selectedRoute}
        onOpenAssessment={() => setAssessmentModalOpen(true)}
        hasApiError={hasApiError}
        onTriggerKeralaDemo={handleTriggerKeralaDemo}
        onSelectHarbor={handleSelectHarbor}
        onSelectUserLocation={handleSelectUserLocation}
        onSetInlandLocation={handleSetInlandLocation}
        onDisengageInland={() => setIsUserLocationActive(false)}
        isUserLocationActive={isUserLocationActive}
        userLocationTag={userLocationTag}
        userLocation={userLocation}
        onMapFocus={setMapFocusTarget}
        onUpdateDynamicAdvisories={setDynamicAdvisories}
        onUpdateDynamicZones={setDynamicZones}
        onUpdateDashboardIntent={handleUpdateDashboardIntent}
        onUpdateCardUpdates={setCardUpdates}
        onUpdateQueryTarget={setQueryTarget}
        onApplyAIResponse={applyAIResponse}
      />

      {/* Unified Departure & Route Assessment Breakdown Modal */}
      {assessmentModalOpen && (
        <Suspense fallback={null}>
          <AssessmentModal
            isOpen={assessmentModalOpen}
            onClose={() => setAssessmentModalOpen(false)}
            harbor={selectedHarbor}
            assessment={activeAssessment}
            onOpenRoutes={() => {
              const btn = document.querySelector('.map-section__route-btn')
              if (btn) btn.click()
            }}
          />
        </Suspense>
      )}
    </div>
    </ErrorBoundary>
  )
}
