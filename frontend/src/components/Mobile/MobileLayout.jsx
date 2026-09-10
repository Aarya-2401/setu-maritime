import TopBar from '../TopBar/TopBar'
import MapSection from '../MapSection/MapSection'
import ChatPanel from '../ChatPanel/ChatPanel'
import MobileCapsules from './MobileCapsules'
import './MobileLayout.css'

export default function MobileLayout({
  harbor,
  harbors,
  onSelectHarbor,
  safetyData,
  assessment,
  onOpenAssessment,
  loading,
  hasApiError,
  tides,
  tideMeta,
  advisories,
  routes,
  restrictedZones,
  maritimeBoundaries,
  selectedRouteId,
  onSelectRoute,
  mapFocusTarget,
  userLocation,
  messages,
  onAddMessage,
  onTriggerKeralaDemo,
  onMapFocus
}) {
  return (
    <div className="mobile-layout">
      {/* Mobile Header Bar */}
      <TopBar
        harbor={harbor}
        harbors={harbors}
        onSelectHarbor={onSelectHarbor}
        safetyData={safetyData}
        assessment={assessment}
        onOpenAssessment={onOpenAssessment}
        loading={loading}
        hasApiError={hasApiError}
      />

      {/* Top Horizontal Status Capsules */}
      <MobileCapsules
        harbor={harbor}
        safetyData={safetyData}
        tides={tides}
        tideMeta={tideMeta}
        loading={loading}
      />

      {/* Central Interactive Map Section */}
      <div className="mobile-layout__map-wrap">
        <MapSection
          harbor={harbor}
          harbors={harbors}
          onSelectHarbor={onSelectHarbor}
          safetyData={safetyData}
          advisories={advisories}
          routes={routes}
          restrictedZones={restrictedZones}
          maritimeBoundaries={maritimeBoundaries}
          selectedRouteId={selectedRouteId || assessment?.selectedRoute?.advisory_id}
          onSelectRoute={onSelectRoute}
          assessment={assessment}
          onOpenAssessment={onOpenAssessment}
          loading={loading}
          hasApiError={hasApiError}
          mapFocusTarget={mapFocusTarget}
          userLocation={userLocation}
        />
      </div>

      {/* Docked Mobile Chatbot Section */}
      <div className="mobile-layout__chat-wrap">
        <ChatPanel
          harbor={harbor}
          harbors={harbors}
          safetyData={safetyData}
          tides={tides}
          advisories={advisories}
          messages={messages}
          onAddMessage={onAddMessage}
          assessment={assessment}
          selectedRoute={assessment?.selectedRoute}
          onOpenAssessment={onOpenAssessment}
          hasApiError={hasApiError}
          onTriggerKeralaDemo={onTriggerKeralaDemo}
          onSelectHarbor={onSelectHarbor}
          onMapFocus={onMapFocus}
          isMobile={true}
        />
      </div>
    </div>
  )
}
