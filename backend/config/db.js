// ---------------------------------------------------------------------------
// ORCA Marine DB — MySQL2 Connection Pool
// ---------------------------------------------------------------------------
const mysql = require('mysql2/promise');

let poolConfig = {};

if (process.env.DATABASE_URL) {
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    poolConfig = {
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port, 10) || 3306,
      user: dbUrl.username,
      password: decodeURIComponent(dbUrl.password),
      database: dbUrl.pathname.replace(/^\//, '') || 'orca_marine_db',
    };
    if (process.env.DB_SSL === 'true' || dbUrl.searchParams.get('ssl-mode') || !dbUrl.hostname.includes('localhost')) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }
  } catch (err) {
    console.error('Failed to parse DATABASE_URL, falling back to individual env variables:', err.message);
  }
}

if (!poolConfig.host) {
  poolConfig = {
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT, 10) || 3306,
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'orca_marine_db',
  };
  if (process.env.DB_SSL === 'true') {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

poolConfig.waitForConnections = true;
poolConfig.connectionLimit    = parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10;
poolConfig.queueLimit         = 0;
poolConfig.enableKeepAlive    = true;
poolConfig.keepAliveInitialDelay = 0;

const pool = mysql.createPool(poolConfig);

// Quick connectivity test (called once at startup)
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT 1 AS ok');
    conn.release();
    console.log('MySQL connected → orca_marine_db');
    return true;
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
    return false;
  }
}

module.exports = { pool, testConnection };
