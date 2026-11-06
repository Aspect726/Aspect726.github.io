# Implementation checklist

- [x] Locate the expanded curriculum on the Curriculum branch.
- [x] Import and validate the complete versioned curriculum.
- [x] Verify 70 days, 1,450 required questions, and 140 challenges.
- [x] Cross-check structured records with student packets and teaching materials.
- [x] Create at least 300 independently validated extra questions (360 delivered).
- [x] Build student dashboard, course map, lessons, answering, and review.
- [x] Build teacher review, scheduling, overrides, and evidence-based analytics.
- [x] Persist accounts, drafts, attempts, and assignments in SQLite locally and D1 in production.
- [x] Test grading, authorization, idempotency, persistence, and analytics.
- [ ] Inspect desktop, tablet, and mobile interfaces in a browser.
- [x] Publish only public assets to GitHub Pages and verify deployment.
- [x] Provision and connect a production backend for authenticated progress.

The source upload has arrived, so the requested upload-wait condition is satisfied.
Do not publish answer keys or private databases in the Pages artifact.

Browser inspection remains unverified: CUA initialization failed and the managed
preview relay timed out. Automated tests cover the local server and built Worker;
they do not substitute for visual or live authenticated browser testing.
