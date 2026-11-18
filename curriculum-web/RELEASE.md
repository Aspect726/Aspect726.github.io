# November 17 classroom update

## Layout repair follow-up

The layout pass corrects conflicting styles in the student, teacher, gradebook
and tutor screens. Text-link buttons no longer inherit browser-default button
boxes; checkboxes retain their native size; button variants keep readable hover
colors; diagram spacing no longer moves feedback icons or character artwork.
Practice-card actions align, grade-entry labels and fields have room to wrap,
and mobile progress descriptions stay in their intended rows. Phone notices
sit above the bottom navigation. The labelled tablet sidebar uses one consistent
breakpoint and no longer displays overlapping rail tooltips. Keyboard focus
indicators from the preceding release remain intact.

The 40 focused frontend, design, gradebook, test-document and tutor checks pass.
The production build and compiled Worker smoke pass. This is a source/cascade
review, not a completed screenshot review: the browser still fails during
initialization, the desktop viewer reports no available Cloud environment,
and downloading the hosted screenshot is blocked by the outbound proxy.

## Classroom and design

The teacher classroom has four main destinations plus Settings, direct entry to
paper grades and tests, a readable ten-week curriculum with weekly downloads,
and date previews before saving. The student path prioritizes Today, Learn,
My progress and Rewards. The latest design brief supplies the shared workbook
palette, self-hosted heading/body fonts, white reading panels, clear controls,
and four original geometric characters. Earlier instructional and numerical
rules remain intact.

Daily online work, catch-up credit and points remain separate. Standard sets have
six warm-ups and fourteen multi-step story problems, units and worked help.
Paper grades and test scores never create online answers or points.

## Gradebook, assessments and private feedback

The weekly gradebook records correct/total, optional minutes and teacher notes,
with online first-try accuracy alongside paper grades. The all-weeks summary
links into the existing weekly entry flow. Tests support custom catalog entries,
missed-question grids, computed area results, corrections, retakes and follow-up.
Older tests stay in history; Hide/Restore preserves all attempts.

The two unweighted diagnostics have maxima of 39 and 25. The seven weekly checks
are Weeks 1–4 and 6–8. The separate checkpoint, rehearsal and final retain their
syllabus maxima and scoring policies. Unknown dates and missing results remain
unknown. The existing 37-question PDF is labeled as a different reference.
A private runtime import can preserve a supplied prior result without embedding
student data in public source.

The teacher-only planning estimate uses the seven-check category (25%),
checkpoint (15%), rehearsal (15%), final (30%) and recent online accuracy (15%).
It shows missing evidence and is not a BSD placement cutoff. Assigned dates use
the student's actual plan offsets. Scores retain their assessment-version
snapshots; later catalog edits cannot rewrite historical grading.

Each test accepts a private blank PDF and completed-work PDFs per attempt.
OpenAI drafts feedback from those PDFs and the teacher's entered grade; it never
changes the score. Analysis is cached, bounded, auditable and requires explicit
submission. A teacher reviews it before sharing. Changed grades/files invalidate
old feedback. Global and per-test score visibility apply to student history,
legacy checks, approved feedback and relevant tutor history. Student access is
always derived from the authenticated session.

All 70 skills have sourced IM unit tags. Coverage represents this site's selected
skills, not completion of entire IM units. Unit details are expandable on the map.
Approved test feedback supplies relevant lesson/practice links and bounded tutor
context without resending the PDFs for each question.

## Verification

The preceding gradebook release passed all **436 tests**, with no failures or skips. Its Worker build has
23 public shell assets and is 9,925,849 bytes. Compiled smoke follows the
19-asset HTML/CSS/module/font dependency graph and verifies accounts, role
isolation, saved answers, tutor history, gradebook catalog/import, private PDF
initialization and authenticated downloads. Browser JavaScript and CSS are
minified for delivery. New migration output matches its source; deployed older
migrations are unchanged. Shared palette contrasts and mathematical character
diagrams have explicit checks.
The private exclusion input now has 4,510 records, including the 25 questions in
the supplied ratios diagnostic. The rebuilt pool passes 218,112 approved warm-ups,
340,800 stories and 4,550-question capacity checks. The independent frame check
passes 490,500 samples plus all approved pool entries, with zero matching
questions or frames. Private source inputs stay out of the public mirror.

## Verification limits

Managed browser initialization still fails with
`gaas-browser node_repl sandbox cannot be disabled`, including after the runtime
restart. No desktop, iPad or phone screenshots or visual browser checks are
claimed. The brief's staged screenshot pauses could not be fulfilled; the user
requested best judgment, so implementation and automated checks continued.
Actual iPad Safari, touch layout, absence of horizontal overflow and final visual
appearance remain unverified.

A live OpenAI PDF request was blocked by the workspace's outbound proxy
(`Tunnel connection failed: 403 Forbidden`). Provider tests use controlled
responses and validate the actual HTTP request contract; they do not establish
live handwriting-analysis quality or current account billing. The hosted runtime
retains its private API key. Computed question help works independently of AI.

The current Sites project, public host audience, D1/R2 bindings and Namecheap DNS
are preserved. Accounts protect the private classroom. No emails are sent or
scheduled. Source publication excludes uploaded PDFs, real grades, private
corpora, seed pools and credentials from the public GitHub mirror. Scheduled
backups still have no verified host cron; teacher-created backups remain
available and include the new grade/document metadata tables.
