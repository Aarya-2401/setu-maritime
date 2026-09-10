export const { pool } = require('../../config/db');
import { FALLBACK_HARBORS } from './fallbackData';

export const REGIONAL_CITY_MAP: Record<string, number> = {
  kolkata: 47,
  calcutta: 47,
  hooghly: 47,
  haldia: 47,
  diamond: 47,
  'diamond harbour': 47,
  sundarbans: 48,
  sunderbans: 48,
  digha: 45,
  sankarpur: 45,
  kakdwip: 46,
  fraserganj: 48,
  bengal: 47,
  'west bengal': 47,

  mumbai: 6,
  bombay: 6,
  sassoon: 6,
  'ferry wharf': 6,
  versova: 7,
  ratnagiri: 8,
  malvan: 9,
  satpati: 10,
  maharashtra: 6,

  chennai: 30,
  madras: 30,
  kasimedu: 30,
  tuticorin: 25,
  thoothukudi: 25,
  rameswaram: 26,
  kanyakumari: 28,
  chinnamuttam: 28,
  colachel: 27,
  mandapam: 29,
  cuddalore: 31,
  nagapattinam: 32,
  poompuhar: 33,
  'tamil nadu': 30,

  cochin: 19,
  kochi: 19,
  ernakulam: 19,
  munambam: 20,
  beypore: 21,
  calicut: 21,
  kozhikode: 21,
  kollam: 22,
  quilon: 22,
  neendakara: 22,
  sakthikulangara: 22,
  vizhinjam: 23,
  trivandrum: 23,
  thiruvananthapuram: 23,
  kannur: 24,
  mopla: 24,
  kerala: 19,
  malabar: 19,

  vizag: 37,
  visakhapatnam: 37,
  vishakhapatnam: 37,
  waltair: 37,
  kakinada: 38,
  bhavanapadu: 39,
  pudimadaka: 40,
  krishnapatnam: 34,
  nizampatnam: 35,
  machilipatnam: 36,
  masulipatnam: 36,
  andhra: 37,
  'andhra pradesh': 37,

  paradip: 41,
  paradeep: 41,
  dhamra: 42,
  puri: 43,
  gopalpur: 44,
  odisha: 41,
  odhisha: 41,
  odisa: 41,
  orissa: 41,
  orisa: 41,
  udisa: 41,

  mangalore: 14,
  mangaluru: 14,
  malpe: 15,
  udupi: 15,
  tadri: 16,
  honnavar: 17,
  karwar: 18,
  karnataka: 14,
  karnatka: 14,

  goa: 12,
  panaji: 12,
  panjim: 12,
  cutbon: 11,
  cutbona: 11,
  chapora: 13,
  vasco: 11,

  veraval: 1,
  somnath: 1,
  porbandar: 2,
  okha: 3,
  dwarka: 3,
  mangrol: 4,
  jafarabad: 5,
  gujarat: 1,
  gujrat: 1,

  kavaratti: 49,
  agatti: 50,
  minicoy: 51,
  lakshadweep: 49,
  lakshdweep: 49,

  'port blair': 52,
  junglighat: 52,
  diglipur: 53,
  havelock: 54,
  'swaraj dweep': 54,
  'car nicobar': 55,
  'campbell bay': 56,
  andaman: 52,
  nicobar: 52,

  kerla: 19,
  keralam: 19,
  maharastra: 6,
  tamilnadu: 30,
  andhrapradesh: 37,
  westbengal: 47,
  kolkatta: 47
};

