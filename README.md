# SETU-ADAM01  — Integrated Maritime Decision Support Platform

SETU-ADAM01 is an integrated marine intelligence platform engineered for real-time Indian maritime navigation, ocean safety nowcasting, Potential Fishing Zone (PFZ) advisory correlation, and geofenced sanctuary compliance. The system unites a high-density, zero-scroll executive React dashboard with a LangGraph multi-agent AI orchestration backend powered by Google Gemini and a 3NF relational MySQL database.

---

## Architectural Overview

```
                          USER / BROWSER
                                |
                                v
               [ SETU-ADAM01 Executive Dashboard ]
                - Zero-scroll 100vh command center
                - Leaflet interactive radar canvas
                - Translucent glass HUD overlays
                - 4 Compact topic cards (Weather, Wind, Waves, Tide)
                - Epsilon Six maritime telemetry branding
                                |
                   HTTP / REST  |  Vite Proxy
                                v
                    [ Express.js REST API ]
                   (server.ts / TypeScript)
                     /         |         \
                    /          |          \
        [ REST Endpoints ]     |      [ LangGraph AI Engine ]
        - /api/v1/harbors      |      - Gemini Multi-Agent Coordinator
        - /api/v1/safety       |      - 10 Specialized Domain Agents
        - /api/v1/tides        |      - StateGraph orchestration
        - /api/v1/pfz          |      - Real-time card & map syntheses
        - /api/v1/navigation   |
                    \          |          /
                     v         v         v
               [ MySQL 8.0 3NF Relational DB ]
                 - 17 Standardized maritime tables
                 - Optimized spatial views
```

---

## Project Structure

```
ORCA_final/
├── backend/                  Express.js + TypeScript + LangGraph multi-agent backend
│   ├── config/db.js          MySQL connection pool with auto-reconnect
│   ├── routes/               REST API route handlers (harbors, safety, tides, pfz, etc.)
│   ├── scripts/              Aiven cloud setup and data migration scripts
│   ├── src/
│   │   ├── ai/
│   │   │   ├── agents.ts     10 Specialized domain agents (weather, wind, wave, tide, etc.)
│   │   │   ├── coordinator.ts Gemini planning and final synthesis
│   │   │   ├── db.ts         Database helper queries and harbor resolution
│   │   │   ├── gemini.ts     Google GenAI client configuration
│   │   │   ├── graph.ts      LangGraph StateGraph compilation
│   │   │   ├── schemas.ts    Zod structured schemas for validation
│   │   │   └── types.ts      TypeScript interfaces for agents, plans, and results
│   │   └── routes/
│   │       └── ai.route.ts   POST /api/v1/ai/chat endpoint
│   ├── views/                Admin dashboard and REST API documentation EJS templates
│   ├── server.ts             Backend server initialization and middleware setup
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/                 React 18 + Vite 5 executive command dashboard
│   ├── public/               Epsilon Six transparent PNG logos, icons, and favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatPanel/    SETU-ADAM01 Copilot with live LangGraph AI & Kerala demo
│   │   │   ├── MapSection/   Leaflet map, translucent glass HUDs, radar lock banner
│   │   │   ├── Modal/        AssessmentModal and DetailModal geofence verification
│   │   │   ├── Sidebar/      Retractable mission drawer with Epsilon Six brand
│   │   │   ├── TopBar/       Executive navigation bar with harbor selection
│   │   │   ├── TopicCards/   Compact cards (Weather, Wind, Waves, Tide)
│   │   │   └── Icons.jsx     SVG vector icon set
│   │   ├── data/
│   │   │   ├── decisionLogic.js   Autonomous maritime safety assessment engine
│   │   │   ├── harborCodes.js     Official UN/LOCODE and harbor authorities
│   │   │   ├── keralaDemoData.js  Kerala flight demonstration coordinates and bulletin
│   │   │   ├── mockData.js        Sample telemetry and consultation chips
│   │   │   └── useOrcaAPI.js      SWR-cached data hooks with promise deduplication
│   │   ├── services/
│   │   │   └── aiService.js  Frontend bridge to POST /api/v1/ai/chat
│   │   ├── App.jsx           Zero-scroll 100vh layout root
│   │   ├── App.css           Grid layout and media query constraints
│   │   ├── index.css         Root styles and theme custom properties
│   │   └── main.jsx          Vite application mount
│   ├── index.html            SETU · Maritime Navigation metadata
│   ├── package.json
│   └── vite.config.js        Vite configuration with /api reverse proxy to port 3001
│
├── Schema/                   Database documentation and schema definition
│   ├── orca_schema_3nf.sql   Complete 3NF DDL, relational constraints, and SQL views
│   ├── relational_schema.png Relational entity-relationship diagram
│   ├── chen_notation.png     Chen notation diagram
│   └── orca_db_view.jpg      Database physical schema visualization
│
├── data/                     Cleaned maritime datasets
│   └── processed_data/       17 CSV files (harbors, safety, alerts, tides, tracks, etc.)
│
├── package.json              Root scripts for unified install and orchestration
└── README.md                 Master technical documentation
```

