import WeatherCard from './WeatherCard'
import WindCard from './WindCard'
import WavesCard from './WavesCard'
import TideCard from './TideCard'
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
  isUserLocationActive = false
}) {
  const activeLocationName = isUserLocationActive && userLocation?.label
    ? userLocation.label
    : harbor?.landing_center_name || 'Coastal Station'

  return (
    <section className={`topic-grid${!hasLiveMarineData ? ' topic-grid--two' : ''}`}>
      <WeatherCard
        harbor={harbor}
        safetyData={safetyData}
        loading={loading}
        customLocationName={activeLocationName}
        isUserLocation={isUserLocationActive}
        userLocation={userLocation}
      />
      <WindCard
        harbor={harbor}
        safetyData={safetyData}
        loading={loading}
        customLocationName={activeLocationName}
        isUserLocation={isUserLocationActive}
      />
      {hasLiveMarineData && (
        <>
          <WavesCard
            harbor={harbor}
            safetyData={safetyData}
            safetyHistory={safetyHistory}
            loading={loading}
          />
          <TideCard
            harbor={harbor}
            safetyData={safetyData}
            tides={tides}
            tideMeta={tideMeta}
            loading={loading}
          />
        </>
      )}
    </section>
  )
}
