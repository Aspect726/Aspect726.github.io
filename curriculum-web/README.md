# Double Advanced learning platform

A server-backed mathematics learning site for elementary and middle-school
students and their teachers, hosted on ChatGPT Sites at `donteventry.me`.
The host audience is public; application accounts protect learning records and
teacher controls. The supplied course plan and the user's later instructions
govern the learning experience.

Student routes: `/s/today`, `/s/extra`, `/s/map`, `/s/learn/:skill`, `/s/practice`, `/s/review`,
`/s/library`, `/s/progress`, `/s/rewards`. Teacher routes: `/t/dashboard`,
`/t/students/:id`, `/t/plan`, `/t/checks`, `/t/assign`, `/t/rewards`,
`/t/questions`, `/t/settings`. `/login` is the only signed-out page.

The interface uses a desktop sidebar, tablet rail, mobile drawer and full page
URLs. Cobalt, violet, yellow and coral accents, graphs, geometric illustrations
and two original geometry characters support a lesson-first layout. Short
celebrations follow saved answers and completed work; reduced-motion preferences
are respected and motion never blocks the next question. Lessons, practice, review, rewards and teacher management share
the same persistent database.

## Local development

Requires Node 24. Run `npm ci`, `npm test`, then `npm start`. SQLite data stays in
ignored `private/`. Production runs the same Request/Response handlers on D1.
Applied migrations are immutable; new platform tables preserve prior accounts,
attempts, points and prizes. Local migrations are recorded and run once.

## Current practice rules

Each standard set of 20 contains six short warm-ups and 14 story problems.
Stories use named people, concrete quantities and two to four dependent steps,
with 14 different scenarios per set. The five question shapes are missing
amounts, comparing options, working backward, fixing a mistake and what-if
follow-ups. Parameters and exact answers are computed in code. Story answers
require units; comparison answers also identify the better option. Missing or
incorrect units can be fixed without spending the question.

Each submitted question counts once, whether right or wrong. Empty and invalid
input does not count. An equivalent answer that needs simplest form can be fixed
without spending the question. Default required total is 20; points are awarded
at 35, 45, 55 and each further 10 answered questions. Learn, Library and Review
count too. Unique answer rows and ledger keys prevent duplicate awards.

The daily task starts on Saturday, November 7, 2026, and runs for 70 days.
The server supplies Pacific-time deadlines, including daylight-saving changes.
The student page shows answers completed today, questions remaining and a live
countdown. A shared backlog count separates earlier overdue questions from work
still due today. The calendar includes every scheduled date, even with no answers.
Each date's first target answers fulfill that date's goal; extra answers reduce
the oldest already-due deficits. They never prepay future goals. Actual answers
stay on their completion date, and catch-up credit is shown separately so the
on-time history and streak remain accurate. Daily mode stops at the goal. Extra
practice and five-question catch-up sessions remain available afterward;
catch-up focuses on the oldest unfinished lesson's introduced topics.

The teacher sidebar has four main destinations: Overview, Curriculum & dates,
Student work, and Points & rewards. Settings contains accounts, helper access
and backups. The overview opens directly to the selected student's current
lesson, daily work, catch-up progress and weekly note. A single student needs
no selector. Practice tasks and question samples sit under Curriculum; paper
checks remain available from Student work. A dated progress
update can be copied or downloaded as plain text for the teacher to send manually;
no email is sent or scheduled. The update uses the same student-specific metrics
as the visible counters and excludes raw answers and tutoring conversations.

The topic mix has two foundation, ten focus, five recent and three older review
positions. Explicit teacher assignments and due reviews can use these positions.
Automatic practice stays within introduced topics; short teaching bridges fill
missing prerequisites without rewriting the supplied plan. Grade 5 foundations
are available for review, but never assumed mastered. General fraction division,
ratios, percentages and fractional volume are introduced as new learning. Difficulty adjusts after three correct or two
incorrect answers. Misses schedule fresh versions on days 1, 3 and 7. A correct
7-day review clears the entry. All practice sources share the same story quota;
concurrent requests reserve unique positions and scenarios. Question hashes
prevent repeats for the student across the program.

Daily and bonus rules are edited in Points & rewards, with today's active rules
and tomorrow's pending changes shown separately. A numerical preview explains
when each point is earned. A catch-up answer can both reduce earlier unfinished
work and count toward a bonus threshold; points and backlog are separate totals.
Changes to daily and bonus targets take effect the next day. Week shifts move
the selected week and all later weeks, using earlier/later controls or an exact
date. The preview names affected weeks; overlapping dates and stale concurrent
edits are rejected. Prize approval does not spend points;
marking a prize given spends them atomically. Manual corrections require a note.
Legacy production scoring endpoints return 410 and cannot bypass these rules.

