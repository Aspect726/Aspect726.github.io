# Current rebuild decisions

The November 7 sidebar-platform brief supersedes the earlier three-tab design,
two-miss/twin flow, original daily mix, accuracy-gated bonuses and four-round cap.
The latest explicit hosting choice is ChatGPT Sites. Namecheap supplies DNS.

- Keep the existing server and D1/R2 bindings. The current Sites audience is
  public, as selected by the user; application accounts protect private records.
  Preserve existing accounts, password hashes, progress and ledger entries with
  additive migrations; never overwrite an account from demo provisioning.
- Use real /s and /t page URLs, a persistent desktop sidebar, compact tablet rail,
  mobile drawer and focused practice. Use white/light-violet surfaces, dark ink,
  cobalt/violet actions and yellow/coral accents. Keep graph paper, geometry and
  readable headings throughout the lesson-first interface. Short entry, drawing
  and reward animations stop; reduced-motion preferences disable them.
- Count each answered question once, right or wrong. Award points atomically at
  target + first-bonus, then each bonus-step; store per-date rules so later changes
  never rewrite history. Teacher settings apply tomorrow.
- Keep the student landing page focused on Daily questions, Extra practice and
  Review. Put the teacher note beside the daily task. Default to 20 each day
  from November 7, 2026, with server-derived Pacific deadlines and all 70 dates.
  Each date's first target answers satisfy that date; extra answers reduce the
  oldest already-due deficits, never future goals. Keep actual dated answers,
  catch-up credits and on-time completion separate. A shared backlog powers
  student and teacher counters. Stop Daily mode at the goal; catch-up sessions
  use the oldest unfinished lesson's introduced topics.
- Optimize the teacher interface for one student. Use four main destinations:
  Overview, Curriculum & dates, Student work, and Points & rewards. Group
  practice tasks and question samples with Curriculum, and paper checks with
  Student work. Keep the weekly note and a collapsed copyable/downloadable
  update on Overview. Keep account management in Settings and retain accounts. Reports
  describe website difficulty levels, not grade placement or AL readiness.
  The user cancelled email delivery; do not send or schedule reports.
- Preserve the supplied plan and overlay explicit Grade5 foundation checks,
  IMT1 teaching prerequisites and selected next-course bridges. Baseline review
  does not mean mastery. Automatic practice never jumps to future topics.
  Use two foundation, ten focus, five recent and three older positions; assigned
  work and due reviews use these positions. Future skills remain available only
  through explicit teaching assignments or independent lesson/library choices.
- Serve six warm-ups and 14 multi-step stories per standard set of 20, with no
  repeated scenario in the set. Custom targets retain at least 60% stories.
  All learning sources share the quota and atomically reserved question slots.
  Use five story shapes, named people, real quantities, two to four dependent
  steps, constrained parameters, code-computed answers and explicit units.
- Queue new versions after misses at 1,3,7 days. Never repeat a served question;
  keep lesson examples separate from assessment candidates. Suspend flagged shapes.
- Generate exact numeric/fraction/coordinate/linear-expression answers. Convert
  numeric multiple-choice items to typed answers; concept choices stay at most
  one in five. No expression evaluation or floating-point grading is used.
- Offer a hint and the complete worked answer for every question. Help does not
  award points or alter a score. Units and option selection are part of story
  answers; missing or wrong units receive a format correction before counting.
- Keep AI explanations separate from exact grading. Give the tutor the computed
  reference plus bounded, relevant student history. Save conversations and help
  use for the student and teacher; do not infer mastery from viewing help.
  Enforce per-student/classroom limits atomically and use worked help on failure.
  Store provider credentials only in server runtime secrets. Default to
  `gpt-5-nano`/minimal, moving to `gpt-6-luna`/none on December 11, 2026, or an
  explicit provider model-not-found response.
- The November 17 Curriculum branch plan is identical to the existing 70-day
  plan. Preserve its sequence and the supplemental foundation/bridge targets.
  Expose only the 82 explicitly reviewed canonical PDFs from pinned commit
  604a82807488885cc5db31f6b1504b27b48076e1. A weekly ZIP contains seven sheets,
  one teacher guide and a dated README. Check source bytes against Git hashes;
  do not fetch a branch archive or serve For_ChatGPT test inputs. Original PDF
  dates remain printed; assigned website dates are shown separately.
- Preview exact-date and earlier/later course shifts before saving. Reject
  overlapping weeks and concurrent stale edits. Preserve actual answer dates
  and point-ledger history. Do not infer holiday exceptions from source typos.
- Keep reward rules with prizes and the ledger. Show active and pending rules
  separately, with numerical thresholds. Catch-up answers may earn points as
  well as reduce backlog; do not invent mutually exclusive answer categories.
- Paper/slide data is test input only. A number-free frame comparison supplements
  the original exact/numeric exclusion tests. Checked pools and frame evidence
  carry source hashes; builds reject stale evidence. Compact story seed entries
  keep the checked production pool practical within Worker memory limits.
  Public GitHub receives aggregate evidence only, not corpus, private pools,
  secrets, screenshots or QA account fixtures.
- Keep the old public files out of the replacement branch. Do not claim this
  erases historical Git objects or copies previously downloaded by visitors.
- Remove redundant navigation requests, coalesce identical concurrent GETs and
  cache only the student picker for 30 seconds in memory. Progress stays fresh;
  mutation/session changes invalidate client state. Reuse warm Worker services
  without caching private records or skipping request authorization.
- Serve browser modules and styles through an explicit public asset allowlist.
  Compiled smoke checks traverse the delivered module graph and stylesheets;
  a successful JavaScript build alone does not prove CSS is publicly reachable.
- Screenshot evidence must be real. Earlier isolated browser checks do not
  verify this update. The current shared browser fails at initialization; do
  not claim final visual, authenticated-production, Safari or network-latency
  verification from source and automated interaction checks.

## Education interface revision — November 17

Use direct task labels and short instructions. Remove decorative slogans while
retaining a concise AI disclosure beside generated tutor replies. Question help
keeps hints and worked steps available; explanation and reasoning quick actions
do not call the model until the student submits. Retrying unchanged content
reuses its request ID.

Color and diagrams should reinforce the learning task: white/light-violet
surfaces, dark text, blue/violet actions and yellow/coral accents. Two original
geometry characters provide finite success feedback without moving the reading
surface, covering an answer, delaying Next or changing focus. Reduced-motion
preferences show a static character. Preserve visible keyboard focus, labeled
controls, common page gutters and responsive layouts.

IES guidance on worked examples, explanatory graphics and spaced practice,
CAST guidance on meaningful goals and actionable feedback, and W3C motion/target
size guidance inform these choices. References and acceptance criteria are in
`docs/ux-review-2026-11-17.md`; product-inspired patterns are design inferences,
not claims of comparative learning outcomes.
