CREATE TABLE IF NOT EXISTS platform_ai_settings (
 id INTEGER PRIMARY KEY CHECK(id = 1),
 enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
 student_daily_limit INTEGER NOT NULL DEFAULT 30 CHECK(student_daily_limit BETWEEN 1 AND 100),
 global_daily_limit INTEGER NOT NULL DEFAULT 300 CHECK(global_daily_limit BETWEEN 1 AND 1000)
);
INSERT OR IGNORE INTO platform_ai_settings(id) VALUES(1);
CREATE TABLE IF NOT EXISTS platform_ai_requests (
 id TEXT PRIMARY KEY,
 student_id TEXT NOT NULL REFERENCES practice_users(id),
 question_id TEXT NOT NULL REFERENCES platform_questions(id),
 date TEXT NOT NULL,
 request_id TEXT NOT NULL,
 content_hash TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','complete','fallback')),
 model TEXT NOT NULL,
 response TEXT,
 issue TEXT,
 input_tokens INTEGER NOT NULL DEFAULT 0,
 output_tokens INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL,
 UNIQUE(student_id,request_id),
 UNIQUE(student_id,date,content_hash)
);
CREATE INDEX IF NOT EXISTS platform_ai_daily_usage ON platform_ai_requests(date,student_id);
