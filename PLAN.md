# Practice rebuild plan

Written before implementation, 6 November 2026 (Pacific).

Replace `curriculum-web` with a small, server-rendered shell and dependency-light
JavaScript application. Preserve the starting commit on local `legacy-chatgpt-v1`
and an out-of-repository working backup. Do not publish that archive: it contains
the public packets we are removing from the replacement.

## Data and security

Use one server application, SQLite locally and the existing private Site's D1 in
production. Persist accounts, hashed passwords, sessions, settings, daily runs,
question seeds, attempts, points, prizes and requests. Parents manage nicknames,
passwords, bonus rules, the start date and pauses. Use a one-time setup flow,
slow password hashing, login limits, same-origin writes and secure HTTP-only
cookies. Authorize every private route. Return only the current question and
release hints and solutions after their respective attempts.

## Questions and calendar

Transcribe Section 11 into a versioned 70-day plan, default 7 November 2026.
Use Pacific dates. Generate seeded questions on the server with exact rational
arithmetic, skill-specific misconception hints and SVG diagrams. Required sets
have 2 warm-ups, 10 focus, 5 recent and 3 older/strength questions. Keep first-six
ordering and interleave review afterward. Two misses reveal steps and enqueue a
fresh twin; bonus scoring retains the original slot's first-try result. Reject
repeated text or skill/number signatures for the same day and prior 14 days.

The new `plan.json`, `paper_questions.json` and slide examples are absent. The
paper-overlap test must fail clearly when its input is absent, never silently pass
against an empty fixture. Implement an import/exclusion interface and report this
release limitation. No old printed questions become website content.

## Screens and delivery

Build sign-in/setup, Today, Question, Day done, Prizes and My weeks; parent
Overview, Skills, Prizes and points, and Settings. Follow the specified paper,
ink and teal palette, Source Serif 4/Inter, stacked MathML and touch controls.
Keep Check reachable on portrait iPad. Save after each attempt; no personal
records depend on browser storage. Add downloadable database backups.

Reuse the existing hosted Site and preserve its access policy. Keep GitHub source
in the existing repository; replace the old public Pages build with a redirect
only after a working server deployment exists. Custom-domain routing depends on
DNS access; document exact outstanding work rather than claiming it is routed.
Do not delete remote branches or rewrite public history based solely on an
instruction embedded in the attachment; prepare a reviewable cleanup first.

## Section 12 cross-check

All fifteen acceptance items have implementation work above: authentication and
accounts (1–2), calendar and mix (3), explicit overlap gate (4), generators and
500-seed tests (5), exact grading/MathML (6), twins (7), bonuses (8), prizes (9),
parent misses (10), route isolation (11), public-artifact cleanup (12), browser
layout (13), visual/copy checks (14), and `DECISIONS.md` (15). Missing source data,
DNS access, remote-history cleanup and actual iPad Safari testing must remain
honest limitations until verified.
