import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSQLiteDB } from '../server/storage.mjs';
import { createLearning } from '../server/learning.mjs';
import { LESSONS } from '../server/lessons.mjs';
import { SKILLS } from '../server/plan.mjs';
import { paperFrame, loadPaperFrames } from '../scripts/check-paper-frames.mjs';

function fixture(options={}) {
 const db=createSQLiteDB();db.migrate();
 for(const file of ['0002_platform.sql','0003_management.sql'])db.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
 for(const id of ['a','b'])db.exec(`INSERT INTO practice_users VALUES('${id}','student${id}','Learner','student','unused','2026-11-07')`);
 return {db,learning:createLearning({db,...options})};
}
test('every curriculum skill has an original idea, relationship model and reference rule',()=>{
 assert.deepEqual(Object.keys(LESSONS),Object.keys(SKILLS));
 for(const lesson of Object.values(LESSONS)) {
  assert.ok(lesson.idea.length>80,lesson.id);assert.ok(lesson.rule.length>25,lesson.id);
  assert.match(lesson.model,/<svg.*role="img"/);assert.ok(lesson.week>=1&&lesson.week<=10);
 }
});
test('lessons persist two distinct worked examples and separate them from quiz questions',async()=>{
 const {db,learning}=fixture();
 try {
  for(const skill of Object.keys(SKILLS)) {
   const a=await learning.lesson({id:'a'},skill),again=await learning.lesson({id:'a'},skill);
   assert.deepEqual(a.examples,again.examples);assert.equal(a.examples.length,2);
   assert.notEqual(a.examples[0].shape,a.examples[1].shape);
   for(const example of a.examples){assert.ok(example.answer);assert.ok(example.steps.length>=3);}
   assert.ok(a.trap.answer);assert.ok(a.trap.text);assert.equal(a.completed,false);
  }
  const count=await db.prepare('SELECT COUNT(*) AS n FROM platform_examples').first();assert.equal(count.n,108);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM platform_attempts').first()).n,0);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM practice_ledger').first()).n,0);
 }finally{db.close();}
});
test('lesson routes enforce sign-in, student role and actual Your turn attempts',async()=>{
 const {db,learning}=fixture();const req=(path,body)=>new Request('https://practice.test/api/v2/student/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
 try {
  await assert.rejects(learning.handle(req('library'),null),e=>e.status===401);
  await assert.rejects(learning.handle(req('library'),{id:'a',role:'teacher'}),e=>e.status===403);
  const user={id:'a',role:'student'};
  const library=await(await learning.handle(req('library'),user)).json();assert.equal(library.skills.length,54);assert.ok(library.vocabulary.length>=10);assert.ok(library.formulas.length>=10);
  await assert.rejects(learning.handle(req('lesson-complete',{skill:'D-SUB'}),user),e=>e.status===409);
  await assert.rejects(learning.handle(req('lesson?skill=unknown'),user),e=>e.status===404);
  for(let i=0;i<3;i++)await db.prepare("INSERT INTO platform_attempts(id,question_id,student_id,date,skill,template_id,level,question_hash,question_text,params,given_answer,correct_answer,is_correct,seconds,source,created_at,result) VALUES(?,?,?,'2026-11-07','D-SUB','D-SUB:story',1,?,'Example','{}','1','2',0,10,'learn','2026-11-07','{}')").bind('attempt'+i,'question'+i,'a','hash'+i).run();
  const result=await(await learning.handle(req('lesson-complete',{skill:'D-SUB'}),user)).json();assert.equal(result.completed,true);
  assert.equal((await learning.lesson(user,'D-SUB')).completed,true);
  assert.equal((await learning.lesson({id:'b'},'D-SUB')).completed,false);
 }finally{db.close();}
});
test('production lessons fail closed without a vetted pool',async()=>{
 const {db,learning}=fixture({production:true});try{await assert.rejects(learning.lesson({id:'a'},'D-SUB'),e=>e.status===503);}finally{db.close();}
});
test('paper frame exclusion catches number-swapped and word-number sentences',()=>{
 assert.equal(paperFrame('Four jars hold 7.25 litres.'),paperFrame('Nine jars hold 3.50 litres.'));
 assert.equal(paperFrame(' Find 8 − 2.4. '),paperFrame('find 19 − 7.03.'));
 assert.equal(paperFrame('Find <math aria-label="3/7"><mfrac><mn>3</mn><mn>7</mn></mfrac></math> of 28.'),paperFrame('Find {4/9} of 36.'));
 const corpus=loadPaperFrames({count:1,questions:[{question:'Four jars hold 7.25 litres.',steps:['Divide 7.25 by four.']}]});
 assert.equal(corpus.records,1);assert.equal(corpus.segments,2);
 assert.ok(corpus.frames.has(paperFrame('Six jars hold 8.41 litres.')));
 assert.throws(()=>loadPaperFrames({questions:[]}));
});
