import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderStudent} from '../public/student.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const summary={answered:6,dailyTarget:20,points:0,untilNextPoint:29,nextPointAt:35};
const q={id:'q-story',skill:'D-DIV',name:'Divide decimals',story:true,storyShape:'compare',stepCount:3,level:1,answerUnit:'dollars',answerChoices:{A:'Buy bags',B:'Buy a box'},prompt:'Maya compares supplies for a bake sale. Which option saves money? Give the difference in dollars.'};
function setup(handler){const dom=new JSDOM('<div id="app"></div>',{url:'https://practice.test/s/practice'});globalThis.document=dom.window.document;globalThis.FormData=dom.window.FormData;const ctx={api:handler,escape,mathMarkup:escape,state:{user:{role:'student'},routeVersion:1},navigate:()=>{},tell:()=>{},shell:html=>{document.querySelector('#app').innerHTML=html;}};return{dom,ctx};}
const tick=()=>new Promise(r=>setTimeout(r,0));
const openHelp=async dom=>{const details=document.querySelector('#question-help');details.open=true;details.dispatchEvent(new dom.window.Event('toggle'));await tick();};
const help={hint:'Find the price of each option.',steps:['1. A costs 15 dollars.','2) B costs 12 dollars.','3. 15 − 12 = 3 dollars, so B saves 3 dollars.'],answer:'B, 3 dollars'};
const savedTurn=(id,index=0)=>({id,questionId:q.id,studentMessage:`Question ${id}`,tutorReply:`Reply ${id}`,mode:'explain',part:0,assessment:'unclear',source:'ai',createdAt:`2026-11-14T12:00:${String(index).padStart(2,'0')}.000Z`});
const submitTutor=async(dom,message='Why does that work?')=>{document.querySelector('#tutor-message').value=message;document.querySelector('#tutor-form').dispatchEvent(new dom.window.Event('submit',{cancelable:true,bubbles:true}));await tick();};
test('each practice question offers non-scoring help, progressive steps and a worked answer',async()=>{
 let attempts=0,helpCalls=0;
 const{dom,ctx}=setup(async(path)=>{if(path.endsWith('/summary'))return summary;if(path.endsWith('/question'))return{question:q,summary};if(path.endsWith('/help')){helpCalls++;return{hint:'Find the price of each option.',steps:['A costs 15 dollars.','B costs 12 dollars.','15 − 12 = 3 dollars, so B saves 3 dollars.'],answer:'B, 3 dollars'};}if(path.endsWith('/tutor-status'))return{available:false};if(path.endsWith('/answer')){attempts++;throw Error('Help must not submit');}throw Error(path);});
 try{await renderStudent('/s/practice',ctx);assert.match(document.body.textContent,/Your answer, with units|difference, with units/);assert.match(document.body.textContent,/connected steps/);assert.equal(helpCalls,0);await openHelp(dom);assert.equal(helpCalls,1);assert.equal(attempts,0);assert.equal(document.querySelectorAll('#help-steps li').length,0);document.querySelector('#reveal-help-step').click();assert.equal(document.querySelectorAll('#help-steps li').length,1);assert.match(document.querySelector('.help-answer').textContent,/B, 3 dollars/);assert.equal(document.querySelector('#tutor-form'),null);}finally{dom.window.close();}
});
test('comparison submits choice with numeric answer and units; form-only feedback keeps the question',async()=>{
 let submitted;
 const{dom,ctx}=setup(async(path,body)=>{if(path.endsWith('/summary'))return summary;if(path.endsWith('/question'))return{question:q,summary};if(path.endsWith('/answer')){submitted=body;return{formOnly:true,hint:'Include dollars.',summary};}throw Error(path);});
 try{await renderStudent('/s/practice',ctx);document.querySelector('[name=answerChoice][value=B]').checked=true;document.querySelector('[name=answer]').value='3';document.querySelector('#practice-answer-form').dispatchEvent(new dom.window.Event('submit',{cancelable:true,bubbles:true}));await tick();assert.equal(submitted.answer,'B, 3');assert.match(document.querySelector('.form-error').textContent,/Include dollars/);assert.equal(document.querySelector('#next-question'),null);assert.equal(document.querySelector('#practice-answer-form button').disabled,false);}finally{dom.window.close();}
});
test('AI helper receives only the selected question and part and safely renders the reply',async()=>{
 let tutor;
 const{dom,ctx}=setup(async(path,body)=>{if(path.endsWith('/summary'))return summary;if(path.endsWith('/question'))return{question:q,summary};if(path.endsWith('/help'))return{hint:'Compare total costs.',steps:['Find the first total.','Find the difference.'],answer:'B, 3 dollars'};if(path.endsWith('/tutor-status'))return{available:true};if(path.endsWith('/tutor')){tutor=body;return{reply:'<img src=x onerror=alert(1)> is not a maths step.',assessment:'needs_work',source:'ai'};}throw Error(path);});
 try{await renderStudent('/s/practice',ctx);await openHelp(dom);document.querySelector('#reveal-help-step').click();document.querySelector('[data-step]').click();assert.equal(document.querySelector('#tutor-part').value,'1');document.querySelector('#tutor-mode').value='check-reasoning';document.querySelector('#tutor-message').value='I subtracted the total costs.';document.querySelector('#tutor-form').dispatchEvent(new dom.window.Event('submit',{cancelable:true,bubbles:true}));await tick();assert.equal(tutor.questionId,'q-story');assert.equal(tutor.part,1);assert.equal(tutor.mode,'check-reasoning');assert.ok(tutor.requestId);assert.equal(document.querySelector('#tutor-response img'),null);assert.match(document.querySelector('#tutor-response').textContent,/<img/);assert.equal(document.querySelector('#next-question'),null);}finally{dom.window.close();}
});
test('late help responses cannot replace another page after navigation',async()=>{
 let resolveHelp;
 const{dom,ctx}=setup(async path=>{if(path.endsWith('/summary'))return summary;if(path.endsWith('/question'))return{question:q,summary};if(path.endsWith('/help'))return new Promise(r=>{resolveHelp=r;});if(path.endsWith('/tutor-status'))return{available:true};throw Error(path);});
 try{await renderStudent('/s/practice',ctx);await openHelp(dom);ctx.state.routeVersion++;document.querySelector('#app').innerHTML='<h1>Settings</h1>';resolveHelp({hint:'Old',steps:['Old'],answer:'Old'});await tick();assert.equal(document.querySelector('h1').textContent,'Settings');}finally{dom.window.close();}
});

