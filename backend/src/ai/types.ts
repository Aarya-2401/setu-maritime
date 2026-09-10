export type AgentName = 'weather' | 'wind' | 'tide' | 'wave' | 'cyclone' | 'marine-alert' | 'pfz' | 'zone' | 'species' | 'catch';
export type Status = 'success' | 'partial' | 'error';

export type LocationType = 'HARBOR' | 'COASTAL_STATE' | 'INLAND' | 'REGION' | 'UNKNOWN';

export type MapAction =
  | 'PRESERVE'
  | 'FOCUS_HARBOR'
  | 'FOCUS_LOCATION'
  | 'FOCUS_LAYER'
  | 'FIT_LAYER'
  | 'FIT_REGION'
  | 'CLEAR_FOCUS';

export type MapLayer =
  | 'PFZ'
  | 'ROUTES'
  | 'RESTRICTED_ZONES'
  | 'EEZ'
  | 'IMBL'
  | 'CYCLONES'
  | 'WAVES'
  | 'HARBORS';

export type MapScope = 'CURRENT_HARBOR' | 'NEAR_LOCATION' | 'STATE' | 'REGION' | 'NATIONAL';

export type MapHighlight = 'NONE' | 'MATCHED' | 'ALL';

export interface MapLocation {
  name?: string;
  latitude?: number;
  longitude?: number;
}

export interface MapIntent {
  action: MapAction;
  layer?: MapLayer;
  scope?: MapScope;
  scopeName?: string;
  harborId?: number;
  targetIds?: string[];
  highlight?: MapHighlight;
  fitBounds?: boolean;
  bounds?: [[number, number], [number, number]];
  location?: MapLocation;
}

export interface DataFreshness {
  source?: string;
  updatedAt?: string;
  validAt?: string;
  dataType?: 'observed' | 'forecast' | 'predicted' | 'model' | 'reference';
}

export interface ConversationContext {
  selectedHarborId?: number;
  previousMapIntent?: MapIntent;
  previousLocation?: MapLocation;
  previousLocationType?: LocationType;
  previousQueryTarget?: string;
}

export interface OrcaLocation {
  name?: string;
  latitude?: number;
  longitude?: number;
  harborId?: number;
}

export interface AgentRequest {
  query: string;
  location?: OrcaLocation;
  timeRange?: { from?: string; to?: string };
  species?: string;
  operation?: string;
  mapIntent?: MapIntent;
  locationType?: LocationType;
  stateName?: string;
}

export interface CardUpdate {
  cardId: string;
  action: 'update' | 'clear';
  data: Record<string, unknown>;
  location?: string;
  timestamp: string;
  sourceAgent: AgentName;
}

export interface AgentResult {
  agent: AgentName;
  status: Status;
  data: Record<string, unknown>;
  assessment?: { level: 'low' | 'moderate' | 'high' | 'critical'; message: string };
  cardUpdates: CardUpdate[];
  mapUpdate?: Record<string, unknown>;
  freshness?: DataFreshness;
  confidence: number;
  timestamp: string;
  error?: string;
}
