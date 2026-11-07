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
test('teacher and student dashboards, setup, practice, feedback and prizes work through the DOM and API', { timeout: 90_000 }, async t => {
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
    const select=(selector,selected)=>{value(selector,selected);q(selector).dispatchEvent(new w.Event('change',{bubbles:true}));};
    const submit=selector=>q(selector).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    const click=selector=>{assert.ok(q(selector),selector);q(selector).click();};
    async function route(path,check){w.location.hash=path;await until(check,path);}
    await until(()=>q('#auth-title')?.textContent==='Teacher setup','setup');
    value('#name','Teacher');value('#username','teacher');value('#password','private-test-password');submit('#auth-form');
    await until(()=>q('#create-student'),'teacher settings');
    await route('teacher/dashboard',()=>q('.dashboard-links'));
    assert.equal(q('h1').textContent,'Teacher dashboard');
    for (const path of ['teacher/weeks','teacher/preview/0','teacher/skills','teacher/prizes','teacher/settings']) assert.ok(q(`.dashboard-links a[href="#${path}"]`),`teacher dashboard links to ${path}`);
    await route('teacher/weeks',()=>q('.teacher-calendar'));
    assert.equal(w.document.querySelectorAll('[data-preview-day]').length,70);
    assert.ok(q('[data-preview-day="69"]').classList.contains('ahead'));
    assert.equal(q('[data-preview-day="69"]').getAttribute('href'),'#teacher/preview/69');
    click('[data-preview-day="69"]');await until(()=>q('#preview-question'),'future day preview before student account');
    assert.equal(q('#preview-day').options.length,70);
    assert.equal(q('#preview-day').value,'69');
    assert.equal(q('#preview-count').textContent,'Question 1 of 20');
    assert.equal(q('#preview-previous').disabled,true);
    assert.equal(q('#preview-answer').hidden,true);
    assert.match(q('.preview-note').textContent,/Teacher preview\. This does not change student progress\./);
    click('#preview-reveal');assert.equal(q('#preview-answer').hidden,false);assert.equal(q('#preview-reveal').getAttribute('aria-expanded'),'true');
    assert.ok(q('.preview-answer-value').textContent.length);
    assert.ok(q('#preview-answer .solution li'));
    assert.ok(q('#preview-answer .preview-hints li'));
    click('#preview-reveal');assert.equal(q('#preview-answer').hidden,true);
    click('#preview-next');assert.equal(q('#preview-count').textContent,'Question 2 of 20');assert.equal(q('#preview-answer').hidden,true);
    click('#preview-previous');assert.equal(q('#preview-count').textContent,'Question 1 of 20');
    select('#preview-kind','bonus');await until(()=>q('#preview-count')?.textContent==='Question 1 of 15','first bonus preview');
    select('#preview-round','1');await until(()=>q('#preview-count')?.textContent==='Question 1 of 10','later bonus preview');
    select('#preview-day','0');await until(()=>w.location.hash.includes('/preview/0?')&&q('#preview-day')?.value==='0','day selector');
    select('#preview-kind','required');await until(()=>q('#preview-count')?.textContent==='Question 1 of 20'&&!q('#preview-round'),'required preview');
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM practice_runs').first()).count,0);
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM practice_attempts').first()).count,0);
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM practice_ledger').first()).count,0);
    await route('teacher/settings',()=>q('#create-student'));
    value('#student-name','Learner');value('#student-username','learner');value('#student-password','test');submit('#create-student');
    await until(()=>!q('#create-student'),'student created');
    click('summary');value('#teacher-name','Other teacher');value('#teacher-username','second');value('#teacher-password','private-test-password');submit('#create-teacher');
    await until(()=>w.document.body.textContent.includes('Username: second'),'second teacher created');
    await route('teacher/prizes',()=>q('#add-prize'));
    value('#prize-name','Museum visit');value('#prize-cost','3');submit('#add-prize');
    await until(()=>q('.edit-prize'),'prize created');
    value('#bonusPointValue','2');value('#bonusThreshold','80');value('#bonusLimit','4');submit('#bonus-rules');
    await until(()=>q('#notice').textContent==='Bonus rules saved.','bonus saved');
    value('#point-amount','3');value('#point-note','Test credit');submit('#adjust-points');
    await until(()=>q('.prize-balance')?.textContent.includes('3'),'points adjusted');
    await route('teacher/dashboard',()=>q('h1')?.textContent==='Teacher dashboard'&&!q('.loading-text'));
    assert.ok(w.document.body.textContent.includes('Learner'));
    assert.doesNotMatch(w.document.body.textContent, /\bparent\b/i);
    assert.equal(w.location.hash, '#teacher/dashboard');
    await route('parent/overview',()=>w.location.hash==='#teacher/dashboard'&&q('h1')?.textContent==='Teacher dashboard');
    await route('teacher/skills',()=>q('.skill-grid'));
    click('.skill-card');await until(()=>q('.back-link'),'skill attempts');
    click('#signout');await until(()=>q('#auth-form'),'sign out');
    value('#username','learner');value('#password','test');submit('#auth-form');
    await until(()=>q('#start-required'),'student dashboard');
    assert.equal(q('h1')?.textContent, 'Student dashboard');
    assert.equal(w.location.hash, '#student/dashboard');
    await route('today',()=>w.location.hash==='#student/dashboard'&&q('h1')?.textContent==='Student dashboard');
    assert.doesNotMatch(w.document.body.textContent, /\bparent\b/i);
    assert.ok(!w.document.body.textContent.includes('Settings'));
    await route('teacher/weeks',()=>w.location.hash==='#student/dashboard'&&q('#start-required'));
    await route('teacher/preview/69',()=>w.location.hash==='#student/dashboard'&&q('#start-required'));
    assert.ok(!q('#preview-answer'));
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
    await until(()=>w.document.body.textContent.includes('Asked your teacher'),'prize requested');
    await route('teacher/settings',()=>w.location.hash==='#student/dashboard'&&q('.done-card'));
    await route('parent/settings',()=>w.location.hash==='#student/dashboard'&&q('.done-card'));
    click('#signout');await until(()=>q('#auth-form'),'sign out student');
    value('#username','teacher');value('#password','private-test-password');submit('#auth-form');
    await until(()=>q('h1')?.textContent==='Teacher dashboard'&&!q('.loading-text'),'teacher login');
    assert.ok(q('.student-answer')?.textContent.length);
    await route('teacher/prizes',()=>q('[data-decision=approve]'));click('[data-decision=approve]');
    await until(()=>!q('[data-decision=approve]')&&q('.prize-balance')?.textContent.includes('0'),'prize approved');
    const math=w.eval('mathMarkup("1 3/4, (2/3)² and 3/4x")');assert.equal((math.match(/<mfrac/g)||[]).length,3);assert.ok(!w.eval('mathMarkup("<img src=x onerror=alert(1)> 3/4")').includes('<img'));
    const ledger=await db.prepare('SELECT SUM(amount) AS balance FROM practice_ledger').first();assert.equal(ledger.balance,0);
  } finally {
    dom?.window.close();
    db.close();
  }
});
