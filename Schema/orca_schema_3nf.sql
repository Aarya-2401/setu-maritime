-- ============================================================================
-- ORCA Marine Ecosystem Decision Support System — Production 3NF Database Schema
-- Database Engine: MySQL 8.0+ (InnoDB, utf8mb4)
-- Total Relational Records: 167,000+ rows across 15 Tables and 4 SQL Views
-- ============================================================================

CREATE DATABASE IF NOT EXISTS orca_marine_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE orca_marine_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. DIMENSION / REFERENCE TABLES
-- ----------------------------------------------------------------------------

-- Table: dim_fishing_harbors
DROP TABLE IF EXISTS dim_fishing_harbors;
CREATE TABLE dim_fishing_harbors (
    harbor_id               INT AUTO_INCREMENT PRIMARY KEY,
    landing_center_name     VARCHAR(150) NOT NULL,
    sector                  VARCHAR(50) NOT NULL,
    state                   VARCHAR(100) NOT NULL,
    district                VARCHAR(100) NOT NULL,
    coastal_zone            VARCHAR(100) NOT NULL,
    latitude                DECIMAL(8,4) NOT NULL,
    longitude               DECIMAL(8,4) NOT NULL,
    latitude_dms            VARCHAR(20) NOT NULL,
    longitude_dms           VARCHAR(20) NOT NULL,
    harbor_type             ENUM('MAJOR', 'MINOR', 'LANDING_CENTER') NOT NULL DEFAULT 'MINOR',
    vessel_capacity         INT NOT NULL DEFAULT 400,
    typical_depth_min_m     INT NOT NULL DEFAULT 20,
    typical_depth_max_m     INT NOT NULL DEFAULT 80,
    regional_language       VARCHAR(50) NOT NULL,
    facilities              TEXT NOT NULL,
    source                  VARCHAR(100) NOT NULL DEFAULT 'NFDB / Dept of Fisheries',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_harbor_state (state),
    INDEX idx_harbor_sector (sector),
    INDEX idx_harbor_spatial (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: dim_fishing_harbor_facilities (1NF Multivalued Bridge Table)
DROP TABLE IF EXISTS dim_fishing_harbor_facilities;
CREATE TABLE dim_fishing_harbor_facilities (
    harbor_id               INT NOT NULL,
    facility_name           VARCHAR(150) NOT NULL,
    PRIMARY KEY (harbor_id, facility_name),
    FOREIGN KEY (harbor_id) REFERENCES dim_fishing_harbors(harbor_id) ON DELETE CASCADE,
    INDEX idx_facility_name (facility_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: dim_maritime_boundaries
DROP TABLE IF EXISTS dim_maritime_boundaries;
CREATE TABLE dim_maritime_boundaries (
    boundary_id             VARCHAR(50) PRIMARY KEY,
    boundary_type           VARCHAR(100) NOT NULL,
    country                 VARCHAR(100) NOT NULL DEFAULT 'India',
    neighbor_country        VARCHAR(100) NULL DEFAULT 'N/A',
    jurisdiction_nm         INT NOT NULL DEFAULT 200,
    latitude                DECIMAL(8,4) NOT NULL,
    longitude               DECIMAL(8,4) NOT NULL,
    point_order             INT NOT NULL,
    description             VARCHAR(255) NOT NULL,
    source                  VARCHAR(100) NOT NULL DEFAULT 'MarineRegions.org',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_boundary_type (boundary_type),
    INDEX idx_boundary_spatial (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: dim_restricted_zones (Marine National Parks, MPAs & Seasonal Fishing Bans)
DROP TABLE IF EXISTS dim_restricted_zones;
CREATE TABLE dim_restricted_zones (
    zone_id                 VARCHAR(50) PRIMARY KEY,
    boundary_id             VARCHAR(50) NOT NULL,
    zone_name               VARCHAR(150) NOT NULL,
    state                   VARCHAR(100) NOT NULL,
    latitude                DECIMAL(8,4) NOT NULL,
    longitude               DECIMAL(8,4) NOT NULL,
    area_km2                DECIMAL(10,2) NOT NULL,
    zone_type               VARCHAR(50) NOT NULL,
    restriction_details     TEXT NOT NULL,
    active_months           VARCHAR(100) NOT NULL,
    source                  VARCHAR(100) NOT NULL DEFAULT 'WDPA / MoEFCC',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boundary_id) REFERENCES dim_maritime_boundaries(boundary_id) ON DELETE CASCADE,
    INDEX idx_zone_type (zone_type),
    INDEX idx_zone_spatial (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: dim_species_trend_diagnostics
DROP TABLE IF EXISTS dim_species_trend_diagnostics;
CREATE TABLE dim_species_trend_diagnostics (
    species_id              INT AUTO_INCREMENT PRIMARY KEY,
    species_group           VARCHAR(100) NOT NULL UNIQUE,
    scientific_name         VARCHAR(150) NOT NULL,
    catch_2018_tonnes       DECIMAL(10,1) NOT NULL,
    catch_2021_tonnes       DECIMAL(10,1) NOT NULL,
    catch_2023_tonnes       DECIMAL(10,1) NOT NULL,
    change_2018_to_2021_pct DECIMAL(6,2) NOT NULL,
    change_2018_to_2023_pct DECIMAL(6,2) NOT NULL,
    stock_status            VARCHAR(100) NOT NULL,
    ecological_diagnostic_cause TEXT NOT NULL,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_species_name (species_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ----------------------------------------------------------------------------
-- 2. FACT TABLES (Time-Series, Forecasts, Observations & Events)
-- ----------------------------------------------------------------------------

-- Table: fact_pfz_advisories
DROP TABLE IF EXISTS fact_pfz_advisories;
CREATE TABLE fact_pfz_advisories (
    advisory_id             VARCHAR(50) PRIMARY KEY,
    harbor_id               INT NOT NULL,
    advisory_date           DATE NOT NULL,
    valid_from              DATETIME NOT NULL,
    valid_until             DATETIME NOT NULL,
    sector                  VARCHAR(50) NOT NULL,
    state_ut                VARCHAR(100) NOT NULL,
    bearing_compass         VARCHAR(10) NOT NULL,
    bearing_deg             DECIMAL(6,2) NOT NULL,
    distance_km             DECIMAL(8,2) NOT NULL,
    distance_nm             DECIMAL(8,2) NOT NULL,
    pfz_latitude            DECIMAL(8,4) NOT NULL,
    pfz_longitude           DECIMAL(8,4) NOT NULL,
    pfz_latitude_dms        VARCHAR(20) NOT NULL,
    pfz_longitude_dms       VARCHAR(20) NOT NULL,
    depth_contour_m         INT NOT NULL,
    sst_celsius             DECIMAL(5,2) NOT NULL,
    sst_gradient_c_per_km   DECIMAL(5,2) NOT NULL,
    chlorophyll_a_mg_m3     DECIMAL(6,3) NOT NULL,
    oceanic_feature_type    VARCHAR(100) NOT NULL,
    target_species          VARCHAR(200) NOT NULL,
    recommended_gear        VARCHAR(100) NOT NULL,
    confidence_level        VARCHAR(20) NOT NULL DEFAULT 'HIGH',
    satellites_used         VARCHAR(150) NOT NULL,
    bulletin_text_english   TEXT NOT NULL,
    bulletin_text_regional  TEXT NOT NULL,
    regional_language       VARCHAR(50) NOT NULL,
    source                  VARCHAR(100) NOT NULL DEFAULT 'INCOIS (MoES)',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (harbor_id) REFERENCES dim_fishing_harbors(harbor_id) ON DELETE CASCADE,
    INDEX idx_pfz_harbor (harbor_id),
    INDEX idx_pfz_date (advisory_date),
    INDEX idx_pfz_spatial (pfz_latitude, pfz_longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: fact_coastal_weather_hourly
DROP TABLE IF EXISTS fact_coastal_weather_hourly;
CREATE TABLE fact_coastal_weather_hourly (
    weather_id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    harbor_id               INT NOT NULL,
    landing_center_name     VARCHAR(150) NOT NULL,
    sector                  VARCHAR(50) NOT NULL,
    latitude                DECIMAL(8,4) NOT NULL,
    longitude               DECIMAL(8,4) NOT NULL,
    datetime_utc            DATETIME NOT NULL,
    air_temp_celsius        DECIMAL(5,2) NOT NULL,
    humidity_pct            DECIMAL(5,2) NOT NULL,
    precipitation_mm        DECIMAL(6,2) NOT NULL,
    weather_code            INT NOT NULL,
    weather_condition       VARCHAR(100) NOT NULL,
    wind_speed_mps          DECIMAL(5,2) NOT NULL,
    wind_speed_kmph         DECIMAL(5,2) NOT NULL,
    wind_direction_deg      DECIMAL(5,1) NOT NULL,
    wind_gust_mps           DECIMAL(5,2) NOT NULL,
    surface_pressure_hpa    DECIMAL(6,1) NOT NULL,
    visibility_km           DECIMAL(5,1) NOT NULL,
    cloud_cover_pct         DECIMAL(5,1) NOT NULL,
    venturing_safety_index  VARCHAR(50) NOT NULL DEFAULT 'Safe',
    source                  VARCHAR(100) NOT NULL DEFAULT 'Open-Meteo / IMD',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (harbor_id) REFERENCES dim_fishing_harbors(harbor_id) ON DELETE CASCADE,
    INDEX idx_weather_harbor_time (harbor_id, datetime_utc),
    INDEX idx_weather_time (datetime_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: fact_wave_sea_state_hourly
DROP TABLE IF EXISTS fact_wave_sea_state_hourly;
CREATE TABLE fact_wave_sea_state_hourly (
    wave_id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    harbor_id               INT NOT NULL,
    landing_center_name     VARCHAR(150) NOT NULL,
    sector                  VARCHAR(50) NOT NULL,
    latitude                DECIMAL(8,4) NOT NULL,
    longitude               DECIMAL(8,4) NOT NULL,
    datetime_utc            DATETIME NOT NULL,
    significant_wave_height_m DECIMAL(5,2) NOT NULL,
    wave_direction_deg      DECIMAL(5,1) NOT NULL,
    peak_wave_period_s      DECIMAL(5,2) NOT NULL,
    wind_wave_height_m      DECIMAL(5,2) NOT NULL,
    wind_wave_direction_deg DECIMAL(5,1) NOT NULL,
    wind_wave_period_s      DECIMAL(5,2) NOT NULL,
    swell_wave_height_m     DECIMAL(5,2) NOT NULL,
    swell_wave_direction_deg DECIMAL(5,1) NOT NULL,
    swell_wave_period_s     DECIMAL(5,2) NOT NULL,
    wmo_sea_state_code      INT NOT NULL,
    wmo_sea_state_desc      VARCHAR(50) NOT NULL,
    navigational_safety_status VARCHAR(50) NOT NULL DEFAULT 'Safe',
    source                  VARCHAR(100) NOT NULL DEFAULT 'Open-Meteo Marine / INCOIS',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (harbor_id) REFERENCES dim_fishing_harbors(harbor_id) ON DELETE CASCADE,
    INDEX idx_wave_harbor_time (harbor_id, datetime_utc),
    INDEX idx_wave_time (datetime_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: fact_sst_hourly_stations
DROP TABLE IF EXISTS fact_sst_hourly_stations;
CREATE TABLE fact_sst_hourly_stations (
    sst_id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    harbor_id               INT NOT NULL,
    landing_center_name     VARCHAR(150) NOT NULL,
    sector                  VARCHAR(50) NOT NULL,
    latitude                DECIMAL(8,4) NOT NULL,
    longitude               DECIMAL(8,4) NOT NULL,
    datetime_utc            DATETIME NOT NULL,
    sst_celsius             DECIMAL(5,2) NOT NULL,
    sst_anomaly_celsius     DECIMAL(5,2) NOT NULL,
    thermal_front_gradient_c_km DECIMAL(5,2) NOT NULL,
    source                  VARCHAR(100) NOT NULL DEFAULT 'MOSDAC (ISRO) / Copernicus',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (harbor_id) REFERENCES dim_fishing_harbors(harbor_id) ON DELETE CASCADE,
    INDEX idx_sst_harbor_time (harbor_id, datetime_utc),
    INDEX idx_sst_time (datetime_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: fact_tide_predictions
DROP TABLE IF EXISTS fact_tide_predictions;
CREATE TABLE fact_tide_predictions (
    tide_id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    harbor_id               INT NOT NULL,
    port_name               VARCHAR(150) NOT NULL,
    state                   VARCHAR(100) NOT NULL,
    latitude                DECIMAL(8,4) NOT NULL,
    longitude               DECIMAL(8,4) NOT NULL,
    prediction_datetime_utc DATETIME NOT NULL,
    tide_height_meters      DECIMAL(5,2) NOT NULL,
    tide_phase              VARCHAR(10) NOT NULL,
    datum_reference         VARCHAR(100) NOT NULL DEFAULT 'Chart Datum (CD)',
    source                  VARCHAR(100) NOT NULL DEFAULT 'INCOIS / Survey of India',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (harbor_id) REFERENCES dim_fishing_harbors(harbor_id) ON DELETE CASCADE,
    INDEX idx_tide_harbor_time (harbor_id, prediction_datetime_utc),
    INDEX idx_tide_time (prediction_datetime_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: fact_cyclone_tracks
DROP TABLE IF EXISTS fact_cyclone_tracks;
CREATE TABLE fact_cyclone_tracks (
    track_id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    cyclone_id              VARCHAR(50) NOT NULL,
    cyclone_name            VARCHAR(100) NOT NULL,
    season                  INT NOT NULL,
    basin                   VARCHAR(50) NOT NULL,
    subbasin                VARCHAR(10) NOT NULL,
    observation_dt          DATETIME NOT NULL,
    latitude                DECIMAL(8,4) NOT NULL,
    longitude               DECIMAL(8,4) NOT NULL,
    max_sustained_wind_knots DECIMAL(6,2) NOT NULL,
    max_sustained_wind_kmph DECIMAL(6,2) NOT NULL,
    central_barometric_pressure_hpa DECIMAL(6,1) NOT NULL,
    wmo_cyclone_stage       VARCHAR(100) NOT NULL,
    distance_to_land_km     DECIMAL(6,1) NOT NULL,
    storm_translation_speed_kmph DECIMAL(5,1) NOT NULL,
    storm_heading_deg       DECIMAL(5,1) NOT NULL,
    official_landfall_location VARCHAR(150) NOT NULL,
    source                  VARCHAR(100) NOT NULL DEFAULT 'IMD / NOAA IBTrACS',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cyc_id (cyclone_id),
    INDEX idx_cyc_spatial (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: fact_marine_alerts
DROP TABLE IF EXISTS fact_marine_alerts;
CREATE TABLE fact_marine_alerts (
    alert_id                VARCHAR(50) PRIMARY KEY,
    cyclone_track_id        BIGINT NULL,
    alert_type              VARCHAR(50) NOT NULL,
    severity                VARCHAR(20) NOT NULL,
    title                   VARCHAR(200) NOT NULL,
    description             TEXT NOT NULL,
    issued_at               DATETIME NOT NULL,
    valid_from              DATETIME NOT NULL,
    valid_until             DATETIME NOT NULL,
    affected_region         VARCHAR(150) NOT NULL,
    min_latitude            DECIMAL(8,4) NOT NULL,
    max_latitude            DECIMAL(8,4) NOT NULL,
    min_longitude           DECIMAL(8,4) NOT NULL,
    max_longitude           DECIMAL(8,4) NOT NULL,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    source                  VARCHAR(100) NOT NULL DEFAULT 'INCOIS Multi-Hazard Early Warning Centre',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cyclone_track_id) REFERENCES fact_cyclone_tracks(track_id) ON DELETE SET NULL,
    INDEX idx_alert_severity (severity),
    INDEX idx_alert_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: fact_fish_catch_statistics
DROP TABLE IF EXISTS fact_fish_catch_statistics;
CREATE TABLE fact_fish_catch_statistics (
    catch_id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    species_id              INT NOT NULL,
    year                    INT NOT NULL,
    quarter                 VARCHAR(10) NOT NULL,
    state                   VARCHAR(100) NOT NULL,
    species_group           VARCHAR(100) NOT NULL,
    scientific_name         VARCHAR(150) NOT NULL,
    ecological_category     VARCHAR(50) NOT NULL,
    catch_volume_tonnes     DECIMAL(10,2) NOT NULL,
    fishing_fleet_segment   VARCHAR(100) NOT NULL,
    monsoon_ban_impact      VARCHAR(50) NOT NULL,
    source                  VARCHAR(100) NOT NULL DEFAULT 'CMFRI National Marine Fishery Census',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (species_id) REFERENCES dim_species_trend_diagnostics(species_id) ON DELETE CASCADE,
    INDEX idx_catch_state_time (state, year, quarter),
    INDEX idx_catch_species (species_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: fact_ocean_currents
DROP TABLE IF EXISTS fact_ocean_currents;
CREATE TABLE fact_ocean_currents (
    current_id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    date                    DATE NOT NULL,
    grid_latitude           DECIMAL(8,4) NOT NULL,
    grid_longitude          DECIMAL(8,4) NOT NULL,
    current_u_velocity_mps  DECIMAL(6,3) NOT NULL,
    current_v_velocity_mps  DECIMAL(6,3) NOT NULL,
    surface_current_speed_mps DECIMAL(6,3) NOT NULL,
    surface_current_speed_knots DECIMAL(6,2) NOT NULL,
    current_direction_deg   DECIMAL(5,1) NOT NULL,
    current_regime          VARCHAR(100) NOT NULL,
    depth_m                 DECIMAL(5,1) NOT NULL DEFAULT 0.0,
    source                  VARCHAR(100) NOT NULL DEFAULT 'NASA OSCAR / HYCOM',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_curr_spatial (grid_latitude, grid_longitude),
    INDEX idx_curr_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: fact_sst_regional_grid
DROP TABLE IF EXISTS fact_sst_regional_grid;
CREATE TABLE fact_sst_regional_grid (
    grid_point_id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    date                    DATE NOT NULL,
    grid_latitude           DECIMAL(8,4) NOT NULL,
    grid_longitude          DECIMAL(8,4) NOT NULL,
    sst_celsius             DECIMAL(5,2) NOT NULL,
    sst_anomaly_celsius     DECIMAL(5,2) NOT NULL,
    quality_level           INT NOT NULL DEFAULT 5,
    satellite_product       VARCHAR(100) NOT NULL,
    resolution_deg          DECIMAL(4,2) NOT NULL DEFAULT 0.5,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sst_grid_spatial (grid_latitude, grid_longitude),
    INDEX idx_sst_grid_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: fact_chlorophyll_regional_grid
DROP TABLE IF EXISTS fact_chlorophyll_regional_grid;
CREATE TABLE fact_chlorophyll_regional_grid (
    grid_point_id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    date                    DATE NOT NULL,
    grid_latitude           DECIMAL(8,4) NOT NULL,
    grid_longitude          DECIMAL(8,4) NOT NULL,
    chlorophyll_a_mg_m3     DECIMAL(6,3) NOT NULL,
    diffuse_attenuation_kd490 DECIMAL(6,4) NOT NULL,
    data_quality_flags      INT NOT NULL DEFAULT 0,
    sensor                  VARCHAR(100) NOT NULL DEFAULT 'Sentinel-3 OLCI / MODIS Aqua',
    resolution_deg          DECIMAL(4,2) NOT NULL DEFAULT 0.5,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_chl_grid_spatial (grid_latitude, grid_longitude),
    INDEX idx_chl_grid_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ----------------------------------------------------------------------------
-- 3. PRE-JOINED "AGENT DECISION" SQL VIEWS (Fast Single-Call REST API Endpoints)
-- ----------------------------------------------------------------------------

-- View 1: v_ocean_safety_nowcast (Weather + Waves + Tides + Active Alerts Priority Hierarchy)
DROP VIEW IF EXISTS v_ocean_safety_nowcast;
CREATE VIEW v_ocean_safety_nowcast AS
SELECT 
    h.harbor_id,
    h.landing_center_name,
    h.sector,
    h.state,
    h.latitude,
    h.longitude,
    w.datetime_utc,
    w.air_temp_celsius,
    w.wind_speed_kmph,
    w.wind_gust_mps,
    w.visibility_km,
    w.surface_pressure_hpa,
    wv.significant_wave_height_m,
    wv.swell_wave_height_m,
    wv.wmo_sea_state_desc,
    -- Astronomical Tide Integration (Next upcoming tidal peak for the harbor)
    COALESCE(
        (SELECT CONCAT(t.tide_phase, ' (', t.tide_height_meters, 'm at ', DATE_FORMAT(t.prediction_datetime_utc, '%H:%i'), ')')
         FROM fact_tide_predictions t
         WHERE t.harbor_id = h.harbor_id 
           AND t.prediction_datetime_utc >= w.datetime_utc 
         ORDER BY t.prediction_datetime_utc ASC LIMIT 1),
        'NORMAL TIDE'
    ) AS upcoming_tide_event,
    COALESCE(
        (SELECT a.severity FROM fact_marine_alerts a 
         WHERE a.is_active = TRUE 
           AND h.latitude BETWEEN a.min_latitude AND a.max_latitude 
           AND h.longitude BETWEEN a.min_longitude AND a.max_longitude 
         ORDER BY FIELD(a.severity, 'RED', 'ORANGE', 'YELLOW', 'GREEN') LIMIT 1), 
        'GREEN'
    ) AS active_regional_alert_level,
    CASE 
        -- 1. Sovereign Disaster Red Alert Override
        WHEN (SELECT a.severity FROM fact_marine_alerts a 
              WHERE a.is_active = TRUE 
                AND h.latitude BETWEEN a.min_latitude AND a.max_latitude 
                AND h.longitude BETWEEN a.min_longitude AND a.max_longitude 
              ORDER BY FIELD(a.severity, 'RED', 'ORANGE', 'YELLOW', 'GREEN') LIMIT 1) = 'RED'
          OR wv.significant_wave_height_m >= 3.5 
          OR w.wind_speed_mps >= 15.0 
          OR w.visibility_km < 3.0 
        THEN 'DANGER - DO NOT VENTURE'
        
        -- 2. Sovereign Orange Alert Override
        WHEN (SELECT a.severity FROM fact_marine_alerts a 
              WHERE a.is_active = TRUE 
                AND h.latitude BETWEEN a.min_latitude AND a.max_latitude 
                AND h.longitude BETWEEN a.min_longitude AND a.max_longitude 
              ORDER BY FIELD(a.severity, 'RED', 'ORANGE', 'YELLOW', 'GREEN') LIMIT 1) = 'ORANGE'
          OR wv.significant_wave_height_m >= 2.0 
          OR w.wind_speed_mps >= 10.0 
        THEN 'CAUTION - EXPERIENCED CREW ONLY'
        
        -- 3. Normal Operations
        ELSE 'SAFE FOR FISHING'
    END AS composite_safety_rating
FROM dim_fishing_harbors h
JOIN fact_coastal_weather_hourly w ON h.harbor_id = w.harbor_id
JOIN fact_wave_sea_state_hourly wv ON h.harbor_id = wv.harbor_id AND w.datetime_utc = wv.datetime_utc;

-- View 2: v_pfz_operational_advisory (PFZ Hotspots + Harbor + Oceanography)
DROP VIEW IF EXISTS v_pfz_operational_advisory;
CREATE VIEW v_pfz_operational_advisory AS
SELECT 
    p.advisory_id,
    p.advisory_date,
    p.valid_from,
    p.valid_until,
    h.harbor_id,
    h.landing_center_name AS reference_harbor,
    h.state,
    h.sector,
    p.bearing_compass,
    p.bearing_deg,
    p.distance_km,
    p.distance_nm,
    p.pfz_latitude,
    p.pfz_longitude,
    p.depth_contour_m,
    p.sst_celsius,
    p.sst_gradient_c_per_km,
    p.chlorophyll_a_mg_m3,
    p.oceanic_feature_type,
    p.target_species,
    p.recommended_gear,
    p.bulletin_text_english,
    p.bulletin_text_regional,
    p.regional_language,
    h.facilities AS harbor_facilities
FROM fact_pfz_advisories p
JOIN dim_fishing_harbors h ON p.harbor_id = h.harbor_id;

-- View 3: v_geofenced_sailing_route (Departure Harbor -> PFZ Hotspot & Boundary Clearance)
DROP VIEW IF EXISTS v_geofenced_sailing_route;
CREATE VIEW v_geofenced_sailing_route AS
SELECT 
    p.advisory_id,
    h.landing_center_name AS departure_harbor,
    h.latitude AS departure_lat,
    h.longitude AS departure_lon,
    p.pfz_latitude AS target_lat,
    p.pfz_longitude AS target_lon,
    p.distance_km,
    p.distance_nm,
    p.bearing_compass,
    p.target_species,
    -- Nearest Restricted Marine Protected Area
    (SELECT r.zone_name FROM dim_restricted_zones r 
     ORDER BY (POW(r.latitude - p.pfz_latitude, 2) + POW((r.longitude - p.pfz_longitude)*COS(RADIANS(p.pfz_latitude)), 2)) ASC LIMIT 1) AS nearest_protected_zone,
    -- Boundary compliance check
    CASE 
        WHEN (p.sector LIKE '%Tamil Nadu%' OR p.sector LIKE '%Palk%') 
         AND p.bearing_deg BETWEEN 80.0 AND 180.0 
         AND p.distance_km > 30.0 
        THEN 'CAUTION: PROXIMITY TO INDIA-SRI LANKA IMBL'
        
        WHEN p.distance_nm > 195.0 
        THEN 'WARNING: EXTENDED OFFSHORE VOYAGE (>195 NM FROM HARBOR)'
        
        ELSE 'CLEAR ROUTE - INSIDE INDIAN EEZ'
    END AS geofencing_compliance_status
FROM fact_pfz_advisories p
JOIN dim_fishing_harbors h ON p.harbor_id = h.harbor_id;

-- View 4: v_fisheries_productivity_analytics (Species Catch + Thermal Anomalies)
DROP VIEW IF EXISTS v_fisheries_productivity_analytics;
CREATE VIEW v_fisheries_productivity_analytics AS
SELECT 
    fc.catch_id,
    fc.year,
    fc.quarter,
    fc.state,
    fc.species_group,
    fc.scientific_name,
    fc.ecological_category,
    fc.catch_volume_tonnes,
    fc.fishing_fleet_segment,
    fc.monsoon_ban_impact,
    sp.stock_status,
    sp.change_2018_to_2021_pct,
    sp.change_2018_to_2023_pct,
    sp.ecological_diagnostic_cause
FROM fact_fish_catch_statistics fc
JOIN dim_species_trend_diagnostics sp ON fc.species_id = sp.species_id;

SET FOREIGN_KEY_CHECKS = 1;
