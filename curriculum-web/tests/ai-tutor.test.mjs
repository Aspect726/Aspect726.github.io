import test from 'node:test';
import assert from 'node:assert/strict';
import { createSQLiteDB } from '../server/storage.mjs';
import { createTutor, tutorModel } from '../server/ai-tutor.mjs';
import { createTutorHistory } from '../server/tutor-history.mjs';
import { JSDOM } from 'jsdom';
import { renderTeacher } from '../public/teacher.mjs';

const question={skill:'D-SUB',prompt:'Maya has 12 metres of cord. She uses 3 metres, then shares the rest among 3 teams. How many metres does each team get?',answer:'3',answerUnit:'metres',hint:'Subtract the cord Maya uses before sharing the remainder.',solution:['12 − 3 = 9 metres remain.','9 ÷ 3 = 3 metres for each team.']};
const okReply=(reply='First subtract the used cord: 12 − 3 = 9 metres. What will you do with the three equal teams?',assessment='unclear')=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({reply,assessment})}]}],usage:{input_tokens:450,output_tokens:65}}),{status:200,headers:{'content-type':'application/json'}});
async function fixture(options={}) {
  const db=createSQLiteDB();db.migrate();
  for(const [id,name,role] of [['teacher','Teacher','parent'],['student','Private learner name','student'],['other','Other private learner','student']])await db.prepare('INSERT INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind(id,id,name,role,'unused','2026-11-14T20:00:00Z').run();
  for(const id of ['student','other'])await db.prepare('INSERT INTO platform_questions(id,student_id,date,skill,template_id,level,question_hash,q,source,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind('question-'+id,id,'2026-11-14','D-SUB','D-SUB:story-missing',1,'hash-'+id,JSON.stringify(question),'practice','2026-11-14T20:00:00Z').run();
  const calls=[];
  const platform={async ownedQuestion(studentId,questionId){const record=await db.prepare('SELECT * FROM platform_questions WHERE student_id=? AND id=?').bind(studentId,questionId).first();if(!record)throw Object.assign(Error('That question was not found.'),{status:404});return {question:JSON.parse(record.q),record};}};
  const clock=options.clock||(()=>new Date('2026-11-14T20:00:00Z'));
  const history=options.history?createTutorHistory({db,platform,clock}):null;
  const service=createTutor({db,platform,history,clock,ai:{apiKey:options.key===undefined?'test-secret-unused-by-network':options.key,model:options.model,fetch:async(url,request)=>{calls.push({url,request,payload:JSON.parse(request.body)});return options.fetch?options.fetch(url,request):okReply();}}});
  const request=async(path,body,user={id:'student',role:'student'},method=body===undefined?'GET':'POST')=>{const response=await service.handle(new Request('https://practice.test/api/v2/'+path,{method,...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})}),user);return response?{status:response.status,data:await response.json()}:null;};
  const ask=(extra={},user)=>request('student/tutor',{questionId:'question-student',message:'Why do we subtract first?',mode:'explain',part:1,requestId:'request-0001',...extra},user);
  return {db,service,history,calls,request,ask,close:()=>db.close()};
}

