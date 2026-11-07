import assert from 'node:assert/strict';
import { createSQLiteDB } from '../server/storage.mjs';
import worker from '../dist/server/index.js';

const db=createSQLiteDB(); db.migrate();
const request=(path,body,cookie)=>new Request(`https://practice.example${path}`,{
  method:body?'POST':'GET',headers:{'content-type':'application/json',origin:'https://practice.example','oai-authenticated-user-id':'test-owner',...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})
});
try {
  const shell=await worker.fetch(request('/'),{DB:db});
  assert.equal(shell.status,200);assert.match(await shell.text(),/Double Advanced/);
  assert.equal((await worker.fetch(request('/api/today'),{DB:db})).status,401);
  const font=await worker.fetch(request('/assets/fonts/inter-latin.woff2'),{DB:db});
  assert.equal(font.status,200);assert.match(font.headers.get('content-type'),/font\/woff2/);
  for(const path of ['/server/questions.mjs','/private/vetted-seeds.json','/data/course.json','/resources/packets/Day_001_Sat_Week_01.pdf'])
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
  const answered=await worker.fetch(request('/api/v2/student/answer',{questionId:question.id,answer:'999999',elapsedMs:2000,requestId:'compiled-smoke'},studentCookie),{DB:db});assert.equal(answered.status,200);assert.equal((await answered.json()).summary.answered,1);
  const lesson=await worker.fetch(request('/api/v2/student/lesson?skill=D-SUB',null,studentCookie),{DB:db});assert.equal(lesson.status,200);assert.equal((await lesson.json()).examples.length,2);
  console.log('Built Worker passed real page/module delivery, login, role isolation, vetted practice/lesson, counted answer, retired endpoint and private-path checks.');
} finally { db.close(); }
