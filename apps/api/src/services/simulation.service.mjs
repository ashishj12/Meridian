import { randomUUID } from "node:crypto";
import { seed } from "../database/seed.mjs";
import { createAidxMessage, parseAidx } from "../adapters/airport-sources.mjs";

const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));
const iso = (timestamp) => new Date(timestamp).toISOString();
/** Own deterministic clock transitions and normalized airport events. */
export function recordFeedService(runtime, name, received = true) {
  const prior = runtime.store.get("feeds", name) || {
    id: name,
    updates: [],
    lastUpdate: null,
  };
  const updates = prior.updates.filter(
    (t) => t >= runtime.clock.time - 60000 && t <= runtime.clock.time,
  );
  if (received) updates.push(runtime.clock.time);
  runtime.store.put("feeds", {
    id: name,
    updates: updates.slice(-100),
    lastUpdate: received ? runtime.clock.time : prior.lastUpdate,
  });
}
export function emitService(runtime, type, detail = {}) {
  if (type !== "simulation.time") {
    runtime.forecastCache?.clear();
    runtime.scheduleCache?.clear();
    runtime.yieldCache = null;
  }
  runtime.clock.sequence++;
  runtime.store.put("simulation", runtime.clock);
  for (const fn of runtime.listeners)
    fn({
      type,
      sequence: runtime.clock.sequence,
      time: runtime.clock.time,
      ...detail,
    });
}
export function resetService(runtime) {
  const sequence = runtime.clock.sequence;
  seed(runtime.store);
  runtime.clock = runtime.store.get("simulation", "clock");
  runtime.clock.sequence = sequence;
  for (const name of ["AODB", "AIDX", "ACRIS"])
    runtime.recordFeed(name, name !== "AIDX");
  runtime.evaluate(false);
  runtime.emit("simulation.reset");
}
export function controlService(runtime, input) {
  if (input.action === "reset") {
    runtime.reset();
    return;
  }
  if (input.action === "play") runtime.clock.playing = true;
  if (input.action === "pause") runtime.clock.playing = false;
  if (input.speed) runtime.clock.speed = input.speed;
  if (input.time) {
    runtime.clock.time = Date.parse(input.time);
    runtime.clock.lastSlot = runtime.clock.time;
    runtime.refreshMockSources(true);
    runtime.updateScheduledFlights();
    runtime.evaluate(false);
  }
  runtime.emit("simulation.time");
}
export function tickService(runtime, seconds = 1) {
  if (!runtime.clock.playing) return;
  const targetTime = runtime.clock.time + seconds * 1000 * runtime.clock.speed;
  while (targetTime - runtime.clock.lastSlot >= 15000) {
    runtime.clock.time = runtime.clock.lastSlot + 15000;
    runtime.clock.lastSlot = runtime.clock.time;
    runtime.updateScheduledFlights();
    if (runtime.clock.evidenceMode === "fresh") runtime.refreshMockSources();
    runtime.evaluate(true);
  }
  runtime.clock.time = targetTime;
  for (const s of runtime.store.all("screens"))
    if (
      s.status === "offline" &&
      runtime.clock.time - s.offlineSince > 300000 &&
      !runtime.store
        .all("incidents")
        .some((i) => i.screenId === s.id && i.status !== "resolved")
    )
      runtime.store.put("incidents", {
        id: randomUUID(),
        title: `Screen ${s.id} offline for more than five minutes`,
        screenId: s.id,
        severity: "high",
        owner: "Unassigned",
        status: "open",
        timestamp: runtime.clock.time,
      });
  runtime.emit("simulation.time");
}
export function refreshMockSourcesService(runtime, rewind = false) {
  runtime.store.transaction(() => {
    if (rewind)
      for (const f of runtime.store.all("flights"))
        runtime.store.put("flights", { ...f, updatedAt: runtime.clock.time });
    for (const q of runtime.store.all("queues"))
      runtime.store.put("queues", { ...q, updatedAt: runtime.clock.time });
    runtime.recordFeed("AODB");
    runtime.recordFeed("ACRIS");
  });
}
export function updateScheduledFlightsService(runtime) {
  runtime.store.transaction(() => {
    for (const f of runtime.store.all("flights")) {
      const until = Date.parse(f.estimated) - runtime.clock.time;
      let status = f.status;
      if (!["CNL", "Cancelled"].includes(status)) {
        if (until <= 0) status = f.direction === "A" ? "ARR" : "Departed";
        else if (until < 20 * 60000 && f.direction === "D") status = "Boarding";
        else status = f.delay > 0 ? "Delayed" : "Scheduled";
      }
      if (status !== f.status) {
        f.status = status;
        runtime.store.put("flights", f);
      }
    }
  });
}
export function eventService(runtime, input) {
  const id = input.id || randomUUID();
  if (runtime.store.seen(id)) return { duplicate: true, id };
  const affectedZones = new Set();
  runtime.store.transaction(() => {
    if (input.type === "screen-offline") {
      const s = runtime.store.get("screens", input.screenId || "S124");
      if (!s) throw new Error("Unknown screen");
      affectedZones.add(s.zoneId);
      s.status = "offline";
      s.offlineSince = runtime.clock.time;
      runtime.store.put("screens", s);
    } else if (input.type === "evidence") {
      runtime.clock.evidenceMode = input.mode;
    } else if (input.type === "feed-lag" || input.type === "creative-failure") {
      runtime.store.put("incidents", {
        id: randomUUID(),
        title:
          input.type === "feed-lag"
            ? "AIDX feed lag detected"
            : "Creative rendering failed",
        severity: "high",
        owner: "Unassigned",
        status: "open",
        timestamp: runtime.clock.time,
      });
      if (input.type === "creative-failure") {
        const c = runtime.store.get("campaigns", input.campaignId || "C1");
        c.creativeApproved = false;
        runtime.store.put("campaigns", c);
      } else runtime.clock.evidenceMode = "stale";
    } else {
      const f = runtime.store.get("flights", input.flightId || "XY501");
      if (!f) throw new Error("Unknown flight");
      affectedZones.add(f.zoneId);
      if (input.type === "delay") {
        f.delay = input.minutes ?? 45;
        f.estimated = iso(Date.parse(f.scheduled) + f.delay * 60000);
        f.status = "Delayed";
      }
      if (input.type === "gate-change") {
        const gate = runtime.store.get("gates", input.gate || "48");
        if (!gate) throw new Error("Unknown gate");
        f.gate = gate.id;
        f.zoneId = gate.zoneId;
        f.terminal = gate.terminal;
        runtime.store.put("gateAssignments", {
          id: f.id,
          flightId: f.id,
          gateId: f.gate,
          zoneId: f.zoneId,
          terminal: f.terminal,
          assignedAt: runtime.clock.time,
          sourceEvent: id,
        });
        affectedZones.add(f.zoneId);
      }
      if (input.type === "boarding") f.status = "Boarding";
      if (input.type === "departure") f.status = "Departed";
      if (input.type === "cancellation") f.status = "Cancelled";
      if (input.type === "arrival") f.status = "ARR";
      const xml =
        input.sourceMessage?.xml ||
        createAidxMessage(
          { ...input, id, minutes: input.minutes ?? 45 },
          f,
          runtime.clock.time,
        );
      const normalized = parseAidx(xml);
      runtime.recordFeed("AIDX");
      runtime.store.put("feedEvents", {
        id,
        type: input.type,
        flightId: f.id,
        zoneId: f.zoneId,
        timestamp: runtime.clock.time,
        xml,
        normalized,
      });
      for (const old of runtime.store.all("feedEvents").slice(0, -100))
        runtime.store.delete("feedEvents", old.id);
      f.updatedAt = runtime.clock.time;
      f.source = {
        adapter: "mock-aidx",
        reference: id,
        timestamp: normalized.source.timestamp,
      };
      runtime.store.put("flights", f);
      const airline = runtime.store.get("airlines", f.airlineId);
      if (
        f.delay >= (airline?.goodwillThreshold || 30) &&
        !runtime.store.get("campaigns", `G-${f.id}`)
      ) {
        const base = runtime.store.get("campaigns", "C4");
        runtime.store.put("campaigns", {
          ...base,
          id: `G-${f.id}`,
          name: `${f.number} · a warmer wait`,
          outletId: airline?.partnerId || "O2",
          airlineId: f.airlineId,
          headline: "A warmer wait, on us.",
          headlineHi: "इंतज़ार में एक छोटी सी खुशी।",
          offer: "Complimentary meal voucher · co-funded 50/50",
          offerHi: "मुफ़्त भोजन वाउचर · दोनों साझेदारों का आधा योगदान",
          zoneIds: [f.zoneId],
          gateIds: [f.gate],
          screenIds: runtime.store
            .all("screens")
            .filter((s) => s.gate === f.gate && s.status !== "offline")
            .slice(-1)
            .map((s) => s.id),
          spend: 0,
          delayTrigger: 30,
          category: "goodwill",
          priority: 0,
          performance: 0,
          weights: { business: 0.1 },
          affinity: 0.1,
        });
      }
    }
    runtime.store.mark(id);
  });
  runtime.evaluate(true, affectedZones.size ? [...affectedZones] : undefined);
  runtime.emit("flight.changed", { eventId: id, event: input });
  return { id, time: runtime.clock.time };
}
