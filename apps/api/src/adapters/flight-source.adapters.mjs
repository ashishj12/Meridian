import { randomUUID } from "node:crypto";
import { requestText } from "./http-client.mjs";
import { setTimeout as delay } from "node:timers/promises";
import { validateAidxXml } from "./aidx-validation.mjs";
import { generateMockAodbCsv, parseAodb } from "./aodb.adapter.mjs";
import { createAidxMessage, parseAidx } from "./aidx.adapter.mjs";

export class MockFlightSource {
  constructor({ runtime, intervalMs = 1000 } = {}) {
    this.runtime = runtime;
    this.intervalMs = intervalMs;
  }

  async getSnapshot() {
    return parseAodb(generateMockAodbCsv());
  }

  async *stream({ signal } = {}) {
    const events = [
      "gate-change",
      "delay",
      "boarding",
      "gate-change",
      "departure",
      "arrival",
    ];
    let sequence = 0;
    let fallbackTime = Date.parse("2026-10-14T14:10:00Z");
    while (!signal?.aborted) {
      const flights =
        this.runtime?.store.all("flights") || (await this.getSnapshot());
      const eligible = flights.filter(
        (flight) => !["XY501", "ZQ88"].includes(flight.id),
      );
      if (!eligible.length) throw new Error("Mock AIDX requires known flights");
      const flight = eligible[sequence % eligible.length];
      const type = events[sequence % events.length];
      const timestamp = this.runtime?.engine.clock.time ?? fallbackTime;
      const gates = this.runtime?.store
        .all("gates")
        .filter(
          (gate) =>
            gate.terminal === flight.terminal && gate.id !== flight.gate,
        );
      const gate =
        type === "gate-change"
          ? (gates?.[sequence % gates.length]?.id ??
            String((Number(flight.gate) % 60) + 1))
          : flight.gate;
      const xml = createAidxMessage(
        {
          id: `M${randomUUID().replaceAll("-", "").slice(0, 31)}`,
          type,
          minutes: 5 + (sequence % 6) * 5,
          gate,
        },
        flight,
        timestamp,
      );
      await validateAidxXml(xml);
      yield { ...parseAidx(xml), xml };
      sequence++;
      fallbackTime += this.intervalMs;
      await delay(this.intervalMs, undefined, { signal });
    }
  }
}
export class VendorFlightSource {
  constructor(options = {}) {
    this.snapshotUrl = options.snapshotUrl || process.env.VENDOR_SNAPSHOT_URL;
    this.eventsUrl = options.eventsUrl || process.env.VENDOR_EVENTS_URL;
    this.token = options.token || process.env.VENDOR_API_TOKEN;
    this.intervalMs = options.intervalMs || 1000;
    this.fetchImplementation = options.fetchImplementation;
  }
  async getSnapshot({ signal } = {}) {
    const payload = await requestText(this.snapshotUrl, {
      token: this.token,
      signal,
      fetchImplementation: this.fetchImplementation,
    });
    if (payload.trim().startsWith("[")) {
      const rows = JSON.parse(payload);
      if (!rows.length) return [];
      const columns = Object.keys(rows[0]);
      const csv = [
        columns,
        ...rows.map((row) => columns.map((key) => row[key] ?? "")),
      ]
        .map((row) =>
          row
            .map((value) => '"' + String(value).replaceAll('"', '""') + '"')
            .join(","),
        )
        .join("\n");
      return parseAodb(csv);
    }
    return parseAodb(payload);
  }
  async *stream({ signal } = {}) {
    if (!this.eventsUrl) return;
    while (!signal?.aborted) {
      const payload = await requestText(this.eventsUrl, {
        token: this.token,
        signal,
        fetchImplementation: this.fetchImplementation,
      });
      const messages = payload.trim().startsWith("[")
        ? JSON.parse(payload)
        : [payload];
      for (const message of messages) {
        const xml = typeof message === "string" ? message : message.xml;
        await validateAidxXml(xml);
        yield { ...parseAidx(xml), xml };
      }
      await delay(this.intervalMs, undefined, { signal });
    }
  }
}
