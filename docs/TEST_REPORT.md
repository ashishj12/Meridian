# Verification report — 24 October 2026

## Results

| Check | Result |
| --- | --- |
| `npm test` | 23 backend/domain/HTTP tests pass |
| `npm run typecheck` and `npm run build` | Pass |
| `npm run lint` | JavaScript syntax and Prettier checks pass |
| Browser regression | 17 Playwright workflows pass against the Docker deployment |
| Docker | Clean multi-stage build, non-root runtime, API/static/SSE smoke and named-volume persistence verified |
| File-backed performance | 180 screens / 900 flights; 40 evaluated slots across ten 60× ticks; persistence verified |
| Two-process concurrency | One local SQLite file; duplicate event suppression and competing single-use claims pass |

The browser suite checks responsive layouts, live cross-role delay changes, campaign creation/approval, booking conflicts, creative generation, Hindi explanatory text, full heatmap rendering, calendar controls, passenger time/reset/events, fullscreen/portrait ratio, decoded QR links and mobile claim/redemption. Screenshots/traces are generated test outputs under ignored directories, not maintained source documentation.

Schema checks exercise generated AIDX against the official 21.3 XSD, reject schema-invalid XML and unsafe declarations, and reject invalid occupancy through the published ACRIS queue schema. HTTP provider tests use an actual local test server. Vendor snapshot tests check canonical assignments and rollback of invalid batches. No external vendor credentials are used.

## Measured local performance

The file-backed benchmark measured a **20.4 ms** domain delay update, **350.8 ms mean / 516.6 ms maximum** 60× tick, 7,160 delivered plays and bounded retention of 900 decisions / 941 activity rows. The Docker browser run measured a **176 ms** visible delay cascade and **244 ms** pause interaction at 60×. A post-restart HTTP smoke measured **40.9 ms** for delay processing. Measurements are local observations, not hardware-independent service guarantees.

The container smoke verified 900 AODB snapshot rows with all 33 fields, live SSE, the worked-example 0.86 winning score, QR claim/redemption and 24 reporting units of simulated revenue. The isolated QA deployment uses port 3004; its QR base was explicitly set to that origin. A persisted fill-rate setting survived a container restart, then the demo was reset.

## Remaining acceptance boundaries

No physical phone scan, public HTTPS hosting/review URL, real airport connection, provider account acceptance or third-party certification is claimed. Browser mobile emulation and QR decoding are automated coverage. Same-host shared SQLite testing is not a multi-host deployment test.
