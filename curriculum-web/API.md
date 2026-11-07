# Practice API

All paths begin `/api`. JSON writes require `Content-Type: application/json` and
same-origin requests. Errors return `{error}`. Cookies authenticate all private
calls. Student question responses expose no answer, hint or solution before the
corresponding attempt. Authorized teachers can inspect them in the preview API.

- `GET /session` → `{user: {id,username,name,role}|null, setupRequired}`. Roles are `teacher` and `student`.
- `POST /setup` `{username,password,name}` → `{user}` and cookie; first teacher only.
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
- `GET /teacher/dashboard` → `{student,days,misses,points}`; `days` has date,
  dayIndex,done,firstTryCorrect,total,timeMs,bonusRounds,pointsEarned. Misses include
  prompt,skill,answer,rightAnswer,tryNumber,createdAt.
- `GET /teacher/weeks` → `{today,student,days:[{...dayInfo,status,run}]}`. All 70
  days include dates, topics and student progress, including future, completed
  and paused days. A run contains only `{completed,total,firstTryCorrect,done}`.
- `GET /teacher/preview?dayIndex=0&kind=required&round=0` →
  `{day,kind,round,total,questions:[{...publicQuestion,answer,solution,hint,hints}]}`.
  `dayIndex` is 0–69; `kind` is `required` or `bonus`; `round` is 0–19. Required
  sets contain 20 questions; the first bonus round contains 15, later rounds 10.
  Answers are readable strings, solution steps contain safe generated HTML, and
  each hint includes `{answer,text}`. Uses the vetted question pool in production.
  This read-only preview creates no run, attempt, points or student progress and
  works before a student account exists. All days are available regardless of
  dates or pauses.
- `GET /teacher/skills` → `{skills:[{skill,name,attempts,firstTryCorrect,accuracy,label}],attempts}`.
  Optional `?skill=ID` filters attempts.
- `GET /teacher/settings` → `{settings,accounts,backup:{latestDate}}`.
- `PATCH /teacher/settings` `{startDate?,paused?,pausedDates?,bonusLimit?,bonusThreshold?,bonusPointValue?}`.
  Threshold is a percentage (default 80).
- `POST /teacher/accounts` `{username,password,name,role:'student'|'teacher'}` → `{user}`.
- `POST /teacher/accounts/:id/password` `{password}` → `{ok:true}`.
- `POST /teacher/prizes` `{name,cost}` → `{prize}`.
- `PATCH /teacher/prizes/:id` `{name?,cost?,active?}` → `{ok:true}`.
- `POST /teacher/requests/:id` `{action:'approve'|'decline'}` → `{ok:true}`.
- `POST /teacher/points` `{amount,note,requestId}` → `{ok:true}`; signed correction,
  never permits a negative balance. A note is required.
- `GET /teacher/backup` → downloadable JSON export, including credential hashes.
- `POST /teacher/backup` `{}` → `{ok:true,date}`; save today's snapshot.

No practice content or teacher route is reachable before login. Student requests
to teacher APIs receive 403. Assets contain only the shell, styling and UI logic.

Teacher dashboard routes use `/teacher/*`. Existing `/parent/*` API links remain
compatibility aliases with the same teacher-only authorization. The client routes
`#teacher/dashboard` and `#student/dashboard` are the two role-specific homes.
Teachers can open `#teacher/weeks` or `#teacher/preview/:dayIndex` (with optional
`?kind=bonus&round=0`) to inspect practice without starting a student session.
