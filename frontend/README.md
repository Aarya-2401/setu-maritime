# SagarSetu Dashboard
### Maritime Decision-Support Client Interface

The SagarSetu Dashboard is a high-performance React 18 frontend built with Vite, Leaflet, and Framer Motion. Engineered for coastal harbor control rooms and fishing fleet operators, it converts complex oceanographic telemetry and geospatial data into actionable departure and navigational decisions.

---

## Quickstart

### Prerequisites
- Node.js v18.0.0 or higher
- SagarSetu Backend running on `http://localhost:3001`

### Installation & Run

```bash
# Navigate to dashboard directory
cd SagarSetu_dashboard

# Install dependencies
npm install

# Start Vite hot-reload development server
npm run dev

# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

The application runs locally at `http://localhost:5173`.

---

## Core Decision-Support Features

### 1. Global Departure Status & Assessment Engine
- **Unified Departure Pill**: Displays actionable departure readiness in the TopBar:
  - `SAFE TO DEPART` (All factors within standard operational limits)
  - `CAUTION — REVIEW ROUTE` (Marginal swell, wind gusts, or IMBL boundary proximity)
  - `DANGER — AVOID OFFSHORE ROUTE` (Severe sea state or marine sanctuary traversal violation)
- **Multi-Factor Assessment Modal**: Clickable `[ Why? ]` button opens a comprehensive breakdown of environmental thresholds, sovereign boundary status, 8-knot transit ETA, and explicit skipper directives.

### 2. Standardized Station Codes & Non-Shifting Layout
- **Station Code Architecture**: Implemented 3-letter station codes and 2-letter state RTO tags for all 56 national fishing harbors (e.g., `VRL · GJ`, `MNB · KL`, `MAA · TN`, `IXZ · AN`, `SSN · MH`).
- **Zero Lateral Shift**: Strict CSS flex architecture with fixed-width telemetry containers guarantees the TopBar never shifts laterally or vertically when changing harbors or safety ratings.

### 3. Visual Corridor Dominance & Geofenced Routing
- **Corridor Hierarchy**:
  - **Recommended Corridor**: Rendered as a thick, solid cyan vector (`weight: 4.0`, opacity `0.95`).
  - **Alternative Candidates**: Rendered as thin dashed vectors (`weight: 1.8`, `dashArray: 6, 6`, opacity `0.45`).
  - **Violation Corridors**: Rendered in high-visibility red dashed vectors with violated zone identification.
- **Interactive PFZ Hotspots**: Clicking any PFZ marker on the map selects the route, highlights its corridor across all components, displays target species and depth contour, and provides a direct `[ Select This Route ]` action.

### 4. Floating Geofence & Operational Clearance HUD
- Docked directly in the upper-right corner of the Leaflet map canvas.
- Separates legal **Geospatial Status** (200 NM Sovereign EEZ, IMBL standoff, and 10 Marine Protected Areas) from **Operational Status** (departure safety).
- Includes an embedded `[ Why? ]` shortcut to open the full assessment breakdown.

### 5. Fullscreen Expand Map Overlay
- Triggered via the **Expand Map** button in the map header.
- Uses Framer Motion spring animations and `backdrop-filter: blur(16px)` for a focused tactical overview.
- Includes layer toggles (Wave radius, PFZ hotspots, sailing corridors, restricted MPAs), live telemetry chips, and keyboard shortcut dismissal (<kbd>Escape</kbd>).
- Automatic Leaflet `invalidateSize()` ensures tiles recalculate dimensions with zero rendering artifacts.

### 6. Decision-Oriented Environmental Cards
- Contextual operational impact tags attached to each card:
  - **Waves**: `Route impact: LOW HAZARD` / `MODERATE HAZARD` / `HIGH HAZARD`
  - **Wind**: `Route impact: LOW / MODERATE / HIGH HAZARD`
  - **Weather**: `Visibility: CLEAR` / `REDUCED`
  - **Tides**: `Draft: OPTIMAL` / `CAUTION LOW`

### 7. VARUN Navigation Decision Copilot
- Prominent recommendation widget at the top of the chat panel displaying the optimal PFZ corridor, target species, bearing, distance, and transit time.
- Bulleted justification points explaining why the corridor is recommended.
- "Inspect Assessment Factors" button for rapid factor cross-referencing.

