export const SEVERITIES = ['MINOR', 'MODERATE', 'SEVERE', 'FATAL'] as const;
export const VEHICLES = ['Two-wheeler', 'Car', 'Bus', 'Truck', 'Pedestrian', 'Bicycle', 'Other'] as const;
export const WEATHER = ['Clear', 'Rain', 'Fog', 'Wind', 'Unknown'] as const;
export const ROADS = ['Dry', 'Wet', 'Waterlogged', 'Construction', 'Unknown'] as const;
export type Severity = typeof SEVERITIES[number];
export type SourceKind = 'synthetic' | 'imported' | 'community';
export interface Incident {
  id: string;
  occurredAt: string;
  locationName: string;
  lat: number;
  lng: number;
  severity: Severity;
  fatalities: number;
  injuries: number;
  vehicle: typeof VEHICLES[number];
  weather: typeof WEATHER[number];
  roadCondition: typeof ROADS[number];
  description: string;
  sourceKind: SourceKind;
  source: string;
  sourceUrl: string;
  license: string;
  verification: 'unverified';
  attachment?: { name: string; type: string; size: number; path: string };
}
export interface ScoreBreakdown {
  frequency: number; severity: number; recency: number; total: number;
}
export interface Hotspot {
  id: string; name: string; lat: number; lng: number; incidents: Incident[];
  fatalities: number; injuries: number; latest: string;
  score: ScoreBreakdown; status: 'CRITICAL' | 'WARNING' | 'MONITORED';
}
export interface Filters {
  start: string; end: string; search: string;
  severity: string; sourceKind: string;
}
