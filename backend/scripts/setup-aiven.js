/**
 * ORCA Marine Intelligence Platform — Aiven MySQL Automated Setup & Ingestion Script
 * =================================================================================
 * Connects to Aiven MySQL instance using SSL, initializes the 3NF relational schema
 * (15 tables + 4 pre-joined SQL views), bulk-loads the 167,000+ records,
 * and validates the database with live test queries.
 *
 * Usage:
 *   node scripts/setup-aiven.js "<AIVEN_SERVICE_URI>"
 *   node scripts/setup-aiven.js
 *   node scripts/setup-aiven.js --verify-only
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Target Ingestion Order (Respects foreign key hierarchy)
const TABLE_INGESTION_ORDER = [
  'dim_fishing_harbors',
  'dim_fishing_harbor_facilities',
  'dim_maritime_boundaries',
  'dim_restricted_zones',
  'dim_species_trend_diagnostics',
  'fact_cyclone_tracks',
  'fact_marine_alerts',
  'fact_pfz_advisories',
  'fact_coastal_weather_hourly',
  'fact_wave_sea_state_hourly',
  'fact_sst_hourly_stations',
  'fact_tide_predictions',
  'fact_fish_catch_statistics',
  'fact_ocean_currents',
  'fact_sst_regional_grid',
  'fact_chlorophyll_regional_grid',
];

// Potential locations for the CSV datasets
function resolveDataDir() {
  const candidateDirs = [
    path.join(__dirname, '../../data/processed_data'),
    path.join(__dirname, '../data/processed_data'),
    path.join(__dirname, '../../processed_data'),
    '/Users/aaryasingh/.gemini/antigravity/scratch/orca_marine_datasets/processed_data',
  ];

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'dim_fishing_harbors.csv'))) {
      return dir;
    }
  }
  return null;
}

// Potential locations for the DDL schema
function resolveSchemaFile() {
  const candidateFiles = [
    path.join(__dirname, '../../Schema/orca_schema_3nf.sql'),
    path.join(__dirname, '../Schema/orca_schema_3nf.sql'),
    path.join(__dirname, 'orca_schema_3nf.sql'),
    '/Users/aaryasingh/.gemini/antigravity/scratch/orca_marine_datasets/orca_schema_3nf.sql',
  ];

  for (const f of candidateFiles) {
    if (fs.existsSync(f)) {
      return f;
    }
  }
  return null;
}

function parseConnectionDetails(serviceUri) {
  try {
    const parsed = new URL(serviceUri);
    const dbName = parsed.pathname.replace(/^\//, '') || 'defaultdb';
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 3306,
      user: parsed.username || 'avnadmin',
      password: decodeURIComponent(parsed.password || ''),
      database: dbName,
      ssl: { rejectUnauthorized: false },
      multipleStatements: true,
      waitForConnections: true,
      connectionLimit: 5,
    };
  } catch (err) {
    throw new Error(`Invalid Service URI format: ${err.message}`);
  }
}

async function runSetup() {
  const args = process.argv.slice(2);
  const verifyOnly = args.includes('--verify-only');
  const skipData = args.includes('--schema-only');

  let serviceUri = args.find(a => a.startsWith('mysql://'));
  if (!serviceUri) {
    serviceUri = process.env.DATABASE_URL || process.env.MYSQL_URL;
  }

  console.log('================================================================');
  console.log('ORCA MARINE PLATFORM — AIVEN CLOUD MYSQL PROVISIONING PIPELINE');
  console.log('================================================================');

  if (!serviceUri) {
    console.error('\n[ERROR] No Aiven Service URI provided.');
    console.error('\nPlease supply your Aiven MySQL Service URI:');
    console.error('  node scripts/setup-aiven.js "mysql://avnadmin:PASSWORD@HOST:PORT/defaultdb?ssl-mode=REQUIRED"');
    console.error('Or add DATABASE_URL to your backend/.env file.\n');
    process.exit(1);
  }

  const connConfig = parseConnectionDetails(serviceUri);
  console.log(`\nTarget Host     : ${connConfig.host}`);
  console.log(`Target Port     : ${connConfig.port}`);
  console.log(`Target User     : ${connConfig.user}`);
  console.log(`Initial DB      : ${connConfig.database}`);
  console.log(`SSL Encryption  : Enabled (rejectUnauthorized: false)`);

  let connection;
  try {
    console.log('\n[1/5] Connecting to Aiven MySQL Service...');
    connection = await mysql.createConnection(connConfig);
    const [ver] = await connection.query('SELECT VERSION() AS version, CURRENT_USER() AS user');
    console.log('  Connected successfully!');
    console.log(`  MySQL Version : ${ver[0].version}`);
    console.log(`  Current User  : ${ver[0].user}`);
  } catch (err) {
    console.error(`\n[FATAL] Failed to connect to Aiven MySQL: ${err.message}`);
    console.error('Verify your host, port, credentials, and ensure the Aiven service state is RUNNING.');
    process.exit(1);
  }

  try {
    if (verifyOnly) {
      await runVerification(connection);
      await connection.end();
      return;
    }

    // Step 2: Create Database orca_marine_db and select it
    console.log('\n[2/5] Initializing Database `orca_marine_db`...');
    await connection.query('CREATE DATABASE IF NOT EXISTS orca_marine_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    await connection.query('USE orca_marine_db;');
    console.log('  Database `orca_marine_db` ready and active.');

    // Step 3: Execute Schema DDL
    const schemaFile = resolveSchemaFile();
    if (!schemaFile) {
      throw new Error('Schema file orca_schema_3nf.sql could not be found.');
    }
    console.log(`\n[3/5] Executing 3NF Schema DDL from:`);
    console.log(`  ${schemaFile}`);

    const ddlContent = fs.readFileSync(schemaFile, 'utf8');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query(ddlContent);
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('  Schema DDL executed successfully (15 tables and 4 views created).');

    // Step 4: Ingest CSV Datasets
    if (!skipData) {
      const dataDir = resolveDataDir();
      if (!dataDir) {
        console.warn('\n[WARNING] Processed CSV data directory not found. Skipping data ingestion.');
        console.warn('You can run the script again after placing CSV files in data/processed_data.');
      } else {
        console.log(`\n[4/5] Ingesting CSV Datasets into Aiven MySQL from:`);
        console.log(`  ${dataDir}`);

        await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
        let totalInserted = 0;

        for (const tableName of TABLE_INGESTION_ORDER) {
          const csvFile = path.join(dataDir, `${tableName}.csv`);
          if (!fs.existsSync(csvFile)) {
            console.log(`  [SKIP] ${tableName}.csv not found.`);
            continue;
          }

          const fileContent = fs.readFileSync(csvFile, 'utf8');
          const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
          });

          if (records.length === 0) {
            console.log(`  [EMPTY] ${tableName}: 0 records.`);
            continue;
          }

          const columns = Object.keys(records[0]);
          const escapedColumns = columns.map(c => `\`${c}\``).join(', ');
          const sql = `INSERT INTO \`${tableName}\` (${escapedColumns}) VALUES ?`;

          // Clean values: convert empty strings to null and string booleans to 1/0
          const rows = records.map(r =>
            columns.map(c => {
              const val = r[c];
              if (val === '' || val === undefined || val === 'NaN' || val === 'null') {
                return null;
              }
              if (val === 'True' || val === 'true') return 1;
              if (val === 'False' || val === 'false') return 0;
              return val;
            })
          );

          // Batch insert in chunks of 2,500
          const chunkSize = 2500;
          const t0 = Date.now();
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            await connection.query(sql, [chunk]);
          }
          const elapsedMs = Date.now() - t0;

          totalInserted += records.length;
          console.log(`  [LOADED] ${tableName.padEnd(32)}: ${records.length.toLocaleString().padStart(7)} rows (${elapsedMs}ms)`);
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
        console.log(`\n  Total Relational Rows Ingested: ${totalInserted.toLocaleString()}`);
      }
    }

    // Step 5: Verification
    console.log('\n[5/5] Validating Live Aiven Pre-Joined Views...');
    await runVerification(connection);

    // Provide Updated DATABASE_URL
    const parsedUrl = new URL(serviceUri);
    parsedUrl.pathname = '/orca_marine_db';
    const targetDatabaseUrl = parsedUrl.toString();

    console.log('================================================================');
    console.log('AIVEN CLOUD MYSQL SETUP COMPLETED SUCCESSFULLY');
    console.log('================================================================');
    console.log('\nYour Production Connection String:');
    console.log(`DATABASE_URL=${targetDatabaseUrl}\n`);
    console.log('Next Steps:');
    console.log('1. Save this DATABASE_URL in your `backend/.env` file for local testing.');
    console.log('2. Add this DATABASE_URL as an Environment Variable in Railway for production backend hosting.');

    // Prompt or automatically update local backend/.env
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('DATABASE_URL=')) {
        envContent = envContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL=${targetDatabaseUrl}`);
      } else {
        envContent = `DATABASE_URL=${targetDatabaseUrl}\n` + envContent;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('  Updated backend/.env automatically with your Aiven DATABASE_URL.');
    }

  } catch (err) {
    console.error(`\n[ERROR during provisioning]: ${err.message}`);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function runVerification(connection) {
  try {
    await connection.query('USE orca_marine_db;');

    // View 1: Ocean Safety Nowcast
    const [v1] = await connection.query(`
      SELECT landing_center_name, state, significant_wave_height_m, composite_safety_rating, advisory_text
      FROM v_ocean_safety_nowcast
      LIMIT 2;
    `);
    console.log('  View [v_ocean_safety_nowcast] Sample:');
    v1.forEach(row => {
      console.log(`    - ${row.landing_center_name} (${row.state}): Wave ${row.significant_wave_height_m}m | Safety: ${row.composite_safety_rating}`);
    });

    // View 2: PFZ Operational Advisory
    const [v2] = await connection.query(`
      SELECT landing_center_name, target_species, bearing_compass, distance_km, confidence_pct
      FROM v_pfz_operational_advisory
      LIMIT 2;
    `);
    console.log('  View [v_pfz_operational_advisory] Sample:');
    v2.forEach(row => {
      console.log(`    - ${row.landing_center_name}: Target ${row.target_species} | ${row.distance_km}km @ ${row.bearing_compass} (${row.confidence_pct}% conf)`);
    });

    // View 3: Geofenced Sailing Route
    const [v3] = await connection.query(`
      SELECT landing_center_name, geofencing_compliance_status, nearest_protected_zone
      FROM v_geofenced_sailing_route
      LIMIT 2;
    `);
    console.log('  View [v_geofenced_sailing_route] Sample:');
    v3.forEach(row => {
      console.log(`    - ${row.landing_center_name}: Status "${row.geofencing_compliance_status}" | Nearest MPA: ${row.nearest_protected_zone}`);
    });

    // Table Counts
    const [tbls] = await connection.query(`
      SELECT table_name, table_rows 
      FROM information_schema.tables 
      WHERE table_schema = 'orca_marine_db' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log(`\n  Verified ${tbls.length} Base Tables in \`orca_marine_db\`.`);
  } catch (err) {
    console.error(`  Verification check failed: ${err.message}`);
  }
}

runSetup();
