-- An absent row means this assessment is visible. The student's global grade
-- visibility setting still takes precedence over every assessment setting.
CREATE TABLE IF NOT EXISTS platform_assessment_visibility (
 student_id TEXT NOT NULL REFERENCES practice_users(id),
 assessment_id TEXT NOT NULL REFERENCES platform_assessments(id),
 show_scores INTEGER NOT NULL DEFAULT 1 CHECK(show_scores IN (0,1)),
 updated_by TEXT NOT NULL REFERENCES practice_users(id),
 updated_at TEXT NOT NULL,
 PRIMARY KEY(student_id,assessment_id)
);
