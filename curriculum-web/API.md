# Platform API

All paths below begin `/api/v2`. Every route requires a server session. All JSON
mutations enforce same-origin requests. Student IDs come from the session;
teachers may select `?studentId=...` or a body `studentId`. Students cannot call
teacher routes or write points/checks/prizes. Account passwords use bcrypt12.

## Student

- GET `/student/summary`: today's count, required target, bonus thresholds,
  points, week/day, review count, streak, weekly note and day strip. `schedule`
  contains 70 dates, per-day `expected`, `answered`, `remaining`, `dueAt` and
  status, plus completed/overdue totals. Deadlines use America/Los_Angeles.
- GET `/student/map`: ten weeks, shifted dates and skill mastery.
- GET `/student/progress`: skills, daily counts and accuracy, checks and streaks.
- GET `/student/review`: due skills and their review stages.
- POST `/student/question` `{source,skill?,intent?}`: fresh or resumable question. Sources
  are `practice`, `review`, `learn`, `library`; the server marks assigned work.
  `intent: "daily"` stops at the daily goal and returns no new question after
  completion; omit it for explicit extra practice. `review` with a skill only
  serves a due question for that skill. Automatic selection uses introduced
  topics; explicit teacher assignments and chosen lesson/library skills are
  allowed ahead. All sources share six warm-ups/14 stories per standard set.
  Story metadata includes `story`, `scenarioId`, `storyShape`, `stepCount`,
  `answerUnit`, `choiceLabels` when comparing, `stage` and `setPosition`.
- POST `/student/answer` `{questionId,answer,elapsedMs,requestId}`: exact grading,
  answer/solution after submission, summary, awarded points and milestone.
  Retry with the same ID; duplicate questions never count twice.
  Include units for a story and A/B for a comparison. A `formOnly` response
  allows a missing/wrong unit or required answer form to be fixed without
  consuming the question. AI feedback never changes this grading result.
- POST `/student/help` `{questionId}`: owned question's hint, worked `steps`,
  formatted `answer`, `answerUnit` and comparison `choiceLabels`. Available
  before and after submission; retrieving help does not change progress.
- GET `/student/library`: searchable skill rules, vocabulary, formulas and
  curriculum stages, prerequisites, standards and sources.
- GET `/student/lesson?skill=...`: idea, picture, two worked examples, trap and
  curriculum metadata. Foundation availability never implies mastery.
- POST `/student/lesson-complete` `{skill}` after the three guided questions.
- GET `/student/rewards`; POST `/student/rewards/:id/request`.

## Tutor and learning history

- GET `/student/tutor-status`: `{available,remaining}` for the current student.
- POST `/student/tutor` `{questionId,message,mode,part,requestId}`: contextual
  explanation or reasoning check. `message` is 1–600 characters; `mode` is
  `explain` or `check-reasoning`; `part` is 0 for the whole question or a 1-based
  worked step. The question must belong to the student. The response includes
  `reply`, `assessment` (`sound`, `needs_work`, `unclear`), `source` (`ai` or
  `worked-help`) and `remaining`; fallback responses also include a notice.
  Duplicate request IDs are idempotent; reusing an ID for different content
  returns 409. Teacher pause, missing configuration, limits and provider failure
  retain deterministic worked help.
- GET `/student/tutor-history?questionId=...`: the student's saved conversation
  for an owned question. Returns `{conversations}` with the latest ten turns in
  chronological order. Each has `id`, `questionId`, `studentMessage`, `tutorReply`,
  `mode`, `part`, `assessment`, `source` and `createdAt`.
- POST `/student/help-event` `{questionId,kind,part,requestId}` records opening
  a `hint`, `step` or `answer`; `part` is a 1-based step or 0 otherwise. Returns
  `{ok,event:{id,kind,part,createdAt},duplicate}`. Help use does not count as a
  correct answer or evidence of mastery.
- GET/POST `/teacher/ai-settings`: availability, model, allowance, daily usage
  and last provider issue. POST accepts `{enabled,studentDailyLimit,
  globalDailyLimit}` with bounds 1–100 and 1–1000, respectively; defaults are
  30 requests per student and 300 per classroom. No provider key is exposed.
- GET `/teacher/tutor-history?studentId=...&skill=...&limit=...&cursor=...`:
  selected student's learning timeline and progress; `skill`, `limit` and
  `cursor` are optional. `limit` defaults to 30 and accepts 1–100. Returns
  `student`, `skills`, `skillSummaries` (attempts, correct, accuracy, last practice),
  `helpSummary`, `commonMistakes`, newest-first `items` (answers, help events,
  conversations) and `pagination:{limit,nextCursor,hasMore}`. Teacher
  authorization and student existence are checked.

Conversation and help-event records are durable, included in private backups
and have no automatic expiry. The seven-day provider request cache is separate.
Provider context contains at most six relevant attempts, three conversations and
eight help events, pruned to about 2,200 characters; it excludes account names
and identifiers. Students can only access their own questions and conversations.

The provider receives the code-computed reference and bounded, relevant learning
history, with `store:false`. Replies are explanatory feedback only. Production
configuration reads `OPENAI_API_KEY` and optional `OPENAI_TUTOR_MODEL` on the
server. The model defaults to `gpt-5-nano` with minimal reasoning; it switches to
`gpt-6-luna` with no reasoning on December 11, 2026, or a provider
`404/model_not_found` response. The request output cap is 700 tokens.

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
