CREATE TABLE IF NOT EXISTS platform_assignments (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES practice_users(id),
 skill TEXT NOT NULL, count INTEGER NOT NULL CHECK(count BETWEEN 1 AND 100),
 start_date TEXT NOT NULL, end_date TEXT NOT NULL, created_by TEXT NOT NULL,
 created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS platform_weekly_checks (
 student_id TEXT NOT NULL REFERENCES practice_users(id), week INTEGER NOT NULL CHECK(week BETWEEN 1 AND 10),
 score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 21), note TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(student_id,week)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS platform_teacher_notes (
 student_id TEXT NOT NULL REFERENCES practice_users(id), week INTEGER NOT NULL CHECK(week BETWEEN 1 AND 10),
 text TEXT NOT NULL, PRIMARY KEY(student_id,week)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS platform_flags (
 id TEXT PRIMARY KEY, template_id TEXT NOT NULL, reason TEXT NOT NULL,
 created_by TEXT NOT NULL, resolved_at TEXT, created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_active_flags ON platform_flags(template_id,resolved_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS platform_prize_notes (
 prize_id TEXT PRIMARY KEY REFERENCES practice_prizes(id), note TEXT NOT NULL DEFAULT ''
);
--> statement-breakpoint
UPDATE practice_requests SET status = 'given' WHERE status = 'approved' AND EXISTS (SELECT 1 FROM practice_ledger WHERE id = 'prize:' || practice_requests.id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS platform_open_prize_request ON practice_requests(student_id,prize_id) WHERE status IN ('pending','requested','approved');
