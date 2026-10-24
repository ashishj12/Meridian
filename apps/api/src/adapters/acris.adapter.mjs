import { validateAcrisEntity } from "./acris-validation.mjs";
import fs from "node:fs";

export function parseAcris(entities) {
  if (!Array.isArray(entities)) throw new Error("ACRIS entity array required");
  const id = (value) =>
    typeof value === "string" && value.startsWith("urn:ngsi-ld:")
      ? value.split(":").at(-1)
      : value;
  return entities.map((entity) => {
    const record = validateAcrisEntity(entity);
    const normalized = Object.fromEntries(
      Object.entries(record).map(([key, value]) => [
        key,
        entity[key]?.type === "Relationship" ? id(value) : value,
      ]),
    );
    return {
      ...normalized,
      id: id(record.id),
      ...(record.type === "QueueMeasurement"
        ? {
            count: record.Occupancy,
            observedAt: record.MeasurementTimePeriod.EndTime,
          }
        : {}),
      provenance: {
        adapter: "acris-ngsi-ld",
        reference: entity.id,
        raw: entity,
      },
    };
  });
}
export class MockZoneSource {
  async getZones() {
    return parseAcris(
      JSON.parse(
        fs.readFileSync(
          new URL("../../../../fixtures/acris/entities.json", import.meta.url),
          "utf8",
        ),
      ),
    );
  }
  async *streamMeasurements() {
    for (const e of await this.getZones())
      if (e.type === "QueueMeasurement") yield e;
  }
}
