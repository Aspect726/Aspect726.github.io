# Curriculum review — November 17, 2026

## Reviewed source

The new upload is on the repository's **Curriculum** branch, not `main`:

- Repository: [Aspect726/Aspect726.github.io](https://github.com/Aspect726/Aspect726.github.io)
- Pinned commit: [`604a82807488885cc5db31f6b1504b27b48076e1`](https://github.com/Aspect726/Aspect726.github.io/commit/604a82807488885cc5db31f6b1504b27b48076e1), titled *New Curriculum*, November 17, 2026.
- Materials root: `Nov6/Double_Advanced_Claude/`.
- The default branch remains at `6b207e028b64ea43f0d0e40d78e363ca5779dff7`; the deployed application source before this update was Site commit `4e84f8985c47597c678d36854fbc482cc34b3b16`.

The audit fetched the complete branch tree and all 83 PDFs. Every downloaded PDF's bytes matched its Git blob SHA. The 70 canonical daily sheets were checked for complete, sequential question numbering, expected week/day headings and two-page structure. All ten teacher guides were inspected for topic order, lesson goals, paper-answer sections and online practice rules. This is a curriculum and integration review, not an independent proof of every supplied answer key.

## What changes and what stays

`For_ChatGPT/plan.json` is structurally identical to the website's existing `server/plan.json`: the same 70 days, ten weeks, 54 plan skill IDs, dates, lesson focus and question mix. The website's 16 supplemental foundation/bridge targets remain useful additions to the plan. There is no basis for resetting the learner's progress, moving dates or replacing the teaching sequence simply because the upload is new.

The supplied PDFs do contain revised practice questions. For example, the canonical first Saturday sheet replaces several short computations with dependent, multi-step scenarios. Its corresponding teacher guide contains matching revised answer entries. The website already generates a six-warm-up/fourteen-story mix with distinct scenarios, units, computed answers and worked help, so the new paper format does not require another change to that mix.

The necessary adaptations are to make the revised PDFs accessible from the teacher curriculum page, explain the relationship between paper lessons and separate online practice, and refresh private no-repeat validation against the revised printed questions. Automatic online practice should continue to follow introduced skills and prerequisites.

## Weekly organization

Each weekly download contains the seven canonical student PDFs and that week's teacher guide. Teacher guides include teaching notes and answer keys. The alternate first-day file whose name ends in ` 2.pdf` is an older, drill-heavy version and is omitted from the default bundle. No full-branch archive is used.

| Week | Main learning | Canonical materials |
| --- | --- | --- |
| 1 | Decimal regrouping, division and finding a whole | Student/Week_01 + Teacher/Week_01_Teacher_Guide.pdf |
| 2 | Exponents, order of operations, distributive property | Student/Week_02 + Teacher/Week_02_Teacher_Guide.pdf |
| 3 | Equations, variables, rules and graphs | Student/Week_03 + Teacher/Week_03_Teacher_Guide.pdf |
| 4 | Area, composite shapes, nets and surface area | Student/Week_04 + Teacher/Week_04_Teacher_Guide.pdf |
| 5 | Signed numbers, coordinates and inequalities | Student/Week_05 + Teacher/Week_05_Teacher_Guide.pdf |
| 6 | Statistical questions, displays, mean and median | Student/Week_06 + Teacher/Week_06_Teacher_Guide.pdf |
| 7 | Range, quartiles, box plots, MAD and comparing data | Student/Week_07 + Teacher/Week_07_Teacher_Guide.pdf |
| 8 | Proportional relationships, maps and scale | Student/Week_08 + Teacher/Week_08_Teacher_Guide.pdf |
| 9 | Circumference and circle area | Student/Week_09 + Teacher/Week_09_Teacher_Guide.pdf |
| 10 | Signed arithmetic, two-step equations and cumulative review | Student/Week_10 + Teacher/Week_10_Teacher_Guide.pdf |

The separate `Tests/Grade5_Standards_Check.pdf` has 37 numbered questions across four pages; `Grade5_Standards_Check_Key.pdf` provides its key and standards mapping. These are teacher resources, separate from the daily online counter and reward ledger.

PDFs preserve their original printed dates. Website schedule changes must display the current assigned dates and must not imply that the original PDFs were rewritten. There is a source inconsistency: Week 4 refers to Thanksgiving on its printed Thursday, December 3, although Thanksgiving in 2026 is November 26. Do not turn that note into an automatic holiday exception or silently change daily obligations.

## Daily work and reward rules

All ten teacher guides describe 20 online questions in addition to the paper sheet, with a first bonus point after 15 further online answers and another point for each ten after that. These match the website's defaults: 20 required, first point at 35 answers, then at 45, 55 and so on. Teacher-configured rules remain authoritative for the live account.

Catch-up credit is a separate progress calculation. Today's first target answers satisfy today; additional saved answers can reduce the oldest overdue goals. The same extra answers can also contribute to that day's bonus thresholds. Points are a spendable reward balance; questions behind are unfinished course work. A paper score or a PDF download is not an online answer and must not silently award either credit or points.

## Private exclusion evidence

The upload's `paper_questions.json` has Git blob SHA `e6a64a7498a5f9fb8fff52a6c3c9381b8f0021b6`, identical to the original supplied private corpus. Its 2,322 records therefore do not include every revised PDF scenario. The original input was not modified.

For validation only, a separate private extraction contains 2,123 numbered questions from the 70 canonical student sheets and the Grade 5 diagnostic. The numbered-question extractor handles one-, two- and four-column layouts and reconstructs stacked fractions. The additional reminder boxes are conservatively retained as extracted text, including their worked calculations. A combined private validation input contains the unchanged 2,322 original paper/slide records plus those 2,123 extracted records and 40 weekday reminder boxes with worked examples: 4,485 in total. It does not contain the answer-key tables. Numbering is checked for gaps and duplicates in every PDF.

An initial sample of 2,556 previously approved warm-ups found 78 numeric-signature matches against the additional PDF records. These are conservative exclusion matches, not a claim that 78 prompts are verbatim duplicates. They establish that the previous seed approval alone is insufficient for the revised sheets. Release validation must rebuild the private seed pool and rerun frame and full-capacity checks with the combined private input. Results belong in the release evidence; do not claim that the initial sample is an exhaustive pass.

The original corpus, additional extraction, combined corpus, PDF text and seed pool must stay out of the public application source and public assets. Downloads use only an explicit list of the teacher-authorized PDF files. The website must never serve the `For_ChatGPT/` folder or a branch archive containing it. Existing repository contents are not expanded or duplicated into the public source mirror.

## District and publisher cross-check

The current [BSD math sequence](https://www.bsd405.org/academics/advanced-learning/math-placement) describes IMT1 as grade 6/7 and IMT2 as grade 7/8, with placement decisions made by the district. The [BSD middle-school materials overview](https://www.bsd405.org/academics/instructional-materials-and-family-resources/middle-school-instructional-materials-and-family-resources) includes area, ratios, percentages, equations, rational numbers, circles and data in IMT1; IMT2 extends into transformations and linear relationships. The [publisher's Accelerated 1 overview](https://im.kendallhunt.com/MS_ACC/teachers/1/index.html) also includes percent change, signed arithmetic, sampling and probability.

Those sources support retaining the website's supplemental foundations and bridge coverage rather than reducing it to the narrower paper sequence. They do not support describing a website level, point total or short diagnostic score as a BSD placement result. The earlier standards mapping remains in `docs/curriculum-audit.md`; no new district course requirement was found that calls for a wholesale sequence replacement.

## Completed private validation

The release pool was rebuilt against all 4,485 private source records (4,632 text segments and 1,239 number-free frames). The full checks passed: 218,112 approved warm-up entries; 340,800 approved story entries; 4,550 course/bonus capacity questions; 1,400 daily questions with six warm-ups, fourteen stories and fourteen distinct scenarios per day. The frame pass checked 490,500 generated template samples plus every approved pool entry with zero matching frames. Every skill retained all three difficulty levels.

Private evidence records the source and extraction digests, pinned materials commit, generator-file hashes and final pool digest. Public validation files contain aggregate results only. These checks establish the implemented text/numeric/frame exclusion rules; they are not a claim that automated extraction independently verified every printed mathematical answer.
