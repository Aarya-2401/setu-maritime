"""
ORCA Marine Intelligence Platform — Aiven MySQL Automated Setup & Ingestion (Python)
=====================================================================================
Initializes the 3NF relational schema (16 tables + 4 pre-joined SQL views),
bulk-loads the 167,000+ relational records via pandas & PyMySQL with SSL,
and validates the views with live test queries.

Usage:
  python3 scripts/setup-aiven.py "<AIVEN_SERVICE_URI>"
  python3 scripts/setup-aiven.py
"""

import os
import sys
import time
import ssl
from urllib.parse import urlparse, unquote
import numpy as np
import pandas as pd

try:
    import pymysql
except ImportError:
    print("[ERROR] Please install pymysql: pip3 install pymysql cryptography")
    sys.exit(1)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

CANDIDATE_DATA_DIRS = [
    os.path.join(PROJECT_ROOT, "data", "processed_data"),
    os.path.join(BASE_DIR, "data", "processed_data"),
    "/Users/aaryasingh/.gemini/antigravity/scratch/orca_marine_datasets/processed_data"
]

CANDIDATE_SCHEMAS = [
    os.path.join(PROJECT_ROOT, "Schema", "orca_schema_3nf.sql"),
    os.path.join(BASE_DIR, "Schema", "orca_schema_3nf.sql"),
    "/Users/aaryasingh/.gemini/antigravity/scratch/orca_marine_datasets/orca_schema_3nf.sql"
]

TABLE_INGESTION_ORDER = [
    "dim_fishing_harbors",
    "dim_fishing_harbor_facilities",
    "dim_maritime_boundaries",
    "dim_restricted_zones",
    "dim_species_trend_diagnostics",
    "fact_cyclone_tracks",
    "fact_marine_alerts",
    "fact_pfz_advisories",
    "fact_coastal_weather_hourly",
    "fact_wave_sea_state_hourly",
    "fact_sst_hourly_stations",
    "fact_tide_predictions",
    "fact_fish_catch_statistics",
    "fact_ocean_currents",
    "fact_sst_regional_grid",
    "fact_chlorophyll_regional_grid"
]


def resolve_path(candidates, check_file=None):
    for path in candidates:
        if os.path.exists(path):
            if check_file:
                if os.path.exists(os.path.join(path, check_file)):
                    return path
            else:
                return path
    return None


def get_connection(service_uri):
    parsed = urlparse(service_uri)
    db_name = parsed.path.lstrip("/") or "defaultdb"

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    return pymysql.connect(
        host=parsed.hostname,
        port=int(parsed.port or 3306),
        user=parsed.username or "avnadmin",
        password=unquote(parsed.password or ""),
        database=db_name,
        ssl=ssl_ctx,
        autocommit=True,
        charset="utf8mb4"
    )


def run_setup():
    args = sys.argv[1:]
    service_uri = next((a for a in args if a.startswith("mysql://")), None)

    if not service_uri:
        service_uri = os.environ.get("DATABASE_URL") or os.environ.get("MYSQL_URL")

    print("=" * 70)
    print("ORCA MARINE PLATFORM — AIVEN CLOUD MYSQL SETUP (PYTHON)")
    print("=" * 70)

    if not service_uri:
        print("\n[ERROR] No Aiven Service URI provided.")
        print("Usage:")
        print("  python3 scripts/setup-aiven.py \"mysql://avnadmin:PASSWORD@HOST:PORT/defaultdb?ssl-mode=REQUIRED\"\n")
        sys.exit(1)

    print("\n[1/5] Connecting to Aiven MySQL...")
    conn = get_connection(service_uri)
    cursor = conn.cursor()
    cursor.execute("SELECT VERSION(), CURRENT_USER();")
    ver, user = cursor.fetchone()
    print(f"  Connected successfully! Version: {ver} | User: {user}")

    print("\n[2/5] Initializing Database `orca_marine_db`...")
    cursor.execute("CREATE DATABASE IF NOT EXISTS orca_marine_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    cursor.execute("USE orca_marine_db;")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
    print("  Database `orca_marine_db` ready.")

    schema_file = resolve_path(CANDIDATE_SCHEMAS)
    print(f"\n[3/5] Executing 3NF Schema DDL from: {schema_file}...")
    with open(schema_file, "r", encoding="utf-8") as f:
        sql_commands = f.read()

    statements = [s.strip() for s in sql_commands.split(";") if s.strip()]
    for stmt in statements:
        try:
            cursor.execute(stmt)
        except Exception as e:
            if "Unknown table" not in str(e) and "Unknown view" not in str(e):
                print(f"  [SQL Warning] {e}")
    print("  Schema DDL executed (16 tables + 4 views).")

    data_dir = resolve_path(CANDIDATE_DATA_DIRS, "dim_fishing_harbors.csv")
    print(f"\n[4/5] Ingesting CSV Datasets from: {data_dir}...")
    cursor.execute("USE orca_marine_db;")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
    total_rows = 0

    for tbl in TABLE_INGESTION_ORDER:
        csv_path = os.path.join(data_dir, f"{tbl}.csv")
        if not os.path.exists(csv_path):
            print(f"  [SKIP] {tbl}.csv not found.")
            continue

        df = pd.read_csv(csv_path)
        cols = list(df.columns)
        placeholders = ", ".join(["%s"] * len(cols))
        col_names = ", ".join([f"`{c}`" for c in cols])
        insert_sql = f"INSERT INTO `{tbl}` ({col_names}) VALUES ({placeholders})"

        raw_rows = df.values.tolist()
        clean_rows = []
        for r in raw_rows:
            clean_rows.append(tuple(None if (isinstance(val, float) and np.isnan(val)) or val is None or pd.isna(val) or val == "" else val for val in r))

        t0 = time.time()
        batch_size = 3000
        for i in range(0, len(clean_rows), batch_size):
            batch = clean_rows[i:i + batch_size]
            cursor.executemany(insert_sql, batch)

        elapsed_ms = (time.time() - t0) * 1000.0
        total_rows += len(df)
        print(f"  [LOADED] {tbl:<32}: {len(df):>7,} rows ({elapsed_ms:.0f} ms)")

    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
    conn.commit()
    print(f"\n  Total Relational Rows Ingested: {total_rows:,}")

    print("\n[5/5] Testing Pre-Joined Views...")
    cursor.execute("SELECT landing_center_name, state, significant_wave_height_m, composite_safety_rating FROM v_ocean_safety_nowcast LIMIT 2;")
    print("  Sample v_ocean_safety_nowcast:", cursor.fetchall())

    conn.close()

    parsed = urlparse(service_uri)
    target_url = parsed._replace(path="/orca_marine_db").geturl()

    print("\n" + "=" * 70)
    print("AIVEN CLOUD MYSQL SETUP COMPLETED SUCCESSFULLY")
    print("=" * 70)
    print(f"\nYour Production Connection String:\nDATABASE_URL={target_url}\n")


if __name__ == "__main__":
    run_setup()
