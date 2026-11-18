import test from 'node:test';
import assert from 'node:assert/strict';
import {createSQLiteDB} from '../server/storage.mjs';
import {createPlatform,platformGrade} from '../server/platform.mjs';
import {createManagement} from '../server/management.mjs';
import {courseDueAt,courseSchedule,courseSlots,FOUNDATION_SKILLS,introducedSkills} from '../server/course-schedule.mjs';
import {formatQuestionAnswer} from '../server/questions.mjs';
import {SKILLS} from '../server/plan.mjs';
import {CURRICULUM_SKILLS} from '../server/curriculum.mjs';

async function fixture(){
 const db=createSQLiteDB();db.migrate();let time='2026-11-07T20:00:00Z';
 for(const id of ['alice','bob'])await db.prepare("INSERT INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,'student','test','2026-11-07')").bind(id,id,id).run();
 const clock=()=>new Date(time),platform=createPlatform({db,clock}),management=createManagement({db,clock,platform});
 async function answer(question){const q=JSON.parse((await db.prepare('SELECT q FROM platform_questions WHERE id=?').bind(question.id).first()).q);return platform.answer('alice',{questionId:question.id,requestId:crypto.randomUUID(),answer:q.choices?`option-${q.choices.findIndex(c=>String(c.value)===String(q.answer))}`:formatQuestionAnswer(q)});}
 async function count(n,request={source:'library',skill:'D-SUB'}){for(let i=0;i<n;i++)await answer((await platform.question('alice',request)).question);}
 const get=async(path,user={id:'alice',role:'student'})=>{const response=await (path.includes('/teacher/')?management:platform).handle(new Request('https://test'+path),user);return response.json();};
 const review=async(id,skill)=>db.prepare("INSERT INTO platform_review_queue VALUES(?, 'alice', ?, '2026-11-07',1,?,'2026-11-07',NULL)").bind(id,skill,'attempt-'+id).run();
 return{db,platform,management,answer,count,get,review,setTime:value=>time=value,setDate:value=>time=value+'T20:00:00Z'};
}

test('70 dated goals use extra answers for catch-up while retaining actual on-time history',async()=>{
 const f=await fixture();try{
  f.setDate('2026-11-06');let s=await f.platform.summary('alice');assert.equal(s.schedule.phase,'before');assert.equal(s.schedule.requiredToDate,0);assert.equal(s.schedule.nextDue.date,'2026-11-07');assert.equal((await f.platform.question('alice',{intent:'daily'})).question,null);
  f.setDate('2026-11-07');await f.count(5);s=await f.platform.summary('alice');assert.equal(s.schedule.days.length,70);assert.equal(s.schedule.totalRequired,1400);assert.equal(s.schedule.endDate,'2027-01-15');assert.equal(s.schedule.today.remaining,15);assert.equal(s.schedule.today.dueAt,'2026-11-08T08:00:00.000Z');
  f.setDate('2026-11-08');await f.count(35);s=await f.platform.summary('alice');assert.equal(s.answered,35);assert.equal(s.points,1);assert.equal(s.schedule.requiredToDate,40);assert.equal(s.schedule.answeredToDate,40);assert.equal(s.schedule.creditedToDate,40);assert.equal(s.schedule.overdueQuestions,0);assert.equal(s.schedule.overdueDays,0);assert.equal(s.schedule.completedDays,2);assert.equal(s.schedule.onTimeCompletions,1);assert.equal(s.schedule.days[0].status,'complete');assert.equal(s.schedule.days[0].answered,5);assert.equal(s.schedule.days[0].onTimeRemaining,15);assert.equal(s.schedule.days[0].catchupCredit,15);assert.equal(s.schedule.days[0].caughtUp,true);assert.equal(s.schedule.today.status,'complete');assert.equal(s.schedule.remainingToday,0);
  assert.equal((await f.platform.question('alice',{source:'practice',intent:'daily'})).question,null);
  assert.deepEqual((await f.get('/api/v2/student/progress')).schedule,s.schedule);
  const teacher=await f.get('/api/v2/teacher/dashboard?studentId=alice',{id:'teacher',role:'teacher'});assert.deepEqual(teacher.summary.schedule,s.schedule);assert.equal(teacher.days[0].remaining,0);assert.equal(teacher.days[0].onTimeRemaining,15);assert.equal(teacher.days[0].status,'done');assert.equal(teacher.days[0].caughtUp,true);assert.deepEqual(teacher.backlog,s.backlog);
  assert.equal((await f.platform.summary('bob')).schedule.totalAnswered,0);
 }finally{f.db.close();}
});

