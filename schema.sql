CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,

    excerpt TEXT DEFAULT '',
    content TEXT NOT NULL,

    category TEXT DEFAULT 'Guides',

    featured_image TEXT DEFAULT '',

    seo_title TEXT DEFAULT '',
    meta_description TEXT DEFAULT '',

    status TEXT NOT NULL DEFAULT 'draft',

    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_articles_slug
ON articles(slug);

CREATE INDEX IF NOT EXISTS idx_articles_status
ON articles(status);

CREATE INDEX IF NOT EXISTS idx_articles_published_at
ON articles(published_at);
