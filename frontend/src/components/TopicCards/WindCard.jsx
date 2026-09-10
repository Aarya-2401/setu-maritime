import { useState } from 'react'
import TopicCard from './TopicCard'
import DetailModal from '../Modal/DetailModal'
import { IconWind } from '../Icons'

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function degToCompass(deg) {
  if (deg == null) return 'Direction unavailable'
  const idx = Math.round(deg / 45) % 8
  return DIRS[idx]
}

function getBeaufortScale(kmph) {
  if (kmph < 1) return { num: 0, desc: 'Calm', effect: 'Sea like a mirror' }
  if (kmph <= 5) return { num: 1, desc: 'Light air', effect: 'Ripples with appearance of scales' }
  if (kmph <= 11) return { num: 2, desc: 'Light breeze', effect: 'Small wavelets, crests glassy' }
  if (kmph <= 19) return { num: 3, desc: 'Gentle breeze', effect: 'Large wavelets, scattered whitecaps' }
  if (kmph <= 28) return { num: 4, desc: 'Moderate breeze', effect: 'Small waves, fairly frequent whitecaps' }
  if (kmph <= 38) return { num: 5, desc: 'Fresh breeze', effect: 'Moderate waves, many whitecaps' }
  if (kmph <= 49) return { num: 6, desc: 'Strong breeze', effect: 'Large waves, extensive white foam crests' }
  return { num: 7, desc: 'High wind / Gale', effect: 'Sea heaps up, white foam streaks' }
}

export default function WindCard({
  harbor,
  safetyData,
  loading,
  customLocationName,
  isUserLocation = false
}) {
  const [modalOpen, setModalOpen] = useState(false)

  const speed = loading || safetyData?.wind_speed_kmph == null
    ? '--'
    : Math.round(safetyData.wind_speed_kmph)
  const gustsMps = safetyData?.wind_gust_mps
  const gustsKmph = gustsMps != null ? Math.round(gustsMps * 3.6) : null
  const gustsText = gustsKmph != null ? `${gustsKmph} km/h` : '--'
  
  const rotation = safetyData?.wind_direction_deg != null ? Number(safetyData.wind_direction_deg) : null
  const beaufort = speed !== '--' ? getBeaufortScale(speed) : null
  const locationName = customLocationName || harbor?.landing_center_name || 'Coastal'

  const windImpact = speed === '--' ? '--' : speed > 45 ? 'GALE FORCE' : speed > 30 ? 'MODERATE' : 'LOW'
  const windImpactTone = speed === '--' ? 'neutral' : speed > 45 ? 'bad' : speed > 30 ? 'moderate' : 'good'

  return (
    <>
      <TopicCard
        icon={<IconWind size={16} color="#35c9e8" />}
        title="Wind Velocity"
        loading={loading}
        footer={
          <>
            <div className="topic-card__impact-tag">
              <span className="impact-lbl">Impact:</span>
              <span className={`impact-pill impact-pill--${windImpactTone}`}>{windImpact}</span>
            </div>
            <button className="topic-card__link" onClick={() => setModalOpen(true)}>
              Details →
            </button>
          </>
        }
      >
        <div className="wind-card__main">
          <div className="wind-card__compass">
            <div className="wind-card__compass-ring">
              <span className="wind-card__n">N</span>
              <span className="wind-card__e">E</span>
              <span className="wind-card__s">S</span>
              <span className="wind-card__w">W</span>
              <div
                className="wind-card__needle"
                style={{ transform: `translate(-50%, -100%) rotate(${rotation || 0}deg)` }}
              />
            </div>
          </div>
          <div>
            <div className="wind-card__speed">
              {speed}
              <span className="weather-card__unit">km/h</span>
            </div>
            <div className="wind-card__direction">{degToCompass(rotation)}</div>
            <div className="wind-card__gusts">Gusts: <strong>{gustsText}</strong></div>
          </div>
        </div>
      </TopicCard>

      {/* Interactive Detail Modal */}
      <DetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        icon={<IconWind size={18} color="#35c9e8" />}
        title={`Wind Dynamics & Beaufort Scale — ${locationName}`}
      >
        <div className="modal-grid-stats">
          <div className="modal-stat-box">
            <div className="modal-stat-box__lbl">Sustained Wind</div>
            <div className="modal-stat-box__val" style={{ color: '#35c9e8' }}>{speed} km/h</div>
          </div>
          <div className="modal-stat-box">
            <div className="modal-stat-box__lbl">Peak Gusts</div>
            <div className="modal-stat-box__val" style={{ color: '#f59e0b' }}>{gustsText}</div>
          </div>
          <div className="modal-stat-box">
            <div className="modal-stat-box__lbl">Beaufort Force</div>
            <div className="modal-stat-box__val" style={{ color: '#1fd1a8' }}>{beaufort ? `Force ${beaufort.num}` : '--'}</div>
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
              <td>{rotation == null ? 'Unavailable' : `${degToCompass(rotation)} (${rotation} deg)`}</td>
            </tr>
            <tr>
              <td><strong>{isUserLocation ? 'Atmospheric Advisory' : 'Small Craft Advisory'}</strong></td>
              <td>
                <span
                  style={{
                    color: speed === '--' ? '#94a3b8' : speed > 35 ? '#ef4444' : '#10b981',
                    fontWeight: 700,
                    fontSize: '11px',
                    padding: '2px 6px',
                    background: speed === '--' ? 'rgba(148,163,184,0.12)' : speed > 35 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                    borderRadius: '4px'
                  }}
                >
                  {speed === '--' ? 'DATA UNAVAILABLE' : speed > 35 ? 'HIGH WIND ADVISORY' : isUserLocation ? 'CLEAR / NORMAL BREEZE' : 'CLEAR FOR ALL CRAFT'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </DetailModal>
    </>
  )
}
