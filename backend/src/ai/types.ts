export type AgentName = 'weather' | 'wind' | 'tide' | 'wave' | 'cyclone' | 'marine-alert' | 'pfz' | 'zone' | 'species' | 'catch';
export type Status = 'success' | 'partial' | 'error';

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
  confidence: number;
  timestamp: string;
  error?: string;
}
