export interface Provenance {
  adapter: string;
  reference: string;
  timestamp: string;
  raw?: Record<string, string>;
}
export interface GateAssignment {
  id: string;
  flightId: string;
  gateId: string;
  zoneId: string;
  terminal: string;
  assignedAt: number;
}
export interface AircraftType {
  id: string;
  icao: string;
  seats: number;
}
export interface Flight {
  id: string;
  number: string;
  airlineId: string;
  gate: string;
  zoneId: string;
  terminal: string;
  scheduled: string;
  estimated: string;
  pax: number;
  seats: number;
  status: string;
  delay: number;
  international: boolean;
  source: Provenance;
  profile: Record<string, unknown>;
}
export interface FlightEvent {
  id: string;
  type:
    | "delay"
    | "gate-change"
    | "boarding"
    | "departure"
    | "arrival"
    | "cancellation";
  flightId: string;
  minutes?: number;
  gate?: string;
}
export interface FlightSource {
  getSnapshot(): Promise<Flight[]>;
  stream(): AsyncIterable<FlightEvent>;
}
export interface QueueMeasurement {
  id: string;
  zoneId: string;
  count: number;
  timestamp: string;
  source: string;
}
export interface ZoneSource {
  getZones(): Promise<Record<string, unknown>[]>;
  streamMeasurements(): AsyncIterable<QueueMeasurement>;
}
export interface CreativeProvider {
  generate(brief: string): Promise<{
    headline: string;
    headlineHi: string;
    offer: string;
    provider: string;
    [key: string]: unknown;
  }>;
}
