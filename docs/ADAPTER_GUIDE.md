# Adapter guide

Meridian keeps vendor formats outside the application domain. An adapter parses and validates a vendor payload, maps it to the canonical model, and preserves its origin as provenance. Services and screens consume canonical records, never vendor-specific JSON.

## Adapter contracts

The contracts are intentionally small and implemented by the adapters in `apps/api/src/adapters/`:

| Contract           | Required operations                                   | Canonical output                                |
| ------------------ | ----------------------------------------------------- | ----------------------------------------------- |
| `FlightSource`     | `getSnapshot({ signal })`; async `stream({ signal })` | Snapshot flights and normalized flight events   |
| `AcrisSource`      | `getZones()`; async `streamMeasurements()`            | Zones and queue measurements                    |
| `CreativeProvider` | `generate(brief)`                                     | A creative payload suitable for campaign review |
| `AiScorer`         | `rank({ presence, candidates, now })`                 | Ranked campaign IDs, scores, evidence IDs and rationale |

`getSnapshot()` maps to canonical flights, including stable `id`, flight number, direction, route, schedule, gate, status, passenger estimate and delay. Stream events are parsed to canonical AIDX notification data and ingested by `feed-ingestion.service.mjs`, which resolves the flight against the trusted snapshot before applying it. ACRIS entities preserve their source URN and raw payload under provenance. Creative providers return the same creative shape irrespective of whether the source is an offline template or a vendor API.

These are structural JavaScript interfaces: conform by implementing the operations and return shapes. Existing implementations are `MockFlightSource` and `VendorFlightSource` in `flight-source.adapters.mjs`, `MockZoneSource` in `acris.adapter.mjs`, and `OfflineCreativeProvider` / `VendorCreativeProvider` in `creative-providers.mjs`.

## Configuration

- `FLIGHT_SOURCE=mock-aidx` is the default, offline mode. `FLIGHT_SOURCE=vendor-api` enables the vendor snapshot and event poller. It requires `VENDOR_SNAPSHOT_URL`; `VENDOR_EVENTS_URL` supplies events. `VENDOR_API_TOKEN` is optional.
- `AI_PROVIDER=offline-template` is the default creative generator. `AI_PROVIDER=vendor-api` calls `AI_ENDPOINT` and optionally sends `AI_API_KEY`.
- `AI_SCORER=offline-heuristic` is the default, deterministic scorer with no network dependency. `AI_SCORER=llm` calls `AI_SCORER_ENDPOINT` and optionally sends `AI_SCORER_API_KEY`. The endpoint receives the crowd profile and eligible candidates; it must return a ranking, rationale and `generatedAt` timestamp.
- Keep endpoint secrets out of source control. Configuration is validated during server startup in `config/environment.mjs`.

`AI_PROVIDER` selects creative generation; `AI_SCORER` is a separate decision-ranking boundary. Neither provider can approve creative or bypass deterministic campaign eligibility, trusted evidence, timestamp freshness or score-reproducibility checks. Rejected rankings fall back to rules and their reasons are recorded on the decision.

## Canonical entities

- **Flight:** stable internal ID, airline and flight number, arrival/departure direction, origin/destination, terminal/gate, scheduled and estimated times, aircraft/passenger counts, status and delay. `source`/`provenance` holds adapter name, vendor reference, timestamp and raw payload.
- **Zone, gate and screen:** Meridian IDs and relationships (`zoneId`, terminal, gate and `nearestGates`) used by the audience and placement engines. Map vendor IDs explicitly; do not use names as foreign keys.
- **Campaign:** outlet, eligible zones/screens/gates, schedule, audience weights, budget, caps, creative approval and trigger rules.
- **Playlist and decision:** a screen's chosen campaign and a traceable decision containing score, evidence, rationale and timestamp.
- **Queue measurement:** ACRIS measurement identity, zone relationship, count and observation time. Keep the original ACRIS entity in provenance.
- **Scoring evidence:** decisions persist per-campaign score inputs and weights. The validator recomputes the score from those stored inputs instead of trusting a provider's claimed score.

The JSON entity repository is the current persistence boundary; adapters should provide canonical relationships and raw provenance, not reach into that repository directly.

## Adding an adapter

1. Implement the relevant operations in a file under `apps/api/src/adapters/`; accept an injectable `fetchImplementation` for deterministic tests.
2. Validate the external shape before mapping. Reuse the bundled AIDX/ACRIS validators when applicable. Reject malformed or contradictory batches; do not silently omit a bad record.
3. Map vendor identifiers through explicit configuration/reference data and return the canonical shape above. Preserve source ID, observation timestamp and raw record for traceability.
4. Wire the implementation at the existing source-selection/composition boundary. Keep services dependent on the contract, not on the vendor SDK.
5. Add fixture-driven tests for valid, malformed, unknown-ID and stale inputs. Run `npm run build && npm test`.

For a new `AiScorer`, implement `rank({ presence, candidates, now })` and return `{ ranking: [{ campaignId, score, evidenceIds }], evidenceIds, rationale, generatedAt }`. The scorer may rank only eligible candidates; the deterministic decision gate still validates every ID, timestamp and reproducible score before a playlist is published.

## Worked example: adding a flight vendor

The example below is the shape of a new vendor implementation. The vendor-specific HTTP request and `mapVendorFlight` are deliberately isolated; the service receives the same canonical records as the built-in adapter.

```js
import { requestText } from "./http-client.mjs";
import { parseAidx } from "./aidx.adapter.mjs";
import { validateAidxXml } from "./aidx-validation.mjs";

export class NorthstarFlightSource {
  constructor({ snapshotUrl, eventsUrl, token, fetchImplementation }) {
    this.snapshotUrl = snapshotUrl;
    this.eventsUrl = eventsUrl;
    this.token = token;
    this.fetchImplementation = fetchImplementation;
  }

  async getSnapshot({ signal } = {}) {
    const payload = await requestText(this.snapshotUrl, {
      signal,
      token: this.token,
      fetchImplementation: this.fetchImplementation,
    });
    const rows = JSON.parse(payload);
    return rows.map(mapVendorFlight); // Map vendor IDs and fields to canonical Flight records.
  }

  async *stream({ signal } = {}) {
    while (!signal?.aborted) {
      const xml = await requestText(this.eventsUrl, {
        signal,
        token: this.token,
        fetchImplementation: this.fetchImplementation,
      });
      await validateAidxXml(xml);
      const event = parseAidx(xml);
      yield { ...event, xml };
    }
  }
}
```

Register the source where `startVendorIngestion()` is composed (or inject it there in a test), add validated URL/token configuration in `config/environment.mjs`, and select it with `FLIGHT_SOURCE=vendor-api`. The ingestion service validates AIDX, resolves each event to the canonical snapshot and applies it transactionally. An adapter must not bypass that check or invent a canonical flight when an upstream ID is unknown.

For an ACRIS integration, implement `getZones()` and `streamMeasurements()`, validate each NGSI-LD entity with `validateAcrisEntity`, and map relationship URNs to Meridian zone IDs. A creative provider implements `generate(brief)` and returns the same shape as the offline provider so the campaign review UI does not depend on the vendor.
