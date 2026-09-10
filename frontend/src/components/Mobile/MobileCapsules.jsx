import { useMemo } from 'react'
import { IconCloud, IconWind, IconWave, IconCompass } from '../Icons'
import './MobileCapsules.css'

export default function MobileCapsules({ harbor, safetyData, tides, tideMeta, loading }) {
  // Weather values
  const temp = loading || safetyData?.air_temp_celsius == null
    ? '--'
    : `${Math.round(safetyData.air_temp_celsius)}°C`
  const visNum = safetyData?.visibility_km != null ? Number(safetyData.visibility_km) : null
  const visImpact = visNum == null ? 'NORMAL' : visNum >= 5.0 ? 'CLEAR' : visNum >= 2.5 ? 'REDUCED' : 'RESTRICTED'
  const visTone = visNum == null ? 'neutral' : visNum >= 5.0 ? 'good' : visNum >= 2.5 ? 'moderate' : 'bad'

  // Wind values
  const windSpeed = loading || safetyData?.wind_speed_kmph == null
    ? '--'
    : `${Math.round(safetyData.wind_speed_kmph)} km/h`
  const rawWind = Number(safetyData?.wind_speed_kmph)
  const windTone = isNaN(rawWind) ? 'neutral' : rawWind > 45 ? 'bad' : rawWind > 30 ? 'moderate' : 'good'
  const windTag = isNaN(rawWind) ? 'WIND' : rawWind > 45 ? 'GALE' : rawWind > 30 ? 'CHOP' : 'CALM'

  // Wave values
  const waveHeight = loading || safetyData?.significant_wave_height_m == null
    ? '--'
    : `${Number(safetyData.significant_wave_height_m).toFixed(1)}m`
  const rawWave = Number(safetyData?.significant_wave_height_m)
  const waveTone = isNaN(rawWave) ? 'neutral' : rawWave > 3.0 ? 'bad' : rawWave > 2.0 ? 'moderate' : 'good'
  const waveTag = safetyData?.wmo_sea_state_desc ? safetyData.wmo_sea_state_desc.toUpperCase() : 'SEA'

  // Tide values
  const tideHeight = useMemo(() => {
    if (!tides || tides.length === 0) return '--'
    const high = tides.find((t) => t.tide_phase === 'HIGH' || t.tide_phase === 'H')
    if (high) return `${Number(high.tide_height_meters).toFixed(1)}m`
    return `${Number(tides[0].tide_height_meters).toFixed(1)}m`
  }, [tides])
  const tidePhase = useMemo(() => {
    if (!tides || tides.length === 0) return 'TIDE'
    const high = tides.find((t) => t.tide_phase === 'HIGH' || t.tide_phase === 'H')
    return high ? 'HIGH' : (tides[0].tide_phase || 'TIDE')
  }, [tides])

  return (
    <div className="mobile-capsules" role="region" aria-label="Harbor Live Telemetry Tablets">
      <div className="mobile-capsules__track">
        {/* Weather Capsule */}
        <div className="mobile-capsule" title="Air Temperature & Atmospheric Visibility">
          <div className="mobile-capsule__icon">
            <IconCloud size={12} color="#35c9e8" />
          </div>
          <div className="mobile-capsule__data">
            <span className="mobile-capsule__label">Air</span>
            <span className="mobile-capsule__val">{temp}</span>
          </div>
          <span className={`mobile-capsule__badge mobile-capsule__badge--${visTone}`}>
            {visImpact}
          </span>
        </div>

        {/* Wind Capsule */}
        <div className="mobile-capsule" title="Surface Wind Speed & Force">
          <div className="mobile-capsule__icon">
            <IconWind size={12} color="#35c9e8" />
          </div>
          <div className="mobile-capsule__data">
            <span className="mobile-capsule__label">Wind</span>
            <span className="mobile-capsule__val">{windSpeed}</span>
          </div>
          <span className={`mobile-capsule__badge mobile-capsule__badge--${windTone}`}>
            {windTag}
          </span>
        </div>

        {/* Waves Capsule */}
        <div className="mobile-capsule" title="Significant Wave Height & Sea State">
          <div className="mobile-capsule__icon">
            <IconWave size={12} color="#35c9e8" />
          </div>
          <div className="mobile-capsule__data">
            <span className="mobile-capsule__label">Waves</span>
            <span className="mobile-capsule__val">{waveHeight}</span>
          </div>
          <span className={`mobile-capsule__badge mobile-capsule__badge--${waveTone}`}>
            {waveTag}
          </span>
        </div>

        {/* Tides Capsule */}
        <div className="mobile-capsule" title="Upcoming Tide Height & Phase">
          <div className="mobile-capsule__icon">
            <IconCompass size={12} color="#35c9e8" />
          </div>
          <div className="mobile-capsule__data">
            <span className="mobile-capsule__label">Tide</span>
            <span className="mobile-capsule__val">{tideHeight}</span>
          </div>
          <span className="mobile-capsule__badge mobile-capsule__badge--good">
            {tidePhase}
          </span>
        </div>
      </div>
    </div>
  )
}
