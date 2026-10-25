CREATE TABLE IF NOT EXISTS flights (
  entity_kind TEXT NOT NULL DEFAULT 'flights' CHECK (entity_kind = 'flights'),
  id TEXT NOT NULL,
  number TEXT NOT NULL,
  airline_kind TEXT NOT NULL DEFAULT 'airlines' CHECK (airline_kind = 'airlines'),
  airline_id TEXT NOT NULL,
  zone_kind TEXT NOT NULL DEFAULT 'zones' CHECK (zone_kind = 'zones'),
  zone_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('A', 'D')),
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  terminal TEXT,
  gate TEXT,
  scheduled_at TEXT NOT NULL,
  estimated_at TEXT NOT NULL,
  status TEXT NOT NULL,
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  aircraft TEXT,
  seats INTEGER,
  passenger_count INTEGER NOT NULL DEFAULT 0 CHECK (passenger_count >= 0),
  international INTEGER NOT NULL DEFAULT 0 CHECK (international IN (0, 1)),
  trace_json TEXT NOT NULL CHECK (json_valid(trace_json)),
  PRIMARY KEY (id),
  FOREIGN KEY (entity_kind, id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (airline_kind, airline_id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (zone_kind, zone_id) REFERENCES entities(kind, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS flights_zone_schedule ON flights(zone_id, estimated_at);
CREATE INDEX IF NOT EXISTS flights_gate_schedule ON flights(gate, estimated_at);

CREATE TABLE IF NOT EXISTS screens (
  entity_kind TEXT NOT NULL DEFAULT 'screens' CHECK (entity_kind = 'screens'),
  id TEXT NOT NULL,
  zone_kind TEXT NOT NULL DEFAULT 'zones' CHECK (zone_kind = 'zones'),
  zone_id TEXT NOT NULL,
  terminal_kind TEXT NOT NULL DEFAULT 'terminals' CHECK (terminal_kind = 'terminals'),
  terminal_id TEXT NOT NULL,
  name TEXT NOT NULL,
  gate TEXT NOT NULL,
  orientation TEXT NOT NULL CHECK (orientation IN ('portrait', 'landscape')),
  size_inches REAL NOT NULL CHECK (size_inches > 0),
  status TEXT NOT NULL,
  nearest_gates_json TEXT NOT NULL CHECK (json_valid(nearest_gates_json)),
  trace_json TEXT NOT NULL CHECK (json_valid(trace_json)),
  PRIMARY KEY (id),
  FOREIGN KEY (entity_kind, id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (zone_kind, zone_id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (terminal_kind, terminal_id) REFERENCES entities(kind, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS screens_zone_status ON screens(zone_id, status);

CREATE TABLE IF NOT EXISTS campaigns (
  entity_kind TEXT NOT NULL DEFAULT 'campaigns' CHECK (entity_kind = 'campaigns'),
  id TEXT NOT NULL,
  outlet_kind TEXT NOT NULL DEFAULT 'outlets' CHECK (outlet_kind = 'outlets'),
  outlet_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  budget REAL NOT NULL CHECK (budget >= 0),
  spend REAL NOT NULL DEFAULT 0 CHECK (spend >= 0),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  creative_approved INTEGER NOT NULL CHECK (creative_approved IN (0, 1)),
  brand_safe INTEGER NOT NULL CHECK (brand_safe IN (0, 1)),
  paused INTEGER NOT NULL CHECK (paused IN (0, 1)),
  in_stock INTEGER NOT NULL CHECK (in_stock IN (0, 1)),
  trace_json TEXT NOT NULL CHECK (json_valid(trace_json)),
  PRIMARY KEY (id),
  FOREIGN KEY (entity_kind, id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (outlet_kind, outlet_id) REFERENCES entities(kind, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS campaigns_outlet_status ON campaigns(outlet_id, status);

CREATE TABLE IF NOT EXISTS promo_codes (
  entity_kind TEXT NOT NULL DEFAULT 'promos' CHECK (entity_kind = 'promos'),
  id TEXT NOT NULL,
  campaign_kind TEXT NOT NULL DEFAULT 'campaigns' CHECK (campaign_kind = 'campaigns'),
  campaign_id TEXT NOT NULL,
  outlet_kind TEXT NOT NULL DEFAULT 'outlets' CHECK (outlet_kind = 'outlets'),
  outlet_id TEXT NOT NULL,
  zone_kind TEXT NOT NULL DEFAULT 'zones' CHECK (zone_kind = 'zones'),
  zone_id TEXT NOT NULL,
  variant TEXT NOT NULL,
  offer TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  scans INTEGER NOT NULL DEFAULT 0 CHECK (scans >= 0),
  is_claimed INTEGER NOT NULL CHECK (is_claimed IN (0, 1)),
  is_redeemed INTEGER NOT NULL CHECK (is_redeemed IN (0, 1)),
  parent_token TEXT,
  offer_token TEXT,
  child_token TEXT,
  trace_json TEXT NOT NULL CHECK (json_valid(trace_json)),
  PRIMARY KEY (id),
  FOREIGN KEY (entity_kind, id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_kind, campaign_id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (outlet_kind, outlet_id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (zone_kind, zone_id) REFERENCES entities(kind, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS promo_codes_campaign_expiry ON promo_codes(campaign_id, expires_at);

CREATE TABLE IF NOT EXISTS decisions (
  entity_kind TEXT NOT NULL DEFAULT 'decisions' CHECK (entity_kind = 'decisions'),
  id TEXT NOT NULL,
  screen_kind TEXT NOT NULL DEFAULT 'screens' CHECK (screen_kind = 'screens'),
  screen_id TEXT NOT NULL,
  campaign_kind TEXT NOT NULL DEFAULT 'campaigns' CHECK (campaign_kind = 'campaigns'),
  campaign_id TEXT,
  decided_at INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('ai', 'rules', 'fallback')),
  score REAL CHECK (score IS NULL OR (score >= 0 AND score <= 1)),
  reason TEXT NOT NULL,
  is_validated INTEGER NOT NULL CHECK (is_validated IN (0, 1)),
  was_delivered INTEGER NOT NULL CHECK (was_delivered IN (0, 1)),
  evidence_json TEXT NOT NULL CHECK (json_valid(evidence_json)),
  weights_json TEXT NOT NULL CHECK (json_valid(weights_json)),
  trace_json TEXT NOT NULL CHECK (json_valid(trace_json)),
  PRIMARY KEY (id),
  FOREIGN KEY (entity_kind, id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (screen_kind, screen_id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_kind, campaign_id) REFERENCES entities(kind, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS decisions_screen_time ON decisions(screen_id, decided_at);
CREATE INDEX IF NOT EXISTS decisions_campaign_time ON decisions(campaign_id, decided_at);

CREATE TABLE IF NOT EXISTS impressions (
  entity_kind TEXT NOT NULL DEFAULT 'activity' CHECK (entity_kind = 'activity'),
  activity_id TEXT NOT NULL,
  campaign_kind TEXT NOT NULL DEFAULT 'campaigns' CHECK (campaign_kind = 'campaigns'),
  campaign_id TEXT,
  outlet_kind TEXT NOT NULL DEFAULT 'outlets' CHECK (outlet_kind = 'outlets'),
  outlet_id TEXT,
  screen_kind TEXT NOT NULL DEFAULT 'screens' CHECK (screen_kind = 'screens'),
  screen_id TEXT,
  timestamp INTEGER NOT NULL,
  play_count INTEGER NOT NULL DEFAULT 0 CHECK (play_count >= 0),
  impression_count INTEGER NOT NULL CHECK (impression_count > 0),
  spend REAL NOT NULL DEFAULT 0 CHECK (spend >= 0),
  segment TEXT,
  variant TEXT,
  flight_ids_json TEXT NOT NULL CHECK (json_valid(flight_ids_json)),
  trace_json TEXT NOT NULL CHECK (json_valid(trace_json)),
  PRIMARY KEY (activity_id),
  FOREIGN KEY (entity_kind, activity_id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_kind, campaign_id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (outlet_kind, outlet_id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (screen_kind, screen_id) REFERENCES entities(kind, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS impressions_campaign_time ON impressions(campaign_id, timestamp);

CREATE TABLE IF NOT EXISTS redemptions (
  entity_kind TEXT NOT NULL DEFAULT 'activity' CHECK (entity_kind = 'activity'),
  activity_id TEXT NOT NULL,
  campaign_kind TEXT NOT NULL DEFAULT 'campaigns' CHECK (campaign_kind = 'campaigns'),
  campaign_id TEXT,
  outlet_kind TEXT NOT NULL DEFAULT 'outlets' CHECK (outlet_kind = 'outlets'),
  outlet_id TEXT,
  promo_kind TEXT NOT NULL DEFAULT 'promos' CHECK (promo_kind = 'promos'),
  promo_code_id TEXT,
  timestamp INTEGER NOT NULL,
  redemption_count INTEGER NOT NULL CHECK (redemption_count > 0),
  revenue REAL NOT NULL DEFAULT 0 CHECK (revenue >= 0),
  segment TEXT,
  variant TEXT,
  trace_json TEXT NOT NULL CHECK (json_valid(trace_json)),
  PRIMARY KEY (activity_id),
  FOREIGN KEY (entity_kind, activity_id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_kind, campaign_id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (outlet_kind, outlet_id) REFERENCES entities(kind, id) ON DELETE CASCADE,
  FOREIGN KEY (promo_kind, promo_code_id) REFERENCES entities(kind, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS redemptions_campaign_time ON redemptions(campaign_id, timestamp);

INSERT OR IGNORE INTO flights (
  id, number, airline_id, zone_id, direction, origin, destination, terminal, gate,
  scheduled_at, estimated_at, status, delay_minutes, aircraft, seats, passenger_count,
  international, trace_json
)
SELECT id, json_extract(body, '$.number'), json_extract(body, '$.airlineId'),
  json_extract(body, '$.zoneId'), json_extract(body, '$.direction'),
  json_extract(body, '$.origin'), json_extract(body, '$.destination'),
  json_extract(body, '$.terminal'), json_extract(body, '$.gate'),
  json_extract(body, '$.scheduled'), json_extract(body, '$.estimated'),
  json_extract(body, '$.status'), COALESCE(json_extract(body, '$.delay'), 0),
  json_extract(body, '$.aircraft'), json_extract(body, '$.seats'),
  COALESCE(json_extract(body, '$.pax'), 0),
  COALESCE(json_extract(body, '$.international'), 0), body
FROM entities WHERE kind = 'flights';

INSERT OR IGNORE INTO screens (
  id, zone_id, terminal_id, name, gate, orientation, size_inches, status,
  nearest_gates_json, trace_json
)
SELECT id, json_extract(body, '$.zoneId'), json_extract(body, '$.terminal'),
  json_extract(body, '$.name'), json_extract(body, '$.gate'),
  json_extract(body, '$.orientation'), json_extract(body, '$.size'),
  json_extract(body, '$.status'), json_extract(body, '$.nearestGates'), body
FROM entities WHERE kind = 'screens';

INSERT OR IGNORE INTO campaigns (
  id, outlet_id, name, category, status, budget, spend, starts_at, ends_at,
  creative_approved, brand_safe, paused, in_stock, trace_json
)
SELECT id, json_extract(body, '$.outletId'), json_extract(body, '$.name'),
  json_extract(body, '$.category'), json_extract(body, '$.status'),
  COALESCE(json_extract(body, '$.budget'), 0), COALESCE(json_extract(body, '$.spend'), 0),
  json_extract(body, '$.start'), json_extract(body, '$.end'),
  COALESCE(json_extract(body, '$.creativeApproved'), 0),
  COALESCE(json_extract(body, '$.brandSafe'), 0),
  COALESCE(json_extract(body, '$.paused'), 0), COALESCE(json_extract(body, '$.stock'), 0), body
FROM entities WHERE kind = 'campaigns';

INSERT OR IGNORE INTO promo_codes (
  id, campaign_id, outlet_id, zone_id, variant, offer, expires_at, scans,
  is_claimed, is_redeemed, parent_token, offer_token, child_token, trace_json
)
SELECT id, json_extract(body, '$.campaignId'), json_extract(body, '$.outletId'),
  json_extract(body, '$.zoneId'), COALESCE(json_extract(body, '$.variant'), 'A'),
  COALESCE(json_extract(body, '$.offer'), ''), json_extract(body, '$.expiry'),
  COALESCE(json_extract(body, '$.scans'), 0), COALESCE(json_extract(body, '$.claimed'), 0),
  COALESCE(json_extract(body, '$.redeemed'), 0), json_extract(body, '$.parentToken'),
  json_extract(body, '$.offerToken'), json_extract(body, '$.childToken'), body
FROM entities WHERE kind = 'promos';

INSERT OR IGNORE INTO decisions (
  id, screen_id, campaign_id, decided_at, source, score, reason, is_validated,
  was_delivered, evidence_json, weights_json, trace_json
)
SELECT d.id, json_extract(d.body, '$.screenId'), json_extract(d.body, '$.campaignId'),
  json_extract(d.body, '$.timestamp'), COALESCE(json_extract(d.body, '$.source'), 'rules'),
  (SELECT json_extract(candidate.value, '$.score')
   FROM json_each(d.body, '$.candidates') AS candidate
   WHERE json_extract(candidate.value, '$.id') = json_extract(d.body, '$.campaignId')
   LIMIT 1),
  COALESCE(json_extract(d.body, '$.reason'), ''),
  COALESCE(json_extract(d.body, '$.validated'), 0),
  COALESCE(json_extract(d.body, '$.delivered'), 0),
  COALESCE(json_extract(d.body, '$.presence'), '{}'),
  COALESCE(json_extract(d.body, '$.scoreWeights'), '{}'), d.body
FROM entities d WHERE d.kind = 'decisions';

INSERT OR IGNORE INTO impressions (
  activity_id, campaign_id, outlet_id, screen_id, timestamp, play_count,
  impression_count, spend, segment, variant, flight_ids_json, trace_json
)
SELECT a.id, c.id, o.id, s.id, json_extract(a.body, '$.timestamp'),
  COALESCE(json_extract(a.body, '$.plays'), 0),
  json_extract(a.body, '$.impressions'), COALESCE(json_extract(a.body, '$.spend'), 0),
  json_extract(a.body, '$.segment'), json_extract(a.body, '$.variant'),
  COALESCE(json_extract(a.body, '$.flightIds'), '[]'), a.body
FROM entities a
LEFT JOIN entities c ON c.kind = 'campaigns' AND c.id = json_extract(a.body, '$.campaignId')
LEFT JOIN entities o ON o.kind = 'outlets' AND o.id = json_extract(a.body, '$.outletId')
LEFT JOIN entities s ON s.kind = 'screens' AND s.id = json_extract(a.body, '$.screenId')
WHERE a.kind = 'activity' AND COALESCE(json_extract(a.body, '$.impressions'), 0) > 0;

INSERT OR IGNORE INTO redemptions (
  activity_id, campaign_id, outlet_id, promo_code_id, timestamp,
  redemption_count, revenue, segment, variant, trace_json
)
SELECT a.id, c.id, o.id, p.id, json_extract(a.body, '$.timestamp'),
  json_extract(a.body, '$.redemptions'), COALESCE(json_extract(a.body, '$.revenue'), 0),
  json_extract(a.body, '$.segment'), json_extract(a.body, '$.variant'), a.body
FROM entities a
LEFT JOIN entities c ON c.kind = 'campaigns' AND c.id = json_extract(a.body, '$.campaignId')
LEFT JOIN entities o ON o.kind = 'outlets' AND o.id = json_extract(a.body, '$.outletId')
LEFT JOIN entities p ON p.kind = 'promos' AND p.id = json_extract(a.body, '$.promoCodeId')
WHERE a.kind = 'activity' AND COALESCE(json_extract(a.body, '$.redemptions'), 0) > 0;

INSERT OR IGNORE INTO schema_migrations(version) VALUES (4);
