import { parse } from "csv-parse/sync";
import fs from "node:fs";

export const referenceFile = new URL(
  "../../../../fixtures/reference/MQI_aodb_flights_2026-10-14_SYNTHETIC.csv",
  import.meta.url,
);
export function parseAodb(csv) {
  return parse(csv, { columns: true, skip_empty_lines: true }).map((row) => ({
    id: row.aodb_flight_id,
    linkedFlightId: row.linked_flight_id,
    number: row.airline_iata + row.flight_number,
    airlineId: row.airline_iata,
    airlineIcao: row.airline_icao,
    callsign: row.callsign,
    serviceType: row.service_type,
    direction: row.direction,
    international: row.flight_nature === "I",
    origin: row.origin,
    destination: row.destination,
    via: row.via,
    terminal: row.terminal,
    gate: row.gate || row.stand,
    stand: row.stand,
    scheduled: row.STA_STD,
    estimated: row.ETA_ETD,
    landingEstimated: row.ELDT_ETOT,
    landingActual: row.ALDT_ATOT,
    actual: row.AIBT_AOBT,
    tobt: row.TOBT,
    tsat: row.TSAT,
    checkin: row.checkin_counters,
    belt: row.baggage_belt,
    aircraft: row.aircraft_type_icao,
    registration: row.aircraft_reg,
    seats: +row.seats,
    pax: +row.pax_total,
    status: row.status,
    delay: Math.max(
      0,
      Math.round((Date.parse(row.ETA_ETD) - Date.parse(row.STA_STD)) / 60000),
    ),
    delayCodes: row.delay_codes.split("/").filter(Boolean),
    codeshares: row.codeshares.split("|").filter(Boolean),
    handler: row.handler,
    source: {
      adapter: "aodb-csv",
      reference: row.aodb_flight_id,
      timestamp: row.last_update_utc,
      raw: row,
    },
  }));
}
export function toAodbRow(flight) {
  return {
    aodb_flight_id: flight.id,
    linked_flight_id: flight.linkedFlightId || "",
    direction: flight.direction,
    airline_iata: flight.airlineId,
    airline_icao: flight.airlineIcao || "MQX",
    flight_number: flight.number.slice(2),
    callsign: flight.callsign || flight.number,
    service_type: flight.serviceType || "J",
    flight_nature: flight.international ? "I" : "D",
    origin: flight.origin,
    destination: flight.destination,
    via: flight.via || "",
    terminal: flight.terminal,
    STA_STD: flight.scheduled,
    ETA_ETD: flight.estimated,
    ELDT_ETOT: flight.landingEstimated || flight.estimated,
    ALDT_ATOT: flight.landingActual || "",
    AIBT_AOBT: flight.actual || "",
    TOBT: flight.tobt || "",
    TSAT: flight.tsat || "",
    stand: flight.stand || flight.gate,
    gate: flight.gate,
    checkin_counters: flight.checkin || "",
    baggage_belt: flight.belt || "",
    aircraft_reg: flight.registration || "Q-MQI",
    aircraft_type_icao: flight.aircraft,
    seats: flight.seats,
    pax_total: flight.pax,
    status: flight.status,
    delay_codes: (flight.delayCodes || []).join("/"),
    codeshares: (flight.codeshares || []).join("|"),
    handler: flight.handler || "Meridian Ground Services",
    last_update_utc: flight.source.timestamp,
  };
}

const mockAirlines = [
  "XY",
  "ZQ",
  "YN",
  "XU",
  "YF",
  "ZO",
  "XH",
  "YG",
  "XI",
  "YU",
];
const mockDestinations = [
  "ADN",
  "BWZ",
  "CBP",
  "CPZ",
  "DMQ",
  "BVQ",
  "KST",
  "NVQ",
  "PVQ",
  "SMG",
];
const csvField = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

/** Generate the mock AODB as the reference feed's 33-column CSV, then let parseAodb normalize it. */
export function generateMockAodbCsv(
  timestamp = Date.parse("2026-10-14T14:10:00Z"),
) {
  const reference = fs.readFileSync(referenceFile, "utf8");
  const referenceRows = parse(reference, {
    columns: true,
    skip_empty_lines: true,
  });
  const columns = Object.keys(referenceRows[0]);
  const day = new Date(timestamp);
  day.setUTCHours(0, 0, 0, 0);
  const generatedRows = [];
  for (let i = 320; i < 898; i++) {
    const zoneNumber = 1 + (i % 10);
    const international = i % 10 >= 5;
    const scheduled =
      day.getTime() + ((i * 97 + zoneNumber * 137) % 1440) * 60000;
    const airlineId = mockAirlines[i % mockAirlines.length];
    const gate = String((zoneNumber - 1) * 6 + 1 + (i % 6));
    const aircraft = i % 2 ? "A320" : "B38M";
    const passengers = 100 + ((i * 37) % 180);
    generatedRows.push(
      toAodbRow({
        id: `F${i}`,
        linkedFlightId: "",
        number: airlineId + (100 + i),
        airlineId,
        direction: i % 3 === 0 ? "A" : "D",
        international,
        origin: "MQI",
        destination: mockDestinations[i % mockDestinations.length],
        terminal: international ? "T2" : "T1",
        gate,
        stand: gate,
        scheduled: new Date(scheduled).toISOString(),
        estimated: new Date(scheduled).toISOString(),
        pax: passengers,
        seats: 300,
        aircraft,
        status: "Scheduled",
        delay: 0,
        source: {
          adapter: "mock-aodb",
          timestamp: new Date(timestamp).toISOString(),
        },
      }),
    );
  }
  const records = [
    ...referenceRows.map((row) => columns.map((column) => row[column] ?? "")),
    ...generatedRows.map((row) => columns.map((column) => row[column] ?? "")),
  ];
  return [
    columns.map(csvField).join(","),
    ...records.map((row) => row.map(csvField).join(",")),
  ].join("\n");
}
