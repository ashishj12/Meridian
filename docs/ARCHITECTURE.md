# Architecture

Meridian has a React client, a Node API and a local SQLite database. The API owns simulation time, decisions and persisted state; browsers display that shared state rather than simulating it themselves.

```mermaid
flowchart TB
  subgraph Web["Presentation layer"]
    Browser["React workspaces<br/>Admin · Retailer · Media · Airline · Passenger"]
  end
  subgraph API["HTTP / application layer"]
    Routes["Express routes"]
    Controllers["Controllers + Zod validation"]
    Services["Application services"]
  end
  subgraph Domain["Decision pipeline"]
    Profile["Profile"]
    Filter["Filter eligible campaigns"]
    Score["Score audience match"]
    Rules["Apply business rules"]
    Validate["Independently validate evidence and score"]
    Choose["Choose, persist and log"]
    Learn["Learn from scans and redemptions"]
    Profile --> Filter --> Score --> Rules --> Validate --> Choose --> Learn
  end
  subgraph Adapters["Adapter boundary"]
    AODB["AODB source"]
    AIDX["AIDX source"]
    ACRIS["ACRIS source"]
    Creative["Creative provider"]
  end
  Repo["Entity repository"] --> SQLite[("SQLite")]
  Browser -->|"HTTP / JSON"| Routes --> Controllers --> Services --> Profile
  Services --> Repo
  AODB -->|"canonical flights"| Services
  AIDX -->|"validated events"| Services
  ACRIS -->|"canonical queues"| Services
  Creative -->|"reviewable creative"| Services
  Choose --> Repo
  Learn --> Repo
  Services --> Publisher["SSE event publisher"]
  Publisher -->|"event: update · sequence · simulation time"| Browser
```

## Where things live

- `apps/api/src/app.mjs` wires dependencies and HTTP middleware. `server.mjs` checks runtime configuration, starts the listener and handles shutdown.
- Routes and controllers translate HTTP requests into service calls. Services implement application behavior; repositories handle database access.
- Feed-specific parsing and mapping live in `adapters/`. Shared feed contracts are in `packages/shared-types/`.
- The React app groups pages and components under `apps/web/src/features/`. Shared state, navigation and layout live under `app/`.
- SQLite migrations are in `migrations/`; deterministic demo data is created by the database seed code.

## What happens when a flight is delayed

1. The API validates the delay command and passes it to the simulation service.
2. A coordinated write updates the flight, its gate assignment and the event record.
3. The service recalculates affected audiences and requests new screen decisions.
4. The decision service profiles the nearby audience, filters candidates, scores audience fit, applies business rules, validates the result against trusted evidence, then chooses and logs a campaign. Invalid evidence uses the safe rule-based choice.
5. The API publishes an event. Connected clients refresh their view from the shared state.
6. QR scans, claims and redemptions are stored as separate events; redemptions affect reporting and later decisions.

## Live update flow

The API owns the shared simulation clock and publishes state changes as Server-Sent Events at `/api/events`. Each event carries its sequence and simulation time. The browser keeps one EventSource connection, receives `update` events and refreshes the relevant shared state; a reconnect can therefore catch up from the server-owned state rather than running a second clock in the browser. The stream is one-way (server to client); commands such as delay injection remain ordinary validated HTTP requests.

## State and process limits

SQLite stores canonical records, while raw feed values remain available for traceability. Writes use transactions; nested writes use savepoints. Playlist records point to decisions so evidence is stored once.

The clock is shared across the application. One process holds a renewable database lease to advance it. Other processes on the same host can use the same local SQLite file and synchronize through database version checks. This is not a multi-host setup, and SQLite files should not be placed on network filesystems. The default Compose setup runs one process.

Simulation can run at 1×, 10× or 60× speed. The clock evaluates in 15-second simulated intervals. Reset and time jumps affect every connected user. Old decisions are retained only up to a fixed limit.

## Demo estimates and integrations

Flights, passenger profiles, queue readings and revenue are synthetic. Forecasts and yield figures are planning estimates, not operational data or guaranteed revenue. Profiles are aggregate; the app does not identify individual passengers or infer religion.

The built-in feed and creative providers work offline. Optional HTTP providers use bounded requests, timeouts and validation; see the [adapter guide](ADAPTER_GUIDE.md). Local schema validation does not amount to vendor certification or proof of compatibility with every airport.
