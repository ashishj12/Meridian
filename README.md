# Meridian

Meridian is a local demo of airport retail and digital-screen workflows. It uses
synthetic airport data to show how a flight delay can change an estimated
audience, influence what a screen displays, and lead to an offer being claimed
and redeemed.

This is a demonstration, not a connection to a real airport or an airport
operations system.

## Run Meridian on your computer

You need **Node.js 24.x** and npm. The project uses Node's built-in SQLite
support, so use Node 24 rather than an older version.

Open a terminal in the project folder and run:

```sh
npm install
npm run dev
```

When the servers have started, open **http://localhost:5173**. The web app and
API run together: Vite serves the pages on port `5173` and sends API requests
to the API on port `3001`. You can check that the API is responding at
http://localhost:3001/api/health.

To stop both servers, press **Ctrl+C** in the terminal.

You do not need Docker, a `.env` file, an account, or external API credentials
for the default demo. On first start, Meridian creates its SQLite database at
`data/meridian.sqlite` and loads demo data. Changes you make are saved there and
are still present the next time you start the app.

## What you can explore

All five workspaces share the same demo and database; they are different views,
not separate accounts.

| Open this page | Use it to                                                            |
| -------------- | -------------------------------------------------------------------- |
| `/admin`       | View flights and screens, record delays, and control the simulation. |
| `/retailer`    | Create campaigns and review campaign activity and redemptions.       |
| `/media`       | Review campaigns and manage advertising screens and slots.           |
| `/airline`     | View flights and manage partner offers and passenger messages.       |
| `/passenger`   | View screen content and follow an offer to claim or redeem it.       |

For a quick walkthrough:

1. Open `/admin`, then open `/passenger` in another tab.
2. In the passenger view, select screen `S124`.
3. In Admin, add a 45-minute delay to flight `XY501`.
4. Look at the updated screen decision and offer. Then follow the offer in the
   passenger view and review the activity in `/retailer`.

The audience, flight, and revenue figures in this walkthrough are generated
for the demo. They are not real airport measurements.

## Run a production build locally

To build the web app and serve it with the API on port `3001`:

```sh
npm run build
npm start
```

Then open **http://localhost:3001**. If `dist/index.html` does not exist,
`npm start` builds the web app first. `npm run preview` does the same thing.

## Use Docker instead

If you have Docker Desktop installed, you can run the containerized app from the
project folder:

```sh
docker compose up --build
```

Open **http://localhost:3001**. Docker Compose keeps its database in a named
volume. Stop the app with `docker compose down`; this keeps the database.
`docker compose down -v` also deletes the volume and its data, so only use it
when you intend to remove that database.

## Data and settings

The local database is `data/meridian.sqlite`. Normal starts reuse it, including
the changes made in the workspaces. The Reset control in Admin restores the
demo data. The `npm run seed` command also replaces the database contents; stop
the app first, and use either reset only if you are happy to lose your changes.

By default, flight data and creative generation work offline. You only need
environment variables if you are changing the database location, setting a
public URL for QR links, or connecting an external provider. See
[.env.example](.env.example) for the available settings, but do not copy it
unchanged: its sample `PUBLIC_BASE_URL` points to a hosted site. Leave that
setting out for a normal local run, or replace it with an address reachable
from the device scanning the QR code. Keep real credentials out of source
control.

## Useful commands

Run these from the project folder:

| Command             | What it does                                |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Starts the API and web app for development. |
| `npm run build`     | Checks TypeScript and builds the web app.   |
| `npm start`         | Serves the built web app and API locally.   |
| `npm test`          | Runs the API, domain, and production tests. |
| `npm run typecheck` | Checks TypeScript without building.         |
| `npm run lint`      | Checks JavaScript syntax and formatting.    |
| `npm run test:e2e`  | Runs the browser tests with Playwright.     |

The end-to-end tests change the server and database they run against. Use a
disposable local database, not data you want to keep. If Playwright's browser
isn't installed yet, install Chromium with:

```sh
npx playwright install chromium
```

## Project layout

- `apps/api/` contains the API, simulation, database access, and feed adapters.
- `apps/web/` contains the React app and its five workspaces.
- `packages/shared-types/` contains types shared by the app and adapters.
- `migrations/` contains ordered SQLite schema updates.
- `fixtures/` contains synthetic feed examples and reference schemas.
- `tests/` contains API, domain, production, and browser tests.
- `docs/ARCHITECTURE.md` explains how the parts fit together.

## A note about the demo

Flights, audience estimates, queue readings, forecasts, and revenue are
synthetic. Meridian does not provide airport operations, authentication,
payment processing, or individual passenger tracking. Treat the figures as
examples, not operational measurements or revenue guarantees.
