import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSQLiteDB} from '../server/storage.mjs';
import {createTutorHistory} from '../server/tutor-history.mjs';
import {generateQuestion} from '../server/questions.mjs';

async function fixture(path=':memory:'){
 const db=createSQLiteDB(path);db.migrate();let at='2026-11-14T20:00:00.000Z',sequence=0;
 for(const [id,name,role] of [['alice','PRIVATE_ALICE_NAME','student'],['bob','PRIVATE_BOB_NAME','student'],['teacher','Teacher','parent']])await db.prepare('INSERT OR IGNORE INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind(id,id,name,role,'unused',at).run();
 const service=createTutorHistory({db,clock:()=>new Date(at)});
 async function question(studentId='alice',skill='D-SUB',shape='missing'){
  const id='question-'+sequence++,q=generateQuestion(skill,id,{mode:'story',storyShape:shape});
  await db.prepare('INSERT INTO platform_questions(id,student_id,date,skill,template_id,level,question_hash,q,source,created_at) VALUES(?,?,?,?,?,1,?,?,?,?)').bind(id,studentId,'2026-11-14',skill,skill+':'+q.shape,id,JSON.stringify(q),'practice',at).run();return{id,q,studentId,skill};
 }
 async function answer(q,{correct=false,given='9 metres',label=q.skill+':0'}={}){
  const id='attempt-'+sequence++;
  await db.prepare('INSERT INTO platform_attempts(id,question_id,student_id,date,skill,template_id,level,question_hash,question_text,params,given_answer,correct_answer,is_correct,mistake_label,seconds,source,created_at,result) VALUES(?,?,?,?,?,?,1,?,?,?,?,?,?,?,?,?,?,?)').bind(id,q.id,q.studentId,'2026-11-14',q.skill,q.skill+':'+q.q.shape,q.id,q.q.plainPrompt,'{}',given,q.q.answer+' '+q.q.answerUnit,Number(correct),label,30,'practice',at,'{}').run();return id;
 }
 const conversation=(q,extra={})=>service.recordConversation(q.studentId,{questionId:q.id,studentMessage:'Why do I divide here?',tutorReply:'Find one equal share first, then use it in the next step.',requestId:'request-'+sequence++,mode:'explain',part:1,assessment:'unclear',source:'ai',...extra});
 const request=(path,body,method=body===undefined?'GET':'POST')=>new Request('https://practice.test/api/v2/'+path,{method,headers:body===undefined?{}:{'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return{db,service,question,answer,conversation,request,setTime:value=>{at=value;}};
}

test('help events are owner scoped, retry safe, step checked, and do not create attempts or points',async()=>{
 const f=await fixture();try{
  const q=await f.question(),other=await f.question('bob');
  const input={questionId:q.id,kind:'step',part:1,requestId:'same-help-id'};
  const first=await f.service.recordHelp('alice',input),again=await f.service.recordHelp('alice',input);
  assert.equal(first.duplicate,false);assert.equal(again.duplicate,true);assert.equal(first.event.id,again.event.id);
  await assert.rejects(()=>f.service.recordHelp('alice',{...input,kind:'answer'}),e=>e.status===409);
  await assert.rejects(()=>f.service.recordHelp('alice',{...input,requestId:'bad-step-id',part:20}),e=>e.status===400);
  await assert.rejects(()=>f.service.recordHelp('alice',{...input,requestId:'other-help-id',questionId:other.id}),e=>e.status===404);
  for(const kind of ['hint','answer'])await f.service.recordHelp('alice',{questionId:q.id,kind,requestId:kind+'-request'});
  const summary=await f.service.teacherHistory('alice');assert.deepEqual(summary.helpSummary,{hint:1,step:1,answer:1,total:3,conversations:0});
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM platform_attempts').first()).n,0);assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM practice_ledger').first()).n,0);
 }finally{f.db.close();}
});

test('durable conversations reject changed request identity and survive AI cache cleanup and database reopen',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'math-tutor-history-')),path=join(dir,'history.sqlite');let f;
 try{
  f=await fixture(path);const q=await f.question();
  const first=await f.conversation(q,{requestId:'durable-conversation'});
  const again=await f.conversation(q,{requestId:'durable-conversation',tutorReply:'A later retry must not replace the original.'});assert.equal(again.id,first.id);assert.equal(again.tutorReply,first.tutorReply);assert.equal(again.duplicate,true);
  for(const changed of [{studentMessage:'Different question'},{mode:'check-reasoning'},{part:2}])await assert.rejects(()=>f.conversation(q,{requestId:'durable-conversation',...changed}),e=>e.status===409);
  await f.db.prepare('DELETE FROM platform_ai_requests').run();f.db.migrate();f.db.close();f=null;
  const db=createSQLiteDB(path);db.migrate();const service=createTutorHistory({db,clock:()=>new Date('2027-01-01')});
  const saved=await service.getConversation('alice','durable-conversation');assert.equal(saved.id,first.id);assert.equal(saved.studentMessage,first.studentMessage);assert.equal(await service.getConversation('bob','durable-conversation'),null);
  assert.equal((await service.questionHistory('alice',q.id)).conversations.length,1);db.close();
 }finally{f?.db.close();rmSync(dir,{recursive:true,force:true});}
});

