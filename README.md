# Meridian

Meridian is a local demo of airport retail and digital-screen workflows. It uses synthetic airport data to show how one flight delay can ripple through the whole chain:

**delay recorded → audience estimate changes → screen content updates → passenger claims an offer → retailer sees the redemption**

> **Heads up:** This is a demonstration. It is not connected to a real airport or any airport operations system, and every number you see is generated.

**[Try the live demo →](https://meridian-2bcg.onrender.com/)**

## Contents

- [Quick start](#quick-start)
- [Explore the demo](#explore-the-demo)
- [Other ways to run it](#other-ways-to-run-it)
- [Data and configuration](#data-and-configuration)
- [Why this stack](#why-this-stack)
- [Demo script under 1 minute](#demo-script-under-1-minute)
- [Commands](#commands)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Project layout](#project-layout)
- [Limitations](#limitations)

## Quick start

**Recommended: Docker Compose.** Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and run:

```sh
docker compose up --build
```

Open **http://localhost:3001** and check **http://localhost:3001/api/health**. Compose builds and starts the app and stores its SQLite database in a named volume. Stop it with **Ctrl+C**.

**Alternative: development mode.** Use [Node.js 24.x](https://nodejs.org/) and npm (the Node built-in SQLite support and Vite 8 toolchain require this supported runtime):

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. Vite forwards API requests to port `3001`. Press **Ctrl+C** to stop both servers.

No `.env` file, account, or external credentials are needed for the default demo. On first start, Meridian creates its SQLite database at `data/meridian.sqlite` and loads the demo data. Your changes are saved there and will still be present next time you start the app.

## Explore the demo

There are five workspaces. They all share the same demo data and database, so think of them as different views of one system rather than separate accounts.

| Page         | What you can do there                                                |
| ------------ | -------------------------------------------------------------------- |
| `/admin`     | View flights and screens, record delays, and control the simulation. |
| `/retailer`  | Create campaigns and review campaign activity and redemptions.       |
| `/media`     | Review campaigns and manage advertising screens and slots.           |
| `/airline`   | View flights and manage partner offers and passenger messages.       |
| `/passenger` | View screen content and follow an offer to claim or redeem it.       |

### A five-minute walkthrough

1. Open `/admin`, then open `/passenger` in a second tab.
2. In the passenger view, select screen `S124`.
3. Back in Admin, add a 45-minute delay to flight `XY501`.
4. Watch the screen decision and offer update in the passenger view.
5. Follow the offer to claim and redeem it, then check the resulting activity in `/retailer`.

The audience, flight, and revenue figures are generated for the demo, not measured at a real airport.

The demo starts with earlier simulated activity so dashboards show non-zero
plays, scans, and revenue immediately. Inventory combines seeded bookings with
zone-specific hourly footfall forecasts, and retailer passenger flow is
calculated from upcoming departures in 15-minute intervals. Admin feed health,
API latency, uptime, and operational incidents are derived from runtime events
rather than fixed demo values.

## Demo script under 1 minute

1. Open `/admin` and inject a 45-minute delay for `XY501`.
2. Point to the updated screen decision, then open `/passenger` and claim the offer from its QR flow.
3. Open `/retailer` to show the resulting scan/redemption activity.

This is a scripted synthetic scenario, not a live airport feed.

## Other ways to run it

### Production build, locally

Build the web app and serve it together with the API on port `3001`:

```sh
npm run build
npm start
```

Then open **http://localhost:3001**. If `dist/index.html` doesn't exist yet, `npm start` builds the web app for you. `npm run preview` behaves the same way.

### Docker

| Command                  | Effect                                             |
| ------------------------ | -------------------------------------------------- |
| `docker compose down`    | Stops the app and **keeps** your database.         |
| `docker compose down -v` | Stops the app and **deletes** the volume and data. |

## Data and configuration

**Database.** The local database lives at `data/meridian.sqlite`. Normal starts reuse it, including any changes you made in the workspaces. SQLite migrations maintain typed, indexed tables with foreign keys for flights, screens, campaigns, promo codes, decisions, impressions and redemptions; the generic entity records remain available for traceability and repository compatibility.

**Resetting the demo.** Use the Reset control in Admin to restore the original demo data. Alternatively, `npm run seed` applies missing migrations and replaces the database contents in one transaction; stop the app before running it. Either way, you will lose your changes, so only reset when that's what you want.

**Environment variables.** By default, flight data and creative generation work offline, so you only need environment variables if you are:

- changing the database location,
- setting a public URL for QR links,
- choosing the creative assistant's second language (`CREATIVE_SECOND_LANGUAGE=hi|ar|fr`), or
- connecting an external provider.

See [`.env.example`](.env.example) for the available settings. For a normal local run, leave `PUBLIC_BASE_URL` unset so QR links use the laptop's LAN IP, or set it to an address that the scanning device can reach. The hosted demo sets this variable explicitly. Keep real credentials out of source control.

## Why this stack

- **Node.js** provides one JavaScript runtime for the API, scripts and tooling, with built-in SQLite support.
- **Express** keeps the HTTP boundary small and makes the adapter, validation and application-service layers easy to inspect.
- **SQLite** gives the local demo durable, transactional state without requiring a separate database service.
- **React** supports the five role-specific workspaces over the same shared state.
- **Vite** provides a fast local development server and production web build.
- **Server-Sent Events (SSE)** deliver one-way live updates from the API without polling or a separate message broker.

These choices suit a single-host proof of concept; they are not a recommendation to run a multi-host airport operations platform on one SQLite file.

API reference: run the app and open [`/api/docs`](http://localhost:3001/api/docs), or fetch the OpenAPI document at [`/api/openapi.json`](http://localhost:3001/api/openapi.json). Adapter contracts and a vendor example are in [the adapter guide](docs/ADAPTER_GUIDE.md).

## Commands

Run these from the project folder.

| Command             | What it does                                |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Starts the API and web app for development. |
| `npm run build`     | Checks TypeScript and builds the web app.   |
| `npm start`         | Serves the built web app and API locally.   |
| `npm test`          | Runs the API, domain, and production tests. |
| `npm run typecheck` | Checks TypeScript without building.         |
| `npm run lint`      | Checks JavaScript syntax and formatting.    |
| `npm run test:e2e`  | Runs the browser tests with Playwright.     |

## Testing

Unit, API, domain, and production tests run with:

```sh
npm test
```

Browser tests use Playwright and start an isolated API instance with a temporary
SQLite database and port by default. They never use the development database.
If Chromium isn't installed yet:

```sh
npx playwright install chromium
```

## Troubleshooting

**Errors about SQLite or unsupported modules on startup.** Check your Node version with `node -v`. Meridian's supported local runtime is Node 24.x; `.nvmrc` selects it for nvm users. The Vite 8 toolchain requires Node 22.12+ even though `node:sqlite` itself was introduced earlier.

**A port is already in use.** The dev setup uses `5173` and `3001`. Stop whatever else is using them, or close any earlier Meridian process still running.

**The page loads but data is missing.** Confirm the API is up at http://localhost:3001/api/health.

**The QR code doesn't work from my phone.** The phone must be able to reach the address encoded in the QR link. Set `PUBLIC_BASE_URL` to an address reachable from that device (for example, your computer's local network address).

**The demo data looks wrong after experimenting.** Use the Reset control in Admin to restore it.

## Project layout

| Path                     | Contents                                                 |
| ------------------------ | -------------------------------------------------------- |
| `apps/api/`              | The API, simulation, database access, and feed adapters. |
| `apps/web/`              | The React app and its five workspaces.                   |
| `packages/shared-types/` | Types shared by the app and adapters.                    |
| `migrations/`            | Ordered SQLite schema updates.                           |
| `fixtures/`              | Synthetic feed examples and reference schemas.           |
| `tests/`                 | API, domain, production, and browser tests.              |
| `docs/ARCHITECTURE.md`   | How the parts fit together. Start here to dig deeper.    |

## Limitations

Flights, audience estimates, queue readings, forecasts, and revenue are all synthetic. Meridian does **not** provide:

- airport operations,
- authentication,
- payment processing, or
- individual passenger tracking.

Treat every figure as an example, not an operational measurement or a revenue guarantee.

The accelerated simulation is also a proof-of-concept workload: the current
60× benchmark averaged about 10 seconds per real-time tick with 180 screens in
the latest run, so that speed can fall behind wall-clock time. The related
browser test did not reach its expected simulated time within its 10-second
window. Docker Compose was not verifiable in the development environment
because the Docker daemon was unavailable.
