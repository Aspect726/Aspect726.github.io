import test from 'node:test';
import assert from 'node:assert/strict';
import {createSQLiteDB} from '../server/storage.mjs';
import {createPlatform} from '../server/platform.mjs';
import {generateQuestion,gradeQuestion,formatQuestionAnswer,publicQuestion,decodeStorySeed,storyScenarios,STORY_SHAPES} from '../server/questions.mjs';
import {SKILLS,addDays} from '../server/plan.mjs';

async function fixture(options={}){
 const db=createSQLiteDB();db.migrate();let date='2026-11-07';
 for(const id of ['alice','bob'])await db.prepare("INSERT INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,'student','unused','2026-11-07')").bind(id,id,id).run();
 const platform=createPlatform({db,clock:()=>new Date(date+'T20:00:00Z'),...options});
 const raw=async id=>JSON.parse((await db.prepare('SELECT q FROM platform_questions WHERE id=?').bind(id).first()).q);
 async function answer(question,studentId='alice',correct=true){const q=await raw(question.id);const input=correct?(q.choices?`option-${q.choices.findIndex(c=>String(c.value)===String(q.answer))}`:formatQuestionAnswer(q)):`${q.answerChoice?q.answerChoice+', ':''}999999999${q.answerUnit?' '+q.answerUnit:''}`;return platform.answer(studentId,{questionId:question.id,answer:input,requestId:crypto.randomUUID(),elapsedMs:1200});}
 return{db,platform,raw,answer,setDate:value=>{date=value;}};
}

test('units and comparison choice are checked without consuming format-only answers',()=>{
 const q={answer:'12.5',answerUnit:'metres',hints:[{answer:'10',text:'Subtract the part already used.'}],hint:'Find the remaining length.'};
 for(const input of ['12.5 m','12.5 metres','12.5 meters','12 1/2 metre'])assert.equal(gradeQuestion(q,input).correct,true,input);
 for(const input of ['12.5','12.5 cm','metres'])assert.equal(gradeQuestion(q,input).formOnly,true,input);
 assert.equal(gradeQuestion(q,'10 m').hint,q.hints[0].text);
 assert.equal(gradeQuestion(q,'10 m').formOnly,false);
 const area={...q,answer:'12',answerUnit:'square centimetres'};
 assert.equal(gradeQuestion(area,'12 cm²').correct,true);assert.equal(gradeQuestion(area,'12 cm').formOnly,true);
 const money={...q,answerUnit:'dollars'};assert.equal(gradeQuestion(money,'$12.50').correct,true);
 const comparison={...money,answerChoice:'B',choiceLabels:{A:'First shop',B:'Second shop'}};
 assert.equal(gradeQuestion(comparison,'B, 12.5 dollars').correct,true);
 assert.equal(gradeQuestion(comparison,'option B 12.5 usd').correct,true);
 assert.equal(gradeQuestion(comparison,'A, 12.5 dollars').correct,false);
 assert.equal(gradeQuestion(comparison,'12.5 dollars').formOnly,true);
 assert.equal(publicQuestion(comparison).answerChoice,undefined);
 assert.deepEqual(publicQuestion(comparison).answerChoices,comparison.choiceLabels);
});

test('every day of the 70-day course contains six warmups and fourteen distinct dependent stories', {timeout:120000},async()=>{
 const f=await fixture();try{
  for(let day=0;day<70;day++){
   f.setDate(addDays('2026-11-07',day));const stories=[],warmups=[];
   for(let index=0;index<20;index++){
    const {question}=await f.platform.question('alice',{source:'practice'}),q=await f.raw(question.id);
    assert.equal(question.setPosition,index+1);assert.equal(question.setNumber,1);
    if(q.story){stories.push(q);assert.ok(q.answerUnit);assert.ok(q.solution.length>=2&&q.solution.length<=4);}
    else{warmups.push(q);assert.ok(['calculation','missing'].includes(q.shape));}
    const result=await f.answer(question);assert.equal(result.correct,true,`${day}/${index}`);assert.equal(result.summary.answered,index+1);
   }
   assert.equal(warmups.length,6,`day ${day+1}`);assert.equal(stories.length,14,`day ${day+1}`);
   assert.equal(new Set(stories.map(q=>q.scenarioId)).size,14,`day ${day+1}`);
   assert.equal(new Set(stories.map(q=>q.storyShape)).size,5,`day ${day+1}`);
  }
 }finally{f.db.close();}
});

test('assigned, review, lesson and library questions share one story quota',async()=>{
 const f=await fixture();try{
  await f.db.prepare("INSERT INTO platform_assignments VALUES('extra','alice','D-SUB',4,'2026-11-07','2026-11-07','teacher','now')").run();
  await f.db.prepare("INSERT INTO platform_review_queue VALUES('review','alice','F-ADD','2026-11-07',1,'previous','2026-11-07',NULL)").run();
  const qs=[];
  for(let i=0;i<20;i++){
   const request=i<5?{source:'practice'}:i%2?{source:'learn',skill:'D-DIV'}:{source:'library',skill:'D-SUB'};
   const {question}=await f.platform.question('alice',request);qs.push(await f.raw(question.id));
   if(i<4)assert.equal(question.source,'assigned');if(i===4)assert.equal(question.source,'review');
   await f.answer(question);
  }
  assert.equal(qs.filter(q=>q.story).length,14);assert.equal(new Set(qs.filter(q=>q.story).map(q=>q.scenarioId)).size,14);
 }finally{f.db.close();}
});

