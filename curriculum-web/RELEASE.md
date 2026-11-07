# November 7 platform rebuild — verification

All six implementation stages are included: sidebar/login/roles; practice and
count-based points; student dashboard/map/progress/rewards; teacher management;
lessons/library/review/assignments/date shifts/question flags; responsive and
keyboard handling. Existing records are preserved by additive migrations.

## Passing checks

- 149 application, generator, API, concurrency and DOM tests; zero failures/skips.
- 295 templates, three difficulty levels, 500 cases per template/level. Independent
  numeric, geometry, statistics and method-choice checks total 592,500 checks.
  Per-skill counts and failures are in `validation/combined.json` and the three
  detailed reports alongside it.
- 2,322 private paper/slide records yield 2,469 frame segments (739 distinct).
  442,500 generated examples and all 168,960 approved seed/level pairs have zero
  matching paper templates. `validation/frames.json` contains aggregate evidence,
  not paper content. The original 4,550-question 70-day check also passes.
- 100 of 295 templates (33.9%) are everyday word-problem templates.
- Production Worker build and smoke check pass: real routes and JS module types,
  login, role isolation, private-path denial, vetted practice/lessons, saving an
  answer, and refusal of retired scoring endpoints.
- Tests cover 34→35→45→55 bonus thresholds, duplicate submissions, simultaneous
  submissions, legacy earned-point reconciliation, review stages, mastery, all
  skills' practice, delayed settings, week shifts, multi-student isolation,
  teacher-switch races, prize approval/giving and concurrent overspend.

## Limits that remain

- No stage screenshots, actual 1440px/390px visual inspection, Safari device test
  or real network load timing can be claimed. The managed browser fails at startup
  with “the gaas-browser node_repl sandbox cannot be disabled”. DOM tests verify
  interactions; responsive CSS and keyboard drawer handling are implemented.
- `donteventry.me` provider routing and SSL are active, but Sites still reports
  overall domain verification pending. The exact remaining TXT is in `DNS.md`.
  The Sites URL is the verified deployment address until validation completes.
- A flagged template can be suspended and re-enabled by a teacher. Correcting the
  underlying math template is a source-code change followed by the release checks;
  teachers cannot replace computed answer keys with unchecked text in the browser.
- The existing private Sites audience is retained. Test application credentials
  do not grant a new visitor access through that host-level gate.
- The exported scheduled backup handler has no verified host cron. Teacher backups
  work, including every new platform table. Private CI corpus secrets are not
  configured in the public GitHub repository; local private validation above ran.

The prior interface remains preserved in Git history; no public history rewrite
or unrequested deletion of existing accounts was performed.

## Visual revision

The subsequent student-facing revision replaces dark green surfaces with a light
blue/white graph-paper theme, math illustrations, blue graph lines and coral/gold
geometry accents. Thirteen interface tests and the compiled Worker smoke checks
pass. The shared browser remains unavailable; no visual screenshots are claimed.