test('daily intent stops at target across simultaneous tabs and starts a new Pacific day at midnight',async()=>{
 const f=await fixture();try{
  await f.count(19);const responses=await Promise.all(Array.from({length:4},()=>f.platform.question('alice',{source:'practice',intent:'daily'})));
  const ids=[...new Set(responses.map(result=>result.question.id))];assert.equal(ids.length,1);
  await Promise.all(responses.map(result=>f.answer(result.question)));assert.equal((await f.platform.summary('alice')).answered,20);assert.equal((await f.platform.question('alice',{source:'practice',intent:'daily'})).question,null);
  f.setTime('2026-11-08T07:59:59Z');assert.equal((await f.platform.summary('alice')).today,'2026-11-07');
  f.setTime('2026-11-08T08:00:00Z');const s=await f.platform.summary('alice');assert.equal(s.today,'2026-11-08');assert.equal(s.answered,0);assert.equal(s.schedule.remainingToday,20);assert.equal(s.schedule.onTimeCompletions,1);
 }finally{f.db.close();}
});

test('Saturday and Sunday introductions, requested review skills, and shifted-week gaps are consistent',async()=>{
 const f=await fixture();try{
  for(const [id,skill]of[['sat','E-EXP'],['sun','E-DIST'],['unlearned','P-CHANGE'],['known','F-ADD']])await f.review(id,skill);
  f.setDate('2026-11-14');let review=await f.get('/api/v2/student/review');assert.deepEqual(review.due.map(row=>row.skill).sort(),['E-EXP','F-ADD']);assert.equal((await f.platform.summary('alice')).reviewDue,2);
  assert.equal((await f.platform.question('alice',{source:'review',skill:'E-DIST'})).question,null);
  const selected=await f.platform.question('alice',{source:'review',skill:'F-ADD'});assert.equal(selected.question.skill,'F-ADD');await f.answer(selected.question);
  f.setDate('2026-11-15');assert.ok((await f.get('/api/v2/student/review')).due.some(row=>row.skill==='E-DIST'));
  await f.db.prepare("UPDATE platform_program SET week_offsets=? WHERE student_id='alice'").bind(JSON.stringify([0,7,7,7,7,7,7,7,7,7])).run();
  const s=await f.platform.summary('alice');assert.equal(s.schedule.phase,'break');assert.equal(s.schedule.today,null);assert.equal(s.schedule.nextDue.date,'2026-11-21');assert.equal((await f.platform.question('alice',{source:'practice',intent:'daily'})).question,null);assert.equal((await f.get('/api/v2/student/review')).due.some(row=>row.skill==='E-EXP'||row.skill==='E-DIST'),false);
  f.setDate('2027-01-23');assert.equal((await f.platform.summary('alice')).schedule.phase,'finished');assert.equal((await f.platform.question('alice',{source:'practice',intent:'daily'})).question,null);
 }finally{f.db.close();}
});

test('full pending sets never substitute an unrelated question for a requested review',async()=>{
 const f=await fixture();try{
  await Promise.all(Object.keys(SKILLS).slice(0,20).map(skill=>f.platform.question('alice',{source:'library',skill})));
  await f.review('due','F-ADD');await assert.rejects(()=>f.platform.question('alice',{source:'review',skill:'F-ADD'}),e=>e.status===409);
  assert.equal((await f.platform.question('alice',{source:'review',skill:'N-ABS'})).question,null);
  await assert.rejects(()=>f.platform.question('alice',{source:'invalid'}),e=>e.status===400);
 }finally{f.db.close();}
});

test('automatic practice uses the five review positions for due lessons from the same course week',async()=>{
 const f=await fixture();try{
  await f.review('yesterday','D-SUB');f.setDate('2026-11-08');
  for(let i=0;i<6;i++)await f.answer((await f.platform.question('alice',{source:'practice',intent:'daily'})).question);
  const next=await f.platform.question('alice',{source:'practice',intent:'daily'});assert.equal(next.question.source,'review');assert.equal(next.question.skill,'D-SUB');assert.equal(next.question.courseCategory,'recent');
 }finally{f.db.close();}
});