test('provider context contains only bounded same-student same-skill evidence and no account identifiers',async()=>{
 const f=await fixture();try{
  const current=await f.question();
  for(let i=0;i<12;i++){const q=await f.question();await f.answer(q,{correct:i%2===0});await f.conversation(q,{studentMessage:'My thinking about this step '.repeat(20).slice(0,600),tutorReply:'Work from the earlier result and keep the units together. '.repeat(20)});await f.service.recordHelp('alice',{questionId:q.id,kind:i%2?'step':'hint',part:i%2?1:0,requestId:'context-help-'+i});}
  const unrelated=await f.question('alice','G-TRI');await f.answer(unrelated,{given:'UNRELATED_SKILL_MARKER'});await f.conversation(unrelated,{studentMessage:'UNRELATED_SKILL_MARKER'});
  const other=await f.question('bob');await f.answer(other,{given:'OTHER_CHILD_MARKER'});await f.conversation(other,{studentMessage:'OTHER_CHILD_MARKER'});
  const value=await f.service.context('alice',{questionId:current.id}),encoded=JSON.stringify(value);
  assert.ok(encoded.length<=2200,encoded.length);assert.equal(value.skill.answered,12);assert.equal(value.skill.accuracy,50);assert.equal(value.helpUsed.hint,6);assert.equal(value.helpUsed.step,6);
  assert.ok(value.recentAnswers.length<=6);assert.ok(value.conversations.length<=3);assert.ok(value.helpUsed.recent.length<=8);assert.ok(value.commonMistakes.length);
  assert.doesNotMatch(encoded,/OTHER_CHILD_MARKER|UNRELATED_SKILL_MARKER|PRIVATE_ALICE_NAME|PRIVATE_BOB_NAME|studentId|questionId/);
  await assert.rejects(()=>f.service.context('bob',{questionId:current.id}),e=>e.status===404);
 }finally{f.db.close();}
});

test('student threads restore only the latest ten owned turns in chronological order',async()=>{
 const f=await fixture();try{
  const q=await f.question(),other=await f.question('bob');
  for(let i=0;i<14;i++)await f.conversation(q,{studentMessage:'Question '+i});
  await f.conversation(other,{studentMessage:'Other child'});
  const response=await f.service.handle(f.request('student/tutor-history?questionId='+q.id),{id:'alice',role:'student'});const value=await response.json();
  assert.equal(value.conversations.length,10);assert.equal(value.conversations[0].studentMessage,'Question 4');assert.equal(value.conversations.at(-1).studentMessage,'Question 13');
  await assert.rejects(()=>f.service.handle(f.request('student/tutor-history?questionId='+other.id),{id:'alice',role:'student'}),e=>e.status===404);
 }finally{f.db.close();}
});

