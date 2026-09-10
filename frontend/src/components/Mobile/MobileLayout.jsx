import { useState, useEffect, useMemo, useRef } from 'react'
import MapSection from '../MapSection/MapSection'
import {
  IconLocation,
  IconChevronDown,
  IconCloud,
  IconWind,
  IconWave,
  IconSun,
  IconSend,
  IconHome,
  IconMap,
  IconBell,
  IconMessageSquare
} from '../Icons'
import { detectInlandLocation } from '../../data/inlandDetector'
import { askOrcaAI } from '../../services/aiService'
import { QUICK_PROMPTS } from '../../data/mockData'
import './MobileLayout.css'

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

export default function MobileLayout({
  harbor,
  harbors,
  onSelectHarbor,
  safetyData,
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
  const [chatInput, setChatInput] = useState('')
  const [typing, setTyping] = useState(false)
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
    if (userLocation?.label) return userLocation.label
    if (harbor?.landing_center_name && harbor?.state) {
      return `${harbor.landing_center_name}, ${harbor.state}`
    }
    if (harbor?.landing_center_name) return harbor.landing_center_name
    return 'Jaipur, Rajasthan'
  }, [userLocation, harbor])

  // Telemetry metric formatting
  const airTemp = safetyData?.air_temp_celsius != null ? Math.round(safetyData.air_temp_celsius) : null
  const tempVal = airTemp != null ? `${airTemp} °C` : '-- °C'

  const windKnots =
    safetyData?.wind_speed_kmph != null
      ? Math.round(Number(safetyData.wind_speed_kmph) * 0.539957)
      : null
  const windVal = windKnots != null ? `${windKnots} kn` : '-- kn'

  const waveHeight =
    safetyData?.significant_wave_height_m != null
      ? Number(safetyData.significant_wave_height_m).toFixed(1)
      : null
  const waveVal = waveHeight != null ? `${waveHeight} m` : '-- m'

  const timeVal = formatCurrentTime(currentTime)
  const dateVal = formatCurrentDate(currentTime)

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

    // Check if query targets an inland non-maritime region
    const inlandMatch = detectInlandLocation(trimmed)

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
        if (aiResponse.locationStatus === 'SUPPORTED' || aiResponse.locationStatus === 'COASTAL_STATE') {
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
        const reply = {
          id: getMessageUUID(),
          role: 'assistant',
          text: `${inlandMatch.place} is an inland location with no maritime coast or marine fishing harbor. SETU monitors coastal operations across recognized fishing harbors. Try selecting a nearby harbor:`,
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
    <div className="mobile-layout">
      {/* 1. Header Row */}
      <header className="mobile-header">
        <div className="mobile-header__brand" title="SETU-ADAM01 Maritime Intelligence">
          <img
            src="/favicon-512x512.png"
            alt="SETU-ADAM01"
            className="mobile-header__logo"
          />
          <span className="mobile-header__title">SETU-ADAM01</span>
        </div>

        <div className="mobile-header__location-pill" title="Tap to select fishing harbor">
          <IconLocation size={13} color="#38bdf8" />
          <span className="mobile-header__location-text">{locationText}</span>
          <IconChevronDown size={10} color="#94a3b8" />

          {/* Native select overlay for modal-free harbor selection */}
          <select
            className="mobile-header__select-overlay"
            value={harbor?.harbor_id || ''}
            onChange={(e) => onSelectHarbor(Number(e.target.value))}
            aria-label="Select harbor location"
          >
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

      {/* 2. Four Telemetry Information Cards */}
      <section className="mobile-telemetry-grid" aria-label="Harbor telemetry cards">
        <div className="mobile-telemetry-card">
          <div className="mobile-telemetry-card__top">
            <span className="mobile-telemetry-card__icon">
              <IconCloud size={14} color="#38bdf8" />
            </span>
            <span className="mobile-telemetry-card__value">{tempVal}</span>
          </div>
          <span className="mobile-telemetry-card__label">Air Temp</span>
        </div>

        <div className="mobile-telemetry-card">
          <div className="mobile-telemetry-card__top">
            <span className="mobile-telemetry-card__icon">
              <IconWind size={14} color="#38bdf8" />
            </span>
            <span className="mobile-telemetry-card__value">{windVal}</span>
          </div>
          <span className="mobile-telemetry-card__label">Wind Speed</span>
        </div>

        <div className="mobile-telemetry-card">
          <div className="mobile-telemetry-card__top">
            <span className="mobile-telemetry-card__icon">
              <IconWave size={14} color="#38bdf8" />
            </span>
            <span className="mobile-telemetry-card__value">{waveVal}</span>
          </div>
          <span className="mobile-telemetry-card__label">Wave Height</span>
        </div>

        <div className="mobile-telemetry-card">
          <div className="mobile-telemetry-card__top">
            <span className="mobile-telemetry-card__icon">
              <IconSun size={14} color="#f59e0b" />
            </span>
            <span className="mobile-telemetry-card__value">{timeVal}</span>
          </div>
          <span className="mobile-telemetry-card__label">{dateVal}</span>
        </div>
      </section>

      {/* 3. Live Map Section */}
      <section className="mobile-map-section" id="mobile-map-section" aria-label="Live Maritime Map">
        <div className="mobile-map-header">
          <div className="mobile-map-header__titles">
            <h3 className="mobile-map-title">Live Map</h3>
            <p className="mobile-map-subtitle">
              Wind · Waves · Fishing zones near {locationText}
            </p>
          </div>
          <div className="mobile-live-badge">
            <span className="mobile-live-dot" />
            <span className="mobile-live-text">Live</span>
          </div>
        </div>

        <div className="mobile-map-card">
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
            onOpenAssessment={onOpenAssessment}
            loading={loading}
            hasApiError={hasApiError}
            mapFocusTarget={mapFocusTarget}
            userLocation={userLocation}
            isMobile={true}
          />
        </div>
      </section>

      {/* 4. SETU Chatbot Section */}
      <section className="mobile-chat-section" id="mobile-chat-section" aria-label="SETU Maritime Assistant">
        <div className="mobile-chat-card">
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
              <span className="mobile-chat-subtitle">Adam-01</span>
            </div>
          </div>

          <div className="mobile-chat-messages" ref={chatScrollRef}>
            {messages &&
              messages.map((m) => (
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

          {/* Interactive Suggestion Pills */}
          <div className="mobile-chat-suggestions" role="group" aria-label="Quick suggested queries">
            {activeSuggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                className="mobile-suggestion-pill"
                onClick={() => handleSendMessage(sug)}
                onTouchStart={() => {}}
                disabled={typing}
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Rounded Input Field & Cyan Circular Send Button */}
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

      {/* 5. Fixed Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`mobile-nav-item ${activeNav === 'home' ? 'mobile-nav-item--active' : ''}`}
          onClick={() => {
            setActiveNav('home')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <IconHome size={18} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${activeNav === 'map' ? 'mobile-nav-item--active' : ''}`}
          onClick={() => {
            setActiveNav('map')
            document.getElementById('mobile-map-section')?.scrollIntoView({ behavior: 'smooth' })
          }}
        >
          <IconMap size={18} />
          <span>Map</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${activeNav === 'alerts' ? 'mobile-nav-item--active' : ''}`}
          onClick={() => {
            setActiveNav('alerts')
            if (onOpenAssessment) onOpenAssessment()
          }}
        >
          <IconBell size={18} />
          <span>Alerts</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${activeNav === 'chat' ? 'mobile-nav-item--active' : ''}`}
          onClick={() => {
            setActiveNav('chat')
            document.getElementById('mobile-chat-section')?.scrollIntoView({ behavior: 'smooth' })
            inputRef.current?.focus()
          }}
        >
          <IconMessageSquare size={18} />
          <span>Chat</span>
        </button>
      </nav>
    </div>
  )
}
