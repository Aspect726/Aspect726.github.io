// Full student pages. Accounts, questions, attempts and points stay on the server.
let revision = 0;
let advanceTimer;
const number = value => Number(value || 0).toLocaleString('en-US');
const dateText = (value, options = {}) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC', ...options }).format(new Date(`${String(value).slice(0, 10)}T12:00:00Z`)) : '';
const percent = value => value == null ? '—' : `${Math.round(Number(value))}%`;
const labelLevel = value => ({ 'not-started': 'Not started', 'not_started': 'Not started', learning: 'Learning', practicing: 'Practicing', mastered: 'Mastered' }[value] || value || 'Not started');
const levelClass = value => String(value || 'not-started').toLowerCase().replace(/[_ ]/g, '-');
const addDays = (date, count) => new Date(Date.parse(`${date}T12:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
const list = value => Array.isArray(value) ? value : [];
const eId = value => encodeURIComponent(value);
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
async function today(ctx, token) {
  const data = await ctx.api('/v2/student/summary');
  if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
  cacheSummary(ctx, data);
  const week = data.week || {}, day = data.day || {}, target = data.dailyTarget || 20;
  const skill = qSkill(day.focus?.[0] || week.skills?.[0]);
  const completed = Number(data.answered) >= target;
  const remaining = Math.max(0, target - Number(data.answered || 0));
  const button = completed ? 'Continue for bonus points' : data.answered ? 'Keep practicing' : 'Start practice';
  const chapterSkills = list(week.skills);
  ctx.shell(`<div class="edu-today"><header class="edu-dateline"><p class="eyebrow">Your mathematics lesson</p><p>${day.week || week.week ? `Week ${number(day.week || week.week)} · ` : ''}${ctx.escape(dateText(data.today || data.date, { weekday: 'long' }))}</p></header>
    <section class="practice-hero edu-lesson-hero"><div class="edu-lesson-copy"><p class="edu-chapter-kicker">${ctx.escape(week.title || 'Double Advanced mathematics')}</p><h1>${ctx.escape(day.title || week.title || 'A new idea to explore')}</h1><p class="edu-lesson-intro">Start with the idea. Follow a worked example, then put your thinking on the page.</p><div class="edu-lesson-actions">${nav(skill ? `/s/learn/${eId(skill)}` : '/s/library', 'Open lesson', 'button')}${nav('/s/practice', button, 'text-link')}</div><p class="edu-lesson-footnote">A picture, two worked examples, and three questions to try.</p></div><figure class="edu-hero-illustration"><img src="/assets/math-playground.svg" alt="" width="420" height="320" decoding="async"><figcaption>Patterns worth exploring</figcaption></figure></section>
    <div class="edu-practice-note"><div><strong>${completed ? `${number(data.answered)} answered today` : `${number(remaining)} left to reach ${number(target)}`}</strong><span>${completed ? `${number(data.untilNextPoint)} more questions to your next point.` : `${number(data.answered)} of ${number(target)} answered. Your place is saved.`}</span></div><p>${number(data.points)} ${Number(data.points) === 1 ? 'point' : 'points'} saved · ${number(data.streak)} day streak</p>${nav('/s/progress', 'Learning journal', 'text-link')}</div>
    ${data.teacherNote ? `<aside class="teacher-note edu-teacher-annotation"><p class="eyebrow">In the margin · your teacher</p><p>${ctx.escape(typeof data.teacherNote === 'string' ? data.teacherNote : data.teacherNote.text)}</p></aside>` : ''}
    <section class="edu-learning-path"><div class="edu-section-title"><p class="eyebrow">How to use today’s lesson</p><h2>See it. Explain it. Try it.</h2></div><ol class="edu-method"><li><span aria-hidden="true">01</span><div><h3>Look at the model</h3><p>Notice what the picture shows before you calculate.</p></div></li><li><span aria-hidden="true">02</span><div><h3>Follow the reasoning</h3><p>Reveal one worked step at a time. Predict the next.</p></div></li><li><span aria-hidden="true">03</span><div><h3>Make it your own</h3><p>Try three questions, then continue your daily practice.</p></div></li></ol></section>
    <div class="edu-reading-columns"><section class="edu-week-lessons"><div class="edu-section-title"><p class="eyebrow">This week’s chapters</p><h2>${ctx.escape(week.title || 'Ideas for this week')}</h2></div><ol class="edu-chapter-list">${chapterSkills.slice(0, 8).map((item, index) => `<li><span class="edu-chapter-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div><a class="edu-chapter-title" data-nav href="/s/learn/${eId(qSkill(item))}">${ctx.escape(item.name || qSkill(item))}</a><p>Read the idea · Work through examples · Try it</p></div>${nav(`/s/practice?source=library&skill=${eId(qSkill(item))}&count=5`, 'Practice', 'text-link')}</li>`).join('') || `<li>${nav('/s/library', 'Explore the lesson library', 'text-link')}</li>`}</ol>${nav('/s/map', chapterSkills.length > 8 ? `See all ${chapterSkills.length} skills for this week` : 'Browse the whole course', 'text-link')}</section><aside class="edu-resource-notes"><section><p class="eyebrow">A second look</p><h3>Return to a tricky idea</h3><p>${Number(data.reviewDue) ? `${number(data.reviewDue)} ${Number(data.reviewDue) === 1 ? 'skill is' : 'skills are'} ready for review.` : 'You are up to date. Ideas that need another try will return here.'} Each review uses a fresh question.</p>${nav('/s/review', 'Open review', 'text-link')}</section><section><p class="eyebrow">Keep a reference nearby</p><h3>Your mathematics library</h3><p>Rules, pictures, examples, and the words that make them clear.</p>${nav('/s/library', 'Browse the library', 'text-link')}</section></aside></div>
    <section class="edu-week-journal"><div class="section-heading"><div><p class="eyebrow">Your week, one day at a time</p><h2>A little practice, every day</h2></div>${nav('/s/map', 'Course map', 'text-link')}</div><div class="week-strip">${list(data.weekDays).map(d => `<div class="day-dot ${ctx.escape(d.status || '')}${d.date === (data.today || data.date) ? ' current' : ''}" ${d.date === (data.today || data.date) ? 'aria-current="date"' : ''}><span>${ctx.escape((d.weekday || dateText(d.date, { weekday: 'short' })).slice(0, 3))}</span><strong>${dateText(d.date, { day: 'numeric', month: undefined })}</strong><small>${number(d.answered)} answered</small><small>${d.lessonDay ? 'Lesson day' : ctx.escape(d.status || 'Upcoming')}</small></div>`).join('')}</div></section></div>`, { title: 'Today' });
}
async function courseMap(ctx, token) {
  const data = await ctx.api('/v2/student/map');
  if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
  ctx.shell(`${heading(ctx, 'Course map', 'Ten chapters of ideas, pictures, and problems. Open any chapter to begin exploring.', 'Contents · Double Advanced', 'path')}<div class="course-path edu-course-index">${list(data.weeks).map(week => `<section class="week-node ${ctx.escape(week.status || 'upcoming')}"><span class="week-marker" aria-hidden="true">${week.status === 'done' ? '✓' : number(week.week)}</span><details class="card" ${week.status === 'current' ? 'open' : ''}><summary class="course-summary"><span class="course-summary-top"><span class="eyebrow">Chapter ${String(week.week).padStart(2, '0')} · Week ${number(week.week)}</span><span class="badge course-status ${ctx.escape(week.status || 'upcoming')}">${week.status === 'current' ? 'You are here' : week.status === 'done' ? 'Complete' : week.status === 'missed' ? 'Needs practice' : 'Upcoming'}</span></span><h2>${ctx.escape(week.title)}</h2><span class="course-meta"><span>${dateText(week.startDate)} – ${dateText(week.endDate)}</span><span>${list(week.skills).length} skills</span>${week.status === 'done' && week.accuracy != null ? `<span>${percent(week.accuracy)} accuracy</span>` : ''}</span><span class="small skill-preview">${list(week.skills).slice(0, 4).map(s => ctx.escape(s.name || qSkill(s))).join(' · ')}${list(week.skills).length > 4 ? ` · ${list(week.skills).length - 4} more inside` : ''}</span><span class="course-open-label">View skills and practice</span></summary><ul class="skill-list">${list(week.skills).map(skill => `<li class="course-skill-row"><div class="course-skill-name"><strong>${ctx.escape(skill.name || qSkill(skill))}</strong><span class="badge ${levelClass(skill.level)}">${ctx.escape(labelLevel(skill.level))}</span></div><div class="form-actions">${nav(`/s/learn/${eId(qSkill(skill))}`, 'Learn')}${nav(`/s/practice?source=library&skill=${eId(qSkill(skill))}&count=5`, 'Practice')}</div></li>`).join('')}</ul></details></section>`).join('')}<section class="week-node goal-node"><span class="week-marker" aria-hidden="true">✓</span><div class="card"><p class="eyebrow">Your goal</p><h2>Double Advanced test</h2><p>Use what you have learned to explain your thinking.</p></div></section></div>`, { title: 'Course map' });
}
async function progressPage(ctx, token) {
  const data = await ctx.api('/v2/student/progress');
  if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
  const weeks = list(data.weeks), skills = list(data.skills), recordedDays = list(data.days);
  const days = weeks.length ? weeks.flatMap(week => Array.from({ length: 7 }, (_, index) => { const date = addDays(week.startDate, index); return recordedDays.find(day => day.date === date) || { date, answered: 0, correct: 0, accuracy: null, pointsEarned: 0, target: data.program?.dailyTarget || 20 }; })) : recordedDays;
  ctx.shell(`${heading(ctx, 'Your learning journal', 'The ideas you have met, the ones you are practicing, and the work you have put in.', 'Look back · Look ahead')}<section class="student-section"><div class="section-heading"><div><p class="eyebrow">One skill at a time</p><h2>What you are learning</h2></div></div>${weeks.length ? weeks.map(week => `<section class="mastery-week"><h3>Week ${number(week.week)} · ${ctx.escape(week.title)}</h3>${masteryTiles(ctx, skills.filter(s => Number(s.week) === Number(week.week)).length ? skills.filter(s => Number(s.week) === Number(week.week)) : week.skills)}</section>`).join('') : masteryTiles(ctx, skills)}</section><section class="card student-section calendar-section"><div class="section-heading"><div><p class="eyebrow">Showing up counts</p><h2>Practice calendar</h2></div></div><ul class="calendar-legend" aria-label="Calendar key"><li><span class="legend-key complete" aria-hidden="true"></span>Daily goal complete</li><li><span class="legend-key partial" aria-hidden="true"></span>Some practice</li><li><span class="legend-key empty" aria-hidden="true"></span>Nothing yet</li><li><span aria-hidden="true">★</span>Bonus point</li></ul><div class="calendar-grid">${days.map(day => `<div class="calendar-square ${day.answered >= (day.target || 20) ? 'complete' : day.answered ? 'partial' : 'empty'}" tabindex="0" aria-label="${ctx.escape(dateText(day.date))}: ${number(day.answered)} answered${day.pointsEarned ? `, ${number(day.pointsEarned)} bonus points` : ''}"><span>${dateText(day.date, { day: 'numeric', month: undefined })}</span>${day.pointsEarned ? '<span aria-hidden="true">★</span>' : ''}<small>${number(day.answered)}</small></div>`).join('')}</div></section><div class="grid-two student-chart-grid"><section class="card"><p class="eyebrow">Getting the hang of it</p><h2>Accuracy over time</h2>${chart(ctx, days.filter(d => d.answered).map(day => ({ label: dateText(day.date), value: day.accuracy })))}</section><section class="card"><p class="eyebrow">Off the screen</p><h2>Friday paper checks</h2>${list(data.checks).length ? chart(ctx, data.checks.map(check => ({ label: `Week ${check.week}`, value: check.score })), { max: 21, label: 'Friday paper scores out of 21', format: value => `${value} / 21` }) : '<p class="muted">Your teacher will add your Friday paper scores here.</p>'}</section></div><div class="grid-three student-stat-grid edu-journal-summary"><section class="card"><p class="eyebrow">Questions answered</p><h2>${number(data.totalQuestions)}</h2></section><section class="card"><p class="eyebrow">Overall accuracy</p><h2>${data.totalQuestions ? percent(data.overallAccuracy) : 'Nothing yet'}</h2></section><section class="card"><p class="eyebrow">Daily streak</p><h2>${number(data.streak)} days</h2><p>Best: ${number(data.bestStreak)} days</p></section></div>`, { title: 'Progress' });
}
async function rewards(ctx, token) {
  const data = await ctx.api('/v2/student/rewards');
  if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
  const requests = list(data.requests), active = list(data.prizes).filter(prize => prize.active);
  ctx.shell(`${heading(ctx, 'A little something earned', 'Your practice points are yours to save. Choose a prize when you are ready.', 'Rewards')}<section class="card rewards-balance edu-reward-note"><div><p class="eyebrow">Your balance</p><h2>${number(data.points)} <span>${Number(data.points) === 1 ? 'point' : 'points'}</span></h2><p class="small">Saved for something you choose.</p></div><div class="reward-next"><p><strong>${number(data.nextPoint?.remaining)}</strong> more questions to your next point.</p>${nav('/s/practice', 'Keep practicing', 'button')}</div></section><section class="student-section"><div class="section-heading"><div><p class="eyebrow">Something to work toward</p><h2>Choose a prize</h2></div></div><div class="prize-grid">${active.map(prize => { const pending = requests.some(r => (r.prizeId || r.prize_id) === prize.id && ['requested', 'approved', 'pending'].includes(r.status)); return `<article class="card prize-card"><h3>${ctx.escape(prize.name)}</h3><p class="prize-cost">${number(prize.cost)} points</p>${prize.note ? `<p>${ctx.escape(prize.note)}</p>` : ''}<button class="button secondary" data-request="${ctx.escape(prize.id)}" ${pending || Number(data.points) < Number(prize.cost) ? 'disabled' : ''}>${pending ? 'Requested' : Number(data.points) < Number(prize.cost) ? `${number(prize.cost - data.points)} more points needed` : 'Request prize'}</button></article>`; }).join('') || '<p class="muted">Your teacher has not added prizes yet.</p>'}</div></section><div class="grid-two reward-records"><section class="card"><h2>Your requests</h2>${requests.length ? `<ul class="history-list">${requests.map(r => `<li class="history-row"><div><strong>${ctx.escape(r.name || r.prize_name)}</strong><p class="muted">${dateText(r.createdAt || r.created_at)} · ${number(r.cost)} points</p></div><span class="badge request-status ${ctx.escape(r.status)}">${ctx.escape(r.status === 'pending' ? 'requested' : r.status)}</span></li>`).join('')}</ul>` : '<p class="muted">Your prize requests will appear here.</p>'}</section><section class="card"><h2>Points history</h2>${list(data.history).length ? `<ul class="history-list">${data.history.map(row => `<li class="history-row"><div><strong>${ctx.escape(row.note || row.kind)}</strong><p class="muted">${dateText(row.createdAt || row.created_at)}</p></div><strong>${Number(row.amount) > 0 ? '+' : ''}${number(row.amount)}</strong></li>`).join('')}</ul>` : '<p class="muted">Your first point is earned after your daily practice and the first bonus set.</p>'}</section></div>`, { title: 'Rewards' });
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
  ctx.shell(`${heading(ctx, 'The mathematics library', 'A place to look closely: definitions, visual models, and worked examples for every skill.', 'Reference shelf', 'formula')}<div class="card library-search"><label class="field" for="skill-search">Search skills and rules<input type="search" id="skill-search" autocomplete="off" placeholder="Try fractions, area, or mean"></label><p id="search-count" class="muted" aria-live="polite">${skills.length} skills</p></div><div id="library-skills" class="edu-library-shelf">${weeks.map(week => `<section class="library-week"><header class="edu-shelf-label"><p class="eyebrow">Chapter ${String(week).padStart(2, '0')}</p><h2>Week ${number(week)} · Lesson notes</h2></header><div class="grid-two">${skills.filter(s => s.week === week).map(skill => `<article class="card library-skill edu-reference-page" data-search="${ctx.escape(`${skill.name} ${skill.rule} ${skill.idea}`.toLowerCase())}"><h3>${ctx.escape(skill.name)}</h3><p class="edu-reference-label">The rule</p><p class="library-rule">${ctx.mathMarkup(skill.rule)}</p><details data-reference="${ctx.escape(skill.id)}"><summary>Picture, example and common mistake</summary><div class="reference-example">${skill.model ? `<div class="lesson-model">${skill.model}</div>` : ''}${skill.example ? `${exampleHTML(ctx, skill.example)}<ol class="steps">${list(skill.example.steps || skill.example.solution).map(step => `<li>${ctx.mathMarkup(step, true)}</li>`).join('')}</ol>` : ''}${skill.trap ? `<p><strong>Common mistake:</strong> ${ctx.mathMarkup(skill.trap.text || skill.trap)}</p>` : ''}</div></details><div class="form-actions">${nav(`/s/learn/${eId(skill.id)}`, 'Learn')}${nav(`/s/practice?source=library&skill=${eId(skill.id)}&count=5`, 'Practice this skill')}</div></article>`).join('')}</div></section>`).join('')}</div><div class="grid-two reference-grid"><section class="card"><p class="eyebrow">Words worth knowing</p><h2>Vocabulary</h2><dl class="reference-list">${list(data.vocabulary).map(item => `<dt>${ctx.escape(item.term)}</dt><dd>${ctx.escape(item.definition)}<p class="muted">${ctx.mathMarkup(item.example)}</p></dd>`).join('')}</dl></section><section class="card"><p class="eyebrow">Keep these handy</p><h2>Formula sheet</h2><dl class="reference-list">${list(data.formulas).map(item => `<dt>${ctx.escape(item.name)}</dt><dd>${ctx.mathMarkup(item.formula)}${item.note ? `<p class="muted">${ctx.escape(item.note)}</p>` : ''}</dd>`).join('')}</dl></section></div>`, { title: 'Library' });
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
        content.innerHTML = `${lesson.model ? `<div class="lesson-model">${lesson.model}</div>` : ''}${example ? `${exampleHTML(ctx, example)}<ol class="steps">${list(example.steps || example.solution).map(step => `<li>${ctx.mathMarkup(step, true)}</li>`).join('')}</ol>` : ''}<p><strong>Common mistake:</strong> ${ctx.mathMarkup(lesson.trap?.text || '')}</p>`;
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
  ctx.shell(`${heading(ctx, data.name, data.rule, `Week ${data.week} · Learn`)}<div class="lesson-sequence edu-workbook"><section class="card lesson-section"><div class="lesson-heading"><span class="lesson-number" aria-hidden="true">01</span><div><p class="eyebrow">Start here</p><h2>The idea</h2></div></div><p class="lesson-idea">${ctx.mathMarkup(data.idea)}</p>${data.model ? `<div class="lesson-model">${data.model}</div>` : ''}</section>${examples.map((example, index) => `<section class="card lesson-section" data-example="${index}"><div class="lesson-heading"><span class="lesson-number" aria-hidden="true">0${index + 2}</span><div><p class="eyebrow">Step by step</p><h2>${index ? 'Watch another' : 'Watch one'}</h2></div></div>${exampleHTML(ctx, example)}<p class="muted">Think about the next step before revealing it.</p><ol class="steps" id="example-steps-${index}" aria-live="polite"></ol><button class="button secondary" data-next-step="${index}">Next step</button></section>`).join('')}<section class="card lesson-section lesson-trap"><div class="lesson-heading"><span class="lesson-number" aria-hidden="true">04</span><div><p class="eyebrow">The trap</p><h2>A common mistake</h2></div></div>${data.trap?.answer ? `<p>Someone might write ${ctx.mathMarkup(data.trap.answer)}.</p>` : ''}<p>${ctx.mathMarkup(data.trap?.text || '')}</p></section><section class="card lesson-section lesson-turn"><div><p class="eyebrow">Your turn</p><h2>Try three questions</h2><p>Each answer counts toward today’s practice.</p></div><button id="lesson-start" class="button">${data.completed ? 'Try three more' : 'Start your three'}</button></section></div>`, { title: data.name });
  document.querySelectorAll('[data-next-step]').forEach(button => {
    const index = Number(button.dataset.nextStep), steps = list(examples[index].steps || examples[index].solution); let visible = 0;
    button.addEventListener('click', () => {
      if (visible < steps.length) { const li = document.createElement('li'); li.innerHTML = ctx.mathMarkup(steps[visible++], true); document.querySelector(`#example-steps-${index}`).append(li); }
      if (visible >= steps.length) { button.disabled = true; button.textContent = 'Example complete'; }
    });
  });
  document.querySelector('#lesson-start').addEventListener('click', () => runPractice(ctx, token, { source: 'learn', skill, count: 3, back: `/s/learn/${eId(skill)}` }));
}
async function review(ctx, token) {
  const data = await ctx.api('/v2/student/review');
  if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
  ctx.shell(`${heading(ctx, 'Review', 'A fresh version of a skill helps it stick. Reviews return after 1, 3 and 7 days.')}${Number(data.count) ? `<section class="card review-card"><div class="review-ready"><div><p class="eyebrow">Ready today</p><h2>${number(data.count)} ${Number(data.count) === 1 ? 'review' : 'reviews'} due</h2><p>These answers count toward your daily total.</p></div><button id="review-start" class="button">Start review</button></div><ul class="skill-list review-list">${list(data.due).map(item => `<li><div><strong>${ctx.escape(item.name || item.skill)}</strong><p class="muted">Day ${number(item.stage)} review · due ${dateText(item.dueDate)}</p></div>${nav(`/s/learn/${eId(item.skill)}`, 'Read the lesson')}</li>`).join('')}</ul></section>` : empty(ctx, 'You are up to date', 'There are no reviews due today. If an idea needs another try, it will appear here.', nav('/s/practice', 'Open practice', 'button'))}`, { title: 'Review' });
  document.querySelector('#review-start')?.addEventListener('click', () => runPractice(ctx, token, { source: 'review', count: Number(data.count), back: '/s/review' }));
}
function focusProgress(ctx, summary, local) {
  const target = Number(summary.dailyTarget || 20), answered = Number(summary.answered || 0), max = answered < target ? target : Number(summary.nextPointAt || target + 15);
  return `<div class="focus-progress"><div class="section-heading"><span>${number(answered)} / ${number(answered < target ? target : max)} today</span>${nav(local.back || '/s/today', 'Exit', 'text-link')}</div><div class="progress-track" role="progressbar" aria-label="Today’s answers" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.min(answered, max)}"><div class="progress-fill" style="width:${Math.min(100, answered / max * 100)}%"></div></div>${answered >= target ? `<p class="small">${number(summary.untilNextPoint)} more to your next point · Next milestones: ${number(max)}, ${number(max + (summary.bonusStep || 10))}, ${number(max + 2 * (summary.bonusStep || 10))}</p>` : ''}${local.count ? `<p class="small">${local.source === 'learn' ? 'Your turn' : local.source === 'review' ? 'Review' : 'Skill practice'} · ${number(local.finished)} of ${number(local.count)} answered</p>` : ''}</div>`;
}
async function runPractice(ctx, token, options = {}) {
  const local = { source: 'practice', finished: 0, count: 0, back: '/s/today', ...options };
  let summary = ctx.state.summary || await ctx.api('/v2/student/summary');
  if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
  cacheSummary(ctx, summary);
  const goal = local.count || Math.max(1, Number(summary.answered) < Number(summary.dailyTarget) ? Number(summary.dailyTarget) - Number(summary.answered) : Number(summary.untilNextPoint));
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
    const title = local.source === 'learn' ? 'Lesson practiced' : local.source === 'review' ? 'Review complete' : summary.requiredDone && summary.answered === summary.dailyTarget ? 'Your daily practice is done' : 'Practice complete';
    ctx.shell(`${heading(ctx, title, `${results.filter(row => row.correct).length} of ${results.length} right in this set.`)}<section class="card completion-card"><p class="eyebrow">Your progress is saved</p><h2>${number(summary.answered)} answered today</h2><div class="completion-stats"><p><strong>${number(summary.points)}</strong><span>points in your balance</span></p><p><strong>${number(summary.untilNextPoint)}</strong><span>questions to your next point</span></p></div>${strong.length ? `<p>Went well: ${strong.map(skill => ctx.escape(bySkill.get(skill).name)).join(', ')}.</p>` : ''}${next ? `<p>One to work on: ${ctx.escape(bySkill.get(next).name)}.</p>${nav(`/s/learn/${eId(next)}`, 'Review the lesson')}` : '<p>Keep using these ideas in new questions.</p>'}<div class="form-actions"><button class="button" id="continue-practice">${summary.requiredDone ? 'Keep going for bonus points' : 'Continue daily practice'}</button>${nav('/s/today', 'Done for today')}${local.source === 'learn' ? nav(local.back, 'Back to lesson') : ''}</div></section>`, { title: 'Practice complete' });
    document.querySelector('#continue-practice').addEventListener('click', () => runPractice(ctx, token));
  }
  async function next() {
    if (busy || completed || token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
    clearTimeout(advanceTimer);
    if (local.finished >= goal) return finish();
    busy = true;
    try {
      const response = await ctx.api('/v2/student/question', { source: local.source, ...(local.skill ? { skill: local.skill } : {}) });
      if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
      summary = response.summary || summary; cacheSummary(ctx, summary);
      if (!response.question) return finish();
      question = response.question; requestId = crypto.randomUUID(); started = Date.now(); lastFeedback = null;
      draw();
    } catch (error) {
      if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
      ctx.shell(`${heading(ctx, 'Practice is waiting')}${empty(ctx, 'That question did not load', error.message, '<button class="button" id="retry-question">Try again</button>')}${nav(local.back, 'Back')}`, { title: 'Practice' });
      document.querySelector('#retry-question')?.addEventListener('click', next);
    } finally { busy = false; }
  }
  function draw() {
    ctx.shell(`<div class="question-stage">${focusProgress(ctx, summary, local)}<article class="question-surface card">${question.offerExample ? `<aside class="example-offer"><p>Review a worked example before trying this question.</p>${nav(`/s/learn/${eId(question.skill)}`, 'Review the example')}</aside>` : ''}<div class="question-meta"><p class="eyebrow">${ctx.escape(question.name || question.skill)}</p><span class="badge">Level ${number(question.level || 1)}</span></div><div class="question-prompt">${ctx.mathMarkup(question.prompt || question.plainPrompt, true)}</div>${question.svg ? `<div class="question-diagram">${question.svg}</div>` : ''}<form id="practice-answer-form">${list(question.choices).length ? `<fieldset class="question-choices"><legend class="sr-only">Choose your answer</legend>${question.choices.map((choice, index) => `<label class="choice"><input type="radio" name="answer" value="${ctx.escape(choice.value ?? `option-${index}`)}" required><span>${ctx.mathMarkup(choice.label, true)}</span></label>`).join('')}</fieldset>` : '<label class="field answer-field" for="practice-answer">Your answer<input id="practice-answer" name="answer" type="text" inputmode="text" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="100" required aria-describedby="answer-help"></label><p id="answer-help" class="small muted">You can use decimals, fractions such as 3/4, mixed numbers such as 2 1/3, or coordinate pairs.</p>'}${question.hint && ['learn', 'library'].includes(local.source) ? `<details class="question-hint"><summary>One hint</summary><p>${ctx.mathMarkup(question.hint)}</p></details>` : ''}${errorHTML}<button class="button" type="submit">Enter answer</button></form><div id="practice-feedback" aria-live="polite"></div></article></div>`, { title: local.source === 'review' ? 'Review' : 'Practice', focus: true });
    const form = document.querySelector('#practice-answer-form');
    const input = form.querySelector('[name=answer]'); input?.focus({ preventScroll: true });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (busy || lastFeedback || token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
      const answer = new FormData(form).get('answer'); if (!String(answer || '').trim()) return;
      busy = true; const button = form.querySelector('[type=submit]'); button.disabled = true;
      const errorElement = form.querySelector('.form-error'); errorElement.hidden = true;
      try {
        const result = await ctx.api('/v2/student/answer', { questionId: question.id, answer, elapsedMs: Math.max(0, Date.now() - started), requestId });
        if (token !== revision || ctx.state.user?.role !== 'student' || !ctx.isCurrent()) return;
        if (result.formOnly) { errorElement.textContent = result.hint || 'That is the right value. Write it in simplest form.'; errorElement.hidden = false; requestId = crypto.randomUUID(); input?.focus(); return; }
        lastFeedback = result; summary = result.summary || summary; cacheSummary(ctx, summary); local.finished++;
        const progressElement = document.querySelector('.focus-progress'); if (progressElement) progressElement.outerHTML = focusProgress(ctx, summary, local);
        results.push({ skill: question.skill, name: question.name || question.skill, correct: result.correct });
        form.querySelectorAll('input,button').forEach(element => { element.disabled = true; });
        const feedback = document.querySelector('#practice-feedback');
        feedback.innerHTML = `<section class="feedback ${result.correct ? 'correct' : 'miss'}"><h2>${result.correct ? `${iconCheck} Correct` : 'Not quite'}</h2>${result.correct ? `<p>${ctx.mathMarkup(result.reason || result.solution?.[0] || 'Your answer fits the question.', true)}</p>` : `<div class="answer-comparison"><p>You wrote <strong>${ctx.mathMarkup(result.submittedAnswer ?? answer)}</strong></p><p>The answer is <strong>${ctx.mathMarkup(result.rightAnswer ?? result.answer)}</strong></p></div><p>${ctx.mathMarkup(result.hint || result.reason || result.solution?.[0] || 'Compare your first step with the worked example.', true)}</p><details><summary>See how</summary><ol class="steps">${list(result.solution).map(step => `<li>${ctx.mathMarkup(step, true)}</li>`).join('')}</ol></details>`}${result.pointsAwarded ? `<p class="point-earned">${number(result.pointsAwarded)} ${result.pointsAwarded === 1 ? 'point' : 'points'} earned. Your balance is ${number(summary.points)}.</p>` : ''}<button class="button" id="next-question">${local.finished >= goal ? 'Finish set' : 'Next question'}</button></section>`;
        const nextButton = document.querySelector('#next-question'); nextButton.addEventListener('click', next); nextButton.focus({ preventScroll: true });
        if (result.correct) advanceTimer = setTimeout(() => { if (nextButton.isConnected && token === revision) next(); }, 1500);
      } catch (error) { if (token === revision && errorElement.isConnected) { errorElement.textContent = error.message; errorElement.hidden = false; } }
      finally { busy = false; if (!lastFeedback && button.isConnected) button.disabled = false; }
    });
  }
  await next();
}
export async function renderStudent(path, ctx) {
  const token = ++revision; clearTimeout(advanceTimer);
  const routeVersion = ctx.state.routeVersion, sharedState = ctx.state;
  ctx = { ...ctx, isCurrent: () => routeVersion === sharedState.routeVersion };
  const url = new URL(path, 'https://practice.invalid');
  if (url.pathname === '/s/today') return today(ctx, token);
  if (url.pathname === '/s/map') return courseMap(ctx, token);
  if (url.pathname === '/s/progress') return progressPage(ctx, token);
  if (url.pathname === '/s/rewards') return rewards(ctx, token);
  if (url.pathname === '/s/library' || url.pathname === '/s/learn') return library(ctx, token);
  if (url.pathname.startsWith('/s/learn/')) return lesson(ctx, token, decodeURIComponent(url.pathname.slice('/s/learn/'.length)));
  if (url.pathname === '/s/review') return review(ctx, token);
  if (url.pathname === '/s/practice') {
    const source = ['practice', 'review', 'library', 'learn'].includes(url.searchParams.get('source')) ? url.searchParams.get('source') : 'practice';
    return runPractice(ctx, token, { source, skill: url.searchParams.get('skill') || undefined, count: Math.max(0, Math.min(20, Number(url.searchParams.get('count')) || 0)) });
  }
  if (url.pathname === '/s/settings') { ctx.shell(`${heading(ctx, 'Your account')}<section class="card"><h2>${ctx.escape(ctx.state.user?.name)}</h2><p>Username: ${ctx.escape(ctx.state.user?.username)}</p><p>Your teacher can reset your password. Your answers and points are saved with your account.</p>${nav('/s/today', 'Back to Today')}</section>`, { title: 'Settings' }); return; }
  ctx.navigate('/s/today');
}
