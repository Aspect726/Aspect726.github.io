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
test('student home makes the daily task primary and keeps the teacher note visible',async()=>{
 const {dom,ctx}=setup(async path=>{assert.equal(path,'/v2/student/summary');return {...summary,answered:14};});
 await renderStudent('/s/today',ctx);
 assert.match(document.body.textContent,/6 questions left today/);
 assert.equal(document.querySelector('.daily-start').getAttribute('href'),'/s/practice');
 assert.equal(document.querySelector('a[href="/s/learn/D1"]').textContent,'Today’s lesson');
 assert.ok(document.querySelector('.daily-teacher-note'));
 assert.ok(document.querySelector('.daily-teacher-note').compareDocumentPosition(document.querySelector('.practice-choices')) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
 assert.equal(document.querySelector('.today-resources').open,false);
 assert.equal(ctx.state.summary.answered,14); dom.window.close();
});
test('course map exposes upcoming skill lessons and practice without locks',async()=>{
 const {dom,ctx}=setup(async()=>({weeks:[{week:2,title:'Fractions',startDate:'2026-11-14',endDate:'2026-11-20',status:'upcoming',skills:[{skill:'F1',name:'Fraction addition',level:'Not started'}]}]}));
 await renderStudent('/s/map',ctx);
 assert.ok(document.querySelector('a[href="/s/learn/F1"]'));
 assert.ok([...document.querySelectorAll('a')].some(a => a.getAttribute('href') === '/s/practice?source=library&skill=F1&count=5'));
 assert.match(document.body.textContent,/Ready for your next maths challenge/); dom.window.close();
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

test('daily home uses the server Pacific deadline and actual schedule day',async()=>{
 const day={date:'2026-11-07',expected:20,answered:14,remaining:6,dayNumber:1,dueAt:'2026-11-08T08:00:00.000Z'};
 const {dom,ctx}=setup(async()=>({...summary,answered:14,teacherNote:'Use a drawing when you get stuck.',schedule:{startDate:'2026-11-07',endDate:'2027-01-15',totalDays:70,timeZone:'America/Los_Angeles',today:day,days:[day]}}));
 try{await renderStudent('/s/today',ctx);assert.match(document.querySelector('.daily-deadline').textContent,/11:59 PM PST/);assert.match(document.querySelector('.today-dateline').textContent,/Day 1 of 70/);assert.match(document.querySelector('.daily-teacher-note').textContent,/Use a drawing/);assert.equal(document.querySelector('[role=progressbar]').getAttribute('aria-valuenow'),'14');}finally{dom.window.close();}
});

test('completed daily route refreshes stale cached counts and does not request a bonus question',async()=>{
 let questions=0;
 const {dom,ctx}=setup(async path=>{if(path.endsWith('/summary'))return {...summary,answered:20,requiredDone:true};if(path.endsWith('/question'))questions++;throw Error(path);});
 ctx.state.summary={...summary,answered:0};
 try{await renderStudent('/s/practice',ctx);assert.equal(questions,0);assert.match(document.body.textContent,/Your daily practice is done/);assert.equal(document.querySelector('#practice-answer-form'),null);assert.ok(document.querySelector('a[href="/s/extra"]'));}finally{dom.window.close();}
});

test('daily practice requests daily intent and stops exactly at the remaining count',async()=>{
 let questions=0,answers=0;
 const {dom,ctx}=setup(async(path,body)=>{
  if(path.endsWith('/summary'))return {...summary,answered:19};
  if(path.endsWith('/question')){questions++;assert.equal(body.intent,'daily');return {question:{id:'last-daily',skill:'D1',prompt:'Add 1 and 2.'},summary:{...summary,answered:19}};}
  if(path.endsWith('/answer')){answers++;return {correct:true,rightAnswer:'3',solution:['1 + 2 = 3.'],summary:{...summary,answered:20,requiredDone:true}};}
  throw Error(path);
 });
 ctx.state.summary={...summary,answered:0};
 try{await renderStudent('/s/practice',ctx);document.querySelector('[name=answer]').value='3';document.querySelector('#practice-answer-form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.equal(document.querySelector('#next-question').textContent,'Finish set');document.querySelector('#next-question').click();await tick();assert.equal(answers,1);assert.equal(questions,1);assert.match(document.body.textContent,/Your daily practice is done/);}finally{dom.window.close();}
});

test('daily completion in another tab is respected before drawing another question',async()=>{
 const {dom,ctx}=setup(async path=>{if(path.endsWith('/summary'))return {...summary,answered:19};if(path.endsWith('/question'))return {question:null,done:true,summary:{...summary,answered:20,requiredDone:true}};throw Error(path);});
 try{await renderStudent('/s/practice',ctx);assert.equal(document.querySelector('#practice-answer-form'),null);assert.match(document.body.textContent,/Your daily practice is done/);}finally{dom.window.close();}
});

test('explicit extra practice remains a five-question set after the daily goal is complete',async()=>{
 let questions=0,answers=0;
 const {dom,ctx}=setup(async(path,body)=>{
  if(path.endsWith('/summary'))return {...summary,answered:20,requiredDone:true};
  if(path.endsWith('/question')){questions++;assert.equal(body.intent,undefined);return {question:{id:`extra-${questions}`,skill:'D1',prompt:'Add 1 and 2.'},summary:{...summary,answered:20+answers,requiredDone:true}};}
  if(path.endsWith('/answer')){answers++;return {correct:true,solution:['3'],summary:{...summary,answered:20+answers,requiredDone:true}};}
  throw Error(path);
 });
 try{await renderStudent('/s/practice?source=practice&count=5',ctx);for(let i=0;i<5;i++){document.querySelector('[name=answer]').value='3';document.querySelector('#practice-answer-form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();document.querySelector('#next-question').click();await tick();}assert.equal(questions,5);assert.equal(answers,5);assert.match(document.body.textContent,/Practice complete/);}finally{dom.window.close();}
});

test('extra practice gives a small starting list and searches all skills',async()=>{
 const skills=Array.from({length:12},(_,i)=>({id:`S${i}`,name:`Skill ${i}`,week:Math.floor(i/3)+1}));
 const {dom,ctx}=setup(async path=>path.endsWith('/summary')?summary:{skills});
 try{await renderStudent('/s/extra',ctx);assert.equal(document.querySelectorAll('.extra-skill:not([hidden])').length,8);assert.ok([...document.querySelectorAll('a')].some(link=>link.getAttribute('href')==='/s/practice?source=practice&count=5'));const input=document.querySelector('#extra-search');input.value='Skill 11';input.dispatchEvent(new dom.window.Event('input'));assert.equal(document.querySelectorAll('.extra-skill:not([hidden])').length,1);assert.ok([...document.querySelectorAll('.extra-skill:not([hidden]) a')].some(link=>link.getAttribute('href').includes('skill=S11')));input.value='';input.dispatchEvent(new dom.window.Event('input'));document.querySelector('#extra-show-all').click();assert.equal(document.querySelectorAll('.extra-skill:not([hidden])').length,12);}finally{dom.window.close();}
});

test('progress displays all seventy scheduled dates including missing and future dates',async()=>{
 const days=Array.from({length:70},(_,i)=>({date:new Date(Date.parse('2026-11-07T12:00:00Z')+i*86400000).toISOString().slice(0,10),expected:20,answered:i===0?20:0,status:i===0?'complete':i===1?'today':'upcoming'}));
 const {dom,ctx}=setup(async()=>({weeks:[],skills:[],days:[],totalQuestions:20,streak:1,schedule:{dailyTarget:20,today:days[1],days}}));
 try{await renderStudent('/s/progress',ctx);assert.equal(document.querySelectorAll('.calendar-square').length,70);assert.equal(document.querySelectorAll('.calendar-square.upcoming').length,68);assert.equal(document.querySelectorAll('.calendar-square.complete').length,1);assert.match(document.querySelector('.calendar-first').textContent,/Nov 7 – Jan 15/);assert.equal(document.querySelector('.progress-detail').open,false);}finally{dom.window.close();}
});

test('review chooses due work without asking the student to select a skill',async()=>{
 let questionBody;
 const {dom,ctx}=setup(async(path,body)=>{if(path.endsWith('/summary'))return summary;if(path.endsWith('/review'))return {count:2,due:[{skill:'D1',name:'Decimals'},{skill:'F1',name:'Fractions'}]};if(path.endsWith('/question')){questionBody=body;return {question:{id:'review-one',skill:'D1',prompt:'Add.'},summary};}throw Error(path);});
 try{await renderStudent('/s/review',ctx);assert.equal(document.querySelector('.review-contents').open,false);document.querySelector('#review-start').click();await tick();assert.equal(questionBody.source,'review');assert.equal(questionBody.skill,undefined);assert.equal(questionBody.intent,undefined);}finally{dom.window.close();}
});

const dueSummary=(answered=0,overrides={})=>({...summary,today:'2026-11-14',answered,backlog:{behind:Math.max(0,160-answered),overdue:Math.max(0,140-Math.max(0,answered-20)),remainingToday:Math.max(0,20-answered),requiredToDate:160,completedToDate:Math.min(160,answered),oldestDueDate:'2026-11-07',catchupCredit:Math.max(0,answered-20),onTimeCompletions:answered>=20?1:0,...overrides}});
test('daily home shows all160 due questions before the first answer and separates earlier work from today',async()=>{
 const {dom,ctx}=setup(async()=>dueSummary());
 try{await renderStudent('/s/today',ctx);const banner=document.querySelector('.backlog-banner');assert.equal(banner.querySelector('[data-questions-behind]').textContent,'160');assert.match(banner.textContent,/140 from earlier days\+20 due today/);assert.match(banner.textContent,/0 of 160 questions due so far completed/);assert.ok([...banner.querySelectorAll('a')].find(link=>link.getAttribute('href')==='/s/practice?intent=catchup&count=5'));assert.equal(document.querySelector('.daily-start').getAttribute('href'),'/s/practice');assert.ok(banner.compareDocumentPosition(document.querySelector('.daily-task-card')) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING);}finally{dom.window.close();}
});
test('extra practice and review keep the same backlog even when no skill reviews are due',async()=>{
 const {dom,ctx}=setup(async path=>path.endsWith('/summary')?dueSummary(20):path.endsWith('/library')?{skills:[]}:{count:0,due:[]});
 try{for(const route of ['/s/extra','/s/review']){await renderStudent(route,ctx);assert.equal(document.querySelector('[data-questions-behind]').textContent,'140');assert.ok([...document.querySelectorAll('a')].find(link=>link.getAttribute('href')==='/s/practice?intent=catchup&count=5'));}assert.match(document.body.textContent,/Your reviews are up to date/);assert.doesNotMatch(document.body.textContent,/All caught up!/);}finally{dom.window.close();}
});
test('caught-up state shows zero and does not offer a catch-up set',async()=>{
 const {dom,ctx}=setup(async()=>dueSummary(160));
 try{await renderStudent('/s/today',ctx);assert.equal(document.querySelector('[data-questions-behind]').textContent,'0');assert.ok(document.querySelector('.backlog-banner.caught-up'));assert.match(document.querySelector('.backlog-banner').textContent,/All caught up!/);assert.equal([...document.querySelectorAll('a')].find(link=>link.getAttribute('href')==='/s/practice?intent=catchup&count=5'),undefined);}finally{dom.window.close();}
});
test('live counter reduces after a saved answer and completion shows the full reduction',async()=>{
 let answered=20,questions=0;
 const {dom,ctx}=setup(async(path,body)=>{
  if(path.endsWith('/summary'))return dueSummary(answered);
  if(path.endsWith('/question')){questions++;assert.equal(body.intent,'catchup');assert.equal(body.source,'practice');return {question:{id:`catchup-${questions}`,skill:'D1',name:'Decimals',prompt:'Add 1 and 2.'},summary:dueSummary(answered)};}
  if(path.endsWith('/answer')){answered++;return {correct:answered%2===0,rightAnswer:'3',solution:['1 + 2 = 3.'],summary:dueSummary(answered)};}
  throw Error(path);
 });
 try{await renderStudent('/s/practice?intent=catchup&count=5',ctx);assert.equal(document.querySelector('[data-questions-behind]').textContent,'140');for(let i=0;i<5;i++){document.querySelector('[name=answer]').value='3';document.querySelector('#practice-answer-form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.equal(document.querySelector('[data-questions-behind]').textContent,String(139-i));assert.match(document.querySelector('.practice-backlog').textContent,new RegExp(`−${i+1} this set`));document.querySelector('#next-question').click();await tick();}assert.equal(questions,5);assert.match(document.querySelector('.completion-catchup').textContent,/5 fewer questions behind/);assert.match(document.querySelector('.completion-catchup').textContent,/140 → 135 remaining/);assert.equal(document.querySelector('[data-questions-behind]').textContent,'135');}finally{dom.window.close();}
});
test('daily answer reduces total160 to159 without reducing the earlier deficit',async()=>{
 const {dom,ctx}=setup(async path=>path.endsWith('/summary')?dueSummary():path.endsWith('/question')?{question:{id:'daily-one',skill:'D1',prompt:'Add.'},summary:dueSummary()}:{correct:true,solution:['3'],summary:dueSummary(1)});
 try{await renderStudent('/s/practice',ctx);document.querySelector('[name=answer]').value='3';document.querySelector('#practice-answer-form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.equal(document.querySelector('[data-questions-behind]').textContent,'159');assert.match(document.querySelector('.practice-backlog').textContent,/140 earlier \+ 19 today/);}finally{dom.window.close();}
});
test('progress distinguishes catch-up credits from the day on which answers were actually completed',async()=>{
 const days=[{date:'2026-11-07',expected:20,answered:0,credited:20,caughtUp:true,status:'complete'},{date:'2026-11-14',expected:20,answered:40,credited:20,status:'complete'}];
 const {dom,ctx}=setup(async()=>({totalQuestions:40,streak:1,schedule:{days,today:days[1],backlog:dueSummary(40).backlog},weeks:[],skills:[]}));
 try{await renderStudent('/s/progress',ctx);assert.equal(document.querySelector('[data-questions-behind]').textContent,'120');const first=document.querySelector('.calendar-square');assert.match(first.textContent,/Caught up/);assert.match(first.getAttribute('aria-label'),/0 answered on this date, 20 credited from catch-up/);assert.equal(document.querySelectorAll('.calendar-square.complete').length,2);assert.match(document.querySelector('.calendar-note').textContent,/20 answers have helped catch up earlier work/);}finally{dom.window.close();}
});
test('catch-up route respects the server completion when earlier work is already caught up',async()=>{
 const current=dueSummary(0,{behind:20,overdue:0,remainingToday:20});
 const {dom,ctx}=setup(async path=>path.endsWith('/summary')?current:{question:null,done:true,summary:current});
 try{await renderStudent('/s/practice?intent=catchup&count=5',ctx);assert.equal(document.querySelector('#practice-answer-form'),null);assert.match(document.body.textContent,/Your earlier work is caught up/);assert.equal(document.querySelector('[data-questions-behind]').textContent,'20');}finally{dom.window.close();}
});

// A different tab can clear the deficit after the server reserves this question.
test('catch-up resumes a reserved question even if another tab has cleared the backlog',async()=>{
 let answered=0,requested=0;const current=dueSummary(160);
 const {dom,ctx}=setup(async(path,body)=>{
  if(path.endsWith('/summary'))return current;
  if(path.endsWith('/question')){requested++;assert.equal(body.intent,'catchup');return {resumedPending:true,question:{id:'reserved-catchup',source:'practice',skill:'D1',prompt:'Add.'},summary:current};}
  if(path.endsWith('/answer')){answered++;return {correct:true,solution:['3'],summary:{...current,answered:161}};}
  throw Error(path);
 });
 try{await renderStudent('/s/practice?intent=catchup&count=5',ctx);assert.ok(document.querySelector('#practice-answer-form'));document.querySelector('[name=answer]').value='3';document.querySelector('#practice-answer-form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.equal(document.querySelector('#next-question').textContent,'Finish set');document.querySelector('#next-question').click();await tick();assert.equal(requested,1);assert.equal(answered,1);assert.match(document.body.textContent,/Your earlier work is caught up/);}finally{dom.window.close();}
});
