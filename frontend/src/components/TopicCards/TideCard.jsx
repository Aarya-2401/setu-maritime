import { useState } from 'react'
import TopicCard from './TopicCard'
import ChartMini from './ChartMini'
import DetailModal from '../Modal/DetailModal'
import { IconTide } from '../Icons'

export default function TideCard({ harbor, safetyData, tides, tideMeta, loading }) {
  const [modalOpen, setModalOpen] = useState(false)
  const harborName = harbor?.landing_center_name || 'Harbor'
  const upcomingEvent = safetyData?.upcoming_tide_event || '--'
  const isReference = Boolean(tideMeta?.isReferenceStation)
  const referencePort = tideMeta?.referencePortName || (tides && tides.length > 0 ? tides[0].port_name : '')
  const distanceKm = tideMeta?.distanceKm

  // Extract values for the sparkline chart
  const values = tides && tides.length > 0
    ? tides.map((t) => Number(t.tide_height_meters))
    : []

  // Find High and Low points
  const highTide = tides && tides.length > 0
    ? tides.filter((t) => t.tide_phase === 'HIGH' || t.tide_phase === 'H')[0] ||
      tides.reduce((a, b) => (Number(b.tide_height_meters) > Number(a.tide_height_meters) ? b : a))
    : null

  const lowTide = tides && tides.length > 0
    ? tides.filter((t) => t.tide_phase === 'LOW' || t.tide_phase === 'L')[0] ||
      tides.reduce((a, b) => (Number(b.tide_height_meters) < Number(a.tide_height_meters) ? b : a))
    : null

  const formatTime = (dtStr) => {
    if (!dtStr) return '--'
    try {
      const d = new Date(dtStr)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return dtStr
    }
  }

  const formatDate = (dtStr) => {
    if (!dtStr) return '--'
    try {
      const d = new Date(dtStr)
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return dtStr
    }
  }

  const currentTideHeight = tides && tides.length > 0 ? Number(tides[0].tide_height_meters) : null
  const draftStatus = currentTideHeight == null ? '--' : currentTideHeight >= 0.8 ? 'OPTIMAL' : 'CAUTION LOW'
  const draftTone = currentTideHeight == null ? 'neutral' : currentTideHeight >= 0.8 ? 'good' : 'moderate'

  return (
    <>
      <TopicCard
        icon={<IconTide size={16} color="#35c9e8" />}
        title={`Tide (${harborName.split(' ')[0]})`}
        loading={loading}
        footer={
          <>
            <div className="topic-card__impact-tag">
              <span className="impact-lbl">Draft:</span>
              <span className={`impact-pill impact-pill--${draftTone}`}>{draftStatus}</span>
            </div>
            <button className="topic-card__link" onClick={() => setModalOpen(true)}>
              View Tidal Chart →
            </button>
          </>
        }
      >
        <div className="tide-card__chart">
          {values.length > 1 ? <ChartMini points={values} color="#1fd1a8" /> : <div className="waves-card__chart-empty">Predictions unavailable</div>}
        </div>
        <div className="tide-card__extremes">
          <div>
            <span className="tide-card__badge tide-card__badge--low">
              L {formatTime(lowTide?.prediction_datetime_utc)}
            </span>
            <span className="tide-card__extreme-value">
              {lowTide ? `${Number(lowTide.tide_height_meters).toFixed(1)} m` : '--'}
            </span>
          </div>
          <div>
            <span className="tide-card__badge tide-card__badge--high">
              H {formatTime(highTide?.prediction_datetime_utc)}
            </span>
            <span className="tide-card__extreme-value">
              {highTide ? `${Number(highTide.tide_height_meters).toFixed(1)} m` : '--'}
            </span>
          </div>
        </div>
        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>Cycle: <strong style={{ color: '#1fd1a8' }}>{upcomingEvent !== '--' ? upcomingEvent : (highTide ? 'Active' : '--')}</strong></div>
          {isReference && referencePort && (
            <span
              style={{
                fontSize: '9px',
                color: '#35c9e8',
                background: 'rgba(53, 201, 232, 0.1)',
                border: '1px solid rgba(53, 201, 232, 0.28)',
                borderRadius: '3px',
                padding: '1px 5px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                maxWidth: '135px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={`Secondary port referencing Survey of India primary station: ${referencePort} (${distanceKm} km)`}
            >
              Ref: {referencePort.split('(')[0].trim()}{distanceKm ? ` (${distanceKm}km)` : ''}
            </span>
          )}
        </div>
      </TopicCard>

      {/* Interactive Detail Modal */}
      <DetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        icon={<IconTide size={18} color="#35c9e8" />}
        title={`Astronomical Tide Predictions — ${harborName}`}
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
            <div className="modal-stat-box__val" style={{ color: '#35c9e8' }}>
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

        <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
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
                  <td>{formatDate(t.prediction_datetime_utc)}</td>
                  <td><b>{formatTime(t.prediction_datetime_utc)}</b></td>
                  <td>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '3px',
                        background: t.tide_phase === 'HIGH' || t.tide_phase === 'H' ? 'rgba(61,220,132,0.15)' : 'rgba(53,201,232,0.15)',
                        color: t.tide_phase === 'HIGH' || t.tide_phase === 'H' ? '#3ddc84' : '#35c9e8',
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
    </>
  )
}
