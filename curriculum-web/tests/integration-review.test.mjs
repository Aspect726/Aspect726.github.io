import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'data','curriculum.json');
function assertNoKeys(value,forbidden,location='response') {
  if(!value||typeof value!=='object')return;
  for(const [key,child]of Object.entries(value)) {
    assert.ok(!forbidden.has(key),`${location}.${key} must stay on the server`);
    assertNoKeys(child,forbidden,`${location}.${key}`);
  }
}

test('actual curriculum stays private and separate classrooms remain isolated', {skip:!fs.existsSync(source)},async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'double-advanced-review-'));
  const snapshot=JSON.parse(fs.readFileSync(source,'utf8'));
  fs.copyFileSync(source,path.join(dir,'curriculum.json'));
  const environment={...process.env,NODE_ENV:'test',DATABASE_PATH:path.join(dir,'review.sqlite'),CURRICULUM_PATH:path.join(dir,'curriculum.json')};
  for(const name of ['teacher-one','teacher-two']) {
    const run=spawnSync(process.execPath,['server.mjs','--create-teacher'],{cwd:root,env:{...environment,TEACHER_USERNAME:name,TEACHER_PASSWORD:'Test-only-password-7391',TEACHER_NAME:name},encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
  }
  const child=spawn(process.execPath,['server.mjs','--port','0'],{cwd:root,env:environment,stdio:['ignore','pipe','pipe']});
  t.after(async()=>{if(child.exitCode===null)await new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGTERM');});fs.rmSync(dir,{recursive:true,force:true});});
  const origin=await new Promise((resolve,reject)=>{
    let out='',errors='';const timeout=setTimeout(()=>reject(Error(`Server did not start: ${errors}`)),10000);
    child.stderr.on('data',data=>errors+=data);
    child.stdout.on('data',data=>{out+=data;const match=out.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timeout);resolve(match[0]);}});
    child.on('exit',code=>{clearTimeout(timeout);reject(Error(`Server exited ${code}: ${errors}`));});
  });
  async function request(route,{method='GET',data,cookie,headers={}}={}) {
    const result=await fetch(origin+route,{method,headers:{...(data!==undefined?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:data===undefined?undefined:JSON.stringify(data)});
    const raw=await result.text();let body;try{body=JSON.parse(raw);}catch{body=raw;}
    return {status:result.status,body,cookie:result.headers.get('set-cookie')?.split(';')[0]};
  }
  async function login(username){const r=await request('/api/login',{method:'POST',data:{username,password:'Test-only-password-7391'}});assert.equal(r.status,200);return r.cookie;}
  const teacher=await login('teacher-one'),otherTeacher=await login('teacher-two');
  const created=await request('/api/teacher/students',{method:'POST',cookie:teacher,data:{username:'test-learner',displayName:'Learner',password:'Test-only-password-7391'}});
  assert.equal(created.status,201);const studentId=created.body.student.id,student=await login('test-learner');
  const forbidden=new Set(['answer','solution','expected','grading','sourceCheck','notes','worked','commonMistake']);
  let checked=0;
  for(const day of snapshot.days) {
    const r=await request(`/api/days/${day.id}`,{cookie:student});assert.equal(r.status,200);
    assert.equal(r.body.questions.length,day.questions.length);
    for(const q of r.body.questions){assertNoKeys(q,forbidden,q.id);checked++;}
    assert.equal(r.body.lesson?.slides,undefined);assert.equal(r.body.lesson?.deepening,undefined);
  }
  assert.equal(checked,1450);
  const staticCourse=(await request('/data/course.json')).body;
  for(const day of staticCourse.days)for(const q of day.questions||[])assertNoKeys(q,forbidden,q.id);
  for(const route of ['/api/teacher/answers','/api/teacher/analytics','/api/teacher/attempts','/api/teacher/students','/api/teacher/settings','/api/export','/api/resources/teacher/Week_01_Teacher_Guide.pdf']) {
    assert.equal((await request(route)).status,401,route);
    assert.equal((await request(route,{cookie:student})).status,403,route);
  }
  for(const route of ['/data/curriculum.json','/private/progress.sqlite','/server.mjs','/%2e%2e/data/curriculum.json'])assert.notEqual((await request(route,{cookie:student})).status,200,route);
  for(const route of ['/api/teacher/analytics','/api/teacher/attempts','/api/export'])assert.equal((await request(`${route}?studentId=${studentId}`,{cookie:otherTeacher})).status,404);
  assert.equal((await request('/api/teacher/assignment',{method:'POST',cookie:otherTeacher,data:{studentId,dayId:snapshot.days[0].id,paused:true}})).status,404);
  const numeric=snapshot.days.flatMap(d=>d.questions).find(q=>q.grading?.type==='number'&&/^\d+$/.test(q.answer));
  assert.ok(numeric);
  assert.equal((await request(`/api/questions/${numeric.id}/solution`,{method:'POST',cookie:student,data:{}})).status,403);
  const id=randomUUID(),payload={questionId:numeric.id,response:numeric.answer,submissionId:id};
  const submissions=await Promise.all([request('/api/attempts',{method:'POST',cookie:student,data:payload}),request('/api/attempts',{method:'POST',cookie:student,data:payload})]);
  assert.deepEqual(submissions.map(r=>r.status).sort(),[200,201]);
  assert.equal(submissions[0].body.progress.attempts,1);assert.equal(submissions[1].body.progress.attempts,1);
  const draftPayload={response:'scratch answer',revision:0};
  const drafts=await Promise.all([request(`/api/drafts/${numeric.id}`,{method:'PUT',cookie:student,data:draftPayload}),request(`/api/drafts/${numeric.id}`,{method:'PUT',cookie:student,data:draftPayload})]);
  assert.deepEqual(drafts.map(r=>r.status).sort(),[200,409]);
  const attemptId=submissions.find(r=>r.status===201).body.attempt.id;
  assert.equal((await request('/api/teacher/review',{method:'POST',cookie:otherTeacher,data:{attemptId,approved:true}})).status,404);
  assert.equal((await request('/api/teacher/paper',{method:'POST',cookie:otherTeacher,data:{studentId,questionId:numeric.id}})).status,404);
  assert.equal((await request('/api/progress',{cookie:otherTeacher})).body.summary.completed,0);
  const before=(await request(`/api/teacher/analytics?studentId=${studentId}`,{cookie:teacher})).body;
  assert.equal(before.summary.completed,1);assert.equal(before.summary.firstAttemptAccuracy,1);
  const paperQuestion=snapshot.days.flatMap(d=>d.questions).find(q=>q.id!==numeric.id&&q.skill===numeric.skill);
  assert.equal((await request('/api/teacher/paper',{method:'POST',cookie:teacher,data:{studentId,questionId:paperQuestion.id}})).status,201);
  const after=(await request(`/api/teacher/analytics?studentId=${studentId}`,{cookie:teacher})).body;
  assert.equal(after.summary.firstAttemptAccuracy,1,'Paper completion must not count as a wrong online attempt');
  assert.equal(after.skills.find(s=>s.skill===numeric.skill).accuracy,1,'Skill evidence must exclude ungraded paper completion');
  const day=snapshot.days[0];
  assert.equal((await request('/api/teacher/assignment',{method:'POST',cookie:teacher,data:{studentId,dayId:day.id,requiredCount:0}})).status,200);
  const adjusted=(await request(`/api/teacher/analytics?studentId=${studentId}`,{cookie:teacher})).body;
  assert.equal(adjusted.challenges.assigned,138,'Challenge analytics must reflect the learner’s assignment override');
});
