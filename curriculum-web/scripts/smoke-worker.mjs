import assert from 'node:assert/strict';
import { createSQLiteDB } from '../server/storage.mjs';
import worker from '../dist/server/index.js';

const db=createSQLiteDB(); db.migrate();
const request=(path,body,cookie)=>new Request(`https://practice.example${path}`,{
  method:body?'POST':'GET',headers:{'content-type':'application/json',origin:'https://practice.example','oai-authenticated-user-id':'test-owner',...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})
});
async function checkBrowserAssets() {
  const queue = ['/'], checked = new Set();
  while (queue.length) {
    const path = queue.shift();
    if (checked.has(path)) continue;
    checked.add(path);
    const result = await worker.fetch(request(path), { DB: db });
    assert.equal(result.status, 200, `Browser dependency is served: ${path}`);
    const type = result.headers.get('content-type') || '';
    const expected = /\.(?:mjs|js)$/.test(path) ? /javascript/ : path.endsWith('.css') ? /text\/css/ : path.endsWith('.svg') ? /image\/svg/ : path.endsWith('.woff2') ? /font\/woff2/ : /text\/html/;
    assert.match(type, expected, `Correct MIME type for ${path}`);
    if (path.endsWith('.woff2')) { assert.ok((await result.arrayBuffer()).byteLength > 1000, `Font body: ${path}`); continue; }
    const text = await result.text();
    assert.ok(text.length > 10, `Nonempty asset: ${path}`);
    if (path !== '/') assert.doesNotMatch(text, /^\s*(?:<!doctype\s+html|<html)/i, `Dependency must not be the sign-in shell: ${path}`);
    const refs = [];
    if (type.includes('html')) {
      for (const match of text.matchAll(/<(?:link|script|img)\b[^>]*\b(?:href|src)=["']([^"']+)["'][^>]*>/gi)) refs.push(match[1]);
    }
    if (type.includes('javascript')) {
      for (const match of text.matchAll(/\b(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?["']([^"']+)["']/g)) refs.push(match[1]);
      for (const match of text.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) refs.push(match[1]);
    }
    if (type.includes('css')) {
      for (const match of text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) refs.push(match[1]);
      for (const match of text.matchAll(/@import\s+["']([^"']+)["']/g)) refs.push(match[1]);
    }
    for (const ref of refs) {
      if (/^(?:data:|#)/.test(ref)) continue;
      const url = new URL(ref, `https://practice.example${path}`);
      assert.equal(url.origin, 'https://practice.example', `Browser dependency is self-hosted: ${ref}`);
      queue.push(url.pathname);
    }
  }
  for (const required of ['/app.js','/api-client.mjs','/student.mjs','/teacher.mjs','/learning-character.mjs','/tutor-panel.mjs','/styles.css','/teacher-backlog.css','/student-learning.css','/tutor-panel.css'])
    assert.ok(checked.has(required), `Published page reaches ${required}`);
  return checked.size;
}
try {
  const shell=await worker.fetch(request('/'),{DB:db});
  assert.equal(shell.status,200);assert.match(await shell.text(),/Double Advanced/);
  const browserAssets = await checkBrowserAssets();
  assert.equal((await worker.fetch(request('/api/today'),{DB:db})).status,401);
  for(const path of ['/assets/math-playground.svg','/assets/graph-paper.svg']) { const art=await worker.fetch(request(path),{DB:db}); assert.equal(art.status,200);assert.match(art.headers.get('content-type'),/image\/svg/); }
  const font=await worker.fetch(request('/assets/fonts/inter-latin.woff2'),{DB:db});
  assert.equal(font.status,200);assert.match(font.headers.get('content-type'),/font\/woff2/);
  for(const path of ['/server/questions.mjs','/private/vetted-seeds.json','/data/course.json','/resources/packets/Day_001_Sat_Week_01.pdf','/private','/server','/unknown.css','/.env','/.git/config'])
    assert.equal((await worker.fetch(request(path),{DB:db})).status,404);
  const setup=await worker.fetch(request('/api/setup',{username:'teacher',name:'Teacher',password:'test-teacher-password'}),{DB:db});
  assert.equal(setup.status,200);assert.match(setup.headers.get('set-cookie'),/HttpOnly/);assert.match(setup.headers.get('set-cookie'),/Secure/);
  const teacherCookie=setup.headers.get('set-cookie').split(';')[0];
  const account=await worker.fetch(request('/api/teacher/accounts',{username:'student',name:'Student',password:'1234',role:'student'},teacherCookie),{DB:db});
  assert.equal(account.status,201);
  const login=await worker.fetch(request('/api/login',{username:'student',password:'1234'}),{DB:db});
  assert.equal(login.status,200);const studentCookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await worker.fetch(request('/api/teacher/dashboard',null,studentCookie),{DB:db})).status,403);
  for(const path of ['/s/today','/s/map','/t/dashboard']) assert.equal((await worker.fetch(request(path),{DB:db})).status,200);
  for(const path of ['/student.mjs','/teacher.mjs']) {const result=await worker.fetch(request(path),{DB:db});assert.equal(result.status,200);assert.match(result.headers.get('content-type'),/javascript/);}
  assert.equal((await worker.fetch(request('/api/v2/teacher/dashboard',null,studentCookie),{DB:db})).status,403);
  assert.equal((await worker.fetch(request('/api/runs',{dayIndex:0,kind:'required'},studentCookie),{DB:db})).status,410);
  const questionResponse=await worker.fetch(request('/api/v2/student/question',{source:'practice'},studentCookie),{DB:db});
  assert.equal(questionResponse.status,200);const {question}=await questionResponse.json();assert.ok(question.id);assert.equal('answer' in question,false);
  const help=await worker.fetch(request('/api/v2/student/help',{questionId:question.id},studentCookie),{DB:db});assert.equal(help.status,200);assert.ok((await help.json()).steps.length);
  const event=await worker.fetch(request('/api/v2/student/help-event',{questionId:question.id,kind:'hint',requestId:'compiled-help-event'},studentCookie),{DB:db});assert.equal(event.status,200);
  const tutor=await worker.fetch(request('/api/v2/student/tutor',{questionId:question.id,message:'What should I do first?',mode:'explain',part:0,requestId:'compiled-tutor-request'},studentCookie),{DB:db});assert.equal(tutor.status,200);assert.equal((await tutor.json()).source,'worked-help');
  const history=await worker.fetch(request('/api/v2/student/tutor-history?questionId='+question.id,null,studentCookie),{DB:db});assert.equal(history.status,200);assert.equal((await history.json()).conversations.length,1);
  const student=await db.prepare('SELECT id FROM practice_users WHERE username=?').bind('student').first();
  const teacherHistory=await worker.fetch(request('/api/v2/teacher/tutor-history?studentId='+student.id,null,teacherCookie),{DB:db});assert.equal(teacherHistory.status,200);assert.equal((await teacherHistory.json()).items.length,2);
  assert.equal((await worker.fetch(request('/api/v2/teacher/tutor-history?studentId='+student.id,null,studentCookie),{DB:db})).status,403);
  const stored=JSON.parse((await db.prepare('SELECT q FROM platform_questions WHERE id=?').bind(question.id).first()).q);
  const wrong=stored.choices?`option-${stored.choices.findIndex(choice=>String(choice.value)!==String(stored.answer))}`:`${stored.answerChoice?stored.answerChoice+', ':''}${stored.answer==='999999'?'999998':'999999'}${stored.answerUnit?' '+stored.answerUnit:''}`;
  const answered=await worker.fetch(request('/api/v2/student/answer',{questionId:question.id,answer:wrong,elapsedMs:2000,requestId:'compiled-smoke'},studentCookie),{DB:db});assert.equal(answered.status,200);const result=await answered.json();assert.equal(result.formOnly,false);assert.equal(result.summary.answered,1);assert.equal(result.summary.schedule.days.length,70);assert.equal(result.summary.schedule.startDate,'2026-11-07');
  for(const skill of ['D-SUB','N-PLACE','G-WVOL','S-LINEPLOT']){const lesson=await worker.fetch(request('/api/v2/student/lesson?skill='+skill,null,studentCookie),{DB:db});assert.equal(lesson.status,200,skill);assert.equal((await lesson.json()).examples.length,2);}
  const library=await worker.fetch(request('/api/v2/student/library',null,studentCookie),{DB:db});assert.equal(library.status,200);assert.equal((await library.json()).skills.length,70);
  console.log(`Built Worker passed the complete ${browserAssets}-asset browser dependency graph, login, role isolation, vetted practice/lesson, help, persistent tutor history, counted answer, retired endpoint and private-path checks.`);
} finally { db.close(); }
