# Double Advanced learning platform

A server-backed mathematics learning site for elementary and middle-school
students and their teachers, hosted on ChatGPT Sites at `donteventry.me`.
The host audience is public; application accounts protect learning records and
teacher controls. The supplied course plan and the user's later instructions
govern the learning experience.

Student routes: `/s/today`, `/s/map`, `/s/learn/:skill`, `/s/practice`, `/s/review`,
`/s/library`, `/s/progress`, `/s/rewards`. Teacher routes: `/t/dashboard`,
`/t/students/:id`, `/t/plan`, `/t/checks`, `/t/assign`, `/t/rewards`,
`/t/questions`, `/t/settings`. `/login` is the only signed-out page.

The interface uses a desktop sidebar, tablet rail, mobile drawer and full page
URLs. Cobalt, violet, yellow and coral accents, graphs, geometric illustrations
and short animations support a lesson-first layout. Reduced-motion preferences
are respected. Lessons, practice, review, rewards and teacher management share
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

Assignments lead the daily mix, followed by up to five due reviews, focus skills,
earlier weak skills and stretch. Difficulty adjusts after three correct or two
incorrect answers. Misses schedule fresh versions on days 1, 3 and 7. A correct
7-day review clears the entry. All practice sources share the same story quota;
concurrent requests reserve unique positions and scenarios. Question hashes
prevent repeats for the student across the program.

Teacher settings for daily and bonus targets take effect the next day. Week
shifts move that and all later weeks. Prize approval does not spend points;
marking a prize given spends them atomically. Manual corrections require a note.
Legacy production scoring endpoints return 410 and cannot bypass these rules.

## Help and AI tutor

Every question has a hint, worked steps and an answer that can be revealed
without changing progress or points. The optional AI helper can explain a
selected step or comment on the student's reasoning. Code still grades every
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

## Private release checks

`server/plan.json` is the authoritative course. The paper/slide corpus is private
validation input only; never put it in this repository or a public artifact.

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
