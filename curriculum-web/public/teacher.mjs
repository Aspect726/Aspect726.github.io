const numeric = value => Number(value || 0).toLocaleString('en-US');
const percent = value => value === null || value === undefined ? '—' : `${Math.round(Number(value))}%`;
const dateLabel = value => value ? new Date(`${String(value).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '—';
const field = (e, name, label, value = '', options = '') => `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" value="${e(value)}" ${options}></div>`;
const errorBox = '<p class="form-error" role="alert" hidden></p>';
const empty = (title, text = '') => `<div class="empty-state"><h3>${title}</h3>${text ? `<p>${text}</p>` : ''}</div>`;
const skillList = data => Array.isArray(data) ? data.map(x => typeof x === 'string' ? { id: x, name: x } : { ...x, id: x.id || x.skill }) : Object.entries(data || {}).map(([id, value]) => ({ id, name: typeof value === 'string' ? value : value.name || value.title || id, ...typeof value === 'object' ? value : {} }));
const skillName = value => typeof value === 'string' ? value : value?.name || value?.skill || value?.id || '';
const requestName = request => request.name || request.prizeName || request.prize_name || 'Prize request';
const statusName = status => ({ pending: 'Requested', requested: 'Requested', approved: 'Approved', given: 'Given', declined: 'Declined' }[status] || status);
const levelName = value => ({ not_started: 'Not started', learning: 'Learning', practicing: 'Practicing', mastered: 'Mastered' }[value] || value || 'Not started');

function chart(checks, e) {
  const rows = [...checks].filter(row => Number.isFinite(Number(row.score))).sort((a, b) => a.week - b.week);
  if (!rows.length) return empty('No paper scores yet.', 'Enter a Friday check to start the trend.');
  const x = week => 36 + (Number(week) - 1) * 48;
  const y = score => 154 - Number(score) / 21 * 126;
  return `<figure class="score-chart"><svg viewBox="0 0 500 190" role="img" aria-label="Friday paper checks, out of 21"><path d="M36 28V154H480" stroke="var(--line)" fill="none"/><text x="8" y="32" font-size="12" fill="currentColor">21</text><text x="16" y="158" font-size="12" fill="currentColor">0</text><polyline points="${rows.map(row => `${x(row.week)},${y(row.score)}`).join(' ')}" fill="none" stroke="var(--teal)" stroke-width="3"/>${rows.map(row => `<circle cx="${x(row.week)}" cy="${y(row.score)}" r="4" fill="var(--brick)"><title>Week ${e(row.week)}: ${e(row.score)} out of 21</title></circle>`).join('')}${Array.from({ length: 10 }, (_, i) => `<text x="${x(i + 1)}" y="177" text-anchor="middle" font-size="12" fill="currentColor">${i + 1}</text>`).join('')}</svg><figcaption>Week number · scores out of 21</figcaption></figure>`;
}

export async function renderTeacher(path, ctx) {
  const { api, shell, navigate, escape: e, mathMarkup, tell, state } = ctx;
  const current = new URL(path, 'https://practice.invalid');
  const route = current.pathname;
  const list = await api('/v2/teacher/students');
  state.students = list.students || [];
  const detailId = route.match(/^\/t\/students\/([^/]+)$/)?.[1];
  if (detailId) state.studentId = decodeURIComponent(detailId);
  if (!state.students.some(s => s.id === state.studentId)) state.studentId = state.students[0]?.id || null;
  const selected = state.students.find(s => s.id === state.studentId);
  const query = (extra = {}) => new URLSearchParams({ ...(selected?.id ? { studentId: selected.id } : {}), ...extra }).toString();
  const endpoint = (name, extra = {}) => `/v2/teacher/${name}?${query(extra)}`;
  const write = (name, body, method) => api(`/v2/teacher/${name}?${query()}`, { ...body, ...(selected?.id ? { studentId: selected.id } : {}) }, method);
  const link = (href, text, className = 'text-link') => `<a class="${className}" href="${e(href)}" data-nav>${text}</a>`;
  const heading = (title, subtitle) => `<header class="page-heading"><div><p class="eyebrow">Teacher workspace${selected ? ` · ${e(selected.name)}` : ''}</p><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div></header>`;
  const render = (title, content) => shell(heading(title, '') + content, { title });
  const reload = () => navigate(path);
  const noStudent = () => render('Your students', empty('Create a student account to begin.', 'Their practice, skills and rewards will appear here.') + link('/t/settings', 'Create an account', 'button'));
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
  const table = (headers, rows) => `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  const mastery = skills => `<div class="mastery-grid">${skills.map(skill => `<a data-nav href="${detailPath}?section=skills&skill=${encodeURIComponent(skill.skill || skill.id)}" class="mastery-tile ${e(String(skill.level || skill.mastery || 'not_started').toLowerCase().replace(/ /g, '-'))}"><strong>${e(skill.name || skill.skill || skill.id)}</strong><span>${e(levelName(skill.mastery || skill.level))}</span><small>${numeric(skill.attempts)} answered · ${percent(skill.last10Accuracy ?? skill.accuracy)}</small></a>`).join('')}</div>`;
  if (!selected && !['/t/settings', '/t/questions'].includes(route)) return noStudent();

  if (route === '/t/students') return navigate(detailPath);

  if (route === '/t/dashboard') {
    const [data, notes] = await Promise.all([api(endpoint('dashboard')), api(endpoint('notes'))]);
    data.note = notes.notes?.find(note => Number(note.week) === Number(data.week?.week || data.week || 1))?.text || '';
    const days = data.days || [];
    render('This week', `<p class="page-intro">${e(data.student?.name || selected.name)}’s work, and what to teach next.</p><section class="panel"><div class="section-heading"><h2>Week ${e(data.week?.week || data.week || '')}</h2>${link(`${detailPath}?section=days`, 'All practice days')}</div><div class="week-strip">${days.map(day => `<a data-nav class="day-summary ${e(day.status || '')}" href="${detailPath}?section=days&date=${encodeURIComponent(day.date)}"><span>${e(dateLabel(day.date))}</span><strong>${numeric(day.answered)}</strong><small>answered</small><span>${percent(day.accuracy)} · ${numeric(day.minutes)} min</span>${day.status === 'missed' ? '<span class="badge">Missed</span>' : ''}</a>`).join('')}</div></section><div class="grid-2"><section class="panel"><h2>Needs attention</h2>${data.attention?.length ? `<ul class="attention-list">${data.attention.slice(0, 3).map(item => `<li>${link(item.href || detailPath, e(item.text))}</li>`).join('')}</ul>` : empty('Nothing needs attention yet.', 'New practice and prize requests will appear here.')}</section><section class="panel"><h2>Saturday prep</h2><h3>${e(data.saturdayPrep?.topic || 'The next lesson')}</h3><p>${e(data.saturdayPrep?.suggestion || 'Use the skill history to choose what to revisit together.')}</p>${link('/t/plan', 'Open the course plan')}</section></div><section class="panel"><div class="section-heading"><h2>Weakest skills this week</h2>${link(`${detailPath}?section=skills`, 'All skills')}</div>${data.weakSkills?.length ? table(['Skill', 'Correct', 'Accuracy'], data.weakSkills.map(skill => `<tr><td>${link(`${detailPath}?section=skills&skill=${encodeURIComponent(skill.skill)}`, e(skill.name || skill.skill))}</td><td>${numeric(skill.correct)} / ${numeric(skill.attempts)}</td><td>${percent(skill.accuracy)}</td></tr>`)) : empty('Not enough practice to rank skills.', 'A skill appears here after five answers this week.')}</section><div class="grid-2"><section class="panel reward-summary"><h2>Points and requests</h2><p class="big-number">${numeric(data.points)} <span>points available</span></p><p>${numeric(data.earnedThisWeek)} earned this week · ${(data.requests || []).filter(r => ['pending', 'requested', 'approved'].includes(r.status)).length} open requests</p>${link('/t/rewards', 'Manage rewards', 'button secondary')}</section><section class="panel"><h2>A note for this week</h2><form id="teacher-note"><label for="teacher-note-text">Shown on the student’s Today page</label><textarea id="teacher-note-text" name="text" rows="3" maxlength="1000">${e(data.note || '')}</textarea>${errorBox}<button class="button" type="submit">Save note</button></form></section></div>`);
    bindForm('teacher-note', async fd => { await write('notes', { week: Number(data.week?.week || data.week || 1), text: fd.get('text') }); }, 'Your note is saved.');
    return;
  }

  if (route.startsWith('/t/students/')) {
    const date = current.searchParams.get('date');
    const data = await api(endpoint(`students/${encodeURIComponent(state.studentId)}`, date ? { date } : {}));
    const section = current.searchParams.get('section') || 'overview';
    const sections = [['overview', 'Overview'], ['days', 'Days'], ['skills', 'Skills'], ['patterns', 'Mistake patterns']];
    const nav = `<nav class="section-nav" aria-label="Student detail sections">${sections.map(([id, title]) => link(`${detailPath}?section=${id}`, title, section === id ? 'section-link active' : 'section-link')).join('')}</nav>`;
    let content = '';
    if (section === 'overview') {
      const summary = data.summary || {};
      content = `<div class="summary-grid"><div class="summary-stat"><span>Current streak</span><strong>${numeric(summary.streak)} days</strong><small>Best: ${numeric(summary.bestStreak)}</small></div><div class="summary-stat"><span>Questions answered</span><strong>${numeric(summary.answered)}</strong></div><div class="summary-stat"><span>Overall accuracy</span><strong>${percent(summary.accuracy)}</strong></div></div><section class="panel"><h2>Skill mastery</h2>${mastery(data.skills || [])}</section>`;
    } else if (section === 'days') {
      if (date) {
        const answers = data.attempts || [];
        content = `<section class="panel"><div class="section-heading"><h2>${e(dateLabel(date))}: actual answers</h2>${link(`${detailPath}?section=days`, 'All days')}</div>${answers.length ? `<ol class="answer-history">${answers.map(answer => `<li><div class="section-heading"><span class="badge">${e(answer.skill)}</span><span>${e(answer.source || 'practice')} · ${numeric(answer.seconds ?? Number(answer.elapsedMs || 0) / 1000)} sec</span></div><div class="question-prompt">${mathMarkup(answer.questionText || answer.question_text || answer.prompt || '', true)}</div><dl class="answer-comparison"><div><dt>Student’s answer</dt><dd>${mathMarkup(answer.givenAnswer ?? answer.given_answer ?? answer.answer ?? '')}</dd></div><div><dt>Correct answer</dt><dd>${mathMarkup(answer.correctAnswer ?? answer.correct_answer ?? answer.rightAnswer ?? '')}</dd></div></dl><p class="${answer.correct || answer.isCorrect || answer.is_correct ? 'correct' : 'miss'}">${answer.correct || answer.isCorrect || answer.is_correct ? 'Correct' : 'Not yet secure'}${answer.mistakeLabel ? ` · ${e(answer.mistakeLabel)}` : ''}</p></li>`).join('')}</ol>` : empty('No answers on this day.', 'Opening a question does not count as an answer.')}</section>`;
      } else content = `<section class="panel"><h2>Practice days</h2>${data.days?.length ? table(['Date', 'Answered', 'Correct', 'Accuracy', 'Minutes', 'Points earned'], data.days.map(day => `<tr><td>${dayLink(day.date, e(dateLabel(day.date)))}</td><td>${numeric(day.answered)}</td><td>${numeric(day.correct)}</td><td>${percent(day.accuracy)}</td><td>${numeric(day.minutes)}</td><td>${numeric(day.points ?? day.pointsEarned)}</td></tr>`)) : empty('No answers yet.', 'Each practice day will appear here with a link to every answer.')}</section>`;
    } else if (section === 'skills') {
      const chosen = current.searchParams.get('skill');
      const skills = [...(data.skills || [])];
      const sort = current.searchParams.get('sort') || 'week';
      skills.sort((a, b) => sort === 'accuracy' ? (a.last10Accuracy ?? a.accuracy ?? -1) - (b.last10Accuracy ?? b.accuracy ?? -1) : sort === 'attempts' ? Number(b.attempts) - Number(a.attempts) : Number(a.week || 0) - Number(b.week || 0));
      content = `<section class="panel"><div class="section-heading"><h2>Skills</h2><label>Sort by <select id="skill-sort"><option value="week" ${sort === 'week' ? 'selected' : ''}>Week</option><option value="accuracy" ${sort === 'accuracy' ? 'selected' : ''}>Lowest accuracy</option><option value="attempts" ${sort === 'attempts' ? 'selected' : ''}>Most practice</option></select></label></div>${table(['Skill', 'Week', 'Attempts', 'Last 10', 'Level', 'Last practiced'], skills.map(skill => `<tr><td>${link(`${detailPath}?section=skills&skill=${encodeURIComponent(skill.skill || skill.id)}&sort=${sort}`, e(skill.name || skill.skill || skill.id))}</td><td>${e(skill.week || '—')}</td><td>${numeric(skill.attempts)}</td><td>${percent(skill.last10Accuracy ?? skill.accuracy)}</td><td>${e(levelName(skill.mastery || skill.level))}</td><td>${e(dateLabel(skill.lastPracticed || skill.lastDate))}</td></tr>`))}</section>`;
      if (chosen) content += `<section class="panel"><h2>Answers for ${e(skills.find(s => (s.skill || s.id) === chosen)?.name || chosen)}</h2>${(data.attempts || []).some(a => a.skill === chosen) ? table(['Question', 'Student answer', 'Correct answer', 'Date'], data.attempts.filter(a => a.skill === chosen).map(a => `<tr><td>${mathMarkup(a.questionText || a.question_text || a.prompt || '', true)}</td><td>${mathMarkup(a.givenAnswer ?? a.given_answer ?? a.answer ?? '')}</td><td>${mathMarkup(a.correctAnswer ?? a.correct_answer ?? a.rightAnswer ?? '')}</td><td>${e(dateLabel(a.date || a.createdAt))}</td></tr>`)) : empty('No answers for this skill yet.')}</section>`;
    } else {
      content = `<section class="panel"><h2>Repeated mistake patterns</h2><p>Only known mistake patterns from the question templates are named here.</p>${data.mistakes?.length ? table(['Skill', 'Known pattern', 'Times seen'], data.mistakes.map(m => `<tr><td>${e(m.name || m.skill)}</td><td>${e(m.label)}</td><td>${numeric(m.count)}</td></tr>`)) : empty('No repeated patterns yet.', 'This fills in when the same known mistake appears again.')}</section>`;
    }
    render(data.student?.name || selected.name, nav + content);
    document.getElementById('skill-sort')?.addEventListener('change', event => navigate(`${detailPath}?section=skills&sort=${event.target.value}`));
    return;
  }

  if (route === '/t/plan') {
    const data = await api(endpoint('plan'));
    render('Course plan', `<p class="page-intro">A ten-week path from the supplied plan. Moving a week also moves every week after it.</p><section class="panel">${table(['Week', 'Dates', 'Topic and skills', 'Status', 'Move'], (data.weeks || []).map(week => `<tr><td>${e(week.week)}</td><td>${e(dateLabel(week.startDate))}–${e(dateLabel(week.endDate))}</td><td><strong>${e(week.topic)}</strong><p class="small muted">${e((week.skills || []).map(skillName).join(' · '))}</p></td><td>${e(week.status)}</td><td><button class="button secondary small" data-shift="${e(week.week)}">Move back 1 week</button></td></tr>`))}</section>`);
    document.querySelectorAll('[data-shift]').forEach(button => button.addEventListener('click', () => action(button, async () => { await write('plan', { week: Number(button.dataset.shift), days: 7 }); tell('This week and the later weeks moved back seven days.'); await reload(); })));
    return;
  }

  if (route === '/t/checks') {
    const data = await api(endpoint('checks'));
    const checks = data.checks || [];
    render('Weekly checks', `<p class="page-intro">Friday paper scores stay separate from online practice. A score below 12 suggests re-teaching before new content.</p><div class="grid-2"><section class="panel"><h2>Enter a paper score</h2><form id="check-form"><div class="field"><label for="check-week">Week</label><select id="check-week" name="week">${Array.from({ length: 10 }, (_, index) => `<option value="${index + 1}">Week ${index + 1}</option>`).join('')}</select></div>${field(e, 'score', 'Score out of 21', '', 'type="number" min="0" max="21" step="1" required')}<div class="field"><label for="check-note">Optional note</label><textarea id="check-note" name="note" rows="3" maxlength="1000"></textarea></div>${errorBox}<button type="submit" class="button">Save score</button></form></section><section class="panel"><h2>Across the ten weeks</h2>${chart(checks, e)}</section></div><section class="panel"><h2>Recorded checks</h2>${checks.length ? table(['Week', 'Score', 'Note'], checks.map(check => `<tr><td>Week ${e(check.week)}</td><td>${e(check.score)} / 21${check.score < 12 ? '<br><span class="badge">Re-teach</span>' : ''}</td><td>${e(check.note || '—')}</td></tr>`)) : empty('Nothing recorded yet.', 'Choose a week and enter its paper score.')}</section>`);
    const loadScore = () => { const found = checks.find(c => Number(c.week) === Number(document.getElementById('check-week').value)); document.getElementById('score').value = found?.score ?? ''; document.getElementById('check-note').value = found?.note || ''; };
    document.getElementById('check-week').addEventListener('change', loadScore); loadScore();
    bindForm('check-form', async fd => { await write('checks', { week: Number(fd.get('week')), score: Number(fd.get('score')), note: fd.get('note') }); await reload(); }, 'Paper score saved.');
    return;
  }

  if (route === '/t/assign') {
    const data = await api(endpoint('assignments'));
    const skills = skillList(data.skills);
    render('Assignments', `<p class="page-intro">Assigned questions go into the daily set first. They count toward the daily target.</p><section class="panel"><h2>Choose extra practice</h2><form id="assignment-form"><div class="form-grid"><div class="field"><label for="assignment-skill">Skill</label><select id="assignment-skill" name="skill">${skills.map(s => `<option value="${e(s.id)}">${e(s.name)}</option>`).join('')}</select></div>${field(e, 'count', 'Questions per day', 5, 'type="number" min="1" max="100" required')}${field(e, 'startDate', 'First date', '', 'type="date" required')}${field(e, 'endDate', 'Last date', '', 'type="date" required')}</div>${errorBox}<button class="button" type="submit">Assign practice</button></form></section><section class="panel"><h2>Assigned practice</h2>${data.assignments?.length ? table(['Skill', 'Per day', 'Dates', ''], data.assignments.map(a => `<tr><td>${e(a.name || skills.find(s => s.id === a.skill)?.name || a.skill)}</td><td>${numeric(a.count)}</td><td>${e(dateLabel(a.startDate || a.start_date))}–${e(dateLabel(a.endDate || a.end_date))}</td><td><button class="button secondary small" data-remove-assignment="${e(a.id)}">Remove</button></td></tr>`)) : empty('No assignments yet.', 'Use an assignment to revisit a skill or try something ahead.')}</section>`);
    bindForm('assignment-form', async fd => { await write('assignments', { skill: fd.get('skill'), count: Number(fd.get('count')), startDate: fd.get('startDate'), endDate: fd.get('endDate') }); await reload(); }, 'Practice assigned.');
    document.querySelectorAll('[data-remove-assignment]').forEach(button => button.addEventListener('click', () => action(button, async () => { await write(`assignments/${encodeURIComponent(button.dataset.removeAssignment)}`, {}, 'DELETE'); await reload(); })));
    return;
  }

  if (route === '/t/rewards') {
    const data = await api(endpoint('rewards'));
    const prizes = data.prizes || [];
    render('Rewards', `<div class="summary-grid"><div class="summary-stat"><span>Available balance</span><strong>${numeric(data.points)} points</strong></div><div class="summary-stat"><span>Next point</span><strong>${numeric(typeof data.nextPoint === 'object' ? data.nextPoint.remaining : data.nextPoint)} questions</strong></div></div><section class="panel"><h2>Prize requests</h2><p>Approve a request when it is agreed. Mark it given when the prize is handed over; that is when points are spent.</p>${data.requests?.length ? `<div class="request-list">${data.requests.map(request => `<article class="request-row"><div><h3>${e(requestName(request))}</h3><p>${numeric(request.cost)} points · ${e(statusName(request.status))}</p></div><div class="form-actions">${['pending', 'requested'].includes(request.status) ? `<button class="button" data-request="${e(request.id)}" data-action="approve">Approve</button><button class="button secondary" data-request="${e(request.id)}" data-action="decline">Decline</button>` : request.status === 'approved' ? `<button class="button" data-request="${e(request.id)}" data-action="given">Mark given</button>` : ''}</div></article>`).join('')}</div>` : empty('No prize requests yet.')}</section><div class="grid-2"><section class="panel"><h2>Add a prize</h2><form id="prize-form">${field(e, 'prize-name', 'Prize name', '', 'maxlength="80" required')}${field(e, 'prize-cost', 'Cost in points', 5, 'type="number" min="1" max="100000" required')}<div class="field"><label for="prize-note">Optional note</label><textarea id="prize-note" name="note" rows="2" maxlength="500"></textarea></div>${errorBox}<button class="button" type="submit">Add prize</button></form></section><section class="panel"><h2>Adjust points</h2><form id="points-form">${field(e, 'amount', 'Points to add or remove', '', 'type="number" min="-100000" max="100000" required')}<p class="field-help">Use a negative number to remove points.</p><div class="field"><label for="points-note">Reason</label><textarea id="points-note" name="note" rows="2" maxlength="200" required></textarea></div>${errorBox}<button class="button" type="submit">Save adjustment</button></form></section></div><section class="panel"><h2>Prize catalog</h2>${prizes.length ? `<div class="prize-editor-list">${prizes.map(prize => `<form class="prize-editor" data-prize-id="${e(prize.id)}"><div class="form-grid"><div class="field"><label>Prize name<input name="name" value="${e(prize.name)}" maxlength="80" required></label></div><div class="field"><label>Points<input name="cost" type="number" min="1" max="100000" value="${e(prize.cost)}" required></label></div><div class="field"><label>Note<input name="note" value="${e(prize.note || '')}" maxlength="500"></label></div></div><label class="check-label"><input name="active" type="checkbox" ${prize.active ? 'checked' : ''}> Available to request</label>${errorBox}<button class="button secondary" type="submit">Save prize</button></form>`).join('')}</div>` : empty('No prizes yet.', 'Add a prize and choose its point cost.')}</section><section class="panel"><h2>Points history</h2>${data.history?.length ? table(['Date', 'Change', 'Reason'], data.history.map(row => `<tr><td>${e(dateLabel(row.date || row.createdAt || row.created_at))}</td><td>${Number(row.amount) > 0 ? '+' : ''}${numeric(row.amount)}</td><td>${e(row.note || row.reason || row.kind)}</td></tr>`)) : empty('No points recorded yet.')}</section>`);
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
    render('Question bank', `<p class="page-intro">Preview ten generated questions for a skill. Flagging a template pauses it for every student until it is fixed.</p><section class="panel"><div class="field"><label for="question-skill">Skill</label><select id="question-skill">${skills.map(s => `<option value="${e(s.id)}" ${s.id === (data.skill || skill) ? 'selected' : ''}>${e(s.name)}</option>`).join('')}</select></div><p class="muted">${numeric(typeof data.servedCounts === 'object' && !Array.isArray(data.servedCounts) ? data.servedCounts[data.skill || skill] : (data.servedCounts || []).find(s => s.skill === (data.skill || skill))?.count)} questions served for this skill.</p></section><div class="question-preview-list">${(data.questions || []).map((question, index) => `<article class="panel question-preview"><div class="section-heading"><h2>Sample ${index + 1}</h2><span class="badge">${e(question.templateId)} · Level ${e(question.level || question.difficulty || '—')}</span></div><div class="question-prompt">${mathMarkup(question.prompt || question.plainPrompt || '', true)}</div>${question.svg ? `<div class="question-diagram">${question.svg}</div>` : ''}${question.choices?.length ? `<ol>${question.choices.map(choice => `<li>${mathMarkup(choice.label, true)}</li>`).join('')}</ol>` : ''}<details><summary>Answer and worked steps</summary><p class="answer-value">${mathMarkup(question.answer)}</p><ol class="solution">${(question.solution || []).map(step => `<li>${mathMarkup(step, true)}</li>`).join('')}</ol></details><form id="flag-${index}" data-template="${e(question.templateId)}"><div class="field"><label for="flag-reason-${index}">Report a problem with this template</label><input id="flag-reason-${index}" name="reason" maxlength="500" required></div>${errorBox}<button class="button secondary" type="submit">Flag template</button></form></article>`).join('')}</div><section class="panel"><h2>Flagged templates</h2>${data.flags?.length ? `<ul class="flag-list">${data.flags.map(flag => `<li><strong>${e(flag.templateId || flag.template_id)}</strong><p>${e(flag.reason)}</p><p>${flag.resolvedAt || flag.resolved_at ? 'Resolved' : 'Paused: this template is not being served.'}</p>${!flag.resolvedAt && !flag.resolved_at ? `<button class="button secondary" data-resolve-flag="${e(flag.id)}">Mark fixed and resume</button>` : ''}</li>`).join('')}</ul>` : empty('No flagged templates.')}</section>`);
    document.getElementById('question-skill').addEventListener('change', event => navigate(`/t/questions?skill=${encodeURIComponent(event.target.value)}`));
    document.querySelectorAll('[data-template]').forEach(form => bindForm(form.id, async fd => { await write('flags', { templateId: form.dataset.template, reason: fd.get('reason') }); await reload(); }, 'Template paused.'));
    document.querySelectorAll('[data-resolve-flag]').forEach(button => button.addEventListener('click', () => action(button, async () => { await write(`flags/${encodeURIComponent(button.dataset.resolveFlag)}`, { resolved: true }, 'PATCH'); await reload(); })));
    return;
  }

  if (route === '/t/settings') {
    const data = await api(endpoint('settings'));
    const program = { ...(data.program || {}), ...(data.pendingSettings || {}) };
    const accounts = data.accounts || [];
    render('Settings', `<div class="grid-2"><section class="panel"><h2>Create an account</h2><form id="account-form">${field(e, 'account-name', 'First name or nickname', '', 'maxlength="32" required')}${field(e, 'username', 'Username', '', 'autocomplete="off" autocapitalize="none" minlength="2" maxlength="24" required')}<div class="field"><label for="account-role">Role</label><select id="account-role" name="role"><option value="student">Student</option><option value="teacher">Teacher</option></select></div>${field(e, 'account-password', 'Password', '', 'type="password" autocomplete="new-password" minlength="4" maxlength="72" required')}<p class="field-help" id="account-password-help">Student passwords need at least 4 characters.</p>${errorBox}<button class="button" type="submit">Create account</button></form></section><section class="panel"><h2>Daily target and bonus points</h2>${selected ? `<p>For ${e(selected.name)}. Changes start tomorrow and do not alter earlier points.</p>${data.effectiveDate ? `<p class="notice-inline">Pending changes start ${e(dateLabel(data.effectiveDate))}.</p>` : ''}<form id="program-form">${field(e, 'dailyTarget', 'Required answers each day', program.dailyTarget ?? program.daily_target ?? 20, 'type="number" min="1" max="100" required')}${field(e, 'bonusFirst', 'Extra answers for the first bonus point', program.bonusFirst ?? program.bonus_first ?? 15, 'type="number" min="1" max="100" required')}${field(e, 'bonusStep', 'Extra answers for every later point', program.bonusStep ?? program.bonus_step ?? 10, 'type="number" min="1" max="100" required')}${errorBox}<button class="button" type="submit">Save for tomorrow</button></form>` : empty('Create a student account first.', 'Then choose their daily practice rules.')}</section></div><section class="panel"><h2>Accounts and passwords</h2><div class="account-list">${accounts.map((account, index) => `<article class="account-row"><div class="section-heading"><div><h3>${e(account.name)}</h3><p>${e(account.username)} · ${e(account.role === 'parent' ? 'teacher' : account.role)}</p></div></div><details><summary>Reset password</summary><form id="reset-${index}" data-account="${e(account.id)}"><div class="field"><label for="reset-password-${index}">New password<input id="reset-password-${index}" name="password" type="password" autocomplete="new-password" minlength="${['teacher', 'parent'].includes(account.role) ? 8 : 4}" maxlength="72" required></label></div><p class="field-help">This signs the account out on its other devices.</p>${errorBox}<button class="button secondary" type="submit">Reset password</button></form></details></article>`).join('')}</div></section><section class="panel"><h2>Backups</h2><p>Save a private copy of accounts and progress, or download one to a trusted device.</p><div class="form-actions"><button id="save-backup" class="button secondary">Save a backup</button><button id="download-backup" class="button secondary">Download backup</button></div></section>`);
    document.getElementById('account-role').addEventListener('change', event => { const teacher = event.target.value === 'teacher'; document.getElementById('account-password').minLength = teacher ? 8 : 4; document.getElementById('account-password-help').textContent = `${teacher ? 'Teacher' : 'Student'} passwords need at least ${teacher ? 8 : 4} characters.`; });
    bindForm('account-form', async fd => { const result = await api('/teacher/accounts', { name: fd.get('account-name'), username: fd.get('username'), role: fd.get('role'), password: fd.get('account-password') }); if (result.user?.role === 'student') state.studentId = result.user.id; await reload(); }, 'Account created.');
    bindForm('program-form', async fd => { await write('settings', { dailyTarget: Number(fd.get('dailyTarget')), bonusFirst: Number(fd.get('bonusFirst')), bonusStep: Number(fd.get('bonusStep')) }, 'PATCH'); await reload(); }, 'Practice rules saved for tomorrow.');
    document.querySelectorAll('[data-account]').forEach(form => bindForm(form.id, async fd => { await api(`/teacher/accounts/${encodeURIComponent(form.dataset.account)}/password`, { password: fd.get('password') }); form.reset(); }, 'Password reset.'));
    document.getElementById('save-backup').addEventListener('click', event => action(event.currentTarget, async () => { await api('/teacher/backup', {}); tell('Private backup saved.'); }));
    document.getElementById('download-backup').addEventListener('click', event => action(event.currentTarget, async () => { const backup = await api('/teacher/backup'); const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `double-advanced-backup-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }));
    return;
  }
  navigate('/t/dashboard');
}
