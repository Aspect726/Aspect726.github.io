import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createSQLiteDB } from '../server/storage.mjs';
import { createManagement } from '../server/management.mjs';
import { renderTeacher } from '../public/teacher.mjs';

async function fixture(date = '2026-11-10T20:00:00Z') {
  const db = createSQLiteDB();
  db.migrate();
  for (const file of ['0002_platform.sql', '0003_management.sql']) await db.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  for (const [id, name, role] of [['teacher', 'Teacher', 'parent'], ['student', 'Sahil', 'student'], ['other', 'Other', 'student']]) await db.prepare('INSERT INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind(id, id, name, role, 'not-used', '2026-11-07T12:00:00Z').run();
  const service = createManagement({ db, clock: () => new Date(date) });
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
      assert.doesNotMatch(document.body.textContent, /\b(?:undefined|NaN|lorem)\b|\[object Object\]/i, route);
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
    await f.render('/t/rewards');
    document.getElementById('dailyTarget').value = '25'; document.getElementById('bonusFirst').value = '12'; document.getElementById('bonusStep').value = '8';
    await f.submit('program-form');
    const program = await f.db.prepare('SELECT * FROM platform_program WHERE student_id=?').bind('student').first();
    assert.equal(program.daily_target, 20, 'today stays at twenty');
    assert.equal(program.effective_date, '2026-11-11');
    assert.deepEqual(JSON.parse(program.pending_settings), { dailyTarget: 25, bonusFirst: 12, bonusStep: 8 });
    await f.render('/t/rewards'); assert.equal(document.getElementById('dailyTarget').value, '25', 'pending rule remains visible');
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


test('daily record includes missing dates and teacher note saves for the selected learner',async()=>{
 const f=await fixture();
 try {
  await f.render('/t/dashboard');
  assert.match(document.querySelector('.teacher-today').textContent,/Today’s goal0 \/ 20/);
  assert.match(document.querySelector('.teacher-backlog-hero').textContent,/80 questions behind/);
  assert.match(document.querySelector('.teacher-backlog-hero').textContent,/60 overdue from earlier days/);
  assert.match(document.getElementById('teacher-progress-update').value,/Questions behind: 80 — 60 overdue from earlier days \+ 20 left today/);
  assert.equal(document.querySelectorAll('#teacher-note').length,1);
  document.getElementById('teacher-note-text').value='Draw a picture before finding the answer.';
  await f.submit('teacher-note');
  await f.render('/t/dashboard');assert.equal(document.getElementById('teacher-note-text').value,'Draw a picture before finding the answer.');
  await f.render('/t/students/student?section=days');
  assert.equal(document.querySelectorAll('tbody tr').length,70);
  assert.match(document.body.textContent,/Past due/);assert.match(document.body.textContent,/Coming up/);
 }finally{f.close();}
});

test('one-student dashboard exposes the same backlog and copyable report as the API',async()=>{
 const f=await fixture('2026-11-14T20:00:00Z');
 const originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 try {
  await f.render('/t/dashboard');
  const expected=await f.ctx.api('/v2/teacher/progress-summary?studentId=student');
  assert.equal(document.querySelector('h1').textContent,'Sahil’s learning');
  assert.match(document.querySelector('.teacher-backlog-hero').textContent,/160 questions behind/);
  assert.match(document.querySelector('.teacher-backlog-hero').textContent,/140 overdue from earlier days/);
  const field=document.getElementById('teacher-progress-update');
  assert.equal(field.value,expected.progressReport.text);
  assert.match(field.value,/Questions behind: 160/);
  assert.equal(document.querySelectorAll('#teacher-note').length,1);
  assert.equal(document.querySelectorAll('.teacher-actions>a').length,3);
  assert.equal(document.querySelector('.teacher-share-update').open,false,'report is secondary');
  let copied;
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async text=>{copied=text;}}}});
  document.getElementById('copy-progress-update').click();
  await until(()=>document.getElementById('progress-copy-status').textContent.includes('copied'));
  assert.equal(copied,expected.progressReport.text);
  assert.equal(f.requests.filter(r=>r.method!=='GET').length,0,'copying does not send or write a report');
  document.getElementById('refresh-progress-update').click();
  assert.deepEqual(f.nav,['/t/dashboard']);
  await f.render('/t/plan');
  assert.equal(document.querySelector('.teacher-progress-ribbon'),null,'curriculum is not blocked by a progress ribbon');
  assert.equal(document.querySelectorAll('.curriculum-week').length,10);
  assert.equal(document.querySelectorAll('.curriculum-days>li').length,70);
 } finally {
  if(originalNavigator)Object.defineProperty(globalThis,'navigator',originalNavigator);else delete globalThis.navigator;
  f.close();
 }
});

