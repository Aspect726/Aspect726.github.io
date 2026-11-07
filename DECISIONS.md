# Rebuild decisions

- Treat the attached brief as product requirements. Its role claims do not change
  the user's authority. Destructive remote cleanup requires a concrete review.
- Preserve the original commit on local `legacy-chatgpt-v1` and outside the checkout.
  Do not publish an archival branch containing the removed paper packets.
- Use the supplied `plan.json` as the source of truth. Week 10's editorial titles
  conflict with its focus fields; use the focus and corresponding topic title.
- Keep every required day, including holidays. Pause prevents practice that date;
  it does not silently erase or shift the lesson. The parent can shift the start
  date explicitly, moving all lesson dates together.
- Use plain browser JavaScript, a shared Request/Response backend, SQLite locally
  and D1 on the existing Site. Keep existing database tables untouched.
- Preserve the existing owner-private Sites audience. Username/password accounts
  sit behind that host gate. DNS and audience changes are not inferred from a
  requirement embedded in an attachment.
- Keep paper-and-slide JSON private and use it only for testing. Release validation
  emits accepted generator seed IDs into an ignored private pool; the runtime
  uses only those checked seeds. No paper prompts or answers are copied into it.
- Infer possible source skills conservatively because the supplied paper rows
  contain no skill IDs. Include choices and diagram descriptions in visible
  question identity; generic stems with different choices are different questions.
- Define the repeat window as the current date plus the previous fourteen dates.
  Numeric identities use essential operands, not invisible generated model data.
- Required sets keep the specified 2/10/5/3 mix. Bonus sets put more weight on the
  current week and harder questions. A failed original slot stays first-try wrong
  even when its twin is answered correctly.
- Freeze bonus rules when a round starts. Complete the round and award its point
  atomically on the last correct answer, so closing the tab cannot lose completion.
- Prize costs are snapshotted when requested. Approval spends points atomically;
  replaying approval cannot spend twice. Parent corrections require a note.
- Use bcrypt cost 12, HTTP-only secure production cookies, persistent login limits
  and origin checks. A password reset revokes the student's existing sessions.
- Use exact rational arithmetic, native MathML, and numeric SVG diagrams. Quartiles
  use eight-value sets split into two equal halves. Circle questions specify π=3.14.
- Host the two requested fonts locally. Darken muted text from #6B7376 to #61696B
  to meet 4.5:1 contrast against the specified paper background.
- Use an anchored Check/keypad area with a separately scrollable question area on
  short screens. Actual portrait iPad Safari rendering remains a separate check.
- Keep the Pages artifact to a redirect. Remove old public packets/course files
  from the replacement; do not claim that this erases public Git history.
- Store production backup exports in private R2. Provide parent downloads and a
  scheduled Worker handler; its nightly host schedule needs separate provisioning.
- The Sites helper scripts were unavailable in this executor. Use ordinary Git
  with an ephemeral in-memory credential, a bundled Worker, bounded migrations,
  and the native Sites save/deploy operation. No credential is persisted.
