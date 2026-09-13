-- Collapse duplicates before unique indexes
DELETE FROM resources
WHERE url_hash IS NOT NULL
  AND id NOT IN (SELECT MIN(id) FROM resources WHERE url_hash IS NOT NULL GROUP BY url_hash);

DELETE FROM resources
WHERE infohash IS NOT NULL
  AND id NOT IN (SELECT MIN(id) FROM resources WHERE infohash IS NOT NULL GROUP BY infohash);

CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_url_hash_unique ON resources(url_hash) WHERE url_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_infohash_unique ON resources(infohash) WHERE infohash IS NOT NULL;

CREATE TABLE IF NOT EXISTS blocked_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    value TEXT UNIQUE NOT NULL,
    reason TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS failed_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_key TEXT,
    error TEXT,
    payload TEXT,
    created_at INTEGER NOT NULL
);
