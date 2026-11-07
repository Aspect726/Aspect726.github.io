# Double Advanced practice

A small HTML/CSS/JavaScript client with the same Request/Response server running
on Node 24 + SQLite locally and Cloudflare Workers + D1 through Sites in production.

## First teacher and student

Open the hosted practice link. Its existing owner-private Sites access gate is
preserved. On first application use, choose **Teacher setup**, a short username,
a nickname, and a password of at least eight characters. There are no preset
credentials. Setup disappears after the first teacher is created.

In **Settings**, create the student account with a password of at least four
characters. Add a second teacher there, or reset the student's password. Sign out
and sign in as the student to practise. Account and progress records live on the
server; a new device uses the same username and password after the Sites gate.

## Development

```sh
cd curriculum-web
npm ci
npm test
npm start
```

Node must be version 24 or later. Local state is `private/practice.sqlite`, ignored
by Git. The local server defaults to loopback, port 3000. `PORT`, `HOST`,
`DATABASE_PATH`, and `APP_ORIGIN` can change deployment settings. Production
setup is restricted to the authenticated Sites owner. Do not expose a local
first-run setup server to the Internet.

## Private paper and slide check

The provided `server/plan.json` defines all 70 dates, focus skills and the mix.
The separate paper-and-slide JSON must stay outside this public repository.
It is used only as validation input, never served or imported by a request handler.

```sh
PAPER_QUESTIONS_PATH=/private/path/paper_questions.json npm run test:paper -- --write-pool
npm run build
node scripts/smoke-worker.mjs
```

The check validates candidate generator outputs and creates
`private/vetted-seeds.json`, containing only accepted seed identifiers and
aggregate verification evidence. Production uses only that checked seed pool.
The bank is ignored in this public checkout. The production private source
repository retains it so deployments are reproducible. Regenerate the pool after
any generator change. A missing corpus or pool fails the release check.

The paper corpus has no skill identifiers, so the validator infers possible kinds
from wording and lesson context. It normalizes fractions, decimals, word numbers,
minus signs and whitespace; uncertain records are checked conservatively.
The test also materializes all required questions and four bonus rounds per day,
checking the previous fourteen days and the current day for repeated content.

## Continuous integration

The application checks run on every push and pull request. The private paper gate
runs on pushes and fails if its private data is not configured. Supply the gzip,
base64-encoded private JSON as two GitHub Actions secrets named
`PAPER_BANK_GZIP_BASE64_1` and `PAPER_BANK_GZIP_BASE64_2` (split into two equal
parts; the combined file exceeds GitHub's per-secret size limit). Never paste the
file into a workflow or public artifact. The workflow reconstructs it under
`RUNNER_TEMP`, runs validation, and deletes it. These secrets require repository
administration access and are not configured by this checkout.

## Hosting and backups

`.openai/hosting.json` retains the existing Site identity, D1 `DB` and private R2
`BUCKET`. Build output is a bundled Worker with only the login shell, client code,
fonts and styles exposed as assets. The source and question pool are server-only.
Migrations preserve the existing classroom tables and add `practice_` tables.
Previously applied migration files must never be edited.

The Worker exports a scheduled handler for a nightly backup. The host must wire
that schedule; publishing a scheduled handler alone does not configure a cron.
Teacher **Settings → Save a backup** writes an export to private R2; **Download
backup** returns a teacher-only export. Exports contain password hashes and must
be kept private. Local Node runs a daily backup timer while the process is alive.
No automatic production schedule is claimed until its host configuration is
verified.

The custom domain needs DNS routing and validation before it can serve this
Worker. The Pages replacement redirects to the working hosted address. Remote
branch deletion and history erasure are separate operations; deleting a branch
alone cannot remove copies of previously public answer keys.
