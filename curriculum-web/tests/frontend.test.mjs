import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { webcrypto } from 'node:crypto';
import { createApp } from '../server/backend.mjs';
import { gradeQuestion } from '../server/questions.mjs';
import { createSQLiteDB } from '../server/storage.mjs';
const publicFile = name => new URL(`../public/${name}`, import.meta.url);

// This exercises the DOM and the real API. It does not measure browser layout.
test('family setup, practice, feedback and prizes work through the DOM and API', { timeout: 90_000 }, async t => {
  const db=createSQLiteDB();
  let dom;
  try {
    db.migrate();
    const server=createApp({db,clock:()=>new Date('2026-11-07T18:00:00Z'),logger:{error:console.error}});
    dom=new JSDOM(readFileSync(publicFile('index.html'),'utf8'),{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});
    const {window:w}=dom; let cookie='';
    w.fetch=async(path,options={})=>{const headers=new Headers(options.headers);headers.set('cookie',cookie);if(options.method==='POST'||options.method==='PATCH')headers.set('origin','http://localhost');const response=await server.fetch(new Request(new URL(path,'http://localhost'),{...options,headers}));if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;};
    Object.defineProperty(w,'crypto',{value:webcrypto});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:true});
    w.eval(readFileSync(publicFile('app.js'),'utf8')+'\nwindow.__practiceState=state;');
    const sleep = () => delay(25, undefined, { signal: t.signal });
    async function until(check, label) {
      const deadline = performance.now() + 10_000;
      while (performance.now() < deadline) {
        t.signal.throwIfAborted();
        if (check()) return;
        await sleep();
      }
      throw new Error(`Timed out: ${label}. ${w.document.body.textContent.slice(-600)}`);
    }
    const q=selector=>w.document.querySelector(selector);
    const value=(selector,value)=>{assert.ok(q(selector),selector);q(selector).value=value;q(selector).dispatchEvent(new w.Event('input',{bubbles:true}));};
    const submit=selector=>q(selector).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    const click=selector=>{assert.ok(q(selector),selector);q(selector).click();};
    async function route(path,check){w.location.hash=path;await until(check,path);}
    await until(()=>q('#auth-title')?.textContent==='Parent setup','setup');
    value('#name','Parent');value('#username','parent');value('#password','private-test-password');submit('#auth-form');
    await until(()=>q('#create-student'),'parent settings');
    value('#student-name','Learner');value('#student-username','learner');value('#student-password','test');submit('#create-student');
    await until(()=>!q('#create-student'),'student created');
    click('summary');value('#parent-name','Other parent');value('#parent-username','second');value('#parent-password','private-test-password');submit('#create-parent');
    await until(()=>w.document.body.textContent.includes('Username: second'),'second parent created');
    await route('parent/prizes',()=>q('#add-prize'));
    value('#prize-name','Museum visit');value('#prize-cost','3');submit('#add-prize');
    await until(()=>q('.edit-prize'),'prize created');
    value('#bonusPointValue','2');value('#bonusThreshold','80');value('#bonusLimit','4');submit('#bonus-rules');
    await until(()=>q('#notice').textContent==='Bonus rules saved.','bonus saved');
    value('#point-amount','3');value('#point-note','Test credit');submit('#adjust-points');
    await until(()=>q('.prize-balance')?.textContent.includes('3'),'points adjusted');
    await route('parent/overview',()=>q('h1')?.textContent==='Overview'&&!q('.loading-text'));
    assert.ok(w.document.body.textContent.includes('Learner'));
    await route('parent/skills',()=>q('.skill-grid'));
    click('.skill-card');await until(()=>q('.back-link'),'skill attempts');
    click('#signout');await until(()=>q('#auth-form'),'sign out');
    value('#username','learner');value('#password','test');submit('#auth-form');
    await until(()=>q('#start-required'),'student today');
    assert.ok(!w.document.body.textContent.includes('Settings'));
    click('#start-required');await until(()=>q('#question-form'),'question');
    assert.ok(q('#check-answer'));
    if(q('.keypad')){click('[data-key="1"]');click('[data-key="/"]');click('[data-key="2"]');assert.equal(q('#answer').value,'1/2');click('[data-key="clear"]');assert.equal(q('#answer').value,'');}
    const runId=w.location.hash.slice(5);
    let row=await db.prepare('SELECT state FROM practice_runs WHERE id=?').bind(runId).first();
    let rs=JSON.parse(row.state);let current=rs.queue[rs.cursor];
    if(q('#answer'))value('#answer','9999999');else [...w.document.querySelectorAll('input[name=answer]')].find(input=>!gradeQuestion(current.q,input.value).correct).checked=true;submit('#question-form');
    await until(()=>q('.question-feedback')?.textContent.includes('Not yet'),'first hint');
    if(q('#answer'))value('#answer','9999999');else [...w.document.querySelectorAll('input[name=answer]')].find(input=>!gradeQuestion(current.q,input.value).correct).checked=true;submit('#question-form');
    await until(()=>q('.solution'),'second miss solution');
    assert.equal(q('#check-answer').textContent,'Next');
    click('#check-answer');await until(()=>q('#question-form')&&!q('.question-feedback'),'next');
    for(let index=0;index<25;index++){
      row=await db.prepare('SELECT state,done FROM practice_runs WHERE id=?').bind(runId).first(); if(row.done)break;
      rs=JSON.parse(row.state);current=rs.queue[rs.cursor];
      await until(()=>q('#question-form')&&w.__practiceState.run.question?.id===current.id,'question loop');
      if(current.waiting){click('#check-answer');await sleep();continue;}
      if(q('#answer'))value('#answer',String(current.q.answer));
      else {const input=[...w.document.querySelectorAll('input[name=answer]')].find(input=>gradeQuestion(current.q,input.value).correct);assert.ok(input,'correct option');input.checked=true;}
      submit('#question-form');
      await until(()=>q('.done-card')||q('.question-feedback.right'),'correct feedback');
      if(q('.done-card'))break;
      click('#check-answer');await sleep();
    }
    await until(()=>q('.done-card'),'done');assert.match(q('.done-score strong').textContent, /19\s*\/\s*20/);assert.ok(q('#start-bonus'));
    await route('weeks',()=>q('.calendar'));assert.equal(w.document.querySelectorAll('.calendar-day').length,70);
    await route('prizes',()=>q('[data-request-prize]'));click('[data-request-prize]');
    await until(()=>w.document.body.textContent.includes('Asked your parent'),'prize requested');
    await route('parent/settings',()=>w.location.hash==='#today'&&q('.done-card'));
    click('#signout');await until(()=>q('#auth-form'),'sign out student');
    value('#username','parent');value('#password','private-test-password');submit('#auth-form');
    await until(()=>q('h1')?.textContent==='Overview'&&!q('.loading-text'),'parent login');
    assert.ok(q('.student-answer')?.textContent.length);
    await route('parent/prizes',()=>q('[data-decision=approve]'));click('[data-decision=approve]');
    await until(()=>!q('[data-decision=approve]')&&q('.prize-balance')?.textContent.includes('0'),'prize approved');
    const math=w.eval('mathMarkup("1 3/4, (2/3)² and 3/4x")');assert.equal((math.match(/<mfrac/g)||[]).length,3);assert.ok(!w.eval('mathMarkup("<img src=x onerror=alert(1)> 3/4")').includes('<img'));
    const ledger=await db.prepare('SELECT SUM(amount) AS balance FROM practice_ledger').first();assert.equal(ledger.balance,0);
  } finally {
    dom?.window.close();
    db.close();
  }
});