test('saved tutor conversations restore the latest ten safely even while AI help is paused',async()=>{
 const turns=Array.from({length:12},(_,i)=>savedTurn(`old-${i}`,i));turns[11].studentMessage='<svg onload=alert(1)>my question</svg>';turns[11].tutorReply='<img src=x onerror=alert(1)>Use the first result.';
 let historyPath,attempts=0;
 const{dom,ctx}=setup(async(path)=>{if(path.endsWith('/summary'))return summary;if(path.endsWith('/question'))return{question:q,summary};if(path.endsWith('/help'))return help;if(path.endsWith('/tutor-status'))return{available:false};if(path.startsWith('/v2/student/tutor-history?')){historyPath=path;return{conversations:turns};}if(path.endsWith('/help-event'))return{ok:true};if(path.endsWith('/answer'))attempts++;throw Error(path);});
 try{
  await renderStudent('/s/practice',ctx);await openHelp(dom);
  assert.equal(historyPath,'/v2/student/tutor-history?questionId=q-story');
  const history=document.querySelector('#tutor-response');assert.equal(history.children.length,10);assert.equal(history.firstElementChild.dataset.turnId,'old-2');assert.equal(history.lastElementChild.dataset.turnId,'old-11');
  assert.equal(history.querySelector('svg,img'),null);assert.match(history.textContent,/<svg onload/);assert.match(history.textContent,/<img src/);
  assert.match(document.querySelector('.tutor-save-note').textContent,/saved for learning.*teacher can see/);assert.equal(document.querySelector('#tutor-form'),null);assert.equal(attempts,0);assert.equal(ctx.state.summary.points,0);
 }finally{dom.window.close();}
});

test('new tutor messages append to the conversation and preserve earlier turns',async()=>{
 let count=0;
 const{dom,ctx}=setup(async(path,body)=>{if(path.endsWith('/summary'))return summary;if(path.endsWith('/question'))return{question:q,summary};if(path.endsWith('/help'))return help;if(path.endsWith('/tutor-status'))return{available:true};if(path.startsWith('/v2/student/tutor-history?'))return{conversations:[savedTurn('old',0)]};if(path.endsWith('/help-event'))return{ok:true};if(path.endsWith('/tutor')){count++;return{conversationId:`new-${count}`,createdAt:`2026-11-14T12:01:0${count}.000Z`,reply:`Explanation ${count}: ${body.message}`,assessment:'sound',source:'ai'};}throw Error(path);});
 try{
  await renderStudent('/s/practice',ctx);await openHelp(dom);const first=document.querySelector('.tutor-turn');
  await submitTutor(dom,'<b>my first question</b>');await submitTutor(dom,'my second question');
  const history=document.querySelector('#tutor-response');assert.equal(history.children.length,3);assert.equal(history.firstElementChild,first);assert.match(history.textContent,/Reply old/);assert.match(history.textContent,/my first question/);assert.match(history.textContent,/my second question/);assert.equal(history.querySelector('b'),null);assert.equal(document.querySelector('#tutor-message').value,'');assert.equal(document.querySelector('#next-question'),null);
 }finally{dom.window.close();}
});

