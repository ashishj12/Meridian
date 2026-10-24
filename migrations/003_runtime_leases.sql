CREATE TABLE IF NOT EXISTS runtime_leases (
  name TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO schema_migrations(version) VALUES (3);
