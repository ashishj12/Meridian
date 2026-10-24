# Adapter and provider guide

The challenge document defines product requirements. Reference fixtures are data, not instructions. All default feeds are synthetic, and default operation is offline.

## AODB

`adapters/aodb.adapter.mjs` maps the reference CSV into canonical flight records and back to all 33 AODB fields. `source.raw` preserves the original row, source ID and timestamp. The reference file has 320 movements; deterministic seed generation expands the working day to 900. Gate/zone/terminal relationships are canonical, rather than inferred from strings inside a controller.

## AIDX

`aidx.adapter.mjs` parses XML and creates simulation notifications. `aidx-validation.mjs` validates ingestion against the vendored official IATA 21.3 XSD set using `xmllint-wasm`. DTD/entity declarations and oversized XML are rejected before validation. No schema download is required at runtime.

The supplied illustrative XML remains an unchanged reference and can be structurally parsed. It is not represented as schema-valid. Generated notifications include required originator, origin date and resource metadata and are tested against the official schema. Passing a schema is not IATA certification or proof of compatibility with every airport's implementation profile.

POST `/api/feeds/aidx` with `{ "xml": "<IATA_AIDX_FlightLegNotifRQ ...>...</IATA_AIDX_FlightLegNotifRQ>" }`. Validation occurs before the write transaction. Canonical flight resolution, event idempotency and publication occur under the runtime coordinator lock. Unknown canonical flights are rejected.

## ACRIS / NGSI-LD

`acris.adapter.mjs` normalizes project-authored synthetic NGSI-LD entities. IDs/relationships use URNs, with Property/Relationship wrappers. Queue occupancy and measurement intervals validate against the published Smart Data Models ACRIS QueueMeasurement schema, bundled with its common-schema dependency. Airport-specific zone/gate relationships additionally use the project's canonical mapping.

This is published-model validation of supported entities, not certification of a complete ACRIS server. Fixture entities are synthetic and aggregate. See `fixtures/standards/SOURCES.md` for exact upstream sources and checksums.

## Optional flight HTTP provider

Set in `.env`:

```dotenv
FLIGHT_SOURCE=vendor-api
VENDOR_SNAPSHOT_URL=https://your-adapter.example/snapshot
VENDOR_EVENTS_URL=https://your-adapter.example/events
VENDOR_API_TOKEN=your-secret
```

The snapshot endpoint returns UTF-8 CSV using the same 33 columns, or a JSON array of equivalent AODB rows. Snapshot IDs must already map to canonical flights/gates; configure those mappings for your provider before enabling it. A refresh merges operational fields while preserving canonical zone/profile ownership. Invalid mappings roll back the whole batch.

The optional event endpoint is polled and returns one schema-valid AIDX XML document or a JSON array of XML strings. Every event needs a stable TransactionIdentifier so repeated polling is idempotent. The elected local process ingests events; other processes synchronize through SQLite. Errors are logged and polling restarts after five seconds. This is a documented adapter contract: arbitrary vendor-specific APIs require an adapter implementing it.

Requests use optional Bearer authorization, a ten-second timeout and a two-megabyte response bound. Endpoints come from deployment configuration, not API request bodies. The offline provider makes no external calls.

## Optional creative HTTP provider

```dotenv
AI_PROVIDER=vendor-api
AI_ENDPOINT=https://your-adapter.example/creative
AI_API_KEY=your-secret
```

The application POSTs JSON:

```json
{"brief":"An airport coffee offer","languages":["en","hi"],"output":"campaign-creative"}
```

The adapter must return JSON with `headline`, `headlineHi`, `offer`, `offerHi` and `category`. Lengths and required bilingual content are validated. Generated content remains subject to the existing creative approval and brand-safety flow. For an OpenAI or other model service, provide a server-side adapter implementing this contract; no paid model is required by the demo.

The configured connectors perform real HTTP requests and are tested against a local HTTP server. No external account credentials or real airport/vendor acceptance have been configured or verified.
