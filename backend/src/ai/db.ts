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
  kakinada: 38,
  bhavanapadu: 39,
  pudimadaka: 40,
  krishnapatnam: 34,
  nizampatnam: 35,
  machilipatnam: 36,
  andhra: 37,
  'andhra pradesh': 37,

  paradip: 41,
  paradeep: 41,
  dhamra: 42,
  puri: 43,
  gopalpur: 44,
  odisha: 41,
  orissa: 41,

  mangalore: 14,
  mangaluru: 14,
  malpe: 15,
  udupi: 15,
  tadri: 16,
  honnavar: 17,
  karwar: 18,
  karnataka: 14,

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

  kavaratti: 49,
  agatti: 50,
  minicoy: 51,
  lakshadweep: 49,

  'port blair': 52,
  junglighat: 52,
  diglipur: 53,
  havelock: 54,
  'swaraj dweep': 54,
  'car nicobar': 55,
  'campbell bay': 56,
  andaman: 52,
  nicobar: 52
};

export const INLAND_REGIONS = new Set([
  'delhi', 'new delhi', 'bangalore', 'bengaluru', 'hyderabad', 'jaipur', 'nagpur',
  'bhopal', 'indore', 'patna', 'lucknow', 'kanpur', 'chandigarh', 'pune', 'gurgaon',
  'noida', 'ranchi', 'raipur', 'dehradun', 'shimla', 'srinagar', 'amritsar', 'ludhiana',
  'punjab', 'haryana', 'rajasthan', 'madhya pradesh', 'uttar pradesh', 'bihar',
  'jharkhand', 'chhattisgarh', 'telangana', 'uttarakhand', 'himachal pradesh', 'assam'
]);

export interface LocationResolution {
  status: 'SUPPORTED' | 'INLAND' | 'UNKNOWN';
  locationName?: string;
  harbor?: any;
  suggestions?: string[];
}

export async function resolveLocation(location?: { name?: string; harborId?: number; latitude?: number; longitude?: number }): Promise<LocationResolution> {
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

    // Check regional alias dictionary first (e.g. Bombay -> Mumbai, Cochin -> Kochi)
    let mappedId: number | undefined = REGIONAL_CITY_MAP[raw];
    if (!mappedId) {
      for (const [key, id] of Object.entries(REGIONAL_CITY_MAP)) {
        if (raw === key || raw.includes(key) || key.includes(raw)) {
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

    // Database lookup: Check landing center name, district, or state
    const term = `%${location.name}%`;
    const [rows]: any = await pool.query(
      `SELECT * FROM dim_fishing_harbors 
       WHERE landing_center_name LIKE ? OR district LIKE ? OR state LIKE ? 
       ORDER BY (state LIKE ?) DESC, landing_center_name ASC LIMIT 1`,
      [term, term, term, term]
    );
    if (rows.length) {
      return { status: 'SUPPORTED', locationName: rows[0].landing_center_name, harbor: rows[0] };
    }

    // Fast-path inland check
    const isInland = INLAND_REGIONS.has(raw) || Array.from(INLAND_REGIONS).some(inland => raw.includes(inland));
    if (isInland) {
      return {
        status: 'INLAND',
        locationName: location.name,
        harbor: null,
        suggestions: ['Gujarat', 'Maharashtra', 'Goa', 'Karnataka', 'Kerala', 'Tamil Nadu', 'Andhra Pradesh', 'Odisha', 'West Bengal']
      };
    }

    // Unrecognized location
    return {
      status: 'UNKNOWN',
      locationName: location.name,
      harbor: null,
      suggestions: ['Gujarat', 'Maharashtra', 'Goa', 'Karnataka', 'Kerala', 'Tamil Nadu', 'Andhra Pradesh', 'Odisha', 'West Bengal']
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
    suggestions: ['Gujarat', 'Maharashtra', 'Goa', 'Karnataka', 'Kerala', 'Tamil Nadu', 'Andhra Pradesh', 'Odisha', 'West Bengal']
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