test('simultaneous routes reserve unique positions and scenes; full pending sets resume rather than bypass quota',async()=>{
 const f=await fixture();try{
  const requested=Object.keys(SKILLS).slice(0,20);
  const results=await Promise.all(requested.map(skill=>f.platform.question('alice',{source:'library',skill})));
  const rows=(await f.db.prepare("SELECT * FROM platform_questions WHERE student_id='alice' ORDER BY slot_index").all()).results;
  assert.equal(rows.length,20);assert.equal(new Set(rows.map(r=>r.slot_index)).size,20);
  const stories=rows.filter(r=>r.scenario_id);assert.equal(stories.length,14);assert.equal(new Set(stories.map(r=>r.scenario_id)).size,14);
  const extra=await f.platform.question('alice',{source:'learn',skill:'D-SUB'});assert.ok(results.some(r=>r.question.id===extra.question.id));
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM platform_questions').first()).n,20);
  for(const result of results.toReversed())await f.answer(result.question);
  assert.equal((await f.platform.summary('alice')).answered,20);
  const next=await f.platform.question('alice',{source:'practice'});assert.equal(next.question.setNumber,2);assert.equal(next.question.setPosition,1);
 }finally{f.db.close();}
});

test('help is available for warmups and stories, is ownership checked, and never changes progress',async()=>{
 const f=await fixture();try{
  let story;
  for(let i=0;i<7;i++){
   const {question}=await f.platform.question('alice',{source:'practice',skill:'D-SUB'});const q=await f.raw(question.id),before=await f.platform.summary('alice');
   const help=await f.platform.help('alice',{questionId:question.id});assert.deepEqual(help.steps,q.solution);assert.equal(help.answer,formatQuestionAnswer(q));assert.ok(help.hint);
   await assert.rejects(()=>f.platform.help('bob',{questionId:question.id}),e=>e.status===404);
   assert.equal((await f.platform.summary('alice')).answered,before.answered);assert.equal((await f.platform.summary('alice')).points,before.points);
   if(i<6)await f.answer(question);else story=question;
  }
  const q=await f.raw(story.id),before=(await f.platform.summary('alice')).answered;
  const missingUnit=await f.platform.answer('alice',{questionId:story.id,answer:q.answer,requestId:'missing-unit'});assert.equal(missingUnit.formOnly,true);assert.equal(missingUnit.summary.answered,before);
  const correct=await f.answer(story);assert.equal(correct.correct,true);assert.equal(correct.summary.answered,before+1);
  const endpoint=body=>new Request('https://practice.test/api/v2/student/help',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  await assert.rejects(()=>f.platform.handle(endpoint({questionId:story.id}),null),e=>e.status===401);
  await assert.rejects(()=>f.platform.handle(endpoint({questionId:story.id}),{id:'alice',role:'teacher'}),e=>e.status===403);
  const response=await f.platform.handle(endpoint({questionId:story.id}),{id:'alice',role:'student'});assert.equal(response.status,200);
 }finally{f.db.close();}
});

test('custom daily targets keep at least sixty percent stories and later bonus sets retain scenario capacity',async()=>{
 for(const target of [5,10,25,39]){
  const f=await fixture();try{
   await f.db.prepare('INSERT INTO platform_program(student_id,daily_target) VALUES(?,?)').bind('alice',target).run();
   const questions=[];
   for(let i=0;i<40;i++){const {question}=await f.platform.question('alice',{source:'library',skill:'D-SUB'});questions.push(await f.raw(question.id));await f.answer(question);}
   assert.ok(questions.slice(0,target).filter(q=>q.story).length>=Math.ceil(target*.6),String(target));
   for(const block of [questions.slice(0,20),questions.slice(20)]){const stories=block.filter(q=>q.story);assert.equal(stories.length,14);assert.equal(new Set(stories.map(q=>q.scenarioId)).size,14);}
  }finally{f.db.close();}
 }
});

test('compact checked story pools decode identically in production question and lesson paths',async()=>{
 const scenes=storyScenarios('D-SUB'),encoded=scenes.flatMap((scene,i)=>STORY_SHAPES.map((shape,j)=>`${i}:${j}:0`));
 const pool={storyEncoding:{version:1,scenarios:scenes,shapes:STORY_SHAPES},skills:{'D-SUB':{}},stories:{'D-SUB':{}}};
 for(const level of [1,2,3]){pool.skills['D-SUB'][level]=Array.from({length:300},(_,i)=>`compact-test:${i}`);pool.stories['D-SUB'][level]=encoded;}
 assert.deepEqual(decodeStorySeed('D-SUB',2,'0:1:7',pool),{seed:'story-v1:D-SUB:2:0:1:7',scenarioId:scenes[0],storyShape:'compare'});
 assert.throws(()=>decodeStorySeed('D-SUB',2,'99:1:7',pool));assert.throws(()=>decodeStorySeed('D-SUB',2,'not-an-entry',pool));
 const f=await fixture({production:true,questionPool:pool});try{
  for(let i=0;i<20;i++){const {question}=await f.platform.question('alice',{source:'library',skill:'D-SUB'});const q=await f.raw(question.id);if(q.story)assert.match(q.seed,/^story-v1:D-SUB:/);assert.equal((await f.answer(question)).correct,true);}
  const {createLearning}=await import('../server/learning.mjs');const learning=createLearning({db:f.db,production:true,questionPool:pool});
  const lesson=await learning.lesson({id:'alice'},'D-SUB');assert.equal(lesson.examples.length,2);assert.ok(lesson.examples.every(q=>q.story&&q.answerUnit));
 }finally{f.db.close();}
});