---

## Component Architecture

```
src/
├── components/
│   ├── ChatPanel/
│   │   ├── ChatPanel.jsx        # VARUN copilot & contextual route recommendation
│   │   └── ChatPanel.css
│   ├── MapSection/
│   │   ├── MapSection.jsx       # Leaflet map, corridor vectors, Geofence HUD, expand modal
│   │   └── MapSection.css
│   ├── Modal/
│   │   ├── AssessmentModal.jsx  # Multi-factor departure safety breakdown modal
│   │   ├── AssessmentModal.css
│   │   ├── DetailModal.jsx      # Telemetry deep-dive modal
│   │   └── DetailModal.css
│   ├── Sidebar/
│   │   ├── Sidebar.jsx          # Drawer navigation & individual mission deletion
│   │   └── Sidebar.css
│   ├── TopBar/
│   │   ├── TopBar.jsx           # Zero-shift station selector, telemetry HUD, departure pill
│   │   └── TopBar.css
│   ├── TopicCards/
│   │   ├── WavesCard.jsx        # Significant wave height, swell, and impact badge
│   │   ├── WindCard.jsx         # Sustained speed, gusts, and impact badge
│   │   ├── WeatherCard.jsx      # Temperature, humidity, barometric pressure, visibility
│   │   ├── TideCard.jsx         # Tidal phase, high/low predictions, draft badge
│   │   ├── ChartMini.jsx        # Reusable SVG sparkline chart
│   │   ├── TopicCard.jsx        # Base topic card container
│   │   └── TopicCardsGrid.jsx   # Responsive 4-card grid
│   └── Icons.jsx                # Clean SVG iconography (strictly zero emojis)
│
├── data/
│   ├── decisionLogic.js         # Unified departure evaluation, collision detection, ETA calculation
│   ├── harborCodes.js           # 56 harbor codes and state RTO abbreviation mappings
│   ├── mockData.js              # Fallback telemetry and harmonic tide envelopes
│   └── useMarineData.js         # Live React hook synchronizing with Express REST API
│
├── App.jsx                      # Main dashboard orchestrator & synchronized route state
├── App.css                      # Global layout, variables, and typography
├── index.css                    # Base styling and resets
└── main.jsx                     # Application root mount
```

---

## Backend Integration

The frontend hook (`useMarineData.js`) synchronizes with the SagarSetu Express API (`http://localhost:3001/api/v1`):

| Data Feed | REST Endpoint | Frontend Usage |
|-----------|---------------|----------------|
| **Harbors** | `/api/v1/harbors` | Populates station selector with coordinates and state codes |
| **Ocean Telemetry** | `/api/v1/safety/nowcast?harbor_id=:id` | Powers TopBar HUD, environmental topic cards, and departure ratings |
| **Hazard Alerts** | `/api/v1/safety/alerts` | Warns of active cyclone bulletins or regional small craft advisories |
| **Tidal Predictions** | `/api/v1/tides?harbor_id=:id` | Drives TideCard sparklines and harmonic high/low tide predictions |
| **PFZ Advisories** | `/api/v1/pfz/advisories?harbor_id=:id` | Displays satellite PFZ hotspots, target species, and depth contours |
| **Sailing Routes** | `/api/v1/navigation/routes?harbor_id=:id` | Renders geofenced sailing corridors from `v_geofenced_sailing_route` |
| **Restricted Zones** | `/api/v1/navigation/restricted-zones` | Renders 10 Marine Protected Areas and seasonal monsoon ban buffers |

---

## Strict Design Standards

- **Zero EMOJIS Enforced**: All visual indicators use custom inline SVG elements (`CheckPassIcon`, `CheckWarnIcon`, `CheckFailIcon`, `IconCompass`, `IconMaximize`, `IconMinimize`, `IconX`). Tested and verified via AST regex scanner with 0 emoji matches across all files.
- **Control-Room Aesthetics**: Dark maritime theme (`#080f1d`, `#0b1728`, `#0e1e38`) with high-contrast cyan accents (`#06b6d4`, `#38bdf8`) and tactical status indicators (Green `#10b981`, Amber `#f59e0b`, Red `#ef4444`).
- **Production Build**: Verified clean Vite build under 1 second with tree-shaking and zero module resolution warnings.
