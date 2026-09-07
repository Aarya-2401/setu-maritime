import { useEffect } from 'react'
import { IconRadar, IconCompass } from '../Icons'
import {
  getFormattedHarborTag,
  getUNLocode,
  getHarborAuthority
} from '../../data/harborCodes'
import './AssessmentModal.css'

export default function AssessmentModal({
  isOpen,
  onClose,
  harbor,
  assessment,
  onOpenRoutes
}) {
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    const origOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = origOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [isOpen, onClose])

  if (!isOpen || !assessment) return null

  const decisionLabel = assessment?.decisionLabel || 'ASSESSMENT PENDING'
  const status = assessment?.status || 'PENDING'
  const tone = assessment?.tone || 'neutral'
  const color = assessment?.color || '#94a3b8'
  const factors = assessment?.factors || []
  const selectedRoute = assessment?.selectedRoute
  const actionableDirective = assessment?.actionableDirective || ''
  const dataFreshness = assessment?.dataFreshness || 'Live'

  const oceanFactors = factors.filter((f) => f.category === 'OPERATIONAL_OCEAN')
  const geoFactors = factors.filter((f) => f.category === 'GEOSPATIAL_REGULATORY')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content assessment-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header assessment-modal__header">
          <div className="modal-title-row">
            <span className="modal-icon">
              <IconRadar size={18} color="#35c9e8" />
            </span>
            <div>
              <h3 className="modal-title">Departure & Route Assessment</h3>
              <div className="assessment-modal__subtitle">
                {harbor ? `${harbor.landing_center_name || 'Harbor'} [${getUNLocode(harbor)} · ${getFormattedHarborTag(harbor)}] · ${getHarborAuthority(harbor)}` : 'Harbor unavailable'} · Feed: {dataFreshness}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-body assessment-modal__body">
        {/* Global Actionable Status Banner */}
        <div
          className={`assessment-banner assessment-banner--${tone}`}
          style={{ borderColor: `${color}40`, background: `${color}12` }}
        >
          <div className="assessment-banner__top">
            <span className="assessment-banner__dot" style={{ background: color }} />
            <span className="assessment-banner__decision" style={{ color }}>
              {decisionLabel}
            </span>
            <span className="assessment-banner__badge">
              {status === 'SAFE'
                ? 'OPERATIONAL CLEARANCE: GRANTED'
                : status === 'CAUTION'
                ? 'OPERATIONAL CLEARANCE: RESTRICTED'
                : status === 'DANGER'
                ? 'OPERATIONAL CLEARANCE: DENIED'
                : 'OPERATIONAL CLEARANCE: PENDING'}
            </span>
          </div>
          <p className="assessment-banner__directive">
            {actionableDirective}
          </p>
        </div>

        {/* Selected Route Summary (if present) */}
        {selectedRoute && (
          <div className="assessment-route-summary">
            <div className="assessment-route-summary__title">
              <IconCompass size={13} color="#35c9e8" />
              <span>Selected Candidate: <b>{selectedRoute.departure_harbor || 'Station'} → {selectedRoute.target_species || 'Target Zone'}</b></span>
            </div>
            <div className="assessment-route-summary__grid">
              <div>Bearing: <b>{selectedRoute.bearing_compass}</b></div>
              <div>Distance: <b>{selectedRoute.distance_nm} NM ({selectedRoute.distance_km} km)</b></div>
              <div>Status: <b style={{ color: selectedRoute.geofenceEvaluation?.badgeTone === 'bad' ? '#ef4444' : selectedRoute.geofenceEvaluation?.badgeTone === 'moderate' ? '#f59e0b' : '#10b981' }}>{selectedRoute.geofenceEvaluation?.status || 'CLEAR'}</b></div>
              <div>Nearest Reserve: <b>{selectedRoute.nearest_protected_zone || 'None'}</b></div>
            </div>
          </div>
        )}

        {/* Factor Evaluation Grid */}
        <div className="assessment-factors">
          {/* Column 1: Operational Marine Weather Envelope */}
          <div className="assessment-col">
            <div className="assessment-col__title">
              <span>Operational Ocean & Weather Envelope</span>
            </div>
            <div className="assessment-factor-list">
              {oceanFactors.map((f, i) => (
                <div key={i} className="assessment-factor-card">
                  <div className="assessment-factor-card__header">
                    <span className="assessment-factor-card__name">{f.name}</span>
                    <span className={`factor-pill factor-pill--${f.tone}`}>
                      {f.state} · {f.impact}
                    </span>
                  </div>
                  <div className="assessment-factor-card__metrics">
                    <span>Observed: <b>{f.value}</b></span>
                    <span className="assessment-factor-card__thresh">Limit: {f.threshold}</span>
                  </div>
                  <div className="assessment-factor-card__details">{f.details}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Legal Maritime Geospatial Clearance */}
          <div className="assessment-col">
            <div className="assessment-col__title">
              <span>Geospatial & Maritime Geofencing Verification</span>
            </div>
            <div className="assessment-factor-list">
              {geoFactors.map((f, i) => (
                <div key={i} className="assessment-factor-card">
                  <div className="assessment-factor-card__header">
                    <span className="assessment-factor-card__name">{f.name}</span>
                    <span className={`factor-pill factor-pill--${f.tone}`}>
                      {f.state}
                    </span>
                  </div>
                  <div className="assessment-factor-card__metrics">
                    <span>Check: <b>{f.value}</b></span>
                  </div>
                  <div className="assessment-factor-card__details">{f.details}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="assessment-modal__footer">
        {onOpenRoutes && (
          <button
            className="assessment-btn assessment-btn--outline"
            onClick={() => {
              onClose()
              onOpenRoutes()
            }}
          >
            Inspect All Route Options
          </button>
        )}
        <button className="assessment-btn assessment-btn--primary" onClick={onClose}>
          Acknowledge Assessment
        </button>
      </div>
    </div>
  </div>
  )
}
