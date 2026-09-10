// Static mock data and quick prompt definitions
export const QUICK_PROMPTS = [
  'Is it safe to depart?',
  'Recommended route',
  'Nearest PFZ',
  'Weather conditions',
  'Tide forecast',
  'Active alerts',
]

export const TIDE_POINTS = [
  { label: 'L', time: '06:15 AM', value: 0.7 },
  { label: '', time: '09:00 AM', value: 1.4 },
  { label: 'H', time: '12:35 PM', value: 2.8 },
  { label: '', time: '04:00 PM', value: 1.9 },
  { label: 'L', time: '07:10 PM', value: 0.5 },
]

export const FISHING_ZONES = [
  { id: 'PFZ 1', distance: '22 nm', rating: 'Good' },
  { id: 'PFZ 2', distance: '35 nm', rating: 'Very Good' },
  { id: 'PFZ 3', distance: '48 nm', rating: 'Good' },
]

export const FALLBACK_RESTRICTED_ZONES = [
  {
    zone_id: 'IND-MPA-001',
    boundary_id: 'IND-EEZ-001',
    zone_name: 'Gulf of Mannar Marine National Park & Biosphere Reserve',
    state: 'Tamil Nadu',
    latitude: 9.14,
    longitude: 79.08,
    area_km2: 560.0,
    zone_type: 'MPA',
    restriction_details: 'Strict No-Take Marine Zone — Coral reefs, Dugong (Sea Cow), Green Sea Turtles, Seagrass meadows',
    active_months: 'All Year (Permanent Sanctuary)'
  },
  {
    zone_id: 'IND-MPA-002',
    boundary_id: 'IND-EEZ-001',
    zone_name: 'Mahatma Gandhi Marine National Park (Wandoor)',
    state: 'Andaman & Nicobar',
    latitude: 11.58,
    longitude: 92.63,
    area_km2: 281.5,
    zone_type: 'MPA',
    restriction_details: 'Strict Marine Protected Sanctuary — Fringing coral reefs, Hawksbill turtle nesting, 271 coral species',
    active_months: 'All Year (Permanent Sanctuary)'
  },
  {
    zone_id: 'IND-MPA-003',
    boundary_id: 'IND-EEZ-001',
    zone_name: 'Marine National Park & Sanctuary (Gulf of Kutch)',
    state: 'Gujarat',
    latitude: 22.42,
    longitude: 69.17,
    area_km2: 457.9,
    zone_type: 'MPA',
    restriction_details: 'Strict Ecological Conservation Zone — Mangroves, Corals, Whale Shark, Sponge colonies, Pearl Oysters',
    active_months: 'All Year (Permanent Sanctuary)'
  },
  {
    zone_id: 'IND-MPA-004',
    boundary_id: 'IND-EEZ-001',
    zone_name: 'Gahirmatha Marine Sanctuary',
    state: 'Odisha',
    latitude: 20.73,
    longitude: 87.07,
    area_km2: 1435.0,
    zone_type: 'MPA',
    restriction_details: "Seasonal & Permanent No-Fishing Sanctuary — World's largest Olive Ridley Sea Turtle rookery (Arribada nesting site)",
    active_months: 'All Year (Permanent Sanctuary)'
  },
  {
    zone_id: 'IND-MPA-005',
    boundary_id: 'IND-EEZ-001',
    zone_name: 'Sundarbans National Park (Marine & Estuarine Biosphere)',
    state: 'West Bengal',
    latitude: 21.94,
    longitude: 88.9,
    area_km2: 1330.1,
    zone_type: 'MPA',
    restriction_details: 'Strict Tidal Estuarine Reserve — Royal Bengal Tiger, Irrawaddy Dolphin, Saltwater Crocodile, Mangrove ecosystem',
    active_months: 'All Year (Permanent Sanctuary)'
  },
  {
    zone_id: 'IND-MPA-006',
    boundary_id: 'IND-EEZ-001',
    zone_name: 'Malvan Marine Sanctuary (Sindhudurg Fort)',
    state: 'Maharashtra',
    latitude: 16.06,
    longitude: 73.46,
    area_km2: 29.1,
    zone_type: 'MPA',
    restriction_details: 'No-Take Ecological Reserve — Submerged coral patches, Pearl oysters, Sea anemones, Seaweeds',
    active_months: 'All Year (Permanent Sanctuary)'
  },
  {
    zone_id: 'IND-MPA-007',
    boundary_id: 'IND-EEZ-001',
    zone_name: "Rani Jhansi Marine National Park (Ritchie's Archipelago)",
    state: 'Andaman & Nicobar',
    latitude: 12.08,
    longitude: 92.88,
    area_km2: 256.1,
    zone_type: 'MPA',
    restriction_details: 'Strict Island Coral Reserve — Coral reef lagoon, Dugong, Fruit bats, Saltwater crocodile',
    active_months: 'All Year (Permanent Sanctuary)'
  },
  {
    zone_id: 'IND-MPA-008',
    boundary_id: 'IND-EEZ-001',
    zone_name: 'Bhitarkanika Marine & Mangrove National Park',
    state: 'Odisha',
    latitude: 20.73,
    longitude: 86.87,
    area_km2: 145.0,
    zone_type: 'MPA',
    restriction_details: 'Strict Estuarine Protected Zone — Giant Saltwater Crocodiles, 8 Kingfisher species, Mangrove forests',
    active_months: 'All Year (Permanent Sanctuary)'
  },
  {
    zone_id: 'IND-MPA-009',
    boundary_id: 'IND-EEZ-001',
    zone_name: 'East Coast Monsoon Marine Fishing Ban (Annual 61-Day)',
    state: 'TN, AP, Odisha, WB',
    latitude: 14.5,
    longitude: 83.0,
    area_km2: 45000.0,
    zone_type: 'NO_FISHING',
    restriction_details: 'Seasonal Ban: April 15 to June 14 — Breeding and spawning season protection for commercially important marine species',
    active_months: 'All Year (Permanent Sanctuary)'
  },
  {
    zone_id: 'IND-MPA-010',
    boundary_id: 'IND-EEZ-001',
    zone_name: 'West Coast Monsoon Marine Fishing Ban (Annual 61-Day)',
    state: 'Gujarat, MH, Goa, Karnataka, Kerala',
    latitude: 15.0,
    longitude: 72.5,
    area_km2: 55000.0,
    zone_type: 'NO_FISHING',
    restriction_details: 'Seasonal Ban: June 1 to July 31 — Monsoon pelagic spawning stock regeneration',
    active_months: 'All Year (Permanent Sanctuary)'
  }
]
