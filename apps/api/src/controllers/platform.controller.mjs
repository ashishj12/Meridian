/** HTTP validation and response mapping for platform. Business decisions stay in services. */
export function createPlatformController(context) {
  const { store, engine, latencies, act, publicBase } = context;
  return {
    snapshot: act((req, res) => {
      const state = engine.snapshot();
      return res.json({
        ...state,
        performance: {
          ...state.performance,
          apiP95: Math.round(
            [...latencies].sort((a, b) => a - b)[
              Math.floor(latencies.length * 0.95)
            ] || 0,
          ),
        },
        publicBaseUrl: publicBase(req),
      });
    }),
    health: (req, res) =>
      res.json({
        status: "ok",
        database: "sqlite",
        source: process.env.FLIGHT_SOURCE || "mock-aidx",
        sequence: engine.clock.sequence,
      }),
    aircraftTypes: (req, res) => res.json(store.all("aircraftTypes")),
    gateAssignments: (req, res) => res.json(store.all("gateAssignments")),
    zonePresence: act((req, res) =>
      res.json(
        engine.presences[req.params.id] || engine.presence(req.params.id),
      ),
    ),
  };
}
