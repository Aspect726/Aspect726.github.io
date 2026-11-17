// Question-specific tutoring. Opening this panel only restores saved messages;
// a new paid explanation always requires submitting the form.
const items = value => Array.isArray(value) ? value : [];
const assessmentLabels = { sound: 'The steps make sense', needs_work: 'A step to check' };

export function tutorPanelMarkup({ available, remaining, steps = [], escape: e }) {
  const exhausted = available && remaining === 0;
  const canAsk = available && !exhausted;
  return `<section class="tutor-panel" aria-labelledby="tutor-title"><div class="tutor-panel-heading"><span class="tutor-symbol" aria-hidden="true">?</span><div><h3 id="tutor-title">Talk through this question</h3><p>${canAsk ? 'Choose what you need, then send your question.' : exhausted ? 'Your tutor replies are used up for today. Hints and worked steps are still available.' : 'The tutor is unavailable. Use the hint and worked steps above.'}</p></div></div>
    ${canAsk ? `<form id="tutor-form"><div class="tutor-mode-buttons" role="group" aria-label="Type of help"><button type="button" data-tutor-mode="explain" aria-pressed="true">Explain a step</button><button type="button" data-tutor-mode="check-reasoning" aria-pressed="false">Check my thinking</button></div><select name="mode" id="tutor-mode" hidden aria-label="Help type"><option value="explain">Explain</option><option value="check-reasoning">Check my thinking</option></select><div class="tutor-context-row"><label for="tutor-part">Focus on</label><select name="part" id="tutor-part"><option value="0">The whole question</option>${items(steps).map((_, index) => `<option value="${index + 1}">Step ${index + 1}</option>`).join('')}</select><span id="tutor-context-caption">The tutor can see this question.</span></div><label class="field" for="tutor-message"><span id="tutor-message-label">What would you like explained?</span><textarea id="tutor-message" name="message" maxlength="600" rows="3" required placeholder="Which calculation should I do first, and why?" aria-describedby="tutor-privacy-note"></textarea></label><div class="tutor-send-row"><button type="submit" class="button" id="tutor-send">Send to tutor</button><span class="tutor-remaining">${Number.isInteger(remaining) ? `${remaining} replies left today` : ''}</span></div><p class="tutor-status" role="status" aria-live="polite"></p></form>` : ''}
    <p id="tutor-privacy-note" class="small tutor-save-note">AI explanations use this question and relevant learning history. Messages are saved for learning; your teacher can see them. Help does not submit an answer or change your score.</p>
    <div class="tutor-history-heading"><h4>Conversation about this question</h4><button type="button" class="text-link" id="retry-tutor-history" hidden>Reload messages</button></div><p class="small tutor-history-status" role="status">Loading earlier messages…</p><div class="tutor-conversation" id="tutor-response" role="log" aria-label="Your conversation about this question" aria-live="polite" hidden></div></section>`;
}

