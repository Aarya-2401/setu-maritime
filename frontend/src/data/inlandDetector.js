// ---------------------------------------------------------------------------
// Inland Location Detector & Maritime Port Suggestion Engine
// Identifies non-coastal query locations and provides proximate coastal harbors
// ---------------------------------------------------------------------------

export const INLAND_REGIONS = {
  // Gujarat Inland Cities -> Proximate Gujarat Maritime Ports
  'ahmedabad': {
    place: 'Ahmedabad',
    suggestions: ['Hazira Port', 'Mundra Port', 'Dahej Port', 'Veraval Fishing Harbor']
  },
  'gandhinagar': {
    place: 'Gandhinagar',
    suggestions: ['Hazira Port', 'Mundra Port', 'Dahej Port', 'Veraval Fishing Harbor']
  },
  'vadodara': {
    place: 'Vadodara',
    suggestions: ['Dahej Port', 'Hazira Port', 'Veraval Fishing Harbor']
  },
  'anand': {
    place: 'Anand',
    suggestions: ['Dahej Port', 'Hazira Port', 'Veraval Fishing Harbor']
  },
  'rajkot': {
    place: 'Rajkot',
    suggestions: ['Veraval Fishing Harbor', 'Porbandar Fishing Harbor', 'Okha Port Landing Center']
  },

  // Northern & Central Inland Capitals / Metros
  'delhi': {
    place: 'Delhi',
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'new delhi': {
    place: 'New Delhi',
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'noida': {
    place: 'Noida',
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'gurgaon': {
    place: 'Gurgaon',
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'gurugram': {
    place: 'Gurugram',
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'chandigarh': {
    place: 'Chandigarh',
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'jaipur': {
    place: 'Jaipur',
    suggestions: ['Veraval Fishing Harbor', 'Mundra Port', 'Porbandar Fishing Harbor']
  },
  'jodhpur': {
    place: 'Jodhpur',
    suggestions: ['Mundra Port', 'Okha Port Landing Center', 'Veraval Fishing Harbor']
  },
  'udaipur': {
    place: 'Udaipur',
    suggestions: ['Hazira Port', 'Veraval Fishing Harbor', 'Porbandar Fishing Harbor']
  },
  'bikaner': {
    place: 'Bikaner',
    suggestions: ['Mundra Port', 'Okha Port Landing Center', 'Veraval Fishing Harbor']
  },
  'ajmer': {
    place: 'Ajmer',
    suggestions: ['Veraval Fishing Harbor', 'Mundra Port', 'Porbandar Fishing Harbor']
  },
  'kota': {
    place: 'Kota',
    suggestions: ['Hazira Port', 'Dahej Port', 'Veraval Fishing Harbor']
  },

  // Deccan & Southern Inland Hubs
  'bengaluru': {
    place: 'Bengaluru',
    suggestions: ['Mangalore Old Port', 'Malpe Fishing Harbor', 'Cochin Fishing Harbor', 'Kasimedu / Chennai Fishing Harbor']
  },
  'bangalore': {
    place: 'Bangalore',
    suggestions: ['Mangalore Old Port', 'Malpe Fishing Harbor', 'Cochin Fishing Harbor', 'Kasimedu / Chennai Fishing Harbor']
  },
  'mysore': {
    place: 'Mysore',
    suggestions: ['Mangalore Old Port', 'Cochin Fishing Harbor', 'Beypore Fishery Harbor']
  },
  'mysuru': {
    place: 'Mysuru',
    suggestions: ['Mangalore Old Port', 'Cochin Fishing Harbor', 'Beypore Fishery Harbor']
  },
  'hyderabad': {
    place: 'Hyderabad',
    suggestions: ['Machilipatnam / Gilakaladindi', 'Nizampatnam Fishing Harbor', 'Visakhapatnam Fishing Harbor']
  },
  'secunderabad': {
    place: 'Secunderabad',
    suggestions: ['Machilipatnam / Gilakaladindi', 'Nizampatnam Fishing Harbor', 'Visakhapatnam Fishing Harbor']
  },

  // Western Inland Hubs
  'pune': {
    place: 'Pune',
    suggestions: ['Sassoon Dock Harbor, Mumbai', 'Versova Fish Landing Center', 'Ratnagiri Mirkarwada Harbor']
  },
  'nashik': {
    place: 'Nashik',
    suggestions: ['Sassoon Dock Harbor, Mumbai', 'Versova Fish Landing Center', 'Satpati Landing Center']
  },
  'aurangabad': {
    place: 'Aurangabad',
    suggestions: ['Sassoon Dock Harbor, Mumbai', 'Ratnagiri Mirkarwada Harbor']
  },
  'nagpur': {
    place: 'Nagpur',
    suggestions: ['Paradip Fishing Harbor', 'Visakhapatnam Fishing Harbor', 'Sassoon Dock Harbor, Mumbai']
  },

  // Central India
  'bhopal': {
    place: 'Bhopal',
    suggestions: ['Hazira Port', 'Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai']
  },
  'indore': {
    place: 'Indore',
    suggestions: ['Hazira Port', 'Dahej Port', 'Veraval Fishing Harbor']
  },
  'gwalior': {
    place: 'Gwalior',
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'jabalpur': {
    place: 'Jabalpur',
    suggestions: ['Visakhapatnam Fishing Harbor', 'Paradip Fishing Harbor']
  },
  'ujjain': {
    place: 'Ujjain',
    suggestions: ['Hazira Port', 'Veraval Fishing Harbor']
  },

  // Eastern & Gangetic Plains Hubs
  'lucknow': {
    place: 'Lucknow',
    suggestions: ['Paradip Fishing Harbor', 'Digha / Sankarpur Fishing Harbor', 'Dhamra Fishing Harbor']
  },
  'kanpur': {
    place: 'Kanpur',
    suggestions: ['Paradip Fishing Harbor', 'Digha / Sankarpur Fishing Harbor', 'Dhamra Fishing Harbor']
  },
  'varanasi': {
    place: 'Varanasi',
    suggestions: ['Digha / Sankarpur Fishing Harbor', 'Paradip Fishing Harbor', 'Dhamra Fishing Harbor']
  },
  'agra': {
    place: 'Agra',
    suggestions: ['Veraval Fishing Harbor', 'Sassoon Dock Harbor, Mumbai', 'Paradip Fishing Harbor']
  },
  'patna': {
    place: 'Patna',
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

/**
 * Checks if query mentions any inland region and returns proximate harbor suggestions
 * @param {string} query
 * @returns {{ isInland: boolean, place: string, suggestions: string[] } | null}
 */
export function detectInlandLocation(query) {
  if (!query || typeof query !== 'string') return null
  const lower = query.toLowerCase()

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
        suggestions: match.suggestions
      }
    }
  }

  return null
}