## Help and AI tutor

Every question has a hint, worked steps and an answer that can be revealed
without changing progress or points. The optional AI helper can explain a
selected step or comment on the student's reasoning. Question-specific quick
actions focus the message on a worked step or the student's attempted method.
Only submitting a message requests a new explanation; failed requests retain
the same request ID when retried. Code still grades every
answer; AI feedback cannot change a score. If AI is paused, unavailable or at
its allowance, the computed worked help remains available.

Tutor conversations and help use are saved as student learning history and are
visible to the teacher. Relevant recent history informs later explanations;
it is not treated as proof of mastery. Teacher Settings controls AI availability
and per-student/classroom daily allowances.

Production reads `OPENAI_API_KEY` from a server runtime secret and optional
`OPENAI_TUTOR_MODEL` from runtime configuration. Never put a key in source,
browser assets or a public repository. The default is `gpt-5-nano` with minimal
reasoning, switching to `gpt-6-luna` with no reasoning on December 11, 2026, or
after a provider `404/model_not_found` response. Live provider verification is
separate from mocked integration tests; see `RELEASE.md`.

## Curriculum materials and navigation

The November 17 upload on the GitHub `Curriculum` branch was reviewed at commit
`604a82807488885cc5db31f6b1504b27b48076e1`. Its 70-day plan is identical to the
existing plan, so the teaching sequence and saved progress are retained. Revised
PDF questions required a new private no-repeat check. The teacher curriculum
page lists all 70 days and references 82 reviewed PDFs: 70 canonical student
sheets, ten teacher guides and the Grade 5 diagnostic with its key.

Download week produces a standard ZIP containing seven student sheets, the
teacher guide with answer keys, and a README showing the student's assigned
dates. PDF bytes are checked against pinned Git blob hashes. The PDFs retain
their original printed dates; rescheduling changes the website calendar and ZIP
README, not the PDF contents. Downloads never include the source branch archive
or `For_ChatGPT/` test inputs. See `docs/curriculum-update-2026-11-17.md` for the
audit, the excluded duplicate sheet and the source's Thanksgiving-date correction.

Navigation coalesces identical in-flight GET requests and briefly caches only
the teacher's student list. Progress, points, answers and conversations are not
cached in browser storage. Mutations and account/session changes invalidate
client state. The Worker reuses initialized services and immutable assets while
still authenticating every request. Page loading feedback and keyboard focus
make navigation clear while data loads. These changes remove redundant work;
production network timing is not yet measured.

The educational design rationale and linked research are in
`docs/ux-review-2026-11-17.md`.

## Private release checks

`server/plan.json` preserves the supplied dates and original focus topics.
`server/curriculum.mjs` adds Grade 5, IMT1 and selected early IMT2 teaching targets,
prerequisites and dated bridges. See `docs/curriculum-audit.md` for BSD sources,
standard mappings and course-boundary limits. Teachers can inspect this mapping
in Curriculum & dates. The paper/slide corpus and revised-PDF extraction are
private validation input only; never put them in a public repository or artifact.
The current combined check uses 4,485 records: the 2,322 original records,
2,123 revised numbered PDF questions, and 40 worked reminder boxes.

```
PAPER_QUESTIONS_PATH=/private/paper_questions.json npm run test:paper -- --write-pool
PAPER_QUESTIONS_PATH=/private/paper_questions.json VETTED_SEEDS_PATH=private/vetted-seeds.json FRAME_REPORT_PATH=private/frame-validation.json npm run test:frames
npm test
npm run build
node scripts/smoke-worker.mjs
```

The build requires checked legacy and story pools, frame evidence and source
provenance hashes. It rejects stale evidence. The approved story pool contains
1,600 entries per skill/difficulty, covering 16 scenarios and all five shapes.
Exact, numeric and number-free frame checks exclude the private printed-sheet
and slide material. The original 4,550-question course check is retained; a
second check materializes all 70 days with the six/14 mix.

Only aggregate validation reports belong in the public repository. The private
corpus, seed pool, credentials and private QA fixtures are never copied into the
public mirror. Public assets contain no private data or answer-key modules.

## Accounts and backups

The current Sites audience is public. Each person signs in with a student or
teacher application account. Teacher Settings creates accounts and
resets passwords. Resetting a password revokes that person's sessions. Demo
accounts requested for acceptance are provisioned from a host secret; their
credentials are not in source and deployment never resets an existing password.

Teacher Settings can save and download a private database backup, including the
new learning tables. Exports include password hashes and should stay private.
The Worker has a scheduled backup handler; a host cron must be configured before
nightly operation can be claimed.

See `RELEASE.md` for the current verification report and remaining limits.
