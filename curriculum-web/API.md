# Platform API

All paths below begin `/api/v2`. Every route requires a server session. All JSON
mutations enforce same-origin requests. Student IDs come from the session;
teachers may select `?studentId=...` or a body `studentId`. Students cannot call
teacher routes or write points/checks/prizes. Account passwords use bcrypt12.

## Student

- GET `/student/summary`: today's count, required target, bonus thresholds,
  points, week/day, review count, streak, weekly note and day strip. `schedule`
  contains 70 dates, per-day `expected`, `answered`, `remaining`, `dueAt` and
  status, plus completed/overdue totals. `schedule.backlog` is also exposed as
  `backlog`. Deadlines use America/Los_Angeles.
- GET `/student/map`: ten weeks, shifted dates and skill mastery.
- GET `/student/progress`: skills, daily counts and accuracy, checks and streaks.
- GET `/student/review`: due skills and their review stages.
- POST `/student/question` `{source,skill?,intent?}`: fresh or resumable question. Sources
  are `practice`, `review`, `learn`, `library`; the server marks assigned work.
  `intent: "daily"` stops at the daily goal and returns no new question after
  completion; omit it for explicit extra practice. `intent: "catchup"` with
  `source: "practice"` selects the oldest overdue lesson's introduced topics
  and returns no new question when no overdue work remains. Catch-up questions
  expose `courseCategory: "catchup"`, `courseDay` and `catchupForDate`.
  `review` with a skill only
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

The canonical backlog contains `behind`, `overdue`, `remainingToday`,
`requiredToDate`, `completedToDate`, `actualAnsweredToDate`, `catchupCredit`,
`catchupToday`, `oldestDueDate`, `nextCatchupDay`, `overdueDays`, `completedDays`
and `onTimeCompletions`. `behind` includes today's remaining goal; `overdue`
includes only earlier dates. `bankedCredit` is always zero. Each date's first
target answers count toward that date; surplus answers reduce oldest prior
deficits without prepaying future goals. Per-day `answered`, `onTimeCredited`
and `onTimeRemaining` retain actual/on-time history; `catchupCredit`, `credited`,
`remaining` and `caughtUp` show later catch-up progress. Bonus points and streaks
continue to use actual dated answers, not redistributed catch-up credits.

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

GET `/teacher/progress-summary?studentId=...` returns `student`, `today`,
`backlog`, compact `schedule`, `summary` and `progressReport`. Teacher dashboard
and student detail responses also expose the same `backlog` and `progressReport`.
The report contains a dated plain-text `text` snapshot plus `today`, `totals`,
`accuracy` (overall and weighted last seven days), `mastery`, `levels`, `focus`,
`streak`, `points` and `nextAction`. It excludes raw answers, contact addresses
and tutoring conversations. The dashboard lets the teacher copy or download
this text; there is no email-delivery endpoint or scheduled email automation.

POST `/teacher/checks` saves a week, score (0–21) and note. POST
`/teacher/notes` saves the student's weekly note. POST `/teacher/assignments`
creates skill/count/date-range work; DELETE `/teacher/assignments/:id` removes it.
GET `/teacher/plan` also returns `materialSource`, `diagnostics`,
`program.scheduleVersion`, and ten weeks with their seven `days`, skill labels,
`materials` and `downloadUrl`. Material references are pinned to reviewed Git
commit `604a82807488885cc5db31f6b1504b27b48076e1`.

POST `/teacher/plan` accepts `{week, days?, startDate?, preview?, expectedVersion?}`.
Choose either a signed integer `days` (at most 366 in magnitude) or an exact
`startDate`; the chosen week and every later week move together. `preview: true`
returns `{preview}` with `deltaDays`, before/after ranges, `affectedWeeks` and
`expectedVersion` without saving. Applying the same change with that version
rejects stale edits with 409. Weeks must remain ordered without overlap and dates
must stay between 2000 and 2100. The save updates offsets only; actual answers
and point-ledger rows are not rewritten.

GET `/teacher/materials/week/:week.zip` accepts weeks 1–10 and returns a private,
no-store ZIP download. It contains the seven canonical student PDFs, teacher
guide and a README with current assigned dates. Source fetches have size,
timeout, PDF-signature and pinned Git-blob-hash checks; caller-supplied URLs and
source branch archives are not accepted. A failed source fetch returns a clear
error, while individual reviewed PDF links remain on the curriculum page.

GET `/teacher/rewards` includes `program`, `pendingSettings`, `effectiveDate` and
`nextPoint:{answered,target,remaining,firstPointAt,every}` alongside balance,
prizes, requests and ledger. The Points & rewards UI edits daily/bonus rules via
PATCH `/teacher/settings`; these rules take effect the next day. Saved answers
can both reduce backlog and satisfy bonus thresholds. Downloading a worksheet
or recording a paper score does neither.

