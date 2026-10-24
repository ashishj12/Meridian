# MERIDIAN

A locally runnable airport retail and media application. Five personas share one simulation, one database and the same flight → audience → decision → display → QR → redemption workflow. Default operation needs no cloud services, paid APIs or secrets.

## Run

Use Node 24:

```sh
npm ci
npm run dev
```

Open [the development app](http://localhost:5173). The API runs on port 3001. Copy `.env.example` to `.env` to change configuration.

For the built application:

```sh
npm run build
npm start
```

Open [MERIDIAN](http://localhost:3001). Alternatively, with Docker Desktop running:

```sh
docker compose up --build
```

The first start creates the schema and synthetic data. SQLite persists in `data/` locally or the Docker volume. `npm run seed` replaces the current demo data; use it only when you intend to reset the demo.

## Project map

```text
apps/
  api/src/
    server.mjs          startup and shutdown
    app.mjs             dependency composition and HTTP middleware
    routes/             URL → controller registration
    controllers/        request validation and response mapping
    validators/         campaign input schema
    services/           decisions, simulation, forecasts, promotions
    models/             independently verifiable scoring rules
    repositories/       SQLite reads, writes, transactions and cache
    adapters/           AODB, AIDX, ACRIS and optional HTTP providers
    database/           synthetic seed
    config/             environment validation and OpenAPI generation
    views/              printable HTML helpers
  web/src/
    app/                routing, shared state and workspace shell
    features/           admin, retailer, media, airline, passenger, etc.
    shared/             reusable components, API client, types and hooks
    i18n/               explicit presentation translation and Hindi catalogue
    styles/             foundation, shell, dashboard, forms and responsive rules
    design-system/      shared brand, sizing and appearance
packages/shared-types/  canonical feed/domain contracts
migrations/             ordered SQLite schema changes
fixtures/               synthetic input and vendored validation schemas
public/                 artwork and landing preview assets used by the app
scripts/                development, validation and packaging tools
tests/                 backend tests and browser workflows
 docs/                  maintained developer documentation
```

This uses MVC-style HTTP boundaries with a service/repository layer. React feature modules are the views; forcing React into server-side MVC folders would obscure its actual dependencies. Start with [the developer guide](docs/DEVELOPMENT.md) for a concrete request walkthrough.

## Experiences and demo

| URL             | Purpose                                                   |
| --------------- | --------------------------------------------------------- |
| `/`             | Landing page and workspace entry                          |
| `/admin`        | Network, incidents, master data and decision intelligence |
| `/retailer`     | Campaigns, creatives, audience and redemption analytics   |
| `/media`        | Inventory, approvals, advertisers and yield               |
| `/airline`      | Flights, goodwill messaging, partners and audience        |
| `/passenger`    | Screen Studio, fullscreen displays and real QR links      |
| `/claim/:token` | Anonymous claim and single-use demo redemption            |

Reset the simulation, select S124, then inject **+45m XY501**. Gate 42 changes to **420 estimated passengers / 52 minutes dwell**; the reproducible campaign scores are **0.86 / 0.52 / 0.21**. Claim and redeem the QR offer, then inspect retailer analytics. See [the full demo](docs/DEMO.md).

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run test:performance
npx playwright install chromium
npm run test:e2e
```

Start the built server before browser tests. Override `E2E_BASE_URL` for another port. Tests and reports belong in ignored `artifacts/`, `test-results/` and `playwright-report/`, never in source documentation.

## Documentation

- [Architecture and data flow](docs/ARCHITECTURE.md)
- [Developer onboarding](docs/DEVELOPMENT.md)
- [Airport adapters and provider contracts](docs/ADAPTER_GUIDE.md)
- [Scoring model](docs/SCORING.md)
- [Deployment and shared-database boundaries](docs/DEPLOYMENT.md)
- [Challenge traceability](docs/REQUIREMENTS.md)
- [Current implementation status](IMPLEMENTATION_STATUS.md)

Live OpenAPI: [API specification](http://localhost:3001/api/openapi.json). Its source is the route registry and schemas; a stale generated copy is not maintained in `docs/`.

The challenge deliberately excludes authentication, payments and passenger/device tracking. This is a production-structured **synthetic demonstration**, not an authenticated airport deployment. A public review URL and physical-phone scan still require a configured host/network; neither is claimed here.