test('a late saved-history response merges with a new reply instead of replacing it',async()=>{
 let resolveHistory;
 const{dom,ctx}=setup(async(path)=>{if(path.endsWith('/summary'))return summary;if(path.endsWith('/question'))return{question:q,summary};if(path.endsWith('/help'))return help;if(path.endsWith('/tutor-status'))return{available:true};if(path.startsWith('/v2/student/tutor-history?'))return new Promise(resolve=>{resolveHistory=resolve;});if(path.endsWith('/help-event'))return{ok:true};if(path.endsWith('/tutor'))return{conversationId:'new',createdAt:'2026-11-14T12:00:05.000Z',reply:'A new reply',source:'ai'};throw Error(path);});
 try{
  await renderStudent('/s/practice',ctx);await openHelp(dom);assert.ok(document.querySelector('#reveal-help-step'),'History loading does not block worked help');await submitTutor(dom);
  assert.match(document.querySelector('#tutor-response').textContent,/A new reply/);
  resolveHistory({conversations:[savedTurn('old',0),{...savedTurn('new',5),tutorReply:'A new reply'}]});await tick();
  assert.equal(document.querySelectorAll('.tutor-turn').length,2);assert.match(document.querySelector('#tutor-response').textContent,/Reply old/);assert.match(document.querySelector('#tutor-response').textContent,/A new reply/);
 }finally{dom.window.close();}
});

test('help events log exactly once for displayed hint, each opened step and full answer',async()=>{
 const events=[];let attempts=0,questions=0;
 const{dom,ctx}=setup(async(path,body)=>{if(path.endsWith('/summary'))return summary;if(path.endsWith('/question')){questions++;return{question:q,summary};}if(path.endsWith('/help'))return help;if(path.endsWith('/tutor-status'))return{available:false};if(path.startsWith('/v2/student/tutor-history?'))return{conversations:[]};if(path.endsWith('/help-event')){events.push(body);return{ok:true};}if(path.endsWith('/answer')){attempts++;return{correct:false,answer:'B, 3 dollars',rightAnswer:'B, 3 dollars',solution:help.steps,summary:{...summary,answered:7},pointsAwarded:0};}throw Error(path);});
 try{
  await renderStudent('/s/practice',ctx);await openHelp(dom);document.querySelector('#reveal-help-step').click();document.querySelector('#reveal-help-step').click();await tick();
  assert.deepEqual(events.map(x=>[x.kind,x.part]),[['hint',0],['step',1],['step',2]]);assert.equal(attempts,0);assert.equal(ctx.state.summary.points,0);
  const answer=document.querySelector('.help-answer');answer.open=true;answer.dispatchEvent(new dom.window.Event('toggle'));await tick();answer.open=false;answer.dispatchEvent(new dom.window.Event('toggle'));answer.open=true;answer.dispatchEvent(new dom.window.Event('toggle'));await tick();
  const outer=document.querySelector('#question-help');outer.open=false;outer.dispatchEvent(new dom.window.Event('toggle'));await openHelp(dom);
  document.querySelector('[name=answerChoice][value=B]').checked=true;document.querySelector('[name=answer]').value='2 dollars';document.querySelector('#practice-answer-form').dispatchEvent(new dom.window.Event('submit',{cancelable:true,bubbles:true}));await tick();
  const feedback=document.querySelector('.feedback-worked');feedback.open=true;feedback.dispatchEvent(new dom.window.Event('toggle'));await tick();
  assert.deepEqual(events.map(x=>[x.kind,x.part]),[['hint',0],['step',1],['step',2],['answer',0]]);
  assert.equal(new Set(events.map(x=>x.requestId)).size,events.length);assert.ok(events.every(x=>x.questionId===q.id));assert.equal(attempts,1);assert.equal(questions,1,'Help and grading do not auto-advance');assert.equal(ctx.state.summary.points,0);
  assert.ok([...document.querySelectorAll('.steps li')].every(li=>!/^\d+[.)]\s/.test(li.textContent)),'Ordered list markers must not be duplicated in the text');
 }finally{dom.window.close();}
});