---

## 10 Specialized AI Domain Agents

The LangGraph multi-agent engine orchestrates 10 specialized domain agents:

1. **Weather Agent**: Evaluates ambient temperature, precipitation, barometric pressure, and visibility against maritime safety parameters.
2. **Wind Agent**: Analyzes sustained wind speeds, Beaufort scale ratings, and gust thresholds for small craft advisories.
3. **Wave Agent**: Evaluates significant wave heights, swell periods, and WMO sea states against vessel capability ceilings.
4. **Tide Agent**: Pulls harmonic tide predictions to identify safe departure and navigation slack windows.
5. **Cyclone Agent**: Monitors active North Indian Ocean cyclonic storm tracks, computing distance, heading, and intensity alerts.
6. **Marine Alert Agent**: Ingests active INCOIS and IMD maritime warnings, filtering by regional severity.
7. **PFZ Agent**: Queries Potential Fishing Zone coordinates, depth contours, and sea surface temperature fronts.
8. **Zone Agent**: Evaluates route corridors against Marine Protected Areas (MPAs) and environmentally sensitive sanctuaries.
9. **Species Agent**: Correlates pelagic species distributions (Tuna, Mackerel, Sardine) with oceanic convergence features.
10. **Catch Agent**: Analyzes seasonal fish landings and historical catch trends.

---

## Quickstart Guide

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- MySQL 8.0 (local instance or cloud database such as Aiven)
- Google Gemini API key (for LangGraph AI coordinator)

### 1. Installation
Run from the root of `ORCA_final`:
```bash
npm run install:all
```
Alternatively, install dependencies in each workspace:
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Backend Configuration
Create your `.env` file in the `backend/` directory:
```bash
cd backend
cp .env.example .env
```
Ensure the following variables are configured:
```env
PORT=3001
DB_HOST=your-mysql-host
DB_USER=your-mysql-user
DB_PASSWORD=your-mysql-password
DB_NAME=orca_marine_db
DB_PORT=3306

GOOGLE_API_KEY=your-gemini-api-key
NODE_ENV=development
```

### 3. Database Initialization
To import the 3NF schema and initialize tables and views:
```bash
mysql -h your-mysql-host -u your-mysql-user -p orca_marine_db < Schema/orca_schema_3nf.sql
```
To populate tables with the included datasets, run the migration script:
```bash
node backend/scripts/setup-aiven.js
```

### 4. Running the Development Servers
In Terminal 1 (Backend):
```bash
cd backend
npm run dev
```
The backend will launch at `http://localhost:3001`.

In Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```
The frontend will launch at `http://localhost:5173`.

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/ai/chat` | Main LangGraph multi-agent endpoint (`{ "query": "..." }`) |
| `GET` | `/api/v1/harbors` | List all 56 registered coastal fishing harbors |
| `GET` | `/api/v1/safety/nowcast?harbor_id=1` | Real-time ocean safety telemetry & composite ratings |
| `GET` | `/api/v1/safety/alerts` | Active marine meteorological alerts |
| `GET` | `/api/v1/tides?harbor_id=1` | Harmonic tide predictions and phase curves |
| `GET` | `/api/v1/pfz/advisories?harbor_id=1` | INCOIS Potential Fishing Zone advisories |
| `GET` | `/api/v1/navigation/routes?harbor_id=1` | Recommended navigation waypoints and distances |
| `GET` | `/api/v1/navigation/boundaries` | 200 NM EEZ and IMBL maritime boundary coordinates |
| `GET` | `/admin` | Interactive web dashboard for database status & table counts |
| `GET` | `/api/v1/health` | Service uptime and connectivity verification |

---

## Key Dashboard Features

- **Executive Zero-Scroll Layout**: Pinned to `100vh` without window scrollbars. The map dynamically flexes to fill available vertical space while keeping all 4 metric cards and chat visible.
- **Translucent Glass HUDs**: Non-opaque frosted glass headers and overlays (`backdrop-filter: blur(16px)`) let the underlying map and bathymetry remain visible.
- **Kerala Fishing Demonstration**: Typing queries like *"Can I fish near Kerala tomorrow?"* triggers an automated camera flight (`flyTo`) focusing Cochin harbor and locking onto active PFZ-2856.
- **Epsilon Six Identity**: High-DPI transparent PNG assets integrated across headers, drawer, and favicons.
