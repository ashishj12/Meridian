DROP INDEX IF EXISTS campaign_activity;
CREATE INDEX campaign_activity ON entities(json_extract(body,'$.campaignId')) WHERE kind='activity';
INSERT OR IGNORE INTO schema_migrations(version) VALUES(2);
