import { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import TopBar from './components/TopBar/TopBar'
import MapSection from './components/MapSection/MapSection'
import TopicCardsGrid from './components/TopicCards/TopicCardsGrid'
import ChatPanel from './components/ChatPanel/ChatPanel'
import { calculateGlobalAssessment } from './data/decisionLogic'
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
  const [selectedRouteId, setSelectedRouteId] = useState(null)
  const [mapFocusTarget, setMapFocusTarget] = useState(null)
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
  const [userLocation, setUserLocation] = useState(null)

  const isMobile = useIsMobile(768)

  // Single flat messages state for active consultation session
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      role: 'assistant',
      text: 'Welcome to SETU-ADAM01. I can summarize the selected harbor’s route, weather, tide, and PFZ data when those feeds are available.',
      time: '09:40 AM'
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
            setUserLocation({ lat, lon, label, city, state })
          })
          .catch(() => {
            if (!active) return
            setUserLocation({ lat, lon, label: 'Current Location' })
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
    setSelectedRouteId(null)
    setMapFocusTarget(null)
    setUserLocation((prev) => (prev ? { ...prev, label: null } : null))
  }

  // Demonstration trigger: Synchronous maritime consultation switch & seamless map zoom to Kerala PFZ
  function handleTriggerKeralaDemo() {
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
          safetyData={safetyData}
          safetyHistory={safetyHistory}
          assessment={globalAssessment}
          onOpenAssessment={() => setAssessmentModalOpen(true)}
          loading={loading}
          hasApiError={hasApiError}
          tides={tides}
          tideMeta={tideMeta}
          advisories={advisories}
          routes={routes}
          restrictedZones={restrictedZones}
          maritimeBoundaries={maritimeBoundaries}
          selectedRouteId={selectedRouteId || globalAssessment?.selectedRoute?.advisory_id}
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
              assessment={globalAssessment}
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
          safetyData={safetyData}
          assessment={globalAssessment}
          onOpenAssessment={() => setAssessmentModalOpen(true)}
          loading={loading}
          hasApiError={hasApiError}
        />

        <div className="app__content">
          <MapSection
            harbor={selectedHarbor}
            harbors={harbors}
            onSelectHarbor={handleSelectHarbor}
            safetyData={safetyData}
            advisories={advisories}
            routes={routes}
            restrictedZones={restrictedZones}
            maritimeBoundaries={maritimeBoundaries}
            selectedRouteId={selectedRouteId || globalAssessment?.selectedRoute?.advisory_id}
            onSelectRoute={setSelectedRouteId}
            assessment={globalAssessment}
            onOpenAssessment={() => setAssessmentModalOpen(true)}
            loading={loading}
            hasApiError={hasApiError}
            mapFocusTarget={mapFocusTarget}
            userLocation={userLocation}
          />
          <TopicCardsGrid
            harbor={selectedHarbor}
            safetyData={safetyData}
            safetyHistory={safetyHistory}
            tides={tides}
            tideMeta={tideMeta}
            loading={loading}
          />
        </div>
      </main>

      {/* AI Assistant Co-Pilot with Navigation Decision Widget */}
      <ChatPanel
        harbor={selectedHarbor}
        harbors={harbors}
        safetyData={safetyData}
        tides={tides}
        advisories={advisories}
        messages={messages}
        onAddMessage={handleAddMessage}
        assessment={globalAssessment}
        selectedRoute={globalAssessment?.selectedRoute}
        onOpenAssessment={() => setAssessmentModalOpen(true)}
        hasApiError={hasApiError}
        onTriggerKeralaDemo={handleTriggerKeralaDemo}
        onSelectHarbor={handleSelectHarbor}
        onMapFocus={setMapFocusTarget}
      />

      {/* Unified Departure & Route Assessment Breakdown Modal */}
      {assessmentModalOpen && (
        <Suspense fallback={null}>
          <AssessmentModal
            isOpen={assessmentModalOpen}
            onClose={() => setAssessmentModalOpen(false)}
            harbor={selectedHarbor}
            assessment={globalAssessment}
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