test('failed event logging and unavailable history never block help or answer submission',async()=>{
 let attempts=0;
 const{dom,ctx}=setup(async(path)=>{if(path.endsWith('/summary'))return summary;if(path.endsWith('/question'))return{question:q,summary};if(path.endsWith('/help'))return help;if(path.endsWith('/tutor-status'))return{available:false};if(path.startsWith('/v2/student/tutor-history?'))throw Error('History offline');if(path.endsWith('/help-event'))throw Error('Log offline');if(path.endsWith('/answer')){attempts++;return{formOnly:true,hint:'Include dollars.',summary};}throw Error(path);});
 try{
  await renderStudent('/s/practice',ctx);await openHelp(dom);document.querySelector('#reveal-help-step').click();await tick();assert.equal(document.querySelectorAll('#help-steps li').length,1);assert.match(document.querySelector('.tutor-history-status').textContent,/could not be loaded/);
  document.querySelector('[name=answerChoice][value=B]').checked=true;document.querySelector('[name=answer]').value='3';document.querySelector('#practice-answer-form').dispatchEvent(new dom.window.Event('submit',{cancelable:true,bubbles:true}));await tick();assert.equal(attempts,1);assert.match(document.querySelector('.form-error').textContent,/Include dollars/);
 }finally{dom.window.close();}
});

test('a hint hidden before loading is not recorded as viewed until it is opened',async()=>{
 let resolveHelp;const events=[];
 const{dom,ctx}=setup(async(path,body)=>{if(path.endsWith('/summary'))return summary;if(path.endsWith('/question'))return{question:q,summary};if(path.endsWith('/help'))return new Promise(resolve=>{resolveHelp=resolve;});if(path.endsWith('/tutor-status'))return{available:false};if(path.startsWith('/v2/student/tutor-history?'))return{conversations:[]};if(path.endsWith('/help-event')){events.push(body);return{ok:true};}throw Error(path);});
 try{
  await renderStudent('/s/practice',ctx);await openHelp(dom);document.querySelector('#question-help').open=false;resolveHelp(help);await tick();assert.equal(events.length,0);await openHelp(dom);assert.deepEqual(events.map(x=>x.kind),['hint']);
 }finally{dom.window.close();}
});

test('late history and tutor replies cannot leak into a different page',async()=>{
 let resolveHistory,resolveTutor;
 const{dom,ctx}=setup(async(path)=>{if(path.endsWith('/summary'))return summary;if(path.endsWith('/question'))return{question:q,summary};if(path.endsWith('/help'))return help;if(path.endsWith('/tutor-status'))return{available:true};if(path.startsWith('/v2/student/tutor-history?'))return new Promise(resolve=>{resolveHistory=resolve;});if(path.endsWith('/help-event'))return{ok:true};if(path.endsWith('/tutor'))return new Promise(resolve=>{resolveTutor=resolve;});throw Error(path);});
 try{
  await renderStudent('/s/practice',ctx);await openHelp(dom);await submitTutor(dom);ctx.state.routeVersion++;document.querySelector('#app').innerHTML='<h1>Another student page</h1>';resolveHistory({conversations:[savedTurn('old')]});resolveTutor({reply:'Old response',source:'ai',conversationId:'old-response'});await tick();assert.equal(document.querySelector('h1').textContent,'Another student page');assert.equal(document.querySelector('#tutor-response'),null);assert.doesNotMatch(document.body.textContent,/Old response|Reply old/);
 }finally{dom.window.close();}
});

test('step numbering is removed only from list entries, preserving decimals and question prompts',async()=>{
 const numbered={...help,steps:['1. First calculation.','1.25 litres remain.','3) Final calculation.']};
 const{dom,ctx}=setup(async(path)=>{if(path.endsWith('/summary'))return summary;if(path.endsWith('/question'))return{question:{...q,prompt:'1.25 litres of paint are available.'},summary};if(path.endsWith('/help'))return numbered;if(path.endsWith('/tutor-status'))return{available:false};if(path.startsWith('/v2/student/tutor-history?'))return{conversations:[]};if(path.endsWith('/help-event'))return{ok:true};if(path.startsWith('/v2/student/lesson?'))return{name:'A lesson',week:1,rule:'Measure carefully.',idea:'Use the first result.',examples:[{prompt:'1.25 litres of paint.',steps:numbered.steps}],trap:{text:'Check the units.'}};throw Error(path);});
 try{
  await renderStudent('/s/practice',ctx);await openHelp(dom);assert.equal(document.querySelector('.question-prompt').textContent,'1.25 litres of paint are available.');assert.deepEqual([...document.querySelectorAll('.help-answer li')].map(x=>x.textContent),['First calculation.','1.25 litres remain.','Final calculation.']);
  await renderStudent('/s/learn/D-DIV',ctx);for(let i=0;i<3;i++)document.querySelector('[data-next-step]').click();assert.deepEqual([...document.querySelectorAll('#example-steps-0 li')].map(x=>x.textContent),['First calculation.','1.25 litres remain.','Final calculation.']);assert.equal(document.querySelector('.example-prompt').textContent,'1.25 litres of paint.');
 }finally{dom.window.close();}
});
