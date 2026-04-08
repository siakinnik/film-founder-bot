CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,           -- Telegram Chat ID
    lang TEXT DEFAULT NULL,           -- Язык пользователя
    find_count INTEGER DEFAULT 0,     -- Счетчик сессий
    find_count_set TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Дата обновления счетчика
    isBanned INTEGER DEFAULT 0        -- 0 = ок, 1 = забанен
);