-- Learning history is durable. It is deliberately separate from the seven-day
-- AI request cache and is never deleted by cache housekeeping.
CREATE TABLE IF NOT EXISTS platform_tutor_events (
 id TEXT PRIMARY KEY,
 student_id TEXT NOT NULL REFERENCES practice_users(id),
 question_id TEXT NOT NULL REFERENCES platform_questions(id),
 skill TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('hint','step','answer')),
 part INTEGER NOT NULL DEFAULT 0,
 request_id TEXT NOT NULL,
 created_at TEXT NOT NULL,
 UNIQUE(student_id,request_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_tutor_events_skill
 ON platform_tutor_events(student_id,skill,created_at,id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_tutor_events_question
 ON platform_tutor_events(student_id,question_id,created_at,id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS platform_tutor_conversations (
 id TEXT PRIMARY KEY,
 student_id TEXT NOT NULL REFERENCES practice_users(id),
 question_id TEXT NOT NULL REFERENCES platform_questions(id),
 skill TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN ('explain','check-reasoning')),
 part INTEGER NOT NULL DEFAULT 0,
 message TEXT NOT NULL,
 reply TEXT NOT NULL,
 assessment TEXT NOT NULL CHECK(assessment IN ('sound','needs_work','unclear')),
 source TEXT NOT NULL CHECK(source IN ('ai','worked-help')),
 request_id TEXT NOT NULL,
 created_at TEXT NOT NULL,
 UNIQUE(student_id,request_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_tutor_conversations_skill
 ON platform_tutor_conversations(student_id,skill,created_at,id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_tutor_conversations_question
 ON platform_tutor_conversations(student_id,question_id,created_at,id);
--> statement-breakpoint
-- Preserve stable retry identity when the AI response cache also keys by history.
ALTER TABLE platform_ai_requests ADD COLUMN request_hash TEXT;
--> statement-breakpoint
UPDATE platform_ai_requests SET request_hash=content_hash WHERE request_hash IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_attempt_student_skill_time
 ON platform_attempts(student_id,skill,created_at);
