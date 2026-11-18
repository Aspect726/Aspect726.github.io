import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createSQLiteDB } from '../server/storage.mjs';
import { createManagement } from '../server/management.mjs';
import { weekMaterials, diagnostics, materialSource, storedZip, fetchReviewedPDF, downloadWeek } from '../server/course-materials.mjs';

async function fixture() {
  const db = createSQLiteDB(); db.migrate();
  for (const [id, role] of [['teacher', 'parent'], ['student', 'student'], ['other', 'student']]) await db.prepare('INSERT INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind(id, id, id, role, 'test', '2026-11-17T12:00:00Z').run();
  const app = createManagement({ db, clock: () => new Date('2026-11-17T20:00:00Z'), materialFetcher: async () => new Response('unavailable', { status: 503 }) });
  const teacher = { id: 'teacher', role: 'teacher' }, student = { id: 'student', role: 'student' };
  async function call(path, body, user = teacher) {
    try {
      const response = await app.handle(new Request('https://practice.test/api/v2/' + path, { method: body ? 'POST' : 'GET', ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}) }), user);
      return { status: response.status, value: await response.json() };
    } catch (error) { if (!error.status) throw error; return { status: error.status, value: { error: error.message } }; }
  }
  return { db, call, teacher, student };
}

test('curriculum endpoint organizes all 70 dated lessons and only reviewed PDF materials', async () => {
  const f = await fixture();
  try {
    const { value } = await f.call('teacher/plan?studentId=student');
    assert.equal(value.weeks.length, 10); assert.equal(value.weeks.flatMap(week => week.days).length, 70);
    assert.ok(value.weeks.every(week => week.days.length === 7 && week.materials.worksheets.length === 7 && week.materials.teacherGuide));
    assert.equal(value.materialSource.commit, '604a82807488885cc5db31f6b1504b27b48076e1');
    assert.equal(value.diagnostics.length, 2); assert.ok(value.program.scheduleVersion);
    const paths = value.weeks.flatMap(week => [...week.materials.worksheets, week.materials.teacherGuide]).map(file => file.path);
    assert.equal(new Set(paths).size, 80); assert.ok(paths.every(path => path.endsWith('.pdf')));
    assert.ok(paths.every(path => !/paper_questions| 2\.pdf|\.json/.test(path)));
    assert.equal((await f.call('teacher/plan', undefined, f.student)).status, 403);
    assert.equal((await f.call('teacher/materials/week/1.zip', undefined, f.student)).status, 403);
    assert.equal((await f.call('teacher/materials/week/1.zip', undefined, null)).status, 401);
    assert.equal((await f.call('teacher/materials/week/11.zip')).status, 400);
    assert.equal((await f.call('teacher/materials/week/1.zip')).status, 503, 'source failures are not empty successful archives');
  } finally { f.db.close(); }
});

test('date previews do not mutate; earlier/later moves cascade without overlaps or lost updates', async () => {
  const f = await fixture();
  try {
    const original = (await f.call('teacher/plan?studentId=student')).value;
    const request = { studentId: 'student', week: 3, startDate: '2026-11-28', preview: true, expectedVersion: original.program.scheduleVersion };
    const preview = (await f.call('teacher/plan', request)).value.preview;
    assert.equal(preview.deltaDays, 7); assert.equal(preview.affectedWeeks.length, 8);
    assert.equal(preview.affectedWeeks[0].oldStartDate, '2026-11-21');
    assert.equal((await f.call('teacher/plan?studentId=student')).value.weeks[2].startDate, '2026-11-21');
    const applied = await f.call('teacher/plan', { ...request, preview: false });
    assert.equal(applied.status, 200); assert.equal(applied.value.weeks[2].startDate, '2026-11-28');
    assert.equal(applied.value.weeks[1].startDate, original.weeks[1].startDate);
    assert.equal(applied.value.weeks[9].endDate, '2027-01-22');
    assert.equal((await f.call('teacher/plan', { ...request, preview: false })).status, 409, 'stale preview cannot overwrite newer dates');
    assert.equal((await f.call('teacher/plan?studentId=other')).value.weeks[2].startDate, '2026-11-21');
    const back = await f.call('teacher/plan', { studentId: 'student', week: 3, days: -7, expectedVersion: applied.value.program.scheduleVersion });
    assert.equal(back.status, 200); assert.equal(back.value.weeks[2].startDate, '2026-11-21');
    assert.equal((await f.call('teacher/plan', { studentId: 'student', week: 3, days: -1, preview: true })).status, 400, 'no overlapping week');
    assert.equal((await f.call('teacher/plan', { studentId: 'student', week: 1, days: -7, preview: true })).value.preview.to.startDate, '2026-10-31');
    for (const bad of [{ startDate: '2026-02-30' }, { days: 1.5 }, { days: 367 }, { startDate: '2026-12-01', days: 1 }, { preview: 'true' }]) assert.equal((await f.call('teacher/plan', { studentId: 'student', week: 1, ...bad })).status, 400);
  } finally { f.db.close(); }
});

