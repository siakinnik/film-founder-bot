-- Table users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    lang VARCHAR(10) DEFAULT 'en',
    find_count INTEGER DEFAULT 0,
    find_count_set TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_banned BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_user_id ON users(id);