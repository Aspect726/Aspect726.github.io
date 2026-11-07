# Double Advanced

A student workspace and teacher classroom built around the expanded Double Advanced curriculum. The source lives in `curriculum-web`; the original curriculum stays on the repository's `Curriculum` branch.

## Run locally

Use Node.js 24 or newer. The local server has no third-party runtime dependencies. Import the curriculum first using [CURRICULUM.md](CURRICULUM.md), then:

```sh
cd curriculum-web
npm start
```

Open `http://127.0.0.1:3000`. Browsing the curriculum does not require an account. Saved answers require a server account. The server saves progress in `private/progress.sqlite`; keep this file on a persistent disk and back it up along with its WAL files using SQLite's backup mechanism. Do not commit databases or answer snapshots.

Create the teacher account with `node server.mjs --create-teacher`, supplying `TEACHER_USERNAME`, `TEACHER_PASSWORD`, and optionally `TEACHER_NAME` as environment variables. Use a password manager and a unique password of at least 3 characters. Do not put a password in a tracked file or shell history. Sign in as the teacher and create the learner's account from the teacher screen. A nickname is sufficient; no child's email or full name is needed.

## Hosting

GitHub Pages uses the repository's existing branch publication. The root page opens `curriculum-web/public/`, and `_config.yml` excludes server, test, private-data, and importer paths. The workflow validates a separate public-only artifact, checks public JSON for private answer fields, and verifies the exact published JavaScript over HTTPS. GitHub Pages cannot run the SQLite server. Saved learning happens on the private hosted classroom or local server.

The production classroom's URL and status are recorded in the delivery notes after deployment. It uses a separate database and protected server routes; a public static site must never receive a database, password, answer key, teacher guide, or hidden slide deck.

For a conventional Node host, run `NODE_ENV=production`, set `APP_ORIGIN` to the exact HTTPS origin, put `DATABASE_PATH` on a persistent volume, and serve the frontend and API on the same origin through HTTPS. Keep port 3000 private behind the proxy. Import current curriculum into `data/` on that host and provide teacher resources in `private/resources/teacher/`. Production session cookies require HTTPS.

## Learning and grading

Weeks run Saturday through Friday. Every day has 20 required questions, except Wednesday's 25. Two challenges are included in each day's total. Optional assessments and extra practice do not silently increase the assignment. Teachers can change requirements, pause lessons, reschedule work, and record checked paper work.

Equivalent numerical values use exact rational arithmetic. Format rules such as simplifying or supplying units are separate checks. Constructed explanations, drawings, and ambiguous source answers are sent to teacher review. A question is complete only when correct or approved. Hints, retries, first attempts, eventual correctness, and paper work remain distinguishable. Teacher settings control solution release and mastery criteria.

## Validation

```sh
npm test
npm run build:pages
```

Curriculum validation covers the source manifest, assigned counts, all packet page references, slide numbering, source arithmetic checks, and the generated extra bank. The importer keeps a detailed local report at `data/import-report.json`. Server tests use isolated temporary databases; they do not modify learner records.

The source repository is public, including the original uploaded curriculum on `Curriculum`. Application authorization protects classroom endpoints and stored progress; it cannot make material already published to a public GitHub branch secret.
