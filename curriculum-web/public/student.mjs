import { tutorPanelMarkup, mountTutorPanel } from './tutor-panel.mjs';
import { learningCharacter, pointProgress } from './learning-character.mjs';
// Full student pages. Accounts, questions, attempts and points stay on the server.
let revision = 0;
let advanceTimer;
let deadlineTimer;
const number = value => Number(value || 0).toLocaleString('en-US');
const dateText = (value, options = {}) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC', ...options }).format(new Date(`${String(value).slice(0, 10)}T12:00:00Z`)) : '';
const percent = value => value == null ? '—' : `${Math.round(Number(value))}%`;
const labelLevel = value => ({ 'not-started': 'Not started', 'not_started': 'Not started', learning: 'Learning', practicing: 'Practicing', mastered: 'Mastered' }[value] || value || 'Not started');
const levelClass = value => String(value || 'not-started').toLowerCase().replace(/[_ ]/g, '-');
const addDays = (date, count) => new Date(Date.parse(`${date}T12:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
const list = value => Array.isArray(value) ? value : [];
const eId = value => encodeURIComponent(value);
// Generated solutions may carry their own numbering; the ordered list supplies it.
const stepMarkup = (ctx, step) => ctx.mathMarkup(String(step ?? '').replace(/^\d+[.)]\s+/, ''), true);

const qSkill = value => typeof value === 'string' ? value : value?.skill || value?.id;
const nav = (href, label, style = 'button secondary') => `<a class="${style}" data-nav href="${href}">${label}</a>`;
const mathMotif = kind => kind === 'path'
  ? '<svg viewBox="0 0 104 64" width="104" height="64" fill="none" aria-hidden="true"><path d="M10 52H94M20 58V8" stroke="currentColor" stroke-width="1.5"/><path d="M20 48C35 49 35 18 52 25S70 50 88 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="52" cy="25" r="4" fill="var(--gold)" stroke="currentColor" stroke-width="1.5"/><path d="m76 13 12-3-1 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  : '<svg viewBox="0 0 104 64" width="104" height="64" fill="none" aria-hidden="true"><path d="M14 18h22M25 7v22M62 15h25M62 25h25M18 48l14-14M18 34l14 14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="m59 45 8 8 12-19h15" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const heading = (ctx, title, subtitle = '', eyebrow = '', motif = '') => `<header class="page-heading${motif ? ' with-math' : ''}"><div>${eyebrow ? `<p class="eyebrow">${ctx.escape(eyebrow)}</p>` : ''}<h1>${ctx.escape(title)}</h1>${subtitle ? `<p class="muted">${ctx.escape(subtitle)}</p>` : ''}</div>${motif ? `<span class="page-math" aria-hidden="true">${mathMotif(motif)}</span>` : ''}</header>`;
const empty = (ctx, title, text, link = '') => `<section class="card empty-state"><h2>${ctx.escape(title)}</h2><p>${ctx.escape(text)}</p>${link}</section>`;
const errorHTML = '<p class="form-error" role="alert" hidden></p>';
const iconCheck = '<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg>';
function chart(ctx, data, { max = 100, label = 'Accuracy by day', format = value => `${Math.round(value)}%` } = {}) {
  const points = data.filter(item => item.value != null && Number.isFinite(Number(item.value)));
  if (!points.length) return `<p class="muted">Nothing yet. Answer a few questions and this fills in.</p>`;
  const width = 660, height = 180, left = 44, right = 20, top = 15, bottom = 38;
  const x = index => left + index * (width - left - right) / Math.max(1, points.length - 1);
  const y = value => height - bottom - Math.max(0, Math.min(max, Number(value))) / max * (height - top - bottom);
  return `<figure class="chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${ctx.escape(label)}"><title>${ctx.escape(label)}</title>${[0, max / 2, max].map(value => `<line x1="${left}" x2="${width - right}" y1="${y(value)}" y2="${y(value)}" stroke="var(--line)"/><text x="${left - 8}" y="${y(value) + 4}" text-anchor="end" fill="currentColor" font-size="11">${ctx.escape(format(value))}</text>`).join('')}<polyline points="${points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ')}" fill="none" stroke="var(--teal)" stroke-width="2.5"/>${points.map((point, index) => `<circle cx="${x(index)}" cy="${y(point.value)}" r="4" fill="var(--teal)"><title>${ctx.escape(point.label)}: ${ctx.escape(format(point.value))}</title></circle>${index === 0 || index === points.length - 1 ? `<text x="${x(index)}" y="${height - 12}" text-anchor="${index === 0 ? 'start' : 'end'}" fill="currentColor" font-size="11">${ctx.escape(point.label)}</text>` : ''}`).join('')}</svg><details><summary>View chart values</summary><ul>${points.map(point => `<li>${ctx.escape(point.label)}: ${ctx.escape(format(point.value))}</li>`).join('')}</ul></details></figure>`;
}
function masteryTiles(ctx, skills) {
  return `<div class="mastery-grid">${list(skills).map(skill => `<a data-nav href="/s/learn/${eId(qSkill(skill))}" class="mastery-tile ${levelClass(skill.level)}"><strong>${ctx.escape(skill.name || qSkill(skill))}</strong><span class="mastery-status">${ctx.escape(labelLevel(skill.level))}</span><small>${number(skill.attempts)} answered${skill.attempts ? `<span>${percent(skill.accuracy)} recent accuracy</span>` : ''}</small></a>`).join('')}</div>`;
}
function ring(ctx, count, target) {
  const circumference = 2 * Math.PI * 58;
  return `<div class="progress-ring" role="img" aria-label="${number(count)} of ${number(target)} questions answered"><svg viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="58" fill="none" stroke="var(--line)" stroke-width="8"/><circle cx="70" cy="70" r="58" fill="none" stroke="${count >= target ? 'var(--good)' : 'var(--brick)'}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - Math.min(1, count / target))}" transform="rotate(-90 70 70)"/></svg><div class="ring-value"><strong>${number(Math.min(count, target))}</strong><span>/ ${number(target)}</span><small>${count >= target ? 'Daily practice complete' : 'answered today'}</small></div></div>`;
}
function cacheSummary(ctx, summary) { if (summary) { ctx.state.summary = summary; ctx.state.today = summary; } }
function backlogOf(data) { return data?.schedule?.backlog || data?.backlog || null; }
const catchupPath='/s/practice?intent=catchup&count=5';
function backlogPanel(ctx,data,{compact=false}={}) {
  const backlog=backlogOf(data);
  if(!backlog)return '';
  const behind=Number(backlog.behind || 0),overdue=Number(backlog.overdue || 0),today=Number(backlog.remainingToday || 0);
  const complete=Number(backlog.completedToDate || 0),required=Number(backlog.requiredToDate || 0);
  const next=backlog.nextCatchupDay;
  return `<section class="backlog-banner learning-catchup${behind?'':' caught-up'}${compact?' backlog-compact':''}" aria-label="Your catch-up plan"><div class="backlog-main"><p class="eyebrow">Required work</p><h2><strong data-questions-behind>${number(behind)}</strong> <span>${behind?'questions behind':'questions left to catch up'}</span></h2><div class="backlog-breakdown"><span><strong>${number(overdue)}</strong> from earlier days</span><span aria-hidden="true">+</span><span><strong>${number(today)}</strong> due today</span></div><p>${behind?overdue?today?'Finish today’s goal first. Extra answers then reduce the oldest overdue work.':'Today’s goal is complete. Each extra answer now reduces your overdue work.':'These are today’s questions. There is no earlier work to catch up.':'All caught up! Your practice through today is complete.'}</p>${behind?`<p class="backlog-counted">${number(complete)} of ${number(required)} questions due so far completed.</p>`:''}${overdue&&next?.title?`<p class="catchup-focus"><strong>Next topic:</strong> ${ctx.escape(next.title)}</p>`:''}</div><div class="backlog-action">${today?nav('/s/practice',overdue?'Finish today first':'Open daily questions','button secondary'):overdue?nav(catchupPath,'Catch up 5 questions','button secondary'):nav('/s/extra','Extra practice','text-link')}${overdue&&backlog.oldestDueDate?`<span>From ${ctx.escape(dateText(backlog.oldestDueDate))}’s lesson</span>`:''}${nav('/s/progress','See my progress','text-link')}</div></section>`;
}
function pointsPanel(ctx, summary, { compact = false, action = true } = {}) {
  const p=pointProgress(summary);
  return `<section class="learning-points${compact?' compact':''}" aria-label="How to earn points"><div class="learning-points-heading"><div><p class="eyebrow">Bonus points</p><h2><strong>${number(p.remaining)}</strong> questions to your next point</h2></div><span class="learning-point-token" aria-hidden="true">★</span></div><div class="point-progress-track" role="progressbar" aria-label="Progress toward the next point" aria-valuemin="0" aria-valuemax="${p.span}" aria-valuenow="${Math.min(p.span,p.completed)}"><span style="width:${Math.min(100,p.completed/p.span*100)}%"></span></div><p class="point-progress-caption">${number(p.answered)} answered today · next point at ${number(p.next)}</p><p class="point-overlap">Catch-up answers can earn points too.</p><details class="point-rules"><summary>How points work</summary><ol><li>The first <strong>${number(p.dailyTarget)}</strong> answers finish today’s goal.</li><li>Answer <strong>${number(p.bonusFirst)} more</strong> to earn your first point: <strong>${number(p.first)} total</strong> today.</li><li>Then earn <strong>1 point for every ${number(p.bonusStep)} more answers</strong>.</li></ol><p>Extra answers also clear older work. Points are saved until you spend them; the next-point count starts again each day. Hints and wrong answers do not take points away.</p></details><div class="learning-points-footer"><a data-nav href="/s/rewards"><strong>${number(p.points)}</strong> points saved · See rewards</a>${action?nav('/s/extra','Practice for points','text-link'):''}</div></section>`;
}
function backlogLive(ctx,summary,local) {
  const backlog=backlogOf(summary);if(!backlog)return '';
  const reduction=Math.max(0,Number(local.startBehind ?? backlog.behind)-Number(backlog.behind));
  return `<div class="practice-backlog${backlog.behind?'':' caught-up'}" aria-live="polite" aria-atomic="true"><span><strong data-questions-behind>${number(backlog.behind)}</strong> ${backlog.behind?'questions behind':'left to catch up'}${reduction?` <span class="backlog-reduction">−${number(reduction)} this set</span>`:''}</span><span>${number(backlog.overdue)} earlier + ${number(backlog.remainingToday)} today</span></div>`;
}
function scheduleDay(data) {
  return data.schedule ? data.schedule.today : {date:data.today || data.date,expected:data.dailyTarget || 20,answered:data.answered || 0,remaining:Math.max(0,(data.dailyTarget || 20)-(data.answered || 0))};
}
function deadlineTime(dueAt,timeZone='America/Los_Angeles') {
  if(!dueAt || !Number.isFinite(Date.parse(dueAt))) return '';
  return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone,timeZoneName:'short'}).format(new Date(Date.parse(dueAt)-1));
}
function timeLeft(dueAt) {
  const minutes=Math.max(0,Math.ceil((Date.parse(dueAt)-Date.now())/60000));
  if(!Number.isFinite(minutes))return '';
  if(!minutes)return 'Today’s deadline has passed';
  const hours=Math.floor(minutes/60),rest=minutes%60;
  return `${hours?`${number(hours)}h `:''}${number(rest)}m left today`;
}
function startDeadline(ctx,token,dueAt) {
  clearInterval(deadlineTimer);
  if(!dueAt)return;
  const update=()=>{
    const el=document.querySelector('[data-daily-countdown]');
    if(token!==revision || !ctx.isCurrent() || !el){clearInterval(deadlineTimer);return;}
    el.textContent=timeLeft(dueAt);
  };
  update();deadlineTimer=setInterval(update,30000);deadlineTimer.unref?.();
}
function dailyStrip(ctx,data) {
  const current=data.today || data.date,scheduled=list(data.schedule?.days);
  const days=list(data.weekDays).length?data.weekDays:scheduled.filter(day=>day.week===data.week?.week);
  return `<div class="week-strip daily-week-strip">${days.map(day=>{
    const scheduledDay=scheduled.find(item=>item.date===day.date),target=scheduledDay?.expected || data.dailyTarget || 20;
    const answered=Number(scheduledDay?.answered ?? day.answered ?? 0),credited=Number(scheduledDay?.credited ?? answered),status=scheduledDay?.status || day.status || 'upcoming';
    return `<div class="day-dot ${ctx.escape(status)}${scheduledDay?.caughtUp?' caught-up':''}${day.date===current?' current':''}" ${day.date===current?'aria-current="date"':''} aria-label="${ctx.escape(dateText(day.date))}: ${number(answered)} answered on this date; ${number(credited)} of ${number(target)} counted toward its goal${scheduledDay?.caughtUp?'; caught up later':''}"><span>${ctx.escape(dateText(day.date,{weekday:'short',month:undefined,day:undefined}).slice(0,3))}</span><strong>${dateText(day.date,{day:'numeric',month:undefined})}</strong><small>${scheduledDay?.caughtUp?'✓ Caught up':credited>=target?'✓ Done':`${number(credited)} / ${number(target)}`}</small></div>`;
  }).join('')}</div>`;
}
async function today(ctx, token) {
  const data=ctx.initialSummary || await ctx.api('/v2/student/summary');
  if(token!==revision || ctx.state.user?.role!=='student' || !ctx.isCurrent())return;
  cacheSummary(ctx,data);
  const schedule=data.schedule,scheduledDay=scheduleDay(data),week=data.week || {},day=data.day || {};
  const target=Number(scheduledDay?.expected || data.dailyTarget || 20),answered=Number(data.answered || 0),remaining=Math.max(0,target-answered);
  const completed=Boolean(scheduledDay)&&remaining===0,active=Boolean(scheduledDay);
  const skill=qSkill(day.focus?.[0] || week.skills?.[0]);
  const note=typeof data.teacherNote==='string'?data.teacherNote:data.teacherNote?.text;
  const beforeStart=schedule && (data.today || data.date)<schedule.startDate;
  const title=active?completed?'Today’s practice is done!':`Your daily ${number(target)}`:beforeStart?'Your daily practice starts soon':'Extra practice';
  const dailyAction=active&&!completed?nav('/s/practice',answered?'Continue daily questions':'Start daily questions','button daily-start'):(backlogOf(data)?.overdue?nav(catchupPath,'Start 5 catch-up questions','button daily-start'):nav('/s/extra','Try extra practice','button daily-start'));
  const due=active&&!completed&&scheduledDay?.dueAt?`<div class="daily-deadline"><span>Due today · ${ctx.escape(deadlineTime(scheduledDay.dueAt,schedule?.timeZone))}</span><strong data-daily-countdown>${ctx.escape(timeLeft(scheduledDay.dueAt))}</strong></div>`:'';
  const status=active?completed?`${number(answered)} answered today. Your work is saved.`:`${number(remaining)} questions left today. You can stop and come back.`:beforeStart?`Your first daily set is ${dateText(schedule.startDate,{weekday:'long'})}.`:'There is no daily set due today. Choose a skill to keep practicing.';
  ctx.shell(`<div class="student-today-simple"><header class="today-dateline"><p>${ctx.escape(dateText(data.today || data.date,{weekday:'long'}))}</p><span>${scheduledDay?.dayNumber?`Day ${number(scheduledDay.dayNumber)} of ${number(schedule?.totalDays || 70)}`:schedule?`${dateText(schedule.startDate)} – ${dateText(schedule.endDate)}`:`Week ${number(day.week || week.week || 1)}`}</span></header>
    <div class="daily-top-row"><section class="daily-task-card ${completed?'daily-complete':''}" aria-labelledby="daily-title"><div class="daily-title-row"><div><p class="eyebrow">${completed?'Daily goal complete':'Start here'}</p><h1 id="daily-title">${title}</h1></div><span class="daily-math-doodle" aria-hidden="true">${learningCharacter()}</span></div><div class="daily-count"><strong>${number(Math.min(answered,target))}<span> / ${number(target)}</span></strong><span>${completed?'daily goal complete':'questions answered today'}</span></div><div class="progress-track" role="progressbar" aria-label="Daily questions answered" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${Math.min(answered,target)}"><div class="progress-fill" style="width:${Math.min(100,answered/target*100)}%"></div></div><p class="daily-status">${status}</p>${active?`<p class="daily-topic"><span>Today’s focus</span> ${ctx.escape(day.title || week.title || "Build your maths skills")}</p>`:""}${due}<div class="daily-action-row">${dailyAction}${skill?nav(`/s/learn/${eId(skill)}`,'Today’s lesson','text-link'):''}<span>${active&&!completed?(target===20?'6 warm-ups + 14 story questions':'A short warm-up, then story problems'):completed?backlogOf(data)?.overdue?'Try a short catch-up set next':'Extra practice is optional':''}</span></div>${active&&!completed?'<p class="daily-included">Your teacher’s assignments and due reviews are included.</p>':''}</section>
    <aside class="daily-teacher-note" aria-labelledby="teacher-note-title"><p class="eyebrow">Week ${number(day.week || week.week || 1)}</p><h2 id="teacher-note-title">From your teacher</h2><p>${note?ctx.escape(note):'No note added for this week.'}</p><span class="teacher-note-mark" aria-hidden="true">✎</span></aside></div>
    <div class="student-goal-pair">${backlogPanel(ctx,data,{compact:true})}${pointsPanel(ctx,data,{compact:true,action:false})}</div>
    <section class="practice-choices" aria-label="More ways to practice"><article class="practice-choice extra-choice"><div><h2>Extra practice</h2><p>Pick a skill or try five mixed questions.</p></div>${nav('/s/extra','Choose practice','button secondary')}</article><article class="practice-choice review-choice"><div><h2>Review <span class="review-count">${number(data.reviewDue)} due</span></h2><p>${Number(data.reviewDue)?'Fresh questions on ideas you’ve tried before. They count toward today’s goal.':'Nothing is due. Tricky ideas will return here when it’s time to try again.'}</p></div>${nav('/s/review',Number(data.reviewDue)?'Review now':'See review','button secondary')}</article></section>
    <section class="daily-week-card"><div class="section-heading"><div><h2>Your week</h2><p class="small">Daily questions began ${schedule?dateText(schedule.startDate,{weekday:'short'}):'Saturday, Nov 7'}.</p></div>${nav('/s/progress','All days & progress','text-link')}</div>${dailyStrip(ctx,data)}<div class="daily-small-stats"><span><strong>${number(data.streak)}</strong> day streak</span><a href="/s/rewards" data-nav><strong>${number(data.points)}</strong> points saved</a>${backlogOf(data)?.behind?nav('/s/progress',`${number(backlogOf(data).behind)} questions behind`,'text-link'):''}</div></section>
    <details class="today-resources"><summary>Lessons and useful maths tools</summary><div><p>${ctx.escape(day.title || week.title || 'Explore the ideas behind your questions.')}</p><div class="form-actions">${nav(skill?`/s/learn/${eId(skill)}`:'/s/library','Today’s lesson','text-link')}${nav('/s/library','Maths toolbox','text-link')}${nav('/s/map','Course map','text-link')}</div></div></details></div>`,{title:'Daily questions'});
  if(active&&!completed)startDeadline(ctx,token,scheduledDay?.dueAt);
}
async function extraPractice(ctx,token) {
  const [data,libraryData]=await Promise.all([ctx.initialSummary || ctx.api('/v2/student/summary'),ctx.api('/v2/student/library')]);
  if(token!==revision || ctx.state.user?.role!=='student' || !ctx.isCurrent())return;
  cacheSummary(ctx,data);
  const skills=list(libraryData.skills),remaining=Math.max(0,Number(data.dailyTarget || 20)-Number(data.answered || 0));
  const focus=new Set(list(data.day?.focus).map(qSkill));
  const ordered=[...skills].sort((a,b)=>Number(focus.has(qSkill(b)))-Number(focus.has(qSkill(a)))||Number(a.week || 0)-Number(b.week || 0));
  ctx.shell(`<div class="extra-practice-page">${heading(ctx,'Extra practice','Choose five questions from a lesson, or practice topics you have already learned.','Practice','path')}<div class="student-goal-pair">${backlogPanel(ctx,data,{compact:true})}${pointsPanel(ctx,data,{compact:true,action:false})}</div><section class="extra-mix-card"><div><h2>Mixed practice</h2><p>Five mixed questions from the course so far.</p><p class="small">${remaining?`${number(remaining)} daily questions remain. These answers count toward today’s goal.`:backlogOf(data)?.overdue?'Your daily goal is complete. Every extra answer now reduces your earlier work.':'Your daily goal is complete. Keep going if you would like to.'}</p></div>${nav('/s/practice?source=practice&count=5','Start 5 mixed questions','button')}</section><section class="extra-skills"><div class="section-heading"><div><h2>Or choose one skill</h2><p class="small">Open a lesson whenever you need a refresher.</p></div><label class="field extra-search" for="extra-search">Find a skill<input id="extra-search" type="search" placeholder="Try fractions, area, decimals…"></label></div><div class="extra-skill-list">${ordered.map((item,index)=>`<article class="extra-skill" ${index>=8?'hidden':''} data-extra-search="${ctx.escape(`${item.name} ${item.rule || ''}`.toLowerCase())}"><div><span class="small">${focus.has(qSkill(item))?'Today’s focus':item.week?`Week ${number(item.week)}`:'Course skill'}</span><h3>${ctx.escape(item.name || qSkill(item))}</h3></div><div class="form-actions">${nav(`/s/practice?source=library&skill=${eId(qSkill(item))}&count=5`,'Practice 5','button secondary')}${nav(`/s/learn/${eId(qSkill(item))}`,'Lesson','text-link')}</div></article>`).join('')}</div>${ordered.length>8?`<button id="extra-show-all" type="button" class="text-link">Show all ${number(ordered.length)} skills</button>`:''}<p id="extra-empty" class="empty-state" hidden>No matching skills. Try a different word.</p></section></div>`,{title:'Extra practice'});
  let showAll=false;
  const showAllButton=document.querySelector('#extra-show-all');
  showAllButton?.addEventListener('click',()=>{showAll=true;document.querySelectorAll('[data-extra-search]').forEach(row=>{row.hidden=false;});showAllButton.hidden=true;});
  document.querySelector('#extra-search').addEventListener('input',event=>{
    const term=event.target.value.trim().toLowerCase();let count=0;
    document.querySelectorAll('[data-extra-search]').forEach((row,index)=>{row.hidden=term?!row.dataset.extraSearch.includes(term):!showAll&&index>=8;if(!row.hidden)count++;});
    if(showAllButton)showAllButton.hidden=Boolean(term)||showAll;
    document.querySelector('#extra-empty').hidden=count>0;
  });
}
async function courseMap(ctx, token) {
  const data = await ctx.api('/v2/student/map');
  if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
  ctx.shell(`${heading(ctx, 'Course map', 'Follow the weeks in order. Open a week to see its lessons and practice.', 'Your learning path', 'path')}<section class="map-start-card">${learningCharacter()}<div><h2>Your next step</h2><p>Start with today’s questions. The current week is open below; earlier lessons are always available for review.</p>${nav('/s/today','Go to today','button')}</div>${learningCharacter({variant:'circle'})}</section><div class="course-path edu-course-index">${list(data.weeks).map(week => `<section class="week-node ${ctx.escape(week.status || 'upcoming')}"><span class="week-marker" aria-hidden="true">${week.status === 'done' ? '✓' : number(week.week)}</span><details class="card" ${week.status === 'current' ? 'open' : ''}><summary class="course-summary"><span class="course-summary-top"><span class="eyebrow">Chapter ${String(week.week).padStart(2, '0')} · Week ${number(week.week)}</span><span class="badge course-status ${ctx.escape(week.status || 'upcoming')}">${week.status === 'current' ? 'You are here' : week.status === 'done' ? 'Complete' : week.status === 'missed' ? 'Needs practice' : 'Upcoming'}</span></span><h2>${ctx.escape(week.title)}</h2><span class="course-meta"><span>${dateText(week.startDate)} – ${dateText(week.endDate)}</span><span>${list(week.skills).length} skills</span>${week.status === 'done' && week.accuracy != null ? `<span>${percent(week.accuracy)} accuracy</span>` : ''}</span><span class="small skill-preview">${list(week.skills).slice(0, 4).map(s => ctx.escape(s.name || qSkill(s))).join(' · ')}${list(week.skills).length > 4 ? ` · ${list(week.skills).length - 4} more inside` : ''}</span><span class="course-open-label">View skills and practice</span></summary><ul class="skill-list">${list(week.skills).map(skill => `<li class="course-skill-row"><div class="course-skill-name"><strong>${ctx.escape(skill.name || qSkill(skill))}</strong><span class="badge ${levelClass(skill.level)}">${ctx.escape(labelLevel(skill.level))}</span></div><div class="form-actions">${nav(`/s/learn/${eId(qSkill(skill))}`, 'Learn')}${nav(`/s/practice?source=library&skill=${eId(qSkill(skill))}&count=5`, 'Practice')}</div></li>`).join('')}</ul></details></section>`).join('')}<section class="week-node goal-node"><span class="week-marker" aria-hidden="true">✓</span><div class="card"><p class="eyebrow">Your goal</p><h2>Choose a lesson to study</h2><p>Use what you have learned to solve problems and explain your thinking.</p></div></section></div>`, { title: 'Course map' });
}
async function progressPage(ctx, token) {
  const data=await ctx.api('/v2/student/progress');
  if(token!==revision || ctx.state.user?.role!=='student' || !ctx.isCurrent())return;
  const weeks=list(data.weeks),skills=list(data.skills),recorded=list(data.days),schedule=data.schedule;
  const days=list(schedule?.days).length?schedule.days:weeks.length?weeks.flatMap(week=>Array.from({length:7},(_,index)=>{
    const date=addDays(week.startDate,index),day=recorded.find(item=>item.date===date);
    return {...(day || {}),date,answered:day?.answered || 0,expected:day?.target || data.program?.dailyTarget || 20};
  })):recorded;
  const finished=days.filter(day=>Number(day.credited ?? day.answered)>=Number(day.expected || day.target || 20)).length;
  const current=schedule?.today?.date || data.today || data.date;
  const sortedDays=[...days].sort((a,b)=>a.date.localeCompare(b.date));
  const actualDays=new Map(sortedDays.map(day=>[day.date,day]));
  const calendarDates=sortedDays.length?Array.from({length:Math.round((Date.parse(sortedDays.at(-1).date+'T12:00:00Z')-Date.parse(sortedDays[0].date+'T12:00:00Z'))/86400000)+1},(_,index)=>addDays(sortedDays[0].date,index)):[];
  const leading=sortedDays.length?new Date(sortedDays[0].date+'T12:00:00Z').getUTCDay():0;
  const calendar='<span class="calendar-spacer" aria-hidden="true"></span>'.repeat(leading)+calendarDates.map(date=>{
    const day=actualDays.get(date);
    if(!day)return `<div class="calendar-break" aria-label="${ctx.escape(dateText(date))}: no lesson scheduled"><span>${dateText(date,{day:'numeric',month:undefined})}</span><small>No lesson</small></div>`;
    const target=Number(day.expected || day.target || 20),answered=Number(day.answered || 0),credited=Number(day.credited ?? answered),remaining=Math.max(0,target-credited),catchup=Math.max(0,credited-Math.min(answered,target));
    const state=credited>=target?'complete':day.status==='upcoming' || (current&&day.date>current)?'upcoming':credited?'partial':'empty';
    const status=day.caughtUp?'Caught up later':state==='complete'?'Goal met on the day':state==='upcoming'?'Coming up':`${number(remaining)} left for this goal`;
    return `<div class="calendar-square ${state}${day.date===current?' today':''}" tabindex="0" aria-label="${ctx.escape(dateText(day.date,{weekday:'long'}))}: ${number(answered)} answered on this date, ${number(catchup)} credited from catch-up. ${number(credited)} of ${number(target)} completed. ${status}"><span>${dateText(day.date,{day:'numeric',month:undefined})}</span><strong>${state==='complete'?'✓':state==='upcoming'?'—':number(credited)}</strong><small>${state==='upcoming'?'Upcoming':`${number(Math.min(credited,target))} / ${number(target)}`}</small>${catchup?`<small class="calendar-catchup">${day.caughtUp?'Caught up':`+${number(catchup)} catch-up`}</small>`:''}</div>`;
  }).join('');
  ctx.shell(`<div class="student-progress-simple">${heading(ctx,'Your progress','See completed work, catch-up progress and the skills you are learning.','Learning record','path')}${backlogPanel(ctx,data)}<section class="progress-overview"><p><strong>${number(finished)}<span> / ${number(days.length || 70)}</span></strong><span>daily goals met</span></p><p><strong>${number(data.totalQuestions)}</strong><span>questions answered</span></p><p><strong>${number(data.streak)}</strong><span>day streak</span></p>${nav('/s/today','Back to today','button secondary')}</section><section class="calendar-section calendar-first"><div class="section-heading"><div><h2>Your daily practice</h2><p>${days.length?`${dateText(days[0].date)} – ${dateText(days.at(-1).date)} · `:''}${number(data.program?.dailyTarget || schedule?.dailyTarget || 20)} questions each day</p></div></div><p class="small">Counts show progress toward each daily goal. Catch-up answers fill earlier goals; your activity stays on the date you did it.</p><ul class="calendar-legend" aria-label="Calendar key"><li><span class="legend-key complete" aria-hidden="true"></span>Goal met</li><li><span class="legend-key partial" aria-hidden="true"></span>Some answered</li><li><span class="legend-key empty" aria-hidden="true"></span>Not completed</li><li><span class="legend-key upcoming" aria-hidden="true"></span>Coming up</li></ul><div class="calendar-weekdays" aria-hidden="true">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=>`<span>${day}</span>`).join('')}</div><div class="calendar-grid">${calendar}</div>${backlogOf(data)?`<p class="calendar-note">${number(backlogOf(data).catchupCredit)} answers have helped catch up earlier work. ${number(backlogOf(data).onTimeCompletions)} daily goals were finished on time.${backlogOf(data).overdue?` ${nav(catchupPath,'Try 5 catch-up questions','text-link')}`:''}</p>`:''}</section><details class="progress-detail"><summary>Skills I’m learning <span>${number(skills.length)} skills</span></summary><div>${weeks.length?weeks.map(week=>`<details class="mastery-week"><summary>Week ${number(week.week)} · ${ctx.escape(week.title)}</summary>${masteryTiles(ctx,skills.filter(skill=>Number(skill.week)===Number(week.week)).length?skills.filter(skill=>Number(skill.week)===Number(week.week)):week.skills)}</details>`).join(''):masteryTiles(ctx,skills)}</div></details><details class="progress-detail"><summary>Accuracy and weekly checks <span>${data.totalQuestions?percent(data.overallAccuracy):'Nothing yet'}</span></summary><div class="grid-two student-chart-grid"><section><h2>Accuracy over time</h2>${chart(ctx,days.filter(day=>day.answered).map(day=>({label:dateText(day.date),value:day.accuracy})))}</section><section><h2>Friday paper checks</h2>${list(data.checks).length?chart(ctx,data.checks.map(check=>({label:`Week ${check.week}`,value:check.score})),{max:21,label:'Friday paper scores out of 21',format:value=>`${value} / 21`}):'<p class="muted">Your teacher will add your Friday paper scores here.</p>'}</section></div></details></div>`,{title:'Progress'});
}
async function rewards(ctx, token) {
  const [data, summary] = await Promise.all([ctx.api('/v2/student/rewards'), ctx.initialSummary || ctx.api('/v2/student/summary')]);
  if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
  const requests = list(data.requests), active = list(data.prizes).filter(prize => prize.active);
  ctx.shell(`${heading(ctx, 'Points & rewards', 'Earn points with extra questions. Save them for a prize your teacher has added.', 'Your rewards')}<section class="card rewards-balance edu-reward-note"><div><p class="eyebrow">Your balance</p><h2>${number(data.points)} <span>${Number(data.points) === 1 ? 'point' : 'points'}</span></h2><p class="small">Points stay in your balance until your teacher gives you a prize.</p></div><div class="reward-next"><p><strong>${number(data.nextPoint?.remaining)}</strong> more questions to your next point.</p>${nav('/s/extra', 'Choose extra practice', 'button')}</div></section>${pointsPanel(ctx,{...summary,points:data.points},{action:false})}<section class="student-section"><div class="section-heading"><div><p class="eyebrow">Spend your points</p><h2>Choose a prize</h2></div></div><div class="prize-grid">${active.map(prize => { const pending = requests.some(r => (r.prizeId || r.prize_id) === prize.id && ['requested', 'approved', 'pending'].includes(r.status)); return `<article class="card prize-card"><h3>${ctx.escape(prize.name)}</h3><p class="prize-cost">${number(prize.cost)} points</p>${prize.note ? `<p>${ctx.escape(prize.note)}</p>` : ''}<button class="button secondary" data-request="${ctx.escape(prize.id)}" ${pending || Number(data.points) < Number(prize.cost) ? 'disabled' : ''}>${pending ? 'Requested' : Number(data.points) < Number(prize.cost) ? `${number(prize.cost - data.points)} more points needed` : 'Request prize'}</button></article>`; }).join('') || '<p class="muted">Your teacher has not added prizes yet.</p>'}</div></section><div class="grid-two reward-records"><section class="card"><h2>Your requests</h2>${requests.length ? `<ul class="history-list">${requests.map(r => `<li class="history-row"><div><strong>${ctx.escape(r.name || r.prize_name)}</strong><p class="muted">${dateText(r.createdAt || r.created_at)} · ${number(r.cost)} points</p></div><span class="badge request-status ${ctx.escape(r.status)}">${ctx.escape(r.status === 'pending' ? 'requested' : r.status)}</span></li>`).join('')}</ul>` : '<p class="muted">Your prize requests will appear here.</p>'}</section><section class="card"><h2>Points history</h2>${list(data.history).length ? `<ul class="history-list">${data.history.map(row => `<li class="history-row"><div><strong>${ctx.escape(row.note || row.kind)}</strong><p class="muted">${dateText(row.createdAt || row.created_at)}</p></div><strong>${Number(row.amount) > 0 ? '+' : ''}${number(row.amount)}</strong></li>`).join('')}</ul>` : '<p class="muted">Your first point is earned after your daily practice and the first bonus set.</p>'}</section></div>`, { title: 'Rewards' });
  document.querySelectorAll('[data-request]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try { await ctx.api(`/v2/student/rewards/${eId(button.dataset.request)}/request`, {}); ctx.tell('Your teacher has your request.'); await rewards(ctx, token); }
    catch (error) { ctx.tell(error.message, true); button.disabled = false; }
  }));
}
function exampleHTML(ctx, example) {
  return `<div class="example-prompt">${ctx.mathMarkup(example.prompt || example.plainPrompt || '', true)}</div>${example.svg ? `<div class="lesson-model">${example.svg}</div>` : ''}`;
}
async function library(ctx, token) {
  const data = await ctx.api('/v2/student/library');
  if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
  const skills = list(data.skills), weeks = [...new Set(skills.map(s => s.week))].sort((a, b) => a - b);
  ctx.shell(`${heading(ctx, 'Math toolbox', 'Find a rule, diagram or worked example for any skill.', 'Lessons and tools', 'formula')}<div class="card library-search"><label class="field" for="skill-search">Search skills and rules<input type="search" id="skill-search" autocomplete="off" placeholder="Try fractions, area, or mean"></label><p id="search-count" class="muted" aria-live="polite">${skills.length} skills</p></div><div id="library-skills" class="edu-library-shelf">${weeks.map(week => `<section class="library-week"><header class="edu-shelf-label"><p class="eyebrow">Chapter ${String(week).padStart(2, '0')}</p><h2>Week ${number(week)} · Lesson notes</h2></header><div class="grid-two">${skills.filter(s => s.week === week).map(skill => `<article class="card library-skill edu-reference-page" data-search="${ctx.escape(`${skill.name} ${skill.rule} ${skill.idea}`.toLowerCase())}"><h3>${ctx.escape(skill.name)}</h3><p class="edu-reference-label">The rule</p><p class="library-rule">${ctx.mathMarkup(skill.rule)}</p><details data-reference="${ctx.escape(skill.id)}"><summary>Picture, example and common mistake</summary><div class="reference-example">${skill.model ? `<div class="lesson-model">${skill.model}</div>` : ''}${skill.example ? `${exampleHTML(ctx, skill.example)}<ol class="steps">${list(skill.example.steps || skill.example.solution).map(step => `<li>${stepMarkup(ctx, step)}</li>`).join('')}</ol>` : ''}${skill.trap ? `<p><strong>Common mistake:</strong> ${ctx.mathMarkup(skill.trap.text || skill.trap)}</p>` : ''}</div></details><div class="form-actions">${nav(`/s/learn/${eId(skill.id)}`, 'Learn')}${nav(`/s/practice?source=library&skill=${eId(skill.id)}&count=5`, 'Practice this skill')}</div></article>`).join('')}</div></section>`).join('')}</div><div class="grid-two reference-grid"><section class="card"><p class="eyebrow">Maths words</p><h2>Vocabulary</h2><dl class="reference-list">${list(data.vocabulary).map(item => `<dt>${ctx.escape(item.term)}</dt><dd>${ctx.escape(item.definition)}<p class="muted">${ctx.mathMarkup(item.example)}</p></dd>`).join('')}</dl></section><section class="card"><p class="eyebrow">Quick reference</p><h2>Formula sheet</h2><dl class="reference-list">${list(data.formulas).map(item => `<dt>${ctx.escape(item.name)}</dt><dd>${ctx.mathMarkup(item.formula)}${item.note ? `<p class="muted">${ctx.escape(item.note)}</p>` : ''}</dd>`).join('')}</dl></section></div>`, { title: 'Library' });
  document.querySelectorAll('[data-reference]').forEach(details => {
    let loaded = false, pending = false;
    details.addEventListener('toggle', async () => {
      if (!details.open || loaded || pending) return;
      pending = true; const content = details.querySelector('.reference-example');
      content.innerHTML = '<p class="muted" role="status">Opening the example…</p>';
      try {
        const lesson = await ctx.api(`/v2/student/lesson?skill=${eId(details.dataset.reference)}`);
        if (!details.isConnected || token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
        const example = lesson.examples?.[0];
        content.innerHTML = `${lesson.model ? `<div class="lesson-model">${lesson.model}</div>` : ''}${example ? `${exampleHTML(ctx, example)}<ol class="steps">${list(example.steps || example.solution).map(step => `<li>${stepMarkup(ctx, step)}</li>`).join('')}</ol>` : ''}<p><strong>Common mistake:</strong> ${ctx.mathMarkup(lesson.trap?.text || '')}</p>`;
        loaded = true;
      } catch (error) { if (details.isConnected) content.innerHTML = `<p role="alert">${ctx.escape(error.message)} Close and reopen to try again.</p>`; }
      finally { pending = false; }
    });
  });
  document.querySelector('#skill-search').addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase(); let count = 0;
    document.querySelectorAll('.library-skill').forEach(card => { card.hidden = !card.dataset.search.includes(query); if (!card.hidden) count++; });
    document.querySelectorAll('.library-week').forEach(week => { week.hidden = ![...week.querySelectorAll('.library-skill')].some(card => !card.hidden); });
    document.querySelector('#search-count').textContent = `${count} ${count === 1 ? 'skill' : 'skills'}${count ? '' : '. Try another word.'}`;
  });
}
async function lesson(ctx, token, skill) {
  if (!skill) return library(ctx, token);
  const data = await ctx.api(`/v2/student/lesson?skill=${eId(skill)}`);
  if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
  const examples = list(data.examples);
  ctx.shell(`${heading(ctx, data.name, data.rule, data.curriculum?.stage==='grade5'?'Grade 5 review':data.curriculum?.stage==='bridge'?'Next-course topic':`Week ${data.week} · Learn`)}<div class="lesson-sequence edu-workbook"><section class="card lesson-section"><div class="lesson-heading"><span class="lesson-number" aria-hidden="true">01</span><div><p class="eyebrow">Start here</p><h2>The idea</h2></div></div><p class="lesson-idea">${ctx.mathMarkup(data.idea)}</p>${data.model ? `<div class="lesson-model">${data.model}</div>` : ''}</section>${examples.map((example, index) => `<section class="card lesson-section" data-example="${index}"><div class="lesson-heading"><span class="lesson-number" aria-hidden="true">0${index + 2}</span><div><p class="eyebrow">Step by step</p><h2>${index ? 'Another worked example' : 'Worked example'}</h2></div></div>${exampleHTML(ctx, example)}<p class="muted">Think about the next step before revealing it.</p><ol class="steps" id="example-steps-${index}" aria-live="polite"></ol><button class="button secondary" data-next-step="${index}">Next step</button></section>`).join('')}<section class="card lesson-section lesson-trap"><div class="lesson-heading"><span class="lesson-number" aria-hidden="true">04</span><div><p class="eyebrow">Check your work</p><h2>A common mistake</h2></div></div>${data.trap?.answer ? `<p>Someone might write ${ctx.mathMarkup(data.trap.answer)}.</p>` : ''}<p>${ctx.mathMarkup(data.trap?.text || '')}</p></section><section class="card lesson-section lesson-turn">${learningCharacter({variant:'circle'})}<div><p class="eyebrow">Your turn</p><h2>Try three questions</h2><p>Each answer counts toward today’s practice.</p></div><button id="lesson-start" class="button">${data.completed ? 'Try three more' : 'Start 3 questions'}</button></section></div>`, { title: data.name });
  document.querySelectorAll('[data-next-step]').forEach(button => {
    const index = Number(button.dataset.nextStep), steps = list(examples[index].steps || examples[index].solution); let visible = 0;
    button.addEventListener('click', () => {
      if (visible < steps.length) { const li = document.createElement('li'); li.innerHTML = stepMarkup(ctx, steps[visible++]); document.querySelector(`#example-steps-${index}`).append(li); }
      if (visible >= steps.length) { button.disabled = true; button.textContent = 'Example complete'; }
    });
  });
  document.querySelector('#lesson-start').addEventListener('click', () => runPractice(ctx, token, { source: 'learn', skill, count: 3, back: `/s/learn/${eId(skill)}` }));
}
async function review(ctx, token) {
  const [data,summary]=await Promise.all([ctx.api('/v2/student/review'),ctx.initialSummary || ctx.api('/v2/student/summary')]);
  if(token!==revision || ctx.state.user?.role!=='student' || !ctx.isCurrent())return;
  cacheSummary(ctx,summary);
  ctx.shell(`<div class="review-simple">${heading(ctx,'Review','Practice earlier skills again. Your daily questions already include reviews that are due.','Remember what you learned','path')}${backlogPanel(ctx,summary,{compact:true})}${Number(data.count)?`<section class="review-main-card"><div><p class="eyebrow">Scheduled review</p><h2>${number(data.count)} ${Number(data.count)===1?'review':'reviews'} due</h2><p>These questions count toward today’s ${number(summary.dailyTarget || 20)}. Your daily set also includes due reviews. After today’s goal, saved answers reduce earlier work.</p></div><button id="review-start" class="button">Start my review</button></section><details class="review-contents"><summary>See the skills in this review</summary><ul class="skill-list review-list">${list(data.due).map(item=>`<li><div><strong>${ctx.escape(item.name || item.skill)}</strong><p class="muted">Ready for another try</p></div>${nav(`/s/learn/${eId(item.skill)}`,'Read the lesson','text-link')}</li>`).join('')}</ul></details>`:empty(ctx,'Your reviews are up to date','No skill reviews are due. Your daily and catch-up questions are tracked separately above.',nav('/s/today','Back to today','button'))}</div>`,{title:'Review'});
  document.querySelector('#review-start')?.addEventListener('click',()=>runPractice(ctx,token,{source:'review',count:Number(data.count),back:'/s/review'}));
}
function focusProgress(ctx, summary, local) {
  const target=Number(summary.dailyTarget || 20),answered=Number(summary.answered || 0);
  const setLabel=local.source==='learn'?'Lesson practice':local.source==='review'?'Review':local.catchup?'Catch-up practice':local.daily?'Daily questions':'Extra practice';
  return `<div class="focus-progress">${backlogLive(ctx,summary,local)}<div class="section-heading"><span><strong>${number(Math.min(answered,target))} / ${number(target)}</strong> questions answered today${answered>target?` · ${number(answered-target)} extra`:''}</span>${nav(local.back || '/s/today','Save & leave','text-link')}</div><div class="progress-track" role="progressbar" aria-label="Today’s answered questions" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${Math.min(answered,target)}"><div class="progress-fill" style="width:${Math.min(100,answered/target*100)}%"></div></div><p class="small">${setLabel}${!local.daily&&local.count?` · ${number(local.finished)} of ${number(local.count)} in this set`:answered<target?` · ${number(target-answered)} left today`:' · Daily goal complete'}</p><div class="focus-next-point"><span aria-hidden="true">★</span> ${number(pointProgress(summary).remaining)} more answers for your next point${local.catchup?' · Catch-up answers count toward points too.':''}</div></div>`;
}
async function runPractice(ctx, token, options = {}) {
  const local = { source: 'practice', finished: 0, count: 0, back: '/s/today', ...options };
  local.catchup=local.intent==='catchup';
  local.daily=local.source==='practice'&&!local.count&&!local.skill&&!local.catchup;
  let summary = local.reuseInitialSummary && ctx.initialSummary ? ctx.initialSummary : await ctx.api('/v2/student/summary');
  if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
  cacheSummary(ctx, summary);
  local.startBehind=backlogOf(summary)?.behind;
  const goal=local.catchup?(local.count || 5):local.daily?(summary.schedule&&!summary.schedule.today?0:Math.max(0,Number(summary.dailyTarget || 20)-Number(summary.answered || 0))):(local.count || 5);
  local.count = goal;
  const results = [];
  let busy = false, question, started, requestId, lastFeedback, completed = false;
  async function finish() {
    completed = true; clearTimeout(advanceTimer);
    if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
    if (local.source === 'learn') {
      try { await ctx.api('/v2/student/lesson-complete', { skill: local.skill }); }
      catch (error) { completed = false; ctx.tell(error.message, true); return; }
    }
    if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
    cacheSummary(ctx, summary);
    const bySkill = new Map(); for (const row of results) { const entry = bySkill.get(row.skill) || { right: 0, total: 0 }; entry.name = row.name; entry.total++; entry.right += Number(row.correct); bySkill.set(row.skill, entry); }
    const strong = [...bySkill].filter(([, row]) => row.right === row.total).map(([skill]) => skill);
    const next = [...bySkill].find(([, row]) => row.right < row.total)?.[0];
    const title = local.catchup ? Number(backlogOf(summary)?.overdue)?'Catch-up set complete':'Your earlier work is caught up' : local.source === 'learn' ? 'Lesson practiced' : local.source === 'review' ? 'Review complete' : local.daily && Number(summary.answered)>=Number(summary.dailyTarget) ? 'Your daily practice is done' : local.daily && !goal ? 'No daily set is due' : 'Practice complete';
    ctx.shell(`${heading(ctx, title, results.length?`${results.filter(row => row.correct).length} of ${results.length} right in this set.`:backlogOf(summary)?.behind?'Your answers are saved. Continue with the next set when you are ready.':'Your saved work is up to date. Choose extra practice whenever you like.')}${backlogPanel(ctx,summary,{compact:true})}<section class="card completion-card">${results.length?learningCharacter({celebrate:true}):''}<p class="eyebrow">Your progress is saved</p><h2>${number(summary.answered)} answered today</h2>${results.length&&backlogOf(summary)&&local.startBehind>backlogOf(summary).behind?`<p class="completion-catchup"><strong>${number(Math.max(0,local.startBehind-backlogOf(summary).behind))} fewer questions behind</strong><span>${number(local.startBehind)} → ${number(backlogOf(summary).behind)} remaining.</span></p>`:""}${pointsPanel(ctx,summary,{compact:true,action:false})}${strong.length ? `<details class="completion-skills"><summary>Ideas you used well (${number(strong.length)})</summary><ul>${strong.map(skill => `<li>${ctx.escape(bySkill.get(skill).name)}</li>`).join('')}</ul></details>` : ''}${next ? `<p>One to work on: ${ctx.escape(bySkill.get(next).name)}.</p>${nav(`/s/learn/${eId(next)}`, 'Review the lesson')}` : '<p>Your next set will use new questions on these skills.</p>'}<div class="form-actions">${nav('/s/today','Back to today','button')}${Number(summary.answered)<Number(summary.dailyTarget)&&(!summary.schedule||summary.schedule.today)?nav('/s/practice','Continue daily questions'):nav('/s/extra','Choose extra practice')}${local.source === 'learn' ? nav(local.back, 'Back to lesson') : ''}</div></section>`, { title: 'Practice complete' });
  }
  async function next() {
    if (busy || completed || token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
    clearTimeout(advanceTimer);
    if (local.finished >= goal || (local.catchup&&local.finished>0&&!Number(backlogOf(summary)?.overdue)) || (local.daily&&Number(summary.answered)>=Number(summary.dailyTarget))) return finish();
    busy = true;
    try {
      const response = await ctx.api('/v2/student/question', { source: local.source, ...(local.skill ? { skill: local.skill } : {}), ...(local.catchup?{intent:'catchup'}:local.daily?{intent:'daily'}:{}) });
      if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
      summary = response.summary || summary; cacheSummary(ctx, summary);
      if (!response.question || (local.daily&&Number(summary.answered)>=Number(summary.dailyTarget))) return finish();
      question = response.question;
      if (response.resumedPending && (question.source !== local.source || (local.skill && question.skill !== local.skill))) {
        local.source = 'practice'; local.skill = undefined; local.back = '/s/today';
        ctx.tell('Let’s finish this saved question before opening another.');
      }
      requestId = crypto.randomUUID(); started = Date.now(); lastFeedback = null;
      draw();
    } catch (error) {
      if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
      ctx.shell(`${heading(ctx, 'Practice is waiting')}${empty(ctx, 'That question did not load', error.message, '<button class="button" id="retry-question">Try again</button>')}${nav(local.back, 'Back')}`, { title: 'Practice' });
      document.querySelector('#retry-question')?.addEventListener('click', next);
    } finally { busy = false; }
  }
  function draw() {
    const answerChoices = question.answerChoices || question.choiceLabels || null;
    const optionEntries = answerChoices && !Array.isArray(answerChoices) ? Object.entries(answerChoices) : list(answerChoices).map(x => [x.value, x.label]);
    const shapeNames = {missing:'Find the missing amount',compare:'Compare two options',backward:'Work backwards',mistake:'Find and fix the mistake','what-if':'Explore a what if'};
    const answerField = list(question.choices).length ? `<fieldset class="question-choices"><legend>Choose your answer</legend>${question.choices.map((choice,index)=>`<label class="choice"><input type="radio" name="answer" value="${ctx.escape(choice.value ?? `option-${index}`)}" required><span>${ctx.mathMarkup(choice.label,true)}</span></label>`).join('')}</fieldset>` : `${optionEntries.length ? `<fieldset class="question-choices story-options"><legend>Which option?</legend>${optionEntries.map(([value,label])=>`<label class="choice"><input type="radio" name="answerChoice" value="${ctx.escape(value)}" required><span><strong>${ctx.escape(value)}</strong> · ${ctx.escape(label)}</span></label>`).join('')}</fieldset>` : ''}<label class="field answer-field" for="practice-answer">${optionEntries.length?'The difference, with units':question.answerUnit?'Your answer, with units':'Your answer'}<input id="practice-answer" name="answer" type="text" inputmode="text" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="100" required aria-describedby="answer-help" ${question.answerUnit?`placeholder="For example: 12 ${ctx.escape(question.answerUnit)}"`:''}></label><p id="answer-help" class="small question-unit">${question.answerUnit?`Include <strong>${ctx.escape(question.answerUnit)}</strong> with your number. You can use a decimal or a fraction.`:'You can use decimals, fractions such as 3/4, mixed numbers or coordinate pairs. This question does not need a measurement unit.'}</p>`;
    ctx.shell(`<div class="question-stage">${focusProgress(ctx,summary,local)}<article class="question-surface card ${question.story?'story-question':''}">${question.offerExample?`<aside class="example-offer"><p>A worked example can help you find your first step.</p>${nav(`/s/learn/${eId(question.skill)}`,'Review the example')}</aside>`:''}<div class="question-meta"><p class="eyebrow">${ctx.escape(question.name||question.skill)}</p><span class="badge">Level ${number(question.level||1)}</span></div><div class="practice-stage ${question.story?'is-story':'is-warmup'}"><span>${question.story?'Maths in the real world':'Quick warm-up'}</span><span>${question.story?`${number(question.stepCount)} connected steps`:'Number skills'}</span></div>${question.story?`<p class="story-context">${ctx.escape(shapeNames[question.storyShape]||'Think it through')}</p>`:''}<div class="question-prompt">${ctx.mathMarkup(question.prompt||question.plainPrompt,true)}</div>${question.svg?`<div class="question-diagram">${question.svg}</div>`:''}<form id="practice-answer-form">${answerField}${errorHTML}<button class="button" type="submit">Check my answer</button></form><div id="practice-feedback" aria-live="polite"></div><div class="question-help-shortcuts" aria-label="Help with this question"><span>Need help?</span><button type="button" data-help-action="hint">Give me a hint</button><button type="button" data-help-action="explain">Explain a step</button><button type="button" data-help-action="check-reasoning">Check my thinking</button></div><details class="question-help" id="question-help"><summary><span>Help for this question</span><small>Use a hint, reveal one step, or ask the tutor.</small></summary><div class="help-content" id="help-content"><p role="status">Opening your help…</p></div></details></article></div>`,{title:local.source==='review'?'Review':'Practice',focus:true});
    const form = document.querySelector('#practice-answer-form');
    const input = form.querySelector('[name=answer]'); input?.focus({preventScroll:true});
    const helpDetails=document.querySelector('#question-help'),helpContent=document.querySelector('#help-content');
    const questionId=question.id;let helpLoaded=false,helpLoading=false,shownSteps=0;
    const helpEvents=new Map();let tutor=null,requestedTutorFocus=null;
    const stillHere=()=>questionId===question?.id&&token===revision&&ctx.state.user?.role==='student'&&ctx.isCurrent()&&helpContent.isConnected;
    function recordHelp(kind,part=0){
      if(!stillHere())return;
      const key=`${kind}:${part}`;if(helpEvents.has(key))return;
      const eventId=crypto.randomUUID();helpEvents.set(key,eventId);
      // A logging outage must never hide help, consume an answer, or delay a save.
      void Promise.resolve().then(()=>ctx.api('/v2/student/help-event',{questionId,kind,part,requestId:eventId})).catch(()=>{});
    }
    async function loadHelp(){
      if(helpLoaded){if(helpDetails.open){recordHelp('hint');if(helpContent.querySelector('.help-answer')?.open)recordHelp('answer');}return;}
      if(helpLoading||!helpDetails.open)return;
      helpLoading=true;
      try{
        const [help,status]=await Promise.all([ctx.api('/v2/student/help',{questionId}),ctx.api('/v2/student/tutor-status').catch(()=>({available:false}))]);
        if(!stillHere())return;
        helpLoaded=true;
        helpContent.innerHTML=`<section class="help-hint"><p class="eyebrow">Try this first</p><p>${ctx.mathMarkup(help.hint||'Write down what you know and what you need to find.',true)}</p></section><ol class="steps help-steps" id="help-steps" aria-live="polite"></ol><div class="help-actions"><button class="button secondary" type="button" id="reveal-help-step">Show the first step</button><details class="help-answer"><summary>Show the worked answer</summary><p>${ctx.mathMarkup(help.answer||'',true)}</p><ol class="steps">${list(help.steps).map(step=>`<li>${stepMarkup(ctx, step)}</li>`).join('')}</ol></details></div>${tutorPanelMarkup({available:status.available,remaining:status.remaining,steps:help.steps,escape:ctx.escape})}`;
        if(helpDetails.open)recordHelp('hint');
        tutor=mountTutorPanel(helpContent.querySelector('.tutor-panel'),{api:ctx.api,questionId,stepCount:list(help.steps).length,escape:ctx.escape,isCurrent:stillHere});
        if(requestedTutorFocus)tutor.focus(requestedTutorFocus);
        const workedAnswer=helpContent.querySelector('.help-answer');
        workedAnswer.addEventListener('toggle',()=>{if(workedAnswer.open&&helpDetails.open)recordHelp('answer');});
        const reveal=helpContent.querySelector('#reveal-help-step');
        if(!list(help.steps).length)reveal.hidden=true;
        reveal.addEventListener('click',()=>{
          if(!stillHere()||!helpDetails.open||shownSteps>=list(help.steps).length)return;
          const li=document.createElement('li');li.innerHTML=`${stepMarkup(ctx, help.steps[shownSteps])}${status.available?` <button class="text-link ask-step" type="button" data-step="${shownSteps+1}">Ask about this step</button>`:''}`;
          li.querySelector('[data-step]')?.addEventListener('click',event=>tutor.focus({mode:'explain',part:Number(event.currentTarget.dataset.step),prompt:true}));
          helpContent.querySelector('#help-steps').append(li);shownSteps++;recordHelp('step',shownSteps);
          reveal.textContent=shownSteps>=help.steps.length?'All steps shown':'Show the next step';reveal.disabled=shownSteps>=help.steps.length;
        });
      }catch(error){if(stillHere()){helpContent.innerHTML=`<p role="alert">${ctx.escape(error.message)}</p><button class="button secondary" type="button" id="retry-help">Try help again</button>`;helpContent.querySelector('#retry-help').onclick=loadHelp;}}
      finally{helpLoading=false;}
    }
    document.querySelectorAll('[data-help-action]').forEach(button=>button.addEventListener('click',()=>{
      const mode=button.dataset.helpAction;
      requestedTutorFocus=mode==='hint'?null:{mode,part:mode==='explain'?Math.max(1,shownSteps):0,prompt:mode==='explain'};
      helpDetails.open=true;
      if(helpLoaded&&requestedTutorFocus)tutor?.focus(requestedTutorFocus);
      void loadHelp();
    }));
    helpDetails.addEventListener('toggle',loadHelp);
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy||lastFeedback||token!==revision||ctx.state.user?.role!=='student'||!ctx.isCurrent())return;
      const values=new FormData(form);let answer=String(values.get('answer')||'').trim();if(!answer)return;
      if(optionEntries.length){const choice=String(values.get('answerChoice')||'');if(!choice)return;answer=`${choice}, ${answer}`;}
      busy=true;const button=form.querySelector('[type=submit]');button.disabled=true;const errorElement=form.querySelector('.form-error');errorElement.hidden=true;
      try{
        const result=await ctx.api('/v2/student/answer',{questionId:question.id,answer,elapsedMs:Math.max(0,Date.now()-started),requestId});
        if(token!==revision||ctx.state.user?.role!=='student'||!ctx.isCurrent())return;
        if(result.formOnly){errorElement.textContent=result.hint||'Check the way your answer is written, including the units.';errorElement.hidden=false;requestId=crypto.randomUUID();input?.focus();return;}
        lastFeedback=result;summary=result.summary||summary;cacheSummary(ctx,summary);local.finished++;
        const progressElement=document.querySelector('.focus-progress');if(progressElement)progressElement.outerHTML=focusProgress(ctx,summary,local);
        results.push({skill:question.skill,name:question.name||question.skill,correct:result.correct});
        form.querySelectorAll('input,button,select').forEach(element=>{element.disabled=true;});
        const feedback=document.querySelector('#practice-feedback');
        feedback.innerHTML=`<section class="feedback ${result.correct?'correct':'miss'}"><div class="feedback-title">${result.correct?learningCharacter({celebrate:true,small:true}):''}<h2>${result.correct?`${iconCheck} Correct!`:'Not quite — let’s work it out'}</h2></div>${result.correct?`<p>${ctx.mathMarkup(result.reason||result.solution?.at(-1)||'Your answer fits the question.',true)}</p>`:`<div class="answer-comparison"><p>You wrote <strong>${ctx.mathMarkup(result.submittedAnswer??answer)}</strong></p><p>The answer is <strong>${ctx.mathMarkup(result.rightAnswer??result.answer)}</strong></p></div><p>${ctx.mathMarkup(result.hint||result.reason||'Compare your first step with the worked answer.',true)}</p>`}<details class="feedback-worked"><summary>See how</summary><ol class="steps">${list(result.solution).map(step=>`<li>${stepMarkup(ctx, step)}</li>`).join('')}</ol></details>${result.pointsAwarded?`<div class="point-earned point-celebration">${learningCharacter({celebrate:true,small:true,variant:'circle'})}<p><strong>${number(result.pointsAwarded)} ${result.pointsAwarded===1?'point':'points'} earned!</strong> Your balance is ${number(summary.points)}.</p></div>`:''}<button class="button" id="next-question">${local.finished>=goal||(local.catchup&&!Number(backlogOf(summary)?.overdue))||(local.daily&&Number(summary.answered)>=Number(summary.dailyTarget))?'Finish set':'Next question'}</button></section>`;
        const workedFeedback=feedback.querySelector('.feedback-worked');workedFeedback.addEventListener('toggle',()=>{if(workedFeedback.open)recordHelp('answer');});
        const nextButton=document.querySelector('#next-question');nextButton.addEventListener('click',next);nextButton.focus({preventScroll:true});
      }catch(error){if(token===revision&&errorElement.isConnected){errorElement.textContent=error.message;errorElement.hidden=false;}}
      finally{busy=false;if(!lastFeedback&&button.isConnected)button.disabled=false;}
    });
  }
  await next();
}
export async function renderStudent(path, ctx) {
  const token = ++revision; clearTimeout(advanceTimer); clearInterval(deadlineTimer);
  const routeVersion = ctx.state.routeVersion, sharedState = ctx.state;
  ctx = { ...ctx, isCurrent: () => routeVersion === sharedState.routeVersion };
  const url = new URL(path, 'https://practice.invalid');
  if (url.pathname === '/s/today') return today(ctx, token);
  if (url.pathname === '/s/extra') return extraPractice(ctx, token);
  if (url.pathname === '/s/map') return courseMap(ctx, token);
  if (url.pathname === '/s/progress') return progressPage(ctx, token);
  if (url.pathname === '/s/rewards') return rewards(ctx, token);
  if (url.pathname === '/s/library' || url.pathname === '/s/learn') return library(ctx, token);
  if (url.pathname.startsWith('/s/learn/')) return lesson(ctx, token, decodeURIComponent(url.pathname.slice('/s/learn/'.length)));
  if (url.pathname === '/s/review') return review(ctx, token);
  if (url.pathname === '/s/practice') {
    const source = ['practice', 'review', 'library', 'learn'].includes(url.searchParams.get('source')) ? url.searchParams.get('source') : 'practice';
    return runPractice(ctx, token, { source, reuseInitialSummary:true, intent: url.searchParams.get('intent')==='catchup'?'catchup':undefined, skill: url.searchParams.get('skill') || undefined, count: Math.max(0, Math.min(20, Number(url.searchParams.get('count')) || 0)) });
  }
  if (url.pathname === '/s/settings') { ctx.shell(`${heading(ctx, 'Your account')}<section class="card"><h2>${ctx.escape(ctx.state.user?.name)}</h2><p>Username: ${ctx.escape(ctx.state.user?.username)}</p><p>Your teacher can reset your password. Your answers and points are saved with your account.</p>${nav('/s/today', 'Back to Today')}</section>`, { title: 'Settings' }); return; }
  ctx.navigate('/s/today');
}
