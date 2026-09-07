import WeatherCard from './WeatherCard'
import WindCard from './WindCard'
import WavesCard from './WavesCard'
import TideCard from './TideCard'
import './TopicCards.css'

export default function TopicCardsGrid({ harbor, safetyData, safetyHistory, tides, tideMeta, loading }) {
  return (
    <section className="topic-grid">
      <WeatherCard harbor={harbor} safetyData={safetyData} loading={loading} />
      <WindCard harbor={harbor} safetyData={safetyData} loading={loading} />
      <WavesCard
        harbor={harbor}
        safetyData={safetyData}
        safetyHistory={safetyHistory}
        loading={loading}
      />
      <TideCard harbor={harbor} safetyData={safetyData} tides={tides} tideMeta={tideMeta} loading={loading} />
    </section>
  )
}
