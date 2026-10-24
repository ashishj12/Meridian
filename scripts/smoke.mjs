import fs from "node:fs";
import assert from "node:assert/strict";

fs.mkdirSync("artifacts/reports", { recursive: true });
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3001";
async function request(path, body) {
  const r = await fetch(
    base + path,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  assert.ok(r.ok, `${path}: ${r.status}`);
  return r.json();
}
const health = await request("/api/health");
const reset = () => request("/api/simulation/control", { action: "reset" });
await reset();

const ui = await fetch(base + "/admin");
assert.equal(ui.status, 200);
const state = await request("/api/state");

assert.equal(state.counts.flights, 900);
assert.equal(state.counts.screens, 180);

const raw = await request("/api/feeds/aodb/snapshot");
assert.equal(raw.length, 900);

assert.ok(raw.every((r) => Object.keys(r).length === 33));

const spec = await request("/api/openapi.json");
assert.ok(
  spec.paths["/api/campaigns"].get && spec.paths["/api/campaigns"].post,
);
fs.writeFileSync(
  "artifacts/reports/openapi.json",
  JSON.stringify(spec, null, 2) + "\n",
);
const events = await fetch(base + "/api/events");
assert.ok(events.headers.get("content-type").includes("text/event-stream"));

const reader = events.body.getReader();
const chunk = await reader.read();

assert.ok(new TextDecoder().decode(chunk.value).includes("connected"));
await reader.cancel();

const started = performance.now();
await request("/api/simulation/events", { type: "delay", minutes: 45 });

const decision = await request("/api/screens/S124/decision");
assert.equal(decision.campaignId, "C1");
assert.equal(decision.presence.count, 420);
assert.equal(decision.candidates.find((c) => c.id === "C1").score, 0.86);

const delayMs = performance.now() - started;
const token = decision.promo.id;
const offer = await request("/api/promos/" + token);
assert.ok(!offer.url.includes("localhost"));

const claim = await request("/api/promos/" + token + "/scan", { issue: true });
await request("/api/promos/" + claim.id + "/claim", {});
await request("/api/promos/" + claim.id + "/redeem", {});

const metrics = await request("/api/analytics/retailer?outletId=O1");
assert.equal(metrics.revenue, 24);
await reset();

const report = {
  testedAt: new Date().toISOString(),
  base,
  health: health.status,
  uiStatus: ui.status,
  flights: 900,
  screens: 180,
  aodbRawRows: raw.length,
  aodbFields: 33,
  sseConnected: true,
  perfumeScore: 0.86,
  claimRedeemRevenue: 24,
  qrBaseUrl: state.publicBaseUrl,
  delayHttpMs: +delayMs.toFixed(1),
  resetAfterTest: true,
  publicDeployment: false,
};
fs.writeFileSync(
  "artifacts/reports/docker-smoke.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
