CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  title TEXT DEFAULT '',
  referrer TEXT DEFAULT '',
  country TEXT DEFAULT '',
  visitor_id TEXT DEFAULT '',
  session_id TEXT DEFAULT '',
  duration_ms INTEGER DEFAULT 0,
  metadata TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_path ON analytics_events(path);
CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON analytics_events(visitor_id);

CREATE TABLE IF NOT EXISTS ad_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0,
  publisher_id TEXT NOT NULL DEFAULT '',
  top_slot TEXT NOT NULL DEFAULT '',
  content_slot TEXT NOT NULL DEFAULT '',
  sidebar_slot TEXT NOT NULL DEFAULT '',
  bottom_slot TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO ad_settings(id) VALUES(1);