async function previousAnswer(f,{id,studentId='student',skill='D-SUB',correct=false,marker='Earlier cord problem',given='12 metres'}){
  await f.db.prepare('INSERT INTO platform_attempts(id,question_id,student_id,date,skill,template_id,level,question_hash,question_text,params,given_answer,correct_answer,is_correct,mistake_label,seconds,source,created_at,result) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,'previous-'+id,studentId,'2026-11-13',skill,skill+':story-missing',1,'hash-'+id,marker,'{}',given,'3 metres',Number(correct),correct?null:skill+':0',15,'practice','2026-11-13T20:00:00Z',JSON.stringify({hint:'Subtract what was used before sharing the rest.',mistakeLabel:correct?null:skill+':0'})).run();
}

test('tutor sends only the owned problem and computed solution, returns structured explanation, and never records an answer',async()=>{
  const f=await fixture();try{
    const result=await f.ask();assert.equal(result.data.source,'ai');assert.equal(result.data.assessment,'unclear');assert.equal(result.data.remaining,29);
    assert.equal(f.calls.length,1);const {url,request,payload}=f.calls[0];assert.equal(url,'https://api.openai.com/v1/responses');
    assert.equal(request.headers.Authorization,'Bearer test-secret-unused-by-network');assert.equal(payload.store,false);assert.equal(payload.model,'gpt-5-nano');assert.equal(payload.reasoning.effort,'minimal');assert.ok(payload.max_output_tokens<=700);assert.equal(payload.text.format.strict,true);
    const input=JSON.parse(payload.input);assert.equal(input.reference.computedAnswer,'3 metres');assert.match(input.reference.focus,/Worked step 1/);assert.equal(input.reference.workedSteps.length,2);
    assert.doesNotMatch(request.body,/Private learner|test-secret|question-student|password/i);
    assert.doesNotMatch(JSON.stringify(result),/test-secret|Bearer|instructions|input_tokens|computedAnswer/);
    assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM platform_attempts').first()).n,0);
    assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM practice_ledger').first()).n,0);
  }finally{f.close();}
});

test('reasoning feedback is advisory and may identify an error without changing the mathematical grade',async()=>{
  const f=await fixture({fetch:async()=>okReply('You used all 12 metres. First remove the 3 metres already used, then divide what remains.','needs_work')});try{
    const result=await f.ask({mode:'check-reasoning',message:'I divided 12 by 3 and got 4 metres.'});
    assert.equal(result.data.assessment,'needs_work');assert.equal(result.data.source,'ai');
    assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM platform_attempts').first()).n,0);
  }finally{f.close();}
});

test('tutor requires student role, question ownership, valid input, and a bounded step',async()=>{
  const f=await fixture();try{
    await assert.rejects(f.ask({},null),e=>e.status===401);
    await assert.rejects(f.ask({},{id:'teacher',role:'teacher'}),e=>e.status===403);
    await assert.rejects(f.ask({questionId:'question-other'}),e=>e.status===404);
    for(const bad of [{message:''},{message:'x'.repeat(601)},{part:3},{part:-1},{part:0.5},{requestId:'x'},{mode:'grade-everything'}])await assert.rejects(f.ask(bad),e=>e.status===400);
    assert.equal(f.calls.length,0);
  }finally{f.close();}
});

test('identical requests and identical content share a cached reply; changed content cannot reuse an id',async()=>{
  const f=await fixture();try{
    await f.ask();const same=await f.ask();assert.equal(same.data.cached,true);
    const content=await f.ask({requestId:'new-request-2'});assert.equal(content.data.cached,true);assert.equal(f.calls.length,1);
    await assert.rejects(f.ask({message:'A different question?'}),e=>e.status===409);
    const row=await f.db.prepare('SELECT * FROM platform_ai_requests').first();
    assert.equal(row.input_tokens,450);assert.equal(row.output_tokens,65);assert.equal(row.status,'complete');
    assert.doesNotMatch(JSON.stringify(row),/Why do we subtract|Private learner|test-secret/);
  }finally{f.close();}
});

test('simultaneous duplicate requests reserve one provider call',async()=>{
  let release,entered;const called=new Promise(resolve=>{entered=resolve;});const block=new Promise(resolve=>{release=resolve;});
  const f=await fixture({fetch:async()=>{entered();await block;return okReply();}});try{
    const first=f.ask();await called;const concurrent=await f.ask({requestId:'request-0002'});
    assert.equal(concurrent.data.source,'worked-help');assert.match(concurrent.data.notice,/being prepared/);assert.equal(f.calls.length,1);
    release();await first;const cached=await f.ask({requestId:'request-0003'});assert.equal(cached.data.source,'ai');assert.equal(cached.data.cached,true);
  }finally{release?.();f.close();}
});

test('atomic classroom and student allowances survive parallel requests and are controlled by teachers',async()=>{
  let release,entered;const called=new Promise(resolve=>{entered=resolve;});const block=new Promise(resolve=>{release=resolve;});
  const f=await fixture({fetch:async()=>{entered();await block;return okReply();}});try{
    await assert.rejects(f.request('teacher/ai-settings',undefined,{id:'student',role:'student'}),e=>e.status===403);
    await f.request('teacher/ai-settings',{enabled:true,studentDailyLimit:2,globalDailyLimit:1},{id:'teacher',role:'teacher'});
    const first=f.ask();await called;
    const other=await f.ask({questionId:'question-other',requestId:'other-0001'},{id:'other',role:'student'});
    assert.equal(other.data.source,'worked-help');assert.equal(other.data.remaining,0);assert.match(other.data.notice,/allowance/);assert.equal(f.calls.length,1);
    release();await first;
    const settings=(await f.request('teacher/ai-settings',undefined,{id:'teacher',role:'teacher'})).data;
    assert.equal(settings.usage.total,1);assert.equal(settings.usage.students[0].requests,1);assert.equal(settings.configured,true);
    assert.doesNotMatch(JSON.stringify(settings),/test-secret/);
    await f.request('teacher/ai-settings',{enabled:false,studentDailyLimit:2,globalDailyLimit:2},{id:'teacher',role:'teacher'});
    const paused=await f.ask({requestId:'request-paused',message:'How do I share it?'});assert.equal(paused.data.source,'worked-help');assert.match(paused.data.notice,/paused/);
  }finally{release?.();f.close();}
});

test('missing key, provider failures, refusals and malformed answers leave deterministic help available',async()=>{
  for(const options of [
    {key:''},
    {fetch:async()=>{throw Error('network failure contains secret');}},
    {fetch:async()=>new Response(JSON.stringify({error:{code:'rate_limit',message:'sensitive provider details'}}),{status:429})},
    {fetch:async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'Cannot help.'}]}]}))},
    {fetch:async()=>new Response(JSON.stringify({status:'incomplete',output:[{type:'message',content:[{type:'output_text',text:'{"reply":"Partial","assessment":"unclear"}'}]}]}))},
    {fetch:async()=>okReply('sk-unwantedkeylikevalue12345','unclear')},
    {fetch:async()=>new Response('null')},
    {fetch:async()=>new Response(JSON.stringify({status:'completed',output:{type:'message'}}))},
    {fetch:async()=>new Response(JSON.stringify({status:'completed',output:[null,{type:'message',content:[null,{type:'output_text',text:'null'}]}]}))},
    {fetch:async()=>new Response('not json')}
  ]) {
    const f=await fixture(options);try{const result=await f.ask();assert.equal(result.data.source,'worked-help');assert.match(result.data.reply,/12 − 3 = 9 metres/);assert.doesNotMatch(JSON.stringify(result),/sensitive|secret|sk-unwanted|network failure/);assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM platform_attempts').first()).n,0);}finally{f.close();}
  }
});

