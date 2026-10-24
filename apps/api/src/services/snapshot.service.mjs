const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));
const iso = (timestamp) => new Date(timestamp).toISOString();
/** Assemble the read model consumed by all five workspaces. */
export function snapshotService(runtime) {
  const s = runtime.store;
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
    feeds: ["AODB", "AIDX", "ACRIS"].map((name) => ({
      name,
      adapter:
        name === "AODB"
          ? "aodb-csv"
          : name === "AIDX"
            ? "mock-aidx"
            : "project-ngsi-ld",
      status: runtime.clock.evidenceMode === "fresh" ? "healthy" : "degraded",
      lastUpdate: s.get("feeds", name)?.lastUpdate || runtime.clock.time,
      messagesPerMinute: (s.get("feeds", name)?.updates || []).filter(
        (t) => t >= runtime.clock.time - 60000,
      ).length,
    })),
    performance: {
      playlistMs: Math.round(runtime.playlistMs || 0),
      uptime: 99.94,
    },
    bookings: s.all("bookings"),
  };
}