test('historical targets stay frozen and deadlines follow the course timezone through daylight saving',()=>{
 const schedule=courseSchedule({program:{startDate:'2026-11-07',dailyTarget:25},rules:[{date:'2026-11-07',daily_target:20}],today:'2026-11-09'});
 assert.equal(schedule.days[0].expected,20);assert.equal(schedule.days[1].expected,20);assert.equal(schedule.today.expected,25);assert.equal(schedule.overdueQuestions,40);
 assert.equal(courseDueAt('2027-03-13'),'2027-03-14T08:00:00.000Z');assert.equal(courseDueAt('2027-03-14'),'2027-03-15T07:00:00.000Z');assert.equal(courseDueAt('2027-11-06'),'2027-11-07T07:00:00.000Z');assert.equal(courseDueAt('2027-11-07'),'2027-11-08T08:00:00.000Z');
 const skills=introducedSkills({startDate:'2026-11-07'},'2026-11-06');assert.deepEqual([...skills],FOUNDATION_SKILLS);assert.equal(skills.has('P-CHANGE'),false);assert.equal(skills.has('F-DIV'),false);
});

test('typed inequality warmups accept every valid value rather than only the sample answer',()=>{
 const q={skill:'E-INEQ',answer:'4',hint:'Compare the number with 5.',verification:{kind:'inequality',boundary:5,sign:'<'}};
 assert.equal(platformGrade(q,'3').correct,true);assert.equal(platformGrade(q,'4.5').correct,true);assert.equal(platformGrade(q,'5').correct,false);assert.equal(platformGrade(q,'banana').formOnly,true);assert.equal(platformGrade({...q,verification:{...q.verification,sign:'≥'}},'5').correct,true);
});

test('dated bridges keep eight core-focus questions and review only introduced foundations and lessons',()=>{
 for(let day=0;day<70;day++){
  const slots=courseSlots(day),schedule=courseSchedule({program:{startDate:'2026-11-07'},today:'2026-11-07'}),current=schedule.days[day],allowed=introducedSkills({},current.date);
  assert.deepEqual(Object.fromEntries(['foundation','focus','recent','older'].map(category=>[category,slots.filter(slot=>slot.category===category).length])),{foundation:2,focus:10,recent:5,older:3});
  assert.ok(slots.every(slot=>allowed.has(slot.skill)),`day ${day+1}`);
  if(current.bridgeSkills.length){assert.equal(slots.filter(slot=>slot.focusKind==='bridge').length,2);assert.equal(slots.filter(slot=>slot.focusKind==='core').length,8);assert.ok(slots.filter(slot=>slot.focusKind==='bridge').every(slot=>current.bridgeSkills.includes(slot.skill)));assert.equal(slots[2].focusKind,'bridge');}
  assert.ok(slots.filter(slot=>slot.focusKind==='core').every(slot=>current.coreFocus.includes(slot.skill)));
 }
 assert.equal(courseSlots(0).some(slot=>['R-RATIO','R-RATE','P-PERCENT','P-CHANGE','F-DIV','G-VOL'].includes(slot.skill)),false);
});

test('first core questions teach same-day prerequisites before their dependent skills',()=>{
 for(const day of [7,8,14,21,28,35,42,49,56,63]){
  const slots=courseSlots(day),focus=slots.filter(slot=>slot.focusKind==='core').map(slot=>slot.skill);
  for(const skill of new Set(focus))for(const prerequisite of CURRICULUM_SKILLS[skill].prerequisites){
   if(CURRICULUM_SKILLS[prerequisite].introductionDay===day&&focus.includes(prerequisite))assert.ok(focus.indexOf(prerequisite)<focus.indexOf(skill),`${skill} precedes prerequisite ${prerequisite} on day ${day+1}`);
  }
 }
 assert.equal(courseSlots(7).find(slot=>slot.focusKind==='core').skill,'E-EXP');assert.equal(courseSlots(8).find(slot=>slot.focusKind==='core').skill,'E-DIST');assert.equal(courseSlots(14).find(slot=>slot.focusKind==='core').skill,'E-SOLVE');
});

const answeredRows=(date,count)=>Array.from({length:count},(_,i)=>({id:`${date}:${i}`,question_id:`q:${date}:${i}`,date,is_correct:i%2}));

