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
 const db=createSQLiteDB();db.migrate();const service=createApp({db,clock:()=>new Date('2026-11-07T20:00:00Z')});
 const dom=new JSDOM(file('index.html'),{url:'https://practice.test/t/dashboard',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;let cookie='';
 w.fetch=async(path,options={})=>{const headers=new Headers(options.headers);headers.set('cookie',cookie);if(options.method&&options.method!=='GET')headers.set('origin','https://practice.test');const response=await service.fetch(new Request(new URL(path,'https://practice.test'),{...options,headers}));if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;};
 Object.defineProperty(w,'crypto',{value:webcrypto});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 for(const [name,fn] of [['student.mjs','renderStudent'],['teacher.mjs','renderTeacher']])w.eval(`window.${fn}=(()=>{${file(name).replace('export async function','async function')}\nreturn ${fn};})()`);
 w.eval(file('app.js').replace(/^import .*;\n/gm,'')+'\nwindow.__navigate=navigate;window.__api=api;window.__state=state;');
 const until=async(fn)=>{let n=0;while(!fn()){if(n++>300)throw Error('UI did not settle: '+w.document.body.textContent.slice(-300));await delay(10);}};
 const submit=async values=>{const form=w.document.querySelector('#auth-form');for(const [key,value]of Object.entries(values))form.elements[key].value=value;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
 try{
  await until(()=>w.document.querySelector('#auth-form'));assert.equal(w.location.pathname,'/login');assert.equal(w.document.querySelector('.sidebar'),null);
  await submit({username:'teacher',name:'Teacher',password:'teacher-password'});await until(()=>w.document.querySelector('.sidebar'));
  assert.equal(w.location.pathname,'/t/dashboard');assert.equal(w.document.querySelectorAll('.sidebar nav a').length,7);
  await w.__api('/teacher/accounts',{username:'student',name:'Learner',role:'student',password:'1234'});
  w.document.querySelector('#signout').click();await until(()=>w.document.querySelector('#auth-form'));
  await submit({username:'student',password:'1234'});await until(()=>w.document.querySelector('.practice-hero'));
  assert.equal(w.location.pathname,'/s/today');assert.equal(w.document.querySelectorAll('.sidebar nav a').length,8);
  await w.__navigate('/t/dashboard');await until(()=>w.location.pathname==='/s/today');assert.equal(w.__state.user.role,'student');
  for(const route of ['/s/map','/s/library','/s/progress','/s/rewards','/s/review']){await w.__navigate(route);await until(()=>w.document.querySelector('h1'));assert.doesNotMatch(w.document.body.textContent,/undefined|NaN|\[object Object\]/);}
  await w.__navigate('/s/practice');await until(()=>w.document.querySelector('#practice-answer'));assert.equal(w.document.querySelector('.sidebar'),null);
  const input=w.document.querySelector('#practice-answer');input.value='99999';input.form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>w.document.querySelector('#next-question'));
  assert.match(w.document.querySelector('#practice-feedback').textContent,/Not quite/);
  assert.equal((await w.__api('/v2/student/summary')).answered,1);
  await w.__navigate('/s/today');await until(()=>w.document.querySelector('.sidebar'));
  w.document.querySelector('#menu-toggle').click();assert.equal(w.document.querySelector('#menu-toggle').getAttribute('aria-expanded'),'true');
  w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(w.document.querySelector('#menu-toggle').getAttribute('aria-expanded'),'false');
 }finally{dom.window.close();db.close();}
});
