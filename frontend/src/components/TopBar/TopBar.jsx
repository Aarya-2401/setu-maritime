import { useState, useEffect, useMemo } from 'react'
import { IconLocation, IconCloud, IconWind, IconWave, IconClock, IconRadar, IconChevronDown } from '../Icons'
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
  hasLiveMarineData = true
}) {
  const [currentTime, setCurrentTime] = useState(() => new Date())

  // Ticking system clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = currentTime.toLocaleDateString([], { month: 'short', day: 'numeric' })

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

  return (
    <header className="topbar">
      {/* Column 1 (Left 50%): Identity, Harbor Selector & Live Marine Telemetry */}
      <div className="topbar__col topbar__col--left">

        <div className="topbar__brand" title="SETU · Epsilon Six Maritime Intelligence">
          <div className="topbar__brand-icon">
            <img src="/favicon-512x512.png" alt="Epsilon Six" className="topbar__brand-logo" />
          </div>
          <span className="topbar__brand-title">SETU</span>
        </div>

        <div
          className="topbar__search"
          title={
            isUserLocationActive && userLocation
              ? `${userLocation.label} · User Detected Position (${userLocationTag})`
              : harbor
              ? `${harbor.landing_center_name || 'Harbor'} (${harbor.state || ''}) · UN/LOCODE: ${getUNLocode(harbor)} · ${getHarborAuthority(harbor)}`
              : 'Location selection'
          }
        >
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
            aria-label="Select departure harbor station or user location"
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

        {/* Telemetry Strip docked cleanly in Left Column */}
        <div
          className="topbar__telemetry"
          title={isUserLocationActive ? 'User Location Live Atmospheric Telemetry' : 'Harbor Oceanographic & Atmospheric Telemetry Station (INCOIS / C-DAC Node)'}
        >
          <div className="telemetry-pill">
            <IconCloud size={12} color="#35c9e8" />
            <span className="telemetry-val">{fmt(safetyData?.air_temp_celsius, '°C', 0)}</span>
            <span className="telemetry-lbl">Air</span>
          </div>
          <div className="telemetry-sep" />
          <div className="telemetry-pill">
            <IconWind size={12} color="#35c9e8" />
            <span className="telemetry-val">{fmt(safetyData?.wind_speed_kmph, ' km/h', 0)}</span>
            <span className="telemetry-lbl">Wind</span>
          </div>
          {hasLiveMarineData && (
            <>
              <div className="telemetry-sep" />
              <div className="telemetry-pill">
                <IconWave size={12} color="#35c9e8" />
                <span className="telemetry-val">{fmt(safetyData?.significant_wave_height_m, 'm')}</span>
                <span className="telemetry-lbl">Wave</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Column 2 (Right 50%): Operational Decision Clearance & Data Timestamp */}
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

        <div
          className="topbar__time"
          title={`Live system clock · INCOIS Data sync: ${assessment?.dataFreshness || 'Live'}`}
        >
          <IconClock size={12} color="#94a3b8" />
          <span className="topbar__time-val">{timeStr}</span>
          <span className="topbar__time-date">{dateStr}</span>
        </div>
      </div>
    </header>
  )
}