export function mountTutorPanel(root, { api, questionId, stepCount = 0, escape: e, isCurrent }) {
  let turns = [], historyState = 'loading', retryRequest = null, busy = false, exhausted = false, generatedPrompt = null;
  const here = () => root.isConnected && isCurrent();
  const form = root.querySelector('#tutor-form');
  const history = root.querySelector('#tutor-response');
  const historyStatus = root.querySelector('.tutor-history-status');
  const retryHistory = root.querySelector('#retry-tutor-history');
  const validPart = value => Number.isInteger(Number(value)) ? Math.max(0, Math.min(stepCount, Number(value))) : 0;

  function showHistory(incoming = []) {
    if (!here()) return;
    const byId = new Map(turns.map(turn => [turn.id, turn]));
    for (const turn of items(incoming)) {
      if (turn && typeof turn === 'object' && typeof turn.id === 'string' && (!turn.questionId || turn.questionId === questionId)) byId.set(turn.id, turn);
    }
    turns = [...byId.values()].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))).slice(-10);
    const existing = new Map([...history.children].map(element => [element.dataset.turnId, element]));
    for (const turn of turns) {
      let article = existing.get(turn.id);
      if (!article) { article = document.createElement('article'); article.className = 'tutor-turn'; article.dataset.turnId = turn.id; }
      const part = validPart(turn.part), about = part ? `Step ${part}` : 'The question';
      const assessment = turn.mode === 'check-reasoning' && Object.hasOwn(assessmentLabels, turn.assessment) ? assessmentLabels[turn.assessment] : null;
      article.innerHTML = `<div class="tutor-learner"><p class="eyebrow">${turn.mode === 'check-reasoning' ? 'Your thinking' : 'Your question'} · ${about}</p><p>${e(turn.studentMessage || '')}</p></div><div class="tutor-reply"><p class="eyebrow">${turn.source === 'ai' ? 'AI tutor' : 'Worked help'}</p>${assessment ? `<h4>${assessment}</h4>` : ''}<p>${e(turn.tutorReply || 'Use the worked steps above.')}</p>${turn.notice ? `<p class="small">${e(turn.notice)}</p>` : ''}</div>`;
      history.append(article); existing.delete(turn.id);
    }
    for (const old of existing.values()) old.remove();
    history.hidden = !turns.length;
    historyStatus.textContent = historyState === 'loading' ? 'Loading earlier messages…' : historyState === 'unavailable' ? 'Earlier messages could not be loaded. Your worked help is still ready.' : turns.length ? 'Your latest messages are saved with this question.' : 'No messages yet. You can ask about a step above.';
    retryHistory.hidden = historyState !== 'unavailable';
  }

  async function restoreHistory() {
    if (!here()) return;
    historyState = 'loading'; retryHistory.disabled = true; showHistory();
    try {
      const result = await api(`/v2/student/tutor-history?questionId=${encodeURIComponent(questionId)}`);
      if (!here()) return;
      historyState = 'loaded'; showHistory(result.conversations);
    } catch {
      if (here()) { historyState = 'unavailable'; showHistory(); }
    } finally { if (retryHistory.isConnected) retryHistory.disabled = false; }
  }

  function updateControls(rewritePrompt = false) {
    if (!form) return;
    const reasoning = form.elements.mode.value === 'check-reasoning', part = validPart(form.elements.part.value);
    form.querySelectorAll('[data-tutor-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tutorMode === form.elements.mode.value)));
    root.querySelector('#tutor-message-label').textContent = reasoning ? 'Show the steps you tried' : 'What would you like explained?';
    form.elements.message.placeholder = reasoning ? 'I first… Then I… I chose this because…' : part ? `Why does step ${part} work?` : 'Which calculation should I do first, and why?';
    root.querySelector('#tutor-context-caption').textContent = part ? `The tutor can see step ${part} and the steps before it.` : 'The tutor can see this question.';
    if (rewritePrompt && generatedPrompt && form.elements.message.value === generatedPrompt) {
      generatedPrompt = reasoning ? null : part ? `Please explain why step ${part} works.` : 'Help me choose the first step without giving me the answer.';
      form.elements.message.value = generatedPrompt || '';
    }
  }

  function focus({ mode = 'explain', part = 0, prompt = false } = {}) {
    if (!here()) return;
    if (!form) { root.querySelector('#tutor-title')?.scrollIntoView?.({ block: 'nearest' }); return; }
    form.elements.mode.value = mode === 'check-reasoning' ? mode : 'explain';
    form.elements.part.value = String(validPart(part));
    updateControls(true);
    if (prompt && !form.elements.message.value.trim() && form.elements.mode.value === 'explain') {
      generatedPrompt = validPart(part) ? `Please explain why step ${validPart(part)} works.` : 'Help me choose the first step without giving me the answer.';
      form.elements.message.value = generatedPrompt;
    }
    form.elements.message.focus({ preventScroll: true });
    form.scrollIntoView?.({ block: 'nearest' });
  }

  form?.querySelectorAll('[data-tutor-mode]').forEach(button => button.addEventListener('click', () => focus({ mode: button.dataset.tutorMode, part: form.elements.part.value })));
  form?.elements.part.addEventListener('change', () => updateControls(true));
  form?.elements.mode.addEventListener('change', () => updateControls(true));
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || exhausted || !here()) return;
    const message = form.elements.message.value.trim();
    if (!message) { form.elements.message.focus(); return; }
    const mode = form.elements.mode.value === 'check-reasoning' ? 'check-reasoning' : 'explain', part = validPart(form.elements.part.value);
    const signature = JSON.stringify([message, mode, part]);
    const requestId = retryRequest?.signature === signature ? retryRequest.requestId : crypto.randomUUID();
    retryRequest = { signature, requestId };
    const button = form.querySelector('[type=submit]'), statusLine = form.querySelector('.tutor-status');
    busy = true; button.disabled = true; button.textContent = 'Getting help…'; form.setAttribute('aria-busy', 'true');
    statusLine.textContent = 'The tutor is preparing a short explanation. You can still use the worked steps.';
    try {
      const result = await api('/v2/student/tutor', { questionId, message, mode, part, requestId });
      if (!here()) return;
      retryRequest = null;
      showHistory([{ id: result.conversationId || requestId, questionId, studentMessage: message, tutorReply: result.reply, mode, part, assessment: result.assessment, source: result.source, notice: result.notice, createdAt: result.createdAt || new Date().toISOString() }]);
      if (form.elements.message.value.trim() === message) form.elements.message.value = '';
      if (Number.isInteger(result.remaining)) { root.querySelector('.tutor-remaining').textContent = `${result.remaining} replies left today`; exhausted = result.remaining === 0; }
      statusLine.textContent = result.source === 'worked-help' ? 'Worked help is shown below. Your answer has not been submitted.' : 'Reply saved below. Try the next step in your answer.';
      history.scrollTop = history.scrollHeight;
    } catch (error) {
      if (here()) statusLine.textContent = `${error.message || 'The tutor could not reply.'} Your message is kept. Try again or use the worked steps.`;
    } finally {
      busy = false;
      if (here()) { button.disabled = exhausted; button.textContent = exhausted ? 'Replies used for today' : retryRequest ? 'Try again' : 'Send to tutor'; form.removeAttribute('aria-busy'); }
    }
  });
  retryHistory.addEventListener('click', restoreHistory);
  void restoreHistory();
  return { focus, showHistory };
}
