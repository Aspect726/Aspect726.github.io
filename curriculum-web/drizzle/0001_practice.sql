CREATE TABLE IF NOT EXISTS practice_users (
 id TEXT PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE,
 name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('parent','student')),
 password_hash TEXT NOT NULL, created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS practice_one_student ON practice_users(role) WHERE role = 'student';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS practice_sessions (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES practice_users(id),
 expires_at INTEGER NOT NULL, created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS practice_settings (
 id INTEGER PRIMARY KEY CHECK(id = 1), value TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS practice_login_limits (
 key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS practice_runs (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES practice_users(id),
 day_index INTEGER NOT NULL, kind TEXT NOT NULL, round INTEGER NOT NULL,
 date TEXT NOT NULL, state TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0,
 mutation TEXT, done INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
 UNIQUE(student_id,day_index,kind,round)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS practice_questions (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL, run_id TEXT NOT NULL,
 signature TEXT NOT NULL, plain_prompt TEXT NOT NULL, date TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS practice_no_day_repeat ON practice_questions(student_id,date,signature);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS practice_no_day_text_repeat ON practice_questions(student_id,date,plain_prompt);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS practice_question_recent ON practice_questions(student_id,date);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS practice_no_recent_repeat
BEFORE INSERT ON practice_questions
WHEN EXISTS (
 SELECT 1 FROM practice_questions
 WHERE student_id = NEW.student_id
 AND date >= date(NEW.date, '-14 days') AND date <= date(NEW.date, '+14 days')
 AND (signature = NEW.signature OR plain_prompt = NEW.plain_prompt)
)
BEGIN
 SELECT RAISE(ABORT, 'question_repeat');
END;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS practice_attempts (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL, run_id TEXT NOT NULL,
 question_id TEXT NOT NULL, seed TEXT NOT NULL, skill TEXT NOT NULL,
 answer TEXT NOT NULL, correct INTEGER NOT NULL, form_only INTEGER NOT NULL,
 try_number INTEGER NOT NULL, elapsed_ms INTEGER NOT NULL,
 prompt TEXT NOT NULL, right_answer TEXT NOT NULL, created_at TEXT NOT NULL,
 result TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS practice_attempt_student ON practice_attempts(student_id,created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS practice_ledger (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL, amount INTEGER NOT NULL,
 kind TEXT NOT NULL, note TEXT NOT NULL, run_id TEXT, created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS practice_prizes (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, cost INTEGER NOT NULL CHECK(cost > 0),
 active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS practice_requests (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL, prize_id TEXT NOT NULL,
 prize_name TEXT NOT NULL, cost INTEGER NOT NULL, status TEXT NOT NULL,
 created_at TEXT NOT NULL, reviewed_at TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS practice_pending_prize ON practice_requests(student_id,prize_id) WHERE status = 'pending';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS practice_backups (
 date TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL
);
