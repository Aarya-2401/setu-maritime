import { useState } from 'react'
import TopicCard from './TopicCard'
import ChartMini from './ChartMini'
import DetailModal from '../Modal/DetailModal'
import { IconWave } from '../Icons'

export default function WavesCard({ harbor, safetyData, safetyHistory, loading }) {
  const [modalOpen, setModalOpen] = useState(false)

  const height = loading || safetyData?.significant_wave_height_m == null
    ? null
    : Number(safetyData.significant_wave_height_m)
  const swell = loading || safetyData?.swell_wave_height_m == null
    ? null
    : Number(safetyData.swell_wave_height_m)
  const seaState = safetyData?.wmo_sea_state_desc || '--'

  const safetyRating = safetyData?.composite_safety_rating || 'SAFE'
  const isDanger = safetyRating.includes('DANGER')
  const isCaution = safetyRating.includes('CAUTION')
  const tone = isDanger ? 'bad' : isCaution ? 'moderate' : 'good'
  const label = isDanger ? 'Danger' : isCaution ? 'Caution' : seaState

  // Extract wave height trend from 24h history
  const trend = safetyHistory && safetyHistory.length > 1
    ? safetyHistory.map((h) => Number(h.significant_wave_height_m)).filter(Number.isFinite).reverse().slice(0, 12)
    : []

  const waveImpact = height == null ? '--' : height > 3.0 ? 'HIGH HAZARD' : height > 2.0 ? 'MODERATE' : 'LOW'
  const waveImpactTone = height == null ? 'neutral' : height > 3.0 ? 'bad' : height > 2.0 ? 'moderate' : 'good'

  return (
    <>
      <TopicCard
        icon={<IconWave size={16} color="#35c9e8" />}
        title="Waves & Sea State"
        loading={loading}
        footer={
          <>
            <div className="topic-card__impact-tag">
              <span className="impact-lbl">Impact:</span>
              <span className={`impact-pill impact-pill--${waveImpactTone}`}>{waveImpact}</span>
            </div>
            <button className="topic-card__link" onClick={() => setModalOpen(true)}>
              Details →
            </button>
          </>
        }
      >
        <div className="waves-card__main">
          <div className="waves-card__value">
            {height == null ? '--' : height.toFixed(1)}
            <span className="weather-card__unit">m</span>
          </div>
          <span className={`waves-card__pill waves-card__pill--${tone}`}>{label}</span>
        </div>
        <div className="waves-card__chart">
          {trend.length > 1 ? (
            <ChartMini points={trend} />
          ) : (
            <div className="waves-card__chart-empty">Trend unavailable</div>
          )}
        </div>
        <div className="waves-card__period">
          Swell: <strong>{swell == null ? '--' : `${swell.toFixed(1)} m`}</strong> · Sea: {seaState}
        </div>
      </TopicCard>

      {/* Interactive Detail Modal */}
      <DetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        icon={<IconWave size={18} color="#35c9e8" />}
        title={`Wave & Hydrodynamic Profile — ${harbor?.landing_center_name || 'Coast'}`}
      >
        <div className="modal-grid-stats">
          <div className="modal-stat-box">
            <div className="modal-stat-box__lbl">Significant Wave</div>
            <div className="modal-stat-box__val" style={{ color: '#35c9e8' }}>
              {height != null ? `${height.toFixed(1)}m` : '--'}
            </div>
          </div>
          <div className="modal-stat-box">
            <div className="modal-stat-box__lbl">Swell Wave</div>
            <div className="modal-stat-box__val" style={{ color: '#1fd1a8' }}>
              {swell != null ? `${swell.toFixed(1)}m` : '--'}
            </div>
          </div>
          <div className="modal-stat-box">
            <div className="modal-stat-box__lbl">WMO Sea State</div>
            <div className="modal-stat-box__val" style={{ color: '#f59e0b', fontSize: '15px' }}>
              {seaState}
            </div>
          </div>
        </div>

        <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
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
    </>
  )
}
