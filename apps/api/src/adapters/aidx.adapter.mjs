import { setTimeout as delay } from "node:timers/promises";
import { parse } from "csv-parse/sync";
import { XMLParser, XMLValidator } from "fast-xml-parser";

export function parseAidx(xml) {
  if (
    typeof xml !== "string" ||
    xml.length > 100000 ||
    /<!DOCTYPE|<!ENTITY/i.test(xml) ||
    XMLValidator.validate(xml) !== true
  )
    throw new Error("Invalid or unsafe AIDX XML");
  const root = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    parseTagValue: false,
  }).parse(xml).IATA_AIDX_FlightLegNotifRQ;
  if (!root?.FlightLeg?.LegIdentifier)
    throw new Error("AIDX FlightLeg required");
  const leg = root.FlightLeg;
  const ident = leg.LegIdentifier;
  const d = leg.LegData || {};
  const res = d.AirportResources?.Resource || {};
  const text = (v) => (typeof v === "object" ? v?.["#text"] : v);
  return {
    id: root["@_TransactionIdentifier"] || root["@_SequenceNmbr"],
    number: String(text(ident.Airline)) + text(ident.FlightNumber),
    status: text(d.PublicStatus),
    gate: text(res.PassengerGate || res.AircraftParkingPosition),
    terminal: text(res.AircraftTerminal),
    times: [d.OperationTime].flat().filter(Boolean),
    source: {
      adapter: "mock-aidx",
      timestamp: root["@_TimeStamp"],
      reference: root["@_TransactionIdentifier"],
    },
  };
}
export function createAidxMessage(input, flight, timestamp) {
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
  const status =
    {
      delay: "DLY",
      "gate-change": "SCH",
      boarding: "BRD",
      departure: "DEP",
      arrival: "ARR",
      cancellation: "CNL",
    }[input.type] || "SCH";
  const estimated =
    input.type === "delay"
      ? new Date(
          Date.parse(flight.scheduled) + input.minutes * 60000,
        ).toISOString()
      : flight.estimated;
  return `<IATA_AIDX_FlightLegNotifRQ xmlns="http://www.iata.org/IATA/2007/00" Version="21.3" TimeStamp="${new Date(timestamp).toISOString()}" TransactionIdentifier="${escape(input.id)}"><Originator CompanyShortName="MERIDIAN"/><FlightLeg><LegIdentifier><Airline>${escape(flight.number.slice(0, 2))}</Airline><FlightNumber>${escape(flight.number.slice(2))}</FlightNumber><DepartureAirport>${escape(flight.origin)}</DepartureAirport><ArrivalAirport>${escape(flight.destination)}</ArrivalAirport><OriginDate>${escape(flight.scheduled.slice(0, 10))}</OriginDate></LegIdentifier><LegData><PublicStatus>${status}</PublicStatus><AirportResources Usage="Actual"><Resource DepartureOrArrival="${flight.direction === "A" ? "Arrival" : "Departure"}"><PassengerGate>${escape(input.gate || flight.gate)}</PassengerGate><AircraftTerminal>${flight.terminal}</AircraftTerminal></Resource></AirportResources><OperationTime OperationQualifier="OFF" CodeContext="9750" TimeType="EST">${estimated}</OperationTime></LegData></FlightLeg></IATA_AIDX_FlightLegNotifRQ>`;
}
