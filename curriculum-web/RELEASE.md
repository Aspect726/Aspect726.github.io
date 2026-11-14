# November 14 daily learning, catch-up and teacher update

Students now begin with one clear daily task: 20 questions a day from Saturday,
November 7, 2026, over the supplied 70-day plan. The main page shows actual
answers today, remaining work, a Pacific-time due-date countdown and the
teacher’s weekly note. Extra practice and Review are the two supporting choices;
lessons, tools and detailed progress remain available behind secondary links.
Daily mode stops at the goal. A prominent backlog count appears across the
student's pages and throughout teacher management. It separates earlier overdue
work from today's remaining goal: with no answers on November 14, the count is
160 questions behind (140 earlier, 20 today). Completing today's 20 leaves 140;
five extra answers reduce it to 135. These values are calculated from dates and
saved work, not hardcoded.

Each date's first target answers satisfy that date; surplus answers pay down the
oldest already-due deficits without prepaying future work. Actual dated answers
and on-time streaks remain intact, while the calendar separately shows later
catch-up credit. Five-question catch-up sessions follow the oldest unfinished
lesson's introduced topics. Teacher views use the same canonical counts and
show all 70 scheduled dates, including unanswered days.

The teacher dashboard is centered on one student, with daily work, catch-up
progress, accuracy, skills, website difficulty levels and the weekly note
together. A dated progress update can be copied or downloaded for manual sharing.
It includes overall and recent accuracy, focus, points and next steps, without
raw answers or tutoring conversations. Account management remains in Settings.
No email delivery or scheduled email automation is configured.

## Curriculum and question changes

The original plan file is unchanged. A curriculum overlay maps 70 learning targets
to Grade 5 foundations, BSD IMT1 and selected next-course extensions. It adds 16
explicit foundation/bridge skills, prerequisites, teaching dates, lesson notes
and accessible diagrams. Fifth-grade knowledge is checked rather than marked
mastered. General fraction division, ratios, rates, percentages and fractional
volume are introduced as new learning. Same-day prerequisite topics come first.
Automatic practice/review uses introduced topics; teachers and students can
explicitly choose a later lesson or assignment.

The added coverage includes place value, rounding from hundreds to thousandths,
whole-number multiplication, decimal addition/multiplication, measurement
conversion, fraction sharing, expressions, paired patterns, common factors,
signed division, shape hierarchy, combined whole-number volume, fractional line
plots, probability and sampling. Existing generators now include varied powers
and bases, signed rational comparisons, fraction scaling, coordinate rectangle
area, fractional prism edges, outside triangle heights, prism/pyramid nets and
both odd/even median lists. See `docs/curriculum-audit.md` for official sources,
standard mappings and the differences between published BSD course boundaries.
This is a teaching alignment, not a placement decision or an exam specification.

Each standard 20-question block retains six warm-ups and 14 multi-step stories,
with 14 different scenarios. All five story shapes have computed answers, units,
two to four dependent worked steps and help. Numerical grading remains in code.
Saved tutor history, teacher visibility, account isolation and management
controls are preserved; this release does not reset accounts, answers or points.

## Verification

- Generator reports record 640,500 checks across 327 warm-up/template shapes.
  The current full suite passes 305 tests with zero failures or skips.
  Backlog regressions cover the 160-to-135 catch-up example,
  duplicate answers, no future prepayment and consistent role-specific counts.
  Coverage includes 70 dated goals, Pacific midnight/DST, shifted weeks,
  same-day prerequisites, review filtering, concurrent completion, saved notes,
  ownership, grading, history, rewards and teacher management.
  Teacher UI checks exercise the copyable report, clipboard success, manual-copy
  fallback, text download and the single-student toolbar.
- The private corpus contains 2,322 records,2,469 segments and 739 distinct
  number-free frames. All 218,112 approved warm-up entries and 340,800 approved
  story entries pass the exclusion checks. All 71 question families have three
  levels; each story pool has 1,600 entries spanning 16 scenarios and five shapes.
- The original 4,550-question course/bonus capacity check passes. The current
  70-day daily check materializes 1,400 questions:980 stories and 420 warm-ups,
  with 14 distinct story scenarios per day and no repeat. Single-skill sets pass
  for all 213 skill/level combinations.
- Frame checks inspect 490,500 template samples plus every approved warm-up and
  story seed, with zero matching paper frames. Source hashes and pool digests
  block builds if that evidence becomes stale. Aggregate reports are public;
  the paper corpus, approved seed pool and private QA fixtures are not.
- In the preceding curriculum revision, sandboxed Chromium rendered 34
  desktop/tablet/phone views against an
  isolated SQLite backend, with no page errors or horizontal document overflow.
  Screenshot inspection corrected calendar alignment and completion density.
  A second browser journey using the production checked pool saved exactly 20
  answers, including 14 distinct stories, stopped Daily mode at 20, opened optional
  extra practice, and displayed matching teacher counts and the saved note.
  Its nine screenshots include the completed state and expanded curriculum on
  desktop and phone. Geometry and curriculum diagrams were also rendered and
  inspected, including extreme prism/pyramid dimensions.
- Production Worker build and compiled smoke checks pass.
  The smoke test exercises the 70-day schedule,70-skill library, old/new lessons,
  persistent tutor history, role isolation, counted answers and private paths.

The current update's browser appearance could not be verified: the managed
preview relay timed out waiting for port 4173, and the cloud browser failed at
initialization with `gaas-browser node_repl sandbox cannot be disabled`. This
update's UI behavior is covered by the automated tests above; the older screenshots
do not establish the appearance of the new backlog and teacher dashboard.

## Hosting and remaining limits

The existing ChatGPT Site and public host audience are retained. Application
accounts protect records and teacher controls. Sites confirmed `donteventry.me`
and SSL active with no domain error during the preceding publication. No Namecheap DNS
change is needed. The public GitHub source mirror excludes private validation
inputs and credentials.

Previous direct HTTPS checks of the custom domain and OpenAI were blocked by
the workspace proxy with 403. The preceding release's screenshots used the
actual application and an isolated backend, not an authenticated production session.
Sites publication status separately establishes the deployed version. Live AI
provider operation remains unverified from this workspace; code-computed hints
and worked answers remain available when AI cannot respond. The existing server
runtime key and bounded tutor-history retrieval are unchanged.

No Safari-device or production load-timing claim is made. The scheduled backup
handler still has no verified host cron, and private corpus CI secrets are not
configured in the public repository. Teacher-created backups remain available.
