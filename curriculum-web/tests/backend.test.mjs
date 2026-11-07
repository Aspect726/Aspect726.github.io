import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/backend.mjs';
import { createSQLiteDB } from '../server/storage.mjs';

async function fixture({ path = ':memory:', production = false, questionPool = null, backupStore = null } = {}) {
  const db = createSQLiteDB(path); db.migrate();
  let date = new Date('2026-11-07T18:00:00Z');
  const app = createApp({ db, clock: () => date, production, questionPool, backupStore, assets: { '/index.html': '<h1>Sign in</h1>', '/app.js': 'client only' }, logger: { error: error => { throw error; } } });
  async function call(path, body, cookie, method = body === undefined ? 'GET' : 'POST', headers = {}) {
    const request = new Request(`https://practice.test/api${path}`, { method, headers: { ...(body === undefined ? {} : { 'content-type': 'application/json', origin: 'https://practice.test' }), ...(cookie ? { cookie } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const response = await app.fetch(request);
    return { status: response.status, value: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
  }
  const parent = await call('/setup', { username: 'parent', name: 'Parent', password: 'parent-pass' }, null, 'POST', production ? { 'oai-authenticated-user-id': 'owner' } : {});
  assert.equal(parent.status, 200, JSON.stringify(parent.value));
  const created = await call('/parent/accounts', { username: 'learner', name: 'Learner', password: '1234', role: 'student' }, parent.cookie);
  assert.equal(created.status, 201, JSON.stringify(created.value));
  const login = await call('/login', { username: 'learner', password: '1234', remember: true });
  assert.equal(login.status, 200);
  async function rawQuestion(runId) {
    const row = await db.prepare('SELECT state FROM practice_runs WHERE id = ?').bind(runId).first();
    const state = JSON.parse(row.state); return state.queue[state.cursor];
  }
  async function answer(runId, answerText, requestId = crypto.randomUUID()) {
    const raw = await rawQuestion(runId);
    return call(`/runs/${runId}/answer`, { questionId: raw.id, answer: answerText ?? (raw.q.choices ? `option-${raw.q.choices.findIndex(c => String(c.value) === String(raw.q.answer))}` : raw.q.answer), elapsedMs: 1234, requestId }, login.cookie);
  }
  async function finish(runView, misses = 0) {
    let current = runView, wrong = misses;
    while (!current.done) {
      const raw = await rawQuestion(current.id);
      if (!raw.waiting) {
        if (wrong > 0 && raw.twin === 0) { const response = await answer(current.id, 'definitely not an answer'); assert.equal(response.status, 200); wrong--; }
        const response = await answer(current.id); assert.equal(response.status, 200, JSON.stringify(response.value));
      }
      const result = await call(`/runs/${current.id}/next`, { questionId: raw.id }, login.cookie);
      assert.equal(result.status, 200, JSON.stringify(result.value)); current = result.value;
    }
    return current;
  }
  return { app, db, call, parent, learner: created.value.user, login, answer, finish, rawQuestion, setDate: value => { date = new Date(value); } };
}

test('first setup, role isolation, password reset, persistent sessions and public-source denial', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'practice-'));
  const path = join(dir, 'progress.sqlite');
  const f = await fixture({ path });
  try {
    assert.equal((await f.call('/session')).value.setupRequired, false);
    assert.equal((await f.call('/setup', { username: 'second', password: 'password2' })).status, 409);
    for (const route of ['/today', '/weeks', '/prizes', '/parent/settings', '/parent/overview']) assert.equal((await f.call(route)).status, 401);
    for (const route of ['/parent/settings', '/parent/overview', '/parent/skills', '/parent/backup', '/parent/prizes']) assert.equal((await f.call(route, undefined, f.login.cookie)).status, 403);
    for (const route of ['/server/backend.mjs', '/public/data/course.json', '/private/vetted-seeds.json', '/resources/packets/a.pdf']) assert.equal((await f.app.fetch(new Request(`https://practice.test${route}`))).status, 404);
    assert.equal((await f.call('/parent/accounts', { username: 'mother', password: 'another-pass', role: 'parent', name: 'Mother' }, f.parent.cookie)).status, 201);
    assert.equal((await f.call('/parent/accounts', { username: 'otherchild', password: '1234', role: 'student' }, f.parent.cookie)).status, 409);
    assert.equal((await f.call('/parent/settings', { paused: true }, f.parent.cookie, 'PATCH', { origin: 'https://elsewhere.test' })).status, 403);
    assert.equal((await f.call(`/parent/accounts/${f.learner.id}/password`, { password: '5678' }, f.parent.cookie)).status, 200);
    assert.equal((await f.call('/today', undefined, f.login.cookie)).status, 401);
    const newSession = await f.call('/login', { username: 'learner', password: '5678', remember: true });
    assert.equal(newSession.status, 200);
    assert.match(newSession.headers.get('set-cookie'), /HttpOnly; SameSite=Strict; Max-Age=2592000/);
    f.db.close();
    const reopened = createSQLiteDB(path); reopened.migrate();
    const app = createApp({ db: reopened, clock: () => new Date('2026-11-08T18:00:00Z') });
    const response = await app.fetch(new Request('https://practice.test/api/session', { headers: { cookie: newSession.cookie } }));
    assert.equal((await response.json()).user.username, 'learner');
    reopened.close();
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('server-only answers, atomic attempts, two misses and a fresh replacement twin', async () => {
  const f = await fixture();
  try {
    const started = await f.call('/runs', { dayIndex: 0, kind: 'required' }, f.login.cookie);
    assert.equal(started.status, 200, JSON.stringify(started.value));
    assert.equal(started.value.total, 20);
    const q = started.value.question;
    for (const field of ['answer', 'seed', 'hints', 'hint', 'solution', 'signature']) assert.equal(field in q, false);
    const id = started.value.id;
    const original = await f.rawQuestion(id);
    const requestId = crypto.randomUUID();
    const repeated = await Promise.all([f.answer(id, 'not sure', requestId), f.answer(id, 'not sure', requestId)]);
    assert.equal(repeated[0].status, 200); assert.deepEqual(repeated[0].value, repeated[1].value);
    assert.equal(repeated[0].value.revealed, undefined);
    assert.equal(repeated[0].value.run.question.tries, 1);
    const second = await f.answer(id, 'not sure');
    assert.equal(second.value.revealed, true);
    assert.ok(second.value.solution.length >= 3);
    const state = JSON.parse((await f.db.prepare('SELECT state FROM practice_runs WHERE id = ?').bind(id).first()).state);
    assert.equal(state.queue.length, 21);
    assert.equal(state.queue.at(-1).q.skill, original.q.skill);
    assert.notEqual(state.queue.at(-1).q.signature, original.q.signature);
    assert.equal(state.slots[0].firstTryCorrect, false);
    const resumed = await f.call(`/runs/${id}`, undefined, f.login.cookie);
    assert.deepEqual(resumed.value.question.feedback.solution, second.value.solution);
    const next = await f.call(`/runs/${id}/next`, { questionId: original.id }, f.login.cookie);
    const complete = await f.finish(next.value);
    assert.equal(complete.done, true); assert.equal(complete.completed, 20); assert.equal(complete.firstTryCorrect, 19); assert.equal(complete.pointsEarned, 0);
    const overview = await f.call('/parent/overview', undefined, f.parent.cookie);
    assert.equal(overview.value.misses.length, 2);
    assert.equal(overview.value.misses[0].answer, 'not sure');
    assert.ok(overview.value.misses[0].rightAnswer.length > 0);
    assert.doesNotMatch(overview.value.misses[0].rightAnswer, /^(option-|method-)/);
    assert.equal((await f.call('/today', undefined, f.login.cookie)).value.bonus.available, true);
  } finally { f.db.close(); }
});

test('bonus threshold, daily limit, prize approvals, ledger idempotency and calendar shift', async () => {
  const f = await fixture();
  try {
    assert.equal((await f.call('/runs', { dayIndex: 0, kind: 'bonus' }, f.login.cookie)).status, 403);
    assert.equal((await f.call('/runs', { dayIndex: 1, kind: 'required' }, f.login.cookie)).status, 403);
    const required = await f.call('/runs', { dayIndex: 0, kind: 'required' }, f.login.cookie);
    await f.finish(required.value);
    const first = await f.call('/runs', { dayIndex: 0, kind: 'bonus' }, f.login.cookie);
    assert.equal(first.value.total, 15);
    const firstDone = await f.finish(first.value, 3);
    assert.equal(firstDone.firstTryCorrect, 12); assert.equal(firstDone.pointsEarned, 1);
    const second = await f.call('/runs', { dayIndex: 0, kind: 'bonus' }, f.login.cookie);
    assert.equal(second.value.total, 10);
    const secondDone = await f.finish(second.value, 3);
    assert.equal(secondDone.pointsEarned, 0);
    await f.call('/parent/settings', { bonusLimit: 2 }, f.parent.cookie, 'PATCH');
    assert.equal((await f.call('/runs', { dayIndex: 0, kind: 'bonus' }, f.login.cookie)).status, 403);
    const prize = (await f.call('/parent/prizes', { name: 'Choose dinner', cost: 1 }, f.parent.cookie)).value.prize;
    await f.call(`/prizes/${prize.id}/request`, {}, f.login.cookie);
    const prizeRequest = (await f.call('/prizes', undefined, f.login.cookie)).value.requests[0];
    const approved = await Promise.all([f.call(`/parent/requests/${prizeRequest.id}`, { action: 'approve' }, f.parent.cookie), f.call(`/parent/requests/${prizeRequest.id}`, { action: 'approve' }, f.parent.cookie)]);
    approved.forEach(r => assert.equal(r.status, 200));
    let points = (await f.call('/prizes', undefined, f.login.cookie)).value;
    assert.equal(points.points, 0); assert.equal(points.history.filter(x => x.kind === 'prize').length, 1);
    const adjustment = { amount: 3, note: 'Parent correction', requestId: crypto.randomUUID() };
    await f.call('/parent/points', adjustment, f.parent.cookie); await f.call('/parent/points', adjustment, f.parent.cookie);
    points = (await f.call('/prizes', undefined, f.login.cookie)).value;
    assert.equal(points.points, 3);
    assert.equal((await f.call('/parent/points', { amount: -4, note: 'Correction', requestId: crypto.randomUUID() }, f.parent.cookie)).status, 409);
    await f.call('/parent/settings', { startDate: '2026-11-06' }, f.parent.cookie, 'PATCH');
    const today = (await f.call('/today', undefined, f.login.cookie)).value;
    assert.equal(today.day.dayIndex, 1);
    assert.equal((await f.call('/runs', { dayIndex: 0, kind: 'bonus' }, f.login.cookie)).status, 403);
    const calendar = (await f.call('/weeks', undefined, f.login.cookie)).value.days;
    assert.equal(calendar[0].date, '2026-11-06'); assert.equal(calendar[0].status, 'done');
    await f.call('/parent/settings', { startDate: '2026-11-09' }, f.parent.cookie, 'PATCH');
    assert.equal((await f.call(`/runs/${required.value.id}`, undefined, f.login.cookie)).status, 403);
    assert.equal((await f.call('/weeks', undefined, f.login.cookie)).value.days[0].run, null);
    assert.equal((await f.call(`/runs/${required.value.id}/next`, { questionId: 'old' }, f.login.cookie)).status, 403);
    await f.call('/parent/settings', { startDate: '2026-11-06' }, f.parent.cookie, 'PATCH');
    await f.call('/parent/settings', { paused: true }, f.parent.cookie, 'PATCH');
    assert.equal((await f.call('/runs', { dayIndex: 1, kind: 'required' }, f.login.cookie)).status, 409);
    assert.equal((await f.call('/parent/settings', { startDate: '2026-99-99' }, f.parent.cookie, 'PATCH')).status, 400);
  } finally { f.db.close(); }
});

test('production setup gate, secure cookies, release bank gate, login limit and external backup', async () => {
  const writes = [];
  const f = await fixture({ production: true, backupStore: { put: async (...args) => { writes.push(args); } } });
  try {
    assert.match(f.login.headers.get('set-cookie'), /Secure/);
    assert.equal((await f.call('/runs', { dayIndex: 0, kind: 'required' }, f.login.cookie)).status, 503);
    for (let i = 0; i < 8; i++) assert.equal((await f.call('/login', { username: 'unknown', password: 'bad' })).status, 401);
    assert.equal((await f.call('/login', { username: 'unknown', password: 'bad' })).status, 429);
    const backup = await f.call('/parent/backup', {}, f.parent.cookie);
    assert.equal(backup.status, 200); assert.equal(writes.length, 1); assert.match(writes[0][0], /practice-backups\/2026-11-07.json/);
    const exportData = JSON.parse(writes[0][1]);
    assert.equal(exportData.tables.practice_users.length, 2);
    assert.equal('practice_sessions' in exportData.tables, false);
  } finally { f.db.close(); }
});
