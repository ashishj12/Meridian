const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));
const iso = (timestamp) => new Date(timestamp).toISOString();
/** Assemble the read model consumed by all five workspaces. */
export function snapshotService(runtime) {
  const s = runtime.store;
  const wallNow = Date.now();
  const screens = s.all("screens");
  const flights = s.all("flights");
  return {
    clock: runtime.clock,
    config: s.get("config", "rules"),
    zones: s.all("zones"),
    screens,
    outlets: s.all("outlets"),
    airlines: s.all("airlines"),
    campaigns: s.all("campaigns"),
    calendarEvents: s.all("calendarEvents"),
    incidents: s.all("incidents"),
    partners: s.all("partners"),
    presence: runtime.presences,
    metrics: runtime.metrics(),
    flights: flights
      .sort(
        (a, b) =>
          Number(["XY501", "ZQ88"].includes(b.id)) -
            Number(["XY501", "ZQ88"].includes(a.id)) ||
          Math.abs(Date.parse(a.estimated) - runtime.clock.time) -
            Math.abs(Date.parse(b.estimated) - runtime.clock.time),
      )
      .slice(0, 80),
    counts: {
      flights: flights.length,
      screens: screens.length,
      outlets: 40,
      airlines: 10,
    },
    decision: s.get("playlists", "S124")?.decision,
    decisions: s.all("decisions").slice(-20),
    feeds: ["AODB", "AIDX", "ACRIS"].map((name) => {
      const feed = s.get("feeds", name);
      const lastUpdate = feed?.lastUpdate ?? null;
      const age = lastUpdate === null ? Infinity : wallNow - lastUpdate;
      return {
        name,
        adapter:
          name === "AODB"
            ? process.env.FLIGHT_SOURCE === "vendor-api"
              ? "vendor-api"
              : "mock-aodb-csv"
            : name === "AIDX"
              ? process.env.FLIGHT_SOURCE === "vendor-api"
                ? "vendor-aidx"
                : "mock-aidx"
              : "mock-acris-ngsi-ld",
        status: age < 60000 ? "healthy" : age < 180000 ? "degraded" : "offline",
        lastUpdate,
        lastMessageAt: lastUpdate,
        messagesPerMinute: (feed?.updates || []).filter(
          (timestamp) => timestamp >= wallNow - 60000,
        ).length,
      };
    }),
    performance: {
      playlistMs: Math.round(runtime.playlistMs || 0),
    },
    bookings: s.all("bookings"),
  };
}
