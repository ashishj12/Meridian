import { toAodbRow } from "../adapters/aodb.adapter.mjs";
import { ingestAidx } from "../services/feed-ingestion.service.mjs";

export function createFeedsController(context) {
  const { store, engine, act } = context;
  return {
    ingestAidx: act(async (request, response) =>
      response.json(await ingestAidx(request.body.xml, context)),
    ),
    health: (request, response) => response.json(engine.snapshot().feeds),
    aodbSnapshot: (request, response) =>
      response.json(store.all("flights").map(toAodbRow)),
  };
}
