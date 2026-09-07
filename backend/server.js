// ---------------------------------------------------------------------------
// SagarSetu Backend — Express.js Application Server
// ---------------------------------------------------------------------------
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { testConnection } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// EJS View Engine
// ---------------------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// RESTful API Routes (JSON)
// ---------------------------------------------------------------------------
app.use('/api/v1/harbors', require('./routes/harbors'));
app.use('/api/v1/safety', require('./routes/safety'));
app.use('/api/v1/tides', require('./routes/tides'));
app.use('/api/v1/pfz', require('./routes/pfz'));
app.use('/api/v1/navigation', require('./routes/navigation'));
app.use('/api/v1/analytics', require('./routes/analytics'));

// ---------------------------------------------------------------------------
// EJS Admin Routes (Server-Rendered HTML)
// ---------------------------------------------------------------------------
app.use('/admin', require('./routes/admin'));

// ---------------------------------------------------------------------------
// Root & Health Checks for Cloud Deployment (Railway / Docker)
// ---------------------------------------------------------------------------
app.get(['/', '/health'], (_req, res) => {
  res.json({
    service: 'SagarSetu ORCA Marine Intelligence API',
    status: 'online',
    version: '1.0.0',
    documentation: '/admin/api-docs',
    api_base: '/api/v1',
  });
});

// ---------------------------------------------------------------------------
// API Base Directory & Health Check
// ---------------------------------------------------------------------------
app.get(['/api/v1', '/api/v1/'], (_req, res) => {
  res.json({
    service: 'SagarSetu ORCA Marine Intelligence API',
    version: '1.0.0',
    status: 'online',
    documentation: '/admin/api-docs',
    endpoints: {
      harbors: '/api/v1/harbors',
      safety_nowcast: '/api/v1/safety/nowcast?harbor_id=1',
      safety_alerts: '/api/v1/safety/alerts',
      tides: '/api/v1/tides?harbor_id=1',
      pfz_advisories: '/api/v1/pfz/advisories?harbor_id=1',
      navigation_routes: '/api/v1/navigation/routes?harbor_id=1',
      restricted_zones: '/api/v1/navigation/restricted-zones',
      catch_trends: '/api/v1/analytics/catch-trends',
      species_diagnostics: '/api/v1/analytics/species',
      health: '/api/v1/health',
    },
  });
});

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'SagarSetu ORCA Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ---------------------------------------------------------------------------
// 404 Handler
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error', details: err?.message || String(err), code: err?.code });
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
async function start() {
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('Starting server without database connection. API calls will fail.');
  }
  app.listen(PORT, () => {
    console.log(`\nSagarSetu Backend running at http://localhost:${PORT}`);
    console.log(`API Base:  http://localhost:${PORT}/api/v1`);
    console.log(`Admin:     http://localhost:${PORT}/admin`);
    console.log(`Health:    http://localhost:${PORT}/api/v1/health\n`);
  });
}

start();