test('teacher timeline paginates all evidence once, keeps skill filters, and reports real progress',async()=>{
 const f=await fixture();try{
  for(let i=0;i<6;i++){const q=await f.question('alice',i%2?'G-TRI':'D-SUB');await f.answer(q,{correct:i%2===0});await f.conversation(q);await f.service.recordHelp('alice',{questionId:q.id,kind:'answer',requestId:'timeline-help-'+i});}
  const other=await f.question('bob');await f.conversation(other,{studentMessage:'PRIVATE_BOB_MESSAGE'});
  let page=await f.service.teacherHistory('alice',{limit:4}),all=[...page.items];assert.ok(page.pagination.hasMore);assert.equal(page.skillSummaries.reduce((n,s)=>n+s.attempts,0),6);assert.equal(page.helpSummary.conversations,6);
  // A later new item must not shift the remainder of a cursor-based traversal.
  f.setTime('2026-11-15T20:00:00Z');await f.conversation(await f.question(),{studentMessage:'New top item'});
  while(page.pagination.hasMore){page=await f.service.teacherHistory('alice',{limit:4,cursor:page.pagination.nextCursor});all.push(...page.items);}
  assert.equal(all.length,18);assert.equal(new Set(all.map(item=>item.type+':'+item.id)).size,18);assert.deepEqual(new Set(all.map(item=>item.type)),new Set(['answer','conversation','help']));assert.doesNotMatch(JSON.stringify(all),/PRIVATE_BOB_MESSAGE|New top item/);
  const filtered=await f.service.teacherHistory('alice',{skill:'G-TRI',limit:100});assert.equal(filtered.items.length,9);assert.ok(filtered.items.every(item=>item.skill==='G-TRI'));assert.equal(filtered.skillSummaries.length,1);
  await assert.rejects(()=>f.service.teacherHistory('alice',{cursor:'bad-cursor'}),e=>e.status===400);await assert.rejects(()=>f.service.teacherHistory('alice',{limit:101}),e=>e.status===400);await assert.rejects(()=>f.service.teacherHistory('teacher'),e=>e.status===404);
 }finally{f.db.close();}
});

test('history endpoints enforce authentication, roles and methods',async()=>{
 const f=await fixture();try{
  const q=await f.question(),body={questionId:q.id,kind:'hint',requestId:'role-help-id'};
  await assert.rejects(()=>f.service.handle(f.request('student/help-event',body),null),e=>e.status===401);
  await assert.rejects(()=>f.service.handle(f.request('student/help-event',body),{id:'teacher',role:'teacher'}),e=>e.status===403);
  await assert.rejects(()=>f.service.handle(f.request('teacher/tutor-history?studentId=alice'),{id:'alice',role:'student'}),e=>e.status===403);
  assert.equal((await f.service.handle(f.request('teacher/tutor-history?studentId=alice'),{id:'teacher',role:'teacher'})).status,200);
  assert.equal((await f.service.handle(f.request('student/help-event',body),{id:'alice',role:'student'})).status,200);
  await assert.rejects(()=>f.service.handle(f.request('student/help-event'),{id:'alice',role:'student'}),e=>e.status===405);
 }finally{f.db.close();}
});

test('mistake summaries keep template-specific patterns separate and do not diagnose unknown wrong answers',async()=>{
 const f=await fixture();try{
  const missing=await f.question('alice','D-SUB','missing'),compare=await f.question('alice','D-SUB','compare'),unknown=await f.question();
  await f.answer(missing);await f.answer(compare);await f.answer(unknown,{label:null});
  const value=await f.service.teacherHistory('alice');assert.equal(value.commonMistakes.length,3);assert.ok(value.commonMistakes.every(row=>row.count===1));
  assert.ok(value.commonMistakes.some(row=>row.templateId==='D-SUB:story-compare'));assert.ok(value.commonMistakes.some(row=>row.label==='Answers to revisit; no matching mistake pattern.'));
 }finally{f.db.close();}
});
