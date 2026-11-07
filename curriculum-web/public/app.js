const app = document.querySelector('#app');
const notice = document.querySelector('#notice');
const state = { user: null, setupRequired: false, today: null, run: null, page: '', routeVersion: 0, questionStarted: 0, questionId: null, pendingAnswer: null, lastPoints: null, animatedRuns: new Set() };
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const number = value => Number(value || 0).toLocaleString('en-US');
const dateLabel = (value, options = {}) => value ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: String(value).length > 10 ? 'America/Los_Angeles' : 'UTC', ...options }).format(new Date(String(value).length > 10 ? value : `${value}T12:00:00Z`)) : '';
const timeLabel = value => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }).format(new Date(value)) : '';
const pointLabel = count => `${number(count)} ${Number(count) === 1 ? 'point' : 'points'}`;
const minutes = value => Number(value) < 60000 ? `${Math.round(Number(value || 0) / 1000)} sec` : `${Math.round(Number(value) / 60000)} min`;
const field = (id, label, options = '') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${id}" ${options}></div>`;
const formError = '<p class="form-error" role="alert" hidden></p>';
const progress = (value, total) => `<div class="progress-track" role="progressbar" aria-label="Questions finished" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${Math.min(total, value)}"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, value / total * 100))}%"></div></div>`;
const checkMark = '<svg class="feedback-check" aria-hidden="true" viewBox="0 0 24 24"><path d="m4 12 5 5L20 6"></path></svg>';
let noticeTimer;

// Generated prompts may already contain MathML. Only convert ordinary text nodes;
// values supplied by a user are inserted as text, never interpreted as markup.
function mathMarkup(value, trusted = false) {
  const template = document.createElement('template');
  if (trusted) template.innerHTML = String(value ?? '');
  else template.content.append(document.createTextNode(String(value ?? '')));
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (!walker.currentNode.parentElement?.closest('math,svg,script,style')) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const text = node.nodeValue;
    const pattern = /(?<![\w/])([−-]?\d+)\s+(\d+)\/(\d+)(?![\d/])|(?<![\w/])([−-]?\d+)\/(\d+)(?![\d/])/g;
    let match, previous = 0;
    const fragment = document.createDocumentFragment();
    while ((match = pattern.exec(text))) {
      fragment.append(document.createTextNode(text.slice(previous, match.index)));
      const math = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'math');
      if (match[1] !== undefined) {
        const whole = document.createElementNS(math.namespaceURI, 'mn');
        whole.textContent = match[1].replace('-', '−');
        math.append(whole);
        const space = document.createElementNS(math.namespaceURI, 'mspace');
        space.setAttribute('width', '0.15em');
        math.append(space);
      }
      const fraction = document.createElementNS(math.namespaceURI, 'mfrac');
      for (const value of match[1] !== undefined ? [match[2], match[3]] : [match[4], match[5]]) {
        const number = document.createElementNS(math.namespaceURI, 'mn');
        number.textContent = value.replace('-', '−');
        fraction.append(number);
      }
      math.append(fraction);
      fragment.append(math);
      previous = pattern.lastIndex;
    }
    if (previous) { fragment.append(document.createTextNode(text.slice(previous))); node.replaceWith(fragment); }
  }
  return template.innerHTML;
}

function tell(message, error = false) {
  clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.className = `notice${error ? ' error' : ''}`;
  notice.hidden = false;
  noticeTimer = setTimeout(() => { notice.hidden = true; }, error ? 8000 : 4500);
}

