import { useState, useEffect, useMemo } from 'react'
import { IconLocation, IconCloud, IconWind, IconWave, IconTide, IconChevronDown } from '../Icons'
import {
  getFormattedHarborTag,
  getUNLocode,
  getHarborAuthority,
  getMaritimeStandardTag
} from '../../data/harborCodes'
import './TopBar.css'

export default function TopBar({
  harbor,
  harbors,
  onSelectHarbor,
  safetyData,
  assessment,
  operationalStatus,
  onOpenAssessment,
  loading,
  hasApiError,
  userLocation,
  isUserLocationActive,
  onSelectUserLocation,
  userLocationTag,
  hasLiveMarineData = true,
  globalTelemetry,
  tides
}) {
  const [currentTime, setCurrentTime] = useState(() => new Date())

  // Ticking system clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const fmt = (val, unit, digits = 1) =>
    loading || val === null || val === undefined ? '--' : `${Number(val).toFixed(digits)}${unit}`

  // Group harbors into coastal states for organized optgroup navigation
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

  const weatherDisplay = globalTelemetry?.weather?.value || fmt(safetyData?.air_temp_celsius, '°C', 0)
  const windDisplay = globalTelemetry?.wind?.value || fmt(safetyData?.wind_speed_kmph, ' km/h', 0)
  const waveDisplay = globalTelemetry?.wave?.value || fmt(safetyData?.significant_wave_height_m, ' m')
  const tideDisplay = globalTelemetry?.tide?.value || (tides && tides.length > 0 ? `${Number(tides[0].tide_height_meters).toFixed(1)} m` : '--')

  return (
    <header className="topbar">
      {/* Column 1 (Left 50%): Identity, Operational Base Harbor & 4 Stable Telemetry Pills */}
      <div className="topbar__col topbar__col--left">

        <div className="topbar__brand" title="SETU · Epsilon Six Maritime Intelligence">
          <div className="topbar__brand-icon">
            <img src="/favicon-512x512.png" alt="Epsilon Six" className="topbar__brand-logo" />
          </div>
          <span className="topbar__brand-title">SETU</span>
        </div>

        {/* Operational Base Harbor Selector */}
        <div
          className="topbar__search"
          title={
            isUserLocationActive && userLocation
              ? `${userLocation.label} · User Detected Position (${userLocationTag})`
              : harbor
              ? `${harbor.landing_center_name || 'Harbor'} (${harbor.state || ''}) · Operational Base · UN/LOCODE: ${getUNLocode(harbor)} · ${getHarborAuthority(harbor)}`
              : 'Location selection'
          }
        >
          <span className="topbar__base-tag">BASE</span>
          <span className="topbar__pin">
            <IconLocation size={12} color={isUserLocationActive ? '#10b981' : '#35c9e8'} />
          </span>
          <span className="topbar__station-tag">
            {isUserLocationActive
              ? userLocationTag
              : harbor
              ? getFormattedHarborTag(harbor)
              : 'HAR · --'}
          </span>
          <span
            className="topbar__locode-badge"
            style={isUserLocationActive ? { borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10b981' } : {}}
          >
            {isUserLocationActive ? 'YOU' : harbor ? getUNLocode(harbor) : 'UN/LOCODE'}
          </span>
          <span className="topbar__chevron">
            <IconChevronDown size={8} color="#35c9e8" />
          </span>

          {/* Native dropdown overlay with user location and coastal states */}
          <select
            className="topbar__harbor-select"
            value={isUserLocationActive ? 'user_location' : (harbor?.harbor_id || '')}
            onChange={(e) => {
              if (e.target.value === 'user_location') {
                if (onSelectUserLocation) onSelectUserLocation()
              } else {
                onSelectHarbor(Number(e.target.value))
              }
            }}
            aria-label="Select operational base harbor station or user location"
          >
            {userLocation?.city && (
              <optgroup label="USER DETECTED LOCATION">
                <option value="user_location">
                  {userLocationTag} — {userLocation.label} (Current Position)
                </option>
              </optgroup>
            )}
            {Object.keys(groupedHarbors).length > 0 ? (
              Object.entries(groupedHarbors).map(([stateName, list]) => (
                <optgroup key={stateName} label={`${stateName.toUpperCase()} (${list.length})`}>
                  {list.map((h) => (
                    <option key={h.harbor_id} value={h.harbor_id}>
                      {getMaritimeStandardTag(h)} — {h.landing_center_name}
                    </option>
                  ))}
                </optgroup>
              ))
            ) : (
              <option value={harbor?.harbor_id || ''}>
                {harbor ? `${getMaritimeStandardTag(harbor)} — ${harbor.landing_center_name}` : 'Loading harbors...'}
              </option>
            )}
          </select>
        </div>

        {/* Stable Telemetry Strip docked cleanly in Left Column: exactly 4 stable pills */}
        <div
          className="topbar__telemetry"
          title={`Operational Marine Telemetry Node · ${globalTelemetry?.weather?.location || harbor?.landing_center_name || 'Station'}`}
        >
          {/* Pill 1: WEATHER + TIME */}
          <div
            className="telemetry-pill"
            title={`${globalTelemetry?.weather?.location || ''} (${globalTelemetry?.weather?.state || ''}) · ${globalTelemetry?.weather?.source || ''}`}
          >
            <div className="telemetry-pill__main">
              <IconCloud size={11} color="#35c9e8" />
              <span className="telemetry-val">
                {weatherDisplay} · {timeStr}
              </span>
            </div>
            <span className="telemetry-lbl">WEATHER</span>
          </div>

          <div className="telemetry-sep" />

          {/* Pill 2: WIND */}
          <div
            className="telemetry-pill"
            title={`${globalTelemetry?.wind?.location || ''} (${globalTelemetry?.wind?.state || ''}) · ${globalTelemetry?.wind?.source || ''}`}
          >
            <div className="telemetry-pill__main">
              <IconWind size={11} color="#35c9e8" />
              <span className="telemetry-val">
                {windDisplay}
              </span>
            </div>
            <span className="telemetry-lbl">WIND</span>
          </div>

          <div className="telemetry-sep" />

          {/* Pill 3: WAVE */}
          <div
            className="telemetry-pill"
            title={`${globalTelemetry?.wave?.location || ''} (${globalTelemetry?.wave?.state || ''}) · ${globalTelemetry?.wave?.source || ''}`}
          >
            <div className="telemetry-pill__main">
              <IconWave size={11} color="#35c9e8" />
              <span className="telemetry-val">
                {waveDisplay}
              </span>
            </div>
            <span className="telemetry-lbl">WAVE</span>
          </div>

          <div className="telemetry-sep" />

          {/* Pill 4: TIDE */}
          <div
            className="telemetry-pill"
            title={`${globalTelemetry?.tide?.location || ''} (${globalTelemetry?.tide?.state || ''}) · ${globalTelemetry?.tide?.source || ''}`}
          >
            <div className="telemetry-pill__main">
              <IconTide size={11} color="#35c9e8" />
              <span className="telemetry-val">
                {tideDisplay}
              </span>
            </div>
            <span className="telemetry-lbl">TIDE</span>
          </div>
        </div>
      </div>

      {/* Column 2 (Right 50%): Operational Decision Clearance (no duplicate time pill) */}
      <div className="topbar__col topbar__col--right">
        <button
          className={`topbar__decision-btn topbar__decision-btn--${assessment?.tone || 'good'}`}
          onClick={onOpenAssessment}
          title="Click to inspect operational factors and route assessment (Shortcut: A)"
        >
          <span className="topbar__decision-dot" />
          <span className="topbar__decision-text" title={operationalStatus || assessment?.decisionLabel}>
            {loading ? 'SYNCING...' : operationalStatus || assessment?.decisionLabel || 'SAFE TO DEPART'}
          </span>
          <span className="topbar__why-tag">Why?</span>
        </button>
      </div>
    </header>
  )
}