test('Nov 14 counts all eight daily goals and applies each extra answer to the oldest missed day',()=>{
 const input={program:{startDate:'2026-11-07',dailyTarget:20},today:'2026-11-14'};
 const empty=courseSchedule(input);
 assert.equal(empty.backlog.requiredToDate,160);assert.equal(empty.backlog.behind,160);assert.equal(empty.backlog.overdue,140);assert.equal(empty.backlog.remainingToday,20);assert.equal(empty.backlog.daysEquivalent,8);assert.equal(empty.backlog.oldestDueDate,'2026-11-07');
 const rows=answeredRows('2026-11-14',25),schedule=courseSchedule({...input,attempts:[...rows,...rows.slice(20)]});
 assert.equal(schedule.backlog.actualAnsweredToDate,25);assert.equal(schedule.backlog.completedToDate,25);assert.equal(schedule.backlog.behind,135);assert.equal(schedule.backlog.overdue,135);assert.equal(schedule.backlog.remainingToday,0);assert.equal(schedule.backlog.catchupCredit,5);assert.equal(schedule.backlog.catchupToday,5);
 assert.equal(schedule.days[0].answered,0);assert.equal(schedule.days[0].remaining,15);assert.equal(schedule.days[0].onTimeRemaining,20);assert.equal(schedule.today.answered,25);assert.equal(schedule.today.credited,20);assert.equal(schedule.today.catchupEarned,5);
 assert.deepEqual(schedule.backlog.history,[{answerDate:'2026-11-14',dueDate:'2026-11-07',courseDay:0,questions:5}]);
 assert.equal(schedule.backlog.completedToDate+schedule.backlog.behind,schedule.backlog.requiredToDate);
});

test('extra work never prepays future daily goals and before-course work is not course credit',()=>{
 const input={program:{startDate:'2026-11-07',dailyTarget:20},attempts:[...answeredRows('2026-11-06',100),...answeredRows('2026-11-07',45)]};
 const first=courseSchedule({...input,today:'2026-11-07'});assert.equal(first.backlog.behind,0);assert.equal(first.backlog.completedToDate,20);assert.equal(first.backlog.actualAnsweredToDate,45);assert.equal(first.backlog.unallocatedExtra,25);assert.equal(first.backlog.bankedCredit,0);assert.equal(first.days[1].credited,0);
 const next=courseSchedule({...input,today:'2026-11-08'});assert.equal(next.backlog.behind,20);assert.equal(next.backlog.remainingToday,20);assert.equal(next.backlog.catchupCredit,0);assert.equal(next.backlog.completedToDate,20);
 const future=courseSchedule({...input,today:'2026-11-08',attempts:[...input.attempts,...answeredRows('2026-11-09',20)]});assert.equal(future.backlog.completedToDate,20);assert.equal(future.days[2].credited,0);assert.equal(future.backlog.actualAnsweredToDate,45);
});

test('catch-up credits cross old dates chronologically but never erase missed on-time completions',()=>{
 const schedule=courseSchedule({program:{startDate:'2026-11-07'},today:'2026-11-10',attempts:[...answeredRows('2026-11-07',5),...answeredRows('2026-11-09',55),...answeredRows('2026-11-10',25)]});
 assert.equal(schedule.backlog.behind,0);assert.equal(schedule.backlog.completedToDate,80);assert.equal(schedule.backlog.actualAnsweredToDate,85);assert.equal(schedule.backlog.unallocatedExtra,5);assert.equal(schedule.backlog.catchupCredit,35);assert.equal(schedule.completedDays,4);assert.equal(schedule.onTimeCompletions,2);
 assert.deepEqual(schedule.backlog.history.map(row=>[row.answerDate,row.dueDate,row.questions]),[['2026-11-09','2026-11-07',15],['2026-11-09','2026-11-08',20]]);
 assert.equal(schedule.days[0].answered,5);assert.equal(schedule.days[1].answered,0);assert.equal(schedule.days[1].caughtUp,true);
});

test('teacher-delayed gaps and finished courses still allow catch-up without adding a new daily obligation',()=>{
 const gap=courseSchedule({program:{startDate:'2026-11-07',weekOffsets:[0,7,7,7,7,7,7,7,7,7]},today:'2026-11-14',attempts:answeredRows('2026-11-14',10)});
 assert.equal(gap.phase,'break');assert.equal(gap.backlog.requiredToDate,140);assert.equal(gap.backlog.behind,130);assert.equal(gap.backlog.overdue,130);assert.equal(gap.backlog.remainingToday,0);assert.equal(gap.backlog.catchupCredit,10);assert.equal(gap.nextDue.date,'2026-11-21');
 const ended=courseSchedule({program:{startDate:'2026-11-07'},today:'2027-01-16',attempts:answeredRows('2027-01-16',25)});
 assert.equal(ended.phase,'finished');assert.equal(ended.backlog.requiredToDate,1400);assert.equal(ended.backlog.behind,1375);assert.equal(ended.backlog.remainingToday,0);assert.equal(ended.backlog.catchupCredit,25);assert.equal(ended.days[0].caughtUp,true);assert.equal(ended.days[1].remaining,15);
});

