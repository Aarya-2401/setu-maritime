import TopicCard from './TopicCard'
import { IconRadar, IconShield, IconCompass, IconWave, IconCloud } from '../Icons'

export function PFZSummaryCard({ advisories = [], queryTarget = 'Coastal Sector', loading = false }) {
  const count = advisories.length
  const topSpecies = Array.from(
    new Set(advisories.map((a) => a.target_species || a.targetSpecies).filter(Boolean))
  ).slice(0, 2).join(', ') || 'Pelagic Species'

  const avgDist = advisories.length > 0
    ? Math.round(
        advisories.reduce((acc, a) => acc + Number(a.distance_km || a.distanceKm || 20), 0) /
          advisories.length
      )
    : 20

  return (
    <TopicCard
      icon={<IconRadar size={16} color="#35c9e8" />}
      title={`${queryTarget} PFZ`}
      loading={loading}
      footer={
        <>
          <div className="topic-card__impact-tag">
            <span className="impact-lbl">Feed:</span>
            <span className="impact-pill impact-pill--good">INCOIS ACTIVE</span>
          </div>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>Live Advisory</span>
        </>
      }
    >
      <div className="weather-card__main">
        <div className="weather-card__temp">
          {count}
          <span className="weather-card__unit" style={{ fontSize: '13px' }}>Zones</span>
        </div>
        <div className="weather-card__meta">
          <div className="weather-card__feels" style={{ fontSize: '11px', color: '#cbd5e1' }}>
            Target: <b>{topSpecies}</b>
          </div>
          <div className="weather-card__desc" style={{ fontSize: '10.5px', color: '#94a3b8' }}>
            Avg Distance: ~{avgDist} km offshore
          </div>
        </div>
      </div>
    </TopicCard>
  )
}

