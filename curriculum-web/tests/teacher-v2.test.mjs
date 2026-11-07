import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createSQLiteDB } from '../server/storage.mjs';
import { createManagement } from '../server/management.mjs';
import { renderTeacher } from '../public/teacher.mjs';

async function fixture() {
  const db = createSQLiteDB();
  db.migrate();
  for (const file of ['0002_platform.sql', '0003_management.sql']) await db.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  for (const [id, name, role] of [['teacher', 'Teacher', 'parent'], ['student', 'Sahil', 'student'], ['other', 'Other', 'student']]) await db.prepare('INSERT INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind(id, id, name, role, 'not-used', '2026-11-07T12:00:00Z').run();
  const service = createManagement({ db, clock: () => new Date('2026-11-10T20:00:00Z') });
  const dom = new JSDOM('<main id="app"></main>', { url: 'https://example.test/t/dashboard' });
  const oldDocument = globalThis.document, oldFormData = globalThis.FormData;
  globalThis.document = dom.window.document; globalThis.FormData = dom.window.FormData;
  const nav = [], notices = [], requests = [];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { studentId: 'student' };
  const ctx = { state, escape, mathMarkup: (value, trusted) => trusted ? String(value) : escape(value), navigate: async path => { nav.push(path); }, tell: (text, error) => notices.push({ text, error }), shell: html => { document.getElementById('app').innerHTML = html; }, api: async (path, body, method = body === undefined ? 'GET' : 'POST') => {
    requests.push({ path, body, method });
    const response = await service.handle(new Request(`https://example.test/api${path}`, { method, ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) }), { id: 'teacher', role: 'teacher' });
    assert.ok(response, `API route exists: ${path}`);
    const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
  }};
  const render = path => renderTeacher(path, ctx);
  const submit = async id => {
    const form = document.getElementById(id);
    assert.ok(form, `${id} exists`);
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await until(() => form.dataset.saving !== 'true');
  };
  return { db, dom, ctx, state, nav, requests, notices, render, submit, close() { dom.window.close(); db.close(); globalThis.document = oldDocument; globalThis.FormData = oldFormData; } };
}
async function until(predicate) { const start = Date.now(); while (!predicate()) { if (Date.now() - start > 5000) assert.fail('UI action did not settle'); await new Promise(resolve => setTimeout(resolve, 2)); } }

test('teacher routes render against real management API and preserve selected student', async () => {
  const f = await fixture();
  try {
    for (const route of ['/t/dashboard', '/t/students/student', '/t/students/student?section=days', '/t/students/student?section=skills', '/t/students/student?section=patterns', '/t/plan', '/t/checks', '/t/assign', '/t/rewards', '/t/questions', '/t/settings']) {
      await f.render(route);
      assert.ok(document.querySelector('h1'), route);
      assert.doesNotMatch(document.body.textContent, /undefined|\[object Object\]|NaN|lorem/i, route);
    }
    await f.render('/t/questions');
    assert.equal(document.querySelectorAll('.question-preview').length, 10, 'first skill loads ten actual previews');
    const previews = document.querySelectorAll('.question-preview');
    assert.ok(previews[0].querySelector('.question-prompt').textContent.length > 4);
    assert.ok(previews[0].querySelector('details').textContent.includes('Answer'));
  } finally { f.close(); }
});

test('teacher saves paper scores and next-day rules through forms', async () => {
  const f = await fixture();
  try {
    await f.render('/t/checks');
    document.getElementById('check-week').value = '2'; document.getElementById('score').value = '11'; document.getElementById('check-note').value = 'Revisit fractions.';
    await f.submit('check-form');
    const score = await f.db.prepare('SELECT * FROM platform_weekly_checks WHERE student_id=?').bind('student').first();
    assert.equal(score.score, 11); assert.equal(score.week, 2); assert.equal(score.note, 'Revisit fractions.');
    await f.render('/t/checks'); assert.match(document.body.textContent, /11 \/ 21/);
    await f.render('/t/settings');
    document.getElementById('dailyTarget').value = '25'; document.getElementById('bonusFirst').value = '12'; document.getElementById('bonusStep').value = '8';
    await f.submit('program-form');
    const program = await f.db.prepare('SELECT * FROM platform_program WHERE student_id=?').bind('student').first();
    assert.equal(program.daily_target, 20, 'today stays at twenty');
    assert.equal(program.effective_date, '2026-11-11');
    assert.deepEqual(JSON.parse(program.pending_settings), { dailyTarget: 25, bonusFirst: 12, bonusStep: 8 });
    await f.render('/t/settings'); assert.equal(document.getElementById('dailyTarget').value, '25', 'pending rule remains visible');
    assert.deepEqual(f.notices.filter(n => n.error), []);
  } finally { f.close(); }
});

test('teacher reward approval does not spend points; given action does, and assignment deletion targets selected student', async () => {
  const f = await fixture();
  try {
    await f.db.prepare("INSERT INTO practice_ledger(id,student_id,amount,kind,note,created_at) VALUES('earned','student',10,'bonus','Practice','2026-11-10T20:00:00Z')").run();
    await f.db.prepare("INSERT INTO practice_prizes(id,name,cost,created_at) VALUES('prize','Choose a game',5,'2026-11-10T20:00:00Z')").run();
    await f.db.prepare("INSERT INTO practice_requests(id,student_id,prize_id,prize_name,cost,status,created_at) VALUES('request','student','prize','Choose a game',5,'requested','2026-11-10T20:00:00Z')").run();
    await f.render('/t/rewards'); document.querySelector('[data-action=approve]').click(); await until(() => f.nav.length === 1);
    assert.equal((await f.db.prepare("SELECT SUM(amount) AS n FROM practice_ledger WHERE student_id='student'").first()).n, 10);
    await f.render('/t/rewards'); document.querySelector('[data-action=given]').click(); await until(() => f.nav.length === 2);
    assert.equal((await f.db.prepare("SELECT SUM(amount) AS n FROM practice_ledger WHERE student_id='student'").first()).n, 5);
    f.state.studentId = 'other'; await f.render('/t/assign');
    document.getElementById('count').value = '5'; document.getElementById('startDate').value = '2026-11-11'; document.getElementById('endDate').value = '2026-11-12';
    await f.submit('assignment-form');
    const assignment = await f.db.prepare("SELECT * FROM platform_assignments WHERE student_id='other'").first(); assert.ok(assignment);
    await f.render('/t/assign'); const previous = f.nav.length; document.querySelector('[data-remove-assignment]').click(); await until(() => f.nav.length > previous);
    assert.equal(await f.db.prepare('SELECT id FROM platform_assignments WHERE id=?').bind(assignment.id).first(), null);
    assert.deepEqual(f.notices.filter(n => n.error), []);
  } finally { f.close(); }
});

test('an already displayed teacher form stays bound to its student during a switch', async () => {
  const f = await fixture();
  try {
    await f.render('/t/checks');
    // The switcher changes state before the next page's API request completes.
    f.state.studentId = 'other';
    document.getElementById('score').value = '17';
    await f.submit('check-form');
    assert.equal((await f.db.prepare("SELECT score FROM platform_weekly_checks WHERE student_id='student'").first()).score, 17);
    assert.equal(await f.db.prepare("SELECT score FROM platform_weekly_checks WHERE student_id='other'").first(), null);
  } finally { f.close(); }
});
