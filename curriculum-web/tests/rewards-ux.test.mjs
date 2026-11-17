import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createSQLiteDB } from '../server/storage.mjs';
import { createManagement } from '../server/management.mjs';
import { renderTeacher } from '../public/teacher.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
async function fixture() {
  const db = createSQLiteDB(); db.migrate();
  for (const file of ['0002_platform.sql', '0003_management.sql']) await db.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  for (const [id, role] of [['teacher', 'parent'], ['student', 'student']]) await db.prepare('INSERT INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind(id, id, id === 'student' ? 'Sahil' : 'Teacher', role, 'not-used', '2026-11-07T12:00:00Z').run();
  const service = createManagement({ db, clock: () => new Date('2026-11-17T20:00:00Z') });
  const dom = new JSDOM('<main id="app"></main>', { url: 'https://practice.test/t/rewards' });
  const old = { document: globalThis.document, FormData: globalThis.FormData };
  globalThis.document = dom.window.document; globalThis.FormData = dom.window.FormData;
  const navigations = [], writes = [];
  const ctx = {
    state: { studentId: 'student' }, escape, mathMarkup: escape,
    shell: html => { document.getElementById('app').innerHTML = html; },
    navigate: path => { navigations.push(path); }, tell: () => {},
    api: async (path, body, method = body === undefined ? 'GET' : 'POST') => {
      if (method !== 'GET') writes.push({ path, body, method });
      const response = await service.handle(new Request(`https://practice.test/api${path}`, { method, ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) }), { id: 'teacher', role: 'teacher' });
      assert.ok(response, path); const data = await response.json();
      if (!response.ok) throw new Error(data.error); return data;
    }
  };
  return { db, dom, ctx, navigations, writes, render: () => renderTeacher('/t/rewards', ctx), close() { dom.window.close(); db.close(); globalThis.document = old.document; globalThis.FormData = old.FormData; } };
}
async function until(predicate) {
  const start = Date.now();
  while (!predicate()) { if (Date.now() - start > 5000) assert.fail('UI action did not settle'); await new Promise(resolve => setTimeout(resolve, 2)); }
}

test('rewards rules show a live numerical example without silently changing active points', async () => {
  const f = await fixture();
  try {
    await f.render();
    assert.equal(document.querySelector('h1').textContent, 'Points & rewards');
    assert.match(document.querySelector('.points-rule-steps').textContent, /35 total answers today/);
    assert.match(document.querySelector('.points-overlap-note').textContent, /Catch-up answers can earn points too/);
    assert.match(document.getElementById('points-rule-example').textContent, /35, 45 and 55/);
    document.getElementById('dailyTarget').value = '25';
    document.getElementById('bonusFirst').value = '12';
    document.getElementById('bonusStep').value = '8';
    document.getElementById('bonusStep').dispatchEvent(new f.dom.window.Event('input', { bubbles: true }));
    assert.match(document.getElementById('points-rule-example').textContent, /37, 45 and 53/);
    assert.match(document.querySelector('.points-rule-steps').textContent, /35 total answers today/, 'active rules are separate from the unsaved preview');
    assert.equal(f.writes.length, 0, 'editing an example has no server effect');
    const form = document.getElementById('program-form');
    form.dispatchEvent(new f.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await until(() => form.dataset.saving !== 'true');
    const stored = await f.db.prepare('SELECT * FROM platform_program WHERE student_id=?').bind('student').first();
    assert.equal(stored.daily_target, 20);
    assert.equal(stored.effective_date, '2026-11-18');
    assert.deepEqual(JSON.parse(stored.pending_settings), { dailyTarget: 25, bonusFirst: 12, bonusStep: 8 });
    assert.equal(f.writes[0].body.studentId, 'student');
    await f.render();
    assert.equal(document.querySelector('.reward-settings-disclosure').open, true);
    assert.match(document.querySelector('.reward-settings-disclosure .notice-inline').textContent, /Nov 18/);
    assert.match(document.querySelector('.points-rule-steps').textContent, /35 total answers today/);
    assert.match(document.getElementById('points-rule-example').textContent, /37, 45 and 53/);
  } finally { f.close(); }
});

test('pending prize actions are visible while secondary editing stays collapsed and accessible', async () => {
  const f = await fixture();
  try {
    await f.db.prepare("INSERT INTO practice_prizes(id,name,cost,created_at) VALUES('p','Choose a game',5,'2026-11-17T20:00:00Z')").run();
    await f.db.prepare("INSERT INTO practice_requests(id,student_id,prize_id,prize_name,cost,status,created_at) VALUES('r','student','p','Choose a game',5,'approved','2026-11-17T20:00:00Z')").run();
    await f.render();
    const give = document.querySelector('[data-action="given"]');
    assert.match(give.textContent, /Give prize & spend 5 points/);
    assert.equal(give.closest('details'), null, 'the action needed now is not buried');
    for (const selector of ['.prize-editor-disclosure', '.reward-add-prize', '.reward-adjust-points', '.reward-history-disclosure']) assert.equal(document.querySelector(selector).open, false, selector);
    for (const id of ['dailyTarget', 'bonusFirst', 'bonusStep', 'prize-name', 'prize-cost', 'amount', 'points-note']) assert.ok(document.querySelector(`label[for="${id}"]`), `visible label for ${id}`);
    document.getElementById('bonusStep').value = '';
    document.getElementById('bonusStep').dispatchEvent(new f.dom.window.Event('input', { bubbles: true }));
    assert.match(document.getElementById('points-rule-example').textContent, /whole number from 1 to 100/);
    assert.doesNotMatch(document.body.textContent, /NaN|undefined/);
  } finally { f.close(); }
});