async function api(path, body, method = body === undefined ? 'GET' : 'POST') {
  let response;
  try {
    response = await fetch(`/api${path}`, { method, credentials: 'same-origin', cache: 'no-store', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  } catch {
    throw new Error('Your connection stopped. Try again.');
  }
  const result = await response.json().catch(() => ({ error: 'The site could not read that response. Try again.' }));
  if (!response.ok) {
    if (response.status === 401 && state.user) {
      state.user = null;
      state.run = null;
      state.pendingAnswer = null;
      state.routeVersion++;
      renderAuth('Your session ended. Sign in again.');
    }
    throw Object.assign(new Error(result.error || 'That could not be saved. Try again.'), { status: response.status });
  }
  return result;
}

function navigate(path) {
  if (location.hash === `#${path}`) return route();
  location.hash = path;
}

function shell(content, { page = 'today', parent = false, question = false, done = false } = {}) {
  state.page = page;
  document.body.className = `${question ? 'question-page' : done ? 'done-page' : ''}`;
  const links = parent
    ? [['parent/overview', 'Overview'], ['parent/skills', 'Skills'], ['parent/prizes', 'Prizes and points'], ['parent/settings', 'Settings']]
    : [['today', 'Today'], ['weeks', 'My weeks'], ['prizes', 'Prizes']];
  const home = parent ? 'parent/overview' : 'today';
  app.innerHTML = `<header class="app-header"><a class="wordmark" href="#${home}">Double Advanced</a><div class="header-end"><span class="user-name">${escape(state.user?.name)}</span><button class="signout" id="signout" type="button">Sign out</button></div></header>
    <nav class="main-nav" aria-label="Main navigation">${links.map(([href, label]) => `<a class="nav-link" href="#${href}" ${page === href ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
    <main id="main" class="${question ? 'question-content' : `main-content${parent ? ' parent-content' : ''}`}" tabindex="-1">${content}</main>`;
  document.querySelector('#signout').addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await api('/logout', {});
      state.user = null;
      state.run = null;
      state.today = null;
      state.pendingAnswer = null;
      state.routeVersion++;
      history.replaceState(null, '', location.pathname);
      renderAuth();
    } catch (error) { tell(error.message, true); button.disabled = false; }
  });
}

function renderAuth(message = '') {
  document.body.className = 'auth-page';
  const setup = state.setupRequired;
  app.innerHTML = `<main id="main" class="auth-wrap" tabindex="-1"><span class="wordmark">Double Advanced</span><section class="auth-panel" aria-labelledby="auth-title"><h1 id="auth-title">${setup ? 'Parent setup' : 'Sign in'}</h1>${setup ? '<p class="setup-copy">Create the first parent account. Use a first name or nickname.</p>' : ''}<form id="auth-form">
    ${setup ? field('name', 'First name or nickname', 'autocomplete="given-name" maxlength="32" required') : ''}
    ${field('username', 'Username', 'autocomplete="username" autocapitalize="none" spellcheck="false" minlength="2" maxlength="24" required')}
    ${field('password', 'Password', `type="password" autocomplete="${setup ? 'new-password' : 'current-password'}" ${setup ? 'minlength="8"' : ''} maxlength="72" required`)}
    ${setup ? '<p class="field-help">Use at least 8 characters for a parent password.</p>' : '<label class="check-label"><input name="remember" type="checkbox">Stay signed in on this device</label>'}
    <p class="form-error" role="alert" ${message ? '' : 'hidden'}>${escape(message)}</p>
    <button class="button wide" type="submit">${setup ? 'Create parent account' : 'Sign in'}</button></form></section></main>`;
  const form = document.querySelector('#auth-form');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    await submitForm(form, async () => {
      const result = await api(setup ? '/setup' : '/login', { username: data.get('username'), password: data.get('password'), ...(setup ? { name: data.get('name') } : { remember: data.get('remember') === 'on' }) });
      state.user = result.user;
      state.setupRequired = false;
      navigate(result.user.role === 'parent' ? (setup ? 'parent/settings' : 'parent/overview') : 'today');
    });
  });
}

async function submitForm(form, action, message) {
  if (form.dataset.saving === 'true') return;
  form.dataset.saving = 'true';
  const button = form.querySelector('[type=submit]');
  const errorElement = form.querySelector('.form-error');
  if (button) button.disabled = true;
  if (errorElement) errorElement.hidden = true;
  try { await action(); if (message) tell(message); }
  catch (error) {
    if (errorElement && document.contains(errorElement)) { errorElement.textContent = error.message; errorElement.hidden = false; }
    else tell(error.message, true);
  } finally { form.dataset.saving = 'false'; if (button && document.contains(button)) button.disabled = false; }
}

async function actionButton(button, action) {
  if (button.disabled) return;
  button.disabled = true;
  try { await action(); }
  catch (error) { tell(error.message, true); }
  finally { if (document.contains(button)) button.disabled = false; }
}

function pageTitle(title, subtitle = '') {
  return `<header class="page-head"><h1>${escape(title)}</h1>${subtitle ? `<p class="muted">${escape(subtitle)}</p>` : ''}</header>`;
}

function pointsPanel(data) {
  const prize = data.nextPrize;
  return `<div class="points-panel"><div><div class="point-value"><span class="point-dot" aria-hidden="true"></span>${number(data.points)}</div><span class="point-title">${Number(data.points) === 1 ? 'Bonus point' : 'Bonus points'}</span></div><div class="next-prize">${prize ? `<p class="label">Next prize</p><p><strong>${escape(prize.name)}</strong></p><p class="small">${prize.needed > 0 ? `${pointLabel(prize.needed)} to go` : 'You have enough points.'} <a href="#prizes">View prizes</a></p>` : '<p>Your parent can add prizes.</p><a class="small" href="#prizes">View your points</a>'}</div></div>`;
}

async function showToday(version) {
  const data = await api('/today');
  if (version !== state.routeVersion) return;
  state.today = data;
  state.lastPoints = data.points;
  if (data.run?.done) return showDone(data.run, data);
  const day = data.day;
  const completed = data.run?.completed || 0;
  const intro = day ? `Week ${day.week}, ${day.weekday}: ${day.title || day.topic}` : '';
  shell(`${pageTitle('Today', dateLabel(data.today, { weekday: 'long', year: 'numeric' }))}
    ${data.paused ? '<div class="pause-note"><p><strong>Practice is paused today.</strong></p><p>Your parent can turn it on in Settings.</p></div>' : ''}
    ${day ? `<section class="panel today-card"><h2 class="today-topic">${escape(intro)}</h2><div class="progress-label"><strong>${completed} of 20</strong><span class="label">Questions finished</span></div>${progress(completed, 20)}<button id="start-required" class="button wide" ${data.paused ? 'disabled' : ''}>${data.run ? 'Continue your 20' : "Start today’s 20"}</button></section>` : `<section class="panel"><h2>${data.today < data.settings.startDate ? `Your first day is ${dateLabel(data.settings.startDate)}.` : 'The ten weeks are finished.'}</h2><p>${data.today < data.settings.startDate ? 'Your practice will be here on that day.' : 'You can finish any missed days in My weeks.'}</p><a class="button secondary" href="#weeks">View My weeks</a></section>`}
    ${pointsPanel(data)}`, { page: 'today' });
  document.querySelector('#start-required')?.addEventListener('click', event => actionButton(event.currentTarget, () => startRun(day.dayIndex ?? day.index, 'required')));
}

async function startRun(dayIndex, kind) {
  const run = await api('/runs', { dayIndex, kind });
  state.run = run;
  navigate(`run/${run.id}`);
}

function feedbackHTML(feedback) {
  if (!feedback) return '';
  const title = feedback.correct ? `${checkMark}Right` : feedback.formOnly ? 'Right value' : 'Not yet';
  const hint = feedback.formOnly ? 'Write it in simplest form. This does not cost a try.' : feedback.revealed ? 'Read the steps, then try a fresh question later.' : feedback.hint;
  return `<section class="question-feedback ${feedback.correct ? 'right' : feedback.formOnly ? 'form' : ''}" aria-live="polite" aria-atomic="true"><div class="feedback-title">${title}</div>${hint ? `<p>${mathMarkup(hint)}</p>` : ''}</section>${feedback.solution?.length ? `<ol class="solution" aria-label="Worked solution">${feedback.solution.map(step => `<li>${mathMarkup(step, true)}</li>`).join('')}</ol><p class="twin-note">A question with new numbers will come later in this set.</p>` : ''}`;
}

function keypadHTML() {
  const keys = [ ['1','1'], ['2','2'], ['3','3'], ['4','4'], ['5','5'], ['backspace','⌫','Delete one character'], ['6','6'], ['7','7'], ['8','8'], ['9','9'], ['0','0'], ['−','−','Minus sign'], ['.','.','Decimal point'], ['/','<math aria-hidden="true"><mfrac><mi>a</mi><mi>b</mi></mfrac></math>','Fraction bar'], [' ','Space','Space for a mixed number'], ['clear','Clear','Clear answer'] ];
  return `<div class="keypad" role="group" aria-label="Answer keypad">${keys.map(([key,label,aria]) => `<button class="key${aria ? ' utility' : ''}" type="button" data-key="${escape(key)}" ${aria ? `aria-label="${aria}"` : ''}>${label}</button>`).join('')}</div>`;
}

function renderRun(run, draft = '') {
  state.run = run;
  if (!run.question) return;
  const question = run.question;
  if (state.questionId !== question.id) {
    state.questionId = question.id;
    state.questionStarted = performance.now();
    state.pendingAnswer = null;
  }
  const waiting = question.awaitingNext || question.feedback?.correct || question.feedback?.revealed;
  const choices = Array.isArray(question.choices) && question.choices.length ? question.choices : null;
  const label = run.kind === 'bonus' ? `Bonus round ${run.round}` : 'Daily practice';
  shell(`<div class="question-top"><a href="#today">Back to Today</a><span class="count">${escape(label)} · ${question.number} of ${run.total}</span></div>${progress(run.completed, run.total)}
    <form class="question-card" id="question-form"><div class="question-reading"><div class="question-prompt" id="question-prompt">${question.prompt ? mathMarkup(question.prompt, true) : mathMarkup(question.plainPrompt)}</div>${question.svg ? `<div class="question-diagram">${question.svg}</div>` : ''}
    ${choices ? `<fieldset class="question-choices" aria-labelledby="question-prompt" ${waiting ? 'disabled' : ''}><legend class="sr-only">Choose your answer</legend>${choices.map((choice,index) => `<label class="choice"><input type="radio" name="answer" value="${escape(choice.value)}" ${String(choice.value) === draft ? 'checked' : ''} required><span>${mathMarkup(choice.label, true)}</span></label>`).join('')}</fieldset>` : ''}
    <div id="question-feedback">${feedbackHTML(question.feedback)}</div></div>
    <div class="question-controls">${!choices && !waiting ? `<div class="answer-line"><label for="answer">Your answer</label><input id="answer" name="answer" type="text" inputmode="none" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="100" value="${escape(draft)}" aria-describedby="answer-help" required><span class="sr-only" id="answer-help">Type a number, decimal, fraction such as 3 slash 4, or mixed number such as 1 space 3 slash 4.</span></div>${keypadHTML()}` : ''}
    <p class="form-error" id="question-error" role="alert" hidden></p><button class="button" type="submit" id="check-answer">${waiting ? 'Next' : 'Check'}</button></div></form>`, { page: 'today', question: true });
  const form = document.querySelector('#question-form');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.dataset.saving === 'true') return;
    const answer = choices ? form.querySelector('input[name=answer]:checked')?.value : form.querySelector('#answer')?.value.trim();
    if (!waiting && !answer) return;
    await submitForm(form, async () => {
      if (waiting) {
        const next = await api(`/runs/${encodeURIComponent(run.id)}/next`, { questionId: question.id });
        if (location.hash !== `#run/${run.id}`) return;
        if (next.done) {
          state.run = next;
          const today = await api('/today');
          if (location.hash === `#run/${run.id}`) showDone(next, today);
        } else renderRun(next);
      } else {
        if (!state.pendingAnswer || state.pendingAnswer.questionId !== question.id || state.pendingAnswer.answer !== answer) {
          state.pendingAnswer = { questionId: question.id, answer, elapsedMs: Math.min(1800000, Math.max(0, Math.round(performance.now() - state.questionStarted))), requestId: crypto.randomUUID() };
        }
        const result = await api(`/runs/${encodeURIComponent(run.id)}/answer`, state.pendingAnswer);
        state.pendingAnswer = null;
        state.questionStarted = performance.now();
        if (location.hash === `#run/${run.id}`) {
          if (result.run.done) {
            const today = await api('/today');
            if (location.hash === `#run/${run.id}`) showDone(result.run, today);
          } else renderRun(result.run, answer);
        }
      }
    });
  });
  const input = document.querySelector('#answer');
  if (input) {
    input.addEventListener('input', () => { if (state.pendingAnswer?.answer !== input.value.trim()) state.pendingAnswer = null; });
    form.querySelectorAll('[data-key]').forEach(button => {
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('click', () => {
        const key = button.dataset.key, start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
        if (key === 'clear') { input.value = ''; input.setSelectionRange(0, 0); }
        else if (key === 'backspace') { const from = start === end ? Math.max(0, start - 1) : start; input.setRangeText('', from, end, 'end'); }
        else input.setRangeText(key, start, end, 'end');
        input.dispatchEvent(new Event('input'));
        input.focus({ preventScroll: true });
      });
    });
    input.focus({ preventScroll: true });
    if (draft) input.select();
  } else if (waiting) document.querySelector('#check-answer').focus({ preventScroll: true });
  else form.querySelector('input[type=radio]')?.focus({ preventScroll: true });
  if (question.feedback?.revealed) document.querySelector('#question-feedback').scrollIntoView({ block: 'nearest', behavior: 'instant' });
}

