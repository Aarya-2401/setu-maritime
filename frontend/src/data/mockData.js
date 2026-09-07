// Static mock data. Swap for real endpoints later.

export const CHAT_HISTORY = [
  { id: 'c1', title: 'Is it safe to fish tomorrow near Mumbai?', time: '09:40 AM', active: true },
  { id: 'c2', title: 'Best fishing zones this week', time: 'Yesterday' },
  { id: 'c3', title: 'Wave height forecast, Alibag coast', time: 'Yesterday' },
  { id: 'c4', title: 'Cyclone alert status, Konkan coast', time: '2 days ago' },
  { id: 'c5', title: 'Tide timing for early morning trip', time: '3 days ago' },
  { id: 'c6', title: 'Wind conditions near Ratnagiri', time: '5 days ago' },
  { id: 'c7', title: 'Comparing PFZ 1 vs PFZ 2', time: 'Last week' },
]

export const QUICK_PROMPTS = [
  'Fish near Kerala tomorrow',
  'Nearest PFZ',
  'Tide now',
  'Weather tomorrow',
  'Alerts',
]

export const INITIAL_MESSAGES = []

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