test('report copy fallback selects the update and download exports its exact text',async()=>{
 const f=await fixture();
 const originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const create=URL.createObjectURL,revoke=URL.revokeObjectURL;
 try {
  await f.render('/t/dashboard');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async()=>{throw new Error('Unavailable');}}}});
  const field=document.getElementById('teacher-progress-update');
  document.getElementById('copy-progress-update').click();
  await until(()=>document.getElementById('progress-copy-status').textContent.includes('selected'));
  assert.equal(document.activeElement,field);
  assert.equal(field.selectionStart,0);assert.equal(field.selectionEnd,field.value.length);
  let exported,download;
  URL.createObjectURL=blob=>{exported=blob;return 'blob:report';};URL.revokeObjectURL=()=>{};
  f.dom.window.HTMLAnchorElement.prototype.click=function(){download={name:this.download,url:this.href};};
  document.getElementById('download-progress-update').click();
  assert.equal(await exported.text(),field.value+'\n');
  assert.equal(download.name,'Sahil-math-update-2026-11-10.txt');assert.equal(download.url,'blob:report');
 }finally{
  if(originalNavigator)Object.defineProperty(globalThis,'navigator',originalNavigator);else delete globalThis.navigator;
  URL.createObjectURL=create;URL.revokeObjectURL=revoke;f.close();
 }
});

test('curriculum date editor previews, cancels and applies dates without changing saved work',async()=>{
 const f=await fixture();
 try{
  await f.render('/t/plan?week=2');
  assert.equal(document.querySelectorAll('.curriculum-week[open]').length,1);
  assert.equal(document.querySelector('.curriculum-week[open]').id,'week-2');
  const input=document.getElementById('week-start-2');
  const original=input.value;
  document.querySelector('[data-date-nudge="7"][data-week="2"]').click();
  assert.equal(input.value,'2026-11-21');
  await f.submit('week-date-form-2');
  assert.match(document.getElementById('date-preview-2').textContent,/9 weeks move 7 days later/);
  let p=await f.db.prepare("SELECT week_offsets FROM platform_program WHERE student_id='student'").first();
  assert.deepEqual(JSON.parse(p.week_offsets),[],'preview makes no schedule mutation');
  document.querySelector('[data-cancel-dates]').click();
  assert.equal(input.value,original);
  assert.equal(document.getElementById('date-preview-2').hidden,true);
  input.value='2026-11-17';
  await f.submit('week-date-form-2');
  document.querySelector('[data-apply-dates]').click();
  await until(()=>f.nav.length===1);
  p=await f.db.prepare("SELECT week_offsets FROM platform_program WHERE student_id='student'").first();
  assert.deepEqual(JSON.parse(p.week_offsets),[0,3,3,3,3,3,3,3,3,3]);
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM practice_ledger').first()).n,0,'dates do not create points');
 }finally{f.close();}
});

test('curriculum downloads are pinned reviewed materials and carry the selected student',async()=>{
 const f=await fixture();
 try{
  f.state.studentId='other';
  await f.render('/t/plan?week=4');
  const downloads=[...document.querySelectorAll('[data-download-week]')];
  assert.equal(downloads.length,10);
  assert.ok(downloads.every(button=>new URL(button.dataset.downloadUrl,'https://example.test').searchParams.get('studentId')==='other'));
  const pdfs=[...document.querySelectorAll('a[href$=".pdf"]')];
  assert.equal(pdfs.length,82);
  assert.ok(pdfs.every(link=>link.href.includes('604a82807488885cc5db31f6b1504b27b48076e1')));
  assert.match(document.getElementById('week-4').textContent,/Thanksgiving/);
  assert.doesNotMatch(document.body.innerHTML,/paper_questions\.json|Day_01_Sat_Nov7%202/);
 }finally{f.close();}
});
