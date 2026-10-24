# Reproducible data

`apps/api/src/database/seed.mjs` uses deterministic arithmetic sequences and fixed fixture dates. No network randomness controls flights, audiences or campaign ranking. Secure token/record IDs use cryptographic randomness; IDs do not change the worked-example score.

| Entity | Seeded quantity |
| --- | --- |
| Flight movements | 900 (320 supplied + 578 generated + two worked-example flights) |
| Physical screens | 180, eighteen in each of ten zones |
| Outlets | 40 |
| Airlines | 10 |
| Campaigns | 25, plus event-created goodwill campaigns |
| Historical activity | 750 rows, 25 campaigns × 30 days |
| Gates | 60, six in each zone |
| Terminals | T1 domestic, T2 international |
| Queue measurements | Ten project-created NGSI-LD fixture observations |

Gate/zone/terminal relationships are validated in tests. Aircraft types and gate assignments are canonical persisted records. The source's raw gate/carrier values remain in provenance when the playground maps them into its ten-carrier/sixty-gate graph. Fictional businesses include Aurelia Duty Free, Juniper Coffee, Little Orbit Toys, Altitude Lounge, Saffron Table, Northline Books, Luma Beauty and Wayfarer Goods. DXB is retained because the official worked example explicitly requires it; no airline or retail brand marks are used.

Domestic morning schedules skew toward business; evening departures raise holiday/family shares. International profiles use different purpose/cabin/segment priors. Each flight contains age, party, nationality, language, frequent-flyer and premium-tier aggregates. The two worked-example flights deliberately retain the specified profile for regression reproducibility.

The simulation starts paused at 14:10 UTC. Current-day metrics begin at zero so only actual simulated deliveries and user interactions increase them. Thirty-day comparison history is explicitly marked `historical` and excluded from current-day metrics. Screens have seeded synthetic online/degraded/offline states and latency telemetry; API and playlist timing are measured from the running app.

Reset restores the seed and clears subsequent campaigns, reservations, codes and events in this synthetic workspace. Restart without reset preserves them. Run `npm run seed` only with the configured local API stopped; a Docker volume is independent of the host's `data/` directory.

Synthetic queue fixtures now validate against the vendored published ACRIS QueueMeasurement schema after NGSI-LD unwrapping. See ADAPTER_GUIDE.md and fixtures/standards/SOURCES.md for scope and provenance.
