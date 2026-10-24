import { parseAidx } from "../adapters/aidx.adapter.mjs";
import { validateAidxXml } from "../adapters/aidx-validation.mjs";
import { VendorFlightSource } from "../adapters/flight-source.adapters.mjs";

/** Validate before locking, then resolve authoritative state inside the write transaction. */
export async function ingestAidx(xml, runtime) {
  await validateAidxXml(xml);
  const message = parseAidx(xml);
  return runtime.coordinator.execute(() => {
    const flight = runtime.store
      .all("flights")
      .find((flight) => flight.number === message.number);
    if (!flight) throw new Error("Flight not in canonical snapshot");
    const type =
      {
        ARR: "arrival",
        DEP: "departure",
        CNL: "cancellation",
        BRD: "boarding",
        DLY: "delay",
      }[message.status] || "gate-change";
    return runtime.engine.event({
      id: message.id,
      type,
      flightId: flight.id,
      minutes: Math.max(
        0,
        Math.round(
          (Date.parse(
            message.times.find((time) => time["@_TimeType"] === "EST")?.[
              "#text"
            ] || flight.estimated,
          ) -
            Date.parse(flight.scheduled)) /
            60000,
        ),
      ),
      sourceMessage: { xml, normalized: message },
      gate:
        message.gate && runtime.store.get("gates", message.gate)
          ? message.gate
          : flight.gate,
    });
  });
}

/** Reject a whole upstream batch if any flight or gate is unmapped or contradictory. */
export function applyVendorSnapshot(runtime, snapshot) {
  return runtime.coordinator.execute(() => {
    for (const flight of snapshot) {
      const existing = runtime.store.get("flights", flight.id);
      const gate = runtime.store.get("gates", flight.gate);
      if (!existing || !gate)
        throw new Error("Vendor snapshot contains unmapped flight or gate IDs");
      if (
        !Number.isFinite(flight.pax) ||
        !Number.isFinite(flight.seats) ||
        flight.pax < 0 ||
        flight.pax > flight.seats ||
        !Number.isFinite(Date.parse(flight.scheduled)) ||
        !Number.isFinite(Date.parse(flight.estimated)) ||
        !["A", "D"].includes(flight.direction)
      )
        throw new Error("Contradictory vendor flight snapshot");
      runtime.store.put("flights", {
        ...existing,
        ...flight,
        zoneId: gate.zoneId,
        terminal: gate.terminal,
        profile: existing.profile,
        updatedAt: runtime.engine.clock.time,
      });
      runtime.store.put("gateAssignments", {
        id: flight.id,
        flightId: flight.id,
        gateId: gate.id,
        zoneId: gate.zoneId,
        terminal: gate.terminal,
        assignedAt: runtime.engine.clock.time,
        sourceEvent: "vendor-snapshot",
      });
    }
    runtime.engine.recordFeed("AODB");
    runtime.engine.evaluate(false);
    runtime.engine.emit("feed.snapshot");
  });
}
/** Optional configured HTTP integration. Offline mode never starts this worker. */
export function startVendorIngestion(
  runtime,
  source = new VendorFlightSource(),
) {
  const abort = new AbortController();
  let stopped = false;
  let retry;
  const run = async () => {
    try {
      const snapshot = await source.getSnapshot({ signal: abort.signal });
      if (stopped) return;
      applyVendorSnapshot(runtime, snapshot);
      for await (const event of source.stream({ signal: abort.signal })) {
        if (runtime.store.claimClockLease(runtime.coordinator.owner))
          await ingestAidx(event.xml, runtime);
      }
    } catch (error) {
      if (!stopped) console.error("Vendor feed unavailable:", error.message);
    }
    if (!stopped) retry = setTimeout(start, 5000);
  };
  const start = () => {
    if (stopped) return;
    if (
      runtime.coordinator.execute(() =>
        runtime.store.claimClockLease(runtime.coordinator.owner),
      )
    )
      void run();
    else retry = setTimeout(start, 2500);
  };
  start();
  return () => {
    stopped = true;
    clearTimeout(retry);
    abort.abort();
  };
}