test('retirement and model-not-found move only to the approved inexpensive replacement',async()=>{
  assert.equal(tutorModel('gpt-5-nano','2026-12-10'),'gpt-5-nano');assert.equal(tutorModel('gpt-5-nano','2026-12-11'),'gpt-6-luna');assert.equal(tutorModel('arbitrary-expensive-model','2026-11-14'),'gpt-5-nano');
  let calls=0;const f=await fixture({fetch:async()=>++calls===1?new Response(JSON.stringify({error:{code:'model_not_found'}}),{status:404}):okReply()});try{
    const result=await f.ask();assert.equal(result.data.source,'ai');assert.equal(f.calls.length,2);assert.equal(f.calls[1].payload.model,'gpt-6-luna');assert.equal(f.calls[1].payload.reasoning.effort,'none');
  }finally{f.close();}
});

test('history-aware help retrieves bounded relevant answers, mistakes, help and conversations for this student only',async()=>{
  const f=await fixture({history:true});try{
    await previousAnswer(f,{id:'wrong-one',marker:'Cord task before sharing'});
    await previousAnswer(f,{id:'wrong-two',marker:'Another cord task before sharing'});
    await previousAnswer(f,{id:'other-secret',studentId:'other',marker:'OTHER_STUDENT_PRIVATE_ANSWER'});
    await previousAnswer(f,{id:'unrelated-skill',skill:'N-ADD',marker:'UNRELATED_SKILL_ANSWER'});
    await f.history.recordHelp('student',{questionId:'question-student',kind:'hint',requestId:'hint-request-1'});
    await f.history.recordConversation('student',{questionId:'question-student',studentMessage:'I keep dividing before subtracting.',tutorReply:'First find the cord that remains.',requestId:'previous-conversation-1',mode:'explain',part:1,assessment:'unclear',source:'ai'});
    await f.history.recordConversation('other',{questionId:'question-other',studentMessage:'OTHER_STUDENT_PRIVATE_MESSAGE',tutorReply:'OTHER_STUDENT_PRIVATE_REPLY',requestId:'other-conversation-1',mode:'explain',part:1,assessment:'unclear',source:'ai'});
    const result=await f.ask();const input=JSON.parse(f.calls[0].payload.input),context=JSON.parse(input.learningHistory);
    assert.ok(input.learningHistory.length<=2400);assert.ok(context.recentAnswers.length<=6);assert.ok(context.conversations.length<=3);assert.ok(context.helpUsed.recent.length<=8);
    assert.equal(context.skill.answered,2);assert.equal(context.helpUsed.hint,1);assert.ok(context.commonMistakes.some(m=>m.count===2));
    assert.match(input.learningHistory,/Cord task|cord task/);assert.match(input.learningHistory,/dividing before subtracting/);
    assert.doesNotMatch(f.calls[0].request.body,/OTHER_STUDENT|UNRELATED_SKILL|Private learner|question-student|test-secret/);
    assert.ok(result.data.conversationId);assert.ok(result.data.createdAt);
    assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM platform_attempts').first()).n,4);
    const row=await f.db.prepare('SELECT * FROM platform_tutor_conversations WHERE id=?').bind(result.data.conversationId).first();assert.ok(row);assert.match(JSON.stringify(row),/Why do we subtract first/);
  }finally{f.close();}
});

