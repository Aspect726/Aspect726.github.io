# November 17 curriculum, teaching controls and learning interface

The teacher interface now has four main destinations: Overview, Curriculum &
dates, Student work, and Points & rewards. Settings retains accounts, helper
access and backups. The one-student overview puts the current lesson, daily work,
catch-up progress and weekly note together. Practice tasks and question samples
are grouped under Curriculum; paper checks remain available from Student work.
The manually shareable progress update is retained in a disclosure. No email is
sent or scheduled.

Points & rewards now includes the authoritative rule editor, today's active
rules, tomorrow's pending rules, numerical examples, prizes, requests and the
ledger. With the default rules, the first 20 saved answers satisfy today's goal;
extra answers reduce earlier unfinished work, and points are earned at 35, 45,
55 and each further ten answers. The same catch-up answer can reduce overdue
work and earn points. A PDF download or paper score does not count as an online
answer. Existing points, accounts and learning history are preserved.

## Curriculum review and materials

The new curriculum is on the repository's `Curriculum` branch at commit
`604a82807488885cc5db31f6b1504b27b48076e1`. Its plan is structurally identical to
the existing 70-day plan: no change to the teaching sequence or generators was
needed. The 16 supplemental foundation/bridge targets remain alongside the 54
supplied plan skills. Grade 5 familiarity is still checked rather than assumed
mastered, and automatic practice stays within introduced topics.

The complete branch tree and all 83 PDFs were reviewed; downloaded PDF bytes
matched their Git blob hashes. The default curriculum page references 82 PDFs:
70 canonical student sheets, ten teacher guides, and the Grade 5 diagnostic and
key. An older duplicate first-day sheet is excluded. The page organizes all ten
weeks and 70 days, with individual links and a weekly ZIP containing seven
student sheets, the teacher guide and a README with the assigned dates. ZIP
source files are size- and hash-checked against the pinned revision. The website
does not serve a source-branch archive or the `For_ChatGPT/` folder.

Earlier/later controls and an exact start date replace the ambiguous “move back”
action. A preview names all affected weeks before saving. Overlapping dates and
stale concurrent edits are rejected. Submitted answers and point-ledger rows are
not rewritten. Original dates remain printed on PDFs; the website calendar and
ZIP README show the assigned dates. A source Thanksgiving-date error is noted
rather than converted into an automatic holiday exception.

See `docs/curriculum-update-2026-11-17.md` for the audit, district/publisher
cross-check and extraction limits. This is curriculum alignment, not a BSD
placement assessment or an independent proof of every supplied answer key.

## Student experience and help

The daily action stays primary; short catch-up work is the recommended next step
once today's goal is met. Daily/catch-up progress and the next reward point have
separate explanations and meters. Counts use saved answers and course dates;
they are not hardcoded. Actual activity stays on its original date, later
catch-up credits are separate, and future daily goals cannot be prepaid.

Shorter task labels replace decorative slogans. Blue, violet, yellow and coral
accents, mathematical diagrams and two original geometry characters give the
interface a consistent learning theme. Finite celebrations follow saved work,
do not delay the next question and respect reduced-motion preferences.

Every question retains computed hints, worked steps and an answer. Contextual
help actions focus the tutor on a question, worked step or the student's method.
Opening help restores saved messages; only submitting requests a new generated
explanation. Retrying unchanged content reuses the same request ID. Generated
replies remain labeled as AI, with student-specific history and teacher
visibility preserved. Numerical grading remains in code.

The evidence and design rationale are documented in
`docs/ux-review-2026-11-17.md`, including IES, CAST and W3C references.

## Navigation and asset delivery

Duplicate student-list requests and the serial global progress-summary fetch
were removed from teacher navigation. Identical in-flight GET requests are
coalesced; only the teacher's student list has a 30-second memory cache.
Progress, points, answers and conversations are not cached in browser storage.
Mutations and session/account changes invalidate state, and late reads cannot
restore a previous session's data. Immediate loading feedback and main-heading
focus accompany page navigation.

Warm Workers reuse initialized services and immutable decoded assets while
authenticating every request and reading student records from the database.
This reduces redundant work; production network latency has not been measured.

A concrete styling defect was also fixed: the previous deployment's
`teacher-backlog.css` was built into the Worker but omitted from the public asset
allowlist, so its request returned 404. The allowlist now includes every required
module and stylesheet. Compiled smoke coverage follows the delivered import and
stylesheet graph so this failure cannot hide behind a successful bundle build.

## Verification

- The full suite passes **335 tests**, with zero failures or skips. Coverage
  includes schedule preview/cancel/apply, nine affected later weeks, overlap and
  concurrent-edit rejection, student-specific downloads, all 82 PDF references,
  active/pending reward rules, tutor retries, request reuse and access isolation.
- The expanded private no-repeat input contains **4,485 records**: 2,322 original
  paper/slide records, 2,123 revised numbered PDF questions and 40 reminder boxes
  containing worked examples. It has 4,632 extracted segments and 1,239
  number-free frames. The original input remains unchanged.
- The rebuilt pool passes all checks for **218,112 approved warm-ups** and
  **340,800 approved stories**, with zero matching questions or frames. All 71
  question families retain three difficulty levels, 16 story scenarios and all
  five story shapes.
- The **4,550-question** course/bonus capacity check passes. All 70 daily sets
  materialize 1,400 questions: 420 warm-ups and 980 stories, with fourteen distinct
  scenarios per day. Numerical grading and worked solutions remain unchanged.
- Frame checks pass **490,500 generated samples** plus every approved pool entry.
  Source hashes and the final pool digest are verified; stale evidence blocks
  building. Only aggregate results are mirrored publicly.
- The final production Worker build passes with 18 public shell assets and a
  9,679,694-byte Worker. Compiled smoke passes the recursive 15-asset HTML, CSS,
  module and font dependency graph, plus login, role isolation, vetted questions,
  worked help, saved tutor history, counted answers and private-path denial.
  Final packaging uses the same pushed source as the saved Site version.

The current browser tool failed at initialization with
`gaas-browser node_repl sandbox cannot be disabled`. Final appearance could not
be visually verified. Earlier screenshots describe earlier revisions; they do
not establish this update's layout. Automated interaction and asset-delivery
checks are separate from visual browser verification.

## Hosting and remaining limits

The existing ChatGPT Site, public host audience, application accounts and D1/R2
bindings are retained. This update does not change Namecheap DNS, runtime secrets
or email automation. Native Sites publication status identifies the deployed
version; this document does not assume a version number before publication.

Live AI-provider operation remains unverified from this workspace. The existing
server runtime configuration is unchanged; computed hints and worked answers
remain available when AI cannot respond. No production load-timing, authenticated
production browser or Safari-device claim is made. Weekly ZIPs require the
pinned GitHub source to be reachable; individual PDF links are also provided.

The scheduled backup handler still has no verified host cron, and private corpus
CI secrets are not configured in the public repository. Teacher-created backups
remain available. Private corpora, PDF extraction text, seed pools, credentials
and QA account fixtures stay out of the public source mirror and public assets.
