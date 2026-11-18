import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSQLiteDB } from '../server/storage.mjs';
import { createManagement } from '../server/management.mjs';
import { createPlatform } from '../server/platform.mjs';

async function fixture({studentCount=2,initialScore=null}={}) {
 const db=createSQLiteDB();db.migrate();let date=new Date('2026-11-27T20:00:00Z');
 for(const [id,role] of [['teacher','parent'],...['learner','second'].slice(0,studentCount).map(id=>[id,'student'])])await db.prepare('INSERT INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind(id,id,id,role,'test',date.toISOString()).run();
 const platform=createPlatform({db,clock:()=>date}),management=createManagement({db,clock:()=>date,platform,initialScore});
 const teacher={id:'teacher',role:'teacher'},student={id:'learner',role:'student'};
 const query=async(sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
 async function call(path,data,user=teacher,method=data===undefined?'GET':'POST'){
  const r=new Request(`https://practice.test/api/v2/${path}`,{method,headers:data===undefined?{}:{'content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});
  try{const response=await management.handle(r,user)??await platform.handle(r,user);return {status:response.status,value:await response.json()};}catch(e){if(!e.status)throw e;return {status:e.status,value:{error:e.message}};}
 }
 return {db,call,teacher,student,query,management,platform,clock:()=>date,setDate:v=>date=new Date(v)};
}
const score=(assessmentId,score,requestId,more={})=>({studentId:'learner',assessmentId,score,takenOn:'2026-11-20',requestId,...more});

test('confirmed catalog, holiday dates and Thanksgiving paper-only exception follow the student schedule',async()=>{
 const f=await fixture();try{
  const g=(await f.call('teacher/gradebook?studentId=learner')).value;
  assert.deepEqual(g.assessments.filter(a=>a.kind==='weekly'&&a.active).map(a=>a.week),[1,2,3,4,6,7,8]);
  assert.equal(g.assessments.find(a=>a.id==='standards-5').maxScore,39);
  assert.equal(g.assessments.find(a=>a.id==='weekly-7').plannedDate,'2026-12-26');
  assert.equal(g.assessments.find(a=>a.id==='weekly-8').plannedDate,'2027-01-02');
  assert.equal(g.assessments.find(a=>a.id==='final').plannedDate,'2027-01-10');
  const thanksgiving=g.weeks.flatMap(w=>w.days).find(d=>d.date==='2026-11-26');assert.equal(thanksgiving.optionalPaper,true);assert.equal(thanksgiving.online.target,20);
  const moved=await f.call('teacher/plan',{studentId:'learner',week:5,days:7});assert.equal(moved.status,200);
  const after=(await f.call('teacher/gradebook?studentId=learner')).value;assert.equal(after.assessments.find(a=>a.id==='checkpoint').plannedDate,'2026-12-18');
 }finally{f.db.close();}
});

test('paper grades are isolated, audited, replay safe and never create online answers, catch-up or points',async()=>{
 const f=await fixture();try{
  const before=await f.platform.analytics('learner');
  const data={studentId:'learner',date:'2026-11-26',correct:18,total:20,minutes:12,note:'Teacher only',requestId:'paper-request-1'};
  assert.equal((await f.call('teacher/paper-days',data)).status,200);assert.equal((await f.call('teacher/paper-days',data)).status,200);
  assert.equal((await f.call('teacher/paper-days',{...data,correct:19})).status,409);
  assert.equal((await f.query('SELECT * FROM platform_grade_audit')).length,1);
  const g=(await f.call('teacher/gradebook?studentId=learner')).value,d=g.weeks.flatMap(w=>w.days).find(d=>d.date===data.date);
  assert.equal(d.paper.correct,18);assert.equal(d.paper.band.key,'strong');assert.equal(d.online.answered,0);
  assert.equal((await f.platform.analytics('learner')).backlog.behind,before.backlog.behind);
  assert.equal((await f.query('SELECT * FROM platform_attempts')).length,0);assert.equal((await f.query('SELECT * FROM practice_ledger')).length,0);
  assert.equal((await f.call('teacher/gradebook?studentId=second')).value.summary.paper.recordedDays,0);
  assert.equal((await f.call('teacher/paper-days',data,f.student)).status,403);
  assert.equal((await f.call('teacher/paper-days',{...data,requestId:'paper-negative',correct:-1})).status,400);
  assert.equal((await f.call('teacher/paper-days',{...data,requestId:'paper-future',date:'2026-12-01'})).status,400);
 }finally{f.db.close();}
});

test('scores retain all retakes, exact bands, consistent missed-area evidence and default two-day corrections',async()=>{
 const f=await fixture();try{
  let r=await f.call('teacher/scores',score('standards-5',34,'standards-score-1',{missed:[1,2,13,14,39],redoDue:null}));assert.equal(r.status,201,JSON.stringify(r));
  assert.equal((await f.call('teacher/scores',score('standards-5',34,'standards-score-1',{missed:[1,2,13,14,39],redoDue:null}))).status,201);
  assert.equal((await f.call('teacher/scores',score('standards-5',34,'bad-missed-dup',{missed:[1,1,2,3,4]}))).status,400);
  assert.equal((await f.call('teacher/scores',score('standards-5',34,'bad-missed-match',{missed:[1,2]}))).status,400);
  assert.equal((await f.call('teacher/scores',score('standards-5',34,'bad-missed-range',{missed:[1,2,3,4,40]}))).status,400);
  let scores=(await f.call('teacher/scores?studentId=learner')).value.scores;assert.equal(scores.length,1);assert.equal(scores[0].redoDue,'2026-11-22');assert.equal(scores[0].band.key,'on-track');assert.equal(scores[0].byArea.find(a=>a.id==='fractions').correct,11);assert.equal(scores[0].byArea.find(a=>a.id==='fractions').needsReteach,true);
  assert.equal((await f.call('teacher/scores',score('standards-5',35,'standards-retake',{takenOn:'2026-11-21'}))).status,201);
  scores=(await f.call('teacher/scores?studentId=learner')).value.scores;assert.deepEqual(scores.map(s=>s.attempt).sort(),[1,2]);assert.equal(scores.find(s=>s.attempt===2).missed,null);assert.ok(scores.find(s=>s.attempt===2).byArea.every(a=>a.correct===null));
  r=await f.call(`teacher/scores/${r.value.id}`,{studentId:'second',score:30,requestId:'wrong-student'},f.teacher,'PATCH');assert.equal(r.status,404);
 }finally{f.db.close();}
});

test('catalog changes affect future versions only and custom test kinds never change planning evidence',async()=>{
 const f=await fixture();try{
  const a=await f.call('teacher/assessments',{title:'My unit test',kind:'weekly',week:1,maxScore:10,areas:[{id:'a',label:'Fractions',questions:[1,2]}],requestId:'custom-test-1'});assert.equal(a.status,201,JSON.stringify(a));
  const first=await f.call('teacher/scores',score(a.value.id,9,'custom-score-1'));assert.equal(first.status,201,JSON.stringify(first));
  assert.equal((await f.call(`teacher/assessments/${a.value.id}`,{kind:'custom',maxScore:20,title:'New version',requestId:'custom-edit-1'},f.teacher,'PATCH')).status,200);
  const second=await f.call('teacher/scores',score(a.value.id,15,'custom-score-2'));assert.equal(second.status,201);
  const g=(await f.call('teacher/gradebook?studentId=learner')).value,old=g.scores.find(s=>s.id===first.value.id),fresh=g.scores.find(s=>s.id===second.value.id);
  assert.equal(old.maxScore,10);assert.equal(old.title,'My unit test');assert.equal(old.kind,'weekly');assert.equal(old.band.key,'on-track');assert.equal(fresh.maxScore,20);assert.equal(fresh.kind,'custom');assert.equal(fresh.band.key,'recorded');assert.equal(g.readiness.components.find(c=>c.key==='weekly').count,0);
  assert.equal((await f.call(`teacher/scores/${old.id}`,{studentId:'learner',score:11,requestId:'too-high-frozen'},f.teacher,'PATCH')).status,400);
 }finally{f.db.close();}
});

test('weekly legacy form and retake edits share the latest score without creating extra attempts',async()=>{
 const f=await fixture();try{
  const first=await f.call('teacher/scores',score('weekly-1',10,'weekly-attempt-1')),second=await f.call('teacher/scores',score('weekly-1',19,'weekly-attempt-2',{takenOn:'2026-11-21'}));
  assert.equal(first.status,201);assert.equal(second.status,201);
  assert.equal((await f.call(`teacher/scores/${first.value.id}`,{studentId:'learner',score:11,requestId:'edit-old-attempt'},f.teacher,'PATCH')).status,200);
  assert.equal((await f.call('teacher/checks?studentId=learner')).value.checks[0].score,19);
  await f.call('teacher/checks',{studentId:'learner',week:1,score:20,note:'Corrected marking'});
  await f.call('teacher/checks',{studentId:'learner',week:1,score:20,note:'Corrected marking'});
  const scores=(await f.call('teacher/scores?studentId=learner')).value.scores;assert.equal(scores.length,2);assert.equal(scores.find(s=>s.id===second.value.id).score,20);assert.equal(scores.find(s=>s.id===second.value.id).takenOn,'2026-11-21');
  assert.equal((await f.call('teacher/checks',{studentId:'learner',week:2,score:22})).status,400);
 }finally{f.db.close();}
});

test('student visibility applies to all student grade APIs and never leaks another student or teacher notes',async()=>{
 const f=await fixture();try{
  await f.call('teacher/scores',score('weekly-1',19,'private-score-1',{note:'PRIVATE TEACHER',redoNote:'PRIVATE REDO'}));
  await f.call('teacher/paper-days',{studentId:'learner',date:'2026-11-20',correct:10,total:20,note:'PRIVATE PAPER',requestId:'private-paper-1'});
  let r=await f.call('student/gradebook?studentId=second',undefined,f.student);assert.equal(r.value.scores.length,1);assert.equal(r.value.scores[0].score,19);
  for(const forbidden of ['PRIVATE','readiness','enteredBy','studentId','readinessEligible'])assert.ok(!JSON.stringify(r.value).includes(forbidden),forbidden);
  assert.equal((await f.call('student/progress',undefined,f.student)).value.checks[0].note,undefined);
  await f.call('teacher/gradebook/settings',{studentId:'learner',showScores:false,requestId:'hide-scores-1'},f.teacher,'PATCH');
  r=await f.call('student/gradebook',undefined,f.student);assert.equal(r.value.visible,false);assert.equal(r.value.scores.length,0);assert.equal(r.value.weeks.length,0);assert.equal(r.value.readiness,undefined);
  assert.deepEqual((await f.call('student/progress',undefined,f.student)).value.checks,[]);
  assert.equal((await f.call('teacher/scores?studentId=learner')).value.scores.length,1);
 }finally{f.db.close();}
});

test('private diagnostic imports once for exactly one student, preserves unknown date and stays out of public migrations',async()=>{
 const initialScore={seedId:'private-test-fixture',assessmentId:'week1-practice',score:2,maxScore:23,takenOn:null};
 const f=await fixture({studentCount:1,initialScore});try{
  let g=(await f.call('teacher/gradebook?studentId=learner')).value;assert.equal(g.scores.length,1);assert.equal(g.scores[0].score,2);assert.equal(g.scores[0].takenOn,null);assert.equal(g.knownPractice.requiresImport,false);
  await f.call('teacher/gradebook?studentId=learner');assert.equal((await f.query('SELECT * FROM platform_grade_imports')).length,1);assert.equal((await f.query('SELECT * FROM platform_scores')).length,1);
  assert.ok(!g.readiness.missing.some(m=>m.includes('invalid')));
 }finally{f.db.close();}
 const multi=await fixture({initialScore});try{const g=(await multi.call('teacher/gradebook?studentId=learner')).value;assert.equal(g.scores.length,0);assert.equal(g.knownPractice.requiresImport,true);assert.equal((await multi.query('SELECT * FROM platform_grade_imports')).length,0);}finally{multi.db.close();}
 assert.ok(!readFileSync(new URL('../migrations/0007_gradebook.sql',import.meta.url),'utf8').includes("NULL,2,23"));
});

test('moving the course preserves and permits correcting historical paper records without changing their date',async()=>{
 const f=await fixture();try{
  await f.call('teacher/paper-days',{studentId:'learner',date:'2026-11-21',correct:10,total:20,requestId:'historical-paper-1'});
  await f.call('teacher/plan',{studentId:'learner',week:3,days:7});
  let g=(await f.call('teacher/gradebook?studentId=learner')).value;assert.equal(g.unmappedPaperDays[0].date,'2026-11-21');
  assert.equal((await f.call('teacher/paper-days',{studentId:'learner',date:'2026-11-21',correct:11,total:20,requestId:'historical-paper-2'})).status,200);
  g=(await f.call('student/gradebook',undefined,f.student)).value;assert.equal(g.unmappedPaperDays[0].correct,11);assert.equal(g.unmappedPaperDays[0].date,'2026-11-21');assert.equal(g.unmappedPaperDays[0].note,undefined);
 }finally{f.db.close();}
});

test('grade mutations roll back with audit failure and backups contain every gradebook table',async()=>{
 const f=await fixture();try{
  await f.management.gradebook.initialize();
  await f.db.exec("CREATE TRIGGER block_audit BEFORE INSERT ON platform_grade_audit BEGIN SELECT RAISE(ABORT,'audit unavailable'); END;");
  await assert.rejects(()=>f.call('teacher/paper-days',{studentId:'learner',date:'2026-11-20',correct:10,total:20,requestId:'rollback-paper-1'}),/audit unavailable/);
  assert.equal((await f.query('SELECT * FROM platform_paper_days')).length,0);assert.equal((await f.query('SELECT * FROM platform_grade_requests')).length,0);
  await f.db.exec('DROP TRIGGER block_audit;');
  const {createApp}=await import('../server/backend.mjs');
  const app=createApp({db:f.db,clock:f.clock}),backup=await app.backup();
  for(const name of ['assessments','scores','paper_days','gradebook_settings','grade_requests','grade_audit','grade_imports','assessment_visibility'])assert.ok(Array.isArray(backup.data.tables[`platform_${name}`]),name);
 }finally{f.db.close();}
});

test('runtime bootstrap keeps historical values and unknown coverage without multiplying on cold starts',async()=>{
 const f=await fixture();try{
  await f.db.prepare('INSERT INTO platform_weekly_checks(student_id,week,score,note) VALUES(?,?,?,?)').bind('learner',5,14,'Historical').run();
  await f.management.gradebook.initialize();
  const cold=createManagement({db:f.db,clock:f.clock,platform:f.platform});await cold.gradebook.initialize();
  const row=(await f.query('SELECT * FROM platform_scores WHERE student_id=?','learner'))[0];assert.equal(row.score,14);assert.equal(row.max_score,21);assert.equal(row.taken_on,null);assert.equal(row.missed,null);assert.equal(row.weight_snapshot,0);
  assert.equal((await f.query('SELECT * FROM platform_scores')).length,1);
 }finally{f.db.close();}
});

test('ratios diagnostic has the requested 25-question map and frozen unweighted bands',async()=>{
 const f=await fixture();try{
  const g=(await f.call('teacher/gradebook?studentId=learner')).value,a=g.assessments.find(a=>a.id==='ratios-rates-percents');assert.equal(a.maxScore,25);assert.equal(a.weight,0);assert.deepEqual(a.areas.map(a=>a.questions.length),[8,7,10]);assert.equal(g.scores.length,0);
  for(const [n,key] of [[18,'reteach'],[19,'on-track'],[22,'on-track'],[23,'strong']]){const r=await f.call('teacher/scores',score(a.id,n,`ratios-score-${n}`));assert.equal(r.status,201);const s=(await f.call('teacher/scores?studentId=learner')).value.scores.find(s=>s.id===r.value.id);assert.equal(s.band.key,key);assert.equal(s.readinessEligible,false);}
  assert.equal((await f.call('teacher/assessments/'+a.id,{title:'Ratios check',requestId:'ratios-title-edit'},f.teacher,'PATCH')).status,200);
  const r=await f.call('teacher/scores',score(a.id,23,'ratios-after-edit'));assert.equal((await f.call('teacher/scores?studentId=learner')).value.scores.find(s=>s.id===r.value.id).band.key,'strong');
 }finally{f.db.close();}
});

test('encoded record IDs support score and catalog edits; custom weekly tests never replace the course check',async()=>{
 const f=await fixture();try{
  await f.call('teacher/scores',score('weekly-1',19,'course-weekly-first'));
  const a=await f.call('teacher/assessments',{title:'Optional check',kind:'weekly',week:1,maxScore:21,requestId:'encoded-catalog'});
  assert.equal((await f.call('teacher/assessments/'+encodeURIComponent(a.value.id),{title:'Updated optional check',requestId:'encoded-catalog-edit'},f.teacher,'PATCH')).status,200);
  const r=await f.call('teacher/scores',score(a.value.id,5,'encoded-score'));
  assert.equal((await f.call('teacher/scores/'+encodeURIComponent(r.value.id),{studentId:'learner',score:6,requestId:'encoded-score-edit'},f.teacher,'PATCH')).status,200);
  assert.equal((await f.call('teacher/checks?studentId=learner')).value.checks[0].score,19);
 }finally{f.db.close();}
});

test('actual answers remain in 14-day online accuracy and completion after dates move',async()=>{
 const f=await fixture();try{
  for(let i=0;i<20;i++)await f.db.prepare(`INSERT INTO platform_attempts(id,question_id,student_id,date,skill,template_id,level,question_hash,question_text,params,given_answer,correct_answer,is_correct,mistake_label,seconds,source,created_at,result) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(`off-day-${i}`,`off-q-${i}`,'learner','2026-11-21','D-SUB','D-SUB:calculation',1,`off-hash-${i}`,'Test question','{}','1','1',i<15?1:0,null,10,'practice','2026-11-21T20:00:00Z','{}').run();
  await f.call('teacher/plan',{studentId:'learner',week:3,days:7});
  const g=(await f.call('teacher/gradebook?studentId=learner')).value;assert.ok(!g.weeks.flatMap(w=>w.days).some(d=>d.date==='2026-11-21'));
  assert.equal(g.readiness.accuracy.online.answered,20);assert.equal(g.readiness.accuracy.online.correct,15);assert.equal(g.readiness.components.find(c=>c.key==='daily').percent,75);
  const completion=g.readiness.benchmarks.find(b=>b.key==='daily-completion');assert.equal(completion.days.find(d=>d.date==='2026-11-21').complete,true);
 }finally{f.db.close();}
});

test('concurrent retakes and repeated requests create exactly the intended attempts and audit entries',async()=>{
 const f=await fixture();try{
  const duplicate=score('weekly-1',18,'concurrent-same-id');
  const results=await Promise.all([f.call('teacher/scores',duplicate),f.call('teacher/scores',duplicate)]);assert.ok(results.every(r=>r.status===201));
  await Promise.all([f.call('teacher/scores',score('weekly-1',19,'concurrent-next-1')),f.call('teacher/scores',score('weekly-1',20,'concurrent-next-2'))]);
  const scores=(await f.call('teacher/scores?studentId=learner')).value.scores;assert.deepEqual(scores.map(s=>s.attempt).sort(),[1,2,3]);assert.equal((await f.query('SELECT * FROM platform_grade_audit')).length,3);
 }finally{f.db.close();}
});


test('gradebook migration is schema-only and failed bootstrap can be retried safely',async()=>{
 const schema=readFileSync(new URL('../migrations/0007_gradebook.sql',import.meta.url),'utf8');assert.ok(!/^\s*(INSERT|UPDATE|DELETE)\b/im.test(schema));
 const f=await fixture();try{
  await f.db.prepare('INSERT INTO platform_weekly_checks(student_id,week,score,note) VALUES(?,?,?,?)').bind('learner',1,14,'Legacy').run();
  await f.db.exec("CREATE TRIGGER fail_bootstrap BEFORE INSERT ON platform_grade_audit BEGIN SELECT RAISE(ABORT,'bootstrap audit failure'); END;");
  await assert.rejects(()=>f.management.gradebook.initialize(),/bootstrap audit failure/);assert.equal((await f.query('SELECT * FROM platform_assessments')).length,0);assert.equal((await f.query('SELECT * FROM platform_scores')).length,0);
  await f.db.exec('DROP TRIGGER fail_bootstrap;');await f.management.gradebook.initialize();assert.equal((await f.query('SELECT * FROM platform_scores')).length,1);assert.equal((await f.query('SELECT * FROM platform_grade_audit')).length,1);
 }finally{f.db.close();}
});


test('score revision advances on edits even when time and numeric score are unchanged',async()=>{
 const f=await fixture();try{
  const added=await f.call('teacher/scores',score('weekly-1',19,'revision-add'));
  const edit={studentId:'learner',note:'Teacher correction',requestId:'revision-edit'};
  await f.call('teacher/scores/'+encodeURIComponent(added.value.id),edit,f.teacher,'PATCH');await f.call('teacher/scores/'+encodeURIComponent(added.value.id),edit,f.teacher,'PATCH');
  const row=(await f.query('SELECT * FROM platform_scores WHERE id=?',added.value.id))[0];assert.equal(row.grade_revision,2);assert.equal(row.score,19);
 }finally{f.db.close();}
});

test('per-test visibility hides every attempt and the legacy check while keeping paper and other tests visible',async()=>{
 const f=await fixture();try{
  await f.call('teacher/scores',score('weekly-1',18,'pertest-first'));await f.call('teacher/scores',score('weekly-1',19,'pertest-retake'));await f.call('teacher/scores',score('weekly-2',17,'pertest-other'));
  await f.call('teacher/paper-days',{studentId:'learner',date:'2026-11-20',correct:18,total:20,requestId:'pertest-paper'});
  const payload={studentId:'learner',showScores:false,requestId:'hide-test-one'};
  assert.equal((await f.call('teacher/assessments/weekly-1/visibility',payload,f.teacher,'PATCH')).status,200);
  assert.equal((await f.call('teacher/assessments/weekly-1/visibility',payload,f.teacher,'PATCH')).status,200);
  let student=(await f.call('student/gradebook?studentId=second',undefined,f.student)).value;
  assert.deepEqual(student.scores.map(s=>s.assessmentId),['weekly-2']);assert.equal(student.weeks.flatMap(w=>w.days).find(d=>d.date==='2026-11-20').paper.correct,18);
  assert.deepEqual((await f.call('student/progress',undefined,f.student)).value.checks.map(c=>c.week),[2]);
  const teacher=(await f.call('teacher/gradebook?studentId=learner')).value;assert.equal(teacher.scores.length,3);assert.equal(teacher.assessments.find(a=>a.id==='weekly-1').showScores,false);assert.equal(teacher.assessments.find(a=>a.id==='weekly-1').effectiveShowScores,false);
  assert.equal((await f.query("SELECT COUNT(*) AS n FROM platform_grade_audit WHERE action='assessment-visibility'"))[0].n,1);
  assert.ok((await f.query('SELECT grade_revision FROM platform_scores')).every(s=>s.grade_revision===1));
  const secondCatalog=(await f.call('teacher/assessments?studentId=second')).value.assessments;assert.equal(secondCatalog.find(a=>a.id==='weekly-1').showScores,true);
  assert.equal((await f.query('SELECT COUNT(*) AS n FROM platform_attempts'))[0].n,0);assert.equal((await f.query('SELECT COUNT(*) AS n FROM practice_ledger'))[0].n,0);
 }finally{f.db.close();}
});

test('global visibility overrides per-test settings and restoring it preserves each test choice',async()=>{
 const f=await fixture();try{
  await f.call('teacher/scores',score('weekly-1',18,'master-first'));await f.call('teacher/scores',score('weekly-2',17,'master-second'));
  await f.call('teacher/assessments/weekly-1/visibility',{studentId:'learner',showScores:false,requestId:'master-pertest-hide'},f.teacher,'PATCH');
  await f.call('teacher/gradebook/settings',{studentId:'learner',showScores:false,requestId:'master-hide'},f.teacher,'PATCH');
  let student=(await f.call('student/gradebook',undefined,f.student)).value;assert.equal(student.visible,false);assert.deepEqual(student.scores,[]);
  let catalog=(await f.call('teacher/assessments?studentId=learner')).value.assessments;assert.equal(catalog.find(a=>a.id==='weekly-2').showScores,true);assert.equal(catalog.find(a=>a.id==='weekly-2').effectiveShowScores,false);
  await f.call('teacher/gradebook/settings',{studentId:'learner',showScores:true,requestId:'master-show'},f.teacher,'PATCH');
  student=(await f.call('student/gradebook',undefined,f.student)).value;assert.equal(student.visible,true);assert.deepEqual(student.scores.map(s=>s.assessmentId),['weekly-2']);
  await f.call('teacher/assessments/weekly-1/visibility',{studentId:'learner',showScores:true,requestId:'master-pertest-show'},f.teacher,'PATCH');
  student=(await f.call('student/gradebook',undefined,f.student)).value;assert.equal(student.scores.length,2);assert.equal((await f.call('student/progress',undefined,f.student)).value.checks.length,2);
 }finally{f.db.close();}
});

test('per-test visibility is teacher-only, student-scoped and rejects invalid or reused requests',async()=>{
 const f=await fixture();try{
  const payload={studentId:'learner',showScores:false,requestId:'visibility-request'};
  assert.equal((await f.call('teacher/assessments/weekly-1/visibility',payload,f.student,'PATCH')).status,403);
  assert.equal((await f.call('teacher/assessments/missing/visibility',payload,f.teacher,'PATCH')).status,404);
  assert.equal((await f.call('teacher/assessments/weekly-1/visibility',{...payload,showScores:'no'},f.teacher,'PATCH')).status,400);
  assert.equal((await f.call('teacher/assessments/weekly-1/visibility',payload,f.teacher,'PATCH')).status,200);
  assert.equal((await f.call('teacher/assessments/weekly-2/visibility',payload,f.teacher,'PATCH')).status,409);
  assert.equal((await f.call('teacher/assessments/weekly-1/visibility',{...payload,studentId:'second'},f.teacher,'PATCH')).status,409);
  const a=await f.call('teacher/assessments',{title:'Optional skills test',kind:'custom',maxScore:10,requestId:'visibility-custom'});
  assert.equal((await f.call('teacher/assessments/'+encodeURIComponent(a.value.id)+'/visibility',{...payload,requestId:'visibility-custom-hide'},f.teacher,'PATCH')).status,200);
  assert.equal((await f.call('teacher/assessments?studentId=learner')).value.assessments.find(x=>x.id===a.value.id).showScores,false);
  const schema=readFileSync(new URL('../migrations/0009_grade_visibility.sql',import.meta.url),'utf8');assert.ok(!/^\s*(INSERT|UPDATE|DELETE)\b/im.test(schema));
 }finally{f.db.close();}
});
