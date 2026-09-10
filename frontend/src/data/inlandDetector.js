// ---------------------------------------------------------------------------
// Inland Location Detector & Maritime Port Suggestion Engine
// Identifies non-coastal query locations and provides proximate coastal harbors
// ---------------------------------------------------------------------------

export const INLAND_REGIONS = {
  // Gujarat Inland Cities -> Proximate Gujarat Maritime Ports
  'ahmedabad': {
    place: 'Ahmedabad',
    city: 'Ahmedabad',
    state: 'Gujarat',
    lat: 23.0225,
    lon: 72.5714,
    suggestions: ['Hazira Port', 'Mundra Port', 'Dahej Port', 'Veraval Fishing Harbor']
  },
  'gandhinagar': {
    place: 'Gandhinagar',
    city: 'Gandhinagar',
    state: 'Gujarat',
    lat: 23.2156,
    lon: 72.6369,
    suggestions: ['Hazira Port', 'Mundra Port', 'Dahej Port', 'Veraval Fishing Harbor']
  },
  'vadodara': {
    place: 'Vadodara',
    city: 'Vadodara',
    state: 'Gujarat',
    lat: 22.3072,
    lon: 73.1812,
    suggestions: ['Dahej Port', 'Hazira Port', 'Veraval Fishing Harbor']
  },
  'anand': {
    place: 'Anand',
    city: 'Anand',
    state: 'Gujarat',
    lat: 22.5645,
    lon: 72.9289,
    suggestions: ['Dahej Port', 'Hazira Port', 'Veraval Fishing Harbor']
  },
  'rajkot': {
    place: 'Rajkot',
    city: 'Rajkot',
    state: 'Gujarat',
    lat: 22.3039,
    lon: 70.8022,
    suggestions: ['Veraval Fishing Harbor', 'Porbandar Fishing Harbor', 'Okha Port Landing Center']
  },

  // Northern & Central Inland Capitals / Metros
  'delhi': {
    place: 'Delhi',
    city: 'Delhi',
    state: 'Delhi',
    lat: 28.6139,
    lon: 77.2090,
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'new delhi': {
    place: 'New Delhi',
    city: 'New Delhi',
    state: 'Delhi',
    lat: 28.6139,
    lon: 77.2090,
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'noida': {
    place: 'Noida',
    city: 'Noida',
    state: 'Uttar Pradesh',
    lat: 28.5355,
    lon: 77.3910,
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'gurgaon': {
    place: 'Gurgaon',
    city: 'Gurugram',
    state: 'Haryana',
    lat: 28.4595,
    lon: 77.0266,
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'gurugram': {
    place: 'Gurugram',
    city: 'Gurugram',
    state: 'Haryana',
    lat: 28.4595,
    lon: 77.0266,
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'chandigarh': {
    place: 'Chandigarh',
    city: 'Chandigarh',
    state: 'Punjab',
    lat: 30.7333,
    lon: 76.7794,
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'jaipur': {
    place: 'Jaipur',
    city: 'Jaipur',
    state: 'Rajasthan',
    lat: 26.9124,
    lon: 75.7873,
    suggestions: ['Veraval Fishing Harbor', 'Mundra Port', 'Porbandar Fishing Harbor']
  },
  'jodhpur': {
    place: 'Jodhpur',
    city: 'Jodhpur',
    state: 'Rajasthan',
    lat: 26.2389,
    lon: 73.0243,
    suggestions: ['Mundra Port', 'Okha Port Landing Center', 'Veraval Fishing Harbor']
  },
  'udaipur': {
    place: 'Udaipur',
    city: 'Udaipur',
    state: 'Rajasthan',
    lat: 24.5854,
    lon: 73.7125,
    suggestions: ['Hazira Port', 'Veraval Fishing Harbor', 'Porbandar Fishing Harbor']
  },
  'bikaner': {
    place: 'Bikaner',
    city: 'Bikaner',
    state: 'Rajasthan',
    lat: 28.0229,
    lon: 73.3119,
    suggestions: ['Mundra Port', 'Okha Port Landing Center', 'Veraval Fishing Harbor']
  },
  'ajmer': {
    place: 'Ajmer',
    city: 'Ajmer',
    state: 'Rajasthan',
    lat: 26.4499,
    lon: 74.6399,
    suggestions: ['Veraval Fishing Harbor', 'Mundra Port', 'Porbandar Fishing Harbor']
  },
  'kota': {
    place: 'Kota',
    city: 'Kota',
    state: 'Rajasthan',
    lat: 25.2138,
    lon: 75.8648,
    suggestions: ['Hazira Port', 'Dahej Port', 'Veraval Fishing Harbor']
  },

  // Deccan & Southern Inland Hubs
  'bengaluru': {
    place: 'Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9716,
    lon: 77.5946,
    suggestions: ['Mangalore Old Port', 'Malpe Fishing Harbor', 'Cochin Fishing Harbor', 'Kasimedu / Chennai Fishing Harbor']
  },
  'bangalore': {
    place: 'Bangalore',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9716,
    lon: 77.5946,
    suggestions: ['Mangalore Old Port', 'Malpe Fishing Harbor', 'Cochin Fishing Harbor', 'Kasimedu / Chennai Fishing Harbor']
  },
  'mysore': {
    place: 'Mysore',
    city: 'Mysuru',
    state: 'Karnataka',
    lat: 12.2958,
    lon: 76.6394,
    suggestions: ['Mangalore Old Port', 'Cochin Fishing Harbor', 'Beypore Fishery Harbor']
  },
  'mysuru': {
    place: 'Mysuru',
    city: 'Mysuru',
    state: 'Karnataka',
    lat: 12.2958,
    lon: 76.6394,
    suggestions: ['Mangalore Old Port', 'Cochin Fishing Harbor', 'Beypore Fishery Harbor']
  },
  'hyderabad': {
    place: 'Hyderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    lat: 17.3850,
    lon: 78.4867,
    suggestions: ['Machilipatnam / Gilakaladindi', 'Nizampatnam Fishing Harbor', 'Visakhapatnam Fishing Harbor']
  },
  'secunderabad': {
    place: 'Secunderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    lat: 17.4399,
    lon: 78.4983,
    suggestions: ['Machilipatnam / Gilakaladindi', 'Nizampatnam Fishing Harbor', 'Visakhapatnam Fishing Harbor']
  },

  // Western Inland Hubs
  'pune': {
    place: 'Pune',
    city: 'Pune',
    state: 'Maharashtra',
    lat: 18.5204,
    lon: 73.8567,
    suggestions: ['Sassoon Dock Harbor, Mumbai', 'Versova Fish Landing Center', 'Ratnagiri Mirkarwada Harbor']
  },
  'nashik': {
    place: 'Nashik',
    city: 'Nashik',
    state: 'Maharashtra',
    lat: 19.9975,
    lon: 73.7898,
    suggestions: ['Sassoon Dock Harbor, Mumbai', 'Versova Fish Landing Center', 'Satpati Landing Center']
  },
  'aurangabad': {
    place: 'Aurangabad',
    city: 'Chhatrapati Sambhajinagar',
    state: 'Maharashtra',
    lat: 19.8762,
    lon: 75.3433,
    suggestions: ['Sassoon Dock Harbor, Mumbai', 'Ratnagiri Mirkarwada Harbor']
  },
  'nagpur': {
    place: 'Nagpur',
    city: 'Nagpur',
    state: 'Maharashtra',
    lat: 21.1458,
    lon: 79.0882,
    suggestions: ['Paradip Fishing Harbor', 'Visakhapatnam Fishing Harbor', 'Sassoon Dock Harbor, Mumbai']
  },

  // Central India
  'bhopal': {
    place: 'Bhopal',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    lat: 23.2599,
    lon: 77.4126,
    suggestions: ['Hazira Port', 'Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai']
  },
  'indore': {
    place: 'Indore',
    city: 'Indore',
    state: 'Madhya Pradesh',
    lat: 22.7196,
    lon: 75.8577,
    suggestions: ['Hazira Port', 'Dahej Port', 'Veraval Fishing Harbor']
  },
  'gwalior': {
    place: 'Gwalior',
    city: 'Gwalior',
    state: 'Madhya Pradesh',
    lat: 26.2183,
    lon: 78.1828,
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'jabalpur': {
    place: 'Jabalpur',
    city: 'Jabalpur',
    state: 'Madhya Pradesh',
    lat: 23.1815,
    lon: 79.9864,
    suggestions: ['Visakhapatnam Fishing Harbor', 'Paradip Fishing Harbor']
  },
  'ujjain': {
    place: 'Ujjain',
    city: 'Ujjain',
    state: 'Madhya Pradesh',
    lat: 23.1765,
    lon: 75.7885,
    suggestions: ['Hazira Port', 'Veraval Fishing Harbor']
  },

  // Eastern & Gangetic Plains Hubs
  'lucknow': {
    place: 'Lucknow',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    lat: 26.8467,
    lon: 80.9462,
    suggestions: ['Paradip Fishing Harbor', 'Digha / Sankarpur Fishing Harbor', 'Dhamra Fishing Harbor']
  },
  'kanpur': {
    place: 'Kanpur',
    city: 'Kanpur',
    state: 'Uttar Pradesh',
    lat: 26.4499,
    lon: 80.3319,
    suggestions: ['Paradip Fishing Harbor', 'Digha / Sankarpur Fishing Harbor', 'Dhamra Fishing Harbor']
  },
  'varanasi': {
    place: 'Varanasi',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    lat: 25.3176,
    lon: 82.9739,
    suggestions: ['Digha / Sankarpur Fishing Harbor', 'Paradip Fishing Harbor', 'Dhamra Fishing Harbor']
  },
  'agra': {
    place: 'Agra',
    city: 'Agra',
    state: 'Uttar Pradesh',
    lat: 27.1767,
    lon: 78.0081,
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'patna': {
    place: 'Patna',
    city: 'Patna',
    state: 'Bihar',
    lat: 25.5941,
    lon: 85.1376,
    suggestions: ['Digha / Sankarpur Fishing Harbor', 'Paradip Fishing Harbor', 'Dhamra Fishing Harbor']
  },
  'ranchi': {
    place: 'Ranchi',
    suggestions: ['Digha / Sankarpur Fishing Harbor', 'Paradip Fishing Harbor', 'Dhamra Fishing Harbor']
  },
  'raipur': {
    place: 'Raipur',
    suggestions: ['Paradip Fishing Harbor', 'Visakhapatnam Fishing Harbor', 'Gopalpur Fish Landing Center']
  },
  'dehradun': {
    place: 'Dehradun',
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai']
  },
  'shimla': {
    place: 'Shimla',
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai']
  },
  'srinagar': {
    place: 'Srinagar',
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai']
  },
  'amritsar': {
    place: 'Amritsar',
    suggestions: ['Veraval Fishing Harbor', 'Mundra Port', 'Okha Port Landing Center']
  },
  'ludhiana': {
    place: 'Ludhiana',
    suggestions: ['Veraval Fishing Harbor', 'Mundra Port']
  },

  // Inland States
  'rajasthan': {
    place: 'Rajasthan',
    suggestions: ['Veraval Fishing Harbor', 'Mundra Port', 'Porbandar Fishing Harbor', 'Okha Port Landing Center']
  },
  'madhya pradesh': {
    place: 'Madhya Pradesh',
    suggestions: ['Hazira Port', 'Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai']
  },
  'uttar pradesh': {
    place: 'Uttar Pradesh',
    suggestions: ['Paradip Fishing Harbor', 'Digha / Sankarpur Fishing Harbor', 'Dhamra Fishing Harbor']
  },
  'bihar': {
    place: 'Bihar',
    suggestions: ['Digha / Sankarpur Fishing Harbor', 'Paradip Fishing Harbor', 'Dhamra Fishing Harbor']
  },
  'punjab': {
    place: 'Punjab',
    suggestions: ['Veraval Fishing Harbor', 'Mundra Port', 'Okha Port Landing Center']
  },
  'haryana': {
    place: 'Haryana',
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Mundra Port']
  },
  'jharkhand': {
    place: 'Jharkhand',
    suggestions: ['Digha / Sankarpur Fishing Harbor', 'Paradip Fishing Harbor', 'Dhamra Fishing Harbor']
  },
  'chhattisgarh': {
    place: 'Chhattisgarh',
    suggestions: ['Paradip Fishing Harbor', 'Visakhapatnam Fishing Harbor', 'Gopalpur Fish Landing Center']
  },
  'telangana': {
    place: 'Telangana',
    suggestions: ['Machilipatnam / Gilakaladindi', 'Visakhapatnam Fishing Harbor', 'Nizampatnam Fishing Harbor']
  }
}

export const DEFAULT_HARBOR_SUGGESTIONS = [
  'Veraval Fishing Harbor',
  'Sassoon Dock Harbor, Mumbai',
  'Cochin Fishing Harbor',
  'Paradip Fishing Harbor',
  'Visakhapatnam Fishing Harbor'
]

export function detectInlandLocation(query) {
  if (!query || typeof query !== 'string') return null
  const lower = query.toLowerCase()

  // Proactively check for "my location", "here", "current position"
  if (lower.includes('my location') || lower.includes('current location') || lower.includes('here') || lower.includes('user location')) {
    return {
      isInland: true,
      isUserPositionQuery: true,
      place: 'Your Location',
      suggestions: DEFAULT_HARBOR_SUGGESTIONS
    }
  }

  // Sort keys descending by length so multi-word keys match first
  const keys = Object.keys(INLAND_REGIONS).sort((a, b) => b.length - a.length)

  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(^|\\W)${escaped}(\\W|$)`, 'i')
    if (regex.test(lower)) {
      const match = INLAND_REGIONS[key]
      return {
        isInland: true,
        place: match.place,
        city: match.city || match.place,
        state: match.state || '',
        lat: match.lat || null,
        lon: match.lon || null,
        suggestions: match.suggestions
      }
    }
  }

  return null
}
