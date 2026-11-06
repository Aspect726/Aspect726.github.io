# Curriculum import and verification

The application imports the user's **DoubleAdvanced_Expanded** curriculum from the `Curriculum` branch, under `Nov5/have`. The imported teaching order is Saturday through Friday. Printed calendar dates do not set assignment dates.

The current import contains:

| Content | Verified count |
| --- | ---: |
| Weeks / days | 10 / 70 |
| Required questions | 1,450 |
| Required challenges | 140, exactly two per day |
| Required work per week | 145 |
| Wednesday work | 25, including two challenges |
| Other days | 20, including two challenges |
| Optional assessment questions | 97, excluded from required totals |
| Authored extra-practice questions | 360, excluded from required totals |

Extra practice covers 36 problem families and 34 skills present in the source. Each item has an `availableAfterDay` value, exact answer, worked explanation, and deterministic construction checks. Extra practice must be restricted to already taught skills or explicitly assigned by the teacher. It is not represented as original packet content.

## Sources and provenance

The importer uses these four structured files together:

- `work/expanded_student_manifest.json`: assigned sections, exact questions, packet pages, and the day sequence.
- `work/expanded_answers.json`: an independent source comparison for question text, answers, and worked explanations.
- `work/expanded_deck_meta.json`: actual slide numbers, lesson objectives, worked examples, discussion notes, hidden status, and problem associations.
- `work/expanded_lesson_extensions.json`: weekend timings, deepening tasks, discussion moves, and challenge context.

It also reads the actual daily student PDFs, ten teacher-guide PDFs, and the PowerPoint file under `outputs/DoubleAdvanced_Expanded`. Source files are never edited.

Every required question keeps its original section and question number, skill, source commit, packet page, workbook page, and matching slide numbers. A logical ID such as `D001-S01-P1` identifies its source position. The stored question ID also includes an immutable curriculum version. Null or absent references remain absent; the importer does not invent page or slide references for extra practice.

The version digest includes the four source JSON files, the Git commit, and the importer, audit, extra-practice, and grading policies. A changed source or grading policy produces a new version rather than changing the meaning of historical attempts. Existing snapshot files are never overwritten with different content. Retain the database and the `data/snapshots` directory when updating the application.

## Reproduce the import

Requirements: Node.js 24 or newer, Python 3.10 or newer, Git, and the `pdftotext` command from Poppler (`poppler-utils` on Debian/Ubuntu). The Python audit uses only the standard library; **no pip packages are required**. Run the project's normal dependency installation for the application itself.

Fetch the branch, then extract the sources to a separate temporary directory. Do not switch or overwrite the application checkout:

```sh
git fetch origin Curriculum:refs/remotes/origin/Curriculum
mkdir -p /workspace/scratch/curriculum-source
git archive origin/Curriculum Nov5/have/work/expanded_student_manifest.json Nov5/have/work/expanded_answers.json Nov5/have/work/expanded_deck_meta.json Nov5/have/work/expanded_lesson_extensions.json Nov5/have/outputs/DoubleAdvanced_Expanded | tar -x -C /workspace/scratch/curriculum-source
cd curriculum-web
node scripts/import-curriculum.mjs /workspace/scratch/curriculum-source/Nov5/have
```

For a different source revision, pass its complete Git commit as the second argument. The default commit is the locally fetched `origin/Curriculum` reference. The default source path is only a convenience for this workspace; production build jobs should pass their actual source directory explicitly.

Outputs:

- `data/curriculum.json`: current private question bank, grading rules, answers, teacher notes, and lessons.
- `data/snapshots/<version>.json`: immutable historical snapshot.
- `data/import-report.json`: counts, source conflicts, arithmetic audit, and reference checks.
- `public/data/course.json`: sanitized course metadata, question prompts, and worked **lesson examples**. No question answer keys, grading expectations, teacher notes, or hidden tutor slides are included.
- `public/resources`: original student packets and workbook.
- `private/resources/teacher`: original teacher guides and complete PowerPoint, available only through authenticated teacher routes in the application.

Private banks and resource files are generated build artifacts and are ignored by Git. They must be imported or restored before starting a fresh local server. GitHub Pages deployment must publish only the designated public artifact, never `data`, `private`, the source checkout, or the SQLite database.

## What the audit establishes

The initial completed import has zero source conflicts. Its audit verified all 1,450 assigned question labels on their recorded PDF packet pages, across 110 packet pages; all 70 days and titles against the weekly teacher guides; and all 966 numbered slide titles against the actual PowerPoint XML. Question text, answer text, and source worked text agree with the structured answer bank.

The audit validates 1,527 source arithmetic checks, including optional assessments, with a restricted Python AST interpreter. It never uses `eval` or executes source strings as Python or JavaScript. Twenty open written summaries have no arithmetic check and require teacher judgment. These checks validate the source's stated numerical identities; they do not prove that every explanation or diagram is pedagogically complete.

The source has blank worked explanations for 249 required questions and 52 optional questions. These answers receive a clearly tagged `solutionOrigin: "authored-method-supplement"` containing a skill-specific method and the source answer. The source answer itself is preserved. These supplements must not be described as original worked explanations.

The source challenge answers are prose rather than a reliable machine-readable subpart schema. Challenges retain all requested parts and have teacher-review rubric aspects for results, reasoning, and mathematical communication. Written reasoning, diagrams, and ambiguous answers remain pending review; they are not automatically accepted merely for matching a number. Completion requires a correct automatic result or teacher approval.

All 1,450 imported original answer strings were run through the grader without a false `incorrect` result; ambiguous or constructed responses returned `teacher_review`. All 360 extra-practice answer strings graded `correct`. The separate grading test suite covers equivalent representations, required formats, units, expressions, multipart behavior, and unsafe input.

To repeat the source audit without regenerating the site:

```sh
python scripts/import-audit.py /workspace/scratch/curriculum-source/Nov5/have
```

Review `data/import-report.json` after every import. Count or ordering failures stop the importer. Other source conflicts are recorded and affected imported answers require teacher review; they are never silently rewritten. Publish a reviewed new version while retaining old snapshots and attempts.

## Publication and answer-key privacy

The application does not include answer-key fields in its public course artifact. Its authenticated backend protects teacher resources and unreleased solutions.

However, the original curriculum and teacher answer materials were already uploaded by the user to the public `Curriculum` branch of `Aspect726/Aspect726.github.io`. Application permissions cannot make those pre-existing public repository files private. This build does not change the repository's visibility, remove that branch, or claim secrecy for files already available there. Restricting those originals would require a separate repository/privacy decision.
