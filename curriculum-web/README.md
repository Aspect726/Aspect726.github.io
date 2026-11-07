# Double Advanced learning platform

A private, server-backed learning platform for students and teachers, hosted on
ChatGPT Sites. The November 7 redesign brief is the current specification.

Student routes: `/s/today`, `/s/map`, `/s/learn/:skill`, `/s/practice`, `/s/review`,
`/s/library`, `/s/progress`, `/s/rewards`. Teacher routes: `/t/dashboard`,
`/t/students/:id`, `/t/plan`, `/t/checks`, `/t/assign`, `/t/rewards`,
`/t/questions`, `/t/settings`. `/login` is the only signed-out page.

The interface uses a 248px sidebar, 72px tablet rail, mobile drawer, full page
URLs and a distraction-free practice mode. Lessons, course dates, daily work,
review, rewards and teacher management all use the same persistent database.

## Local development

Requires Node 24. Run `npm ci`, `npm test`, then `npm start`. SQLite data stays in
ignored `private/`. Production runs the same Request/Response handlers on D1.
Applied migrations are immutable; new platform tables preserve prior accounts,
attempts, points and prizes. Local migrations are recorded and run once.

## Current practice rules

Each submitted question counts once, whether right or wrong. Empty and invalid
input does not count. An equivalent answer that needs simplest form can be fixed
without spending the question. Default required total is 20; points are awarded
at 35, 45, 55 and each further 10 answered questions. Learn, Library and Review
count too. Unique answer rows and ledger keys prevent duplicate awards.

Assignments lead the daily mix, followed by up to five due reviews, focus skills,
earlier weak skills and stretch. Difficulty adjusts after three correct or two
incorrect answers. Misses schedule fresh versions on days 1, 3 and 7. A correct
7-day review clears the entry. Question hashes prevent program-wide repeats.

Teacher settings for daily and bonus targets take effect the next day. Week
shifts move that and all later weeks. Prize approval does not spend points;
marking a prize given spends them atomically. Manual corrections require a note.
Legacy production scoring endpoints return 410 and cannot bypass these rules.

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

The build requires checked seed and frame evidence, validates provenance hashes,
and serves only the login shell, UI modules, styles and fonts. No corpus, seed
pool or answer-key module is public. Frame normalization removes numbers before
comparing templates to all printed-sheet and slide segments. Generator tests
independently check 500 examples per template at each difficulty.

## Accounts and backups

The existing private Sites access policy remains. Each person then signs in with
a student or teacher application account. Teacher Settings creates accounts and
resets passwords. Resetting a password revokes that person's sessions. Demo
accounts requested for acceptance are provisioned from a host secret; their
credentials are not in source and deployment never resets an existing password.

Teacher Settings can save and download a private database backup, including the
new learning tables. Exports include password hashes and should stay private.
The Worker has a scheduled backup handler; a host cron must be configured before
nightly operation can be claimed.

See `RELEASE.md` for the current verification report and remaining limits.
