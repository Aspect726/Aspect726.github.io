import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderStudent } from '../public/student.mjs';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const summary = { today:'2026-11-07',day:{week:1,title:'Decimals',focus:['D1']},week:{week:1,title:'Decimals',skills:[{skill:'D1',name:'Decimal addition'}]},answered:0,correct:0,dailyTarget:20,points:0,untilNextPoint:35,nextPointAt:35,reviewDue:0,streak:0,bestStreak:0,weekDays:[{date:'2026-11-07',weekday:'Saturday',answered:0,lessonDay:true,status:'today'}] };
function setup(api) {
 const dom = new JSDOM('<div id="app"></div>',{url:'https://practice.test/s/today'});
 globalThis.document = dom.window.document; globalThis.FormData = dom.window.FormData;
 const ctx = {api,escape,mathMarkup:escape,state:{user:{name:'Learner',username:'learner',role:'student'}},navigate:()=>{},tell:()=>{},shell:(html,options)=>{document.querySelector('#app').innerHTML=html;ctx.lastShell=options;}};
 return {dom,ctx};
}
const tick = () => new Promise(resolve => setTimeout(resolve,0));
test('student dashboard uses live counts, week and lesson links',async()=>{
 const {dom,ctx}=setup(async path=>{assert.equal(path,'/v2/student/summary');return {...summary,answered:14};});
 await renderStudent('/s/today',ctx);
 assert.match(document.body.textContent,/6 left to reach 20/);
 assert.equal(document.querySelector('a[href="/s/learn/D1"]').textContent,'Open lesson');
 assert.equal(document.querySelector('[aria-current=date]').textContent.includes('Lesson day'),true);
 assert.equal(ctx.state.summary.answered,14); dom.window.close();
});
test('course map exposes upcoming skill lessons and practice without locks',async()=>{
 const {dom,ctx}=setup(async()=>({weeks:[{week:2,title:'Fractions',startDate:'2026-11-14',endDate:'2026-11-20',status:'upcoming',skills:[{skill:'F1',name:'Fraction addition',level:'Not started'}]}]}));
 await renderStudent('/s/map',ctx);
 assert.ok(document.querySelector('a[href="/s/learn/F1"]'));
 assert.ok([...document.querySelectorAll('a')].some(a => a.getAttribute('href') === '/s/practice?source=library&skill=F1&count=5'));
 assert.match(document.body.textContent,/Double Advanced test/); dom.window.close();
});
test('progress calendar includes unanswered course dates, not only attempt dates',async()=>{
 const {dom,ctx}=setup(async()=>({weeks:[{week:1,title:'Decimals',startDate:'2026-11-07',skills:[]}],skills:[],days:[{date:'2026-11-07',answered:20,target:20,accuracy:50,pointsEarned:0}],checks:[],totalQuestions:20,overallAccuracy:50,streak:1,bestStreak:1}));
 await renderStudent('/s/progress',ctx);
 assert.equal(document.querySelectorAll('.calendar-square').length,7);
 assert.equal(document.querySelectorAll('.calendar-square.empty').length,6); dom.window.close();
});
test('lesson reveals one worked step at a time',async()=>{
 const {dom,ctx}=setup(async()=>({skill:'D1',name:'Decimal addition',week:1,rule:'Align places.',idea:'Use place value.',model:'',examples:[{prompt:'Add these values.',steps:['Line up the places.','Add each column.']}],trap:{text:'Do not line up the final digits.'},completed:false}));
 await renderStudent('/s/learn/D1',ctx);
 assert.equal(document.querySelectorAll('.steps li').length,0);
 document.querySelector('[data-next-step]').click();
 assert.equal(document.querySelectorAll('.steps li').length,1);
 document.querySelector('[data-next-step]').click();
 assert.equal(document.querySelectorAll('.steps li').length,2);
 assert.equal(document.querySelector('[data-next-step]').disabled,true); dom.window.close();
});
test('wrong answer is saved once, shows worked feedback, and completes the answered target',async()=>{
 let answers=0;
 const {dom,ctx}=setup(async(path,body)=>{
  if(path==='/v2/student/summary')return {...summary,dailyTarget:1};
  if(path==='/v2/student/question')return {question:{id:'q1',skill:'D1',name:'Decimal addition',level:1,prompt:'Calculate 1 + 2.'},summary:{...summary,dailyTarget:1}};
  if(path==='/v2/student/answer'){answers++;assert.equal(body.answer,'4');assert.equal(body.questionId,'q1');assert.ok(body.requestId);return {correct:false,submittedAnswer:'4',rightAnswer:'3',hint:'Count one more than two.',solution:['Start at 2.','Add 1 to reach 3.'],summary:{...summary,dailyTarget:1,answered:1,requiredDone:true,untilNextPoint:15}};}
  throw Error(path);
 });
 await renderStudent('/s/practice',ctx);
 assert.equal(ctx.lastShell.focus,true);
 document.querySelector('[name=answer]').value='4';
 document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
 await tick();
 assert.equal(answers,1);
 assert.match(document.querySelector('#practice-feedback').textContent,/Not quite/);
 assert.match(document.querySelector('#practice-feedback').textContent,/The answer is 3/);
 assert.equal(document.querySelector('#practice-feedback details summary').textContent,'See how');
 document.querySelector('#next-question').click(); await tick();
 assert.match(document.body.textContent,/Your daily practice is done/);
 assert.equal(answers,1); dom.window.close();
});
test('library search filters and loads a reference example only on expansion',async()=>{
 let lessons=0;
 const {dom,ctx}=setup(async(path)=>{
  if(path==='/v2/student/library')return {skills:[{id:'D1',name:'Decimals',week:1,rule:'Align places.',idea:'Add.'},{id:'F1',name:'Fractions',week:2,rule:'Equal parts.',idea:'Divide.'}],vocabulary:[],formulas:[]};
  if(path==='/v2/student/lesson?skill=D1'){lessons++;return {examples:[{prompt:'Add 1 and 2.',steps:['Get 3.']}],trap:{text:'Keep place values aligned.'}};}
  throw Error(path);
 });
 await renderStudent('/s/library',ctx); assert.equal(lessons,0);
 const search=document.querySelector('#skill-search');search.value='decimal';search.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
 assert.equal(document.querySelectorAll('.library-skill:not([hidden])').length,1);
 const detail=document.querySelector('[data-reference="D1"]'); detail.open=true;detail.dispatchEvent(new dom.window.Event('toggle'));
 await tick();assert.equal(lessons,1);assert.match(detail.textContent,/Keep place values aligned/);dom.window.close();
});
test('an in-flight student response cannot replace the login screen after logout',async()=>{
 let resolve;
 const {dom,ctx}=setup(()=>new Promise(done=>{resolve=done;}));
 const rendering=renderStudent('/s/today',ctx);
 ctx.state.user=null; document.querySelector('#app').innerHTML='<h1>Sign in</h1>';
 resolve(summary); await rendering;
 assert.equal(document.querySelector('h1').textContent,'Sign in');
 dom.window.close();
});
test('an in-flight practice request stops when the shell changes route',async()=>{
 let resolveQuestion;
 const {dom,ctx}=setup(async path=>{
  if(path==='/v2/student/summary')return summary;
  if(path==='/v2/student/question')return new Promise(done=>{resolveQuestion=done;});
  throw Error(path);
 });
 ctx.state.routeVersion=1;
 const rendering=renderStudent('/s/practice',ctx); await tick();
 ctx.state.routeVersion=2;document.querySelector('#app').innerHTML='<h1>Settings</h1>';
 resolveQuestion({question:{id:'q1',skill:'D1',prompt:'Add 1 and 2.'},summary});
 await rendering;
 assert.equal(document.querySelector('h1').textContent,'Settings');
 assert.equal(document.querySelector('#practice-answer-form'),null);
 dom.window.close();
});
