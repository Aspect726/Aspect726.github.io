import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderTeacher } from '../public/teacher.mjs';
import { createSQLiteDB } from '../server/storage.mjs';
import { createTutorHistory } from '../server/tutor-history.mjs';
import { createManagement } from '../server/management.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hostile = '<img src=x onerror="globalThis.injected=true"><script>injected=true</script>';
const sample = () => ({
 student: {id:'student',name:'Alex',username:'alex'},
 skills:[{skill:'D-DIV',name:'Divide by a decimal'},{skill:'G-PERIM',name:'Find a perimeter'}],
 skillSummaries:[{skill:'D-DIV',name:'Divide by a decimal',attempts:4,correct:3,accuracy:75,lastPracticed:'2026-11-14'}],
 helpSummary:{hint:2,step:3,answer:1,total:6,conversations:2},
 commonMistakes:[{skill:'D-DIV',name:'Divide by a decimal',label:'Moved only one decimal point '+hostile,count:2,lastAt:'2026-11-14T20:00:00Z'}],
 items:[
  {type:'conversation',id:'c1',questionId:'q1',skill:'D-DIV',skillName:'Divide by a decimal',questionText:'A juice-stall question. '+hostile,mode:'check-reasoning',message:'I divided the total.\nIs that right? '+hostile,reply:'Start with the amount left.\nThen count cups. '+hostile,assessment:'needs_work',source:'ai',createdAt:'2026-11-14T20:30:00Z'},
  {type:'help',id:'h1',questionId:'q1',skill:'D-DIV',skillName:'Divide by a decimal',questionText:'A juice-stall question.',kind:'step',part:0,createdAt:'2026-11-14T20:29:00Z'},
  {type:'answer',id:'a1',questionId:'q1',skill:'D-DIV',skillName:'Divide by a decimal',questionText:'A juice-stall question.',givenAnswer:'15 cups '+hostile,correctAnswer:'18 cups',correct:false,seconds:52,source:'practice',createdAt:'2026-11-14T20:28:00Z'}
 ],
 pagination:{limit:20,nextCursor:'opaque:2026-11-14T20:28:00Z|a1&next',hasMore:true}
});
function fixture(history=sample(),historyFailure) {
 const dom = new JSDOM('<main id="app"></main>',{url:'https://example.test/t/students/student?section=history'});
 const previousDocument=globalThis.document,previousFormData=globalThis.FormData;
 globalThis.document=dom.window.document;globalThis.FormData=dom.window.FormData;
 const requests=[],navigations=[],state={studentId:'student'},students=[{id:'student',name:'Alex',username:'alex'},{id:'other',name:'Riley',username:'riley'}];
 const ctx={state,escape,tell:()=>{},mathMarkup:(value,trusted)=>{assert.equal(Boolean(trusted),false,'history never treats saved text as trusted markup');return escape(value);},shell:html=>{document.getElementById('app').innerHTML=html;},navigate:path=>{navigations.push(path);},api:async path=>{
  const url=new URL(path,'https://example.test');requests.push(url);
  if(url.pathname==='/v2/teacher/students')return{students};
  if(/^\/v2\/teacher\/students\//.test(url.pathname))return{student:students.find(s=>s.id===url.pathname.split('/').at(-1)),summary:{answered:4,streak:1,accuracy:75},skills:[],attempts:[],days:[],mistakes:[]};
  if(url.pathname==='/v2/teacher/tutor-history'){if(historyFailure)throw Error(historyFailure);return structuredClone(history);}
  throw Error('Unexpected API '+path);
 }};
 return{dom,ctx,requests,navigations,state,render:path=>renderTeacher(path,ctx),close(){dom.window.close();globalThis.document=previousDocument;globalThis.FormData=previousFormData;}};
}

test('teacher history presents persistent answers, help, progress and conversations without interpreting stored HTML',async()=>{
 const f=fixture();try{
  await f.render('/t/students/student?section=history&skill=D-DIV');
  const request=f.requests.find(x=>x.pathname.endsWith('/tutor-history'));
  assert.equal(f.requests.some(x=>/^\/v2\/teacher\/students\//.test(x.pathname)),false,'bounded history does not also download the full answer archive');
  assert.equal(request.searchParams.get('studentId'),'student');assert.equal(request.searchParams.get('skill'),'D-DIV');assert.equal(request.searchParams.get('limit'),'20');
  assert.equal(document.querySelector('.section-nav [aria-current=page]').textContent,'Learning history');
  assert.equal(document.querySelectorAll('.learning-history-item').length,3);
  const text=document.body.textContent;
  for(const phrase of ['15 cups','18 cups','Looked at a worked step','Shared their reasoning','Is that right?','Then count cups.','Moved only one decimal point','A step needs another look.','does not change the question’s score','75%','6'])assert.ok(text.includes(phrase),phrase);
  assert.ok(text.includes(hostile));assert.equal(document.querySelectorAll('img,script,[onerror]').length,0,'saved text remains inert');
  assert.equal(document.querySelectorAll('.learning-history-message').length,2);
  assert.match(text,/Pacific time/);assert.match(document.querySelector('time').textContent,/12:30 PM/,'UTC timestamps display in Pacific time');
 }finally{f.close();}
});

test('history cursor pagination preserves student and skill and can return to latest',async()=>{
 const f=fixture();try{
  const cursor='older:2026-11-14T20:30:00Z|row&1';
  await f.render('/t/students/other?section=history&skill=G-PERIM&cursor='+encodeURIComponent(cursor));
  const request=f.requests.find(x=>x.pathname.endsWith('/tutor-history'));
  assert.equal(request.searchParams.get('studentId'),'other');assert.equal(request.searchParams.get('cursor'),cursor);
  const older=new URL(document.querySelector('.learning-history-pagination a').href);
  assert.equal(older.pathname,'/t/students/other');assert.equal(older.searchParams.get('skill'),'G-PERIM');assert.equal(older.searchParams.get('cursor'),sample().pagination.nextCursor);
  const latest=[...document.querySelectorAll('a')].find(a=>a.textContent==='Back to latest');assert.ok(latest);
  const latestUrl=new URL(latest.href);assert.equal(latestUrl.pathname,'/t/students/other');assert.equal(latestUrl.searchParams.get('skill'),'G-PERIM');assert.equal(latestUrl.searchParams.has('cursor'),false);
 }finally{f.close();}
});

test('changing the history skill resets pagination and stays bound to the displayed student',async()=>{
 const f=fixture();try{
  await f.render('/t/students/student?section=history&cursor=old-page');
  document.getElementById('history-skill').value='G-PERIM';
  f.state.studentId='other'; // A switch is loading while the existing form is still visible.
  document.getElementById('learning-history-filter').dispatchEvent(new f.dom.window.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(f.navigations.length,1);const next=new URL(f.navigations[0],'https://example.test');
  assert.equal(next.pathname,'/t/students/student');assert.equal(next.searchParams.get('skill'),'G-PERIM');assert.equal(next.searchParams.has('cursor'),false);
 }finally{f.close();}
});

test('empty history and loading failures have usable messages and retry navigation',async()=>{
 const empty=sample();empty.items=[];empty.skillSummaries=[];empty.commonMistakes=[];empty.helpSummary={};empty.pagination={hasMore:false};
 let f=fixture(empty);try{await f.render('/t/students/student?section=history');assert.match(document.body.textContent,/No learning history yet/);assert.equal(document.querySelector('.learning-history-pagination a'),null);assert.doesNotMatch(document.body.textContent,/undefined|NaN|\[object Object\]/);}finally{f.close();}
 f=fixture(sample(),'Could not load '+hostile);try{await f.render('/t/students/student?section=history&skill=D-DIV');assert.ok(document.querySelector('[role=alert]').textContent.includes(hostile));assert.equal(document.querySelectorAll('img,script').length,0);const retry=[...document.querySelectorAll('a')].find(a=>a.textContent==='Try again');assert.ok(retry);assert.equal(new URL(retry.href).searchParams.get('skill'),'D-DIV');assert.ok(document.querySelector('.section-nav'));}finally{f.close();}
});

test('student overview offers a clear history entry point without loading the timeline eagerly',async()=>{
 const f=fixture();try{await f.render('/t/students/student');assert.ok([...document.querySelectorAll('a')].some(a=>a.textContent==='Open learning history'));assert.equal(f.requests.some(x=>x.pathname.endsWith('/tutor-history')),false);}finally{f.close();}
});


test('a late history response cannot bind an old student handler to the new student view',async()=>{
 const f=fixture();let release;const delayed=new Promise(resolve=>{release=resolve;});let waiting=false;
 try {
  const original=f.ctx.api;f.state.routeVersion=1;
  f.ctx.api=async path=>{const url=new URL(path,'https://example.test');if(url.pathname.endsWith('/tutor-history')&&url.searchParams.get('studentId')==='student'){waiting=true;await delayed;}return original(path);};
  const first=f.render('/t/students/student?section=history');
  while(!waiting)await new Promise(resolve=>setTimeout(resolve,1));
  f.state.routeVersion=2;await f.render('/t/students/other?section=history');
  release();await first;
  document.getElementById('history-skill').value='G-PERIM';
  document.getElementById('learning-history-filter').dispatchEvent(new f.dom.window.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(f.navigations.length,1,'only the current view owns the filter handler');
  assert.equal(new URL(f.navigations[0],'https://example.test').pathname,'/t/students/other');
  assert.match(document.querySelector('h1').textContent,/Riley/);
 }finally{release();f.close();}
});

test('teacher history renders the real persistent service and follows its cursor across mixed activity',async()=>{
 const db=createSQLiteDB();db.migrate();const f=fixture();
 try {
  for(const [id,role] of [['teacher','parent'],['student','student'],['other','student']])await db.prepare('INSERT INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind(id,id,id==='student'?'Alex':id,role,'not-used','2026-11-14T10:00:00Z').run();
  const question={skill:'D-DIV',plainPrompt:'Nora has 2 litres and pours 0.2 litres into each cup. How many cups can she fill?',prompt:'Nora has 2 litres and pours 0.2 litres into each cup.',answer:'10',hint:'Divide the total by the cup size.',solution:['2 ÷ 0.2 = 10.','She fills 10 cups.'],hints:[]};
  await db.prepare('INSERT INTO platform_questions(id,student_id,date,skill,template_id,level,question_hash,q,source,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind('history-q','student','2026-11-14','D-DIV','D-DIV:story',1,'history-hash',JSON.stringify(question),'practice','2026-11-14T18:00:00Z').run();
  await db.prepare('INSERT INTO platform_attempts(id,question_id,student_id,date,skill,template_id,level,question_hash,question_text,params,given_answer,correct_answer,is_correct,seconds,source,created_at,result) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('history-a','history-q','student','2026-11-14','D-DIV','D-DIV:story',1,'history-hash',question.plainPrompt,'{}','20 cups','10 cups',0,34,'practice','2026-11-14T18:01:00Z','{}').run();
  const history=createTutorHistory({db,clock:()=>new Date('2026-11-14T18:02:00Z')});
  for(const [kind,part] of [['hint',0],['step',1],['answer',0]])await history.recordHelp('student',{questionId:'history-q',requestId:'help-'+kind+'-request',kind,part});
  for(let i=0;i<21;i++)await history.recordConversation('student',{questionId:'history-q',requestId:'conversation-'+i,studentMessage:'Why divide? Turn '+i,tutorReply:'Each cup is one equal group.',part:1,mode:'explain',assessment:'unclear',source:'worked-help'});
  const management=createManagement({db});
  f.ctx.api=async path=>{const req=new Request('https://example.test/api'+path);const user={id:'teacher',role:'teacher'};const response=await history.handle(req,user)??await management.handle(req,user);assert.ok(response);const data=await response.json();assert.equal(response.status,200);return data;};
  await f.render('/t/students/student?section=history&skill=D-DIV');
  assert.equal(document.querySelectorAll('.learning-history-item').length,20);
  assert.match(document.body.textContent,/21/,'all saved conversations count beyond the current page');
  const older=new URL(document.querySelector('.learning-history-pagination a').href);
  await f.render(older.pathname+older.search);
  assert.equal(document.querySelectorAll('.learning-history-item').length,5);
  assert.match(document.body.textContent,/20 cups/);assert.match(document.body.textContent,/10 cups/);
  assert.equal(document.querySelector('.learning-history-pagination a'),null);
 }finally{f.close();db.close();}
});
