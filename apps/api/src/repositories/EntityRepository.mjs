import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const upsertStatement = (table, columns, key) => {
  const values = columns.map(() => "?").join(",");
  const updates = columns
    .filter((column) => column !== key)
    .map((column) => `${column}=excluded.${column}`)
    .join(",");
  return `INSERT INTO ${table}(${columns.join(",")}) VALUES(${values}) ON CONFLICT(${key}) DO UPDATE SET ${updates}`;
};
const json = (value) => JSON.stringify(value ?? {});
const flag = (value) => (value ? 1 : 0);
const typedKinds = new Set([
  "flights",
  "screens",
  "campaigns",
  "promos",
  "decisions",
  "activity",
]);

export class EntityRepository {
  constructor(file = process.env.DB_PATH || "data/meridian.sqlite") {
    if (file !== ":memory:")
      fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
    this.transactionDepth = 0;
    this.writeSequence = 0;
    this.db.exec(
      fs.readFileSync(
        new URL("../../../../migrations/001_initial.sql", import.meta.url),
        "utf8",
      ),
    );
    if (
      !this.db
        .prepare("SELECT version FROM schema_migrations WHERE version=2")
        .get()
    )
      this.db.exec(
        fs.readFileSync(
          new URL(
            "../../../../migrations/002_activity_index.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
    this.cache = new Map();
    this.db.exec(
      fs.readFileSync(
        new URL(
          "../../../../migrations/003_runtime_leases.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    this.db.exec(
      fs.readFileSync(
        new URL(
          "../../../../migrations/004_typed_entities.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    this.dataVersion = this.db
      .prepare("PRAGMA data_version")
      .get().data_version;
    this.selectKind = this.db.prepare(
      "SELECT body FROM entities WHERE kind=? ORDER BY rowid",
    );
    this.upsert = this.db.prepare(
      "INSERT INTO entities(kind,id,body) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body",
    );
    this.remove = this.db.prepare("DELETE FROM entities WHERE kind=? AND id=?");
    this.entityExists = this.db.prepare(
      "SELECT id FROM entities WHERE kind=? AND id=?",
    );
    this.typedUpserts = Object.fromEntries(
      Object.entries({
        flights: [
          "id",
          "number",
          "airline_id",
          "zone_id",
          "direction",
          "origin",
          "destination",
          "terminal",
          "gate",
          "scheduled_at",
          "estimated_at",
          "status",
          "delay_minutes",
          "aircraft",
          "seats",
          "passenger_count",
          "international",
          "trace_json",
        ],
        screens: [
          "id",
          "zone_id",
          "terminal_id",
          "name",
          "gate",
          "orientation",
          "size_inches",
          "status",
          "nearest_gates_json",
          "trace_json",
        ],
        campaigns: [
          "id",
          "outlet_id",
          "name",
          "category",
          "status",
          "budget",
          "spend",
          "starts_at",
          "ends_at",
          "creative_approved",
          "brand_safe",
          "paused",
          "in_stock",
          "trace_json",
        ],
        promos: [
          "id",
          "campaign_id",
          "outlet_id",
          "zone_id",
          "variant",
          "offer",
          "expires_at",
          "scans",
          "is_claimed",
          "is_redeemed",
          "parent_token",
          "offer_token",
          "child_token",
          "trace_json",
        ],
        decisions: [
          "id",
          "screen_id",
          "campaign_id",
          "decided_at",
          "source",
          "score",
          "reason",
          "is_validated",
          "was_delivered",
          "evidence_json",
          "weights_json",
          "trace_json",
        ],
        impressions: [
          "activity_id",
          "campaign_id",
          "outlet_id",
          "screen_id",
          "timestamp",
          "play_count",
          "impression_count",
          "spend",
          "segment",
          "variant",
          "flight_ids_json",
          "trace_json",
        ],
        redemptions: [
          "activity_id",
          "campaign_id",
          "outlet_id",
          "promo_code_id",
          "timestamp",
          "redemption_count",
          "revenue",
          "segment",
          "variant",
          "trace_json",
        ],
      }).map(([table, columns]) => [
        table,
        this.db.prepare(
          upsertStatement(
            table === "promos" ? "promo_codes" : table,
            columns,
            table === "impressions" || table === "redemptions"
              ? "activity_id"
              : "id",
          ),
        ),
      ]),
    );
    this.deleteTypedActivity = this.db.prepare(
      "DELETE FROM impressions WHERE activity_id=?",
    );
    this.deleteTypedRedemption = this.db.prepare(
      "DELETE FROM redemptions WHERE activity_id=?",
    );
  }
  all(kind) {
    if (!this.cache.has(kind))
      this.cache.set(
        kind,
        new Map(
          this.selectKind.all(kind).map((r) => {
            const value = JSON.parse(r.body);
            return [String(value.id), value];
          }),
        ),
      );
    return [...this.cache.get(kind).values()];
  }
  get(kind, id) {
    if (!this.cache.has(kind)) this.all(kind);
    const value = this.cache.get(kind).get(String(id));
    if (kind === "playlists" && value?.decisionId && !value.decision)
      value.decision = this.get("decisions", value.decisionId);
    return value;
  }
  put(kind, value) {
    const record =
      kind === "playlists" && value.decision
        ? { id: value.id, decisionId: value.decision.id }
        : value;
    if (!typedKinds.has(kind)) {
      this.upsert.run(kind, String(value.id), JSON.stringify(record));
      if (this.cache.has(kind))
        this.cache.get(kind).set(String(value.id), value);
      return value;
    }
    if (this.transactionDepth) {
      this.upsert.run(kind, String(value.id), JSON.stringify(record));
      this.syncTyped(kind, value);
      if (this.cache.has(kind))
        this.cache.get(kind).set(String(value.id), value);
      return value;
    }
    const savepoint = `entity_put_${++this.writeSequence}`;
    this.db.exec(`SAVEPOINT ${savepoint}`);
    try {
      this.upsert.run(kind, String(value.id), JSON.stringify(record));
      this.syncTyped(kind, value);
      this.db.exec(`RELEASE SAVEPOINT ${savepoint}`);
      if (this.cache.has(kind))
        this.cache.get(kind).set(String(value.id), value);
      return value;
    } catch (error) {
      this.db.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      this.db.exec(`RELEASE SAVEPOINT ${savepoint}`);
      throw error;
    }
  }
  syncTyped(kind, value) {
    if (kind === "flights") {
      this.typedUpserts.flights.run(
        String(value.id),
        value.number,
        value.airlineId,
        value.zoneId,
        value.direction,
        value.origin,
        value.destination,
        value.terminal || null,
        value.gate || null,
        value.scheduled,
        value.estimated,
        value.status,
        value.delay || 0,
        value.aircraft || null,
        value.seats ?? null,
        value.pax || 0,
        flag(value.international),
        json(value),
      );
    } else if (kind === "screens") {
      this.typedUpserts.screens.run(
        String(value.id),
        value.zoneId,
        value.terminal,
        value.name,
        String(value.gate),
        value.orientation,
        value.size,
        value.status,
        json(value.nearestGates || []),
        json(value),
      );
    } else if (kind === "campaigns") {
      this.typedUpserts.campaigns.run(
        String(value.id),
        value.outletId,
        value.name,
        value.category,
        value.status,
        value.budget,
        value.spend || 0,
        value.start,
        value.end,
        flag(value.creativeApproved),
        flag(value.brandSafe),
        flag(value.paused),
        flag(value.stock),
        json(value),
      );
    } else if (kind === "promos") {
      this.typedUpserts.promos.run(
        String(value.id),
        value.campaignId,
        value.outletId,
        value.zoneId,
        value.variant || "A",
        value.offer || "",
        value.expiry,
        value.scans || 0,
        flag(value.claimed),
        flag(value.redeemed),
        value.parentToken || null,
        value.offerToken || null,
        value.childToken || null,
        json(value),
      );
    } else if (kind === "decisions") {
      const selected = value.candidates?.find(
        (candidate) => candidate.id === value.campaignId,
      );
      this.typedUpserts.decisions.run(
        String(value.id),
        value.screenId,
        value.campaignId || null,
        value.timestamp,
        value.source,
        selected?.score ?? null,
        value.reason || "",
        flag(value.validated),
        flag(value.delivered),
        json(value.presence),
        json(value.scoreWeights),
        json(value),
      );
    } else if (kind === "activity") {
      const reference = (type, id) =>
        id && this.entityExists.get(type, String(id)) ? String(id) : null;
      const id = String(value.id);
      if (value.impressions > 0) {
        this.typedUpserts.impressions.run(
          id,
          reference("campaigns", value.campaignId),
          reference("outlets", value.outletId),
          reference("screens", value.screenId),
          value.timestamp,
          value.plays || 0,
          value.impressions,
          value.spend || 0,
          value.segment || null,
          value.variant || null,
          json(value.flightIds || []),
          json(value),
        );
      } else this.deleteTypedActivity.run(id);
      if (value.redemptions > 0) {
        this.typedUpserts.redemptions.run(
          id,
          reference("campaigns", value.campaignId),
          reference("outlets", value.outletId),
          reference("promos", value.promoCodeId),
          value.timestamp,
          value.redemptions,
          value.revenue || 0,
          value.segment || null,
          value.variant || null,
          json(value),
        );
      } else this.deleteTypedRedemption.run(id);
    }
  }
  delete(kind, id) {
    this.remove.run(kind, String(id));
    this.cache.get(kind)?.delete(String(id));
  }
  transaction(fn) {
    const depth = this.transactionDepth;
    const savepoint = `nested_${depth}`;
    this.db.exec(depth ? `SAVEPOINT ${savepoint}` : "BEGIN IMMEDIATE");
    this.transactionDepth++;
    try {
      const value = fn();
      this.db.exec(depth ? `RELEASE SAVEPOINT ${savepoint}` : "COMMIT");
      return value;
    } catch (e) {
      this.db.exec(depth ? `ROLLBACK TO SAVEPOINT ${savepoint}` : "ROLLBACK");
      if (depth) this.db.exec(`RELEASE SAVEPOINT ${savepoint}`);
      this.cache.clear();
      throw e;
    } finally {
      this.transactionDepth--;
    }
  }
  /** Other processes invalidate this process's read cache through SQLite's data version. */
  refresh() {
    const version = this.db.prepare("PRAGMA data_version").get().data_version;
    if (version === this.dataVersion) return false;
    this.dataVersion = version;
    this.cache.clear();
    return true;
  }
  /** A renewable, database-backed lease makes exactly one healthy process advance the clock. */
  claimClockLease(owner, now = Date.now(), ttl = 2500) {
    this.db
      .prepare(
        `INSERT INTO runtime_leases(name,owner,expires_at) VALUES('simulation',?,?) ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE runtime_leases.owner=excluded.owner OR runtime_leases.expires_at<=?`,
      )
      .run(owner, now + ttl, now);
    return (
      this.db
        .prepare("SELECT owner FROM runtime_leases WHERE name='simulation'")
        .get()?.owner === owner
    );
  }
  releaseClockLease(owner) {
    this.db
      .prepare("DELETE FROM runtime_leases WHERE name='simulation' AND owner=?")
      .run(owner);
  }
  clear() {
    this.db.exec("DELETE FROM entities; DELETE FROM processed_events;");
    this.cache.clear();
  }
  seen(id) {
    return !!this.db
      .prepare("SELECT id FROM processed_events WHERE id=?")
      .get(id);
  }
  mark(id) {
    this.db.prepare("INSERT INTO processed_events(id) VALUES(?)").run(id);
  }
  close() {
    this.db.close();
  }
}
