import assert from 'node:assert/strict';
import test from 'node:test';
import {setTimeout as delay} from 'node:timers/promises';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {webcrypto} from 'node:crypto';
import {createApp} from '../server/backend.mjs';
import {createSQLiteDB} from '../server/storage.mjs';
const file=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
test('full app shell authenticates, separates roles, serves real routes and saves student answers', {timeout:60000},async()=>{
 const db=createSQLiteDB();db.migrate();const service=createApp({db,clock:()=>new Date('2026-11-14T20:00:00Z')});
 const dom=new JSDOM(file('index.html'),{url:'https://practice.test/t/dashboard',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;let cookie='';const requests=[];
 w.fetch=async(path,options={})=>{requests.push({path,method:options.method||'GET'});const headers=new Headers(options.headers);headers.set('cookie',cookie);if(options.method&&options.method!=='GET')headers.set('origin','https://practice.test');const response=await service.fetch(new Request(new URL(path,'https://practice.test'),{...options,headers}));if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;};
 Object.defineProperty(w,'crypto',{value:webcrypto});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 for(const [name,fn] of [['api-client.mjs','createApiClient'],['learning-character.mjs','learningCharacter'],['learning-character.mjs','pointProgress'],['tutor-panel.mjs','tutorPanelMarkup'],['tutor-panel.mjs','mountTutorPanel'],['student.mjs','renderStudent'],['teacher.mjs','renderTeacher']])w.eval(`window.${fn}=(()=>{${file(name).replace(/^import .*;\n/gm,'').replaceAll('export async function','async function').replaceAll('export function','function')}\nreturn ${fn};})()`);
 w.eval(file('app.js').replace(/^import .*;\n/gm,'')+'\nwindow.__navigate=navigate;window.__api=api;window.__state=state;');
 const until=async(fn)=>{let n=0;while(!fn()){if(n++>300)throw Error('UI did not settle: '+w.document.body.textContent.slice(-300));await delay(10);}};
 const submit=async values=>{const form=w.document.querySelector('#auth-form');for(const [key,value]of Object.entries(values))form.elements[key].value=value;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
 try{
  await until(()=>w.document.querySelector('#auth-form'));assert.equal(w.location.pathname,'/login');assert.equal(w.document.querySelector('.sidebar'),null);
  await submit({username:'teacher',name:'Teacher',password:'teacher-password'});await until(()=>w.document.querySelector('.sidebar'));
  assert.equal(w.location.pathname,'/t/dashboard');assert.equal(w.document.querySelectorAll('.sidebar nav a').length,4);
  await w.__api('/teacher/accounts',{username:'student',name:'Learner',role:'student',password:'1234'});
  await w.__navigate('/t/dashboard');await until(()=>w.document.querySelector('.teacher-learner-label')?.textContent.includes('Learner'));
  assert.equal(w.document.querySelector('#student-switch'),null,'one student is shown by name without a class selector');
  const beforePlan=requests.length;
  const openPlan=w.__navigate('/t/plan');
  assert.ok(w.document.querySelector('.route-loading'),'navigation immediately acknowledges the destination');
  assert.equal(w.document.querySelector('#main').getAttribute('aria-busy'),'true');
  await openPlan;
  assert.equal(w.document.activeElement,w.document.querySelector('#main'),'keyboard focus follows a successful page navigation');
  assert.equal(requests.slice(beforePlan).filter(r=>r.path==='/api/v2/teacher/students').length,0,'account list is reused across teacher pages');
  assert.equal(requests.slice(beforePlan).filter(r=>r.path.includes('/progress-summary')).length,0,'curriculum does not wait for an unrelated full progress report');
  assert.equal(requests.slice(beforePlan).filter(r=>r.path.startsWith('/api/v2/teacher/plan?')).length,1);
  w.document.querySelector('#signout').click();await until(()=>w.document.querySelector('#auth-form'));
  const beforeStudent=requests.length;
  await submit({username:'student',password:'1234'});await until(()=>w.document.querySelector('.daily-task-card'));
  assert.equal(w.location.pathname,'/s/today');assert.deepEqual([...w.document.querySelectorAll('.sidebar nav a > span')].map(a=>a.textContent),['Today','Learn','My progress','Rewards']);assert.equal(w.document.querySelector('.learning-resources'),null);assert.ok(w.document.querySelector('.daily-teacher-note'));
  assert.equal(w.document.querySelector('.backlog-pill strong').textContent,'160');assert.equal(w.document.querySelector('[data-questions-behind]').textContent,'160');
  assert.equal(requests.slice(beforeStudent).filter(r=>r.path==='/api/v2/student/summary').length,1,'initial daily page uses one fresh summary for header and content');
  await w.__navigate('/t/dashboard');await until(()=>w.location.pathname==='/s/today');assert.equal(w.__state.user.role,'student');
  for(const route of ['/s/map','/s/library','/s/progress','/s/rewards','/s/review','/s/extra','/s/settings']){await w.__navigate(route);await until(()=>w.document.querySelector('h1'));assert.doesNotMatch(w.document.body.textContent,/\b(?:undefined|NaN)\b|\[object Object\]/);assert.equal(w.document.querySelector('.backlog-pill strong').textContent,'160',`backlog stays visible on ${route}`);}
  let releaseMap;
  const waitForMap=new Promise(resolve=>{releaseMap=resolve;}),normalFetch=w.fetch;
  w.fetch=async(path,options)=>{const result=await normalFetch(path,options);if(path==='/api/v2/student/map')await waitForMap;return result;};
  const oldPage=w.__navigate('/s/map');
  await w.__navigate('/s/settings');
  releaseMap();await oldPage;
  assert.equal(w.document.querySelector('h1').textContent,'Settings','a slower previous page cannot overwrite the current destination');
  w.fetch=normalFetch;
  await w.__navigate('/s/practice');await until(()=>w.document.querySelector('#practice-answer-form'));assert.equal(w.document.querySelector('.sidebar'),null);
  const stored=await db.prepare('SELECT q FROM platform_questions ORDER BY rowid DESC LIMIT 1').first(),question=JSON.parse(stored.q);
  if(question.choices?.length){const wrong=question.choices.find(choice=>choice.value!==question.answer);[...w.document.querySelectorAll('input[name=answer]')].find(input=>input.value===wrong.value).checked=true;}
  else {if(question.answerChoice)w.document.querySelector('input[name=answerChoice]').checked=true;w.document.querySelector('#practice-answer').value='99999'+(question.answerUnit?' '+question.answerUnit:'');}
  w.document.querySelector('#practice-answer-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>w.document.querySelector('#next-question'));
  assert.match(w.document.querySelector('#practice-feedback').textContent,/Not quite/);
  assert.equal((await w.__api('/v2/student/summary')).answered,1);
  assert.equal(w.document.querySelector('.practice-backlog [data-questions-behind]').textContent,'159');
  await w.__navigate('/s/today');await until(()=>w.document.querySelector('.sidebar'));
  assert.equal(w.document.querySelector('.backlog-pill strong').textContent,'159');assert.equal(w.document.querySelector('[data-questions-behind]').textContent,'159');
  Object.defineProperty(w,'innerWidth',{value:375,writable:true});w.dispatchEvent(new w.Event('resize'));
  assert.equal(w.document.querySelector('#school-navigation').hidden,false,'the labelled student bottom navigation stays available on phones');
  assert.equal(w.document.querySelector('#menu-toggle'),null,'students have one navigation, not an additional drawer');
  assert.equal(w.document.querySelectorAll('nav[aria-label="Student navigation"]').length,1);
  assert.ok(w.document.querySelector('.student-account-link[href="/s/settings"]'),'account settings remain reachable');
  assert.equal(w.document.querySelector('.workspace').inert,false,'the page is usable without opening a menu');
  w.innerWidth=1200;w.dispatchEvent(new w.Event('resize'));assert.equal(w.document.querySelector('#school-navigation').hidden,false,'desktop course navigation stays available');
 }finally{dom.window.close();db.close();}
});