export const INLAND_REGIONS = new Set([
  'ahmedabad', 'gandhinagar', 'vadodara', 'anand', 'rajkot',
  'delhi', 'new delhi', 'bangalore', 'bengaluru', 'hyderabad', 'jaipur', 'nagpur',
  'bhopal', 'indore', 'patna', 'lucknow', 'kanpur', 'chandigarh', 'pune', 'gurgaon',
  'noida', 'ranchi', 'raipur', 'dehradun', 'shimla', 'srinagar', 'amritsar', 'ludhiana',
  'punjab', 'haryana', 'rajasthan', 'madhya pradesh', 'uttar pradesh', 'bihar',
  'jharkhand', 'chhattisgarh', 'telangana', 'uttarakhand', 'himachal pradesh', 'assam',
  'jaisalmer', 'jodhpur', 'udaipur', 'bikaner', 'ajmer', 'kota', 'alwar', 'sikar', 'bhilwara',
  'agra', 'varanasi', 'prayagraj', 'allahabad', 'meerut', 'ghaziabad', 'aligarh', 'moradabad',
  'bareilly', 'gorakhpur', 'saharanpur', 'jhansi', 'mathura', 'ayodhya',
  'gwalior', 'jabalpur', 'ujjain', 'sagar', 'satna', 'rewa',
  'nashik', 'aurangabad', 'amravati', 'solapur', 'kolhapur', 'nanded', 'jalgaon', 'akola',
  'mysore', 'mysuru', 'hubli', 'belgaum', 'belagavi', 'gulbarga', 'davangere', 'bellary',
  'warangal', 'nizamabad', 'khammam', 'karimnagar',
  'jamshedpur', 'dhanbad', 'bokaro', 'hazaribagh',
  'bilaspur', 'durg', 'bhilai', 'korba',
  'gaya', 'bhagalpur', 'muzaffarpur', 'darbhanga',
  'panipat', 'karnal', 'rohtak', 'hisar', 'sonipat',
  'jalandhar', 'patiala', 'bathinda', 'mohali'
]);

export const INLAND_COORDINATES: Record<string, { lat: number; lon: number; state: string; name: string }> = {
  jaipur: { lat: 26.9124, lon: 75.7873, state: 'Rajasthan', name: 'Jaipur, Rajasthan' },
  delhi: { lat: 28.6139, lon: 77.2090, state: 'Delhi', name: 'Delhi' },
  'new delhi': { lat: 28.6139, lon: 77.2090, state: 'Delhi', name: 'New Delhi' },
  noida: { lat: 28.5355, lon: 77.3910, state: 'Uttar Pradesh', name: 'Noida, Uttar Pradesh' },
  gurgaon: { lat: 28.4595, lon: 77.0266, state: 'Haryana', name: 'Gurugram, Haryana' },
  gurugram: { lat: 28.4595, lon: 77.0266, state: 'Haryana', name: 'Gurugram, Haryana' },
  bengaluru: { lat: 12.9716, lon: 77.5946, state: 'Karnataka', name: 'Bengaluru, Karnataka' },
  bangalore: { lat: 12.9716, lon: 77.5946, state: 'Karnataka', name: 'Bengaluru, Karnataka' },
  hyderabad: { lat: 17.3850, lon: 78.4867, state: 'Telangana', name: 'Hyderabad, Telangana' },
  pune: { lat: 18.5204, lon: 73.8567, state: 'Maharashtra', name: 'Pune, Maharashtra' },
  ahmedabad: { lat: 23.0225, lon: 72.5714, state: 'Gujarat', name: 'Ahmedabad, Gujarat' },
  gandhinagar: { lat: 23.2156, lon: 72.6369, state: 'Gujarat', name: 'Gandhinagar, Gujarat' },
  vadodara: { lat: 22.3072, lon: 73.1812, state: 'Gujarat', name: 'Vadodara, Gujarat' },
  anand: { lat: 22.5645, lon: 72.9289, state: 'Gujarat', name: 'Anand, Gujarat' },
  rajkot: { lat: 22.3039, lon: 70.8022, state: 'Gujarat', name: 'Rajkot, Gujarat' },
  lucknow: { lat: 26.8467, lon: 80.9462, state: 'Uttar Pradesh', name: 'Lucknow, Uttar Pradesh' },
  kanpur: { lat: 26.4499, lon: 80.3319, state: 'Uttar Pradesh', name: 'Kanpur, Uttar Pradesh' },
  varanasi: { lat: 25.3176, lon: 82.9739, state: 'Uttar Pradesh', name: 'Varanasi, Uttar Pradesh' },
  agra: { lat: 27.1767, lon: 78.0081, state: 'Uttar Pradesh', name: 'Agra, Uttar Pradesh' },
  bhopal: { lat: 23.2599, lon: 77.4126, state: 'Madhya Pradesh', name: 'Bhopal, Madhya Pradesh' },
  indore: { lat: 22.7196, lon: 75.8577, state: 'Madhya Pradesh', name: 'Indore, Madhya Pradesh' },
  gwalior: { lat: 26.2183, lon: 78.1828, state: 'Madhya Pradesh', name: 'Gwalior, Madhya Pradesh' },
  jabalpur: { lat: 23.1815, lon: 79.9864, state: 'Madhya Pradesh', name: 'Jabalpur, Madhya Pradesh' },
  patna: { lat: 25.5941, lon: 85.1376, state: 'Bihar', name: 'Patna, Bihar' },
  chandigarh: { lat: 30.7333, lon: 76.7794, state: 'Punjab', name: 'Chandigarh' },
  jodhpur: { lat: 26.2389, lon: 73.0243, state: 'Rajasthan', name: 'Jodhpur, Rajasthan' },
  udaipur: { lat: 24.5854, lon: 73.7125, state: 'Rajasthan', name: 'Udaipur, Rajasthan' },
  bikaner: { lat: 28.0229, lon: 73.3119, state: 'Rajasthan', name: 'Bikaner, Rajasthan' },
  ajmer: { lat: 26.4499, lon: 74.6399, state: 'Rajasthan', name: 'Ajmer, Rajasthan' },
  kota: { lat: 25.2138, lon: 75.8648, state: 'Rajasthan', name: 'Kota, Rajasthan' },
  jaisalmer: { lat: 26.9157, lon: 70.9083, state: 'Rajasthan', name: 'Jaisalmer, Rajasthan' },
  nagpur: { lat: 21.1458, lon: 79.0882, state: 'Maharashtra', name: 'Nagpur, Maharashtra' },
  nashik: { lat: 19.9975, lon: 73.7898, state: 'Maharashtra', name: 'Nashik, Maharashtra' }
};

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface CoastalStateRef {
  stateName: string;
  primaryHarborId: number;
  aliases: string[];
}

