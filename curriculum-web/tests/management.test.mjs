import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSQLiteDB} from '../server/storage.mjs';
import {createManagement} from '../server/management.mjs';
import {createPlatform} from '../server/platform.mjs';

async function fixture(){
 const db=createSQLiteDB();db.migrate();
 for(const file of ['0002_platform.sql','0003_management.sql'])await db.exec(readFileSync(new URL(`../migrations/${file}`,import.meta.url),'utf8'));
 let date=new Date('2026-11-07T18:00:00Z');
 for(const [id,role] of [['teacher','parent'],['learner','student'],['second','student']])await db.prepare('INSERT INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind(id,id,id,role,'test',date.toISOString()).run();
 const platform=createPlatform({db,clock:()=>date}),app=createManagement({db,clock:()=>date,platform});
 const teacher={id:'teacher',role:'teacher'},student={id:'learner',role:'student'};
 async function call(path,data,user=teacher,method=data===undefined?'GET':'POST'){
  const request=new Request(`https://practice.test/api/v2/${path}`,{method,headers:data===undefined?{}:{'content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});
  try {const response=await app.handle(request,user);return {status:response.status,value:await response.json()};}catch(error){if(!error.status)throw error;return {status:error.status,value:{error:error.message}};}
 }
 return {db,app,platform,call,teacher,student,setDate:v=>date=new Date(v)};
}

test('teacher settings apply tomorrow; a later edit keeps already-effective rules; week shifts cascade',async()=>{
 const f=await fixture();try{
  let before=await f.call('teacher/settings?studentId=learner');assert.equal(before.value.program.dailyTarget,20);
  assert.equal((await f.call('teacher/settings',{studentId:'learner',dailyTarget:25,bonusFirst:12,bonusStep:8},f.teacher,'PATCH')).status,200);
  assert.equal((await f.call('teacher/settings?studentId=learner')).value.program.dailyTarget,20);
  assert.equal((await f.call('teacher/settings?studentId=second')).value.program.dailyTarget,20);
  f.setDate('2026-11-08T18:00:00Z');
  assert.equal((await f.call('teacher/settings?studentId=learner')).value.program.dailyTarget,25);
  await f.call('teacher/settings',{studentId:'learner',bonusStep:6},f.teacher,'PATCH');
  assert.equal((await f.call('teacher/settings?studentId=learner')).value.program.bonusStep,8);
  f.setDate('2026-11-09T18:00:00Z');assert.equal((await f.call('teacher/settings?studentId=learner')).value.program.bonusStep,6);
  const original=(await f.call('teacher/plan?studentId=learner')).value.weeks;
  const shifted=await f.call('teacher/plan',{studentId:'learner',week:3,days:7});assert.equal(shifted.status,200);
  assert.equal(shifted.value.weeks[0].startDate,original[0].startDate);assert.equal(shifted.value.weeks[2].startDate,'2026-11-28');assert.equal(shifted.value.weeks[9].endDate,'2027-01-22');
  assert.equal((await f.platform.weeks('learner'))[2].startDate,'2026-11-28');
 }finally{f.db.close();}
});

test('checks, notes and assignments are teacher-only and isolated by student',async()=>{
 const f=await fixture();try{
  for(const path of ['dashboard','students','plan','checks','assignments','rewards','questions','settings'])assert.equal((await f.call(`teacher/${path}`,undefined,f.student)).status,403);
  assert.equal((await f.call('teacher/checks',{studentId:'learner',week:1,score:22})).status,400);
  assert.equal((await f.call('teacher/checks',{studentId:'learner',week:1,score:11,note:'Review fractions'})).status,200);
  assert.equal((await f.call('teacher/checks?studentId=second')).value.checks.length,0);
  assert.equal((await f.call('teacher/dashboard?studentId=learner')).value.attention[0].text,'Week 1 paper check: 11 of 21. Re-teach before new content.');
  await f.call('teacher/notes',{studentId:'learner',week:1,text:'Try a picture first.'});assert.equal((await f.platform.summary('learner')).teacherNote,'Try a picture first.');
  const assignment=await f.call('teacher/assignments',{studentId:'learner',skill:'D-SUB',count:5,startDate:'2026-11-08',endDate:'2026-11-14'});assert.equal(assignment.status,201,JSON.stringify(assignment));
  assert.equal((await f.call('teacher/assignments?studentId=second')).value.assignments.length,0);
  assert.equal((await f.call('teacher/assignments',{studentId:'learner',skill:'bad',count:5,startDate:'2026-11-08',endDate:'2026-11-14'})).status,400);
  await f.call(`teacher/assignments/${assignment.value.id}?studentId=learner`,undefined,f.teacher,'DELETE');assert.equal((await f.call('teacher/assignments?studentId=learner')).value.assignments.length,0);
 }finally{f.db.close();}
});

test('rewards approve without spending; giving is atomic, cannot overspend or replay',async()=>{
 const f=await fixture();try{
  const prize=(await f.call('teacher/prizes',{name:'Choose a game',cost:5,note:'For the weekend'})).value.prize;
  await f.call('teacher/points',{studentId:'learner',amount:6,note:'Previous practice',requestId:'initial-credit-1'});
  assert.equal((await f.call(`student/rewards/${prize.id}/request`,{},f.student)).status,200);
  assert.equal((await f.call('student/rewards?studentId=second',undefined,f.student)).value.points,6);
  let rewards=(await f.call('student/rewards',undefined,f.student)).value;const request=rewards.requests[0];
  assert.equal(request.status,'requested');assert.equal(rewards.prizes[0].note,'For the weekend');
  await f.call('teacher/requests/'+request.id,{action:'approve'});assert.equal((await f.call('student/rewards',undefined,f.student)).value.points,6);
  const results=await Promise.all([f.call('teacher/requests/'+request.id,{action:'given'}),f.call('teacher/requests/'+request.id,{action:'given'})]);assert.ok(results.every(x=>x.status===200));
  rewards=(await f.call('student/rewards',undefined,f.student)).value;assert.equal(rewards.points,1);assert.equal(rewards.requests[0].status,'given');assert.equal(rewards.history.filter(h=>h.kind==='prize').length,1);
  assert.equal((await f.call('teacher/points',{studentId:'learner',amount:-2,note:'Correction',requestId:'correction-1'})).status,409);
  assert.equal((await f.call('teacher/points',{studentId:'second',amount:6,note:'Previous practice',requestId:'initial-credit-1'})).status,409);
  assert.equal((await f.call('teacher/points',{studentId:'learner',amount:1,note:'',requestId:'empty-note-1'})).status,400);
 }finally{f.db.close();}
});

test('two approved prizes cannot spend the same remaining points',async()=>{
 const f=await fixture();try{
  await f.call('teacher/points',{studentId:'learner',amount:5,note:'Earned previously',requestId:'concurrent-credit'});
  const ids=[];
  for(const name of ['Book choice','Game choice']){
   const p=(await f.call('teacher/prizes',{name,cost:5})).value.prize;
   await f.call(`student/rewards/${p.id}/request`,{},f.student);
   const r=(await f.call('student/rewards',undefined,f.student)).value.requests.find(r=>r.prizeId===p.id);
   await f.call('teacher/requests/'+r.id,{action:'approve'});ids.push(r.id);
  }
  const results=await Promise.all(ids.map(id=>f.call('teacher/requests/'+id,{action:'given'})));
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const r=(await f.call('student/rewards',undefined,f.student)).value;assert.equal(r.points,0);assert.equal(r.requests.filter(x=>x.status==='given').length,1);
 }finally{f.db.close();}
});

test('question previews show ten checked shapes and flags block a template until resolved',async()=>{
 const f=await fixture();try{
  const bank=await f.call('teacher/questions?skill=D-SUB');assert.equal(bank.status,200);assert.equal(bank.value.questions.length,10);assert.ok(bank.value.questions.every(q=>q.answer&&q.solution.length));
  const templateId=bank.value.questions[0].templateId;
  const flag=await f.call('teacher/flags',{templateId,reason:'Check the wording'});assert.equal(flag.status,201);
  assert.ok((await f.call('teacher/questions?skill=D-SUB')).value.flags.some(x=>x.templateId===templateId&&!x.resolvedAt));
  await f.call('teacher/flags/'+flag.value.id,{resolved:true},f.teacher,'PATCH');assert.ok((await f.call('teacher/questions?skill=D-SUB')).value.flags.find(x=>x.id===flag.value.id).resolvedAt);
 }finally{f.db.close();}
});
