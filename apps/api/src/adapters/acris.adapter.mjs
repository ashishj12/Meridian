import { validateAcrisEntity } from "./acris-validation.mjs";
import { setTimeout as delay } from "node:timers/promises";
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
export function mockQueueCount(baseCount, timestamp, delayMinutes = 0) {
  const hour = new Date(timestamp).getUTCHours();
  const peak = (Math.cos(((hour - 8) * Math.PI) / 12) + 1) / 2;
  const delaySpike = delayMinutes
    ? Math.ceil(Math.min(delayMinutes, 60) * 0.6)
    : 0;
  return Math.max(0, Math.round(baseCount * (0.75 + 0.5 * peak) + delaySpike));
}

export function createMockQueueMeasurement(zoneId, occupancy, timestamp) {
  const zoneNumber = Number(zoneId.slice(1));
  const queueNumber = zoneNumber - 1;
  const time = new Date(timestamp).toISOString();
  const measurement = {
    id: `urn:ngsi-ld:QueueMeasurement:Q${queueNumber}`,
    type: "QueueMeasurement",
    zoneId: {
      type: "Relationship",
      object: `urn:ngsi-ld:Zone:${zoneId}`,
    },
    queue: {
      type: "Relationship",
      object: `urn:ngsi-ld:PassengerQueue:PQ${queueNumber}`,
    },
    "@context":
      "https://smart-data-models.github.io/dataModel.ACRIS/context.jsonld",
    Occupancy: { type: "Property", value: occupancy },
    MeasurementTimePeriod: {
      type: "Property",
      value: { StartTime: time, EndTime: time },
    },
  };
  return parseAcris([measurement])[0];
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
  async *streamMeasurements({ signal, runtime, intervalMs = 1000 } = {}) {
    const measurements = (await this.getZones()).filter(
      (entity) => entity.type === "QueueMeasurement",
    );
    let fallbackTime = Date.now();
    while (!signal?.aborted) {
      const timestamp = runtime?.engine.clock.time ?? fallbackTime;
      for (const entity of measurements) {
        const queue = runtime?.store.get("queues", entity.id);
        const baseCount = queue?.baseCount ?? entity.count;
        const delayMinutes = runtime
          ? Math.max(
              0,
              ...runtime.store
                .all("flights")
                .filter((flight) => flight.zoneId === entity.zoneId)
                .map((flight) => flight.delay || 0),
            )
          : 0;
        yield createMockQueueMeasurement(
          entity.zoneId,
          mockQueueCount(baseCount, timestamp, delayMinutes),
          timestamp,
        );
      }
      fallbackTime += intervalMs;
      await delay(intervalMs, undefined, { signal });
    }
  }
}
