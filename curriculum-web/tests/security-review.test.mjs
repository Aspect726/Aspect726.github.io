import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/backend.mjs';
import { createSQLiteDB } from '../server/storage.mjs';
import { allSkills, generateQuestion } from '../server/questions.mjs';

async function fixture({ questionPool = null } = {}) {
  const db=createSQLiteDB();db.migrate();
  let time=new Date('2026-11-07T18:00:00Z');
  const app=createApp({db,clock:()=>time,questionPool,logger:{error(...args){console.error(...args);}}});
  const call=async(path,body,cookie,method=body===undefined?'GET':'POST')=>{
    const response=await app.fetch(new Request(`https://practice.test/api${path}`,{method,headers:{...(body===undefined?{}:{'content-type':'application/json',origin:'https://practice.test'}),...(cookie?{cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}));
    return {status:response.status,value:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  };
  const parent=await call('/setup',{username:'parent',name:'Parent',password:'parent-password'});
  assert.equal(parent.status,200);
  await call('/parent/accounts',{username:'learner',name:'Learner',password:'1234',role:'student'},parent.cookie);
  const learner=await call('/login',{username:'learner',password:'1234',remember:true});
  assert.equal(learner.status,200);
  const raw=async id=>{
    const row=await db.prepare('SELECT * FROM practice_runs WHERE id = ?').bind(id).first();
    const state=JSON.parse(row.state);return {row,state,item:state.queue[state.cursor]};
  };
  const answer=async(id,value,requestId=crypto.randomUUID())=>{
    const {item}=await raw(id);
    const actual=value??(item.q.choices?`option-${item.q.choices.findIndex(c=>c.value===item.q.answer)}`:item.q.answer);
    return call(`/runs/${id}/answer`,{questionId:item.id,answer:actual,elapsedMs:500,requestId},learner.cookie);
  };
  const finish=async current=>{
    while(!current.done){
      const {item}=await raw(current.id);
      if(!item.waiting)assert.equal((await answer(current.id)).status,200);
      const next=await call(`/runs/${current.id}/next`,{questionId:item.id},learner.cookie);
      assert.equal(next.status,200);current=next.value;
    }
    return current;
  };
  return {db,app,call,parent,learner,raw,answer,finish,setTime(value){time=new Date(value);}};
}

test('calendar shifts cannot expose or answer a now-future required question',async()=>{
  const f=await fixture();
  try {
    const run=(await f.call('/runs',{dayIndex:0,kind:'required'},f.learner.cookie)).value;
    const q=run.question;
    assert.equal((await f.call('/parent/settings',{startDate:'2026-11-14'},f.parent.cookie,'PATCH')).status,200);
    const calendar=await f.call('/weeks',undefined,f.learner.cookie);
    assert.equal(calendar.value.days[0].status,'ahead');
    assert.ok(!calendar.value.days[0].run?.question,'a future question must not be included in the calendar');
    assert.equal((await f.call(`/runs/${run.id}`,undefined,f.learner.cookie)).status,403);
    assert.equal((await f.answer(run.id)).status,403);
    assert.equal((await f.call(`/runs/${run.id}/next`,{questionId:q.id},f.learner.cookie)).status,403);
    const attempts=await f.db.prepare('SELECT COUNT(*) AS n FROM practice_attempts').first();
    assert.equal(attempts.n,0);
  } finally {f.db.close();}
});

test('pause and Pacific midnight reject advancing a bonus with no extra points',async()=>{
  const f=await fixture();
  try {
    const required=(await f.call('/runs',{dayIndex:0,kind:'required'},f.learner.cookie)).value;
    await f.finish(required);
    const bonus=(await f.call('/runs',{dayIndex:0,kind:'bonus'},f.learner.cookie)).value;
    await f.answer(bonus.id);
    const current=await f.raw(bonus.id);
    await f.call('/parent/settings',{paused:true},f.parent.cookie,'PATCH');
    assert.equal((await f.call(`/runs/${bonus.id}/next`,{questionId:current.item.id},f.learner.cookie)).status,409);
    await f.call('/parent/settings',{paused:false},f.parent.cookie,'PATCH');
    f.setTime('2026-11-08T08:00:01Z');
    assert.equal((await f.call(`/runs/${bonus.id}/next`,{questionId:current.item.id},f.learner.cookie)).status,403);
    assert.equal((await f.call(`/runs/${bonus.id}`,undefined,f.learner.cookie)).status,403);
    assert.equal((await f.call('/prizes',undefined,f.learner.cookie)).value.points,0);
  } finally {f.db.close();}
});

test('parallel approvals for distinct prizes cannot overspend the ledger',async()=>{
  const f=await fixture();
  try {
    await f.call('/parent/points',{amount:3,note:'Opening balance',requestId:crypto.randomUUID()},f.parent.cookie);
    for(const name of ['Choose dinner','Choose a game']){
      const prize=(await f.call('/parent/prizes',{name,cost:2},f.parent.cookie)).value.prize;
      assert.equal((await f.call(`/prizes/${prize.id}/request`,{},f.learner.cookie)).status,200);
    }
    const requests=(await f.call('/prizes',undefined,f.learner.cookie)).value.requests;
    const outcomes=await Promise.all(requests.map(r=>f.call(`/parent/requests/${r.id}`,{action:'approve'},f.parent.cookie)));
    assert.deepEqual(outcomes.map(o=>o.status).sort(),[200,409]);
    const result=(await f.call('/prizes',undefined,f.learner.cookie)).value;
    assert.equal(result.points,1);
    assert.equal(result.history.filter(entry=>entry.kind==='prize').length,1);
    assert.equal(result.requests.filter(r=>r.status==='approved').length,1);
  } finally {f.db.close();}
});

test('two concurrent answers save one attempt and cannot advance twice',async()=>{
  const f=await fixture();
  try {
    const run=(await f.call('/runs',{dayIndex:0,kind:'required'},f.learner.cookie)).value;
    const outcomes=await Promise.all([f.answer(run.id),f.answer(run.id)]);
    assert.deepEqual(outcomes.map(o=>o.status).sort(),[200,409]);
    const attempts=await f.db.prepare('SELECT COUNT(*) AS n FROM practice_attempts').first();
    assert.equal(attempts.n,1);
    const next=await Promise.all([1,2].map(()=>f.call(`/runs/${run.id}/next`,{questionId:run.question.id},f.learner.cookie)));
    next.forEach(result=>assert.equal(result.status,200));
    assert.equal((await f.raw(run.id)).state.cursor,1);
  } finally {f.db.close();}
});

test('independent simultaneous makeup sets cannot insert duplicate question signatures',async()=>{
  const skills=Object.fromEntries(allSkills.map(skill=>[skill,Object.fromEntries([1,2,3].map(difficulty=>[difficulty,Array.from({length:100},(_,index)=>`qa-pool-${index}`)]))]));
  // Each run needs five D-SUB questions. Six unique candidates force a conflict
  // between the two concurrently-created sets, even when their seed offsets differ.
  const unique=new Map();
  for(let seed=0;unique.size<6;seed++){
    const q=generateQuestion('D-SUB',`qa-limited-${seed}`,{difficulty:1});
    unique.set(q.signature,`qa-limited-${seed}`);
  }
  skills['D-SUB']['1']=[...unique.values()];
  const f=await fixture({questionPool:{skills}});
  try {
    f.setTime('2026-11-09T18:00:00Z');
    const outcomes=await Promise.all([0,2].map(dayIndex=>f.call('/runs',{dayIndex,kind:'required'},f.learner.cookie)));
    assert.ok(outcomes.some(outcome=>outcome.status===200),JSON.stringify(outcomes));
    const duplicates=(await f.db.prepare('SELECT signature,COUNT(*) AS n FROM practice_questions GROUP BY signature HAVING COUNT(*) > 1').all()).results;
    assert.deepEqual(duplicates,[],'racing makeup days must not reuse a question');
    assert.ok(outcomes.every(outcome=>[200,503,409].includes(outcome.status)),'bank exhaustion should be a clear response, not an internal error');
  } finally {f.db.close();}
});

test('database constraints enforce the repeat window across midnight and alternate question identities',async()=>{
  const db=createSQLiteDB();db.migrate();
  try {
    const insert=(id,signature,prompt,date)=>db.prepare('INSERT INTO practice_questions(id,student_id,run_id,signature,plain_prompt,date) VALUES(?,?,?,?,?,?)').bind(id,'qa-student','qa-run',signature,prompt,date).run();
    await insert('first','D-SUB:18|3.25','Eighteen minus three and a quarter','2026-11-07');
    await assert.rejects(insert('next-night','D-SUB:18|3.25','Reworded question','2026-11-08'));
    await assert.rejects(insert('same-words','different-numeric-signature','Eighteen minus three and a quarter','2026-11-09'));
    await assert.rejects(insert('fourteen-days','D-SUB:18|3.25','Another wording','2026-11-21'));
    await insert('outside-window','D-SUB:18|3.25','Eighteen minus three and a quarter','2026-11-22');
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM practice_questions').first()).n,2);
  } finally {db.close();}
});
