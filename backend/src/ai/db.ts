export const { pool } = require('../../config/db');

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
  locationName?: string;
  stateName?: string;
  harbor?: any;
  referenceHarbor?: any;
  stateHarbors?: any[];
  suggestions?: string[];
}

export async function resolveLocation(location?: { name?: string; harborId?: number; latitude?: number; longitude?: number }): Promise<LocationResolution> {
  const fallbackSuggestions = ['Veraval', 'Mumbai', 'Kochi', 'Paradip', 'Visakhapatnam', 'Chennai'];

  // 1. Direct ID lookup
  if (location?.harborId) {
    const [rows]: any = await pool.query('SELECT * FROM dim_fishing_harbors WHERE harbor_id = ?', [location.harborId]);
    if (rows.length) {
      return { status: 'SUPPORTED', locationName: rows[0].landing_center_name, harbor: rows[0] };
    }
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
      const [stateRows]: any = await pool.query(
        'SELECT * FROM dim_fishing_harbors WHERE state LIKE ? ORDER BY harbor_id ASC',
        [`%${matchedState.stateName}%`]
      );
      const refHarbor = stateRows.find((r: any) => r.harbor_id === matchedState.primaryHarborId) || stateRows[0];
      const otherHarbors = stateRows
        .filter((r: any) => r.harbor_id !== refHarbor?.harbor_id)
        .map((r: any) => r.landing_center_name.split(' (')[0]);
      return {
        status: 'COASTAL_STATE',
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
      const [mRows]: any = await pool.query('SELECT * FROM dim_fishing_harbors WHERE harbor_id = ?', [mappedId]);
      if (mRows.length) {
        return { status: 'SUPPORTED', locationName: mRows[0].landing_center_name, harbor: mRows[0] };
      }
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

      return {
        status: 'INLAND',
        locationName: location.name,
        harbor: null,
        suggestions: inlandSuggestions
      };
    }

    // Database lookup: Check landing center name or district using whole word boundaries
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
    if (rows.length) {
      return { status: 'SUPPORTED', locationName: rows[0].landing_center_name, harbor: rows[0] };
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
      const [mRows]: any = await pool.query('SELECT * FROM dim_fishing_harbors WHERE harbor_id = ?', [fuzzyId]);
      if (mRows.length) {
        return { status: 'SUPPORTED', locationName: mRows[0].landing_center_name, harbor: mRows[0] };
      }
    }

    // Unrecognized location
    return {
      status: 'UNKNOWN',
      locationName: location.name,
      harbor: null,
      suggestions: fallbackSuggestions
    };
  }

  // 3. Coordinate distance lookup
  if (location?.latitude != null && location?.longitude != null) {
    const [rows]: any = await pool.query(
      `SELECT *, (111.32 * SQRT(POW(latitude-?,2) + POW((longitude-?)*COS(RADIANS(?)),2))) AS distance_km 
       FROM dim_fishing_harbors 
       ORDER BY distance_km LIMIT 1`,
      [location.latitude, location.longitude, location.latitude]
    );
    if (rows.length && rows[0].distance_km < 150) {
      return { status: 'SUPPORTED', locationName: rows[0].landing_center_name, harbor: rows[0] };
    }
  }

  // Absolutely NO default harbor fallback (e.g. no defaulting to Gujarat/Veraval)
  return {
    status: 'UNKNOWN',
    harbor: null,
    suggestions: fallbackSuggestions
  };
}

export async function resolveHarbor(location?: { name?: string; harborId?: number; latitude?: number; longitude?: number }) {
  const res = await resolveLocation(location);
  return res.harbor || null;
}

export function firstDefined(row: any, keys: string[], fallback: any = null) {
  for (const key of keys) if (row && row[key] !== undefined && row[key] !== null) return row[key];
  return fallback;
}
