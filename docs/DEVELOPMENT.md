# Developer guide

## First hour

1. Read the README and run `npm ci`, then `npm run dev` on Node 24.
2. Open Admin and Passenger in two tabs. Inject a delay and inspect the network requests and SSE updates.
3. Follow `apps/api/src/routes/simulation.routes.mjs` → its controller → `simulation.service.mjs` → `decision.service.mjs` → `EntityRepository`.
4. Open `apps/web/src/features/admin/pages/AdminDashboard.tsx`. Its `WorkspaceContext` is supplied by `app/App.tsx`; state comes from `shared/hooks/useLive.ts`.
5. Read `tests/domain.test.mjs` for the worked example and `tests/production.test.mjs` for validation/concurrency boundaries.

## Where a change belongs

| Change | Location |
| --- | --- |
| URL, verb or routing | `apps/api/src/routes/` |
| Validate HTTP input or shape a response | `controllers/` and `validators/` |
| Campaign eligibility or a business action | `services/` |
| Reproducible scoring/evidence invariant | `models/decision.model.mjs` |
| CSV/XML/NGSI-LD or vendor mapping | `adapters/` |
| SQL, transaction or persistence change | `repositories/` and a numbered `migrations/` file |
| A role screen or component | `apps/web/src/features/<domain>/` |
| Reusable interaction/control | `shared/components/` |
| Navigation/shared shell state | `app/` |
| Interface language | `i18n/catalogs/hi.ts` and explicit presentation calls |

## Working conventions

Use descriptive identifiers and one responsibility per module. Keep HTTP handling out of business services, and source-format parsing out of controllers. Call the coordinator for authoritative mutations; never hold a synchronous SQLite transaction open while awaiting network I/O. Validate upstream data before committing it. Add a focused invariant or workflow test when changing decisions, bookings or redemption.

Run `npm run format` before `npm run lint`. The formatter covers application code, shared contracts, scripts and tests. `npm run lint` also checks JavaScript syntax. No custom JSX compiler or hidden translation runtime is involved.

The shared `ApiRecord` type represents flexible, API-owned master data. It is intentionally not a promise of full static typing. Use explicit interfaces for new stable models and runtime validation at external boundaries.

## Files and generated output

`public/campaign-art/` and `public/product-previews/` are runtime assets used by the product and landing page. Keep them. Validation schemas under `fixtures/standards/` are dependencies of offline validation; keep them too.

Generated screenshots, reports, ZIPs, temporary migration tooling and local databases are excluded from source delivery. Browser tests recreate screenshots under `artifacts/screenshots/`; smoke/performance tools write `artifacts/reports/`. `docs/` contains maintained explanations, not capture history.

`package.json` defines scripts and exact dependency versions. `package-lock.json` locks the complete dependency tree for `npm ci`. Neither is disposable. There is no required `package-manifest.json` in this application.

## API discovery

Run the server and open `/api/openapi.json`. Routes are grouped by domain, and the specification is generated from the registered routes and validators. `npm test` uses temporary/in-memory databases and does not overwrite your running demo database. Browser tests reset the server they target, so point them at a disposable instance when preserving demo changes matters.

Passenger display composition is split between `PassengerDisplay.tsx` (studio state/controls), `components/PassengerPlayer.tsx` (physical creative/evidence) and `components/PhysicalFrame.tsx` (aspect-ratio scaling).