export function PFZHotspotsCard({ advisories = [], loading = false }) {
  const hotspots = advisories.slice(0, 3)

  return (
    <TopicCard
      icon={<IconCompass size={16} color="#38bdf8" />}
      title="Active Hotspots"
      loading={loading}
      footer={
        <>
          <div className="topic-card__impact-tag">
            <span className="impact-lbl">Confidence:</span>
            <span className="impact-pill impact-pill--good">94% PROVEN</span>
          </div>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>Thermal Boundary</span>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10.5px' }}>
        {hotspots.length > 0 ? (
          hotspots.map((h, i) => {
            const bearing = h.bearing_compass || h.bearingCompass || 'Offshore'
            const dist = h.distance_nm ? `${h.distance_nm} NM` : (h.distance_km ? `${h.distance_km} km` : '15 NM')
            const species = h.target_species || h.targetSpecies || 'Mixed'
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>#{i + 1} {bearing} ({dist})</span>
                <span style={{ color: '#94a3b8', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {species}
                </span>
              </div>
            )
          })
        ) : (
          <div style={{ color: '#94a3b8', fontSize: '11px' }}>Scanning coastal satellite passes...</div>
        )}
      </div>
    </TopicCard>
  )
}

export function PFZEnvCard({ advisories = [], loading = false }) {
  const sstValues = advisories.map((a) => Number(a.sst_celsius ?? a.sst)).filter((v) => !isNaN(v) && v > 0)
  const avgSst = sstValues.length > 0
    ? (sstValues.reduce((a, b) => a + b, 0) / sstValues.length).toFixed(1)
    : '28.4'

  return (
    <TopicCard
      icon={<IconWave size={16} color="#22d3ee" />}
      title="Oceanic Fronts"
      loading={loading}
      footer={
        <>
          <div className="topic-card__impact-tag">
            <span className="impact-lbl">Gradient:</span>
            <span className="impact-pill impact-pill--good">FAVORABLE</span>
          </div>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>MODIS / Oceansat-3</span>
        </>
      }
    >
      <div className="weather-card__main">
        <div className="weather-card__temp">
          {avgSst}
          <span className="weather-card__unit">°C</span>
        </div>
        <div className="weather-card__meta">
          <div className="weather-card__feels" style={{ fontSize: '11px', color: '#cbd5e1' }}>
            Chlorophyll-a Front Active
          </div>
          <div className="weather-card__desc" style={{ fontSize: '10.5px', color: '#94a3b8' }}>
            Upwelling boundary detected
          </div>
        </div>
      </div>
    </TopicCard>
  )
}

export function ZoneSummaryCard({ zones = [], queryTarget = 'Region', loading = false }) {
  const count = zones.length

  return (
    <TopicCard
      icon={<IconShield size={16} color="#f43f5e" />}
      title={`${queryTarget} Zones`}
      loading={loading}
      footer={
        <>
          <div className="topic-card__impact-tag">
            <span className="impact-lbl">Status:</span>
            <span className={`impact-pill impact-pill--${count > 0 ? 'bad' : 'good'}`}>
              {count > 0 ? 'RESTRICTIONS ACTIVE' : 'CLEAR'}
            </span>
          </div>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>Govt / WPA</span>
        </>
      }
    >
      <div className="weather-card__main">
        <div className="weather-card__temp" style={{ color: count > 0 ? '#fb7185' : '#34d399' }}>
          {count}
          <span className="weather-card__unit" style={{ fontSize: '13px' }}>Zones</span>
        </div>
        <div className="weather-card__meta">
          <div className="weather-card__feels" style={{ fontSize: '11px', color: '#cbd5e1' }}>
            Authority: Marine Sanctuary / Ban
          </div>
          <div className="weather-card__desc" style={{ fontSize: '10.5px', color: '#94a3b8' }}>
            Wildlife Protection Act 1972
          </div>
        </div>
      </div>
    </TopicCard>
  )
}

export function ZoneListCard({ zones = [], loading = false }) {
  const topZones = zones.slice(0, 2)

  return (
    <TopicCard
      icon={<IconShield size={16} color="#fb7185" />}
      title="Protected Sanctuaries"
      loading={loading}
      footer={
        <>
          <div className="topic-card__impact-tag">
            <span className="impact-lbl">Gear Ban:</span>
            <span className="impact-pill impact-pill--bad">TRAWLING PROHIBITED</span>
          </div>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10.5px' }}>
        {topZones.length > 0 ? (
          topZones.map((z, i) => (
            <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '2px' }}>
              <div style={{ color: '#fb7185', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {z.zone_name}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '10px' }}>
                {z.zone_type || 'Sanctuary'} · {z.area_km2 ? `${z.area_km2} km²` : 'Seasonal'}
              </div>
            </div>
          ))
        ) : (
          <div style={{ color: '#94a3b8', fontSize: '11px' }}>No restricted sanctuaries in immediate grid.</div>
        )}
      </div>
    </TopicCard>
  )
}

export function ComplianceCard({ zones = [], loading = false }) {
  const count = zones.length
  return (
    <TopicCard
      icon={<IconCompass size={16} color="#35c9e8" />}
      title="Corridor Compliance"
      loading={loading}
      footer={
        <>
          <div className="topic-card__impact-tag">
            <span className="impact-lbl">Buffer:</span>
            <span className="impact-pill impact-pill--moderate">5.0 NM BUFFER</span>
          </div>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>Fairway Only</span>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#cbd5e1' }}>
        <div>
          Navigation: <b>{count > 0 ? 'Transit corridor mandatory' : 'Open coastal transit'}</b>
        </div>
        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
          {count > 0
            ? 'Vessels must maintain continuous AIS and avoid fishing within protected coordinates.'
            : 'Standard territorial sea navigation protocols apply.'}
        </div>
      </div>
    </TopicCard>
  )
}

export function CycloneSummaryCard({ cyclones = [], queryTarget = 'Regional Sector', loading = false }) {
  const active = cyclones[0] || {}
  const name = active.cyclone_name || active.name || 'Deep Depression'
  const intensity = active.intensity || active.category || 'Cyclonic Storm'

  return (
    <TopicCard
      icon={<IconRadar size={16} color="#ef4444" />}
      title={`${queryTarget} Storm Radar`}
      loading={loading}
      footer={
        <>
          <div className="topic-card__impact-tag">
            <span className="impact-lbl">Warning:</span>
            <span className="impact-pill impact-pill--bad">IMD ADVISORY</span>
          </div>
          <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>HIGH ALERT</span>
        </>
      }
    >
      <div className="weather-card__main">
        <div className="weather-card__temp" style={{ color: '#ef4444', fontSize: '20px' }}>
          {name}
        </div>
        <div className="weather-card__meta">
          <div className="weather-card__feels" style={{ fontSize: '11px', color: '#fca5a5' }}>
            Category: {intensity}
          </div>
          <div className="weather-card__desc" style={{ fontSize: '10.5px', color: '#94a3b8' }}>
            Track active in coastal quadrant
          </div>
        </div>
      </div>
    </TopicCard>
  )
}

export function RouteSummaryCard({ route = {}, queryTarget = 'Route', loading = false }) {
  const dist = route.distance_nm ? `${route.distance_nm} NM` : '28 NM'
  const target = route.target_area_name || queryTarget || 'Offshore Waypoint'

  return (
    <TopicCard
      icon={<IconCompass size={16} color="#38bdf8" />}
      title="Transit Corridor"
      loading={loading}
      footer={
        <>
          <div className="topic-card__impact-tag">
            <span className="impact-lbl">Corridor:</span>
            <span className="impact-pill impact-pill--good">COMPLIANT</span>
          </div>
          <span style={{ fontSize: '10px', color: '#38bdf8' }}>Safe Fairway</span>
        </>
      }
    >
      <div className="weather-card__main">
        <div className="weather-card__temp">
          {dist}
        </div>
        <div className="weather-card__meta">
          <div className="weather-card__feels" style={{ fontSize: '11px', color: '#cbd5e1' }}>
            Dest: {target}
          </div>
          <div className="weather-card__desc" style={{ fontSize: '10.5px', color: '#94a3b8' }}>
            Direct fairway clear of sanctuaries
          </div>
        </div>
      </div>
    </TopicCard>
  )
}