test('moving dates preserves saved answers and ledger; reward rules are visible with pending values', async () => {
  const f = await fixture();
  try {
    await f.db.prepare("INSERT INTO practice_ledger(id,student_id,amount,kind,note,created_at) VALUES('credit','student',6,'adjustment','Existing progress','2026-11-17T12:00:00Z')").run();
    await f.db.prepare("INSERT INTO platform_attempts(id,question_id,student_id,date,skill,template_id,level,question_hash,question_text,params,given_answer,correct_answer,is_correct,seconds,source,created_at,result) VALUES('saved','question','student','2026-11-10','D-SUB','D-SUB:calculation',1,'hash','Saved question','{}','2','2',1,30,'practice','2026-11-10T20:00:00Z','{}')").run();
    await f.call('teacher/plan?studentId=student');
    await f.db.prepare("UPDATE platform_program SET pending_settings=?,effective_date=? WHERE student_id=?").bind(JSON.stringify({ bonusFirst: 12, bonusStep: 8 }), '2026-11-18', 'student').run();
    const before = await f.db.prepare('SELECT * FROM practice_ledger').all();
    const answersBefore = await f.db.prepare('SELECT * FROM platform_attempts').all();
    await f.call('teacher/plan', { studentId: 'student', week: 1, days: -7 });
    assert.deepEqual((await f.db.prepare('SELECT * FROM practice_ledger').all()).results, before.results);
    assert.deepEqual((await f.db.prepare('SELECT * FROM platform_attempts').all()).results, answersBefore.results);
    const rewards = (await f.call('teacher/rewards?studentId=student')).value;
    assert.equal(rewards.points, 6); assert.equal(rewards.program.dailyTarget, 20);
    assert.equal(rewards.nextPoint.firstPointAt, 35); assert.equal(rewards.nextPoint.every, 10);
    assert.deepEqual(rewards.pendingSettings, { bonusFirst: 12, bonusStep: 8 }); assert.equal(rewards.effectiveDate, '2026-11-18');
    const own = (await f.call('student/rewards?studentId=other', undefined, f.student)).value;
    assert.equal(own.student.id, 'student'); assert.equal(own.points, 6);
  } finally { f.db.close(); }
});

test('PDF retrieval checks the reviewed size, PDF header and Git content digest', async () => {
  const bytes = new TextEncoder().encode('%PDF-1.4\nminimal test\n%%EOF\n');
  const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  const file = { size: bytes.length, sha, url: 'https://example.test/reviewed.pdf' };
  const result = await fetchReviewedPDF(file, async (url, options) => { assert.equal(url, file.url); assert.equal(options.redirect, 'error'); return new Response(bytes); });
  assert.deepEqual(result, bytes);
  await assert.rejects(fetchReviewedPDF({ ...file, sha: '0'.repeat(40) }, async () => new Response(bytes)), /does not match/);
  await assert.rejects(fetchReviewedPDF(file, async () => new Response(bytes.slice(0, 10))), /incomplete/);
  await assert.rejects(fetchReviewedPDF(file, async () => new Response(new Uint8Array(bytes.length + 1))), /changed/);
  await assert.rejects(fetchReviewedPDF(file, async () => new Response(new Uint8Array(bytes.length))), /not return a PDF/);
  await assert.rejects(downloadWeek(1, { fetcher: async () => { throw new Error('offline'); } }), /could not be reached/);
});

test('stored ZIP contains readable independent entries with consistent central directory', async () => {
  const contents = [new TextEncoder().encode('worksheet'), new TextEncoder().encode('teacher guide')];
  const bytes = new Uint8Array(await storedZip([{ name: 'Student/Day-1.pdf', bytes: contents[0] }, { name: 'Teacher/Guide.pdf', bytes: contents[1] }]).arrayBuffer());
  const view = new DataView(bytes.buffer), end = bytes.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50); assert.equal(view.getUint16(end + 10, true), 2);
  let central = view.getUint32(end + 16, true);
  for (let i = 0; i < 2; i++) {
    assert.equal(view.getUint32(central, true), 0x02014b50);
    const size = view.getUint32(central + 24, true), nameLength = view.getUint16(central + 28, true), offset = view.getUint32(central + 42, true);
    assert.equal(view.getUint32(offset, true), 0x04034b50);
    assert.deepEqual(bytes.slice(offset + 30 + nameLength, offset + 30 + nameLength + size), contents[i]);
    central += 46 + nameLength;
  }
  assert.equal(central, end);
  assert.throws(() => storedZip([{ name: '../private.txt', bytes: contents[0] }]), /Invalid archive/);
  assert.equal(diagnostics.length, 2); assert.equal(weekMaterials(10).worksheets.length, 7); assert.ok(materialSource.commit);
});
