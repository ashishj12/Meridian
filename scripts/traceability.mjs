import fs from "node:fs";

fs.mkdirSync("artifacts/reports", { recursive: true });
const source = fs
  .readFileSync("CHALLENGE_REQUIREMENTS.md", "utf8")
  .split(/\r?\n/);
const rows = [];
let section = "Audience and decision engine",
  priority = "Core";
for (const line of source) {
  if (line.startsWith("## ") || /^### [1-5]\. /.test(line)) {
    section = line.replace(/^#+ /, "");
    priority = "Core";
  }
  if (/^\*\*Must/.test(line)) priority = "Must";
  if (/^\*\*Should/.test(line)) priority = "Should";
  const requirement = line.startsWith("- ")
    ? line.slice(2)
    : /^\*\*(Simulation control bar|Live cause-and-effect|Split-screen demo mode|GenAI creative assistant|Smart recommendation)/.test(
          line,
        )
      ? line
      : /^\| (Stack|Architecture|Storage|Start|Playground|Mock data|Feeds|AI|UI quality|Performance|Docs) \|/.test(
            line,
          )
        ? line.replace(/^\| | \|$/g, "")
        : /^\d+\. \*\*/.test(line)
          ? line
          : null;
  if (requirement)
    rows.push({
      id: "R" + String(rows.length + 1).padStart(3, "0"),
      section,
      priority: section.includes("WOW")
        ? "Required WOW"
        : section.includes("Technical")
          ? "Technical"
          : section.includes("Deliverables")
            ? "Deliverable"
            : priority,
      requirement,
      ...mapRequirement(requirement, section),
    });
}
const additional = [
  [
    "Canonical AODB/AIDX/ACRIS contracts, all 33 AODB fields, official AIDX XSD and published ACRIS queue validation",
    "adapters/ / packages/shared-types/index.ts",
    "/api/flights; /api/feeds/aidx",
    "domain: reference CSV, XML and ACRIS tests",
  ],
  [
    "Exact worked example: 420 passengers, 52m dwell, .86/.52/.21 ranking",
    "services/decision.service.mjs / models/decision.model.mjs",
    "/api/screens/S124/decision",
    "domain: flight-delay cascade; browser delay test",
  ],
  [
    "Independent score and evidence validation; safe fallback",
    "models/decision.model.mjs / DecisionExplorer",
    "/admin; /api/decisions",
    "domain: tampered scores/records and failure modes; browser evidence lab",
  ],
  [
    "No login; persona and organization switchers",
    "App",
    "/admin; /retailer; /media; /airline; /passenger",
    "browser workflow and all-role screenshots",
  ],
  [
    "One authoritative simulation clock with monotonic event sequence and idempotent feed events",
    "AirportEngine control/tick/event",
    "/api/simulation/*; /api/events",
    "domain: idempotency, clock controls and synchronized subscribers",
  ],
  [
    "No individual passenger identity, boarding pass or device tracking",
    "Aggregate profiles and anonymous offer tokens",
    "/claim/:token",
    "source inspection; QR integration tests",
  ],
  [
    "Transactional redemptions and booking conflicts survive restart",
    "EntityRepository / AirportEngine.promo",
    "/api/promos/*; /api/inventory/book",
    "API conflicts; file-backed persistence performance test",
  ],
  [
    "Design reference research and limitations documented",
    "docs/ARCHITECTURE.md",
    "N/A",
    "Shared brand and workspace identity use the user-requested Glide/Hustla references; responsive browser verification",
  ],
  [
    "Deployment manifests, setup/adapter/scoring guides, test report and 15-minute demo",
    "Dockerfile / docker-compose.yml / docs",
    "N/A",
    "Clean Docker build and healthcheck; documentation inspection",
  ],
];
additional.forEach(([requirement, module, route, verification], i) =>
  rows.push({
    id: "G" + String(i + 1).padStart(3, "0"),
    section: "Cross-cutting and implementation directive",
    priority: "Core",
    requirement,
    module,
    route,
    verification,
    status: "Implemented",
    notes: "",
  }),
);
const counts = Object.fromEntries(
  [...new Set(rows.map((r) => r.status))].map((status) => [
    status,
    rows.filter((r) => r.status === status).length,
  ]),
);
fs.writeFileSync(
  "artifacts/reports/requirements-matrix.json",
  JSON.stringify(
    {
      source: "CHALLENGE_REQUIREMENTS.md",
      generated: "2026-10-24",
      summary: counts,
      requirements: rows,
    },
    null,
    2,
  ) + "\n",
);
const escape = (s) => String(s).replaceAll("|", " / ").replaceAll("\n", " ");
fs.writeFileSync(
  "docs/REQUIREMENTS.md",
  `# Requirements traceability\n\nSource: CHALLENGE_REQUIREMENTS.md. Run node scripts/traceability.mjs to generate the JSON companion under ignored artifacts/reports/. Status describes implementation, with verification limits explicitly noted. Public deployment is not complete.\n\nSummary: ${Object.entries(
    counts,
  )
    .map(([k, v]) => `${v} ${k}`)
    .join(
      "; ",
    )}.\n\n| ID | Priority | Requirement | Module / route | Verification | Status / notes |\n| --- | --- | --- | --- | --- | --- |\n` +
    rows
      .map(
        (r) =>
          `| ${r.id} | ${escape(r.priority)} | ${escape(r.requirement)} | ${escape(r.module)} · ${escape(r.route)} | ${escape(r.verification)} | ${escape(r.status)}${r.notes ? " — " + escape(r.notes) : ""} |`,
      )
      .join("\n") +
    "\n",
);
console.log(JSON.stringify({ rows: rows.length, counts }));
function mapRequirement(text, section) {
  let module = "AirportEngine / scoring / adapters",
    route = "/api/screens/:id/decision; /api/zones/:id/presence",
    verification = "domain and HTTP integration tests",
    status = "Implemented",
    notes = "";
  if (section.includes("Admin")) {
    module = "AdminOverview / Incidents / MasterData / Intelligence";
    route = "/admin; /api/screens; /api/incidents; master-data CRUD";
    verification =
      "seed and offline incident tests; API master data; browser Admin screenshots";
  }
  if (section.includes("Retailer")) {
    module = "RetailOverview / CampaignBuilder / Library / Audience";
    route = "/retailer; /api/campaigns; /api/analytics/*";
    verification =
      "browser campaign/QR/creative flows; HTTP campaign lifecycle";
  }
  if (section.includes("Media Manager")) {
    module = "Inventory / Approvals / Advertisers / SegmentHeatmap";
    route = "/media; /api/inventory/*; /api/campaigns/:id/approve";
    verification =
      "browser approval and booking flows; HTTP booking conflict test";
  }
  if (section.includes("Airline")) {
    module = "Flights / Messaging / Partners / AirlineAudience";
    route = "/airline; /api/flights; /api/analytics/airline";
    verification =
      "delay cascade/goodwill domain checks; all-role browser layout";
  }
  if (section.includes("Passenger")) {
    module = "Passenger / Claim / DecisionPanel";
    route = "/passenger; /claim/:token; /api/promos/*";
    verification =
      "browser delay/QR flow, responsive screenshots; domain token lifecycle";
  }
  if (section.includes("WOW")) {
    module = /GenAI/.test(text)
      ? "OfflineCreativeProvider / Library"
      : /recommendation/.test(text)
        ? "AirportEngine.recommendations / Inventory"
        : "App / AirportEngine / Passenger";
    route =
      "/api/simulation/*; /api/events; /api/creatives/generate; /api/recommendations/slots";
    verification =
      "browser workflow suite; domain regression; file-backed 60x performance run";
  }
  if (section.includes("Technical") || section.includes("Deliverables")) {
    module = "Repository / Docker / docs";
    route = "See README and docs/DEPLOYMENT.md";
    verification =
      "build/typecheck, syntax/format lint, domain/API/browser tests, clean Compose build";
  }
  if (/playground.*URL|URL.*playground|deployed.*solution/i.test(text)) {
    status = "External deployment pending";
    notes =
      "No public host/domain provisioned or public URL verified; Node/SQLite deployment manifests supplied.";
    verification = "Local Docker verified; hosted smoke checks not run";
  }
  if (/real phone|laptop.s LAN/i.test(text)) {
    status = "Implemented; device verification pending";
    notes =
      "SVG QR, LAN configuration, mobile browser and HTTP claim flow tested; no external physical-phone scan performed.";
  }
  if (/Triggers \(optional\)/.test(text)) {
    status = "Implemented";
    notes =
      "Delay, configured festival-calendar and explicit boarding/recent gate-change campaign triggers; production tests cover calendar activation and expiry.";
  }
  if (/UI quality/.test(text)) {
    notes =
      "Explicit EN/HI presentation catalogue includes explanatory UI and diagnostic labels. Feed identifiers and externally authored content are preserved.";
  }
  if (/A\/B/.test(text)) {
    notes =
      "Seeded alternate headline creatives and parity-assigned exposure/transaction cohorts; simple comparison, not a causal experiment.";
  }
  if (/7 days/.test(text)) {
    notes =
      "Date-specific synthetic schedules; complete 900-flight heatmap; separate committed revenue and projected available inventory at a configured fill assumption.";
  }
  if (/Performance/.test(text)) {
    notes =
      "Measured results in artifacts/reports/performance-results.json and docs/TEST_REPORT.md; no hardware-independent SLA is claimed.";
  }
  return { module, route, verification, status, notes };
}
