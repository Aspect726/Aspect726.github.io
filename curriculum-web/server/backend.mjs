import { createPlatform } from './platform.mjs';
import { createManagement } from './management.mjs';
import { createLearning } from './learning.mjs';
import { hash, compare } from 'bcryptjs';
import { generateQuestion, gradeQuestion, publicQuestion, questionIdentity } from './questions.mjs';
import { buildSlots, dayInfo, pacificDate, SKILLS } from './plan.mjs';

const DEFAULTS = { startDate: '2026-11-07', paused: false, pausedDates: [], bonusLimit: 4, bonusThreshold: 80, bonusPointValue: 1 };
const COOKIE = 'practice_session';
const DAY = 86400000;
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
// Preserve the deployed role encoding while exposing only teacher/student roles.
const accountRole = role => role === 'parent' ? 'teacher' : role;
const storedRole = role => role === 'teacher' ? 'parent' : role;
const safeUser = row => row && ({ id: row.id, username: row.username, name: row.name, role: accountRole(row.role) });
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const dateOffset = (date, n) => new Date(Date.parse(`${date}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const normalizePrompt = text => String(text).toLowerCase().replace(/\s+/g, ' ').trim();
const uuid = () => crypto.randomUUID();
const int = (value, min, max, field) => { if (!Number.isInteger(value) || value < min || value > max) fail(400, `${field} is not valid.`); return value; };
const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
const text = (value, max = 100) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const firstTry = state => state.slots.filter(slot => slot.firstTryCorrect === true).length;
const completed = state => state.slots.filter(slot => slot.done).length;
const plainLabel = label => String(label).replace(/<math\b[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<\/math>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const readableAnswer = (q, answer) => q.choices && /^option-\d+$/.test(answer) ? plainLabel(q.choices[Number(answer.slice(7))]?.label ?? answer) : answer;
const rightAnswer = q => q.choices ? plainLabel(q.choices.find((_, i) => gradeQuestion(q, `option-${i}`).correct)?.label ?? q.answer) : String(q.answer);

export function createApp({ db, assets = {}, clock = () => new Date(), production = false, questionPool = null, backupStore = null, logger = console }) {
  const platform = createPlatform({db, clock, production, questionPool});
  const management = createManagement({db, clock, production, questionPool, platform});
  const learning = createLearning({db, clock, production, questionPool});
  const now = () => new Date(clock());
  const iso = () => now().toISOString();
  const todayDate = () => pacificDate(now());
  const statement = (sql, ...args) => db.prepare(sql).bind(...args);
  const one = (sql, ...args) => statement(sql, ...args).first();
  const all = async (sql, ...args) => (await statement(sql, ...args).all()).results;
  const run = (sql, ...args) => statement(sql, ...args).run();
  const settings = async () => ({ ...DEFAULTS, ...JSON.parse((await one('SELECT value FROM practice_settings WHERE id = 1'))?.value || '{}') });
  const student = () => one("SELECT * FROM practice_users WHERE role = 'student'");
  const balance = async id => Number((await one('SELECT COALESCE(SUM(amount),0) AS amount FROM practice_ledger WHERE student_id = ?', id)).amount);
  const sessionCookie = (token, remember) => `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict${production ? '; Secure' : ''}${remember ? '; Max-Age=2592000' : ''}`;
  const clearedCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${production ? '; Secure' : ''}`;
  async function getUser(request) {
    const token = request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    if (!token || !/^[a-f\d-]{36}$/i.test(token)) return null;
    const user = await one('SELECT u.* FROM practice_users u JOIN practice_sessions s ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > ?', token, now().getTime());
    return user && { ...user, role: accountRole(user.role) };
  }
  async function newSession(user, remember) {
    const token = uuid();
    await run('INSERT INTO practice_sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)', token, user.id, now().getTime() + (remember ? 30 : 1) * DAY, iso());
    return json({ user: safeUser(user) }, 200, { 'set-cookie': sessionCookie(token, remember) });
  }
  function validateAccount(body, role) {
    role = accountRole(role);
    const username = text(body.username, 24).toLowerCase();
    const name = text(body.name || body.username, 32);
    if (!/^[a-z0-9][a-z0-9_-]{1,23}$/.test(username)) fail(400, 'Use 2–24 letters, numbers, underscores or hyphens for the username.');
    if (!name) fail(400, 'Enter a first name or nickname.');
    if (typeof body.password !== 'string' || body.password.length < (role === 'teacher' ? 8 : 4) || body.password.length > 72 || new TextEncoder().encode(body.password).length > 72) fail(400, `Use a password with ${role === 'teacher' ? 8 : 4}–72 characters.`);
    return { username, name };
  }
  async function readBody(request) {
    if (!request.headers.get('content-type')?.startsWith('application/json')) fail(415, 'Send JSON.');
    if (Number(request.headers.get('content-length')) > 16384) fail(413, 'That request is too large.');
    const reader = request.body?.getReader();
    if (!reader) fail(400, 'Send a request body.');
    const chunks = []; let size = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 16384) { await reader.cancel(); fail(413, 'That request is too large.'); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const raw = new TextDecoder().decode(bytes);
    try { const value = JSON.parse(raw); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(); return value; }
    catch { fail(400, 'That request could not be read.'); }
  }
  function info(dayIndex, s) {
    const value = dayInfo(dayIndex, s.startDate);
    return { ...value, dayIndex, date: dateOffset(s.startDate, dayIndex) };
  }
  const currentIndex = s => Math.floor((Date.parse(`${todayDate()}T12:00:00Z`) - Date.parse(`${s.startDate}T12:00:00Z`)) / DAY);
  const paused = s => s.paused || s.pausedDates.includes(todayDate());
  function assertRunAccessible(row, s, writing = false) {
    if (row.day_index > currentIndex(s)) fail(403, 'That day is ahead.');
    if (row.kind === 'bonus' && row.day_index !== currentIndex(s)) fail(403, 'That bonus round has ended for today.');
    if (writing && paused(s)) fail(409, 'Practice is paused today.');
  }
  function view(row) {
    const state = typeof row.state === 'string' ? JSON.parse(row.state) : row.state;
    const item = state.queue[state.cursor];
    return { id: row.id, dayIndex: row.day_index, kind: row.kind, round: row.round,
      total: state.slots.length, completed: completed(state), firstTryCorrect: firstTry(state), done: Boolean(row.done), pointsEarned: state.pointsEarned || 0,
      question: row.done || !item ? null : { ...publicQuestion(item.q), id: item.id, number: Math.min(completed(state) + (item.waiting && item.feedback?.correct ? 0 : 1), state.slots.length), tries: item.tries, feedback: item.feedback || null, awaitingNext: Boolean(item.waiting) } };
  }
  async function recentQuestions(userId, date) {
    const rows = await all('SELECT signature,plain_prompt FROM practice_questions WHERE student_id = ? AND date >= ?', userId, dateOffset(date, -14));
    return { signatures: new Set(rows.map(q => q.signature)), prompts: new Set(rows.map(q => normalizePrompt(q.plain_prompt))) };
  }
  function freshQuestion(skill, seed, difficulty, exclusion) {
    const pool = questionPool?.skills?.[skill]?.[String(difficulty)];
    if (questionPool && !pool?.length) fail(503, 'This skill needs its checked question bank.');
    let hashSeed = 2166136261;
    for (const char of seed) hashSeed = Math.imul(hashSeed ^ char.charCodeAt(0), 16777619);
    const start = (hashSeed >>> 0) % (pool?.length || 2000);
    for (let offset = 0; offset < (pool?.length || 2000); offset++) {
      const candidate = pool ? pool[(start + offset) % pool.length] : `${seed}:${offset}`;
      const q = generateQuestion(skill, candidate, { difficulty });
      const signature = q.signature || `${q.skill}:${(q.numbers || []).map(String).sort().join(',')}`;
      const plain = normalizePrompt(questionIdentity(q));
      if (exclusion.signatures.has(signature) || exclusion.prompts.has(plain)) continue;
      exclusion.signatures.add(signature); exclusion.prompts.add(plain);
      return { ...q, signature };
    }
    fail(503, 'This skill needs more new questions. Ask a teacher to review it.');
  }
  async function ownedRun(id, user) {
    const row = await one('SELECT * FROM practice_runs WHERE id = ? AND student_id = ?', id, user.id);
    if (!row) fail(404, 'That set was not found.');
    return row;
  }
  async function startRun(user, body, retry = 0) {
    if (production && !questionPool) fail(503, 'The checked question bank is not ready.');
    const s = await settings();
    const dayIndex = int(body.dayIndex, 0, 69, 'Day');
    const kind = body.kind === 'bonus' ? 'bonus' : body.kind === 'required' ? 'required' : fail(400, 'Choose a required or bonus set.');
    const index = currentIndex(s);
    if (dayIndex > index) fail(403, 'That day is ahead.');
    if (paused(s)) fail(409, 'Practice is paused today.');
    let round = 0;
    if (kind === 'bonus') {
      if (dayIndex !== index) fail(403, 'Bonus rounds are only for today.');
      const required = await one("SELECT done FROM practice_runs WHERE student_id = ? AND day_index = ? AND kind = 'required'", user.id, dayIndex);
      if (!required?.done) fail(403, 'Finish today’s 20 first.');
      const active = await one("SELECT * FROM practice_runs WHERE student_id = ? AND day_index = ? AND kind = 'bonus' AND done = 0", user.id, dayIndex);
      if (active) return view(active);
      round = Number((await one("SELECT COUNT(*) AS count FROM practice_runs WHERE student_id = ? AND day_index = ? AND kind = 'bonus'", user.id, dayIndex)).count) + 1;
      if (round > s.bonusLimit) fail(403, 'You have finished today’s bonus rounds.');
    }
    const existing = await one('SELECT * FROM practice_runs WHERE student_id = ? AND day_index = ? AND kind = ? AND round = ?', user.id, dayIndex, kind, round);
    if (existing) return view(existing);
    const date = todayDate();
    const slots = buildSlots(dayIndex, kind, Math.max(0, round - 1)).map(slot => ({ ...slot, firstTryCorrect: null, done: false }));
    const exclusion = await recentQuestions(user.id, date);
    const id = uuid();
    const queue = slots.map((slot, index) => ({ id: uuid(), slot: index, tries: 0, twin: 0, q: freshQuestion(slot.skill, `${user.id}:${date}:${dayIndex}:${kind}:${round}:${index}`, slot.difficulty, exclusion) }));
    const state = { slots, queue, cursor: 0, pointsEarned: 0, bonusThreshold: s.bonusThreshold, bonusPointValue: s.bonusPointValue };
    try {
      await db.batch([
        statement('INSERT INTO practice_runs(id,student_id,day_index,kind,round,date,state,created_at) VALUES(?,?,?,?,?,?,?,?)', id, user.id, dayIndex, kind, round, date, JSON.stringify(state), iso()),
        ...queue.map(item => statement('INSERT INTO practice_questions(id,student_id,run_id,signature,plain_prompt,date) VALUES(?,?,?,?,?,?)', item.id, user.id, id, item.q.signature, questionIdentity(item.q), date))
      ]);
    } catch (error) {
      const concurrent = await one('SELECT * FROM practice_runs WHERE student_id = ? AND day_index = ? AND kind = ? AND round = ?', user.id, dayIndex, kind, round);
      if (concurrent) return view(concurrent);
      if (retry < 5 && /UNIQUE|constraint|question_repeat/i.test(error.message)) return startRun(user, body, retry + 1);
      throw error;
    }
    return view(await ownedRun(id, user));
  }
  async function answerRun(user, id, body, retry = 0) {
    const requestId = text(body.requestId, 100);
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) fail(400, 'The answer needs a request ID.');
    const attemptId = `${user.id}:${requestId}`;
    const prior = await one('SELECT result,run_id,question_id FROM practice_attempts WHERE id = ? AND student_id = ?', attemptId, user.id);
    if (prior) { if (prior.run_id !== id || prior.question_id !== body.questionId) fail(409, 'That request ID belongs to another answer.'); return JSON.parse(prior.result); }
    const row = await ownedRun(id, user);
    const s = await settings();
    assertRunAccessible(row, s, true);
    if (row.done) fail(409, 'That set is finished.');
    const state = JSON.parse(row.state), item = state.queue[state.cursor];
    if (!item || item.id !== body.questionId || item.waiting) fail(409, 'This question has changed. Open the set again.');
    const answer = text(body.answer, 200);
    if (!answer) fail(400, 'Enter an answer first.');
    const elapsed = int(Math.round(Number(body.elapsedMs) || 0), 0, 1800000, 'Time');
    const result = gradeQuestion(item.q, answer);
    const tryNumber = item.tries + 1;
    let twin;
    if (!result.formOnly) {
      item.tries++;
      if (item.twin === 0 && item.tries === 1) state.slots[item.slot].firstTryCorrect = Boolean(result.correct);
      if (result.correct) { state.slots[item.slot].done = true; item.waiting = true; }
      else if (item.tries === 2) {
        item.waiting = true;
        const exclusion = await recentQuestions(user.id, todayDate());
        const slot = state.slots[item.slot];
        twin = { id: uuid(), slot: item.slot, twin: item.twin + 1, tries: 0,
          q: freshQuestion(slot.skill, `${item.q.seed}:twin:${item.twin + 1}`, slot.difficulty, exclusion) };
        state.queue.push(twin);
      }
    }
    item.feedback = { correct: Boolean(result.correct), formOnly: Boolean(result.formOnly),
      ...(result.correct ? {} : { hint: result.formOnly ? 'Right value. Write it in simplest form.' : result.hint || item.q.hint }),
      ...(!result.correct && !result.formOnly && item.tries === 2 ? { revealed: true, solution: item.q.solution } : {}) };
    const done = completed(state) === state.slots.length;
    if (done && row.kind === 'bonus' && firstTry(state) * 100 >= state.slots.length * state.bonusThreshold) state.pointsEarned = state.bonusPointValue;
    const mutation = uuid();
    row.done = Number(done);
    row.state = JSON.stringify(state);
    const response = { ...item.feedback, run: view(row) };
    const statements = [
      statement('UPDATE practice_runs SET state = ?,revision = revision + 1,mutation = ?,done = ? WHERE id = ? AND revision = ?', row.state, mutation, Number(done), id, row.revision),
      statement('INSERT INTO practice_attempts(id,student_id,run_id,question_id,seed,skill,answer,correct,form_only,try_number,elapsed_ms,prompt,right_answer,created_at,result) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM practice_runs WHERE id = ? AND mutation = ?)', attemptId, user.id, id, item.id, String(item.q.seed), item.q.skill, readableAnswer(item.q, answer), result.correct ? 1 : 0, result.formOnly ? 1 : 0, tryNumber, elapsed, item.q.prompt, rightAnswer(item.q), iso(), JSON.stringify({ ...response, input: answer }), id, mutation)
    ];
    if (done && state.pointsEarned) statements.push(statement("INSERT OR IGNORE INTO practice_ledger(id,student_id,amount,kind,note,run_id,created_at) SELECT ?,?,?,'bonus',?,?,? WHERE EXISTS(SELECT 1 FROM practice_runs WHERE id = ? AND mutation = ?)", `bonus:${id}`, user.id, state.pointsEarned, `Bonus round ${row.round}`, id, iso(), id, mutation));
    if (twin) statements.push(statement('INSERT INTO practice_questions(id,student_id,run_id,signature,plain_prompt,date) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM practice_runs WHERE id = ? AND mutation = ?)', twin.id, user.id, id, twin.q.signature, questionIdentity(twin.q), todayDate(), id, mutation));
    try { await db.batch(statements); } catch (error) {
      const duplicate = await one('SELECT result FROM practice_attempts WHERE id = ?', attemptId);
      if (duplicate) return JSON.parse(duplicate.result);
      if (retry < 5 && /UNIQUE|constraint|question_repeat/i.test(error.message)) return answerRun(user, id, body, retry + 1);
      throw error;
    }
    const saved = await one('SELECT result FROM practice_attempts WHERE id = ?', attemptId);
    if (!saved) fail(409, 'Another answer was saved first. Open the set again.');
    return JSON.parse(saved.result);
  }
  async function nextQuestion(user, id, body) {
    const row = await ownedRun(id, user);
    assertRunAccessible(row, await settings(), true);
    if (row.done) return view(row);
    const state = JSON.parse(row.state), item = state.queue[state.cursor];
    if (item?.id !== body.questionId) return view(row);
    if (!item.waiting) fail(409, 'Check your answer first.');
    state.cursor++;
    const done = completed(state) === state.slots.length;
    const s = await settings();
    if (done && row.kind === 'bonus' && row.day_index === currentIndex(s) && !paused(s) && firstTry(state) * 100 >= state.slots.length * state.bonusThreshold) state.pointsEarned = state.bonusPointValue;
    const mutation = uuid();
    const statements = [statement('UPDATE practice_runs SET state = ?,revision = revision + 1,mutation = ?,done = ? WHERE id = ? AND revision = ?', JSON.stringify(state), mutation, done ? 1 : 0, id, row.revision)];
    if (state.pointsEarned) statements.push(statement("INSERT OR IGNORE INTO practice_ledger(id,student_id,amount,kind,note,run_id,created_at) SELECT ?,?,?,'bonus',?,?,? WHERE EXISTS(SELECT 1 FROM practice_runs WHERE id = ? AND mutation = ?)", `bonus:${id}`, user.id, state.pointsEarned, `Bonus round ${row.round}`, id, iso(), id, mutation));
    await db.batch(statements);
    return view(await ownedRun(id, user));
  }
  async function prizeData(userId) {
    return { points: userId ? await balance(userId) : 0,
      prizes: (await all('SELECT id,name,cost,active FROM practice_prizes ORDER BY cost,created_at')).map(p => ({ ...p, active: Boolean(p.active) })),
      requests: userId ? await all('SELECT id,prize_id AS prizeId,prize_name AS name,cost,status,created_at AS createdAt FROM practice_requests WHERE student_id = ? ORDER BY created_at DESC', userId) : [],
      history: userId ? await all('SELECT id,amount,kind,note,created_at AS createdAt FROM practice_ledger WHERE student_id = ? ORDER BY created_at DESC', userId) : [] };
  }
  async function backup() {
    const tables = ['users', 'settings', 'runs', 'questions', 'attempts', 'ledger', 'prizes', 'requests'];
    const data = { version: 2, createdAt: iso(), tables: {} };
    for (const table of tables) data.tables[`practice_${table}`] = await all(`SELECT * FROM practice_${table}`);
    for (const table of ['platform_program','platform_questions','platform_attempts','platform_review_queue','platform_lessons','platform_examples','platform_daily_rules','platform_assignments','platform_weekly_checks','platform_teacher_notes','platform_flags','platform_prize_notes']) data.tables[table] = await all(`SELECT * FROM ${table}`);
    const date = todayDate();
    if (backupStore) await backupStore.put(`practice-backups/${date}.json`, JSON.stringify(data), { httpMetadata: { contentType: 'application/json' } });
    await run('INSERT INTO practice_backups(date,data,created_at) VALUES(?,?,?) ON CONFLICT(date) DO UPDATE SET data = excluded.data,created_at = excluded.created_at', date, JSON.stringify(backupStore ? { storedExternally: true, key: `practice-backups/${date}.json` } : data), iso());
    await run('DELETE FROM practice_backups WHERE date < ?', dateOffset(date, -14));
    return { date, data };
  }
  async function route(request) {
    const url = new URL(request.url), method = request.method;
    // Keep old bookmarks/clients usable without retaining a separate parent role.
    let path = url.pathname.replace(/^\/api\/parent(?=\/|$)/, '/api/teacher');
    if (path === '/api/teacher/overview') path = '/api/teacher/dashboard';
    const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    if (isWrite) {
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin) fail(403, 'This request came from another site.');
      if (request.headers.get('sec-fetch-site') === 'cross-site') fail(403, 'This request came from another site.');
    }
    const user = await getUser(request);
    if (path === '/api/session' && method === 'GET') return json({ user: safeUser(user), setupRequired: !(await one("SELECT id FROM practice_users WHERE role = 'parent' LIMIT 1")) });
    if (path === '/api/setup' && method === 'POST') {
      if (production && !request.headers.get('oai-authenticated-user-id')) fail(403, 'Open setup through the private Site owner account.');
      if (await one('SELECT id FROM practice_users LIMIT 1')) fail(409, 'Setup is already complete. Sign in.');
      const body = await readBody(request), values = validateAccount(body, 'teacher');
      const account = { id: uuid(), ...values, role: 'teacher', password_hash: await hash(body.password, 12) };
      const result = await run("INSERT INTO practice_users(id,username,name,role,password_hash,created_at) SELECT ?,?,?,'parent',?,? WHERE NOT EXISTS(SELECT 1 FROM practice_users)", account.id, account.username, account.name, account.password_hash, iso());
      if (!result.meta.changes) fail(409, 'Setup is already complete. Sign in.');
      return newSession(account, false);
    }
    if (path === '/api/login' && method === 'POST') {
      const body = await readBody(request), username = text(body.username, 24).toLowerCase();
      const key = `login:${username}`;
      const globalKey = 'login:global';
      await run('INSERT INTO practice_login_limits(key,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN reset_at <= ? THEN 1 ELSE attempts + 1 END, reset_at = CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END', globalKey, now().getTime() + 900000, now().getTime(), now().getTime());
      if ((await one('SELECT attempts FROM practice_login_limits WHERE key = ?', globalKey)).attempts > 60) fail(429, 'Wait 15 minutes before trying again.');
      const rate = await one('SELECT * FROM practice_login_limits WHERE key = ?', key);
      if (rate && rate.reset_at > now().getTime() && rate.attempts >= 8) fail(429, 'Wait 15 minutes before trying again.');
      await run('INSERT INTO practice_login_limits(key,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN reset_at <= ? THEN 1 ELSE attempts + 1 END, reset_at = CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END', key, now().getTime() + 900000, now().getTime(), now().getTime());
      if ((await one('SELECT attempts FROM practice_login_limits WHERE key = ?', key)).attempts > 8) fail(429, 'Wait 15 minutes before trying again.');
      const account = await one('SELECT * FROM practice_users WHERE username = ?', username);
      const password = typeof body.password === 'string' ? body.password.slice(0, 100) : '';
      // A valid fixed bcrypt hash keeps unknown-user checks expensive too.
      const valid = await compare(password, account?.password_hash || '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5e5bW6nV6kD/KZz9FvGWDlM5w/7bMQK');
      if (!account || !valid) fail(401, 'The username or password did not match.');
      await run('DELETE FROM practice_login_limits WHERE key = ?', key);
      return newSession(account, Boolean(body.remember));
    }
    if (path === '/api/logout' && method === 'POST') {
      await readBody(request);
      const token = request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
      if (token) await run('DELETE FROM practice_sessions WHERE id = ?', token);
      return json({ ok: true }, 200, { 'set-cookie': clearedCookie() });
    }
    if (!path.startsWith('/api/')) {
      const asset = assets[path] || (path === '/' ? assets['/index.html'] : null);
      if (asset && (['/', '/index.html', '/app.js', '/student.mjs', '/teacher.mjs', '/styles.css'].includes(path) || path.startsWith('/fonts/') || path.startsWith('/assets/fonts/') || path === '/favicon.svg' || path === '/assets/favicon.svg')) {
        if (typeof asset === 'string') return new Response(asset, { headers: { 'content-type': path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' } });
        return new Response(asset.body, { headers: { 'content-type': asset.type, 'cache-control': (path.startsWith('/fonts/') || path.startsWith('/assets/fonts/')) ? 'public, max-age=31536000, immutable' : 'no-cache' } });
      }
      // Deep links serve only the login shell, never a directory or source file.
      if (method === 'GET' && !path.includes('.') && assets['/index.html']) {
        const asset = assets['/index.html'];
        return new Response(typeof asset === 'string' ? asset : asset.body, { headers: { 'content-type': 'text/html; charset=utf-8' } });
      }
      return json({ error: 'Not found.' }, 404);
    }
    if (!user) fail(401, 'Sign in first.');
    if (production && method !== 'GET' && (/^\/api\/runs(?:\/|$)/.test(path) || /^\/api\/prizes\/[^/]+\/request$/.test(path) || /^\/api\/teacher\/(requests|points|settings)(?:\/|$)/.test(path))) fail(410, 'Open the new dashboard to continue.');
    if (path.startsWith('/api/v2/')) {
      if (path.startsWith('/api/v2/teacher/') && user.role !== 'teacher') fail(403, 'A teacher account is needed.');
      if (path.startsWith('/api/v2/student/') && user.role !== 'student') fail(403, 'Use a student account for learning.');
      for (const handler of [platform, management, learning]) { const response = await handler.handle(request, user); if (response) return response; }
      return json({error:'Not found.'},404);
    }
    if (path.startsWith('/api/teacher/') && user.role !== 'teacher') fail(403, 'A teacher account is needed.');
    if (!path.startsWith('/api/teacher/') && user.role !== 'student' && !['/api/prizes'].includes(path)) fail(403, 'Use the student account for practice.');
    if (path === '/api/today' && method === 'GET') {
      const s = await settings(), index = currentIndex(s), date = todayDate();
      const required = index >= 0 && index < 70 ? await one("SELECT * FROM practice_runs WHERE student_id = ? AND day_index = ? AND kind = 'required'", user.id, index) : null;
      const bonusRows = await all("SELECT * FROM practice_runs WHERE student_id = ? AND day_index = ? AND kind = 'bonus' ORDER BY round", user.id, index);
      const points = await balance(user.id);
      const prize = await one('SELECT id,name,cost FROM practice_prizes WHERE active = 1 AND cost > ? ORDER BY cost LIMIT 1', points) || await one('SELECT id,name,cost FROM practice_prizes WHERE active = 1 ORDER BY cost LIMIT 1');
      return json({ today: date, day: index >= 0 && index < 70 ? info(index, s) : null, paused: paused(s), run: required ? view(required) : null, points, nextPrize: prize ? { ...prize, needed: Math.max(0, prize.cost - points) } : null,
        bonus: { completed: bonusRows.filter(r => r.done).length, limit: s.bonusLimit, firstSize: 15, laterSize: 10, pointValue: s.bonusPointValue, threshold: s.bonusThreshold, available: Boolean(required?.done) && bonusRows.filter(r => r.done).length < s.bonusLimit && !paused(s), active: bonusRows.find(r => !r.done) ? view(bonusRows.find(r => !r.done)) : null }, settings: { startDate: s.startDate }, paperVerified: Boolean(questionPool) });
    }
    if (path === '/api/weeks' && method === 'GET') {
      const s = await settings(), index = currentIndex(s), rows = await all("SELECT * FROM practice_runs WHERE student_id = ? AND kind = 'required'", user.id);
      return json({ today: todayDate(), days: Array.from({ length: 70 }, (_, dayIndex) => { const row = rows.find(r => r.day_index === dayIndex); return { ...info(dayIndex, s), status: row?.done ? 'done' : dayIndex > index ? 'ahead' : dayIndex === index ? 'today' : 'missed', run: row && dayIndex <= index ? view(row) : null }; }) });
    }
    if (path === '/api/runs' && method === 'POST') return json(await startRun(user, await readBody(request)));
    let match = path.match(/^\/api\/runs\/([^/]+)(?:\/(answer|next))?$/);
    if (match) {
      if (method === 'GET' && !match[2]) { const row = await ownedRun(match[1], user); assertRunAccessible(row, await settings()); return json(view(row)); }
      if (method === 'POST' && match[2] === 'answer') return json(await answerRun(user, match[1], await readBody(request)));
      if (method === 'POST' && match[2] === 'next') return json(await nextQuestion(user, match[1], await readBody(request)));
    }
    if ((path === '/api/prizes' || path === '/api/teacher/prizes') && method === 'GET') return json(await prizeData(user.role === 'student' ? user.id : (await student())?.id));
    match = path.match(/^\/api\/prizes\/([^/]+)\/request$/);
    if (match && method === 'POST') {
      await readBody(request);
      const prize = await one('SELECT * FROM practice_prizes WHERE id = ? AND active = 1', match[1]);
      if (!prize) fail(404, 'That prize was not found.');
      if (await balance(user.id) < prize.cost) fail(409, 'You need more points for this prize.');
      await run("INSERT OR IGNORE INTO practice_requests(id,student_id,prize_id,prize_name,cost,status,created_at) VALUES(?,?,?,?,?,'pending',?)", uuid(), user.id, prize.id, prize.name, prize.cost, iso());
      return json({ ok: true });
    }
    if (path === '/api/teacher/settings' && method === 'GET') return json({ settings: await settings(), accounts: (await all('SELECT * FROM practice_users ORDER BY created_at')).map(safeUser), backup: { latestDate: (await one('SELECT date FROM practice_backups ORDER BY date DESC LIMIT 1'))?.date || null } });
    if (path === '/api/teacher/settings' && method === 'PATCH') {
      const body = await readBody(request), s = await settings();
      if ('startDate' in body) { if (!validDate(body.startDate)) fail(400, 'Enter a valid start date.'); s.startDate = body.startDate; }
      if ('paused' in body) { if (typeof body.paused !== 'boolean') fail(400, 'Pause must be on or off.'); s.paused = body.paused; }
      if ('pausedDates' in body) { if (!Array.isArray(body.pausedDates) || body.pausedDates.length > 366 || !body.pausedDates.every(validDate)) fail(400, 'Enter valid pause dates.'); s.pausedDates = [...new Set(body.pausedDates)]; }
      if ('bonusLimit' in body) s.bonusLimit = int(body.bonusLimit, 0, 20, 'Bonus limit');
      if ('bonusThreshold' in body) s.bonusThreshold = int(body.bonusThreshold, 1, 100, 'Bonus threshold');
      if ('bonusPointValue' in body) s.bonusPointValue = int(body.bonusPointValue, 0, 100, 'Bonus points');
      await run('INSERT INTO practice_settings(id,value) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value = excluded.value', JSON.stringify(s));
      return json({ settings: s });
    }
    if (path === '/api/teacher/accounts' && method === 'POST') {
      const body = await readBody(request), role = accountRole(body.role);
      if (!['student', 'teacher'].includes(role)) fail(400, 'Choose student or teacher.');
      const values = validateAccount(body, role), id = uuid();
      const passwordHash = await hash(body.password, 12);
      try { await run('INSERT INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)', id, values.username, values.name, storedRole(role), passwordHash, iso()); }
      catch (error) { if (/UNIQUE|constraint|question_repeat/i.test(error.message)) fail(409, 'That username is in use, or the student account already exists.'); throw error; }
      return json({ user: { id, ...values, role } }, 201);
    }
    match = path.match(/^\/api\/teacher\/accounts\/([^/]+)\/password$/);
    if (match && method === 'POST') {
      const body = await readBody(request), account = await one('SELECT * FROM practice_users WHERE id = ?', match[1]);
      if (!account) fail(404, 'That account was not found.');
      validateAccount({ ...account, password: body.password }, account.role);
      await db.batch([statement('UPDATE practice_users SET password_hash = ? WHERE id = ?', await hash(body.password, 12), account.id), statement('DELETE FROM practice_sessions WHERE user_id = ?', account.id)]);
      return json({ ok: true });
    }
    if (path === '/api/teacher/prizes' && method === 'POST') {
      const body = await readBody(request), name = text(body.name, 80), cost = int(body.cost, 1, 100000, 'Point cost');
      if (!name) fail(400, 'Enter a prize name.');
      const id = uuid(); await run('INSERT INTO practice_prizes(id,name,cost,created_at) VALUES(?,?,?,?)', id, name, cost, iso());
      return json({ prize: { id, name, cost, active: true } }, 201);
    }
    match = path.match(/^\/api\/teacher\/prizes\/([^/]+)$/);
    if (match && method === 'PATCH') {
      const body = await readBody(request), prize = await one('SELECT * FROM practice_prizes WHERE id = ?', match[1]);
      if (!prize) fail(404, 'That prize was not found.');
      const name = 'name' in body ? text(body.name, 80) : prize.name;
      if (!name) fail(400, 'Enter a prize name.');
      const cost = 'cost' in body ? int(body.cost, 1, 100000, 'Point cost') : prize.cost;
      if ('active' in body && typeof body.active !== 'boolean') fail(400, 'Prize visibility must be on or off.');
      await run('UPDATE practice_prizes SET name = ?,cost = ?,active = ? WHERE id = ?', name, cost, 'active' in body ? Number(body.active) : prize.active, prize.id);
      return json({ ok: true });
    }
    match = path.match(/^\/api\/teacher\/requests\/([^/]+)$/);
    if (match && method === 'POST') {
      const body = await readBody(request), prizeRequest = await one('SELECT * FROM practice_requests WHERE id = ?', match[1]);
      if (!prizeRequest) fail(404, 'That request was not found.');
      if (!['approve', 'decline'].includes(body.action)) fail(400, 'Choose approve or decline.');
      if (prizeRequest.status !== 'pending') return json({ ok: true });
      if (body.action === 'decline') await run("UPDATE practice_requests SET status = 'declined',reviewed_at = ? WHERE id = ? AND status = 'pending'", iso(), prizeRequest.id);
      else {
        const ledgerId = `prize:${prizeRequest.id}`;
        await db.batch([
          statement("INSERT OR IGNORE INTO practice_ledger(id,student_id,amount,kind,note,created_at) SELECT ?,?,?,'prize',?,? WHERE EXISTS(SELECT 1 FROM practice_requests WHERE id = ? AND status = 'pending') AND (SELECT COALESCE(SUM(amount),0) FROM practice_ledger WHERE student_id = ?) >= ?", ledgerId, prizeRequest.student_id, -prizeRequest.cost, prizeRequest.prize_name, iso(), prizeRequest.id, prizeRequest.student_id, prizeRequest.cost),
          statement("UPDATE practice_requests SET status = 'approved',reviewed_at = ? WHERE id = ? AND EXISTS(SELECT 1 FROM practice_ledger WHERE id = ?)", iso(), prizeRequest.id, ledgerId)
        ]);
        if (!(await one('SELECT id FROM practice_ledger WHERE id = ?', ledgerId))) fail(409, 'There are not enough points for this prize.');
      }
      return json({ ok: true });
    }
    if (path === '/api/teacher/points' && method === 'POST') {
      const body = await readBody(request), learner = await student();
      if (!learner) fail(409, 'Create the student account first.');
      const amount = int(body.amount, -100000, 100000, 'Points'), note = text(body.note, 200), requestId = text(body.requestId, 100);
      if (!amount || !note) fail(400, 'Enter a nonzero point amount and a note.');
      if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) fail(400, 'The change needs a request ID.');
      const id = `adjustment:${requestId}`;
      await run("INSERT OR IGNORE INTO practice_ledger(id,student_id,amount,kind,note,created_at) SELECT ?,?,?,'adjustment',?,? WHERE (SELECT COALESCE(SUM(amount),0) FROM practice_ledger WHERE student_id = ?) + ? >= 0", id, learner.id, amount, note, iso(), learner.id, amount);
      if (!(await one('SELECT id FROM practice_ledger WHERE id = ?', id))) fail(409, 'Points cannot go below zero.');
      return json({ ok: true });
    }
    if (path === '/api/teacher/weeks' && method === 'GET') {
      const learner = await student(), s = await settings(), index = currentIndex(s);
      const rows = learner ? await all("SELECT * FROM practice_runs WHERE student_id = ? AND kind = 'required'", learner.id) : [];
      return json({ today: todayDate(), student: safeUser(learner), days: Array.from({ length: 70 }, (_, dayIndex) => {
        const row = rows.find(r => r.day_index === dayIndex), state = row ? JSON.parse(row.state) : null;
        return { ...info(dayIndex, s), status: row?.done ? 'done' : dayIndex > index ? 'ahead' : dayIndex === index ? 'today' : 'missed',
          run: state ? { completed: completed(state), total: state.slots.length, firstTryCorrect: firstTry(state), done: Boolean(row.done) } : null };
      }) });
    }
    if (path === '/api/teacher/preview' && method === 'GET') {
      if (production && !questionPool) fail(503, 'The checked question bank is not ready.');
      const dayIndex = int(Number(url.searchParams.get('dayIndex') ?? 0), 0, 69, 'Day');
      const kind = url.searchParams.get('kind') || 'required';
      if (!['required', 'bonus'].includes(kind)) fail(400, 'Choose a required or bonus set.');
      const round = int(Number(url.searchParams.get('round') ?? 0), 0, 19, 'Round');
      const s = await settings(), exclusion = { signatures: new Set(), prompts: new Set() };
      const questions = buildSlots(dayIndex, kind, round).map((slot, index) => {
        const q = freshQuestion(slot.skill, `${user.id}:preview:${dayIndex}:${kind}:${round}:${index}`, slot.difficulty, exclusion);
        return { ...publicQuestion(q), answer: rightAnswer(q), solution: q.solution, hint: q.hint,
          hints: q.hints.map(h => ({ answer: plainLabel(q.choices?.find(choice => String(choice.value) === String(h.answer))?.label ?? h.answer), text: h.text })) };
      });
      return json({ day: info(dayIndex, s), kind, round, total: questions.length, questions });
    }
    if (path === '/api/teacher/dashboard' && method === 'GET') {
      const learner = await student(), s = await settings(), date = todayDate();
      if (!learner) return json({ student: null, days: [], misses: [], points: 0 });
      const runs = await all('SELECT * FROM practice_runs WHERE student_id = ?', learner.id);
      const attempts = await all('SELECT * FROM practice_attempts WHERE student_id = ? AND created_at >= ?', learner.id, `${dateOffset(date, -8)}T00:00:00.000Z`);
      const ledger = await all('SELECT amount,created_at FROM practice_ledger WHERE student_id = ?', learner.id);
      const days = Array.from({ length: 8 }, (_, i) => {
        const d = dateOffset(date, -i), dayIndex = Math.floor((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${s.startDate}T12:00:00Z`)) / DAY);
        const required = runs.find(r => r.day_index === dayIndex && r.kind === 'required');
        return { date: d, dayIndex, done: Boolean(required?.done), firstTryCorrect: required ? firstTry(JSON.parse(required.state)) : 0, total: 20,
          timeMs: attempts.filter(a => pacificDate(new Date(a.created_at)) === d).reduce((sum, a) => sum + a.elapsed_ms, 0),
          bonusRounds: runs.filter(r => r.day_index === dayIndex && r.kind === 'bonus' && r.done).length,
          pointsEarned: ledger.filter(a => a.amount > 0 && pacificDate(new Date(a.created_at)) === d).reduce((sum, a) => sum + a.amount, 0) };
      });
      return json({ student: safeUser(learner), days, points: await balance(learner.id), misses: attempts.filter(a => !a.correct && !a.form_only && pacificDate(new Date(a.created_at)) === date).map(a => ({ prompt: a.prompt, skill: a.skill, answer: a.answer, rightAnswer: a.right_answer, tryNumber: a.try_number, createdAt: a.created_at })) });
    }
    if (path === '/api/teacher/skills' && method === 'GET') {
      const learner = await student(), attempts = learner ? await all('SELECT * FROM practice_attempts WHERE student_id = ? AND form_only = 0 ORDER BY created_at DESC', learner.id) : [];
      const skillEntries = Array.isArray(SKILLS) ? SKILLS.map(x => [x.id || x.skill, x]) : Object.entries(SKILLS);
      const skills = skillEntries.map(([skill, details]) => {
        const rows = attempts.filter(a => a.skill === skill && a.try_number === 1), right = rows.filter(a => a.correct).length, accuracy = rows.length ? Math.round(100 * right / rows.length) : null;
        return { skill, name: typeof details === 'string' ? details : details.name || details.title || skill, week: details.week || null, attempts: rows.length, firstTryCorrect: right, accuracy, label: accuracy === null ? 'Not practised' : accuracy >= 80 ? 'Secure' : accuracy >= 50 ? 'Developing' : 'Needs teaching' };
      });
      const filter = url.searchParams.get('skill');
      return json({ skills, attempts: attempts.filter(a => !filter || a.skill === filter).slice(0, 100).map(a => ({ skill: a.skill, prompt: a.prompt, answer: a.answer, rightAnswer: a.right_answer, correct: Boolean(a.correct), tryNumber: a.try_number, createdAt: a.created_at })) });
    }
    if (path === '/api/teacher/backup' && method === 'POST') { await readBody(request); const result = await backup(); return json({ ok: true, date: result.date }); }
    if (path === '/api/teacher/backup' && method === 'GET') {
      const result = await backup();
      return json(result.data, 200, { 'content-disposition': `attachment; filename="double-advanced-${result.date}.json"` });
    }
    return json({ error: 'Not found.' }, 404);
  }
  return {
    backup,
    async fetch(request) {
      let response;
      try { response = await route(request); }
      catch (error) { if (!error.status) logger.error('Practice request failed:', error); response = json({ error: error.status ? error.message : 'Something did not save. Please try again.' }, error.status || 500); }
      const headers = new Headers(response.headers);
      headers.set('x-content-type-options', 'nosniff'); headers.set('referrer-policy', 'same-origin');
      headers.set('x-frame-options', 'DENY');
      headers.set('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
      if (production) headers.set('strict-transport-security', 'max-age=31536000');
      return new Response(response.body, { status: response.status, headers });
    }
  };
}