async function loadRun(id, version) {
  const run = await api(`/runs/${encodeURIComponent(id)}`);
  if (version !== state.routeVersion) return;
  state.run = run;
  if (run.done) {
    const today = await api('/today');
    if (version === state.routeVersion) showDone(run, today);
  } else renderRun(run);
}

function showDone(run, today) {
  state.today = today;
  const isToday = today.day && run.dayIndex === (today.day.dayIndex ?? today.day.index);
  const bonus = today.bonus;
  const isBonus = run.kind === 'bonus';
  const title = isBonus ? (run.pointsEarned ? `Round finished. You earned ${pointLabel(run.pointsEarned)}.` : 'Round finished.') : isToday ? 'Today’s 20 are done.' : 'Your 20 are done.';
  const size = bonus.active?.total || (bonus.completed ? bonus.laterSize : bonus.firstSize);
  const canBonus = isToday && bonus.available;
  shell(`<section class="done-card"><p class="eyebrow">${isBonus ? `Bonus round ${run.round}` : 'Day done'}</p><h1>${title}</h1><div class="done-score"><strong>${run.firstTryCorrect}<span aria-hidden="true"> / ${run.total}</span></strong><span>right on the first try</span></div>
    <div class="done-total"><div><p>Your points</p><p class="muted">${today.nextPrize ? `${escape(today.nextPrize.name)}: ${pointLabel(today.nextPrize.needed)} to go` : 'Saved for your next prize'}</p></div><strong class="point-value" id="done-points">${number(today.points)}</strong></div>
    <div class="done-actions">${canBonus ? `<button class="button gold" id="start-bonus">${bonus.active ? 'Continue bonus round' : `${size} questions for ${pointLabel(bonus.pointValue)}`}</button>` : ''}<a class="button secondary" href="#prizes">View prizes</a><a class="button secondary" href="#weeks">View My weeks</a></div>
    <p class="done-note">${today.paused ? 'Practice is paused today.' : !isToday ? 'Bonus rounds are only for today.' : canBonus ? `Get ${bonus.threshold}% right on the first try to earn ${pointLabel(bonus.pointValue)}. ${Math.max(0, bonus.limit - bonus.completed)} rounds remain today.` : 'You have finished today’s bonus rounds.'}</p></section>`, { page: 'today', done: true });
  document.querySelector('#start-bonus')?.addEventListener('click', event => actionButton(event.currentTarget, () => startRun(run.dayIndex, 'bonus')));
  if (isBonus && run.pointsEarned && !state.animatedRuns.has(run.id) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    state.animatedRuns.add(run.id);
    const element = document.querySelector('#done-points'), from = Math.max(0, today.points - run.pointsEarned), started = performance.now();
    const tick = now => { if (!document.contains(element)) return; const t = Math.min(1, (now - started) / 600); element.textContent = number(Math.round(from + (today.points - from) * t)); if (t < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  state.lastPoints = today.points;
}

function historyHTML(history) {
  return history.length ? `<ul class="history-list">${history.map(item => `<li class="history-row"><div><p>${escape(item.note || (item.kind === 'bonus' ? 'Bonus round' : 'Points adjusted'))}</p><p class="label">${escape(timeLabel(item.createdAt))}</p></div><span class="history-value">${item.amount > 0 ? '+' : '−'}${number(Math.abs(item.amount))}</span></li>`).join('')}</ul>` : '<p class="empty">Your points history will appear here.</p>';
}

async function showPrizes(version) {
  const data = await api('/prizes');
  if (version !== state.routeVersion) return;
  const active = data.prizes.filter(prize => prize.active);
  shell(`${pageTitle('Prizes')}<p class="prize-balance">You have <strong>${pointLabel(data.points)}</strong>.</p><div class="prize-list">${active.length ? active.map(prize => {
    const pending = data.requests.some(request => request.prizeId === prize.id && request.status === 'pending');
    const affordable = data.points >= prize.cost;
    return `<article class="prize-row"><div><h2>${escape(prize.name)}</h2><span class="prize-cost">${pointLabel(prize.cost)}</span></div><div class="prize-action"><button class="button${affordable ? ' gold' : ' secondary'}" data-request-prize="${escape(prize.id)}" ${!affordable || pending ? 'disabled' : ''}>${pending ? 'Asked your parent' : 'Ask for this prize'}</button>${!affordable ? `<p class="small">${pointLabel(prize.cost - data.points)} to go</p>` : ''}</div></article>`;
  }).join('') : '<section class="panel"><p>Your parent can add a prize and its point cost.</p></section>'}</div>
    ${data.requests.length ? `<section class="panel" style="margin-top:28px"><h2>Your requests</h2><ul class="history-list">${data.requests.map(request => `<li class="history-row"><div><p>${escape(request.name)}</p><p class="label">${dateLabel(request.createdAt)}</p></div><span class="status-label ${request.status === 'approved' ? 'done' : ''}">${request.status === 'approved' ? 'Approved' : request.status === 'declined' ? 'Declined' : 'Waiting'}</span></li>`).join('')}</ul></section>` : ''}
    <section class="panel" style="margin-top:28px"><h2>Points history</h2>${historyHTML(data.history)}</section>`, { page: 'prizes' });
  document.querySelectorAll('[data-request-prize]').forEach(button => button.addEventListener('click', () => actionButton(button, async () => { await api(`/prizes/${encodeURIComponent(button.dataset.requestPrize)}/request`, {}); tell('Your parent can now review your request.'); await route(); })));
}

async function showWeeks(version) {
  const data = await api('/weeks');
  if (version !== state.routeVersion) return;
  const weeks = [];
  for (let index = 0; index < data.days.length; index += 7) weeks.push(data.days.slice(index, index + 7));
  shell(`${pageTitle('My weeks', 'Choose a missed day to finish its 20 questions.')}<div class="calendar">${weeks.map((days,index) => `<section class="week-row"><div class="week-title"><h2>Week ${days[0]?.week || index + 1}</h2><span>${dateLabel(days[0]?.date, { month: 'short' })} – ${dateLabel(days.at(-1)?.date, { month: 'short' })}</span></div><div class="week-days">${days.map(day => `<button class="calendar-day ${escape(day.status)} ${day.date === data.today ? 'today' : ''}" data-day-index="${day.dayIndex ?? day.index}" ${day.status === 'ahead' || day.status === 'done' || day.paused ? 'disabled' : ''} aria-label="${escape(`${dateLabel(day.date, { weekday: 'long' })}, ${day.title || day.topic}, ${day.status}`)}" ${day.date === data.today ? 'aria-current="date"' : ''}><span>${escape(day.weekday?.slice(0,3) || dateLabel(day.date, { weekday: 'short' }).split(',')[0])}</span><strong>${Number(day.date.slice(-2))}</strong><span class="day-status">${day.status === 'done' ? '✓ Done' : day.paused ? 'Paused' : day.status === 'ahead' ? 'Ahead' : day.status === 'today' ? 'Today' : 'Missed'}</span></button>`).join('')}</div></section>`).join('')}</div>`, { page: 'weeks' });
  document.querySelectorAll('[data-day-index]').forEach(button => button.addEventListener('click', () => actionButton(button, () => startRun(Number(button.dataset.dayIndex), 'required'))));
}

function attemptsHTML(attempts, showDate = false) {
  return attempts.length ? `<div class="miss-list">${attempts.map(attempt => `<article class="miss-item"><span class="label">${escape(attempt.skill)} · Try ${attempt.tryNumber}${showDate ? ` · ${escape(timeLabel(attempt.createdAt))}` : ''}</span><div class="miss-prompt">${mathMarkup(attempt.prompt, true)}</div><div class="miss-answer"><span class="muted">Student answer</span><span class="${attempt.correct ? '' : 'student-answer'}">${mathMarkup(attempt.answer)}</span><span class="muted">Right answer</span><span>${mathMarkup(attempt.rightAnswer)}</span></div></article>`).join('')}</div>` : '<p class="empty">No attempts to show.</p>';
}

async function showOverview(version) {
  const data = await api('/parent/overview');
  if (version !== state.routeVersion) return;
  if (!data.student) {
    shell(`${pageTitle('Overview')}<section class="panel"><h2>Create the student account</h2><p>Use a first name or nickname. No email is needed.</p><a class="button" href="#parent/settings">Open Settings</a></section>`, { page: 'parent/overview', parent: true });
    return;
  }
  const today = data.days[0] || {};
  shell(`${pageTitle('Overview', `${data.student.name} · ${dateLabel(today.date, { weekday: 'long' })}`)}<div class="summary-grid"><div class="summary-stat"><span class="label">Today’s 20</span><strong>${today.done ? 'Done' : 'Not done'}</strong></div><div class="summary-stat"><span class="label">First try</span><strong>${today.firstTryCorrect || 0} / ${today.total || 20}</strong></div><div class="summary-stat"><span class="label">Time today</span><strong>${minutes(today.timeMs)}</strong></div><div class="summary-stat"><span class="label">Points</span><strong>${number(data.points)}</strong></div></div>
    <section class="panel"><h2>Today and the last 7 days</h2><div class="table-wrap"><table><thead><tr><th scope="col">Day</th><th scope="col">Required</th><th scope="col">First try</th><th scope="col">Time</th><th scope="col">Bonus rounds</th><th scope="col">Points earned</th></tr></thead><tbody>${data.days.map(day => `<tr><th scope="row" class="nowrap">${dateLabel(day.date, { weekday: 'short', month: 'short' })}</th><td><span class="status-label ${day.done ? 'done' : ''}">${day.dayIndex < 0 || day.dayIndex >= 70 ? 'Outside course' : day.done ? '✓ Done' : 'Not done'}</span></td><td>${day.firstTryCorrect} / ${day.total}</td><td>${minutes(day.timeMs)}</td><td>${day.bonusRounds}</td><td>${number(day.pointsEarned)}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="panel"><div class="panel-heading"><h2>Today’s misses</h2><span class="label">${data.misses.length} ${data.misses.length === 1 ? 'attempt' : 'attempts'}</span></div><div class="divider"></div>${data.misses.length ? attemptsHTML(data.misses) : '<p class="empty">No missed answers today.</p>'}</section>`, { page: 'parent/overview', parent: true });
}

async function showSkills(version, skillId) {
  const data = await api(`/parent/skills${skillId ? `?skill=${encodeURIComponent(skillId)}` : ''}`);
  if (version !== state.routeVersion) return;
  if (skillId) {
    const skill = data.skills.find(item => item.skill === skillId);
    shell(`<a class="back-link" href="#parent/skills">Back to Skills</a>${pageTitle(skill?.name || skillId, `${skill?.firstTryCorrect || 0} of ${skill?.attempts || 0} first tries right`)}<section class="panel"><h2>Recent attempts</h2>${attemptsHTML(data.attempts, true)}</section>`, { page: 'parent/skills', parent: true });
    return;
  }
  const groups = new Map();
  for (const skill of data.skills) { const week = Number(skill.week || 0); if (!groups.has(week)) groups.set(week, []); groups.get(week).push(skill); }
  shell(`${pageTitle('Skills', 'First-try accuracy. Untaught skills need teaching, then practice.')}<p class="small muted">Secure: 80% and up. Developing: 50–79%. Needs teaching: below 50%.</p>${[...groups].sort((a,b) => a[0] - b[0]).map(([week,skills]) => `<section class="skill-week"><h2>${week ? `Week ${week}` : 'Review and warm-up'}</h2><div class="skill-grid">${skills.map(skill => `<a class="skill-card" href="#parent/skills/${encodeURIComponent(skill.skill)}" style="text-decoration:none"><strong>${escape(skill.name)}</strong><div class="skill-result"><span class="badge ${skill.label === 'Secure' ? 'secure' : skill.label === 'Developing' ? 'developing' : skill.label === 'Needs teaching' ? 'teaching' : ''}">${escape(skill.label)}</span><span class="accuracy">${skill.accuracy === null ? 'No attempts' : `${skill.accuracy}%`}</span></div><span class="label">${skill.attempts} first ${skill.attempts === 1 ? 'try' : 'tries'}</span></a>`).join('')}</div></section>`).join('')}`, { page: 'parent/skills', parent: true });
}

async function showParentPrizes(version) {
  const [data, config] = await Promise.all([api('/parent/prizes'), api('/parent/settings')]);
  if (version !== state.routeVersion) return;
  const settings = config.settings;
  const pending = data.requests.filter(request => request.status === 'pending');
  shell(`${pageTitle('Prizes and points')}<p class="prize-balance">Available points: <strong>${number(data.points)}</strong></p>
    <section class="panel"><h2>Prize requests</h2>${pending.length ? pending.map(request => `<article class="request-row"><h3>${escape(request.name)}</h3><p class="label">${pointLabel(request.cost)} · Requested ${dateLabel(request.createdAt)}</p><div class="form-actions"><button class="button compact" data-request="${escape(request.id)}" data-decision="approve">Approve and spend points</button><button class="button secondary compact" data-request="${escape(request.id)}" data-decision="decline">Decline</button></div></article>`).join('') : '<p class="empty">No requests are waiting.</p>'}</section>
    <section class="panel"><h2>Prize list</h2>${data.prizes.map(prize => `<form class="edit-prize" data-prize="${escape(prize.id)}"><div class="inline-edit"><div class="field"><label for="prize-name-${escape(prize.id)}">Prize name</label><input id="prize-name-${escape(prize.id)}" name="name" value="${escape(prize.name)}" maxlength="80" required></div><div class="field"><label for="prize-cost-${escape(prize.id)}">Points</label><input id="prize-cost-${escape(prize.id)}" name="cost" type="number" min="1" max="100000" value="${prize.cost}" required></div><button class="button secondary compact" type="submit">Save</button></div><label class="check-label small"><input type="checkbox" name="active" ${prize.active ? 'checked' : ''}>Show this prize</label>${formError}</form>`).join('')}${data.prizes.length ? '<div class="divider"></div>' : ''}<h3>Add a prize</h3><form id="add-prize"><div class="form-grid">${field('prize-name','Prize name','name="name" maxlength="80" required')}${field('prize-cost','Point cost','name="cost" type="number" min="1" max="100000" required')}</div>${formError}<div class="form-actions"><button class="button" type="submit">Add prize</button></div></form></section>
    <div class="parent-columns" style="margin-top:24px"><section class="panel"><h2>Bonus rules</h2><form id="bonus-rules" class="stack">${field('bonusPointValue','Points per round',`type="number" min="0" max="100" value="${settings.bonusPointValue}" required`)}${field('bonusThreshold','First-try score needed (%)',`type="number" min="1" max="100" value="${settings.bonusThreshold}" required`)}${field('bonusLimit','Maximum rounds per day',`type="number" min="0" max="20" value="${settings.bonusLimit}" required`)}${formError}<button class="button" type="submit">Save bonus rules</button></form></section>
    <section class="panel"><h2>Adjust points</h2><form id="adjust-points" class="stack">${field('point-amount','Points to add or correct','type="number" min="-100000" max="100000" required')}<p class="field-help">Use a minus sign for a correction.</p>${field('point-note','Note','maxlength="200" required')}${formError}<button class="button" type="submit">Save adjustment</button></form></section></div>
    <section class="panel" style="margin-top:24px"><h2>Points history</h2>${historyHTML(data.history)}</section>`, { page: 'parent/prizes', parent: true });
  document.querySelectorAll('[data-request]').forEach(button => button.addEventListener('click', () => actionButton(button, async () => { await api(`/parent/requests/${encodeURIComponent(button.dataset.request)}`, { action: button.dataset.decision }); tell(button.dataset.decision === 'approve' ? 'Prize approved. Points spent.' : 'Request declined. Points kept.'); await route(); })));
  document.querySelectorAll('.edit-prize').forEach(form => form.addEventListener('submit', event => { event.preventDefault(); const values = new FormData(form); submitForm(form, async () => { await api(`/parent/prizes/${encodeURIComponent(form.dataset.prize)}`, { name: values.get('name'), cost: Number(values.get('cost')), active: values.has('active') }, 'PATCH'); }, 'Prize saved.'); }));
  const add = document.querySelector('#add-prize');
  add.addEventListener('submit', event => { event.preventDefault(); submitForm(add, async () => { await api('/parent/prizes', { name: add.querySelector('#prize-name').value, cost: Number(add.querySelector('#prize-cost').value) }); await route(); }, 'Prize added.'); });
  const rules = document.querySelector('#bonus-rules');
  rules.addEventListener('submit', event => { event.preventDefault(); const values = new FormData(rules); submitForm(rules, () => api('/parent/settings', { bonusPointValue: Number(values.get('bonusPointValue')), bonusThreshold: Number(values.get('bonusThreshold')), bonusLimit: Number(values.get('bonusLimit')) }, 'PATCH'), 'Bonus rules saved.'); });
  const adjust = document.querySelector('#adjust-points');
  let requestId = crypto.randomUUID();
  adjust.addEventListener('input', () => { requestId = crypto.randomUUID(); });
  adjust.addEventListener('submit', event => { event.preventDefault(); submitForm(adjust, async () => { await api('/parent/points', { amount: Number(adjust.querySelector('#point-amount').value), note: adjust.querySelector('#point-note').value, requestId }); await route(); }, 'Points adjustment saved.'); });
}

function accountForm(role) {
  return `<form id="create-${role}" class="stack"><div class="form-grid">${field(`${role}-name`,'First name or nickname','autocomplete="off" maxlength="32" required')}${field(`${role}-username`,'Username','autocomplete="off" autocapitalize="none" spellcheck="false" minlength="2" maxlength="24" pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{1,23}" required')}${field(`${role}-password`,'Password',`type="password" autocomplete="new-password" minlength="${role === 'parent' ? 8 : 4}" maxlength="72" required`)}</div><p class="field-help">Use at least ${role === 'parent' ? 8 : 4} characters for this password.</p>${formError}<button class="button" type="submit">Create ${role} account</button></form>`;
}

async function showSettings(version) {
  const data = await api('/parent/settings');
  if (version !== state.routeVersion) return;
  const settings = data.settings;
  const student = data.accounts.find(account => account.role === 'student');
  const parents = data.accounts.filter(account => account.role === 'parent');
  const accountRow = account => `<article class="account-row"><div class="row-top"><div><p><strong>${escape(account.name)}</strong></p><p class="label">Username: ${escape(account.username)}</p></div><button class="text-button" type="button" data-show-reset="${escape(account.id)}">Reset password</button></div><form class="reset-form" id="reset-${escape(account.id)}" data-account="${escape(account.id)}" hidden><div class="field"><label for="password-${escape(account.id)}">New password</label><input id="password-${escape(account.id)}" name="password" type="password" autocomplete="new-password" minlength="${account.role === 'parent' ? 8 : 4}" maxlength="72" required></div><button class="button secondary" type="submit">Save password</button>${formError}</form></article>`;
  shell(`${pageTitle('Settings')}<section class="panel"><h2>Student account</h2>${student ? accountRow(student) : accountForm('student')}</section>
    <section class="panel"><h2>Parent accounts</h2>${parents.map(accountRow).join('')}<div class="divider"></div><details><summary class="text-button">Add a parent account</summary>${accountForm('parent')}</details></section>
    <section class="panel"><h2>Calendar</h2><form id="calendar-settings"><div class="form-grid">${field('startDate','Day 1',`type="date" value="${escape(settings.startDate)}" required`)}</div><p class="settings-warning">Changing Day 1 shifts every lesson date. Saved work stays with its lesson.</p><label class="check-label"><input name="paused" type="checkbox" ${settings.paused ? 'checked' : ''}>Pause all practice</label>${formError}<div class="form-actions"><button class="button" type="submit">Save calendar</button></div></form><div class="divider"></div><h3>Pause individual days</h3><form id="add-pause" class="reset-form"><div class="field"><label for="pause-date">Date to pause</label><input id="pause-date" type="date" required></div><button class="button secondary" type="submit">Add pause</button>${formError}</form><div class="pause-dates">${settings.pausedDates.map(date => `<span class="pause-date">${dateLabel(date, { year: 'numeric' })}<button type="button" data-remove-pause="${escape(date)}" aria-label="Remove pause for ${escape(dateLabel(date))}">×</button></span>`).join('')}</div><p class="settings-warning">Paused days keep their lesson. Missed practice can be made up later.</p></section>
    <section class="panel"><h2>Backup</h2><p>${data.backup?.latestDate ? `Latest saved backup: ${dateLabel(data.backup.latestDate, { year: 'numeric' })}.` : 'No saved backup yet.'}</p><p class="small muted">Download a copy of accounts, answers, points and prizes. Keep it private.</p><div class="form-actions"><a class="button" href="/api/parent/backup" download>Download backup</a><button class="button secondary" id="save-backup" type="button">Save backup now</button></div></section>`, { page: 'parent/settings', parent: true });
  for (const role of ['student','parent']) {
    const form = document.querySelector(`#create-${role}`);
    form?.addEventListener('submit', event => { event.preventDefault(); submitForm(form, async () => { await api('/parent/accounts', { role, name: form.querySelector(`#${role}-name`).value, username: form.querySelector(`#${role}-username`).value, password: form.querySelector(`#${role}-password`).value }); await route(); }, `${role === 'parent' ? 'Parent' : 'Student'} account created.`); });
  }
  document.querySelectorAll('[data-show-reset]').forEach(button => button.addEventListener('click', () => { const form = document.getElementById(`reset-${button.dataset.showReset}`); form.hidden = !form.hidden; if (!form.hidden) form.querySelector('input').focus(); }));
  document.querySelectorAll('form[data-account]').forEach(form => form.addEventListener('submit', event => { event.preventDefault(); submitForm(form, async () => { await api(`/parent/accounts/${encodeURIComponent(form.dataset.account)}/password`, { password: form.querySelector('input').value }); form.reset(); form.hidden = true; if (form.dataset.account === state.user?.id) { state.user = null; state.routeVersion++; renderAuth('Password reset. Sign in with the new password.'); } }, 'Password reset. Sign in with the new password.'); }));
  const calendarForm = document.querySelector('#calendar-settings');
  calendarForm.addEventListener('submit', event => { event.preventDefault(); const values = new FormData(calendarForm); submitForm(calendarForm, async () => { await api('/parent/settings', { startDate: values.get('startDate'), paused: values.has('paused') }, 'PATCH'); await route(); }, 'Calendar saved.'); });
  const pauseForm = document.querySelector('#add-pause');
  pauseForm.addEventListener('submit', event => { event.preventDefault(); submitForm(pauseForm, async () => { await api('/parent/settings', { pausedDates: [...new Set([...settings.pausedDates, pauseForm.querySelector('input').value])] }, 'PATCH'); await route(); }, 'Pause saved.'); });
  document.querySelectorAll('[data-remove-pause]').forEach(button => button.addEventListener('click', () => actionButton(button, async () => { await api('/parent/settings', { pausedDates: settings.pausedDates.filter(date => date !== button.dataset.removePause) }, 'PATCH'); await route(); tell('Pause removed.'); })));
  document.querySelector('#save-backup').addEventListener('click', event => actionButton(event.currentTarget, async () => { await api('/parent/backup', {}); await route(); tell('Backup saved.'); }));
}

async function route() {
  if (!state.user) return renderAuth();
  const version = ++state.routeVersion;
  const path = location.hash.slice(1) || (state.user.role === 'parent' ? 'parent/overview' : 'today');
  const parent = state.user.role === 'parent';
  if ((parent && !path.startsWith('parent/')) || (!parent && path.startsWith('parent/'))) return navigate(parent ? 'parent/overview' : 'today');
  document.title = `${parent ? 'Parent' : 'Practice'} · Double Advanced`;
  if (!path.startsWith('run/')) shell('<p class="loading-text" role="status">Loading…</p>', { page: path, parent });
  try {
    if (path === 'today') await showToday(version);
    else if (path.startsWith('run/')) await loadRun(path.slice(4), version);
    else if (path === 'weeks') await showWeeks(version);
    else if (path === 'prizes') await showPrizes(version);
    else if (path === 'parent/overview') await showOverview(version);
    else if (path === 'parent/skills' || path.startsWith('parent/skills/')) await showSkills(version, path.startsWith('parent/skills/') ? decodeURIComponent(path.slice(14)) : null);
    else if (path === 'parent/prizes') await showParentPrizes(version);
    else if (path === 'parent/settings') await showSettings(version);
    else return navigate(parent ? 'parent/overview' : 'today');
    if (version === state.routeVersion && !path.startsWith('run/')) window.scrollTo(0, 0);
  } catch (error) {
    if (!state.user || version !== state.routeVersion) return;
    shell(`${pageTitle('Could not open this page')}<section class="panel"><p role="alert">${escape(error.message)}</p><button class="button" id="retry-page">Try again</button></section>`, { page: path, parent });
    document.querySelector('#retry-page').addEventListener('click', route);
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('online', () => { if (state.user) tell('Your connection is back.'); });

async function boot() {
  try {
    const session = await api('/session');
    state.user = session.user;
    state.setupRequired = session.setupRequired;
    if (state.user) await route(); else renderAuth();
  } catch (error) {
    renderAuth(error.message);
  }
}

boot();