export const COASTAL_STATE_REFS: CoastalStateRef[] = [
  { stateName: 'Odisha', primaryHarborId: 41, aliases: ['odisha', 'odhisha', 'odisa', 'orissa', 'orisa', 'udisa'] },
  { stateName: 'Kerala', primaryHarborId: 19, aliases: ['kerala', 'kerla', 'keralam', 'malabar'] },
  { stateName: 'Gujarat', primaryHarborId: 1, aliases: ['gujarat', 'gujrat', 'saurashtra', 'kutch'] },
  { stateName: 'Maharashtra', primaryHarborId: 6, aliases: ['maharashtra', 'maharastra', 'konkan'] },
  { stateName: 'Goa', primaryHarborId: 12, aliases: ['goa', 'panaji', 'panjim'] },
  { stateName: 'Karnataka', primaryHarborId: 14, aliases: ['karnataka', 'karnatka', 'canara'] },
  { stateName: 'Tamil Nadu', primaryHarborId: 30, aliases: ['tamil nadu', 'tamilnadu', 'coromandel'] },
  { stateName: 'Andhra Pradesh', primaryHarborId: 37, aliases: ['andhra pradesh', 'andhrapradesh', 'andhra', 'seemandhra'] },
  { stateName: 'West Bengal', primaryHarborId: 47, aliases: ['west bengal', 'westbengal', 'bengal'] },
  { stateName: 'Lakshadweep', primaryHarborId: 49, aliases: ['lakshadweep', 'lakshdweep', 'laccadive'] },
  { stateName: 'Andaman & Nicobar', primaryHarborId: 52, aliases: ['andaman & nicobar', 'andaman and nicobar', 'andaman', 'nicobar'] }
];

export interface LocationResolution {
  status: 'SUPPORTED' | 'COASTAL_STATE' | 'INLAND' | 'UNKNOWN';
  locationType?: 'HARBOR' | 'COASTAL_STATE' | 'INLAND' | 'REGION' | 'UNKNOWN';
  locationName?: string;
  stateName?: string;
  coordinates?: { latitude: number; longitude: number };
  harbor?: any;
  referenceHarbor?: any;
  stateHarbors?: any[];
  suggestions?: string[];
}

