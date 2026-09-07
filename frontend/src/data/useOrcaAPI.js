// ---------------------------------------------------------------------------
// ORCA Marine Platform — RESTful API Client & React Hooks
// Fetches live data from Express.js backend connected to MySQL 8.0 views
// Equipped with an in-memory SWR (Stale-While-Revalidate) cache with request deduplication
// ---------------------------------------------------------------------------
import { useState, useEffect } from 'react';

// Dynamic API Base: Defaults to local reverse proxy (/api/v1) in Vite dev,
// or reads from VITE_API_BASE_URL (e.g. Railway URL) in production builds.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

// Global in-memory cache store: Map<url, { data: any, timestamp: number, promise?: Promise }>
const apiCache = new Map();

/**
 * Fetch with in-memory TTL caching and concurrent promise deduplication.
 * @param {string} url - Target API URL
 * @param {number} ttlMs - Time to live in milliseconds (default 60,000ms = 60s)
 */
async function fetchCached(url, ttlMs = 60000) {
  const now = Date.now();
  const cached = apiCache.get(url);

  // Cache hit within TTL
  if (cached && (now - cached.timestamp < ttlMs)) {
    return cached.data;
  }

  // Deduplicate concurrent in-flight requests
  if (cached && cached.promise) {
    return cached.promise;
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(url);
      if (res.status === 404) {
        // Return structured empty object for 404s to avoid hammer loops
        const json = { data: null, error: 'Not found' };
        apiCache.set(url, { data: json, timestamp: Date.now() });
        return json;
      }
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status} fetching ${url}`);
      }
      const json = await res.json();
      apiCache.set(url, { data: json, timestamp: Date.now() });
      return json;
    } catch (err) {
      if (cached && cached.data) {
        return cached.data; // Graceful stale fallback
      }
      apiCache.delete(url);
      throw err;
    }
  })();

  apiCache.set(url, { ...cached, promise: fetchPromise });
  return fetchPromise;
}

// Hook: Fetch all 56 harbors (Cached for 10 minutes)
export function useHarbors() {
  const url = `${API_BASE}/harbors`;
  const [harbors, setHarbors] = useState(() => {
    return apiCache.get(url)?.data?.data || [];
  });
  const [loading, setLoading] = useState(!harbors.length);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const json = await fetchCached(url, 600000);
        if (!cancelled) {
          setHarbors(json.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [url]);

  return { harbors, loading, error };
}

// Hook: Fetch Safety Nowcast for selected harbor (v_ocean_safety_nowcast)
// Consolidated single query for latest row + 24hr history with 60s SWR cache
export function useSafetyNowcast(harborId) {
  const url = harborId ? `${API_BASE}/safety/nowcast?harbor_id=${harborId}&hours=24` : null;

  const [data, setData] = useState(() => {
    if (!url) return null;
    const cached = apiCache.get(url);
    if (!cached?.data?.data) return null;
    return Array.isArray(cached.data.data) ? cached.data.data[0] : cached.data.data;
  });

  const [history, setHistory] = useState(() => {
    if (!url) return [];
    const cached = apiCache.get(url);
    if (!cached?.data?.data) return [];
    return Array.isArray(cached.data.data) ? cached.data.data : [cached.data.data];
  });

  const [loading, setLoading] = useState(!data && Boolean(harborId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!harborId) {
      setData(null);
      setHistory([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const cacheUrl = `${API_BASE}/safety/nowcast?harbor_id=${harborId}&hours=24`;
    const cached = apiCache.get(cacheUrl);

    if (cached && (Date.now() - cached.timestamp < 60000)) {
      const rows = cached.data?.data;
      setData(Array.isArray(rows) ? rows[0] : rows || null);
      setHistory(Array.isArray(rows) ? rows : rows ? [rows] : []);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    async function load() {
      try {
        const json = await fetchCached(cacheUrl, 60000);
        if (!cancelled) {
          const rows = json.data;
          setData(Array.isArray(rows) ? rows[0] : rows || null);
          setHistory(Array.isArray(rows) ? rows : rows ? [rows] : []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [harborId]);

  return { data, history, loading, error };
}

// Hook: Fetch Tide Predictions for selected harbor (fact_tide_predictions, 60s SWR cache)
// Supports Survey of India secondary port reference station metadata
export function useTides(harborId, limit = 10) {
  const url = harborId ? `${API_BASE}/tides?harbor_id=${harborId}&limit=${limit}` : null;
  const [tides, setTides] = useState(() => {
    if (!url) return [];
    return apiCache.get(url)?.data?.data || [];
  });
  const [tideMeta, setTideMeta] = useState(() => {
    if (!url) return null;
    const cached = apiCache.get(url)?.data;
    if (!cached) return null;
    return {
      isReferenceStation: Boolean(cached.is_reference_station),
      referenceHarborId: cached.reference_harbor_id || null,
      referencePortName: cached.reference_port_name || null,
      distanceKm: cached.distance_km || null,
    };
  });
  const [loading, setLoading] = useState(!tides.length && Boolean(harborId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!harborId) {
      setTides([]);
      setTideMeta(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const cacheUrl = `${API_BASE}/tides?harbor_id=${harborId}&limit=${limit}`;
    const cached = apiCache.get(cacheUrl);

    if (cached && (Date.now() - cached.timestamp < 60000)) {
      setTides(cached.data?.data || []);
      setTideMeta({
        isReferenceStation: Boolean(cached.data?.is_reference_station),
        referenceHarborId: cached.data?.reference_harbor_id || null,
        referencePortName: cached.data?.reference_port_name || null,
        distanceKm: cached.data?.distance_km || null,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    async function load() {
      try {
        const json = await fetchCached(cacheUrl, 60000);
        if (!cancelled) {
          setTides(json.data || []);
          setTideMeta({
            isReferenceStation: Boolean(json.is_reference_station),
            referenceHarborId: json.reference_harbor_id || null,
            referencePortName: json.reference_port_name || null,
            distanceKm: json.distance_km || null,
          });
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [harborId, limit]);

  return { tides, tideMeta, loading, error };
}

// Hook: Fetch PFZ Advisories for selected harbor (v_pfz_operational_advisory, 60s SWR cache)
export function usePFZAdvisories(harborId) {
  const url = harborId
    ? `${API_BASE}/pfz/advisories?harbor_id=${harborId}`
    : `${API_BASE}/pfz/advisories/latest`;
  const [advisories, setAdvisories] = useState(() => {
    return apiCache.get(url)?.data?.data || [];
  });
  const [loading, setLoading] = useState(!advisories.length);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const cacheUrl = harborId
      ? `${API_BASE}/pfz/advisories?harbor_id=${harborId}`
      : `${API_BASE}/pfz/advisories/latest`;
    const cached = apiCache.get(cacheUrl);

    if (cached && (Date.now() - cached.timestamp < 60000)) {
      setAdvisories(cached.data?.data || []);
      setLoading(false);
      return;
    }

    setLoading(true);
    async function load() {
      try {
        const json = await fetchCached(cacheUrl, 60000);
        if (!cancelled) {
          setAdvisories(json.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [harborId]);

  return { advisories, loading, error };
}

// Hook: Fetch Sailing Routes for selected harbor (v_geofenced_sailing_route)
// Routes cached for 60s; dim_restricted_zones cached statically for 10 minutes
export function useNavigationRoutes(harborId) {
  const routesUrl = `${API_BASE}/navigation/routes${harborId ? `?harbor_id=${harborId}` : ''}`;
  const zonesUrl = `${API_BASE}/navigation/restricted-zones`;

  const [routes, setRoutes] = useState(() => apiCache.get(routesUrl)?.data?.data || []);
  const [restrictedZones, setRestrictedZones] = useState(() => apiCache.get(zonesUrl)?.data?.data || []);
  const [loading, setLoading] = useState(!routes.length && Boolean(harborId));
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const currentRoutesUrl = `${API_BASE}/navigation/routes${harborId ? `?harbor_id=${harborId}` : ''}`;
    const currentZonesUrl = `${API_BASE}/navigation/restricted-zones`;

    const routesCached = apiCache.get(currentRoutesUrl);
    const zonesCached = apiCache.get(currentZonesUrl);

    if (
      routesCached && (Date.now() - routesCached.timestamp < 60000) &&
      zonesCached && (Date.now() - zonesCached.timestamp < 600000)
    ) {
      setRoutes(routesCached.data?.data || []);
      setRestrictedZones(zonesCached.data?.data || []);
      setLoading(false);
      return;
    }

    setLoading(true);
    async function load() {
      try {
        const [routesJson, zonesJson] = await Promise.all([
          fetchCached(currentRoutesUrl, 60000),
          fetchCached(currentZonesUrl, 600000),
        ]);

        if (!cancelled) {
          setRoutes(routesJson?.data || []);
          setRestrictedZones(zonesJson?.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [harborId]);

  return { routes, restrictedZones, loading, error };
}

// Hook: Fetch Maritime Boundaries (200 NM Indian EEZ outer limit + IMBL borders, 10 min cache)
export function useMaritimeBoundaries() {
  const boundariesUrl = `${API_BASE}/navigation/maritime-boundaries`;
  const [boundaries, setBoundaries] = useState(() => apiCache.get(boundariesUrl)?.data?.data || []);
  const [loading, setLoading] = useState(!boundaries.length);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const json = await fetchCached(boundariesUrl, 600000);
        if (!cancelled) {
          setBoundaries(json?.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [boundariesUrl]);

  return { boundaries, loading, error };
}

