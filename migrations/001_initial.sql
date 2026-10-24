PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO schema_migrations(version) VALUES(1);
CREATE TABLE IF NOT EXISTS entities(kind TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL CHECK(json_valid(body)), PRIMARY KEY(kind,id));
CREATE INDEX IF NOT EXISTS entities_kind ON entities(kind);
CREATE INDEX IF NOT EXISTS campaign_activity ON entities(json_extract(body,'$.campaignId')) WHERE kind='activity';
CREATE TABLE IF NOT EXISTS processed_events(id TEXT PRIMARY KEY);
