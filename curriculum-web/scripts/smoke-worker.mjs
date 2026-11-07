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
  const setup=await worker.fetch(request('/api/setup',{username:'parent',name:'Parent',password:'test-parent-password'}),{DB:db});
  assert.equal(setup.status,200);assert.match(setup.headers.get('set-cookie'),/HttpOnly/);assert.match(setup.headers.get('set-cookie'),/Secure/);
  const parentCookie=setup.headers.get('set-cookie').split(';')[0];
  const account=await worker.fetch(request('/api/parent/accounts',{username:'student',name:'Student',password:'1234',role:'student'},parentCookie),{DB:db});
  assert.equal(account.status,201);
  const login=await worker.fetch(request('/api/login',{username:'student',password:'1234'}),{DB:db});
  assert.equal(login.status,200);const studentCookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await worker.fetch(request('/api/parent/overview',null,studentCookie),{DB:db})).status,403);
  console.log('Built Worker passed login, role isolation, font delivery and private-path checks.');
} finally { db.close(); }
