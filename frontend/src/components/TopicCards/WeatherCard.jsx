import { useState } from 'react'
import TopicCard from './TopicCard'
import DetailModal from '../Modal/DetailModal'
import { IconCloud, IconLocation } from '../Icons'

export default function WeatherCard({
  harbor,
  safetyData,
  loading,
  customLocationName,
  isUserLocation = false,
  userLocation
}) {
  const [modalOpen, setModalOpen] = useState(false)

  const temp = loading || safetyData?.air_temp_celsius == null
    ? '--'
    : Math.round(safetyData.air_temp_celsius)
  const pressure = loading || safetyData?.surface_pressure_hpa == null
    ? '--'
    : `${Number(safetyData.surface_pressure_hpa).toFixed(0)} hPa`
  const visibility = loading || safetyData?.visibility_km == null
    ? '--'
    : `${Number(safetyData.visibility_km).toFixed(1)} km`
  const locationName = customLocationName || harbor?.landing_center_name || 'Coastal Station'
  const sectorName = isUserLocation
    ? (userLocation?.state ? `Inland (${userLocation.state})` : 'Inland Locality')
    : (safetyData?.sector || harbor?.sector || '--')

  const visNum = safetyData?.visibility_km != null ? Number(safetyData.visibility_km) : null
  const visImpact = visNum == null ? '--' : visNum >= 5.0 ? 'CLEAR' : visNum >= 2.5 ? 'REDUCED' : 'RESTRICTED'
  const visTone = visNum == null ? 'neutral' : visNum >= 5.0 ? 'good' : visNum >= 2.5 ? 'moderate' : 'bad'

  return (
    <>
      <TopicCard
        icon={<IconCloud size={16} color="#35c9e8" />}
        title="Weather"
        loading={loading}
        footer={
          <>
            <div className="topic-card__impact-tag">
              <span className="impact-lbl">Visibility:</span>
              <span className={`impact-pill impact-pill--${visTone}`}>{visImpact}</span>
            </div>
            <button className="topic-card__link" onClick={() => setModalOpen(true)}>
              Details →
            </button>
          </>
        }
      >
        <div className="weather-card__main">
          <div className="weather-card__temp">
            {temp}
            <span className="weather-card__unit">°C</span>
          </div>
          <div className="weather-card__meta">
            <div className="weather-card__feels">
              Sector: {sectorName}
            </div>
            <div className="weather-card__place" style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', color: '#cbd5e1' }}>
              <IconLocation size={11} color="#94a3b8" /> {locationName}
            </div>
          </div>
        </div>
        <div className="weather-card__stats">
          <div>
            <span className="weather-card__stat-label">Air Temp</span>
            <span className="weather-card__stat-value">{temp}°C</span>
          </div>
          <div>
            <span className="weather-card__stat-label">Pressure</span>
            <span className="weather-card__stat-value">{pressure}</span>
          </div>
          <div>
            <span className="weather-card__stat-label">Visibility</span>
            <span className="weather-card__stat-value">{visibility}</span>
          </div>
        </div>
      </TopicCard>

      {/* Interactive Detail Modal */}
      <DetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        icon={<IconCloud size={18} color="#35c9e8" />}
        title={`${isUserLocation ? 'Atmospheric Weather Telemetry' : 'Coastal Weather Telemetry'} — ${locationName}`}
      >
        <div className="modal-grid-stats">
          <div className="modal-stat-box">
            <div className="modal-stat-box__lbl">Air Temperature</div>
            <div className="modal-stat-box__val" style={{ color: '#35c9e8' }}>{temp}°C</div>
          </div>
          <div className="modal-stat-box">
            <div className="modal-stat-box__lbl">Surface Pressure</div>
            <div className="modal-stat-box__val" style={{ color: '#1fd1a8' }}>{pressure}</div>
          </div>
          <div className="modal-stat-box">
            <div className="modal-stat-box__lbl">Visibility</div>
            <div className="modal-stat-box__val" style={{ color: '#3ddc84' }}>{visibility}</div>
          </div>
        </div>

        <table className="modal-table">
          <tbody>
            <tr>
              <td><strong>{isUserLocation ? 'Locality / Station' : 'Landing Center / Harbor'}</strong></td>
              <td>{locationName}</td>
            </tr>
            <tr>
              <td><strong>{isUserLocation ? 'Locality Type & Region' : 'Coastal Sector & State'}</strong></td>
              <td>{isUserLocation ? `${sectorName} (User Position)` : `${harbor?.sector || '--'} · ${harbor?.state || '--'}`}</td>
            </tr>
            <tr>
              <td><strong>Regional Alert Status</strong></td>
              <td><span style={{ color: safetyData?.active_regional_alert_level ? '#1fd1a8' : '#94a3b8', fontWeight: 600 }}>{safetyData?.active_regional_alert_level || 'Normal / Clear'}</span></td>
            </tr>
            <tr>
              <td><strong>Composite Safety Rating</strong></td>
              <td><strong>{isUserLocation ? 'CLEAR' : (safetyData?.composite_safety_rating || 'Unavailable')}</strong></td>
            </tr>
            <tr>
              <td><strong>Observation Source</strong></td>
              <td>{safetyData?.source || (safetyData ? 'Safety nowcast API' : 'No source data returned')}</td>
            </tr>
          </tbody>
        </table>
      </DetailModal>
    </>
  )
}
