-- Migration: Blocked items for content governance and moderation
CREATE TABLE IF NOT EXISTS blocked_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'domain' | 'infohash' | 'keyword'
    value TEXT UNIQUE NOT NULL,
    reason TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blocked_items_val ON blocked_items(value);
CREATE INDEX IF NOT EXISTS idx_blocked_items_type ON blocked_items(type);
