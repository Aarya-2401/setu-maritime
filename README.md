# SETU-ADAM01: Integrated Maritime Decision Support Platform

[![Platform Status](https://img.shields.io/badge/Status-Production%20Active-00C853?style=flat-square)](https://orca-frontend-flax.vercel.app/)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel%20Edge%20CDN-000000?style=flat-square&logo=vercel)](https://orca-frontend-flax.vercel.app/)
[![Backend API](https://img.shields.io/badge/Backend-Railway%20PaaS-0B0D0E?style=flat-square&logo=railway)](https://setu-maritime-production.up.railway.app)
[![Database](https://img.shields.io/badge/Database-Aiven%20Cloud%20MySQL%208.0-FF4081?style=flat-square)](https://aiven.io/)
[![Multi-Agent AI](https://img.shields.io/badge/AI%20Engine-LangGraph%20%7C%20Google%20Gemini-4285F4?style=flat-square)](https://langchain-ai.github.io/langgraphjs/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Coverage](https://img.shields.io/badge/Coverage-56%20Harbors%20%7C%20Indian%20EEZ-00838F?style=flat-square)](#problem-statement-and-operational-context)

SETU-ADAM01 is an enterprise-grade marine intelligence and spatial decision support platform designed for Indian coastal waters, the 200-nautical-mile Exclusive Economic Zone (EEZ), and sensitive maritime boundaries. The system couples a high-density, zero-scroll executive geospatial cockpit with a LangGraph multi-agent AI orchestration pipeline powered by Google Gemini and a 3NF normalized MySQL database containing over 167,000 maritime records.

---

## Live Production Deployments

- **Web Dashboard**: [https://orca-frontend-flax.vercel.app/](https://orca-frontend-flax.vercel.app/)
- **Production REST API**: [https://setu-maritime-production.up.railway.app](https://setu-maritime-production.up.railway.app)
- **API Health Check**: [https://setu-maritime-production.up.railway.app/api/v1/health](https://setu-maritime-production.up.railway.app/api/v1/health)
- **Source Repository**: [https://github.com/Aarya-2401/setu-maritime](https://github.com/Aarya-2401/setu-maritime)

---

## Table of Contents

1. [Problem Statement and Operational Context](#problem-statement-and-operational-context)
2. [System Architecture](#system-architecture)
3. [LangGraph Multi-Agent AI Engine](#langgraph-multi-agent-ai-engine)
4. [Relational Database Model (3NF)](#relational-database-model-3nf)
5. [Key Technical Innovations](#key-technical-innovations)
6. [REST API Specification](#rest-api-specification)
7. [Repository Structure](#repository-structure)
8. [Local Development and Setup](#local-development-and-setup)
9. [Production Infrastructure and Deployment](#production-infrastructure-and-deployment)
10. [Engineering Portfolio Highlights](#engineering-portfolio-highlights)

---

## Problem Statement and Operational Context

India spans a coastline of 7,516 kilometers, an Exclusive Economic Zone (EEZ) of 2.37 million square kilometers, and supports millions of artisanal and commercial maritime operators. Marine operations in this region face four persistent operational vulnerabilities:

1. **Fragmented Hydro-Meteorological Intelligence**: Sea state forecasts, IMD cyclone tracks, harmonic tide levels, and INCOIS alerts exist in isolated, non-standardized formats that cannot be dynamically synthesized at the helm.
2. **Fuel Waste and Sub-Optimal Catch Yields**: Fishers lack real-time correlation between sea surface temperature (SST) thermal fronts, chlorophyll-a concentrations, and Potential Fishing Zones (PFZs), resulting in inefficient fuel burn and longer transit times.
3. **Cross-Border Boundary Transgressions**: Ambiguous navigation near the International Maritime Boundary Line (IMBL) in the Gulf of Mannar, Palk Strait, and Sir Creek leads to vessel seizures, diplomatic incidents, and risk to human life.
4. **Marine Sanctuary Incursions**: Unintentional trawling within Marine Protected Areas (MPAs) and ecologically fragile marine corridors threatens biodiversity and violates statutory environmental protections.

SETU-ADAM01 resolves these issues through a single unified interface that synchronizes real-time telemetry, automated boundary checks, multi-agent AI consultations, and instant geospatial map visualization.

---

## System Architecture

The platform uses a decoupled client-server architecture with an AI orchestration graph mediating between the client, the LLM synthesis layer, and the relational database:

```
                            CLIENT APPLICATION LAYER
                       [ React 18 + Vite 5 + Leaflet ]
                       - Zero-Scroll 100vh Tactical HUD
                       - Dynamic Radar Canvas & Tile Overlays
                       - Stale-While-Revalidate (SWR) Client Cache
                       - Real-Time Topic Cards (Weather, Wind, Wave, Tide)
                                      |
                                      | HTTPS / JSON (REST)
                                      v
                             API GATEWAY LAYER
                         [ Express.js + TypeScript ]
                 - Helmet Security Headers & Strict CORS
                 - Morgan Structured Request Logging
                 - Global Error Boundary & Validation Middleware
                               /             \
                              /               \
                             v                 v
            [ Deterministic REST Routes ]    [ LangGraph Multi-Agent Engine ]
            - /api/v1/harbors                 - StateGraph Workflow Engine
            - /api/v1/safety                  - Coordinator (Intent & Planning)
            - /api/v1/tides                   - 10 Specialized Domain Sub-Agents
            - /api/v1/pfz                     - Deterministic SQL Grounding
            - /api/v1/navigation              - Google Gemini 2.5/1.5 Flash LLM
            - /api/v1/analytics               - Telemetry Card & Map Mutator
                             \                 /
                              \               /
                               v             v
                           PERSISTENCE LAYER
                    [ Aiven Managed Cloud MySQL 8.0 ]
                    - 16 Relational Tables in 3NF Normalization
                    - 4 Pre-Joined Analytical Materialized Views
                    - 167,028 Rows of Maritime Telemetry
                    - TLS 1.3 / SSL Encrypted Connection Pool
                    - Composite B-Tree Indexes & Keep-Alive Pingers
```

### Request and Data Lifecycle

1. **User Query Dispatch**: The client sends a natural language query or telemetry filter request to the backend.
2. **Intent Parsing and Planning**: The LangGraph coordinator parses user intent, identifies the requested maritime domain, and resolves geographic coordinates against the harbor database using strict tri-state resolution logic.
3. **Deterministic Agent Execution**: The graph dispatches requests concurrently via `Promise.all` to the relevant domain sub-agents. Each agent retrieves factual, indexed data from MySQL before any LLM inference occurs.
4. **Synthesis and Action Generation**: The synthesizer node merges agent telemetry into a cohesive briefing, generates structured card mutations for the frontend HUD, and issues geospatial viewport instructions (`recenter`, `flyTo`, polygon focus).
5. **Client HUD Synchronization**: The React client consumes the response, updates the four metric cards, animates Leaflet map coordinates, and prints the operational advisory in the Copilot stream.

---

## LangGraph Multi-Agent AI Engine

The platform AI core is constructed with `@langchain/langgraph` and `@langchain/google-genai`. It operates as a directed acyclic graph (DAG) maintaining deterministic execution bounds.

```
       [ START ]
           |
           v
    +--------------+
    |  coordinate  |  --> Parses user intent & generates execution plan
    +--------------+  --> Executes tri-state harbor resolution (SUPPORTED | INLAND | UNKNOWN)
           |
           v
    +--------------+
    |   execute    |  --> Dispatches domain agents concurrently via Promise.all
    +--------------+  --> Performs deterministic SQL queries against Aiven MySQL
           |
           v
    +--------------+
    |  synthesize  |  --> Combines verified data into natural language operational briefing
    +--------------+  --> Emits structured HUD card mutations and Leaflet map commands
           |
           v
        [ END ]
```

### Graph State Definition (`OrcaState`)

```typescript
const OrcaState = Annotation.Root({
  query: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => '' }),
  plan: Annotation<QueryPlan>({ reducer: (x, y) => y ?? x, default: () => ({}) }),
  locationResolution: Annotation<LocationResolution>({ reducer: (x, y) => y ?? x, default: () => ({ status: 'UNKNOWN' }) }),
  resolvedHarbor: Annotation<Harbor | null>({ reducer: (x, y) => y ?? x, default: () => null }),
  results: Annotation<AgentResult[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  answer: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => '' }),
  cardUpdates: Annotation<CardUpdate[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  mapUpdates: Annotation<MapUpdate[]>({ reducer: (a, b) => a.concat(b), default: () => [] })
});
```

### 10 Domain-Specific Sub-Agents

| Agent Name | Core Domain | Primary Database Source | Operational Output |
|---|---|---|---|
| **Weather Agent** | Atmospheric metrics | `fact_coastal_weather_hourly` | Temperature, atmospheric pressure, relative humidity, and precipitation risk. |
| **Wind Agent** | Aerodynamic safety | `fact_coastal_weather_hourly` | Sustained wind speeds (knots), Beaufort scale assessment, and squall advisories. |
| **Wave Agent** | Sea state mechanics | `fact_wave_sea_state_hourly` | Significant wave height (m), swell period, direction, and WMO sea condition code. |
| **Tide Agent** | Tidal navigation | `fact_tide_predictions` | Harmonic high/low tide predictions, astronomical tide curves, and navigation clearance windows. |
| **Cyclone Agent** | Severe storm tracking | `fact_cyclone_tracks` | Cyclone name, heading, pressure deficiency, and distance to nearest coastal assets. |
| **Marine Alert Agent** | Regulatory alerts | `fact_marine_alerts` | Active INCOIS and IMD color-coded sea safety bulletins (Green, Yellow, Orange, Red). |
| **PFZ Agent** | Fisheries productivity | `fact_pfz_advisories` | Satellite SST gradients, chlorophyll-a fronts, bearing, distance, and validity windows. |
| **Zone Agent** | Marine spatial compliance | `dim_restricted_zones` | Marine Protected Area boundaries, coral reef preserves, and sanctuary buffer coordinates. |
| **Species Agent** | Pelagic diagnostics | `dim_species_trend_diagnostics` | Seasonal presence of yellowfin tuna, Indian mackerel, oil sardine, and skipjack. |
| **Catch Agent** | Historical landings | `fact_fish_catch_statistics` | Annual and seasonal tonnage trends by gear type across coastal landing centers. |

---

## Relational Database Model (3NF)

The persistence tier runs on Aiven Managed MySQL 8.0, normalized to Third Normal Form (3NF) to eliminate data redundancy and preserve relational integrity across 167,028 records.

### Entity Relationship Structure

- Physical Schema Diagram: `Schema/relational_schema.png`
- Chen Notation Diagram: `Schema/chen_notation.png`
- Complete DDL Script: `Schema/orca_schema_3nf.sql`

```
 [dim_fishing_harbors] (56 Harbors)
       |
       +--- 1:N ---> [fact_coastal_weather_hourly] (73,344 rows)
       +--- 1:N ---> [fact_wave_sea_state_hourly]    (28,224 rows)
       +--- 1:N ---> [fact_tide_predictions]        (28,224 rows)
       +--- 1:N ---> [fact_marine_alerts]           (56 rows)
       +--- 1:N ---> [fact_pfz_advisories]          (1,680 rows)
       +--- 1:N ---> [fact_fish_catch_statistics]   (8,800 rows)
       +--- 1:N ---> [fact_ocean_currents]          (26,700 rows)
```

### Standardized Database Tables

1. `dim_fishing_harbors`: Primary harbor master with UN/LOCODE, WGS84 latitude/longitude, district, state, and coastal zone categorization.
2. `dim_fishing_harbor_facilities`: Cold storage, ice plant capacity, fuel bunkering, slipway access, and berth depth.
3. `dim_maritime_boundaries`: Coordinate nodes defining the 200 NM Indian EEZ and the International Maritime Boundary Line (IMBL).
4. `dim_restricted_zones`: Polygon vertices for Marine Protected Areas (MPAs), naval testing ranges, and biosphere reserves.
5. `dim_species_trend_diagnostics`: Pelagic and demersal marine species biological traits, thermal tolerance, and migration corridors.
6. `fact_coastal_weather_hourly`: Hourly observational weather telemetry (air temp, wind speed, gust, pressure, visibility).
7. `fact_wave_sea_state_hourly`: Significant wave height, peak swell period, swell direction, and sea state categorization.
8. `fact_sst_hourly_stations`: In-situ sea surface temperature recorded by coastal observation stations.
9. `fact_tide_predictions`: Harmonic tide height (meters) and water level classifications (High, Low, Slack).
10. `fact_cyclone_tracks`: North Indian Ocean cyclone tracks, storm intensity, center coordinates, and barometric minima.
11. `fact_marine_alerts`: Official advisories issued by IMD, INCOIS, and Indian Coast Guard.
12. `fact_fish_catch_statistics`: Catch weight (tonnes), species identification, gear type, and landing center statistics.
13. `fact_ocean_currents`: Ocean surface current speed (knots) and flow direction (degrees true).
14. `fact_sst_regional_grid`: Gridded satellite SST observational matrices.
15. `fact_chlorophyll_regional_grid`: Regional ocean color and chlorophyll-a density matrices.

### Pre-Joined Materialized Analytical Views

To deliver sub-50ms query latency for critical UI dashboards, four specialized SQL views encapsulate complex multi-table joins:

```sql
-- Real-time composite harbor telemetry view
CREATE VIEW v_ocean_safety_nowcast AS
SELECT 
    h.harbor_id, h.landing_center_name, h.state, h.latitude, h.longitude,
    w.air_temp_c, w.wind_speed_knots, w.wind_direction_deg, w.barometric_pressure_hpa,
    v.significant_wave_height_m, v.swell_period_sec, v.sea_state_code,
    a.severity AS active_alert_severity, a.alert_title
FROM dim_fishing_harbors h
LEFT JOIN fact_coastal_weather_hourly w ON h.harbor_id = w.harbor_id
LEFT JOIN fact_wave_sea_state_hourly v ON h.harbor_id = v.harbor_id
LEFT JOIN fact_marine_alerts a ON h.harbor_id = a.harbor_id AND a.is_active = TRUE;
```

Other pre-joined views include:
- `v_pfz_operational_advisory`: Joins active PFZ coordinates, sea surface temperature anomalies, and nearest landing centers.
- `v_geofenced_sailing_route`: Correlates coastal transit waypoints against restricted MPA polygons and IMBL danger thresholds.
- `v_fisheries_productivity_analytics`: Aggregates historical catch volumes by species and harbor.

---

## Key Technical Innovations

### 1. Strict Tri-State Location Resolution Contract

In maritime navigation software, silently defaulting an unrecognized or inland location to a default coastal port (such as Gujarat or Veraval) presents critical safety hazards. SETU-ADAM01 implements a strict tri-state resolution contract:

```
                      [ User Input Location ]
                                |
                                v
               [ Location Resolver Engine (db.ts) ]
                                |
      +-------------------------+-------------------------+
      |                                                   |
      v                                                   v
[ Direct Match in Harbor DB? ]            [ Known Inland Geo Name? ]
      |                                                   |
  YES |                                               YES |
      v                                                   v
{ status: 'SUPPORTED',                              { status: 'INLAND',
  harbor: HarborRecord }                              locationName: string }
      |                                                   |
      v                                                   v
Execute 10 Marine Sub-Agents                        Abort marine agent execution
Update Metric Cards & Recenter Map                  Preserve map coordinates
                                                    Advise user of inland status
                                                          |
                                                      NO  v
                                                    { status: 'UNKNOWN',
                                                      locationName: string }
                                                          |
                                                          v
                                                    Prompt user to pick from
                                                    56 coastal landing harbors
```

### 2. Deterministic SQL Grounding over Generative Hallucination

Rather than granting the language model unbounded generation rights over safety figures, every agent executes direct, parameterized SQL queries against the Aiven MySQL database. The Google Gemini model acts strictly as an analytical synthesizer, converting factual telemetry rows into structured natural language briefings without altering values for wind speeds, wave heights, or tide levels.

### 3. Cross-Cloud TLS Connection Pool Resilience

Connecting from a serverless/PaaS container environment on Railway to a managed cloud database cluster on Aiven across regions requires robust connection handling. The database abstraction layer incorporates:
- In-flight SSL/TLS certificate handshakes on port `26291`.
- Configurable pool limits (`connectionLimit: 10`, `waitForConnections: true`).
- Periodic TCP keep-alive pings every 45 seconds to prevent NAT timeouts and edge gateway drops.
- Non-blocking server bootstrap allowing graceful degradation if database reconnections occur.

### 4. Zero-Scroll 100vh Tactical HUD Layout

The React interface enforces a strict `100vh` viewport constraint without page-level scrollbars. The map canvas dynamically recalculates height via CSS Flexbox and Grid, maintaining full visibility of:
- The top navigation bar with live harbor selector and telemetry pulse.
- The 4 compact topic cards (Weather, Wind, Waves, Tide) updating reactively.
- The Leaflet bathymetric radar canvas with smooth camera flights (`flyTo`).
- The interactive Copilot conversational panel.

---

## REST API Specification

### Base URLs

- Production: `https://setu-maritime-production.up.railway.app/api/v1`
- Local Development: `http://localhost:3001/api/v1`

### Endpoints Overview

| Method | Route | Description | Parameters |
|---|---|---|---|
| `POST` | `/ai/chat` | Main LangGraph multi-agent copilot query | Body: `{ "query": string }` |
| `GET` | `/harbors` | List of all 56 registered fishing harbors | None |
| `GET` | `/harbors/:id` | Detailed metadata for a single harbor | `id` (path, integer) |
| `GET` | `/safety/nowcast` | Composite real-time ocean safety telemetry | `harbor_id` (query, optional) |
| `GET` | `/safety/alerts` | Active marine meteorological alerts | None |
| `GET` | `/tides` | Harmonic tide predictions and slack windows | `harbor_id` (query, optional) |
| `GET` | `/pfz/advisories` | INCOIS Potential Fishing Zone coordinates | `harbor_id` (query, optional) |
| `GET` | `/navigation/routes` | Navigational waypoints and clearance lines | `harbor_id` (query, optional) |
| `GET` | `/navigation/boundaries` | 200 NM EEZ and IMBL boundary polygons | None |
| `GET` | `/analytics/catch` | Historical catch statistics by harbor | `harbor_id` (query, optional) |
| `GET` | `/health` | Production health check and uptime probe | None |

### Sample Payloads

#### `POST /api/v1/ai/chat`

**Request Body:**
```json
{
  "query": "What are the fishing and wave conditions near Cochin right now?"
}
```

**Response (`200 OK`):**
```json
{
  "answer": "Current conditions at Cochin (Kochi), Kerala: The sea state is Moderate with significant wave heights of 1.4 meters and a swell period of 7.2 seconds. Sustained winds are 12.8 knots from the WNW (Beaufort Scale 4). No active cyclone threat detected within 250 nautical miles. The next high tide of 1.18m is expected at 14:20 IST. Potential Fishing Zone PFZ-2856 is active 24 NM offshore bearing 245 degrees, showing optimal thermal fronts.",
  "plan": {
    "location": { "name": "Cochin", "harborId": 19 },
    "requestedAgents": ["weather", "wind", "wave", "tide", "pfz"]
  },
  "resolvedHarbor": {
    "harbor_id": 19,
    "landing_center_name": "Cochin Fisheries Harbour",
    "district": "Ernakulam",
    "state": "Kerala",
    "latitude": 9.9455,
    "longitude": 76.2624
  },
  "cardUpdates": [
    { "category": "weather", "temp": "28.5 C", "humidity": "82%", "status": "Favorable" },
    { "category": "wind", "speed": "12.8 kts", "direction": "WNW", "beaufort": "Force 4" },
    { "category": "wave", "height": "1.4 m", "period": "7.2 s", "condition": "Moderate" },
    { "category": "tide", "nextHigh": "14:20 IST", "height": "1.18 m", "phase": "Flooding" }
  ],
  "mapUpdates": [
    {
      "action": "recenter",
      "harborId": 19,
      "location": { "name": "Cochin Fisheries Harbour", "latitude": 9.9455, "longitude": 76.2624 },
      "zoom": 11
    }
  ]
}
```

#### `GET /api/v1/health`

**Response (`200 OK`):**
```json
{
  "status": "ok",
  "timestamp": "2026-09-08T18:50:00.000Z",
  "uptime": 86420.54
}
```

---

## Repository Structure

```
setu-maritime/
├── backend/                        Express.js + TypeScript + LangGraph Service
│   ├── config/
│   │   └── db.js                   MySQL connection pool with keep-alive pingers
│   ├── routes/
│   │   ├── admin.js                Database health inspection endpoints
│   │   ├── analytics.js            Historical fisheries catch analytics
│   │   ├── harbors.js              Harbor master directory and facility routes
│   │   ├── navigation.js           Maritime routes, EEZ, and IMBL boundaries
│   │   ├── pfz.js                  INCOIS Potential Fishing Zone endpoints
│   │   ├── safety.js               Ocean safety nowcasting and alerts
│   │   └── tides.js                Harmonic tide predictions
│   ├── scripts/
│   │   └── setup-aiven.js          Cloud schema bootstrap and dataset migration
│   ├── src/
│   │   ├── ai/
│   │   │   ├── agents.ts           10 Specialized domain agent implementations
│   │   │   ├── coordinator.ts      Intent decomposition & LLM response synthesis
│   │   │   ├── db.ts               Tri-state location resolver & SQL queries
│   │   │   ├── gemini.ts           Google GenAI SDK client initialization
│   │   │   ├── graph.ts            LangGraph StateGraph compilation
│   │   │   ├── schemas.ts          Zod structured output schemas
│   │   │   └── types.ts            TypeScript domain interfaces and state types
│   │   └── routes/
│   │       └── ai.route.ts         POST /api/v1/ai/chat route controller
│   ├── server.ts                   Express application entry point and middleware
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                       React 18 + Vite 5 Geospatial Dashboard
│   ├── public/                     SVG and high-DPI maritime telemetry brand assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatPanel/          SETU-ADAM01 Copilot interface with AI stream
│   │   │   ├── MapSection/         Leaflet map, translucent glass HUDs, radar lock
│   │   │   ├── Modal/              AssessmentModal and geofence verification
│   │   │   ├── Sidebar/            Retractable mission drawer and navigation links
│   │   │   ├── TopBar/             Executive header with harbor selector
│   │   │   ├── TopicCards/         Dynamic telemetry cards (Weather, Wind, Wave, Tide)
│   │   │   └── Icons.jsx           Maritime SVG icon set
│   │   ├── data/
│   │   │   ├── decisionLogic.js    Autonomous safety assessment rule engine
│   │   │   ├── harborCodes.js      Harbor coordinates and UN/LOCODE reference
│   │   │   └── useOrcaAPI.js       SWR cached HTTP fetcher hooks
│   │   ├── services/
│   │   │   └── aiService.js        Frontend HTTP bridge to POST /api/v1/ai/chat
│   │   ├── App.jsx                 Root 100vh zero-scroll layout container
│   │   ├── App.css                 CSS Grid & Flexbox HUD layout constraints
│   │   └── main.jsx                React virtual DOM mount point
│   ├── package.json
│   └── vite.config.js              Vite build configuration & development proxy
│
├── Schema/                         Database Architecture & Documentation
│   ├── orca_schema_3nf.sql         Complete 3NF DDL, foreign keys, and SQL views
│   ├── relational_schema.png       Relational entity-relationship diagram
│   └── chen_notation.png           Chen notation diagram
│
├── data/                           Source Datasets
│   └── processed_data/             17 Curated CSV datasets (167,000+ total rows)
│
├── package.json                    Root orchestration package
└── README.md                       Master technical documentation
```

---

## Local Development and Setup

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- MySQL 8.0 instance (local server or cloud service such as Aiven)
- Google Gemini API key ([Google AI Studio](https://aistudio.google.com/))

### 1. Clone the Repository

```bash
git clone https://github.com/Aarya-2401/setu-maritime.git
cd setu-maritime
```

### 2. Install Dependencies

Install dependencies across all workspaces:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 3. Configure Environment Variables

Create `.env` in `backend/`:

```bash
cd backend
cp .env.example .env
```

Set the required credentials:

```env
PORT=3001
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=your-mysql-host.aivencloud.com
DB_PORT=26291
DB_USER=avnadmin
DB_PASSWORD=your-secure-password
DB_NAME=orca_marine_db

# Google Gemini API Configuration
GOOGLE_API_KEY=your-gemini-api-key
```

### 4. Initialize Database and Ingest Data

Run the migration script to construct the 3NF schema, build indexes, and import datasets:

```bash
node backend/scripts/setup-aiven.js
```

### 5. Start Development Servers

**Terminal 1 (Backend API):**
```bash
cd backend
npm run dev
# Server initializes at http://localhost:3001
```

**Terminal 2 (Frontend Dashboard):**
```bash
cd frontend
npm run dev
# Vite client launches at http://localhost:5173
```

---

## Production Infrastructure and Deployment

The production environment is hosted across three specialized cloud tiers:

```
[ End User ]
     |
     v
[ Vercel Global Edge Network ]
- Single Page Application (React 18 + Vite 5)
- Automated preview builds on pull requests
- Edge asset caching and Gzip/Brotli compression
- Live URL: https://orca-frontend-flax.vercel.app/
     |
     | HTTPS / REST API Calls
     v
[ Railway PaaS (Containerized Node.js) ]
- Nixpacks automated container runtime
- tsx execution engine for TypeScript server
- Automatic redeployment on Git push to main
- Live URL: https://setu-maritime-production.up.railway.app
     |
     | TLS 1.3 / SSL Encrypted SQL Connection Pool (Port 26291)
     v
[ Aiven Managed Cloud MySQL 8.0 ]
- Dedicated high-availability compute cluster
- Automated point-in-time recovery (PITR) backups
- Pre-warmed B-Tree indices across 167k+ records
- SSL certificate verification
```

---

## Engineering Portfolio Highlights

Summary points highlighting key technical accomplishments suitable for engineering resumes and technical interviews:

- **Architected Multi-Agent AI System**: Built an enterprise maritime copilot using LangGraph and Google Gemini, coordinating 10 specialized domain sub-agents (weather, wave dynamics, tidal harmonic curves, cyclone tracking, and spatial zone verification) to deliver verifiable, context-aware operational advisories.
- **Designed 3NF Relational Database**: Structured a 16-table 3NF schema on Aiven MySQL housing 167,000+ rows of oceanographic and fisheries data, designing 4 pre-joined analytical views that cut dashboard query latency to sub-50ms.
- **Eliminated Generative Hallucinations**: Implemented a deterministic SQL grounding pipeline where domain agents query relational data before LLM inference, ensuring critical navigational values (wind speeds, wave heights, tidal clearances) are 100% factual.
- **Solved Geographic Fallback Vulnerabilities**: Engineered a strict tri-state location resolution contract (`SUPPORTED`, `INLAND`, `UNKNOWN`) that completely eliminated silent default fallbacks, preventing dangerous inland-to-coastal misdirection.
- **Built Real-Time Geospatial HUD**: Developed a zero-scroll 100vh React 18 dashboard incorporating Leaflet radar layers, frosted glass HUD overlays (`backdrop-filter: blur(16px)`), automated camera transitions, and SWR caching for sub-second UI updates.
- **Engineered Resilient Cloud Infrastructure**: Containerized and deployed backend services to Railway PaaS and frontend assets to Vercel Edge CDN, implementing connection pool resilience with automated TCP keep-alive pingers over cross-cloud TLS connections.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
