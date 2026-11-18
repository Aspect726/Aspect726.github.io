CREATE TABLE IF NOT EXISTS platform_assessments (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('standards','practice','weekly','checkpoint','rehearsal','final','custom')),
 title TEXT NOT NULL, week INTEGER CHECK(week BETWEEN 1 AND 10), planned_date TEXT,
 day_offset INTEGER, max_score INTEGER NOT NULL CHECK(max_score BETWEEN 1 AND 500),
 weight REAL NOT NULL DEFAULT 0 CHECK(weight BETWEEN 0 AND 100), areas TEXT NOT NULL DEFAULT '[]',
 band_policy TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 built_in INTEGER NOT NULL DEFAULT 0 CHECK(built_in IN (0,1)), created_by TEXT REFERENCES practice_users(id),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS platform_scores (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES practice_users(id),
 assessment_id TEXT NOT NULL REFERENCES platform_assessments(id), attempt INTEGER NOT NULL CHECK(attempt>0),
 taken_on TEXT, score INTEGER NOT NULL CHECK(score>=0), max_score INTEGER NOT NULL CHECK(max_score BETWEEN 1 AND 500 AND score<=max_score),
 minutes INTEGER CHECK(minutes BETWEEN 0 AND 1440), missed TEXT, by_area TEXT NOT NULL DEFAULT '[]',
 note TEXT NOT NULL DEFAULT '', redo_due TEXT, redo_completed INTEGER NOT NULL DEFAULT 0 CHECK(redo_completed IN (0,1)), redo_note TEXT NOT NULL DEFAULT '',
 title_snapshot TEXT NOT NULL, kind_snapshot TEXT NOT NULL, week_snapshot INTEGER,
 band_policy TEXT NOT NULL, weight_snapshot REAL NOT NULL DEFAULT 0, areas_snapshot TEXT NOT NULL DEFAULT '[]',
 entered_by TEXT REFERENCES practice_users(id), source TEXT NOT NULL DEFAULT 'teacher',
 grade_revision INTEGER NOT NULL DEFAULT 1 CHECK(grade_revision>0),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(student_id,assessment_id,attempt)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_scores_student ON platform_scores(student_id,taken_on,created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS platform_paper_days (
 student_id TEXT NOT NULL REFERENCES practice_users(id), date TEXT NOT NULL,
 correct INTEGER NOT NULL CHECK(correct>=0), total INTEGER NOT NULL CHECK(total BETWEEN 1 AND 500 AND correct<=total),
 minutes INTEGER CHECK(minutes BETWEEN 0 AND 1440), note TEXT NOT NULL DEFAULT '',
 entered_by TEXT NOT NULL REFERENCES practice_users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY(student_id,date)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS platform_gradebook_settings (
 student_id TEXT PRIMARY KEY REFERENCES practice_users(id), show_scores INTEGER NOT NULL DEFAULT 1 CHECK(show_scores IN (0,1)),
 updated_by TEXT REFERENCES practice_users(id), updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS platform_grade_requests (
 actor_id TEXT NOT NULL REFERENCES practice_users(id), request_id TEXT NOT NULL,
 operation TEXT NOT NULL, payload TEXT NOT NULL, response TEXT NOT NULL, applied INTEGER NOT NULL DEFAULT 0 CHECK(applied IN (0,1)),
 created_at TEXT NOT NULL, PRIMARY KEY(actor_id,request_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS platform_grade_audit (
 id TEXT PRIMARY KEY, actor_id TEXT REFERENCES practice_users(id), student_id TEXT REFERENCES practice_users(id),
 action TEXT NOT NULL, target_id TEXT NOT NULL, before_json TEXT, after_json TEXT NOT NULL, created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_grade_audit_student ON platform_grade_audit(student_id,created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS platform_grade_imports (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES practice_users(id), score_id TEXT NOT NULL REFERENCES platform_scores(id), created_at TEXT NOT NULL
);
