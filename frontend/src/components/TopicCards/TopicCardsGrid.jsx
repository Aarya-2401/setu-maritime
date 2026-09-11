import { useMemo } from 'react'
import WeatherCard from './WeatherCard'
import WindCard from './WindCard'
import WavesCard from './WavesCard'
import TideCard from './TideCard'
import {
  PFZSummaryCard,
  PFZHotspotsCard,
  PFZEnvCard,
  ZoneSummaryCard,
  ZoneListCard,
  ComplianceCard,
  CycloneSummaryCard,
  RouteSummaryCard
} from './ContextualCards'
import './TopicCards.css'

export default function TopicCardsGrid({
  harbor,
  safetyData,
  safetyHistory,
  tides,
  tideMeta,
  loading,
  hasLiveMarineData = true,
  userLocation,
  isUserLocationActive = false,
  dashboardContext = 'HARBOR_TELEMETRY',
  queryTarget = null,
  cardUpdates = [],
  advisories = [],
  restrictedZones = [],
  routes = [],
  cyclones = []
}) {
  const activeLocationName = isUserLocationActive && userLocation?.label
    ? userLocation.label
    : harbor?.landing_center_name || 'Coastal Station'

  const effectiveLocationName = queryTarget || activeLocationName

  const weatherUpdate = cardUpdates?.find((c) => c.cardId === 'weather' || c.sourceAgent === 'weather')
  const windUpdate = cardUpdates?.find((c) => c.cardId === 'wind-speed' || c.sourceAgent === 'wind')
  const waveUpdate = cardUpdates?.find((c) => c.cardId === 'wave' || c.sourceAgent === 'wave')
  const pfzUpdate = cardUpdates?.find((c) => c.cardId === 'pfz' || c.sourceAgent === 'pfz')
  const zoneUpdate = cardUpdates?.find((c) => c.cardId === 'zone' || c.sourceAgent === 'zone')

  const effectiveLocationState = weatherUpdate?.data?.state ||
    pfzUpdate?.data?.state ||
    zoneUpdate?.data?.state ||
    (advisories && advisories.length > 0 ? advisories[0]?.state : null) ||
    (restrictedZones && restrictedZones.length > 0 ? restrictedZones[0]?.state : null) ||
    null

  const effectiveSafetyData = useMemo(() => {
    let base = { ...safetyData }
    if (weatherUpdate?.data) {
      base.air_temp_celsius = weatherUpdate.data.temperature ?? base.air_temp_celsius
      base.wmo_sea_state_desc = weatherUpdate.data.condition ?? base.wmo_sea_state_desc
      base.surface_pressure_hpa = weatherUpdate.data.pressure ?? base.surface_pressure_hpa
      base.visibility_km = weatherUpdate.data.visibility ?? base.visibility_km
      base.relative_humidity = weatherUpdate.data.humidity ?? base.relative_humidity
      if (weatherUpdate.data.state) base.state = weatherUpdate.data.state
      if (weatherUpdate.data.sector) base.sector = weatherUpdate.data.sector
      if (weatherUpdate.location) base.landing_center_name = weatherUpdate.location
    }
    if (windUpdate?.data) {
      base.wind_speed_kmph = windUpdate.data.speed ?? base.wind_speed_kmph
      base.wind_gust_mps = windUpdate.data.gust != null ? windUpdate.data.gust / 3.6 : base.wind_gust_mps
      base.wind_direction_deg = windUpdate.data.direction ?? base.wind_direction_deg
      if (windUpdate.data.state && !base.state) base.state = windUpdate.data.state
      if (windUpdate.data.sector && !base.sector) base.sector = windUpdate.data.sector
    }
    if (waveUpdate?.data) {
      base.significant_wave_height_m = waveUpdate.data.height ?? base.significant_wave_height_m
      base.swell_wave_height_m = waveUpdate.data.swell ?? base.swell_wave_height_m
      base.wmo_sea_state_desc = waveUpdate.data.seaState ?? base.wmo_sea_state_desc
      if (waveUpdate.data.state && !base.state) base.state = waveUpdate.data.state
      if (waveUpdate.data.sector && !base.sector) base.sector = waveUpdate.data.sector
    }
    if (effectiveLocationState && !base.state) {
      base.state = effectiveLocationState
      base.sector = effectiveLocationState
    }
    return base
  }, [safetyData, weatherUpdate, windUpdate, waveUpdate, effectiveLocationState])

  // Contextual Card Routing based on active AI user query context
  if (dashboardContext === 'RESTRICTED_ZONES') {
    return (
      <section className="topic-grid">
        <ZoneSummaryCard
          zones={restrictedZones}
          queryTarget={queryTarget || 'Regional'}
          loading={loading}
        />
        <ZoneListCard
          zones={restrictedZones}
          loading={loading}
        />
        <ComplianceCard
          zones={restrictedZones}
          loading={loading}
        />
        <WeatherCard
          harbor={harbor}
          safetyData={effectiveSafetyData}
          loading={loading}
          customLocationName={effectiveLocationName}
          customLocationState={effectiveLocationState}
          isUserLocation={isUserLocationActive}
          userLocation={userLocation}
        />
      </section>
    )
  }

  if (dashboardContext === 'PFZ_OVERVIEW') {
    return (
      <section className="topic-grid">
        <PFZSummaryCard
          advisories={advisories}
          queryTarget={queryTarget || 'Coastal'}
          loading={loading}
        />
        <PFZHotspotsCard
          advisories={advisories}
          loading={loading}
        />
        <PFZEnvCard
          advisories={advisories}
          loading={loading}
        />
        <WeatherCard
          harbor={harbor}
          safetyData={effectiveSafetyData}
          loading={loading}
          customLocationName={effectiveLocationName}
          customLocationState={effectiveLocationState}
          isUserLocation={isUserLocationActive}
          userLocation={userLocation}
        />
      </section>
    )
  }

  if (dashboardContext === 'CYCLONE_TRACK') {
    return (
      <section className="topic-grid">
        <CycloneSummaryCard
          cyclones={cyclones}
          queryTarget={queryTarget || 'Regional'}
          loading={loading}
        />
        <WindCard
          harbor={harbor}
          safetyData={effectiveSafetyData}
          loading={loading}
          customLocationName={effectiveLocationName}
          isUserLocation={isUserLocationActive}
        />
        <WavesCard
          harbor={harbor}
          safetyData={effectiveSafetyData}
          safetyHistory={safetyHistory}
          loading={loading}
        />
        <WeatherCard
          harbor={harbor}
          safetyData={effectiveSafetyData}
          loading={loading}
          customLocationName={effectiveLocationName}
          customLocationState={effectiveLocationState}
          isUserLocation={isUserLocationActive}
          userLocation={userLocation}
        />
      </section>
    )
  }

  if (dashboardContext === 'NAVIGATION_ROUTE') {
    return (
      <section className="topic-grid">
        <RouteSummaryCard
          route={routes?.[0] || {}}
          queryTarget={queryTarget || 'Transit Corridor'}
          loading={loading}
        />
        <ComplianceCard
          zones={restrictedZones}
          loading={loading}
        />
        <WavesCard
          harbor={harbor}
          safetyData={effectiveSafetyData}
          safetyHistory={safetyHistory}
          loading={loading}
        />
        <WeatherCard
          harbor={harbor}
          safetyData={effectiveSafetyData}
          loading={loading}
          customLocationName={effectiveLocationName}
          customLocationState={effectiveLocationState}
          isUserLocation={isUserLocationActive}
          userLocation={userLocation}
        />
      </section>
    )
  }

  // Default Standard Harbor Telemetry (or Inland 2-Card View)
  return (
    <section className={`topic-grid${!hasLiveMarineData || dashboardContext === 'INLAND_STATUS' ? ' topic-grid--two' : ''}`}>
      <WeatherCard
        harbor={harbor}
        safetyData={effectiveSafetyData}
        loading={loading}
        customLocationName={effectiveLocationName}
        customLocationState={effectiveLocationState}
        isUserLocation={isUserLocationActive}
        userLocation={userLocation}
      />
      <WindCard
        harbor={harbor}
        safetyData={effectiveSafetyData}
        loading={loading}
        customLocationName={effectiveLocationName}
        isUserLocation={isUserLocationActive}
      />
      {hasLiveMarineData && dashboardContext !== 'INLAND_STATUS' && (
        <>
          <WavesCard
            harbor={harbor}
            safetyData={effectiveSafetyData}
            safetyHistory={safetyHistory}
            loading={loading}
          />
          <TideCard
            harbor={harbor}
            safetyData={effectiveSafetyData}
            tides={tides}
            tideMeta={tideMeta}
            loading={loading}
          />
        </>
      )}
    </section>
  )
}
