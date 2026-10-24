import { requestText } from "./http-client.mjs";
import { setTimeout as delay } from "node:timers/promises";
import { validateAidxXml } from "./aidx-validation.mjs";
import fs from "node:fs";
import { parseAodb, referenceFile } from "./aodb.adapter.mjs";
import { parseAidx } from "./aidx.adapter.mjs";

export class MockFlightSource {
  async getSnapshot() {
    return parseAodb(fs.readFileSync(referenceFile, "utf8"));
  }
  async *stream() {
    yield parseAidx(
      fs.readFileSync(
        new URL(
          "../../../../fixtures/reference/AIDX_FlightLegNotifRQ_XH960_arrival_ILLUSTRATIVE.xml",
          import.meta.url,
        ),
        "utf8",
      ),
    );
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
