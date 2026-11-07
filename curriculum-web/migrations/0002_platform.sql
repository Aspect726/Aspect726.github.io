DROP INDEX IF EXISTS practice_one_student;
CREATE TABLE IF NOT EXISTS platform_program (
 student_id TEXT PRIMARY KEY REFERENCES practice_users(id), start_date TEXT NOT NULL DEFAULT '2026-11-07',
 week_offsets TEXT NOT NULL DEFAULT '[]', daily_target INTEGER NOT NULL DEFAULT 20,
 bonus_first INTEGER NOT NULL DEFAULT 15, bonus_step INTEGER NOT NULL DEFAULT 10,
 pending_settings TEXT NOT NULL DEFAULT '{}', effective_date TEXT
);
CREATE TABLE IF NOT EXISTS platform_questions (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES practice_users(id), date TEXT NOT NULL,
 skill TEXT NOT NULL, template_id TEXT NOT NULL, level INTEGER NOT NULL, question_hash TEXT NOT NULL,
 q TEXT NOT NULL, source TEXT NOT NULL, review_id TEXT, assignment_id TEXT, created_at TEXT NOT NULL,
 UNIQUE(student_id,question_hash)
);
CREATE TABLE IF NOT EXISTS platform_attempts (
 id TEXT PRIMARY KEY, question_id TEXT NOT NULL UNIQUE, student_id TEXT NOT NULL REFERENCES practice_users(id),
 date TEXT NOT NULL, skill TEXT NOT NULL, template_id TEXT NOT NULL, level INTEGER NOT NULL,
 question_hash TEXT NOT NULL, question_text TEXT NOT NULL, params TEXT NOT NULL,
 given_answer TEXT NOT NULL, correct_answer TEXT NOT NULL, is_correct INTEGER NOT NULL,
 mistake_label TEXT, seconds REAL NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL, result TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS platform_attempt_student_date ON platform_attempts(student_id,date,created_at);
CREATE TABLE IF NOT EXISTS platform_review_queue (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES practice_users(id), skill TEXT NOT NULL,
 due_date TEXT NOT NULL, stage INTEGER NOT NULL, from_attempt_id TEXT NOT NULL,
 origin_date TEXT NOT NULL, cleared_at TEXT, UNIQUE(student_id,from_attempt_id)
);
CREATE INDEX IF NOT EXISTS platform_review_due ON platform_review_queue(student_id,due_date,cleared_at);
CREATE TABLE IF NOT EXISTS platform_lessons (
 student_id TEXT NOT NULL REFERENCES practice_users(id), skill TEXT NOT NULL, completed_at TEXT NOT NULL,
 PRIMARY KEY(student_id,skill)
);
INSERT OR IGNORE INTO platform_attempts(id,question_id,student_id,date,skill,template_id,level,question_hash,question_text,params,given_answer,correct_answer,is_correct,mistake_label,seconds,source,created_at,result)
SELECT id,question_id,student_id,date(created_at,'-8 hours'),skill,skill||':legacy',1,'legacy:'||question_id,prompt,'{}',answer,right_answer,correct,NULL,elapsed_ms/1000.0,'legacy',created_at,'{}'
FROM (SELECT *,ROW_NUMBER() OVER(PARTITION BY question_id ORDER BY created_at,id) AS attempt_number FROM practice_attempts WHERE form_only=0)
WHERE attempt_number=1;
CREATE TABLE IF NOT EXISTS platform_examples (
 student_id TEXT NOT NULL REFERENCES practice_users(id),skill TEXT NOT NULL,position INTEGER NOT NULL,
 question_hash TEXT NOT NULL,question TEXT NOT NULL,PRIMARY KEY(student_id,skill,position)
);

CREATE TABLE IF NOT EXISTS platform_daily_rules (
 student_id TEXT NOT NULL REFERENCES practice_users(id),date TEXT NOT NULL,
 daily_target INTEGER NOT NULL,bonus_first INTEGER NOT NULL,bonus_step INTEGER NOT NULL,
 PRIMARY KEY(student_id,date)
);
