# Delivery notes

## Open the application

- Public course: https://donteventry.me/
- Private classroom: https://double-advanced-classroom.framedegret8.chatgpt.site
- Local Node application: http://127.0.0.1:3000 while `npm start` is running in this workspace.

The classroom is owner-private through Sites. On first use, sign in with the
owner's ChatGPT account, choose the teacher username and password, then create
the learner's account in the teacher workspace. Sign out of the application and
use the learner's credentials for student work. A new device must first pass the
private Sites access gate. There are no preset passwords or public registration.

## Coverage

All ten weeks and 70 days are imported from `DoubleAdvanced_Expanded`, preserving
Saturday–Friday order. There are 1,450 required questions, including 140 challenges
(exactly two per day). Ordinary days have 20 questions; Wednesday has 25. The 97
optional assessment questions and 360 additional practice questions are separate.

The importer verified all 110 student packet pages, 70 day references in teacher
guides, 966 slide titles, and 1,527 source arithmetic checks. Required questions
with missing worked explanations have clearly labeled authored method supplements;
the original answer and provenance remain available in the private snapshot.

## Saving and grading

Production progress is stored in Cloudflare D1; the local application uses SQLite.
Accounts, drafts, attempts, reviews, and assignments are server records. Student
responses use exact arithmetic where appropriate, with separate format checks.
Reasoning, drawings, and ambiguous constructed answers receive teacher review.
Correct or teacher-approved work counts as complete. Solution viewing does not.

## Confirmed checks

- Ten local test groups cover grading, persistent storage, restart/logout,
  permissions, teacher isolation, nested answer-key protection, duplicate attempts,
  draft conflicts, overrides, optional assessment substitutions, and analytics.
- Three built-Worker integration groups cover the production request handler with
  asynchronous D1-shaped storage, concurrent writes, login limits, approval
  revocation, and student isolation.
- All 360 extra-practice answers pass their grading checks.
- Semantic rendering checked all 70 lesson views and 67 source diagrams across
  19 diagram types. JavaScript syntax checks pass.
- The private Sites deployment succeeded, and its production database tables were
  inspected. GitHub's verification workflow confirmed the exact application
  JavaScript was served over HTTPS on the custom domain.

## Verification limits

The browser runtime could not initialize, and the managed preview relay timed
out. Desktop/tablet/phone visual inspection and live authenticated browser flows
remain unverified. Local HTTP and built-Worker integration tests are not a claim
that those browser checks happened.

Content corrections use the documented versioned importer and a new deployment;
there is no in-browser curriculum editor. The original `Curriculum` branch is
public. Classroom permissions protect application endpoints and learner data,
but cannot make already-public original source files secret.
