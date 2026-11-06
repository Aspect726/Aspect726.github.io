import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
test('secure persistent classroom: accounts, grading, permissions, review, drafts, scheduling, analytics, restart',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'double-advanced-test-'));
  const curriculum={version:'test-v1',weeks:[{week:1,title:'Fractions'}],days:[
    {id:'day-001',day:1,week:1,dayIndex:0,dayName:'Saturday',title:'Equivalent fractions',requiredCount:3,challengeCount:1,lesson:{objective:'Compare equal parts.',recap:'Keep the whole the same.',examples:[{text:'One fourth plus one fourth is one half.'}],slides:[{hidden:true,notes:{expect:'SECRET TEACHER ANSWER'}}],guideUrl:'/api/resources/teacher/private.pdf',deepening:'SECRET TEACHER ANSWER'},questions:[
      {id:'test-fraction',prompt:'Write one half as an equivalent fraction.',answer:'1/2',skill:'Fractions',grading:{type:'number'},solution:'Two quarters equal one half.',hints:['Split each half into two equal parts.']},
      {id:'test-reasoning',prompt:'Explain why two quarters equal a half.',answer:'Both cover the same amount.',skill:'Fractions',challenge:true,grading:{type:'teacher-review'},solution:'They have the same position on a number line.'},
      {id:'test-paper',prompt:'Write three quarters.',answer:'3/4',skill:'Fractions',grading:{type:'number'}}]},
    {id:'day-002',day:2,week:1,dayIndex:1,dayName:'Sunday',title:'Decimals',requiredCount:1,questions:[{id:'test-decimal',prompt:'Write one half as a decimal.',answer:'0.5',skill:'Decimals',grading:{type:'number'}}]}
  ],extraPractice:[{id:'extra-fraction',prompt:'Write two eighths in simplest form.',answer:'1/4',skill:'Fractions',grading:{type:'number',requireSimplified:true}},{id:'extra-new',prompt:'Find 10% of 20.',answer:'2',skill:'Percent',grading:{type:'number'}}]};
  fs.writeFileSync(path.join(dir,'curriculum.json'),JSON.stringify(curriculum));
  const env={...process.env,DATABASE_PATH:path.join(dir,'test.sqlite'),CURRICULUM_PATH:path.join(dir,'curriculum.json'),TEACHER_USERNAME:'test-teacher',TEACHER_PASSWORD:'teacher-password-2026',TEACHER_NAME:'Teacher',NODE_ENV:'test'};
  const setup=spawnSync(process.execPath,['server.mjs','--create-teacher'],{cwd:root,env,encoding:'utf8'});
  assert.equal(setup.status,0,setup.stderr);
  let child,origin;
  async function start(){child=spawn(process.execPath,['server.mjs','--port','0'],{cwd:root,env,stdio:['ignore','pipe','pipe']});let errors='';child.stderr.on('data',v=>errors+=v);origin=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Server startup timed out '+errors)),10000);child.stdout.on('data',d=>{output+=d;const m=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});child.on('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code+' '+errors));});});}
  async function stop(){if(!child)return;const c=child;child=null;await new Promise(resolve=>{c.once('exit',resolve);c.kill('SIGTERM');});}
  t.after(async()=>{await stop();fs.rmSync(dir,{recursive:true,force:true});});
  await start();
  async function request(route,{method='GET',data,cookie,headers={}}={}){
    const result=await fetch(origin+route,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:data?JSON.stringify(data):undefined});
    const body=await result.json();return {status:result.status,body,cookie:result.headers.get('set-cookie')?.split(';')[0]};
  }
  assert.equal((await request('/api/health')).body.database,true);
  assert.equal((await request('/api/me')).body.configured,true);
  assert.equal((await request('/api/progress')).status,401);
  assert.equal((await request('/data/curriculum.json')).status,404);
  const publicDay=(await request('/api/days/day-001')).body;
  assert.equal(publicDay.questions[0].answer,undefined);
  assert.equal(publicDay.questions[0].solution,undefined);
  assert.equal(publicDay.questions[0].grading,undefined);
  assert.equal(publicDay.lesson.slides,undefined);assert.equal(publicDay.lesson.deepening,undefined);assert.equal(publicDay.lesson.guideUrl,undefined);
  assert.ok(!JSON.stringify((await request('/api/course')).body).includes('SECRET TEACHER ANSWER'));
  assert.equal((await request('/api/resources/teacher/Week_01_Teacher_Guide.pdf')).status,401);
  const badLogin=await request('/api/login',{method:'POST',data:{username:'test-teacher',password:'wrong'}});assert.equal(badLogin.status,401);
  const teacherLogin=await request('/api/login',{method:'POST',data:{username:'test-teacher',password:'teacher-password-2026'}});assert.equal(teacherLogin.status,200);const teacher=teacherLogin.cookie;
  const studentCreate=await request('/api/teacher/students',{method:'POST',cookie:teacher,data:{username:'learner',displayName:'Learner',password:'learner-password-2026'}});assert.equal(studentCreate.status,201);const studentId=studentCreate.body.student.id;
  const childLogin=await request('/api/login',{method:'POST',data:{username:'learner',password:'learner-password-2026'}});const student=childLogin.cookie;assert.equal(childLogin.status,200);
  assert.equal((await request('/api/teacher/answers',{cookie:student})).status,403);
  assert.equal((await request('/api/teacher/students',{cookie:student})).status,403);
  assert.equal((await request('/api/resources/teacher/Week_01_Teacher_Guide.pdf',{cookie:student})).status,403);
  assert.equal((await request('/api/attempts',{method:'POST',cookie:student,headers:{Origin:'https://evil.example'},data:{questionId:'test-fraction',response:'1/2',submissionId:randomUUID()}})).status,403);
  const draft=await request('/api/drafts/test-fraction',{method:'PUT',cookie:student,data:{response:'2/4',scratch:'2 halves × 2',explanation:'same whole',revision:0}});assert.equal(draft.body.revision,1);
  const conflict=await request('/api/drafts/test-fraction',{method:'PUT',cookie:student,data:{response:'1/4',revision:0}});assert.equal(conflict.status,409);assert.equal(conflict.body.details.draft.response,'2/4');
  const hint=await request('/api/questions/test-fraction/hint',{method:'POST',cookie:student,data:{}});assert.equal(hint.body.index,1);
  assert.equal((await request('/api/questions/test-fraction/solution',{method:'POST',cookie:student,data:{}})).status,403);
  const wrong=await request('/api/attempts',{method:'POST',cookie:student,data:{questionId:'test-fraction',response:'1/4',submissionId:randomUUID(),activeSeconds:20}});assert.equal(wrong.body.status,'incorrect');
  const submissionId=randomUUID(),correctData={questionId:'test-fraction',response:'2/4',submissionId,activeSeconds:30};
  const correct=await request('/api/attempts',{method:'POST',cookie:student,data:correctData});assert.equal(correct.status,201);assert.equal(correct.body.status,'correct');
  const duplicate=await request('/api/attempts',{method:'POST',cookie:student,data:correctData});assert.equal(duplicate.body.duplicate,true);assert.equal(duplicate.body.progress.attempts,2);
  assert.equal((await request('/api/attempts',{method:'POST',cookie:student,data:{...correctData,response:'3/4'}})).status,409);
  const reasoning=await request('/api/attempts',{method:'POST',cookie:student,data:{questionId:'test-reasoning',response:'They cover the same amount.',explanation:'Two quarters fill one half.',submissionId:randomUUID()}});assert.equal(reasoning.body.status,'teacher_review');
  const review=await request('/api/teacher/review',{method:'POST',cookie:teacher,data:{attemptId:reasoning.body.attempt.id,approved:true,feedback:'Your drawing shows equal parts.'}});assert.equal(review.body.progress.status,'approved');
  const paper=await request('/api/teacher/paper',{method:'POST',cookie:teacher,data:{studentId,questionId:'test-paper'}});assert.equal(paper.status,201);assert.equal(paper.body.progress.origin,'paper');assert.equal(paper.body.progress.firstAttemptCorrect,null);
  const settings=await request('/api/teacher/settings',{method:'POST',cookie:teacher,data:{startDate:'2027-01-02',timezone:'Pacific/Auckland',releaseSolutions:true,masteryMinQuestions:5,masteryThreshold:0.8}});assert.equal(settings.status,200);
  const badDate=await request('/api/teacher/settings',{method:'POST',cookie:teacher,data:{startDate:'2027-02-30'}});assert.equal(badDate.status,400);
  const solution=await request('/api/questions/test-fraction/solution',{method:'POST',cookie:student,data:{}});assert.equal(solution.body.answer,'1/2');
  const progress=(await request('/api/progress',{cookie:student})).body;assert.equal(progress.summary.completed,3);assert.equal(progress.summary.required,4);assert.equal(progress.summary.attempted,2);assert.equal(progress.summary.retries,1);assert.equal(progress.summary.activeSeconds,50);assert.equal(progress.days[0].date,'2027-01-02');assert.equal(progress.days[1].date,'2027-01-03');
  const analytics=(await request('/api/teacher/analytics?studentId='+studentId,{cookie:teacher})).body;assert.equal(analytics.pendingReview.length,0);assert.equal(analytics.summary.hints,1);assert.equal(analytics.skills[0].mastery,'not_enough_evidence');
  const queue=(await request('/api/review',{cookie:student})).body;assert.ok(queue.extraPractice.some(q=>q.id==='extra-fraction'));assert.ok(!queue.extraPractice.some(q=>q.id==='extra-new'));
  const paused=await request('/api/teacher/assignment',{method:'POST',cookie:teacher,data:{studentId,dayId:'day-002',paused:true,note:'Rescheduled after travel'}});assert.equal(paused.body.assignment.paused,true);
  assert.equal((await request('/api/attempts',{method:'POST',cookie:student,data:{questionId:'test-decimal',response:'0.5',submissionId:randomUUID()}})).status,403);
  const overridden=(await request('/api/progress',{cookie:student})).body.days[1];assert.equal(overridden.overridden,true);assert.equal(overridden.note,'Rescheduled after travel');
  const exported=await request('/api/export?studentId='+studentId,{cookie:teacher});assert.equal(exported.body.attempts.length,4);assert.equal(exported.body.attempts.filter(a=>a.origin==='paper').length,1);
  const answers=await request('/api/teacher/answers?week=1',{cookie:teacher});assert.equal(answers.body.days[0].questions[0].answer,'1/2');
  const before=(await request('/api/progress',{cookie:student})).body;
  await stop();await start();
  const after=await request('/api/progress',{cookie:student});assert.equal(after.status,200);assert.deepEqual(after.body,before);
  const logout=await request('/api/logout',{method:'POST',cookie:student,data:{}});assert.equal(logout.status,200);assert.equal((await request('/api/progress',{cookie:student})).status,401);
  const again=await request('/api/login',{method:'POST',data:{username:'learner',password:'learner-password-2026'}});assert.equal((await request('/api/progress',{cookie:again.cookie})).body.summary.completed,3);
});
