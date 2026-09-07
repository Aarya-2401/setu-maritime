import { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import TopBar from './components/TopBar/TopBar'
import MapSection from './components/MapSection/MapSection'
import TopicCardsGrid from './components/TopicCards/TopicCardsGrid'
import ChatPanel from './components/ChatPanel/ChatPanel'
import { calculateGlobalAssessment } from './data/decisionLogic'

const Sidebar = lazy(() => import('./components/Sidebar/Sidebar'))
const AssessmentModal = lazy(() => import('./components/Modal/AssessmentModal'))
import { CHAT_HISTORY } from './data/mockData'
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

  // Retractable Drawer Sidebar State
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Chat State Management
  const [chatHistory, setChatHistory] = useState(CHAT_HISTORY)
  const [activeChatId, setActiveChatId] = useState('c1')
  const [chatSessions, setChatSessions] = useState({
    c1: [
      {
        id: 'm1',
        role: 'assistant',
        text: 'Welcome to SETU-ADAM01. I can summarize the selected harbor’s route, weather, tide, and PFZ data when those feeds are available.',
        time: '09:40 AM'
      }
    ]
  })

  // Start a new chat session
  function handleNewChat() {
    const newId = `c_${Date.now()}`
    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const newSession = {
      id: newId,
      title: `Mission ${chatHistory.length + 1} (${selectedHarbor?.landing_center_name || 'Coast'})`,
      time: timeStr,
    }
    setChatHistory((prev) => [newSession, ...prev])
    setActiveChatId(newId)
    setChatSessions((prev) => ({
      ...prev,
      [newId]: [
        {
          id: `init_${Date.now()}`,
          role: 'assistant',
          text: `New consultation session initialized for ${selectedHarbor?.landing_center_name || 'harbor'}. Ask about the available route, weather, tide, or PFZ data.`,
          time: timeStr
        }
      ]
    }))
  }

  // Switch active chat session
  function handleSelectChat(id) {
    setActiveChatId(id)
    if (!chatSessions[id]) {
      setChatSessions((prev) => ({
        ...prev,
        [id]: [
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            text: `Restored past mission query: "${chatHistory.find((c) => c.id === id)?.title || 'Consultation'}"`,
            time: 'Earlier'
          }
        ]
      }))
    }
  }

  // Delete an individual chat session from history
  function handleDeleteChat(id) {
    setChatHistory((prev) => {
      const remaining = prev.filter((c) => c.id !== id)
      if (activeChatId === id) {
        if (remaining.length > 0) {
          setActiveChatId(remaining[0].id)
        } else {
          // If all deleted, generate a fresh clean consultation
          const newId = `c_${Date.now()}`
          const now = new Date()
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const freshSession = {
            id: newId,
            title: `Mission 1 (${selectedHarbor?.landing_center_name || 'Coast'})`,
            time: timeStr,
          }
          setActiveChatId(newId)
          setChatSessions({
            [newId]: [
              {
                id: `init_${Date.now()}`,
                role: 'assistant',
                text: 'New consultation session initialized. Ask about the available route, weather, tide, or PFZ data.',
                time: timeStr
              }
            ]
          })
          return [freshSession]
        }
      }
      return remaining
    })

    setChatSessions((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
  }

  // Active messages for the selected chat
  const currentMessages = chatSessions[activeChatId] || []

  function handleAddMessage(msg) {
    setChatSessions((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), msg]
    }))
  }

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

  // Query live MySQL Views for the selected harbor - parallelized from t=0 (no waterfall waiting on useHarbors)
  const { data: safetyData, history: safetyHistory, loading: safetyLoading, error: safetyError } =
    useSafetyNowcast(selectedHarborId)
  const { tides, tideMeta, loading: tidesLoading, error: tidesError } = useTides(selectedHarborId)
  const { advisories, loading: pfzLoading, error: pfzError } = usePFZAdvisories(selectedHarborId)
  const { routes, restrictedZones, loading: navigationLoading, error: navigationError } = useNavigationRoutes(selectedHarborId)
  const { boundaries: maritimeBoundaries, loading: boundariesLoading, error: boundariesError } = useMaritimeBoundaries()

  // Global Maritime Keyboard Shortcuts: M (Map), A (Assessment), R (Routes), S (Sidebar), ? (Copilot), Esc (Close)
  useEffect(() => {
    function handleKeyDown(e) {
      // Do not trigger if user is typing in an input, textarea, select, or editable element
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
        return;
      }

      const key = e.key;

      if (key === 'm' || key === 'M') {
        e.preventDefault();
        const expandBtn = document.querySelector('.map-section__expand-btn');
        if (expandBtn) expandBtn.click();
      } else if (key === 'a' || key === 'A') {
        e.preventDefault();
        setAssessmentModalOpen((prev) => !prev);
      } else if (key === 'r' || key === 'R') {
        e.preventDefault();
        const routeBtn = document.querySelector('.map-section__route-btn');
        if (routeBtn) routeBtn.click();
      } else if (key === 's' || key === 'S') {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      } else if (key === '?') {
        e.preventDefault();
        const chatInput = document.querySelector('.chat-panel__input');
        if (chatInput) {
          chatInput.focus();
        }
      } else if (key === 'Escape') {
        setSidebarOpen(false);
        setAssessmentModalOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  return (
    <div className="app">
      {/* Accessibility: Skip to main content landmark */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Floating Animated Drawer Overlay */}
      {sidebarOpen && (
        <Suspense fallback={null}>
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            chatHistory={chatHistory}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
          />
        </Suspense>
      )}


      {/* Main Workspace: Semantic Landmark */}
      <main className="app__main" id="main-content">
        <TopBar
          harbor={selectedHarbor}
          harbors={harbors}
          onSelectHarbor={handleSelectHarbor}
          safetyData={safetyData}
          assessment={globalAssessment}
          onOpenAssessment={() => setAssessmentModalOpen(true)}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
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
        messages={currentMessages}
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