test('history changes refresh text caching while request retries preserve the original turn',async()=>{
  const f=await fixture({history:true});try{
    const first=await f.ask();
    await f.history.recordHelp('student',{questionId:'question-student',kind:'step',part:2,requestId:'history-step-2'});
    const retry=await f.ask();assert.equal(retry.data.cached,true);assert.equal(retry.data.conversationId,first.data.conversationId);assert.equal(f.calls.length,1);
    const next=await f.ask({requestId:'new-history-request'});assert.equal(f.calls.length,2);assert.notEqual(next.data.conversationId,first.data.conversationId);
    const context=JSON.parse(JSON.parse(f.calls[1].payload.input).learningHistory);assert.equal(context.helpUsed.step,1);assert.ok(context.conversations.length>=1);
    await f.db.prepare('DELETE FROM platform_ai_requests').run();
    const durableRetry=await f.ask();assert.equal(durableRetry.data.conversationId,first.data.conversationId);assert.equal(durableRetry.data.cached,true);assert.equal(f.calls.length,2);
    await assert.rejects(f.ask({message:'A changed payload for the old request.'}),e=>e.status===409);
  }finally{f.close();}
});

test('a concurrent retry with newly changed history cannot replace the in-flight reply with a fallback',async()=>{
  let enterFirst,releaseFirst,releaseSecond,enterProvider,releaseProvider;
  const firstContext=new Promise(resolve=>{enterFirst=resolve;}),firstGate=new Promise(resolve=>{releaseFirst=resolve;}),secondGate=new Promise(resolve=>{releaseSecond=resolve;});
  const providerEntered=new Promise(resolve=>{enterProvider=resolve;}),providerGate=new Promise(resolve=>{releaseProvider=resolve;});
  const f=await fixture({history:true,fetch:async()=>{enterProvider();await providerGate;return okReply();}});try{
    const originalContext=f.history.context;let calls=0;
    f.history.context=async(...args)=>{const context=await originalContext(...args);if(++calls===1){enterFirst();await firstGate;}else{context.helpUsed.hint++;releaseFirst();await secondGate;}return context;};
    const first=f.ask();await firstContext;const concurrent=f.ask();await providerEntered;releaseSecond();
    const pending=await concurrent;assert.equal(pending.data.source,'worked-help');assert.match(pending.data.notice,/being prepared/);
    assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM platform_tutor_conversations').first()).n,0);
    releaseProvider();const result=await first;const retry=await f.ask();assert.equal(result.data.source,'ai');assert.equal(retry.data.source,'ai');assert.equal(result.data.conversationId,retry.data.conversationId);assert.equal(f.calls.length,1);
  }finally{releaseFirst?.();releaseSecond?.();releaseProvider?.();f.close();}
});

