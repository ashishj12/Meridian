import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export class EntityRepository {
  constructor(file = process.env.DB_PATH || "data/meridian.sqlite") {
    if (file !== ":memory:")
      fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
    this.transactionDepth = 0;
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
    this.upsert.run(kind, String(value.id), JSON.stringify(record));
    if (this.cache.has(kind)) this.cache.get(kind).set(String(value.id), value);
    return value;
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
