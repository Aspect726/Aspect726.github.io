# Acceptance evidence

This follows Section 12 of the supplied brief. “Done” describes verified
implementation; domain routing and actual-device checks are called out separately.

| # | Status | Evidence |
|---|---|---|
| 1 | Not done | Login-only application built; donteventry.me is now attached with user approval, pending Namecheap DNS and certificate validation. Existing owner-private Sites gate remains. |
| 2 | Done | First-teacher setup, student creation, password reset/session revocation and a second teacher pass API and DOM tests. |
| 3 | Done | Supplied plan defines all 70 days, 7 November–15 January, with exact 2/10/5/3 required mix and date shifting. |
| 4 | Done | Private paper/slide corpus used to validate permitted seeds and a complete required/bonus bank. No corpus content is tracked. See validation counts below. |
| 5 | Done | 54 curriculum skills plus warm-up have five shapes, matched misconception hints and 500-seed checks. Geometry/statistics add picture shapes. |
| 6 | Done | Exact fraction/decimal/mixed-number equivalence, no-penalty simplest form, and stacked MathML pass tests. 1 3/4 equals 1.75, not 0.75. |
| 7 | Done | Two misses reveal worked steps and append a new twin; original-slot first-try status is retained. |
| 8 | Done | Required completion, 15/10 bonus sizes, original-slot accuracy threshold, limits, midnight and replay rules tested. |
| 9 | Done | Prize editing/request/approval/spending and ledger replay/overspend checks pass. |
| 10 | Done | Teacher Overview reports actual submitted values and human-readable chosen answers with correct answers. |
| 11 | Done | Anonymous/student route isolation, server-only answer fields, opaque choices, future-date protection and private-path denial tested. |
| 12 | Not done | Replacement removes old PDFs/course data. Remote main, Curriculum and historical public blobs are unchanged pending cleanup/cutover. Legacy is preserved locally. |
| 13 | Not done | Anchored portrait controls and DOM flow implemented; the browser runtime failed before inspection. Actual iPad Safari remains unverified. |
| 14 | Done | Specified fonts hosted locally; palette/MathML/reduced motion and banned-copy checks pass. Muted text darkened for contrast. Visual rendering remains item 13. |
| 15 | Done | DECISIONS.md records unresolved choices and deliberate differences. |

## Validation

- 112 application test groups passed with zero failures or skips on the integrated
  implementation, including 500 seeds for each of 55 generators and independent
  exact-arithmetic checks.
- Real-backend DOM test covers family setup, questions, twins, completion, account
  boundaries, points and prize approval. It does not emulate layout or Safari.
- Built Worker smoke test checks login/session cookies, role denial, local font
  delivery, and denial of server source, pools, old course data and packets.
- Release validation uses all 2,322 private paper/slide records and 2,469 segments.
  Source rows lack skill IDs; the validator infers candidate skills, conservatively
  includes all taught/strength skills for 73 ambiguous segments, and checks exact
  normalized text plus essential numeric operands.
- The production pool contains 168,960 permitted seed/difficulty combinations.
  Its provenance hashes cause builds to fail after any generator or checker change.
- Final stress generated 9,100 questions: the 4,550-question scheduled bank plus
  one fresh same-skill twin for every question. It passed the same paper/repeat checks.

## Remaining operational work

- The user authorized the custom-domain cutover. The attachment succeeded; apply
  the Namecheap records in DNS.md and verify HTTPS at donteventry.me. Browser
  access is unavailable here, so the DNS edits remain pending.
- Review and merge the source/Pages change; decide how to remove the old public
  Curriculum branch and historical answers. A branch deletion cannot erase copies
  already downloaded or public historical objects.
- Configure the two private GitHub Actions paper-bank secrets. The private release
  check intentionally fails without them; no passing CI run is claimed yet.
- Configure a nightly host schedule for the exported Worker scheduled handler.
  Teacher-triggered private R2 exports and downloads work; an exported handler alone
  does not establish that nightly backups run.
- Verify portrait iPad Safari, actual font/diagram layout and the under-two-second
  home-Wi-Fi load target. Browser initialization failed with
  “the gaas-browser node_repl sandbox cannot be disabled”.