POST `/teacher/prizes` and PATCH `/teacher/prizes/:id` manage prizes. POST
`/teacher/requests/:id` accepts approve, decline or given; only given spends.
POST `/teacher/points` requires a reason and idempotent request ID. POST
`/teacher/flags` suspends a template; PATCH `/teacher/flags/:id` with `{resolved:true}` re-enables
it after correction. Teacher previews include answers and solutions.

Existing `/api/session`, `/api/login`, `/api/logout`, `/api/setup`, teacher
account/password and backup endpoints remain. Legacy practice/scoring mutations
are disabled in production. UI roles are teacher/student; the original database
encoding `parent` is retained only for compatibility with existing accounts.

## Request reuse

The browser API client coalesces concurrent identical GETs. Only
`/teacher/students` has a 30-second in-memory response cache; other records are
fetched anew. Mutations invalidate before and after execution, and late reads
from an earlier generation refetch under the current session. No answers,
progress or tutoring history are written to browser storage. Warm Worker service
reuse does not bypass per-request authentication or student-specific queries.

## Gradebook (v2)

Teacher routes require a teacher session and accept the selected `studentId`.
Student routes always use the authenticated student; a supplied ID cannot select
another student's records. Numerical grades and score bands are calculated in
code. New mutations require a stable `requestId` (8–100 letters, digits, `_` or
`-`); retries with identical content are idempotent and reused IDs with different
content fail with 409. Writes are audited and all new tables are backed up.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/v2/teacher/gradebook` | GET | Ten dated weeks, paper/online records, assessment catalog, scores, planning estimate and summary |
| `/api/v2/teacher/paper-days` | GET / POST | Read weekly paper records or save `{date,correct,total,minutes,note}` |
| `/api/v2/teacher/assessments` | GET / POST | List or add `{title,kind,week,plannedDate,maxScore,areas}` |
| `/api/v2/teacher/assessments/:id` | PATCH | Edit future assessment metadata without rewriting prior score snapshots |
| `/api/v2/teacher/assessments/:id/visibility` | PATCH | Set `{showScores}` for this test and selected student |
| `/api/v2/teacher/scores` | GET / POST | Read scores or add an attempt with `{assessmentId,score,takenOn,minutes,missed,note}` |
| `/api/v2/teacher/scores/:id` | PATCH | Correct an entry or record `{redoCompleted,redoNote}` |
| `/api/v2/teacher/gradebook/settings` | PATCH | Set `{showScores}` for the selected student |
| `/api/v2/student/gradebook` | GET | Own shared paper grades and test scores, with teacher notes and planning information excluded |

`missed:null` means unknown question-level coverage; an empty array means every
question was answered correctly. A complete missed list must be unique, in range,
and agree with the score. Areas use `{id,label,questions:[1,2,...]}`. Retakes are
new POSTs; corrections edit the existing score. Maximums are fixed on each saved
attempt, so changing a catalog total cannot rescale an old result.

`GRADEBOOK_INITIAL_SCORE_JSON` is an optional private runtime secret, never a
browser setting. It accepts an initial diagnostic import with `seedId`,
`assessmentId`, `score`, `maxScore` and optional `takenOn`/`note`. The import is
idempotent, only chooses an unambiguous single student, and does not overwrite
teacher-entered scores. A missing date stays unknown. No actual student result
is embedded in source or migrations.

## Private test documents and learning feedback

Blank PDFs belong to an assessment; completed-work PDFs belong to one student's
specific score attempt. Uploads require a teacher session, a selected student,
a stable request ID, `Content-Type: application/pdf`, and `X-File-Name` (URL-encoded).
The server validates the size and PDF header and stores bytes under private R2
keys. Document downloads require teacher authentication and use attachment
responses with no-store caching. Public static builds contain no PDF bytes.

Teacher document routes provide the selected test's attachments and review
history. Analysis sends only the selected blank/completed pair, the authoritative
score and question map, and allowed skill IDs to OpenAI using `store:false`.
It never changes scores. Requests are bounded, deduplicated and audited; failures
leave grading and uploads available. A review fingerprint binds it to current
documents and the saved grade revision. Teacher sharing is explicit; changed
inputs invalidate previously shared feedback.

`GET /api/v2/student/test-reviews` returns only that signed-in student's current,
teacher-shared reviews, subject to score visibility. Teacher notes and drafts are
excluded. Relevant review summaries, not PDF bytes, enter the bounded tutor
history context. The teacher's entered numerical grade remains authoritative.

The optional private `private/initial-test-documents.json` contains bundled blank
attachments for the private Site source only. The build validates it and embeds
it solely in server code; it is excluded from the public GitHub source mirror.
No actual grades are stored there. `OPENAI_TEST_REVIEW_MODEL` optionally selects
the document review model; `OPENAI_API_KEY` stays in private runtime settings.
