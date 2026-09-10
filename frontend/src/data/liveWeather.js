// ---------------------------------------------------------------------------
// Live Atmospheric Weather & Wind Telemetry Service
// Powered by Open-Meteo High-Resolution Real-Time Meteorological API
// Provides instant live weather, wind velocity, and location abbreviation
// ---------------------------------------------------------------------------

// Standard Indian State 2-letter ISO/Postal abbreviations
const STATE_ABBR_MAP = {
  rajasthan: 'RJ',
  gujarat: 'GJ',
  maharashtra: 'MH',
  kerala: 'KL',
  'tamil nadu': 'TN',
  tamilnadu: 'TN',
  karnataka: 'KA',
  'andhra pradesh': 'AP',
  andhrapradesh: 'AP',
  odisha: 'OD',
  orissa: 'OD',
  'west bengal': 'WB',
  westbengal: 'WB',
  goa: 'GA',
  delhi: 'DL',
  'new delhi': 'DL',
  'uttar pradesh': 'UP',
  uttarpradesh: 'UP',
  'madhya pradesh': 'MP',
  madhyapradesh: 'MP',
  punjab: 'PB',
  haryana: 'HR',
  telangana: 'TS',
  bihar: 'BR',
  assam: 'AS',
  lakshadweep: 'LD',
  'andaman and nicobar islands': 'AN',
  andaman: 'AN'
}

// Prominent City 3-letter IATA/Railway abbreviations
const CITY_ABBR_MAP = {
  jaipur: 'JAI',
  delhi: 'DEL',
  'new delhi': 'DEL',
  mumbai: 'BOM',
  bombay: 'BOM',
  bangalore: 'BLR',
  bengaluru: 'BLR',
  chennai: 'MAA',
  madras: 'MAA',
  kolkata: 'CCU',
  calcutta: 'CCU',
  hyderabad: 'HYD',
  ahmedabad: 'AMD',
  kochi: 'COK',
  cochin: 'COK',
  pune: 'PNQ',
  lucknow: 'LKO',
  jodhpur: 'JDH',
  udaipur: 'UDR',
  bikaner: 'BKN',
  ajmer: 'AII',
  kota: 'KOTA',
  veraval: 'VER',
  visakhapatnam: 'VTZ',
  vizag: 'VTZ',
  paradip: 'PRDP',
  mangalore: 'IXE',
  mangaluru: 'IXE'
}

/**
 * Format city and state into clean marine abbreviation tag, e.g. "JAI · RJ"
 * @param {string} city - City or town name
 * @param {string} state - State name
 * @returns {string} e.g. "JAI · RJ"
 */
export function getCityStateAbbr(city, state) {
  if (!city && !state) return 'LOC · IN'
  const cNorm = (city || '').trim().toLowerCase()
  const sNorm = (state || '').trim().toLowerCase()

  const cityCode = CITY_ABBR_MAP[cNorm] || (city ? city.slice(0, 3).toUpperCase() : 'LOC')
  const stateCode = STATE_ABBR_MAP[sNorm] || (state ? state.slice(0, 2).toUpperCase() : 'IN')

  return `${cityCode} · ${stateCode}`
}

/**
 * Fetch live atmospheric weather and wind velocity for any coordinate pair
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object|null>} Live telemetry object
 */
export async function fetchLiveWeather(lat, lon) {
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
    return null
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${Number(lat).toFixed(4)}&longitude=${Number(lon).toFixed(4)}&current=temperature_2m,relative_humidity_2m,surface_pressure,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Open-Meteo returned HTTP ${res.status}`)
    }

    const json = await res.json()
    const current = json.current || {}

    return {
      air_temp_celsius: current.temperature_2m != null ? current.temperature_2m : null,
      surface_pressure_hpa: current.surface_pressure != null ? current.surface_pressure : null,
      visibility_km: current.visibility != null ? current.visibility / 1000 : null,
      wind_speed_kmph: current.wind_speed_10m != null ? current.wind_speed_10m : null,
      wind_direction_deg: current.wind_direction_10m != null ? current.wind_direction_10m : null,
      wind_gust_mps: current.wind_gusts_10m != null ? current.wind_gusts_10m / 3.6 : null,
      relative_humidity: current.relative_humidity_2m != null ? current.relative_humidity_2m : null,
      source: 'Open-Meteo Real-Time Atmospheric Feed',
      timestamp: current.time || new Date().toISOString()
    }
  } catch (err) {
    console.warn('Live weather fetch failed, falling back to local nowcast:', err.message)
    return null
  }
}
