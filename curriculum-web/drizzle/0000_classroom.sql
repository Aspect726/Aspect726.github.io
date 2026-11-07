CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('teacher','student')), password TEXT NOT NULL, teacher_id TEXT REFERENCES users(id), created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS snapshots(id TEXT PRIMARY KEY,version TEXT NOT NULL,question TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY,submission_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),question_id TEXT NOT NULL REFERENCES snapshots(id),version TEXT NOT NULL,response TEXT NOT NULL,explanation TEXT NOT NULL DEFAULT '',status TEXT NOT NULL,feedback TEXT NOT NULL,result TEXT NOT NULL,hints INTEGER NOT NULL DEFAULT 0,solution_viewed INTEGER NOT NULL DEFAULT 0,active_seconds INTEGER NOT NULL DEFAULT 0,origin TEXT NOT NULL DEFAULT 'online',created_at TEXT NOT NULL,UNIQUE(user_id,submission_id));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS attempts_user_question ON attempts(user_id,question_id,created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS drafts(user_id TEXT NOT NULL REFERENCES users(id),question_id TEXT NOT NULL REFERENCES snapshots(id),response TEXT NOT NULL,explanation TEXT NOT NULL,scratch TEXT NOT NULL,revision INTEGER NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,question_id));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),question_id TEXT NOT NULL REFERENCES snapshots(id),type TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY,attempt_id TEXT NOT NULL REFERENCES attempts(id),teacher_id TEXT NOT NULL REFERENCES users(id),approved INTEGER NOT NULL,feedback TEXT NOT NULL,created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS assignments(student_id TEXT NOT NULL REFERENCES users(id),day_id TEXT NOT NULL,data TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(student_id,day_id));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS settings(teacher_id TEXT PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS extra_assignments(student_id TEXT NOT NULL REFERENCES users(id),question_id TEXT NOT NULL REFERENCES snapshots(id),assigned_at TEXT NOT NULL,note TEXT NOT NULL,PRIMARY KEY(student_id,question_id));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS one_teacher ON users(role) WHERE role='teacher';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS login_throttles (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);
