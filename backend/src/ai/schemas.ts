import { z } from 'zod';

export const mapIntentSchema = z.object({
  action: z.enum([
    'PRESERVE',
    'FOCUS_HARBOR',
    'FOCUS_LOCATION',
    'FOCUS_LAYER',
    'FIT_LAYER',
    'FIT_REGION',
    'CLEAR_FOCUS'
  ]),
  layer: z.enum(['PFZ', 'ROUTES', 'RESTRICTED_ZONES', 'EEZ', 'IMBL', 'CYCLONES', 'WAVES', 'HARBORS']).optional(),
  scope: z.enum(['CURRENT_HARBOR', 'NEAR_LOCATION', 'STATE', 'REGION', 'NATIONAL']).optional(),
  scopeName: z.string().optional(),
  harborId: z.number().optional(),
  targetIds: z.array(z.string()).optional(),
  highlight: z.enum(['NONE', 'MATCHED', 'ALL']).optional(),
  fitBounds: z.boolean().optional(),
  bounds: z.array(z.array(z.number())).optional(),
  location: z.object({
    name: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }).optional()
});

export const dashboardIntentSchema = z.object({
  context: z.enum([
    'HARBOR_TELEMETRY',
    'PFZ_OVERVIEW',
    'RESTRICTED_ZONES',
    'WEATHER_FORECAST',
    'WAVE_ANALYSIS',
    'TIDE_FORECAST',
    'CYCLONE_TRACK',
    'NAVIGATION_ROUTE',
    'DEPARTURE_ASSESSMENT',
    'INLAND_STATUS'
  ]),
  scope: z.enum(['CURRENT_HARBOR', 'NEAR_LOCATION', 'STATE', 'REGION', 'NATIONAL']).optional(),
  scopeName: z.string().optional(),
  queryTarget: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  primaryCard: z.enum(['pfz', 'zone', 'weather', 'wind', 'wave', 'tide', 'cyclone', 'route', 'assessment', 'inland']).optional(),
  visibleCards: z.array(z.string()).optional()
});

export const coordinatorSchema = z.object({
  intent: z.string(),
  location: z.object({
    name: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    harborId: z.number().optional()
  }).optional(),
  timeRange: z.object({ from: z.string().optional(), to: z.string().optional() }).optional(),
  species: z.string().optional(),
  operation: z.string().optional(),
  requestedAgents: z.array(z.enum(['weather', 'wind', 'tide', 'wave', 'cyclone', 'marine-alert', 'pfz', 'zone', 'species', 'catch'])).min(1),
  reason: z.string().optional(),
  mapIntent: mapIntentSchema.optional(),
  dashboardIntent: dashboardIntentSchema.optional()
});

export type CoordinatorRequest = z.infer<typeof coordinatorSchema>;
export type MapIntentInput = z.infer<typeof mapIntentSchema>;
export type DashboardIntent = z.infer<typeof dashboardIntentSchema>;
