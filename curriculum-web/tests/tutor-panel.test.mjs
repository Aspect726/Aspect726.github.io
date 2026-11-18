import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { tutorPanelMarkup, mountTutorPanel } from '../public/tutor-panel.mjs';
import { renderStudent } from '../public/student.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function panelFixture(handler, status = { available: true, remaining: 5 }) {
  const dom = new JSDOM('<main></main>', { url: 'https://practice.test/s/practice' });
  const previousDocument = globalThis.document;
  globalThis.document = dom.window.document;
  document.querySelector('main').innerHTML = tutorPanelMarkup({ ...status, steps: ['First', 'Second'], escape });
  let current = true;
  const calls = [];
  const api = async (path, body) => { calls.push({ path, body }); return handler(path, body); };
  const panel = mountTutorPanel(document.querySelector('.tutor-panel'), { api, questionId: 'question-1', stepCount: 2, escape, isCurrent: () => current });
  return { dom, calls, panel, close() { current = false; dom.window.close(); globalThis.document = previousDocument; } };
}
const submit = fixture => document.querySelector('#tutor-form').dispatchEvent(new fixture.dom.window.Event('submit', { bubbles: true, cancelable: true }));

test('opening contextual tutoring restores history but never requests a paid reply', async () => {
  const f = panelFixture(async path => { assert.match(path, /tutor-history/); return { conversations: [] }; });
  try {
    await tick();
    f.panel.focus({ mode: 'explain', part: 2, prompt: true });
    assert.equal(document.querySelector('#tutor-part').value, '2');
    assert.equal(document.querySelector('#tutor-message').value, 'Please explain why step 2 works.');
    assert.equal(document.activeElement.id, 'tutor-message');
    assert.equal(f.calls.length, 1);
    assert.match(document.querySelector('.tutor-save-note').textContent, /AI explanations.*teacher can see/);
    assert.match(document.querySelector('.tutor-save-note').textContent, /does not submit an answer/);
  } finally { f.close(); }
});

test('context changes update starter prompts while preserving the learner’s own draft', async () => {
  const f = panelFixture(async () => ({ conversations: [] }));
  try {
    f.panel.focus({ mode: 'explain', part: 1, prompt: true });
    const input = document.querySelector('#tutor-message'), part = document.querySelector('#tutor-part');
    part.value = '2'; part.dispatchEvent(new f.dom.window.Event('change'));
    assert.equal(input.value, 'Please explain why step 2 works.');
    document.querySelector('[data-tutor-mode="check-reasoning"]').click();
    assert.equal(input.value, '');
    assert.match(document.querySelector('#tutor-message-label').textContent, /steps you tried/);
    input.value = 'I divided because the groups have equal sizes.';
    f.panel.focus({ mode: 'explain', part: 1, prompt: true });
    assert.equal(input.value, 'I divided because the groups have equal sizes.');
    assert.equal(document.querySelector('[data-tutor-mode="explain"]').getAttribute('aria-pressed'), 'true');
  } finally { f.close(); }
});

test('failed sends preserve the draft and reuse the request identity until it changes', async () => {
  let count = 0;
  const f = panelFixture(async path => {
    if (path.includes('tutor-history')) return { conversations: [] };
    if (count++ === 0) throw new Error('Connection interrupted.');
    return { conversationId: 'saved', reply: 'Use equal groups first.', source: 'ai', remaining: 3 };
  });
  try {
    document.querySelector('#tutor-message').value = 'Why do we divide here?';
    submit(f); await tick();
    assert.match(document.querySelector('.tutor-status').textContent, /message is kept/);
    assert.equal(document.querySelector('#tutor-send').textContent, 'Try again');
    const first = f.calls.find(call => call.body)?.body;
    submit(f); await tick();
    const sent = f.calls.filter(call => call.body);
    assert.equal(sent.length, 2); assert.equal(sent[1].body.requestId, first.requestId);
    assert.equal(document.querySelector('#tutor-message').value, '');
    document.querySelector('#tutor-message').value = 'Why do we divide here?';
    submit(f); await tick();
    assert.notEqual(f.calls.filter(call => call.body).at(-1).body.requestId, first.requestId, 'a successful new turn has its own identity');
  } finally { f.close(); }
});

