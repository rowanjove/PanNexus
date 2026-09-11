-- MetaSeek Core Database Schema (SQLite / Cloudflare D1)

-- 1. Canonical Resources (Entity Clustering Level)
CREATE TABLE IF NOT EXISTS canonical_resources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    original_title TEXT,
    category TEXT,
    year INTEGER,
    season INTEGER,
    episode INTEGER,
    resolution TEXT,
    codec TEXT,
    audio TEXT,
    edition TEXT,
    normalized_key TEXT,
    metadata TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_canonical_normalized_key ON canonical_resources(normalized_key);
CREATE INDEX IF NOT EXISTS idx_canonical_category ON canonical_resources(category);
CREATE INDEX IF NOT EXISTS idx_canonical_year ON canonical_resources(year);

-- 2. Resources (Individual Source Links Level)
CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    canonical_id TEXT,
    title TEXT NOT NULL,
    normalized_title TEXT,
    resource_type TEXT NOT NULL,
    provider TEXT NOT NULL,
    url TEXT,
    url_hash TEXT,
    infohash TEXT,
    password TEXT,
    size_bytes INTEGER,
    file_count INTEGER DEFAULT 1,
    source_id INTEGER,
    published_at INTEGER,
    discovered_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    status TEXT DEFAULT 'unknown',
    quality_score REAL DEFAULT 0.0,
    popularity_score REAL DEFAULT 0.0,
    metadata TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(canonical_id) REFERENCES canonical_resources(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_resources_canonical_id ON resources(canonical_id);
CREATE INDEX IF NOT EXISTS idx_resources_url_hash ON resources(url_hash);
CREATE INDEX IF NOT EXISTS idx_resources_infohash ON resources(infohash);
CREATE INDEX IF NOT EXISTS idx_resources_provider ON resources(provider);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_last_seen ON resources(last_seen_at);

-- 3. Resource Files (For Torrent / Netdisk detailed file search)
CREATE TABLE IF NOT EXISTS resource_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    path TEXT,
    filename TEXT NOT NULL,
    extension TEXT,
    size_bytes INTEGER,
    FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resource_files_res_id ON resource_files(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_files_ext ON resource_files(extension);

-- 4. Sources (Registry, Health & Circuit Breaker Tracking)
CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 50,
    health_score REAL DEFAULT 1.0,
    avg_latency INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    circuit_state TEXT DEFAULT 'closed',
    last_success_at INTEGER,
    last_failure_at INTEGER,
    last_crawl_at INTEGER,
    config TEXT
);

CREATE INDEX IF NOT EXISTS idx_sources_key ON sources(source_key);
CREATE INDEX IF NOT EXISTS idx_sources_enabled ON sources(enabled);

-- 5. Search Analytics & Zero Result Keywords
CREATE TABLE IF NOT EXISTS search_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT UNIQUE NOT NULL,
    count INTEGER DEFAULT 1,
    last_searched_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS zero_result_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT UNIQUE NOT NULL,
    count INTEGER DEFAULT 1,
    last_searched_at INTEGER NOT NULL
);

-- 6. SQLite FTS5 Virtual Table for Full-Text Search (Trigram tokenizer for CJK & Substring matching)
CREATE VIRTUAL TABLE IF NOT EXISTS resources_fts USING fts5(
    title,
    normalized_title,
    metadata,
    content='resources',
    content_rowid='id',
    tokenize='trigram'
);

-- Triggers to synchronize FTS5 index automatically
CREATE TRIGGER IF NOT EXISTS resources_ai AFTER INSERT ON resources BEGIN
    INSERT INTO resources_fts(rowid, title, normalized_title, metadata)
    VALUES (new.id, new.title, new.normalized_title, new.metadata);
END;

CREATE TRIGGER IF NOT EXISTS resources_ad AFTER DELETE ON resources BEGIN
    INSERT INTO resources_fts(resources_fts, rowid, title, normalized_title, metadata)
    VALUES('delete', old.id, old.title, old.normalized_title, old.metadata);
END;

CREATE TRIGGER IF NOT EXISTS resources_au AFTER UPDATE ON resources BEGIN
    INSERT INTO resources_fts(resources_fts, rowid, title, normalized_title, metadata)
    VALUES('delete', old.id, old.title, old.normalized_title, old.metadata);
    INSERT INTO resources_fts(rowid, title, normalized_title, metadata)
    VALUES (new.id, new.title, new.normalized_title, new.metadata);
END;
