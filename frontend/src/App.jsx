import { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import TopBar from './components/TopBar/TopBar'
import MapSection from './components/MapSection/MapSection'
import TopicCardsGrid from './components/TopicCards/TopicCardsGrid'
import ChatPanel from './components/ChatPanel/ChatPanel'
import { calculateGlobalAssessment, evaluateUserLocationAssessment } from './data/decisionLogic'
import { fetchLiveWeather, getCityStateAbbr } from './data/liveWeather'
import MobileLayout from './components/Mobile/MobileLayout'
import { useIsMobile } from './components/Mobile/useIsMobile'

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

  const isMobile = useIsMobile(768)

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

        // Smoothly center the map on the user's detected coordinates
        setMapFocusTarget({
          lat,
          lon,
          zoom: 10,
          label: 'User Detected Position',
          timestamp: Date.now()
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
      setMapFocusTarget({
        lat: userLocation.lat,
        lon: userLocation.lon,
        zoom: 10,
        label: 'User Detected Position',
        timestamp: Date.now()
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Reset selected route and target focus when harbor changes
  function handleSelectHarbor(id) {
    setSelectedHarborId(id)
    setIsUserLocationActive(false)
    setSelectedRouteId(null)
    setMapFocusTarget(null)
  }

  // Switch to user location view
  function handleSelectUserLocation() {
    setIsUserLocationActive(true)
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
    const lat = inlandObj.lat || (userLocation?.lat ? Number(userLocation.lat) : 26.9124)
    const lon = inlandObj.lon || (userLocation?.lon ? Number(userLocation.lon) : 75.7873)
    const label = inlandObj.label || (inlandObj.state ? `${inlandObj.place || inlandObj.city}, ${inlandObj.state}` : (inlandObj.place || 'Inland Position'))
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

  // Unified single source of truth for departure decision and factor evaluation
  const globalAssessment = useMemo(() => {
    return calculateGlobalAssessment({
      harbor: selectedHarbor,
      safetyData,
      routes,
      restrictedZones,
      selectedRouteId,
      tides
    })
  }, [selectedHarbor, safetyData, routes, restrictedZones, selectedRouteId, tides])

  // Dynamic active assessment: if inland user location is active, tailor assessment to inland position
  const activeAssessment = useMemo(() => {
    if (isUserLocationActive && !hasLiveMarineData) {
      return evaluateUserLocationAssessment(userLocation, liveWeatherData, selectedHarbor)
    }
    return globalAssessment
  }, [isUserLocationActive, hasLiveMarineData, userLocation, liveWeatherData, selectedHarbor, globalAssessment])

  const loading = harborsLoading || safetyLoading || tidesLoading || pfzLoading || navigationLoading || boundariesLoading
  const hasApiError = Boolean(harborsError || safetyError || tidesError || pfzError || navigationError || boundariesError)

  // Mobile Viewport Render (< 768px)
  if (isMobile) {
    return (
      <div className="app app--mobile">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <MobileLayout
          harbor={selectedHarbor}
          harbors={harbors}
          onSelectHarbor={handleSelectHarbor}
          onSelectUserLocation={handleSelectUserLocation}
          onSetInlandLocation={handleSetInlandLocation}
          isUserLocationActive={isUserLocationActive}
          userLocationTag={userLocationTag}
          hasLiveMarineData={hasLiveMarineData}
          liveWeather={liveWeatherData}
          safetyData={effectiveSafetyData}
          safetyHistory={safetyHistory}
          assessment={activeAssessment}
          onOpenAssessment={() => setAssessmentModalOpen(true)}
          loading={loading}
          hasApiError={hasApiError}
          tides={tides}
          tideMeta={tideMeta}
          advisories={advisories}
          routes={routes}
          restrictedZones={restrictedZones}
          maritimeBoundaries={maritimeBoundaries}
          selectedRouteId={selectedRouteId || activeAssessment?.selectedRoute?.advisory_id}
          onSelectRoute={setSelectedRouteId}
          mapFocusTarget={mapFocusTarget}
          userLocation={userLocation}
          messages={messages}
          onAddMessage={handleAddMessage}
          onTriggerKeralaDemo={handleTriggerKeralaDemo}
          onMapFocus={setMapFocusTarget}
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
    )
  }

  // Desktop Viewport Render (>= 768px) - 100% Preserved Desktop Layout
  return (
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
          onOpenAssessment={() => setAssessmentModalOpen(true)}
          loading={loading}
          hasApiError={hasApiError}
        />

        <div className="app__content">
          <MapSection
            harbor={selectedHarbor}
            harbors={harbors}
            onSelectHarbor={handleSelectHarbor}
            safetyData={effectiveSafetyData}
            advisories={advisories}
            routes={routes}
            restrictedZones={restrictedZones}
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
          />
        </div>
      </main>

      {/* AI Assistant Co-Pilot with Navigation Decision Widget */}
      <ChatPanel
        harbor={selectedHarbor}
        harbors={harbors}
        safetyData={effectiveSafetyData}
        tides={tides}
        advisories={advisories}
        messages={messages}
        onAddMessage={handleAddMessage}
        assessment={activeAssessment}
        selectedRoute={activeAssessment?.selectedRoute}
        onOpenAssessment={() => setAssessmentModalOpen(true)}
        hasApiError={hasApiError}
        onTriggerKeralaDemo={handleTriggerKeralaDemo}
        onSelectHarbor={handleSelectHarbor}
        onSelectUserLocation={handleSelectUserLocation}
        onSetInlandLocation={handleSetInlandLocation}
        isUserLocationActive={isUserLocationActive}
        userLocationTag={userLocationTag}
        userLocation={userLocation}
        onMapFocus={setMapFocusTarget}
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
  )
}
