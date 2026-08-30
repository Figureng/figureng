-- FigureNG CMS schema repair
-- Safe to run against the production D1 database.
-- The Worker also bootstraps these tables automatically.

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO site_settings (key, value) VALUES
('site_name', 'FigureNG'),
('site_tagline', 'Practical tools and information for Nigeria.'),
('nav_items', '[{"label":"Tools","url":"/tools.html","enabled":true},{"label":"Guides","url":"/guides.html","enabled":true},{"label":"About","url":"/about.html","enabled":true}]');

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE media ADD COLUMN data TEXT NOT NULL DEFAULT '';
