# November 14 learning-site revision — verification

The standard daily set now contains six warm-ups and 14 multi-step stories.
Stories use named people, concrete quantities, two to four dependent steps,
clean computed answers and units. Fourteen distinct scenarios appear in each
set, across missing amounts, comparisons, working backward, mistake correction
and what-if questions. Every question includes a hint and full worked answer.
Exact code grading remains authoritative; contextual AI feedback is separate.

The student experience leads with lessons, examples and practice. Cobalt, violet,
yellow and coral accents, graphs and geometric illustrations replace the earlier
beige/navy treatment. Desktop sidebar, tablet rail, mobile drawer, aligned
workbook layouts and all teacher management controls are retained. Short
animations respect reduced-motion settings. Additive migrations preserve
accounts, existing attempts, progress and points.

## Checked question bank

- Original mathematics evidence is retained: 295 templates, three difficulty
  levels, 500 cases per template/level and 592,500 independent numeric, geometry,
  statistics and method-choice checks. See `validation/combined.json` and its
  detailed reports. These are the original generator totals, not story coverage.
- New story suites check 33,600 arithmetic, 19,200 geometry and 72,000 statistics
  cases. Additional regressions cover incorrect mistake claims, inverse-answer
  leaks, dependent operations and the frequency-table correction sequence.
- The private corpus has 2,322 records, yielding 2,469 paper/slide segments and
  739 distinct number-free frames. Original exact/numeric exclusions and the
  original 4,550-question course check still pass.
- All 264,000 approved story seed/level entries pass exact, numeric and
  number-free paper-frame checks. Each of 55 skills at three levels has 1,600
  entries spanning 16 scenarios and five shapes. Candidate validation excluded
  1,499 numeric paper overlaps and 16,073 duplicate parameter sets.
- The 70-day story check materializes 1,400 required questions: 980 stories and
  420 warm-ups, with 14 unique story scenarios each day and no repeated question.
  Single-skill scenario capacity passes for all 165 skill/level combinations.
- Frame validation additionally rechecks 442,500 legacy template samples and
  all 168,960 approved legacy seed/level pairs, with zero paper-frame matches.
  Aggregate evidence is in `validation/frames.json` and `validation/stories.json`.
  The compact combined private seed pool is approximately 6.7 MB.
- Builds require current generator hashes, pool digests and complete legacy and
  story evidence. They reject missing or stale validation. Paper content,
  checked seeds, secrets and private QA fixtures are excluded from the public
  repository and public assets. Answer-key modules are never public assets.

## Runtime and interface verification

The final full suite passes **215 tests with zero failures or skips**. The
production Worker build and extended compiled Worker smoke check pass, including
persistent tutor history, help events, teacher isolation and worked-help fallback.
Independent review exercised 39 tests and found three issues; the request race,
mistake grouping and stale teacher-navigation issues are fixed and rechecked.

The expanded visual review rendered 31 desktop/tablet/phone views with zero page
errors and no horizontal document overflow. Actual screenshot inspection found
and corrected mobile table-header alignment. Student/teacher home, lessons,
plan, story practice, worked help and AI controls are included. A further 12
saved-history views used the production checked question pool, also with zero
page errors or overflow. Five help events, one conversation and six answers
persisted; reload restored the student conversation, and teacher desktop/phone
views displayed the saved history.
Screenshots come from real sandboxed Chromium rendering of the application
against an isolated SQLite backend.

Regression coverage includes six/14 quotas across 70 days and all learning
sources, unique concurrent slots/scenarios, resuming pending questions, units
and option grading, ownership-checked help, saved answers, role isolation,
bonus thresholds, duplicate submissions, review stages, mastery, settings,
week shifts, teacher actions and prize spending.

AI requests use computed reference answers and bounded relevant learning
history. Conversations and help use persist separately from the seven-day
provider request cache and are available to the student and teacher. Teacher
settings provide enable/disable and per-student/classroom allowances. Tests use
controlled provider responses to exercise limits, caching, failures and feedback
without giving AI authority over grades.

## Deployment facts and remaining limits

- The current ChatGPT Sites audience is **public**, confirmed from site version
  11 during this revision. Application student/teacher sign-in protects records
  and management. Namecheap remains the DNS provider; no DNS changes are needed
  for this interface and question-bank release.
- Sites freshly confirmed `donteventry.me` active with active SSL on November 14,
  2026. Publication status is reported by the saved Sites version, separately
  from these build and application checks.
- The provider key is a server runtime secret. Default `gpt-5-nano`/minimal
  switches to `gpt-6-luna`/none on December 11, 2026, or an explicit
  `404/model_not_found` response. Live OpenAI calls from the workspace are blocked
  by its proxy with 403, so provider operation is **not yet live-verified**.
  Worked hints and answers remain available when AI is unavailable.
- No Safari device test or production network load timing is claimed from
  isolated Chromium checks. Screenshots and test-account credentials are private.
- Teachers can suspend and re-enable a question shape; changing mathematical
  generators still requires a source change and the release checks.
- The scheduled backup handler has no verified host cron. Teacher backups include
  learning and tutor-history tables. Private corpus CI secrets are not configured
  in the public GitHub repository; the private validation described above ran
  locally. Existing Git history and accounts are preserved.