test('fallback conversations are durable and education history outlives the transient request cache',async()=>{
  let date='2026-11-14';const f=await fixture({history:true,clock:()=>new Date(date+'T20:00:00Z')});try{
    const first=await f.ask();date='2026-11-24';await f.ask({requestId:'later-history-1',message:'What should I do after subtracting?'});
    assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM platform_ai_requests').first()).n,1);
    assert.ok(await f.db.prepare('SELECT id FROM platform_tutor_conversations WHERE id=?').bind(first.data.conversationId).first());
    await f.request('teacher/ai-settings',{enabled:false,studentDailyLimit:30,globalDailyLimit:300},{id:'teacher',role:'teacher'});
    const paused=await f.ask({requestId:'paused-history-1',message:'Can I still get the first step?'});assert.equal(paused.data.source,'worked-help');assert.ok(paused.data.conversationId);
    await assert.rejects(f.ask({requestId:'paused-history-1',message:'Different question in same request.'}),e=>e.status===409);
    assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM platform_tutor_conversations').first()).n,3);
  }finally{f.close();}
});

test('teacher interface exposes helper limits and submits only settings values',async()=>{
  const dom=new JSDOM('<main id="app"></main>');const oldDocument=globalThis.document,oldFormData=globalThis.FormData;globalThis.document=dom.window.document;globalThis.FormData=dom.window.FormData;
  const calls=[];const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const ctx={state:{studentId:'student'},escape,mathMarkup:escape,tell:()=>{},navigate:()=>{},shell:html=>{document.querySelector('#app').innerHTML=html;},api:async(path,body)=>{
    calls.push({path,body});if(path==='/v2/teacher/students')return {students:[{id:'student',name:'Learner'}]};
    if(path.startsWith('/v2/teacher/settings'))return {accounts:[],program:{}};
    if(path==='/v2/teacher/ai-settings')return {enabled:true,configured:true,model:'gpt-5-nano',studentDailyLimit:30,globalDailyLimit:300,usage:{total:0,students:[]}};
    throw Error(path);
  }};
  try {
    await renderTeacher('/t/settings',ctx);const form=document.querySelector('#ai-settings-form');assert.ok(form);assert.match(document.body.textContent,/Maths helper/);
    form.elements.enabled.checked=false;form.elements.studentDailyLimit.value='10';form.elements.globalDailyLimit.value='50';form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.deepEqual(calls.at(-1),{path:'/v2/teacher/ai-settings',body:{enabled:false,studentDailyLimit:10,globalDailyLimit:50}});
  }finally{dom.window.close();globalThis.document=oldDocument;globalThis.FormData=oldFormData;}
});
