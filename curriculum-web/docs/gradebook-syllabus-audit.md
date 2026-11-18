# Gradebook syllabus review — November 17, 2026

## Scope and evidence

The requested change is an area for adding tests and entering daily paper grades by week. The supplied **Double Advanced Math Syllabus**, dated November 17, 2026, is the grading and calendar reference. Its pasted implementation suggestions are not separate authorization to contact the school, invent assessments, reset progress, or make every proposed rule automatic.

This review compared the syllabus with the existing application and the curriculum pinned at GitHub commit `604a82807488885cc5db31f6b1504b27b48076e1`, including `Tests/Grade5_Standards_Check.pdf` and its key. The source papers and private question exclusion corpus are not copied into this document. See `docs/curriculum-update-2026-11-17.md` for the earlier full materials audit.

The user explicitly resolved two differences: use the **39-question syllabus diagnostic**, and use **seven weekly checks**, with the halfway checkpoint and dress rehearsal recorded separately. This review records the resulting policy, remaining source limitations, and acceptance checks; it does not itself certify the implementation.

## Scores and bands

Always compare the stored score and maximum, not a rounded percentage displayed in the interface. A missing score is “Not entered,” never zero. A real score of zero remains a valid recorded result.

| Assessment | Maximum | Bands in the syllabus | Readiness weight |
| --- | ---: | --- | ---: |
| Grade 5 standards diagnostic | 39 | 35–39: solid; 29–34: a few gaps; below 29: fix gaps first | 0% |
| Ratios, rates and percents diagnostic | 25 | 23–25: strong; 19–22: on track; below 19: reteach | 0% |
| Week 1 practice diagnostic | 23 | Percent correct; no separate bands supplied | 0% |
| Each scheduled weekly check | 21 | 19–21: strong; 16–18: on track; 12–15: repeat weakest idea; 0–11: reteach | Weekly category: 25% |
| Halfway checkpoint | 30 | At least 90%: strong; at least 75%: on track; otherwise reteach | 15% |
| Dress rehearsal | 40 | At least 90%: strong; at least 75%: on track; otherwise reteach | 15% |
| Final check | 26 | “Same percent bands as the weekly check” | 30% |
| Daily paper practice | Recorded total | At least 90%: strong; at least 75%: on track; otherwise reteach | Separate from the online accuracy component |

The final's wording needs an explicit deterministic interpretation. Literal weekly ratios are `19/21`, `16/21`, and `12/21`, giving whole-number thresholds **24, 20, and 15 out of 26**. Replacing those ratios with generic 90%, 75%, and `12/21` happens to yield the same integer thresholds for a 26-point final, but fractional scores or a changed maximum could differ. Record the chosen policy with each saved score.

The final readiness target of at least 90% requires **24/26**, which is about 92.31%; 23/26 is about 88.46% and does not pass. For the 30-point halfway checkpoint, at least 75% requires **23/30** when only whole points are allowed. The rehearsal's separate January readiness target is **85% (34/40)**, although its “strong” band begins at 90%; those are different measures.

Diagnostics are useful evidence of growth, but neither the Grade 5 diagnostic nor the Week 1 diagnostic contributes to readiness weighting. A pre-existing Week 1 diagnostic result was supplied privately; its date is unknown. Retain an unknown date, do not assign today's date as the test date, and never invent a Grade 5 score. An automatic seed must attach only to the unambiguous existing single student and be idempotent. The private result belongs in runtime configuration and the database, not this public source documentation.

## The 39-question diagnostic and the existing PDF

The confirmed 39-question syllabus record is not the same assessment version as the currently supplied 37-question PDF. The PDF and key both explicitly state 37 questions and one point each.

| Area | Confirmed 39-question syllabus | Existing 37-question PDF |
| --- | --- | --- |
| Place value and decimals | 1–12 | 1–12 |
| Fractions | 13–25 | 13–24 |
| Expressions and patterns | 26–28 | 25–27 |
| Measurement and volume | 29–35 | 28–33 |
| Geometry | 36–39 | 34–37 |
| Overall score bands | 35–39 / 29–34 / below 29 | 33–37 / 28–32 / below 28 |

Create the confirmed 39-point catalog entry with its syllabus map. A link to the old PDF must identify it as a **37-question reference**; it cannot be presented as the matching paper or answer key for the new entry. No matching 39-question file was supplied in the reviewed curriculum. Do not generate two extra questions, scale a 37-point score to 39, or use the old question numbers to compute new area results.

## Assessment calendar and daily work

The original course runs Saturday, November 7, 2026 through Friday, January 15, 2027. The confirmed seven weekly checks are Weeks **1, 2, 3, 4, 6, 7, and 8**. The separate halfway checkpoint replaces Week 5's weekly check, and the rehearsal replaces Week 9's weekly check.

| Event | Original planned date | Interpretation |
| --- | --- | --- |
| Thanksgiving | Thursday, November 26, 2026 | Paper work may be optional; no online waiver is specified |
| Halfway checkpoint | Friday, December 11, 2026 | Separate 30-point assessment, replacing the Week 5 weekly check |
| Week 7 weekly check | Saturday, December 26, 2026 | Moved from Christmas Day, December 25 |
| Week 8 weekly check | Saturday, January 2, 2027 | Moved from New Year's Day, January 1 |
| Dress rehearsal | Friday, January 8, 2027 | Separate 40-point assessment, replacing the Week 9 weekly check |
| Final check | Sunday, January 10, 2027 | Separate 26-point assessment |
| End-of-course “everything check” | Friday, January 15, 2027 | Mentioned in the schedule, but no separate maximum, rubric, or material is supplied |

