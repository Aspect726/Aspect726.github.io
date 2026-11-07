# Practice API

All paths begin `/api`. JSON writes require `Content-Type: application/json` and
same-origin requests. Errors return `{error}`. Cookies authenticate all private
calls. No answer, hint or solution appears before the corresponding attempt.

- `GET /session` → `{user: {id,username,name,role}|null, setupRequired}`.
- `POST /setup` `{username,password,name}` → `{user}` and cookie; first parent only.
- `POST /login` `{username,password,remember}` → `{user}` and cookie.
- `POST /logout` `{}` → `{ok:true}`.
- `GET /today` → `{today,day,paused,run,points,nextPrize,bonus:{completed,limit,firstSize:15,laterSize:10,pointValue,threshold,available},settings:{startDate},paperVerified:boolean}`.
  `day` is plan day information; null before/after course. `run` is null or the
  run summary below. `nextPrize` is null or `{id,name,cost,needed}`.
- `GET /weeks` → `{days:[{...dayInfo,status:'done'|'missed'|'ahead'|'today',run}],today}`.
- `POST /runs` `{dayIndex,kind:'required'|'bonus'}` → run view.
- `GET /runs/:id` → run view.
- `POST /runs/:id/answer` `{questionId,answer,elapsedMs,requestId}` →
  `{correct,formOnly,hint?,solution?,revealed?,run}`. Retain `requestId` on retry.
  A correct answer or second wrong answer waits for Next, except the final correct answer completes the set immediately. A first wrong or form-only
  answer remains on the question.
- `POST /runs/:id/next` `{questionId}` → run view. Idempotent.

A run view is `{id,dayIndex,kind,round,total,completed,firstTryCorrect,done,pointsEarned,
question:{id,number,skill,prompt,plainPrompt,svg?,choices?,shape,tries,feedback?}|null}`.
`question.number` counts finished slots, not failed originals; twins replace their
slot and appear later in the queue. Feedback persists across reloads.

- `GET /prizes` → `{points,prizes:[{id,name,cost,active}],requests,history}`.
- `POST /prizes/:id/request` `{}` → `{ok:true}`.
- `GET /parent/overview` → `{student,days,misses,points}`; `days` has date,
  dayIndex,done,firstTryCorrect,total,timeMs,bonusRounds,pointsEarned. Misses include
  prompt,skill,answer,rightAnswer,tryNumber,createdAt.
- `GET /parent/skills` → `{skills:[{skill,name,attempts,firstTryCorrect,accuracy,label}],attempts}`.
  Optional `?skill=ID` filters attempts.
- `GET /parent/settings` → `{settings,accounts,backup:{latestDate}}`.
- `PATCH /parent/settings` `{startDate?,paused?,pausedDates?,bonusLimit?,bonusThreshold?,bonusPointValue?}`.
  Threshold is a percentage (default 80).
- `POST /parent/accounts` `{username,password,name,role:'student'|'parent'}` → `{user}`.
- `POST /parent/accounts/:id/password` `{password}` → `{ok:true}`.
- `POST /parent/prizes` `{name,cost}` → `{prize}`.
- `PATCH /parent/prizes/:id` `{name?,cost?,active?}` → `{ok:true}`.
- `POST /parent/requests/:id` `{action:'approve'|'decline'}` → `{ok:true}`.
- `POST /parent/points` `{amount,note,requestId}` → `{ok:true}`; signed correction,
  never permits a negative balance. A note is required.
- `GET /parent/backup` → downloadable JSON export, including credential hashes.
- `POST /parent/backup` `{}` → `{ok:true,date}`; save today's snapshot.

No practice content or parent route is reachable before login. Student requests
to parent APIs receive 403. Assets contain only the shell, styling and UI logic.