test('duplicate submission stays in one request and late replies cannot update a removed question', async () => {
  let release;
  const f = panelFixture(async path => path.includes('tutor-history') ? { conversations: [] } : new Promise(resolve => { release = resolve; }));
  try {
    document.querySelector('#tutor-message').value = 'Check my plan.';
    submit(f); submit(f); await tick();
    assert.equal(f.calls.filter(call => call.body).length, 1);
    assert.equal(document.querySelector('#tutor-form').getAttribute('aria-busy'), 'true');
    document.querySelector('main').innerHTML = '<h1>New question</h1>';
    release({ reply: 'Old reply', source: 'ai' }); await tick();
    assert.equal(document.querySelector('main').textContent, 'New question');
  } finally { f.close(); }
});

test('unavailable or exhausted tutoring retains history without a send form', async () => {
  for (const status of [{ available: false }, { available: true, remaining: 0 }]) {
    const f = panelFixture(async () => ({ conversations: [{ id: 'past', questionId: 'question-1', source: 'worked-help', studentMessage: 'A saved question', tutorReply: '<img src=x>Find equal groups.', mode: 'explain', part: 1 }] }), status);
    try {
      await tick();
      assert.equal(document.querySelector('#tutor-form'), null);
      assert.match(document.querySelector('#tutor-response').textContent, /A saved question/);
      assert.equal(document.querySelector('#tutor-response img'), null);
      assert.match(document.querySelector('.tutor-panel-heading').textContent, /worked steps/);
    } finally { f.close(); }
  }
});

test('question-level help shortcuts open the matching context without submitting or paying for help', async () => {
  const dom = new JSDOM('<main id="app"></main>', { url: 'https://practice.test/s/practice' });
  const oldDocument = globalThis.document, oldFormData = globalThis.FormData;
  globalThis.document = dom.window.document; globalThis.FormData = dom.window.FormData;
  const calls = [], summary = { answered: 0, dailyTarget: 20, points: 0 };
  const ctx = { escape, mathMarkup: escape, state: { user: { role: 'student' }, routeVersion: 1 }, tell() {}, navigate() {}, shell: html => { document.querySelector('#app').innerHTML = html; }, api: async (path, body) => {
    calls.push({ path, body });
    if (path.endsWith('/summary')) return summary;
    if (path.endsWith('/question')) return { question: { id: 'q1', skill: 'D-DIV', name: 'Division', prompt: 'Divide the ribbon into equal pieces.' }, summary };
    if (path.endsWith('/help')) return { hint: 'Find one equal share.', steps: ['Divide the total.', 'Label the length.'], answer: '3 cm' };
    if (path.endsWith('/tutor-status')) return { available: true, remaining: 5 };
    if (path.includes('tutor-history')) return { conversations: [] };
    if (path.endsWith('/help-event')) return { ok: true };
    throw new Error(`Unexpected request: ${path}`);
  } };
  try {
    await renderStudent('/s/practice', ctx);
    assert.equal(document.querySelectorAll('[data-help-action]').length, 3);
    document.querySelector('[data-help-action="explain"]').click(); await tick();
    assert.equal(document.querySelector('#question-help').open, true);
    assert.equal(document.querySelector('#tutor-part').value, '1');
    assert.match(document.querySelector('#tutor-message').value, /step 1/);
    document.querySelector('[data-help-action="check-reasoning"]').click(); await tick();
    assert.equal(document.querySelector('#tutor-mode').value, 'check-reasoning');
    assert.equal(document.activeElement.id, 'tutor-message');
    assert.equal(calls.filter(call => /\/(tutor|answer)$/.test(call.path)).length, 0);
    assert.equal(ctx.state.summary.points, 0);
  } finally { ctx.state.routeVersion++; dom.window.close(); globalThis.document = oldDocument; globalThis.FormData = oldFormData; }
});
