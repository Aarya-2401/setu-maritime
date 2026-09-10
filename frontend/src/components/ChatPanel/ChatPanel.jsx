import { useEffect, useRef, useState } from 'react'
import { QUICK_PROMPTS } from '../../data/mockData'
import { calculateETA } from '../../data/decisionLogic'
import { getUNLocode, getFormattedHarborTag } from '../../data/harborCodes'
import { detectInlandLocation } from '../../data/inlandDetector'
import { askOrcaAI } from '../../services/aiService'
import { IconRadar, IconSend } from '../Icons'
import './ChatPanel.css'

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getUUID() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

// Natural conversational assistance coordinating title cards and map updates
function buildReply(question, harbor, safetyData, tides, advisories) {
  const harborName = harbor?.landing_center_name || 'your harbor'
  const isSafe = (safetyData?.composite_safety_rating || '').toUpperCase().includes('SAFE')
  const pfzTop = advisories && advisories.length > 0 ? advisories[0] : null
  const pfzInfo = pfzTop
    ? `INCOIS has mapped productive fishing zones roughly ${pfzTop.distance_km} km offshore targeting ${pfzTop.target_species}`
    : `no severe weather advisories are reported in this coastal sector`

  if (isSafe) {
    return `Yes, conditions look favorable for heading out near ${harborName} tomorrow. The sea state and surface winds are comfortable, and ${pfzInfo}. I have updated your dashboard title cards with the live weather, wind, wave, and tide telemetry, and centered the radar map on ${harborName}.`
  } else {
    return `I would recommend exercising caution or holding off on departures near ${harborName} tomorrow due to elevated coastal conditions. I have updated the title cards above with the latest wind and wave readings so you can track conditions closely.`
  }
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, marginTop: '2px' }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function ChatPanel({
  harbor,
  harbors,
  safetyData,
  tides,
  advisories,
  messages,
  onAddMessage,
  assessment,
  selectedRoute,
  onOpenAssessment,
  hasApiError,
  onTriggerKeralaDemo,
  onSelectHarbor,
  onSelectUserLocation,
  onSetInlandLocation,
  isUserLocationActive = false,
  userLocationTag,
  userLocation,
  onMapFocus,
  isMobile = false
}) {
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [showCopilotCard, setShowCopilotCard] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  async function sendMessage(text) {
    const trimmed = text.trim()
    if (!trimmed) return

    const userMsg = { id: getUUID(), role: 'user', text: trimmed, time: timeNow() }
    onAddMessage(userMsg)
    setInput('')
    setTyping(true)

    // Check if query refers to user location or an inland location
    const inlandMatch = detectInlandLocation(trimmed)
    if (inlandMatch?.isUserPositionQuery && onSelectUserLocation) {
      onSelectUserLocation()
    } else if (inlandMatch && onSetInlandLocation) {
      onSetInlandLocation(inlandMatch)
    }

    // Proactively detect harbor/location mentions in user prompt against loaded 56 harbors
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
        // Agentic AI manipulation of dashboard components based on user intent:
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

        const replySuggestions = (aiResponse.suggestions && aiResponse.suggestions.length > 0)
          ? aiResponse.suggestions
          : (inlandMatch ? inlandMatch.suggestions : [])

        const reply = {
          id: getUUID(),
          role: 'assistant',
          text: aiResponse.answer,
          time: timeNow(),
          suggestions: replySuggestions
        }
        onAddMessage(reply)
        setTyping(false)
        return
      }
    } catch (err) {
      console.warn('AI endpoint unavailable, using local maritime telemetry engine:', err.message)
    }

    // Fallback response: if inland detected, update dashboard and provide clear guidance
    if (inlandMatch) {
      setTimeout(() => {
        const place = inlandMatch.place
        const reply = {
          id: getUUID(),
          role: 'assistant',
          text: `${place} is an inland location with no open coastline. I have updated your dashboard title cards with the live local weather and surface winds for ${place}, centered your locality radar map on ${place}, and maintained Veraval Fishing Harbor, Gujarat as your regional maritime reference point.`,
          time: timeNow(),
          suggestions: inlandMatch.suggestions
        }
        onAddMessage(reply)
        setTyping(false)
      }, 450)
      return
    }

    setTimeout(() => {
      const reply = {
        id: getUUID(),
        role: 'assistant',
        text: buildReply(trimmed, detectedHarbor || harbor, safetyData, tides, advisories),
        time: timeNow(),
      }
      onAddMessage(reply)
      setTyping(false)
    }, 450)
  }

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

  // Determine if a real conversation has started (beyond the initial system marker)
  const hasConversation = messages && messages.some((m) => m.role === 'user' || m.role === 'assistant')

  return (
    <aside className="chat-panel" aria-label="SETU Adam-01 Copilot">
      <div className="chat-panel__header">
        <div className="chat-panel__title-row" title="SETU Adam-01 Autonomous Maritime Intelligence">
          <div className="chat-panel__logo-wrap">
            <img src="/favicon-512x512.png" alt="SETU E6" className="chat-panel__logo-img" />
          </div>
          <div className="chat-panel__brand-block">
            <span className="chat-panel__brand-title">SETU</span>
            <span className="chat-panel__brand-code">Adam-01</span>
          </div>
        </div>
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
      </div>

      {/* SETU-ADAM01 Navigation Decision Copilot Widget */}
      {showCopilotCard && (
        <div className="copilot-decision-card">
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

        {onOpenAssessment && (
          <div className="copilot-decision-card__actions">
            <button className="copilot-action-btn" onClick={onOpenAssessment}>
              Inspect Assessment Factors
            </button>
          </div>
        )}
      </div>
      )}

      {hasConversation ? (
        <>
          <div className="chat-panel__messages" ref={scrollRef}>
            {messages && messages.filter((m) => m.role !== 'system').map((m) => {
              const suggestionsList = (m.suggestions && m.suggestions.length > 0)
                ? m.suggestions
                : (m.text && (m.text.includes('suggestions below') || m.text.includes('inland region') || m.text.includes('could not find a recognized fishing harbor') || m.text.includes('coastal maritime state')))
                ? ['Veraval', 'Mumbai', 'Kochi', 'Paradip', 'Visakhapatnam', 'Chennai']
                : []

              return (
                <div key={m.id} className={`chat-msg chat-msg--${m.role}`}>
                  <div className="chat-msg__bubble">
                    <p>{m.text}</p>
                    {suggestionsList && suggestionsList.length > 0 && (
                      <div className="chat-msg__suggestions">
                        <span className="chat-msg__suggestions-label">Try a supported location:</span>
                        <div className="chat-msg__suggestions-chips">
                          {suggestionsList.slice(0, 5).map((sug, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="chat-msg__suggestion-btn"
                              onClick={() => sendMessage(sug)}
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <span className="chat-msg__time">{m.time}</span>
                  </div>
                </div>
              )
            })}

            {typing && (
              <div className="chat-msg chat-msg--assistant">
                <div className="chat-msg__bubble chat-msg__bubble--typing">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            )}
          </div>

          <div className="chat-panel__quick">
            {QUICK_PROMPTS.map((p) => (
              <button key={p} className="chat-panel__quick-chip" onClick={() => sendMessage(p)}>
                {p}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="chat-empty-state" ref={scrollRef}>
          <div className="chat-empty-state__content">
            <span className="chat-empty-state__section-label">MARITIME COPILOT</span>

            <p className="chat-empty-state__standing-by">
              SETU-ADAM01 is standing by.
            </p>
            <p className="chat-empty-state__scope">
              Ask about departure safety, weather, waves, tides, PFZs, or recommended sailing routes for your selected harbor.
            </p>

            <div className="chat-empty-state__harbor-context">
              <span className="chat-empty-state__harbor-label">SELECTED HARBOR</span>
              <span className="chat-empty-state__harbor-name">
                {harbor?.landing_center_name || 'Harbor loading...'}
                {harbor?.state ? ` · ${harbor.state}` : ''}
              </span>
            </div>

            <div className="chat-empty-state__actions">
              <button
                type="button"
                className="chat-action chat-action--primary"
                onClick={() => sendMessage('Is it safe to depart?')}
              >
                Is it safe to depart?
              </button>
              <div className="chat-empty-state__actions-row">
                <button
                  type="button"
                  className="chat-action chat-action--secondary"
                  onClick={() => sendMessage('Recommended route')}
                >
                  Recommended route
                </button>
                <button
                  type="button"
                  className="chat-action chat-action--secondary"
                  onClick={() => sendMessage('Nearest PFZ')}
                >
                  Nearest PFZ
                </button>
              </div>
              <div className="chat-empty-state__actions-row">
                <button
                  type="button"
                  className="chat-action chat-action--secondary"
                  onClick={() => sendMessage('Weather conditions')}
                >
                  Weather conditions
                </button>
                <button
                  type="button"
                  className="chat-action chat-action--secondary"
                  onClick={() => sendMessage('Tide forecast')}
                >
                  Tide forecast
                </button>
                <button
                  type="button"
                  className="chat-action chat-action--secondary"
                  onClick={() => sendMessage('Active alerts')}
                >
                  Active alerts
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <form
        className="chat-panel__input-row"
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage(input)
        }}
      >
        <div className="chat-panel__input-wrap">
          <input
            className="chat-panel__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${harbor?.landing_center_name || 'this harbor'}...`}
            title={`Ask about ${harbor?.landing_center_name || 'this harbor'}`}
            aria-label={`Ask about ${harbor?.landing_center_name || 'this harbor'}`}
          />
        </div>
        <button type="submit" className="chat-panel__send" aria-label="Send message">
          <IconSend size={13} color="#04121a" />
        </button>
      </form>
    </aside>
  )
}