Teacher-edited assigned dates are authoritative for the live account. Preserve the original dates as source information, and do not imply that downloaded PDFs have been rewritten. An assessment moved to Saturday still belongs to its original curriculum week. Do not create an unrequested scored “everything check” with an invented maximum.

None of these assessment moves or optional paper notes changes the **20 required online questions per day**, Pacific date boundaries, saved-answer counts, oldest-deficit catch-up allocation, points, or rewards. A paper grade, test result, retake, PDF download, or teacher correction must never count as an online answer. The suggestion to devote a weekend to catch-up above 40 overdue questions can inform a teacher recommendation; it does not silently reschedule lessons or erase obligations.

## Readiness is a planning estimate

The weighted planning formula is final 30%, the seven-check weekly category 25%, halfway checkpoint 15%, rehearsal 15%, and online first-try accuracy for the last 14 days 15%. It is a local teaching aid, not a BSD placement result or an official district cutoff.

The syllabus does not define whether “daily accuracy” combines paper and online scores or how daily percentages are averaged. The implementation interpretation is **online first-try accuracy, weighted by answered questions, during the last 14 Pacific calendar dates**, explicitly labelled as such. Keep paper scores separate. Days with no answers provide no accuracy evidence, rather than adding artificial wrong answers; completeness remains visible in the separate daily completion measure.

Show component scores, denominators, evidence counts, and missing components. A score based on only completed components may be shown only as an explicitly partial estimate with coverage; do not silently normalize missing components and call the result complete. No attempts in the 14-day window means no accuracy evidence, not 0% accuracy. Never invent a pass/fail threshold for the weighted overall estimate.

The syllabus's final three benchmark rows are final at least 90%, weekly checks at least 16/21 three times in a row, and completion of at least six of the last seven daily goals. Its literal reference to weekly checks in Weeks 8–10 conflicts with the confirmed seven-check calendar. The implementation interpretation is the **last three scheduled weekly checks, Weeks 6, 7, and 8**, each at least 16/21; the interface must call this a program benchmark rather than claiming that the literal Weeks 8–10 condition has been measured. A missing one of those checks leaves the benchmark incomplete. Checkpoint/rehearsal percentages must not substitute for 21-point weekly scores.

The earlier milestones remain useful and distinct: Grade 5 at least 35/39 or successfully repaired areas by December 4; halfway at least 75%; rehearsal at least 85%. A Grade 5 total alone cannot establish that every previously missed area was retaken successfully. Do not treat a teacher note saying “reviewed” as numerical proof of repaired areas.

## First attempts, retakes, and area evidence

- Preserve all attempts and their assessment version, maximum, band policy, weight, date, author, and creation time. Editing an incorrectly entered score is a correction; explicitly adding a retake is a new attempt. A retried network request must not create another attempt.
- Show the first recorded result and the latest selected result with attempt numbers. Use a documented latest-attempt policy for the planning estimate, not an undisclosed best-score policy. A corrected historical date must not unpredictably select a different attempt without a clear rule.
- Online first-try accuracy comes from the immutable first stored answer for each question. Hints and tutor conversations may contextualize learning but do not override numerical grading or transform a wrong first attempt into a correct first attempt.
- Missed question numbers must fit the assessment version and maximum and be unique. Compute area evidence from the stored mapping. A total score without missed-question details can establish overall accuracy but cannot establish which areas were correct.
- The syllabus proposes corrections within two days and a one-sentence explanation. Show these as teacher follow-up or explicitly recorded completion; do not infer that corrections were completed merely because a retake or later online answer exists.

## Privacy and persistence acceptance checks

Scores, daily paper records, notes, and settings belong in the private database and teacher-authorized backups, not public source, static assets, analytics URLs, or public download bundles. Authorize every teacher mutation and derive the student's identity from the signed-in session for student endpoints. A request body or query parameter cannot grant access to a different student.

The existing student `/api/v2/student/progress` response returns legacy weekly scores and notes in `checks`. A new hide-scores setting must sanitize that existing route as well as the new gradebook route; hiding only the visible panel is insufficient. Teacher notes must not leak through a report, tutor context, legacy route, or export marked for students. Student-visible assessment summaries should contain only the fields intentionally shared; teacher-only planning estimates and private administrative notes stay teacher-only.

Validate score bounds and real dates, use idempotent writes, and audit creation, correction, retake, setting, and catalog changes. Back up all newly added assessment, score, paper-grade, visibility-setting, and mutation-tracking tables alongside existing progress data. Legacy weekly entry and new gradebook entry must converge on the same result atomically and must not multiply retakes during repeated saves.

Before release, verify teacher entry and correction, student isolation, hidden-score responses through both routes, blank-versus-zero handling, diagnostic exclusion, fractional-score boundaries if supported, holiday ownership, retake selection, idempotent retries, backup coverage, and unchanged online counts/points. Visually check the teacher's weekly paper-entry flow and student score view on desktop and narrow screens. No external messages or school contact are needed for this feature.

## Later confirmed additions

The supplied ratios/rates/percents diagnostic contains 25 one-point questions.
Its areas are ratios 1–8, rates 9–15, and percents 16–25. It is unweighted, with
no score entered in advance. Its blank PDF is stored privately and all 25
questions were added to the private no-repeat input, bringing it to 4,510 records.

The teacher can hide individual test scores as well as all scores. This applies
to student score history, legacy weekly-check responses, approved test feedback,
and feedback retrieved for tutoring. Hiding a test from the teacher's active
list is separate from hiding its score from the student. Neither deletes data.

Blank-test and completed-work uploads remain part of this release because the
user explicitly requested them before the later design brief described uploads
as optional. Teacher-approved feedback can guide practice; the entered score
is authoritative and changes invalidate stale feedback.