export async function resolveLocation(locationInput?: string | { name?: string; harborId?: number; latitude?: number; longitude?: number }): Promise<LocationResolution> {
  const location = typeof locationInput === 'string' ? { name: locationInput } : locationInput;
  const fallbackSuggestions = ['Veraval', 'Mumbai', 'Kochi', 'Paradip', 'Visakhapatnam', 'Chennai'];

  // 1. Direct ID lookup
  if (location?.harborId) {
    try {
      const [rows]: any = await pool.query('SELECT * FROM dim_fishing_harbors WHERE harbor_id = ?', [location.harborId]);
      if (rows && rows.length) {
        return { status: 'SUPPORTED', locationType: 'HARBOR', locationName: rows[0].landing_center_name, harbor: rows[0] };
      }
    } catch (e) {
      console.warn('[ORCA] Direct harborId lookup DB failed; using fallback', e?.message || e);
    }
    const fb = FALLBACK_HARBORS.find((h) => h.harbor_id === location.harborId);
    if (fb) {
      return { status: 'SUPPORTED', locationType: 'HARBOR', locationName: fb.landing_center_name, harbor: fb };
    }
    return {
      status: 'SUPPORTED',
      locationType: 'HARBOR',
      locationName: `Harbor #${location.harborId}`,
      harbor: { harbor_id: location.harborId, landing_center_name: `Harbor #${location.harborId}` }
    };
  }

  // 2. Name-based lookup
  if (location?.name) {
    const raw = location.name.toLowerCase().trim();

    // Check coastal states first (e.g. Odisha, Kerala, Gujarat)
    const matchedState = COASTAL_STATE_REFS.find(cs =>
      cs.aliases.some(alias =>
        raw === alias ||
        new RegExp(`(^|\\W)${escapeRegex(alias)}(\\W|$)`, 'i').test(raw) ||
        (raw.length >= 4 && alias.length >= 4 && levenshtein(raw, alias) <= (alias.length <= 4 ? 1 : 2))
      )
    );

    if (matchedState) {
      let stateRows: any[] = [];
      let refHarbor: any = null;
      let otherHarbors: string[] = [];
      try {
        const [rows]: any = await pool.query(
          'SELECT * FROM dim_fishing_harbors WHERE state LIKE ? ORDER BY harbor_id ASC',
          [`%${matchedState.stateName}%`]
        );
        stateRows = rows || [];
      } catch (e) {
        console.warn('[ORCA] State harbors query failed; using fallback', e?.message || e);
      }
      if (!stateRows.length) {
        stateRows = FALLBACK_HARBORS.filter((h) => h.state.toLowerCase().includes(matchedState.stateName.toLowerCase()));
      }
      refHarbor = stateRows.find((r: any) => r.harbor_id === matchedState.primaryHarborId) || stateRows[0] || null;
      otherHarbors = stateRows
        .filter((r: any) => r.harbor_id !== refHarbor?.harbor_id)
        .map((r: any) => r.landing_center_name.split(' (')[0]);

      if (!refHarbor) {
        const PRIMARY_HARBOR_NAMES: Record<number, string> = {
          41: 'Paradip Fishing Harbour',
          19: 'Cochin Fisheries Harbour',
          1: 'Veraval Fishing Harbour',
          6: 'Sassoon Dock (Mumbai)',
          12: 'Malim (Panaji)',
          14: 'Old Mangalore Port',
          30: 'Kasimedu (Chennai)',
          37: 'Visakhapatnam Fishing Harbour',
          47: 'Haldia Port (Diamond Harbour)',
          49: 'Kavaratti Harbor',
          52: 'Port Blair Harbor'
        };
        const name = PRIMARY_HARBOR_NAMES[matchedState.primaryHarborId] || `${matchedState.stateName} Primary Port`;
        refHarbor = {
          harbor_id: matchedState.primaryHarborId,
          landing_center_name: name,
          state: matchedState.stateName
        };
        stateRows = [refHarbor];
      }

      return {
        status: 'COASTAL_STATE',
        locationType: 'COASTAL_STATE',
        locationName: matchedState.stateName,
        stateName: matchedState.stateName,
        harbor: refHarbor,
        referenceHarbor: refHarbor,
        stateHarbors: stateRows,
        suggestions: otherHarbors.length > 0 ? otherHarbors : fallbackSuggestions
      };
    }

    // Check specific harbor / regional city alias dictionary (e.g. Bombay -> Mumbai, Cochin -> Kochi)
    let mappedId: number | undefined = REGIONAL_CITY_MAP[raw];
    if (!mappedId) {
      for (const [key, id] of Object.entries(REGIONAL_CITY_MAP)) {
        if (raw === key || new RegExp(`(^|\\W)${escapeRegex(key)}(\\W|$)`, 'i').test(raw)) {
          mappedId = id;
          break;
        }
      }
    }
    if (mappedId) {
      try {
        const [mRows]: any = await pool.query('SELECT * FROM dim_fishing_harbors WHERE harbor_id = ?', [mappedId]);
        if (mRows && mRows.length) {
          return { status: 'SUPPORTED', locationType: 'HARBOR', locationName: mRows[0].landing_center_name, harbor: mRows[0] };
        }
      } catch (e) {
        console.warn('[ORCA] Mapped harborId query failed; using fallback', e?.message || e);
      }
      const fb = FALLBACK_HARBORS.find((h) => h.harbor_id === mappedId);
      if (fb) {
        return { status: 'SUPPORTED', locationType: 'HARBOR', locationName: fb.landing_center_name, harbor: fb };
      }
      return {
        status: 'SUPPORTED',
        locationType: 'HARBOR',
        locationName: raw,
        harbor: { harbor_id: mappedId, landing_center_name: raw }
      };
    }

    // Fast-path inland check with fuzzy tolerance (check before database query to avoid substring collisions)
    const isInland = INLAND_REGIONS.has(raw) ||
      Array.from(INLAND_REGIONS).some(inland =>
        raw === inland ||
        new RegExp(`(^|\\W)${escapeRegex(inland)}(\\W|$)`, 'i').test(raw) ||
        (raw.length >= 4 && inland.length >= 4 && levenshtein(raw, inland) <= (inland.length <= 4 ? 1 : 2))
      );
    if (isInland) {
      const isGujaratInland = raw.includes('ahmedabad') || raw.includes('gandhinagar') || raw.includes('vadodara') || raw.includes('anand') || raw.includes('rajkot');
      const inlandSuggestions = isGujaratInland
        ? ['Hazira Port', 'Mundra Port', 'Dahej Port', 'Veraval']
        : fallbackSuggestions;

      const rawKey = raw.toLowerCase().trim();
      const coords = INLAND_COORDINATES[rawKey] || Object.entries(INLAND_COORDINATES).find(([k]) => rawKey.includes(k))?.[1];

      return {
        status: 'INLAND',
        locationType: 'INLAND',
        locationName: coords?.name || location.name,
        stateName: coords?.state,
        coordinates: coords ? { latitude: coords.lat, longitude: coords.lon } : undefined,
        harbor: null,
        referenceHarbor: null,
        suggestions: inlandSuggestions
      };
    }

    // Database lookup: Check landing center name or district using whole word boundaries
    try {
      const [rows]: any = await pool.query(
        `SELECT * FROM dim_fishing_harbors 
         WHERE landing_center_name = ?
            OR landing_center_name LIKE CONCAT(?, ' %')
            OR landing_center_name LIKE CONCAT('% ', ?, ' %')
            OR landing_center_name LIKE CONCAT('% ', ?)
            OR district = ?
            OR district LIKE CONCAT(?, ' %')
            OR district LIKE CONCAT('% ', ?)
         ORDER BY landing_center_name ASC LIMIT 1`,
        [location.name, location.name, location.name, location.name, location.name, location.name, location.name]
      );
      if (rows && rows.length) {
        return { status: 'SUPPORTED', locationType: 'HARBOR', locationName: rows[0].landing_center_name, harbor: rows[0] };
      }
    } catch (e) {
      console.warn('[ORCA] Database lookup for harbor name failed; using fallback', e?.message || e);
    }
    const foundFallback = FALLBACK_HARBORS.find((h) =>
      h.landing_center_name.toLowerCase() === raw ||
      h.landing_center_name.toLowerCase().includes(raw) ||
      h.district.toLowerCase() === raw
    );
    if (foundFallback) {
      return { status: 'SUPPORTED', locationType: 'HARBOR', locationName: foundFallback.landing_center_name, harbor: foundFallback };
    }

    // Fuzzy match against regional harbor/city aliases
    let closestKey: string | null = null;
    let minDistance = 999;
    for (const key of Object.keys(REGIONAL_CITY_MAP)) {
      const dist = levenshtein(raw, key);
      const maxAllowed = key.length <= 4 ? 1 : 2;
      if (dist <= maxAllowed && dist < minDistance) {
        minDistance = dist;
        closestKey = key;
      }
    }
    if (closestKey) {
      const fuzzyId = REGIONAL_CITY_MAP[closestKey];
      try {
        const [mRows]: any = await pool.query('SELECT * FROM dim_fishing_harbors WHERE harbor_id = ?', [fuzzyId]);
        if (mRows && mRows.length) {
          return { status: 'SUPPORTED', locationType: 'HARBOR', locationName: mRows[0].landing_center_name, harbor: mRows[0] };
        }
      } catch (e) {
        console.warn('[ORCA] Fuzzy harborId query failed; using fallback', e?.message || e);
      }
      const fb = FALLBACK_HARBORS.find((h) => h.harbor_id === fuzzyId);
      if (fb) {
        return { status: 'SUPPORTED', locationType: 'HARBOR', locationName: fb.landing_center_name, harbor: fb };
      }
    }

    // Unrecognized location
    return {
      status: 'UNKNOWN',
      locationType: 'UNKNOWN',
      locationName: location.name,
      harbor: null,
      suggestions: fallbackSuggestions
    };
  }

  // 3. Coordinate distance lookup
  if (location?.latitude != null && location?.longitude != null) {
    try {
      const [rows]: any = await pool.query(
        `SELECT *, (111.32 * SQRT(POW(latitude-?,2) + POW((longitude-?)*COS(RADIANS(?)),2))) AS distance_km 
         FROM dim_fishing_harbors 
         ORDER BY distance_km LIMIT 1`,
        [location.latitude, location.longitude, location.latitude]
      );
      if (rows && rows.length && rows[0].distance_km < 150) {
        return { status: 'SUPPORTED', locationType: 'HARBOR', locationName: rows[0].landing_center_name, harbor: rows[0] };
      }
    } catch (e) {
      console.warn('[ORCA] Coordinate distance query failed; using fallback', e?.message || e);
    }
    let nearest: any = null;
    let minD = 150;
    for (const h of FALLBACK_HARBORS) {
      const d = 111.32 * Math.sqrt((h.latitude - location.latitude) ** 2 + ((h.longitude - location.longitude) * Math.cos(location.latitude * Math.PI / 180)) ** 2);
      if (d < minD) {
        minD = d;
        nearest = h;
      }
    }
    if (nearest) {
      return { status: 'SUPPORTED', locationType: 'HARBOR', locationName: nearest.landing_center_name, harbor: nearest };
    }
  }

  // Absolutely NO default harbor fallback (e.g. no defaulting to Gujarat/Veraval)
  return {
    status: 'UNKNOWN',
    locationType: 'UNKNOWN',
    harbor: null,
    suggestions: fallbackSuggestions
  };
}

export async function resolveHarbor(locationInput?: string | { name?: string; harborId?: number; latitude?: number; longitude?: number }) {
  const res = await resolveLocation(locationInput);
  return res.harbor || null;
}

export function firstDefined(row: any, keys: string[], fallback: any = null) {
  for (const key of keys) if (row && row[key] !== undefined && row[key] !== null) return row[key];
  return fallback;
}