test('student and teacher expose the same backlog, and five catch-up answers reduce it only once',async()=>{
 const f=await fixture();try{
  f.setDate('2026-11-14');const initial=await f.platform.summary('alice');assert.equal(initial.backlog.behind,160);
  const before=await f.get('/api/v2/teacher/progress-summary?studentId=alice',{id:'teacher',role:'teacher'});assert.deepEqual(before.backlog,initial.backlog);assert.equal(before.progressReport.backlog.behind,160);assert.equal(before.attempts,undefined);
  await f.count(20);let last;
  for(let i=0;i<5;i++){
   const next=await f.platform.question('alice',{source:'practice',intent:'catchup'});
   assert.equal(next.question.courseCategory,'catchup');assert.equal(next.question.catchupForDate,'2026-11-07');assert.equal(next.question.courseDay,0);assert.ok(initial.schedule.days[0].focus.includes(next.question.skill));
   last=next.question;await f.answer(last);
  }
  const after=await f.platform.summary('alice');assert.equal(after.answered,25);assert.equal(after.backlog.behind,135);assert.equal(after.backlog.catchupCredit,5);assert.equal(after.backlog.remainingToday,0);
  await f.answer(last);assert.equal((await f.platform.summary('alice')).backlog.behind,135);
  const progress=await f.get('/api/v2/student/progress');assert.deepEqual(progress.backlog,after.backlog);
  const dashboard=await f.get('/api/v2/teacher/dashboard?studentId=alice',{id:'teacher',role:'teacher'});assert.deepEqual(dashboard.backlog,after.backlog);assert.equal(dashboard.progressReport.backlog.behind,135);assert.equal(dashboard.progressReport.backlog.completedToDate,25);assert.equal(dashboard.progressReport.backlog.catchupCredit,5);assert.equal(dashboard.progressReport.today.answered,25);
  assert.equal((await f.platform.summary('bob')).backlog.behind,160);
  const other=await f.get('/api/v2/teacher/progress-summary?studentId=bob',{id:'teacher',role:'teacher'});assert.equal(other.student.id,'bob');assert.equal(other.progressReport.student.id,'bob');assert.equal(other.summary.answered,0);assert.equal(other.backlog.behind,160);assert.equal(other.progressReport.backlog.behind,160);
  await assert.rejects(()=>f.get('/api/v2/teacher/progress-summary?studentId=bob'),error=>error.status===403);
  const own=await f.get('/api/v2/student/progress?studentId=bob');assert.equal(own.studentId,'alice');assert.equal(own.backlog.behind,135);
 }finally{f.db.close();}
});

test('catch-up intent stops without overdue work and does not substitute a pending daily question',async()=>{
 const f=await fixture();try{
  assert.equal((await f.platform.question('alice',{source:'practice',intent:'catchup'})).question,null);
  f.setDate('2026-11-08');const daily=await f.platform.question('alice',{source:'practice',intent:'daily'}),catchup=await f.platform.question('alice',{source:'practice',intent:'catchup'});
  assert.notEqual(catchup.question.id,daily.question.id);assert.equal(catchup.question.courseCategory,'catchup');assert.equal(catchup.question.catchupForDate,'2026-11-07');assert.equal((await f.platform.question('alice',{source:'practice',intent:'daily'})).question.id,daily.question.id);
  await assert.rejects(()=>f.platform.question('alice',{source:'review',intent:'catchup'}),error=>error.status===400);
 }finally{f.db.close();}
});


test('a catch-up reservation stays answerable after another tab clears the backlog',async()=>{
 const f=await fixture();try{
  await f.count(19);f.setDate('2026-11-08');await f.count(20);
  const pending=await f.platform.question('alice',{source:'practice',intent:'catchup'});await f.count(19);
  assert.equal((await f.platform.summary('alice')).backlog.behind,0);
  const resumed=await f.platform.question('alice',{source:'practice',intent:'catchup',skill:'D-SUB'});assert.equal(resumed.question.id,pending.question.id);
  // Leaving the catch-up page removes its link once the debt is cleared. The
  // ordinary Extra practice action must recover this reservation too.
  const extra=await f.platform.question('alice',{source:'practice'});assert.equal(extra.question.id,pending.question.id);
  await f.answer(extra.question);
  const summary=await f.platform.summary('alice');assert.equal(summary.answered,40);assert.equal(summary.backlog.catchupCredit,1);assert.equal(summary.backlog.completedToDate,40);assert.equal(summary.backlog.behind,0);
  assert.equal((await f.platform.question('alice',{source:'practice',intent:'catchup'})).question,null);
  assert.ok((await f.platform.question('alice',{source:'practice'})).question);
 }finally{f.db.close();}
});
