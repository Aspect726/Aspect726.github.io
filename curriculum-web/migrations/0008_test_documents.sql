-- Raw PDFs live in private object storage. These tables contain access metadata
-- and reviewed learning feedback; none is part of the public static build.
CREATE TABLE IF NOT EXISTS platform_test_documents (
 id TEXT PRIMARY KEY,
 assessment_id TEXT NOT NULL REFERENCES platform_assessments(id),
 score_id TEXT REFERENCES platform_scores(id),
 student_id TEXT REFERENCES practice_users(id),
 kind TEXT NOT NULL CHECK(kind IN ('blank','completed')),
 filename TEXT NOT NULL, storage_key TEXT NOT NULL UNIQUE,
 size INTEGER NOT NULL CHECK(size>0 AND size<=10485760), digest TEXT NOT NULL,
 uploaded_by TEXT REFERENCES practice_users(id), created_at TEXT NOT NULL,
 CHECK((kind='blank' AND score_id IS NULL AND student_id IS NULL) OR
       (kind='completed' AND score_id IS NOT NULL AND student_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS platform_test_documents_assessment ON platform_test_documents(assessment_id,kind,created_at);
CREATE INDEX IF NOT EXISTS platform_test_documents_score ON platform_test_documents(score_id,created_at);
CREATE TABLE IF NOT EXISTS platform_test_reviews (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES practice_users(id),
 score_id TEXT NOT NULL REFERENCES platform_scores(id),
 blank_document_id TEXT NOT NULL REFERENCES platform_test_documents(id),
 work_document_id TEXT NOT NULL REFERENCES platform_test_documents(id),
 fingerprint TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','ready','failed')),
 analysis TEXT, issue TEXT, model TEXT NOT NULL,
 input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0,
 shared INTEGER NOT NULL DEFAULT 0 CHECK(shared IN (0,1)),
 requested_by TEXT NOT NULL REFERENCES practice_users(id),
 shared_by TEXT REFERENCES practice_users(id), shared_at TEXT,
 date TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS platform_test_reviews_student ON platform_test_reviews(student_id,status,shared,created_at);
CREATE INDEX IF NOT EXISTS platform_test_reviews_cache ON platform_test_reviews(score_id,fingerprint,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS platform_test_reviews_pending ON platform_test_reviews(score_id,fingerprint) WHERE status='pending';
CREATE TABLE IF NOT EXISTS platform_test_document_requests (
 actor_id TEXT NOT NULL REFERENCES practice_users(id), request_id TEXT NOT NULL,
 operation TEXT NOT NULL, payload_hash TEXT NOT NULL, target_id TEXT NOT NULL,
 created_at TEXT NOT NULL, PRIMARY KEY(actor_id,request_id)
);
