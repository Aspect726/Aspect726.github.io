# Platform API

All paths below begin `/api/v2`. Every route requires a server session. All JSON
mutations enforce same-origin requests. Student IDs come from the session;
teachers may select `?studentId=...` or a body `studentId`. Students cannot call
teacher routes or write points/checks/prizes. Account passwords use bcrypt12.

## Student

- GET `/student/summary`: today's count, required target, bonus thresholds,
  points, week/day, review count, streak, weekly note and day strip.
- GET `/student/map`: ten weeks, shifted dates and skill mastery.
- GET `/student/progress`: skills, daily counts and accuracy, checks and streaks.
- GET `/student/review`: due skills and their review stages.
- POST `/student/question` `{source,skill?}`: fresh or resumable question. Sources
  are `practice`, `review`, `learn`, `library`; the server marks assigned work.
- POST `/student/answer` `{questionId,answer,elapsedMs,requestId}`: exact grading,
  answer/solution after submission, summary, awarded points and milestone.
  Retry with the same ID; duplicate questions never count twice.
- GET `/student/library`: searchable skill rules, vocabulary and formulas.
- GET `/student/lesson?skill=...`: idea, picture, two worked examples and trap.
- POST `/student/lesson-complete` `{skill}` after the three guided questions.
- GET `/student/rewards`; POST `/student/rewards/:id/request`.

## Teacher

GET `/teacher/students`, `/teacher/dashboard`, `/teacher/students/:id`,
`/teacher/plan`, `/teacher/checks`, `/teacher/assignments`, `/teacher/rewards`,
`/teacher/questions`, `/teacher/settings` expose their respective views.

POST `/teacher/checks` saves a week, score (0–21) and note. POST
`/teacher/notes` saves the student's weekly note. POST `/teacher/assignments`
creates skill/count/date-range work; DELETE `/teacher/assignments/:id` removes it.
POST `/teacher/plan` shifts the chosen week and all later weeks.
PATCH `/teacher/settings` schedules next-day daily/bonus rules.

POST `/teacher/prizes` and PATCH `/teacher/prizes/:id` manage prizes. POST
`/teacher/requests/:id` accepts approve, decline or given; only given spends.
POST `/teacher/points` requires a reason and idempotent request ID. POST
`/teacher/flags` suspends a template; PATCH `/teacher/flags/:id` with `{resolved:true}` re-enables
it after correction. Teacher previews include answers and solutions.

Existing `/api/session`, `/api/login`, `/api/logout`, `/api/setup`, teacher
account/password and backup endpoints remain. Legacy practice/scoring mutations
are disabled in production. UI roles are teacher/student; the original database
encoding `parent` is retained only for compatibility with existing accounts.
