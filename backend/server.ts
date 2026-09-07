import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { registerAiRoute } from './src/routes/ai.route';

const { testConnection } = require('./config/db');

console.log('[Startup Debug] DATABASE_URL present:', Boolean(process.env.DATABASE_URL), 'DB_HOST:', process.env.DB_HOST || '(unset)');

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/v1/harbors', require('./routes/harbors'));
app.use('/api/v1/safety', require('./routes/safety'));
app.use('/api/v1/tides', require('./routes/tides'));
app.use('/api/v1/pfz', require('./routes/pfz'));
app.use('/api/v1/navigation', require('./routes/navigation'));
app.use('/api/v1/analytics', require('./routes/analytics'));
app.use('/admin', require('./routes/admin'));

registerAiRoute(app);

app.get(['/', '/health'], (_req, res) => res.json({
  service: 'ORCA Marine Intelligence API', status: 'online', version: '2.0.0', api_base: '/api/v1'
}));
app.get(['/api/v1', '/api/v1/'], (_req, res) => res.json({
  service: 'ORCA Marine Intelligence API', version: '2.0.0', status: 'online',
  endpoints: { ai: '/api/v1/ai/chat', harbors: '/api/v1/harbors', safety: '/api/v1/safety/nowcast?harbor_id=1', tides: '/api/v1/tides?harbor_id=1', pfz: '/api/v1/pfz/advisories?harbor_id=1' }
}));
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() }));

app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err?.message || String(err),
    code: err?.code,
    errno: err?.errno
  });
});

async function start() {
  const dbOk = await testConnection();
  if (!dbOk) console.warn('Starting server without database connection. Database-backed agents will fail until DB is available.');
  app.listen(PORT, '0.0.0.0', () => console.log(`ORCA backend running at http://0.0.0.0:${PORT}`));
}
start();
