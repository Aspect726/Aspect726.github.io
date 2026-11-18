import { renderGradebook } from './gradebook.mjs';

const numeric = value => Number(value || 0).toLocaleString('en-US');
const percent = value => value === null || value === undefined ? '—' : `${Math.round(Number(value))}%`;
const weekdayLabel = value => value ? new Date(`${String(value).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }) : '';
const dateLabel = value => value ? new Date(`${String(value).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '—';
const field = (e, name, label, value = '', options = '') => `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" value="${e(value)}" ${options}></div>`;
const errorBox = '<p class="form-error" role="alert" hidden></p>';
const empty = (title, text = '') => `<div class="empty-state"><h3>${title}</h3>${text ? `<p>${text}</p>` : ''}</div>`;
const skillList = data => Array.isArray(data) ? data.map(x => typeof x === 'string' ? { id: x, name: x } : { ...x, id: x.id || x.skill }) : Object.entries(data || {}).map(([id, value]) => ({ id, name: typeof value === 'string' ? value : value.name || value.title || id, ...typeof value === 'object' ? value : {} }));
const skillName = value => typeof value === 'string' ? value : value?.name || value?.skill || value?.id || '';
const requestName = request => request.name || request.prizeName || request.prize_name || 'Prize request';
const statusName = status => ({ pending: 'Requested', requested: 'Requested', approved: 'Approved', given: 'Given', declined: 'Declined' }[status] || status);
const levelKey = value => String(value || 'not_started').toLowerCase().replace(/[ -]/g, '_');
const levelName = value => ({ not_started: 'Not started', learning: 'Learning', practicing: 'Practicing', mastered: 'Mastered' }[levelKey(value)] || value || 'Not started');

function chart(checks, e) {
  const rows = [...checks].filter(row => Number.isFinite(Number(row.score))).sort((a, b) => a.week - b.week);
  if (!rows.length) return empty('No paper scores yet.', 'Enter a Friday check to start the trend.');
  const x = week => 36 + (Number(week) - 1) * 48;
  const y = score => 154 - Number(score) / 21 * 126;
  return `<figure class="score-chart"><svg viewBox="0 0 500 190" role="img" aria-label="Friday paper checks, out of 21"><path d="M36 28V154H480" stroke="var(--line)" fill="none"/><text x="8" y="32" font-size="12" fill="currentColor">21</text><text x="16" y="158" font-size="12" fill="currentColor">0</text><polyline points="${rows.map(row => `${x(row.week)},${y(row.score)}`).join(' ')}" fill="none" stroke="var(--teal)" stroke-width="3"/>${rows.map(row => `<circle cx="${x(row.week)}" cy="${y(row.score)}" r="4" fill="var(--brick)"><title>Week ${e(row.week)}: ${e(row.score)} out of 21</title></circle>`).join('')}${Array.from({ length: 10 }, (_, i) => `<text x="${x(i + 1)}" y="177" text-anchor="middle" font-size="12" fill="currentColor">${i + 1}</text>`).join('')}</svg><figcaption>Week number · scores out of 21</figcaption></figure>`;
}

export async function renderTeacher(path, ctx) {
  const { api, shell, navigate, escape: e, mathMarkup, tell, state } = ctx;
  const viewVersion = state.routeVersion;
  const isCurrentView = () => state.routeVersion === viewVersion;
  const current = new URL(path, 'https://practice.invalid');
  const route = current.pathname;
  if (!state.studentsLoaded) {
    const list = await api('/v2/teacher/students');
    if (!isCurrentView()) return;
    state.students = list.students || [];
  }
  const detailId = route.match(/^\/t\/students\/([^/]+)$/)?.[1];
  if (detailId) state.studentId = decodeURIComponent(detailId);
  if (!state.students.some(s => s.id === state.studentId)) state.studentId = state.students[0]?.id || null;
  const selected = state.students.find(s => s.id === state.studentId);
  const query = (extra = {}) => new URLSearchParams({ ...(selected?.id ? { studentId: selected.id } : {}), ...extra }).toString();
  const endpoint = (name, extra = {}) => `/v2/teacher/${name}?${query(extra)}`;
  const write = (name, body, method) => api(`/v2/teacher/${name}?${query()}`, { ...body, ...(selected?.id ? { studentId: selected.id } : {}) }, method);
  const link = (href, text, className = 'text-link') => `<a class="${className}" href="${e(href)}" data-nav>${text}</a>`;
  const heading = (title, subtitle) => `<header class="page-heading teacher-chapter-heading"><div><p class="eyebrow">Teacher${selected ? ` · ${e(selected.name)}` : ''}</p><h1>${e(title)}</h1>${subtitle ? `<p class="teacher-chapter-intro">${subtitle}</p>` : ''}</div><span class="teacher-chapter-mark" aria-hidden="true">∑</span></header>`;
  const render = (title, content) => {
    const intro = content.match(/^<p class="page-intro">([\s\S]*?)<\/p>/);
    const tabs=['/t/plan','/t/assign','/t/questions'].includes(route)?`<nav class="teacher-section-tabs" aria-label="Curriculum tools">${[['/t/plan','Curriculum & dates'],['/t/assign','Practice tasks'],['/t/questions','Question samples']].map(([href,label])=>`<a href="${href}" data-nav ${route===href?'aria-current="page"':''}>${label}</a>`).join('')}</nav>`:'';
    shell(heading(title, intro?.[1] || '') + `<div class="teacher-chapter-content">${tabs}${intro ? content.slice(intro[0].length) : content}</div>`, { title });
  };
  const reload = () => navigate(path);
  const noStudent = () => render('Your student', empty('Create a student account to begin.', 'Their practice, skills and rewards will appear here.') + link('/t/settings', 'Create an account', 'button'));
  async function action(button, callback) {
    if (button.disabled) return;
    button.disabled = true;
    try { await callback(); }
    catch (error) { tell(error.message, true); }
    finally { if (button.isConnected) button.disabled = false; }
  }
  function bindForm(id, callback, success) {
    const form = document.getElementById(id);
    if (!form) return;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (form.dataset.saving === 'true') return;
      form.dataset.saving = 'true';
      const button = form.querySelector('[type=submit]');
      const error = form.querySelector('.form-error');
      if (button) button.disabled = true;
      if (error) error.hidden = true;
      try { await callback(new FormData(form), form); if (success) tell(success); }
      catch (failure) { if (error?.isConnected) { error.textContent = failure.message; error.hidden = false; } else tell(failure.message, true); }
      finally { form.dataset.saving = 'false'; if (button?.isConnected) button.disabled = false; }
    });
  }
  const detailPath = state.studentId ? `/t/students/${encodeURIComponent(state.studentId)}` : '/t/settings';
  const dayLink = (date, label) => link(`${detailPath}?section=days&date=${encodeURIComponent(date)}`, label);
  const table = (headers, rows) => `<div class="table-wrap" tabindex="0" role="region" aria-label="${e(headers[0] || 'Data')} table"><table><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  const mastery = skills => {
    if (!skills.length) return empty('Skill progress starts here.', 'As questions are answered, each skill’s progress will appear here.');
    const groups = new Map();
    for (const skill of skills) {
      const week = Number(skill.week) || 1;
      if (!groups.has(week)) groups.set(week, []);
      groups.get(week).push(skill);
    }
    const weeks = [...groups.keys()].sort((a, b) => a - b);
    const activeWeek = weeks.find(week => groups.get(week).some(skill => ['learning', 'practicing'].includes(levelKey(skill.mastery || skill.level)))) ?? weeks[0];
    const mastered = skills.filter(skill => levelKey(skill.mastery || skill.level) === 'mastered').length;
    const started = skills.filter(skill => Number(skill.attempts) > 0 || levelKey(skill.mastery || skill.level) !== 'not_started').length;
    return `<div class="mastery-summary" aria-label="Skill progress summary"><span><strong>${numeric(mastered)}</strong> mastered</span><span><strong>${numeric(started - mastered)}</strong> in progress</span><span><strong>${numeric(skills.length - started)}</strong> not started</span></div><div class="teacher-mastery-groups">${weeks.map(week => {
      const items = groups.get(week);
      return `<details class="mastery-week" ${week === activeWeek ? 'open' : ''}><summary><span>Week ${e(week)}</span><small>${items.length} skills · ${items.filter(skill => levelKey(skill.mastery || skill.level) === 'mastered').length} mastered</small></summary><div class="teacher-mastery-grid">${items.map(skill => {
        const level = levelKey(skill.mastery || skill.level);
        const accuracy = skill.last10Accuracy ?? skill.accuracy;
        return `<a data-nav href="${detailPath}?section=skills&skill=${encodeURIComponent(skill.skill || skill.id)}" class="mastery-tile teacher-mastery-tile ${e(level)}"><strong>${e(skill.name || skill.skill || skill.id)}</strong><span class="mastery-meta"><span class="badge mastery-status ${e(level)}">${e(levelName(level))}</span><small>${numeric(skill.attempts)} answered</small></span>${accuracy !== null && accuracy !== undefined ? `<small class="mastery-accuracy">${percent(accuracy)} recent accuracy</small>` : ''}</a>`;
      }).join('')}</div></details>`;
    }).join('')}</div>`;
  };
  if (!selected && !['/t/settings', '/t/questions'].includes(route)) return noStudent();

  if (['/t/gradebook', '/t/scores'].includes(route)) return renderGradebook(path, { ...ctx, selectedStudent: selected });

  if (route === '/t/students') return navigate(detailPath);

  if (route === '/t/dashboard') {
    const [data, notes] = await Promise.all([api(endpoint('dashboard')), api(endpoint('notes'))]);
    if(!isCurrentView())return;
    const week=typeof data.week==='object'&&data.week?data.week:{week:data.week||1};
    const note=notes.notes?.find(item=>Number(item.week)===Number(week.week))?.text||'';
    const schedule=data.schedule,today=schedule?.today,report=data.progressReport;
    const b=data.backlog||schedule?.backlog||{behind:schedule?.remainingToDate||0,overdue:schedule?.overdueQuestions||0,remainingToday:today?.remaining||0,requiredToDate:schedule?.requiredToDate||0,completedToDate:schedule?.creditedToDate||0,catchupCredit:0};
    const name=data.student?.name||selected.name,days=data.days||[],focus=week.skills||[];
    const goal=today?.expected||0,answered=report?.today?.answered??today?.answered??0;
    const due=today?.dueAt?new Date(Date.parse(today.dueAt)-1).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:schedule.timeZone||'America/Los_Angeles',timeZoneName:'short'}):'';
    const counts=report?.mastery||{},levelCounts=report?.levels?.counts||{};
    const recentAccuracy=report?.accuracy?.recent;
    const currentAccuracy=recentAccuracy?recentAccuracy.percent:report?.accuracy?.overall?.percent??data.summary?.accuracy;
    const nextAction=data.gradebookSummary?.nextAction;
    const latestTest=data.gradebookSummary?.latestTest;
    const reportText=report?.text||'The progress update is not available. Reload this page to try again.';
    const completed=Math.min(Number(b.requiredToDate)||0,Number(b.completedToDate)||0);
    const percentDone=b.requiredToDate?Math.round(completed/b.requiredToDate*100):100;
    const requestCount=(data.requests||[]).filter(item=>['pending','requested','approved'].includes(item.status)).length;
    const skillLinks=items=>items.map(skill=>`<li>${link(`/t/questions?skill=${encodeURIComponent(typeof skill==='string'?skill:skill.skill||skill.id)}`,e(skillName(skill)))}</li>`).join('');
    render(`${name}’s learning`, `<p class="page-intro">${e(dateLabel(data.today))} · Week ${e(week.week)} of 10</p>
      <nav class="teacher-actions" aria-label="Teaching actions">
        ${link('/t/plan',`<span class="teacher-action-icon" aria-hidden="true">▤</span><span><strong>Prepare a lesson</strong><small>Curriculum, worksheets & dates</small></span><span aria-hidden="true">→</span>`,'teacher-action action-blue')}
        ${link('/t/gradebook',`<span class="teacher-action-icon" aria-hidden="true">✓</span><span><strong>Grades & student work</strong><small>Daily paper grades, tests & answers</small></span><span aria-hidden="true">→</span>`,'teacher-action action-purple')}
        ${link('/t/rewards',`<span class="teacher-action-icon" aria-hidden="true">★</span><span><strong>Manage points</strong><small>${numeric(data.points)} available${requestCount?` · ${numeric(requestCount)} requests`:' · rules & prizes'}</small></span><span aria-hidden="true">→</span>`,'teacher-action action-gold')}
      </nav>
      <nav class="teacher-quick-links" aria-label="Quick teaching actions">${link(`${detailPath}?section=days&date=${encodeURIComponent(data.today)}`,'Today’s answers')}${link(`/t/gradebook?date=${encodeURIComponent(data.today)}#today`,'Enter paper grade')}${link('/t/scores','Enter test score')}<a href="#teacher-note-panel" class="text-link" id="jump-to-weekly-note">Update weekly note</a></nav>
      <section class="teacher-progress-board" aria-labelledby="teacher-progress-title"><div class="section-heading"><h2 id="teacher-progress-title">Practice progress</h2>${link(`${detailPath}?section=days`,'Daily record →')}</div>
        <div class="teacher-progress-columns"><div class="teacher-today"><span class="metric-label">Today’s goal</span><strong>${numeric(Math.min(answered,goal))}<small> / ${numeric(goal)}</small></strong><progress value="${Math.min(answered,goal)}" max="${Math.max(1,goal)}" aria-label="Today’s questions complete"></progress><p>${goal?`${numeric(b.remainingToday)} left${due?` · due ${e(due)}`:''}`:'No daily set scheduled'}</p><small>${numeric(answered)} answers submitted today</small></div>
        <div class="teacher-backlog-hero"><span class="metric-label">Earlier work</span><strong>${numeric(b.overdue)}</strong><p>questions to catch up</p><small>${numeric(b.behind)} questions behind including today</small><p class="teacher-backlog-breakdown">${numeric(b.overdue)} overdue from earlier days + ${numeric(b.remainingToday)} today</p></div>
        <div class="teacher-learning-summary"><span class="metric-label">Recent learning</span><strong>${percent(currentAccuracy)}</strong><p>${recentAccuracy?'last 7 days':'overall accuracy'} · ${numeric(recentAccuracy?.answered??report?.totals?.answered??data.summary?.answered)} answers</p><small>${numeric(counts.mastered)} / ${numeric(counts.total||70)} skills mastered</small>${link(`${detailPath}?section=skills`,'See skills →')}</div></div>
        <p class="teacher-progress-explainer">Today’s questions count toward today’s goal. Extra answers catch up earlier work and count toward reward points. ${link('/t/rewards','See the points rules')}</p>${nextAction?`<p class="teacher-next-action"><strong>Next:</strong> ${link(nextAction.href,e(nextAction.text))}</p>`:''}
      </section>
      <section class="teacher-gradebook-shortcut" aria-labelledby="teacher-gradebook-title"><div><h2 id="teacher-gradebook-title">Paper & tests</h2><p>${latestTest?`${e(latestTest.title||'Latest test')}: <strong>${numeric(latestTest.score)} / ${numeric(latestTest.maxScore)}</strong> · ${latestTest.takenOn?e(dateLabel(latestTest.takenOn)):'date not recorded'}`:'No test score recorded yet.'}</p><small>Paper grades are separate from the 20 daily online questions.</small></div><div class="form-actions">${link(`/t/gradebook?week=${encodeURIComponent(week.week)}&date=${encodeURIComponent(data.today)}#today`,'Enter today’s paper grade','button secondary')}${link('/t/scores','Add a test score','text-link')}</div></section>
      <div class="teacher-teach-grid"><section class="teacher-current-lesson"><p class="eyebrow">Week ${e(week.week)} · ${e(dateLabel(week.startDate))}–${e(dateLabel(week.endDate))}</p><h2>${e(week.topic||'Current lessons')}</h2>${focus.length?`<ul class="teacher-focus-short">${skillLinks(focus.slice(0,3))}</ul>`:''}<div class="form-actions">${link(`/t/plan?week=${encodeURIComponent(week.week)}`,'Open this week','button')}${link('/t/assign','Set a practice task')}</div>${data.weakSkills?.length?`<div class="teacher-help-focus"><h3>Review next</h3>${data.weakSkills.slice(0,2).map(skill=>`<p>${link(`${detailPath}?section=skills&skill=${encodeURIComponent(skill.skill)}`,e(skill.name||skill.skill))} <small>${percent(skill.accuracy)} recent accuracy</small></p>`).join('')}</div>`:''}</section>
      <section id="teacher-note-panel" class="teacher-paper-note teacher-note-prominent"><p class="eyebrow">Your weekly note</p><h2>A note for ${e(name)}</h2><form id="teacher-note"><div class="field"><label for="teacher-note-text">Appears on Daily questions</label><textarea id="teacher-note-text" name="text" rows="4" maxlength="1000" placeholder="For example: Draw equal groups before dividing.">${e(note)}</textarea></div>${errorBox}<button class="button secondary" type="submit">Save note</button></form></section></div>
      <details class="teacher-share-update teacher-disclosure"><summary><span>Share a progress update</span><small>Copy or download the latest stats</small></summary><div class="disclosure-content"><p>Updated ${e(dateLabel(report?.date||data.today))}. Send this using your own messaging app.</p><label class="visually-hidden" for="teacher-progress-update">Copyable progress update</label><textarea id="teacher-progress-update" readonly rows="10" spellcheck="false">${e(reportText)}</textarea><div class="form-actions"><button class="button" id="copy-progress-update" ${report?'':'disabled'}>Copy update</button><button class="button secondary" id="download-progress-update" ${report?'':'disabled'}>Download text</button><button class="text-link" id="refresh-progress-update">Refresh stats</button></div><p id="progress-copy-status" class="small" role="status" aria-live="polite"></p><p class="small">Website question levels: ${[1,2,3].map(level=>`Level ${level}: ${numeric(levelCounts[level])} practiced skills`).join(' · ')}. These describe difficulty, not school grades.</p></div></details>`);
    document.getElementById('jump-to-weekly-note')?.addEventListener('click',event=>{event.preventDefault();document.getElementById('teacher-note-panel')?.scrollIntoView?.({block:'center'});document.getElementById('teacher-note-text')?.focus({preventScroll:true});});
    bindForm('teacher-note',async fd=>{await write('notes',{week:Number(week.week),text:fd.get('text')});},'Your note is saved.');
    document.getElementById('refresh-progress-update')?.addEventListener('click',reload);
    document.getElementById('copy-progress-update')?.addEventListener('click',async()=>{
      const field=document.getElementById('teacher-progress-update'),status=document.getElementById('progress-copy-status');
      try{if(!globalThis.navigator?.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(field.value);if(status.isConnected)status.textContent='Update copied. Paste it into your message.';}
      catch{if(!field.isConnected)return;field.focus();field.select();const copied=typeof document.execCommand==='function'&&document.execCommand('copy');status.textContent=copied?'Update copied. Paste it into your message.':'Update selected. Press Ctrl+C or ⌘C to copy it.';}
    });
    document.getElementById('download-progress-update')?.addEventListener('click',()=>{
      const content=document.getElementById('teacher-progress-update').value,url=URL.createObjectURL(new Blob([content+'\n'],{type:'text/plain;charset=utf-8'}));
      const anchor=document.createElement('a');anchor.href=url;anchor.download=`${String(name).replace(/[^a-z0-9-]/gi,'-')}-math-update-${report.date}.txt`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    return;
  }

  if (route.startsWith('/t/students/')) {
    const date = current.searchParams.get('date');
    const section = current.searchParams.get('section') || 'overview';
    // The history endpoint is cursor-bounded; do not also fetch the old full answer list.
    const data = section === 'history' ? { student: selected } : await api(endpoint(`students/${encodeURIComponent(state.studentId)}`, date ? { date } : {}));
    const sections = [['overview', 'Overview'], ['days', 'Days'], ['skills', 'Skills'], ['history', 'Learning history'], ['patterns', 'Mistake patterns']];
    const nav = `<nav class="section-nav" aria-label="Student detail sections">${link('/t/gradebook','Daily grades','section-link')}${link('/t/scores','Tests','section-link')}${sections.map(([id, title]) => `<a data-nav href="${detailPath}?section=${id}" class="section-link${section === id ? ' active' : ''}"${section === id ? ' aria-current="page"' : ''}>${e(title)}</a>`).join('')}</nav>`;
    let content = '';
    if (section === 'overview') {
      const summary = data.summary || {};
      content = `<div class="summary-grid teacher-summary-three"><div class="summary-stat"><span>Current streak</span><strong>${numeric(summary.streak)} days</strong><small>Best: ${numeric(summary.bestStreak)}</small></div><div class="summary-stat"><span>Questions answered</span><strong>${numeric(summary.answered)}</strong></div><div class="summary-stat"><span>Overall accuracy</span><strong>${percent(summary.accuracy)}</strong></div></div><section class="panel"><div class="section-heading"><h2>Skill mastery</h2>${link(`${detailPath}?section=skills`, 'View all skills')}</div><p class="section-description">Open a week to see each skill. Select a skill for its answer history.</p>${mastery(data.skills || [])}</section><section class="panel"><div class="section-heading"><div><h2>See the thinking behind the answers</h2><p class="section-description">Revisit saved answers, help used and conversations with the maths helper.</p></div>${link(`${detailPath}?section=history`, 'Open learning history', 'button secondary')}</div></section>`;
    } else if (section === 'days') {
      if (date) {
        const answers = data.attempts || [];
        content = `<section class="panel"><div class="section-heading"><h2>${e(dateLabel(date))}: actual answers</h2>${link(`${detailPath}?section=days`, 'All days')}</div>${answers.length ? `<ol class="answer-history">${answers.map(answer => `<li><div class="section-heading"><span class="badge">${e(answer.skill)}</span><span>${e(answer.source || 'practice')} · ${numeric(answer.seconds ?? Number(answer.elapsedMs || 0) / 1000)} sec</span></div><div class="question-prompt">${mathMarkup(answer.questionText || answer.question_text || answer.prompt || '', true)}</div><dl class="answer-comparison"><div><dt>Student’s answer</dt><dd>${mathMarkup(answer.givenAnswer ?? answer.given_answer ?? answer.answer ?? '')}</dd></div><div><dt>Correct answer</dt><dd>${mathMarkup(answer.correctAnswer ?? answer.correct_answer ?? answer.rightAnswer ?? '')}</dd></div></dl><p class="${answer.correct || answer.isCorrect || answer.is_correct ? 'correct' : 'miss'}">${answer.correct || answer.isCorrect || answer.is_correct ? 'Correct' : 'Not yet secure'}${answer.mistakeLabel ? ` · ${e(answer.mistakeLabel)}` : ''}</p></li>`).join('')}</ol>` : empty('No answers on this day.', 'Opening a question does not count as an answer.')}</section>`;
      } else {
        const records=new Map((data.days||[]).map(day=>[day.date,day]));
        const scheduled=data.schedule?.days || [];
        const rows=scheduled.length?[...scheduled.map(day=>({...records.get(day.date),...day})),...(data.days||[]).filter(day=>!scheduled.some(item=>item.date===day.date))].sort((a,b)=>a.date.localeCompare(b.date)):data.days||[];
        content = `<section class="panel"><h2>Daily practice record</h2><p class="section-description">Answers stay on the day they were submitted. Extra answers can complete earlier goals; catch-up credit is shown separately. Select a date to read the work.</p>${rows.length ? table(['Date', 'Answered / Goal', 'Status', 'Caught up later', 'Questions left', 'Accuracy', 'Minutes', 'Points earned'], rows.map(day => `<tr><td class="date-cell">${dayLink(day.date, e(dateLabel(day.date)))}</td><td>${numeric(day.answered)} / ${numeric(day.expected ?? day.target ?? 20)}</td><td>${e(({upcoming:'Coming up',caught_up:'Caught up',complete:day.caughtUp?'Caught up':'Goal met',missed:'Past due',today:'Due today',partial:'In progress'})[day.status] || 'Recorded')}</td><td>${numeric(day.catchupCredit)}</td><td>${numeric(day.remaining ?? Math.max(0,(day.target ?? 20)-day.answered))}</td><td>${percent(day.accuracy)}</td><td>${numeric(day.minutes)}</td><td>${numeric(day.points ?? day.pointsEarned)}</td></tr>`)) : empty('No answers yet.', 'Each practice day will appear here with a link to every answer.')}</section>`;
      }
    } else if (section === 'skills') {
      const chosen = current.searchParams.get('skill');
      const skills = [...(data.skills || [])];
      const sort = current.searchParams.get('sort') || 'week';
      skills.sort((a, b) => sort === 'accuracy' ? (a.last10Accuracy ?? a.accuracy ?? -1) - (b.last10Accuracy ?? b.accuracy ?? -1) : sort === 'attempts' ? Number(b.attempts) - Number(a.attempts) : Number(a.week || 0) - Number(b.week || 0));
      content = `<section class="panel"><div class="section-heading"><h2>Skills</h2><label class="table-sort">Sort by <select id="skill-sort"><option value="week" ${sort === 'week' ? 'selected' : ''}>Week</option><option value="accuracy" ${sort === 'accuracy' ? 'selected' : ''}>Lowest accuracy</option><option value="attempts" ${sort === 'attempts' ? 'selected' : ''}>Most practice</option></select></label></div>${table(['Skill', 'Week', 'Answered', 'Recent accuracy', 'Level', 'Last practiced'], skills.map(skill => `<tr><td>${link(`${detailPath}?section=skills&skill=${encodeURIComponent(skill.skill || skill.id)}&sort=${sort}`, e(skill.name || skill.skill || skill.id))}</td><td>${e(skill.week || '—')}</td><td>${numeric(skill.attempts)}</td><td>${percent(skill.last10Accuracy ?? skill.accuracy)}</td><td><span class="badge mastery-status ${e(levelKey(skill.mastery || skill.level))}">${e(levelName(skill.mastery || skill.level))}</span></td><td class="date-cell">${e(dateLabel(skill.lastPracticed || skill.lastDate))}</td></tr>`))}</section>`;
      if (chosen) content += `<section class="panel"><h2>Answers for ${e(skills.find(s => (s.skill || s.id) === chosen)?.name || chosen)}</h2>${(data.attempts || []).some(a => a.skill === chosen) ? table(['Question', 'Student answer', 'Correct answer', 'Date'], data.attempts.filter(a => a.skill === chosen).map(a => `<tr><td>${mathMarkup(a.questionText || a.question_text || a.prompt || '', true)}</td><td>${mathMarkup(a.givenAnswer ?? a.given_answer ?? a.answer ?? '')}</td><td>${mathMarkup(a.correctAnswer ?? a.correct_answer ?? a.rightAnswer ?? '')}</td><td>${e(dateLabel(a.date || a.createdAt))}</td></tr>`)) : empty('No answers for this skill yet.')}</section>`;
    } else if (section === 'history') {
      const chosen = current.searchParams.get('skill') || '';
      const cursor = current.searchParams.get('cursor') || '';
      const historyPath = (skill = chosen, nextCursor = '') => `${detailPath}?${new URLSearchParams({ section: 'history', ...(skill ? { skill } : {}), ...(nextCursor ? { cursor: nextCursor } : {}) })}`;
      const text = value => e(value ?? '').replace(/\r?\n/g, '<br>');
      const timestamp = value => {
        const date = new Date(value || '');
        return Number.isFinite(date.getTime()) ? date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }) : 'Saved activity';
      };
      try {
        const history = await api(endpoint('tutor-history', { limit: '20', ...(chosen ? { skill: chosen } : {}), ...(cursor ? { cursor } : {}) }));
        if (!isCurrentView()) return;
        const items = Array.isArray(history.items) ? history.items : [];
        const skills = Array.isArray(history.skills) ? history.skills : [];
        const summaries = Array.isArray(history.skillSummaries) ? history.skillSummaries : [];
        const help = history.helpSummary || {};
        const mistakes = Array.isArray(history.commonMistakes) ? history.commonMistakes : [];
        const answerCount = summaries.reduce((total, skill) => total + Number(skill.attempts || 0), 0);
        const kindLabel = item => item.type === 'answer' ? (item.correct ? 'Correct answer' : 'An idea to revisit') : item.type === 'conversation' ? (['reasoning', 'check-reasoning'].includes(item.mode) ? 'Shared their reasoning' : 'Asked the maths helper') : item.kind === 'answer' ? 'Opened the worked answer' : item.kind === 'step' ? 'Looked at a worked step' : 'Opened a hint';
        const entry = item => {
          const question = `<details class="learning-history-question"><summary>Read the question${item.type === 'answer' ? ' and answers' : ''}</summary><p class="learning-history-body">${text(item.questionText || 'Question text is not available for this older activity.')}</p>${item.type === 'answer' ? `<dl class="answer-comparison"><div><dt>Student’s answer</dt><dd>${text(item.givenAnswer)}</dd></div><div><dt>Correct answer</dt><dd>${text(item.correctAnswer)}</dd></div></dl><p class="field-help">${numeric(item.seconds)} seconds · ${e(item.source || 'practice')}</p>` : ''}</details>`;
          const conversation = item.type === 'conversation' ? `<div class="learning-history-message"><h4>Student</h4><p>${text(item.message || (['reasoning', 'check-reasoning'].includes(item.mode) ? 'Asked for feedback on their reasoning.' : 'Asked for help with this question.'))}</p></div><div class="learning-history-message helper-message"><h4>Maths helper</h4><p>${text(item.reply || 'This reply was not saved.')}</p>${['reasoning', 'check-reasoning'].includes(item.mode) && ['sound', 'needs_work', 'unclear'].includes(item.assessment) ? `<p class="field-help">Helper feedback: ${e(({sound:'The reasoning looks sound.',needs_work:'A step needs another look.',unclear:'More explanation is needed.'})[item.assessment])} This feedback does not change the question’s score.</p>` : ''}</div>` : '';
          return `<li><article class="learning-history-item"><div class="section-heading"><span class="badge learning-history-kind">${e(kindLabel(item))}</span><time datetime="${e(item.createdAt || '')}">${e(timestamp(item.createdAt))}</time></div><h3>${e(item.skillName || item.skill || 'Mathematics')}</h3>${question}${conversation}</article></li>`;
        };
        const pagination = history.pagination || {};
        content = `<section class="panel"><div class="section-heading"><div><h2>Learning history</h2><p class="section-description">Answers, help and maths-helper conversations stay with ${e(selected.name)}’s account. Read a question to see its context.</p></div></div><form id="learning-history-filter" class="learning-history-filter"><div class="field"><label for="history-skill">Focus on a skill</label><select id="history-skill" name="skill"><option value="">All skills</option>${skills.map(skill => `<option value="${e(skill.skill || skill.id)}" ${(skill.skill || skill.id) === chosen ? 'selected' : ''}>${e(skill.name || skill.skill || skill.id)}</option>`).join('')}</select></div><div class="form-actions"><button class="button secondary" type="submit">Show history</button>${chosen || cursor ? link(historyPath('', ''), 'Show all recent activity') : ''}</div></form><div class="summary-grid teacher-summary-three learning-history-summary"><div class="summary-stat"><span>Practice answers</span><strong>${numeric(answerCount)}</strong></div><div class="summary-stat"><span>Help opened</span><strong>${numeric(help.total)}</strong><small>${numeric(help.hint)} hints · ${numeric(help.step)} worked steps · ${numeric(help.answer)} worked answers</small></div><div class="summary-stat"><span>Helper conversations</span><strong>${numeric(help.conversations)}</strong></div></div><p class="field-help">These counts cover ${chosen ? 'this skill' : 'all skills'}. Activity below is shown ${cursor ? 'from an older page' : 'most recent first'}. Times are Pacific time.</p></section><section class="panel"><details class="learning-history-progress"><summary>Skill progress and patterns to revisit</summary>${summaries.length ? table(['Skill', 'Answered', 'Correct', 'Accuracy', 'Last practice'], summaries.map(skill => `<tr><td>${link(historyPath(skill.skill || skill.id), e(skill.name || skill.skill || skill.id))}</td><td>${numeric(skill.attempts)}</td><td>${numeric(skill.correct)}</td><td>${percent(skill.accuracy)}</td><td>${e(dateLabel(skill.lastPracticed))}</td></tr>`)) : '<p>No answers have been saved for these skills yet.</p>'}${mistakes.length ? `<h3>Patterns to revisit</h3><ul class="learning-history-mistakes">${mistakes.map(mistake => `<li><strong>${e(mistake.name || mistake.skill)}</strong>: ${e(mistake.label)} · ${numeric(mistake.count)} ${Number(mistake.count) === 1 ? 'time' : 'times'}</li>`).join('')}</ul>` : '<p class="field-help">No repeated mistake patterns are recorded for this selection.</p>'}</details></section><section class="panel"><div class="section-heading"><h2>${cursor ? 'Earlier activity' : 'Recent activity'}</h2>${cursor ? link(historyPath(chosen), 'Back to latest') : ''}</div>${items.length ? `<ol class="answer-history learning-history-list">${items.map(entry).join('')}</ol>` : empty('No learning history yet.', 'Saved answers, opened hints and maths-helper conversations will appear here.')}<nav class="form-actions learning-history-pagination" aria-label="Learning history pages">${pagination.hasMore && pagination.nextCursor ? link(historyPath(chosen, pagination.nextCursor), 'Older activity', 'button secondary') : items.length ? '<p class="field-help">You have reached the earliest saved activity for this selection.</p>' : ''}</nav></section>`;
      } catch (failure) {
        if (!isCurrentView()) return;
        content = `<section class="panel"><h2>Learning history</h2><p role="alert">${e(failure.message || 'Learning history could not load.')}</p>${link(historyPath(chosen, cursor), 'Try again', 'button secondary')}</section>`;
      }
    } else {
      content = `<section class="panel"><h2>Repeated mistake patterns</h2><p>Only known mistake patterns from the question templates are named here.</p>${data.mistakes?.length ? table(['Skill', 'Known pattern', 'Times seen'], data.mistakes.map(m => `<tr><td>${e(m.name || m.skill)}</td><td>${e(m.label)}</td><td>${numeric(m.count)}</td></tr>`)) : empty('No repeated patterns yet.', 'This fills in when the same known mistake appears again.')}</section>`;
    }
    if (!isCurrentView()) return;
    render(`${data.student?.name || selected.name}’s learning record`, `<p class="page-intro">Review saved answers, skill progress and help used.</p>` + nav + content);
    document.getElementById('skill-sort')?.addEventListener('change', event => navigate(`${detailPath}?section=skills&sort=${event.target.value}`));
    document.getElementById('learning-history-filter')?.addEventListener('submit', event => {
      event.preventDefault();
      const skill = document.getElementById('history-skill').value;
      navigate(`${detailPath}?${new URLSearchParams({ section: 'history', ...(skill ? { skill } : {}) })}`);
    });
    return;
  }

  if (route === '/t/plan') {
    const data = await api(endpoint('plan'));
    if (!isCurrentView()) return;
    const curriculum=data.curriculum,weekNumber=Number(current.searchParams.get('week'))||data.weeks?.find(w=>w.status==='current')?.week||1;
    const diagnostics=data.diagnostics||data.materials?.diagnostics||[];
    const materialLink=item=>`<a href="${e(item.url)}" target="_blank" rel="noopener noreferrer" class="material-link"><span aria-hidden="true">▤</span> ${e(item.label||item.title||item.name||'PDF')} <small>PDF ↗</small></a>`;
    render('Curriculum & dates', `<p class="page-intro">Choose a week to see lessons, download the materials, or change dates.</p>
      <div class="curriculum-toolbar"><p><strong>10 weeks</strong> · 70 daily lessons · ${numeric(data.program?.dailyTarget||20)} online questions a day</p><button id="move-whole-course" class="button secondary">Move the whole course</button>${link('/t/scores','Record a test score →')}</div>
      <div class="teacher-course-plan">${(data.weeks||[]).map(week=>{
        const materials=week.materials||{},selectedWeek=Number(week.week)===weekNumber;
        const worksheets=materials.worksheets||[];
        const status=week.status==='current'?'This week':week.status==='upcoming'?'Upcoming':'Earlier week';
        return `<details class="curriculum-week ${week.status==='current'?'current':''}" id="week-${e(week.week)}" ${selectedWeek?'open':''}><summary><span class="week-number">${e(String(week.week).padStart(2,'0'))}</span><span class="week-heading"><span class="week-dates">${e(dateLabel(week.startDate))}–${e(dateLabel(week.endDate))}<span class="badge">${e(status)}</span></span><strong>${e(week.topic)}</strong></span><span class="week-chevron" aria-hidden="true">⌄</span></summary><div class="curriculum-week-body">
          <div class="week-materials-bar"><div><h2>Week ${e(week.week)} materials</h2><p>7 worksheets + teacher guide · includes answers</p></div><button class="button" data-download-week="${e(week.week)}" data-download-url="${e((week.downloadUrl||materials.downloadUrl||'')+'?'+query())}">Download week (ZIP)</button></div><p class="download-status" id="download-status-${e(week.week)}" role="status" aria-live="polite"></p>
          ${(materials.notes||[]).map(note=>`<p class="curriculum-source-note">${e(note)}</p>`).join('')}
          ${materials.teacherGuide?`<div class="teacher-guide-link">${materialLink(materials.teacherGuide)}</div>`:''}
          <ol class="curriculum-days">${(week.days||[]).map((day,index)=>{const sheet=worksheets[index];return `<li><div class="lesson-date"><strong>${e(weekdayLabel(day.date))}</strong><span>${e(dateLabel(day.date))}</span></div><div class="lesson-content"><h3>${e(day.title)}</h3><p>${(day.skills||[]).slice(0,3).map(skill=>e(skill.name||skill.skill||skill)).join(' · ')}</p>${day.skills?.length>3?`<details><summary>All ${numeric(day.skills.length)} skills</summary><ul>${day.skills.map(skill=>`<li>${e(skill.name||skill.skill||skill)}</li>`).join('')}</ul></details>`:''}</div>${sheet?`<a class="lesson-pdf" href="${e(sheet.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open worksheet for ${e(day.title)}">Worksheet <span aria-hidden="true">↗</span></a>`:''}</li>`;}).join('')}</ol>
          <details class="week-date-editor"><summary>Change this week’s dates</summary><p>Move week ${e(week.week)} and all later weeks together. Preview the dates before applying. Saved answers and points stay on their original dates.</p><form id="week-date-form-${e(week.week)}" data-date-week="${e(week.week)}"><div class="date-editor-controls"><div class="field"><label for="week-start-${e(week.week)}">Week ${e(week.week)} starts</label><input id="week-start-${e(week.week)}" name="startDate" type="date" value="${e(week.startDate)}" required></div><button type="button" class="button secondary" data-date-nudge="-7" data-week="${e(week.week)}">7 days earlier</button><button type="button" class="button secondary" data-date-nudge="7" data-week="${e(week.week)}">7 days later</button><button class="button" type="submit">Preview dates</button></div>${errorBox}<div id="date-preview-${e(week.week)}" class="date-change-preview" hidden></div></form></details>
        </div></details>`;
      }).join('')}</div>
      <p class="curriculum-print-note">The PDFs keep their original printed dates. The dates above are your current teaching schedule. The teacher guide includes the answer key; keep it with the teacher.</p>
      ${diagnostics.length?`<details class="teacher-disclosure"><summary><span>Starting-point assessment</span><small>Grade 5 diagnostic and answer key</small></summary><div class="disclosure-content diagnostic-downloads">${diagnostics.map(materialLink).join('')}</div></details>`:''}
      ${curriculum?`<details class="teacher-disclosure curriculum-guide"><summary><span>Standards & teaching sequence</span><small>Grade 5 foundations → IMT1 → selected IMT2</small></summary><div class="disclosure-content"><p>${e(curriculum.scope)}</p><div class="curriculum-stages">${curriculum.stages.map(stage=>`<section><h2>${e(stage.title)}</h2><p>${e(stage.description)}</p><details><summary>Learning targets</summary><ul>${curriculum.skills.filter(skill=>skill.stage===stage.id).map(skill=>`<li>${link(`/t/questions?skill=${encodeURIComponent(skill.id)}`,e(skill.name))}<small>${e(skill.standards.join(' · '))}</small></li>`).join('')}</ul></details></section>`).join('')}</div><details><summary>Curriculum sources</summary><ul>${curriculum.sources.map(source=>`<li><a href="${e(source.url)}" target="_blank" rel="noopener noreferrer">${e(source.title)}</a></li>`).join('')}</ul></details></div></details>`:''}`);
    document.getElementById('move-whole-course')?.addEventListener('click',()=>{const first=document.getElementById('week-1');first.open=true;first.querySelector('.week-date-editor').open=true;first.querySelector('input[type=date]').focus();first.scrollIntoView?.({block:'start'});});
    for (const week of data.weeks||[]) {
      const form=document.getElementById(`week-date-form-${week.week}`),input=form.elements.startDate,preview=document.getElementById(`date-preview-${week.week}`);
      const clear=()=>{preview.hidden=true;preview.replaceChildren();};
      input.addEventListener('input',clear);
      form.querySelectorAll('[data-date-nudge]').forEach(button=>button.addEventListener('click',()=>{const date=new Date(`${input.value||week.startDate}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+Number(button.dataset.dateNudge));input.value=date.toISOString().slice(0,10);clear();}));
      bindForm(form.id,async fd=>{
        const startDate=fd.get('startDate');
        const result=await write('plan',{week:Number(week.week),startDate,preview:true});
        if(!isCurrentView()||input.value!==startDate)return;
        const change=result.preview;
        preview.hidden=false;
        preview.innerHTML=`<h3>Review the new dates</h3><p>${numeric(change.affectedWeeks.length)} ${change.affectedWeeks.length===1?'week':'weeks'} move ${numeric(Math.abs(change.deltaDays))} days ${change.deltaDays<0?'earlier':'later'}.</p>${table(['Week','Current dates','New dates'],change.affectedWeeks.map(item=>`<tr><td>${e(item.week)}</td><td>${e(dateLabel(item.oldStartDate))}–${e(dateLabel(item.oldEndDate))}</td><td><strong>${e(dateLabel(item.startDate))}–${e(dateLabel(item.endDate))}</strong></td></tr>`))}<div class="form-actions"><button type="button" class="button" data-apply-dates>Apply these dates</button><button type="button" class="button secondary" data-cancel-dates>Cancel</button></div><p class="small">Daily deadlines and catch-up totals will follow this schedule. Saved work and earned points are kept.</p>`;
        preview.querySelector('[data-cancel-dates]').addEventListener('click',()=>{input.value=week.startDate;clear();});
        preview.querySelector('[data-apply-dates]').addEventListener('click',event=>action(event.currentTarget,async()=>{await write('plan',{week:Number(week.week),startDate,expectedVersion:change.expectedVersion});tell('Teaching dates updated.');await reload();}));
      });
    }
    document.querySelectorAll('[data-download-week]').forEach(button=>button.addEventListener('click',()=>action(button,async()=>{
      const status=document.getElementById(`download-status-${button.dataset.downloadWeek}`);
      status.textContent='Preparing the worksheets and teacher guide…';
      try{
        const response=await fetch(button.dataset.downloadUrl,{credentials:'same-origin'});
        if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.error||'The download could not be prepared. Try again.');}
        const blob=await response.blob(),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1]||`Double-Advanced-Week-${button.dataset.downloadWeek}.zip`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Download ready. Check your browser’s downloads.';
      }catch(error){status.textContent=error.message;throw error;}
    })));
    return;
  }

  if (route === '/t/checks') {
    const data = await api(endpoint('checks'));
    const checks = data.checks || [];
    render('Weekly paper checks', `<p class="page-intro">Friday paper scores stay separate from online practice. A score below 12 suggests re-teaching before new content.</p>${link(detailPath,'← Student work','text-link back-link')}<div class="grid-2"><section class="panel"><h2>Enter a paper score</h2><form id="check-form"><div class="field"><label for="check-week">Week</label><select id="check-week" name="week">${Array.from({ length: 10 }, (_, index) => `<option value="${index + 1}">Week ${index + 1}</option>`).join('')}</select></div>${field(e, 'score', 'Score out of 21', '', 'type="number" min="0" max="21" step="1" required')}<div class="field"><label for="check-note">Optional note</label><textarea id="check-note" name="note" rows="3" maxlength="1000"></textarea></div>${errorBox}<button type="submit" class="button">Save score</button></form></section><section class="panel"><h2>Across the ten weeks</h2>${chart(checks, e)}</section></div><section class="panel"><h2>Recorded checks</h2>${checks.length ? table(['Week', 'Score', 'Note'], checks.map(check => `<tr><td>Week ${e(check.week)}</td><td>${e(check.score)} / 21${check.score < 12 ? '<br><span class="badge">Re-teach</span>' : ''}</td><td>${e(check.note || '—')}</td></tr>`)) : empty('Nothing recorded yet.', 'Choose a week and enter its paper score.')}</section>`);
    const loadScore = () => { const found = checks.find(c => Number(c.week) === Number(document.getElementById('check-week').value)); document.getElementById('score').value = found?.score ?? ''; document.getElementById('check-note').value = found?.note || ''; };
    document.getElementById('check-week').addEventListener('change', loadScore); loadScore();
    bindForm('check-form', async fd => { await write('checks', { week: Number(fd.get('week')), score: Number(fd.get('score')), note: fd.get('note') }); await reload(); }, 'Paper score saved.');
    return;
  }

  if (route === '/t/assign') {
    const data = await api(endpoint('assignments'));
    const skills = skillList(data.skills);
    render('Practice tasks', `<p class="page-intro">Choose topics for the daily questions. These questions count toward the daily goal; they do not add another requirement.</p><section class="panel"><h2>Set a daily focus</h2><p class="section-description">Choose a skill and the dates it should be part of the daily set.</p><form id="assignment-form"><div class="form-grid assignment-fields"><div class="field"><label for="assignment-skill">Skill</label><select id="assignment-skill" name="skill">${skills.map(s => `<option value="${e(s.id)}">${e(s.name)}</option>`).join('')}</select></div>${field(e, 'count', 'Questions per day', 5, 'type="number" min="1" max="100" required')}${field(e, 'startDate', 'First date', '', 'type="date" required')}${field(e, 'endDate', 'Last date', '', 'type="date" required')}</div>${errorBox}<button class="button" type="submit">Assign practice</button></form></section><section class="panel"><h2>Assigned practice</h2>${data.assignments?.length ? table(['Skill', 'Per day', 'Dates', ''], data.assignments.map(a => `<tr><td>${e(a.name || skills.find(s => s.id === a.skill)?.name || a.skill)}</td><td>${numeric(a.count)}</td><td class="date-cell">${e(dateLabel(a.startDate || a.start_date))} – ${e(dateLabel(a.endDate || a.end_date))}</td><td><button class="button secondary small" data-remove-assignment="${e(a.id)}">Remove</button></td></tr>`)) : empty('No assignments yet.', 'Set a task to revisit a skill or practice a new topic you have taught.')}</section>`);
    bindForm('assignment-form', async fd => { await write('assignments', { skill: fd.get('skill'), count: Number(fd.get('count')), startDate: fd.get('startDate'), endDate: fd.get('endDate') }); await reload(); }, 'Practice assigned.');
    document.querySelectorAll('[data-remove-assignment]').forEach(button => button.addEventListener('click', () => action(button, async () => { await write(`assignments/${encodeURIComponent(button.dataset.removeAssignment)}`, {}, 'DELETE'); await reload(); })));
    return;
  }

  if (route === '/t/rewards') {
    const data = await api(endpoint('rewards'));
    if (!isCurrentView()) return;
    const prizes = data.prizes || [], requests = data.requests || [];
    const active = data.program || {}, pending = data.pendingSettings || active.pendingSettings || {};
    const rules = { dailyTarget: active.dailyTarget ?? 20, bonusFirst: active.bonusFirst ?? 15, bonusStep: active.bonusStep ?? 10 };
    const editing = { ...rules, ...pending }, effectiveDate = data.effectiveDate || active.effectiveDate;
    const first = Number(rules.dailyTarget) + Number(rules.bonusFirst);
    const awaiting = requests.filter(request => ['pending', 'requested', 'approved'].includes(request.status));
    const completed = requests.filter(request => !['pending', 'requested', 'approved'].includes(request.status));
    const requestRow = request => `<article class="request-row"><div><h3>${e(requestName(request))}</h3><p>${numeric(request.cost)} points · ${e(statusName(request.status))}</p></div><div class="form-actions">${['pending', 'requested'].includes(request.status) ? `<button class="button" data-request="${e(request.id)}" data-action="approve">Approve</button><button class="button secondary" data-request="${e(request.id)}" data-action="decline">Decline</button>` : request.status === 'approved' ? `<button class="button" data-request="${e(request.id)}" data-action="given">Give prize &amp; spend ${numeric(request.cost)} points</button>` : ''}</div></article>`;
    render('Points & rewards', `<p class="page-intro">See how points are earned, change the rules and manage prizes for ${e(selected.name)}.</p>
      <section class="teacher-rewards-summary" aria-label="Current points"><div><span class="metric-label">Available to spend</span><strong>${numeric(data.points)} <small>points</small></strong><p>Points stay saved until a prize is given.</p></div><div><span class="metric-label">Next point today</span><strong>${numeric(data.nextPoint?.remaining)} <small>questions away</small></strong><p>${numeric(data.nextPoint?.answered)} answered today · next point at ${numeric(data.nextPoint?.target)}</p></div></section>
      <section class="panel teacher-points-rules" aria-labelledby="points-rules-title"><div class="section-heading"><div><p class="eyebrow">Active today</p><h2 id="points-rules-title">How points work</h2></div><span class="learning-point-token" aria-hidden="true">★</span></div><ol class="points-rule-steps"><li><strong>${numeric(rules.dailyTarget)} daily questions</strong><span>Complete today’s required goal.</span></li><li><strong>${numeric(rules.bonusFirst)} extra questions</strong><span>Earn the first point at ${numeric(first)} total answers today.</span></li><li><strong>Then ${numeric(rules.bonusStep)} per point</strong><span>The next points are at ${numeric(first + Number(rules.bonusStep))} and ${numeric(first + Number(rules.bonusStep) * 2)} total answers.</span></li></ol><p class="points-overlap-note">Extra answers also reduce earlier overdue work. <strong>Catch-up answers can earn points too.</strong> Using hints or getting an answer wrong does not subtract points. Each question counts once.</p><p class="small">The daily count starts again each day. Saved points do not reset.</p>
      <details class="reward-settings-disclosure teacher-disclosure" ${effectiveDate ? 'open' : ''}><summary><span>Change daily goal & point rules</span><small>Changes start tomorrow</small></summary><div class="disclosure-content">${effectiveDate ? `<p class="notice-inline">Saved changes start ${e(dateLabel(effectiveDate))}. Today still uses the rules above.</p>` : '<p>Choose the workload and point thresholds. Earlier answers and points stay unchanged.</p>'}<form id="program-form"><div class="form-grid">${field(e, 'dailyTarget', 'Required questions each day', editing.dailyTarget, 'type="number" min="1" max="100" step="1" required')}${field(e, 'bonusFirst', 'Extra questions for the first point', editing.bonusFirst, 'type="number" min="1" max="100" step="1" required')}${field(e, 'bonusStep', 'Questions for each later point', editing.bonusStep, 'type="number" min="1" max="100" step="1" required')}</div><output id="points-rule-example" class="points-rule-example" aria-live="polite" for="dailyTarget bonusFirst bonusStep"></output>${errorBox}<button class="button" type="submit">Save rules for tomorrow</button></form></div></details></section>
      <section class="panel"><div class="section-heading"><h2>Prize requests</h2><span class="badge">${numeric(awaiting.length)} waiting</span></div><p>Approve an agreed prize first. When you give it, its cost is taken from the saved balance.</p>${awaiting.length ? `<div class="request-list">${awaiting.map(requestRow).join('')}</div>` : empty('No requests waiting.', 'New student requests will appear here.')} ${completed.length ? `<details class="reward-history-disclosure"><summary>Past requests (${numeric(completed.length)})</summary><div class="request-list">${completed.map(requestRow).join('')}</div></details>` : ''}</section>
      <section class="panel reward-catalog"><div class="section-heading"><div><h2>Prizes</h2><p>Set a point cost and choose which prizes the student can request.</p></div></div>${prizes.length ? `<div class="prize-editor-list">${prizes.map(prize => `<details class="prize-editor-disclosure"><summary><span><strong>${e(prize.name)}</strong><small>${prize.active ? 'Available' : 'Hidden'}</small></span><span>${numeric(prize.cost)} points · Edit</span></summary><form class="prize-editor" data-prize-id="${e(prize.id)}"><div class="form-grid"><div class="field"><label>Prize name<input name="name" value="${e(prize.name)}" maxlength="80" required></label></div><div class="field"><label>Cost in points<input name="cost" type="number" min="1" max="100000" value="${e(prize.cost)}" required></label></div><div class="field"><label>Optional note<input name="note" value="${e(prize.note || '')}" maxlength="500"></label></div></div><label class="check-label"><input name="active" type="checkbox" ${prize.active ? 'checked' : ''}> Available to request</label>${errorBox}<button class="button secondary" type="submit">Save prize</button></form></details>`).join('')}</div>` : empty('Add the first prize.', 'Choose something the student would like to work toward.')}
      <details class="teacher-disclosure reward-add-prize"><summary><span>Add a prize</span><small>Name, cost & optional note</small></summary><div class="disclosure-content"><form id="prize-form">${field(e, 'prize-name', 'Prize name', '', 'maxlength="80" required')}${field(e, 'prize-cost', 'Cost in points', 5, 'type="number" min="1" max="100000" required')}<div class="field"><label for="prize-note">Optional note</label><textarea id="prize-note" name="note" rows="2" maxlength="500"></textarea></div>${errorBox}<button class="button" type="submit">Add prize</button></form></div></details></section>
      <div class="reward-secondary-grid"><details class="teacher-disclosure reward-adjust-points"><summary><span>Adjust the balance</span><small>Add or remove points with a reason</small></summary><div class="disclosure-content"><form id="points-form">${field(e, 'amount', 'Points to add or remove', '', 'type="number" min="-100000" max="100000" step="1" required')}<p class="field-help">For example, 3 adds three points. −3 removes three points.</p><div class="field"><label for="points-note">Reason</label><textarea id="points-note" name="note" rows="2" maxlength="200" required></textarea></div>${errorBox}<button class="button secondary" type="submit">Save adjustment</button></form></div></details>
      <details class="teacher-disclosure reward-history-disclosure"><summary><span>Points history</span><small>${numeric(data.history?.length)} recorded changes</small></summary><div class="disclosure-content">${data.history?.length ? table(['Date', 'Change', 'Reason'], data.history.map(row => `<tr><td>${e(dateLabel(row.date || row.createdAt || row.created_at))}</td><td>${Number(row.amount) > 0 ? '+' : ''}${numeric(row.amount)}</td><td>${e(row.note || row.reason || row.kind)}</td></tr>`)) : empty('No points recorded yet.')}</div></details></div>`);
    const example = document.getElementById('points-rule-example');
    const updateExample = () => {
      const values = ['dailyTarget', 'bonusFirst', 'bonusStep'].map(id => Number(document.getElementById(id).value));
      if (values.some(value => !Number.isInteger(value) || value < 1 || value > 100)) { example.textContent = 'Enter a whole number from 1 to 100 in each field.'; return; }
      const [daily, bonus, step] = values, firstPoint = daily + bonus;
      example.textContent = `With these rules: ${daily} required questions each day. Earn points at ${firstPoint}, ${firstPoint + step} and ${firstPoint + step * 2} total answers in a day.`;
    };
    document.getElementById('program-form').addEventListener('input', updateExample); updateExample();
    bindForm('program-form', async fd => { await write('settings', { dailyTarget: Number(fd.get('dailyTarget')), bonusFirst: Number(fd.get('bonusFirst')), bonusStep: Number(fd.get('bonusStep')) }, 'PATCH'); await reload(); }, 'Practice rules saved for tomorrow.');
    bindForm('prize-form', async fd => { await write('prizes', { name: fd.get('prize-name'), cost: Number(fd.get('prize-cost')), note: fd.get('note') }); await reload(); }, 'Prize added.');
    const pointsRequestId = crypto.randomUUID();
    bindForm('points-form', async fd => { await write('points', { amount: Number(fd.get('amount')), note: fd.get('note'), requestId: pointsRequestId }); await reload(); }, 'Points adjusted.');
    document.querySelectorAll('[data-request]').forEach(button => button.addEventListener('click', () => action(button, async () => { await write(`requests/${encodeURIComponent(button.dataset.request)}`, { action: button.dataset.action }); await reload(); })));
    document.querySelectorAll('[data-prize-id]').forEach((form, index) => { form.id = `edit-prize-${index}`; bindForm(form.id, async fd => { await write(`prizes/${encodeURIComponent(form.dataset.prizeId)}`, { name: fd.get('name'), cost: Number(fd.get('cost')), note: fd.get('note'), active: fd.get('active') === 'on' }, 'PATCH'); await reload(); }, 'Prize saved.'); });
    return;
  }

  if (route === '/t/questions') {
    const skill = current.searchParams.get('skill');
    let data = await api(endpoint('questions', skill ? { skill } : {}));
    const skills = skillList(data.skills);
    if (!skill && !data.skill && skills.length) data = await api(endpoint('questions', { skill: skills[0].id }));
    render('Question samples', `<p class="page-intro">Preview ten generated questions for a skill. Flagging a template pauses it for every student until it is fixed.</p><section class="panel"><div class="field"><label for="question-skill">Skill</label><select id="question-skill">${skills.map(s => `<option value="${e(s.id)}" ${s.id === (data.skill || skill) ? 'selected' : ''}>${e(s.name)}</option>`).join('')}</select></div><p class="muted">${numeric(typeof data.servedCounts === 'object' && !Array.isArray(data.servedCounts) ? data.servedCounts[data.skill || skill] : (data.servedCounts || []).find(s => s.skill === (data.skill || skill))?.count)} questions served for this skill.</p></section><div class="question-preview-list">${(data.questions || []).map((question, index) => `<article class="panel question-preview"><div class="section-heading"><h2>Sample ${index + 1}</h2><span class="badge">${e(question.templateId)} · Level ${e(question.level || question.difficulty || '—')}</span></div><div class="question-prompt">${mathMarkup(question.prompt || question.plainPrompt || '', true)}</div>${question.svg ? `<div class="question-diagram">${question.svg}</div>` : ''}${question.choices?.length ? `<ol>${question.choices.map(choice => `<li>${mathMarkup(choice.label, true)}</li>`).join('')}</ol>` : ''}<details><summary>Answer and worked steps</summary><p class="answer-value">${mathMarkup(question.answer)}</p><ol class="solution">${(question.solution || []).map(step => `<li>${mathMarkup(step, true)}</li>`).join('')}</ol></details><details class="question-report"><summary>Report a problem</summary><form id="flag-${index}" data-template="${e(question.templateId)}"><div class="field"><label for="flag-reason-${index}">What needs fixing?</label><input id="flag-reason-${index}" name="reason" maxlength="500" required></div>${errorBox}<button class="button secondary" type="submit">Flag template</button></form></details></article>`).join('')}</div><section class="panel"><h2>Flagged templates</h2>${data.flags?.length ? `<ul class="flag-list">${data.flags.map(flag => `<li><strong>${e(flag.templateId || flag.template_id)}</strong><p>${e(flag.reason)}</p><p>${flag.resolvedAt || flag.resolved_at ? 'Resolved' : 'Paused: this template is not being served.'}</p>${!flag.resolvedAt && !flag.resolved_at ? `<button class="button secondary" data-resolve-flag="${e(flag.id)}">Mark fixed and resume</button>` : ''}</li>`).join('')}</ul>` : empty('No flagged templates.')}</section>`);
    document.getElementById('question-skill').addEventListener('change', event => navigate(`/t/questions?skill=${encodeURIComponent(event.target.value)}`));
    document.querySelectorAll('[data-template]').forEach(form => bindForm(form.id, async fd => { await write('flags', { templateId: form.dataset.template, reason: fd.get('reason') }); await reload(); }, 'Template paused.'));
    document.querySelectorAll('[data-resolve-flag]').forEach(button => button.addEventListener('click', () => action(button, async () => { await write(`flags/${encodeURIComponent(button.dataset.resolveFlag)}`, { resolved: true }, 'PATCH'); await reload(); })));
    return;
  }

  if (route === '/t/settings') {
    const data = await api(endpoint('settings'));
    const aiSettings = await api('/v2/teacher/ai-settings').catch(() => null);
    const program = { ...(data.program || {}), ...(data.pendingSettings || {}) };
    const accounts = data.accounts || [];
    render('Settings', `<p class="page-intro">Manage accounts, helper access and backups. Daily goals and point rules are in Points & rewards.</p><div class="grid-2"><section class="panel"><h2>Create an account</h2><form id="account-form">${field(e, 'account-name', 'First name or nickname', '', 'maxlength="32" required')}${field(e, 'username', 'Username', '', 'autocomplete="off" autocapitalize="none" minlength="2" maxlength="24" required')}<div class="field"><label for="account-role">Role</label><select id="account-role" name="role"><option value="student">Student</option><option value="teacher">Teacher</option></select></div>${field(e, 'account-password', 'Password', '', 'type="password" autocomplete="new-password" minlength="4" maxlength="72" required')}<p class="field-help" id="account-password-help">Student passwords need at least 4 characters.</p>${errorBox}<button class="button" type="submit">Create account</button></form></section><section class="panel settings-shortcuts"><h2>Practice & rewards</h2><p>Change the daily goal and how extra answers earn points.</p>${link('/t/rewards','Open points & rewards','button secondary')}<h2>Curriculum & dates</h2><p>Download lesson materials or move a teaching week.</p>${link('/t/plan','Open curriculum','button secondary')}</section></div><section class="panel"><h2>Accounts and passwords</h2><div class="account-list">${accounts.map((account, index) => `<article class="account-row"><div class="section-heading"><div><h3>${e(account.name)}</h3><p>${e(account.username)} · ${e(account.role === 'parent' ? 'teacher' : account.role)}</p></div></div><details><summary>Reset password</summary><form id="reset-${index}" data-account="${e(account.id)}"><div class="field"><label for="reset-password-${index}">New password<input id="reset-password-${index}" name="password" type="password" autocomplete="new-password" minlength="${['teacher', 'parent'].includes(account.role) ? 8 : 4}" maxlength="72" required></label></div><p class="field-help">This signs the account out on its other devices.</p>${errorBox}<button class="button secondary" type="submit">Reset password</button></form></details></article>`).join('')}</div></section><section class="panel"><h2>Backups</h2><p>Save a private copy of accounts and progress, or download one to a trusted device.</p><div class="form-actions"><button id="save-backup" class="button secondary">Save a backup</button><button id="download-backup" class="button secondary">Download backup</button></div></section>`);
    const aiPanel = document.createElement('section');
    aiPanel.className = 'panel ai-settings-panel';
    aiPanel.innerHTML = `<p class="eyebrow">Optional tutoring</p><h2>Maths helper</h2><p>Students can ask about a step or get feedback on their reasoning. Numerical answers are checked by code; AI feedback never changes points. Hints and worked answers always remain available.</p>${aiSettings ? `<p class="notice-inline">${aiSettings.configured ? (aiSettings.enabled ? 'AI help is configured.' : 'AI help is paused.') : 'AI help needs a server API key in Sites settings.'} Model: ${e(aiSettings.model)}.</p><form id="ai-settings-form"><label class="check-label"><input type="checkbox" name="enabled" ${aiSettings.enabled ? 'checked' : ''}> Let students use AI help</label><div class="form-grid">${field(e, 'studentDailyLimit', 'AI replies per student each day', aiSettings.studentDailyLimit, 'type="number" min="1" max="100" required')}${field(e, 'globalDailyLimit', 'AI replies for the whole classroom each day', aiSettings.globalDailyLimit, 'type="number" min="1" max="1000" required')}</div><p class="field-help">These limits control paid AI requests, including requests that fail at the provider. Reopening a cached reply does not use another request.</p>${errorBox}<button class="button" type="submit">Save helper settings</button></form><h3>Today’s AI use</h3><p>${numeric(aiSettings.usage?.total)} of ${numeric(aiSettings.globalDailyLimit)} classroom requests used.</p>${aiSettings.usage?.students?.length ? table(['Student','Requests'], aiSettings.usage.students.map(row => `<tr><td>${e(row.name)}</td><td>${numeric(row.requests)}</td></tr>`)) : '<p class="muted">No AI requests today.</p>'}${aiSettings.lastIssue ? `<p class="field-help">Last AI issue: ${e(({provider_access:'Check the OpenAI key and project permissions.',provider_limit:'Check the OpenAI credit balance or request limits.',model_unavailable:'The selected model is unavailable.',connection_unavailable:'The AI connection timed out or could not be reached.',invalid_response:'The AI reply was incomplete, so worked help was shown.',provider_unavailable:'The AI provider was unavailable.'})[aiSettings.lastIssue.code] || 'Worked help was shown instead.')} Hints and worked answers are still available.</p>` : ''}` : '<p role="status">Helper settings could not load. Reopen Settings to try again.</p>'}`;
    document.querySelector('.teacher-chapter-content').append(aiPanel);
    bindForm('ai-settings-form', async fd => { await api('/v2/teacher/ai-settings', {enabled:fd.get('enabled') === 'on',studentDailyLimit:Number(fd.get('studentDailyLimit')),globalDailyLimit:Number(fd.get('globalDailyLimit'))}); await reload(); }, 'Maths helper settings saved.');
    document.getElementById('account-role').addEventListener('change', event => { const teacher = event.target.value === 'teacher'; document.getElementById('account-password').minLength = teacher ? 8 : 4; document.getElementById('account-password-help').textContent = `${teacher ? 'Teacher' : 'Student'} passwords need at least ${teacher ? 8 : 4} characters.`; });
    bindForm('account-form', async fd => { const result = await api('/teacher/accounts', { name: fd.get('account-name'), username: fd.get('username'), role: fd.get('role'), password: fd.get('account-password') }); if (result.user?.role === 'student') state.studentId = result.user.id; await reload(); }, 'Account created.');
    document.querySelectorAll('[data-account]').forEach(form => bindForm(form.id, async fd => { await api(`/teacher/accounts/${encodeURIComponent(form.dataset.account)}/password`, { password: fd.get('password') }); form.reset(); }, 'Password reset.'));
    document.getElementById('save-backup').addEventListener('click', event => action(event.currentTarget, async () => { await api('/teacher/backup', {}); tell('Private backup saved.'); }));
    document.getElementById('download-backup').addEventListener('click', event => action(event.currentTarget, async () => { const backup = await api('/teacher/backup'); const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `double-advanced-backup-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }));
    return;
  }
  navigate('/t/dashboard');
}
