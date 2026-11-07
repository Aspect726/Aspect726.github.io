import { generateQuestion, publicQuestion, gradeQuestion, questionIdentity } from './questions.mjs';
import { LESSONS, vocabulary, formulas } from './lessons.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const strip=value=>String(value).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const answer=q=>q.choices?strip(q.choices.find((_,i)=>gradeQuestion(q,`option-${i}`).correct)?.label??q.answer):String(q.answer);
async function questionHash(q){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(questionIdentity(q))))).map(n=>n.toString(16).padStart(2,'0')).join('');}
export function createLearning({db,clock=()=>new Date(),production=false,questionPool=null}) {
 const st=(sql,...args)=>db.prepare(sql).bind(...args),one=(sql,...args)=>st(sql,...args).first(),all=async(sql,...args)=>(await st(sql,...args).all()).results;
 async function examples(studentId,skill) {
  const saved=await all('SELECT position,question FROM platform_examples WHERE student_id=? AND skill=? ORDER BY position',studentId,skill);
  const banned=new Set((await all('SELECT template_id FROM platform_flags WHERE resolved_at IS NULL')).map(row=>row.template_id));
  const result=[];
  for(let position=0;position<2;position++) {
   const cached=saved.find(row=>row.position===position),stored=cached&&JSON.parse(cached.question);
   if(stored&&!banned.has(`${skill}:${stored.shape}`)){result.push(stored);continue;}
   if(production&&!questionPool)fail(503,'The checked lesson examples are not ready.');
   const level=position+1,pool=questionPool?.skills?.[skill]?.[String(level)];
   if(questionPool&&!pool?.length)fail(503,'This lesson needs its checked examples.');
   const used=new Set((await all('SELECT question_hash FROM platform_questions WHERE student_id=? UNION SELECT question_hash FROM platform_examples WHERE student_id=?',studentId,studentId)).map(row=>row.question_hash));
   let selected;
   for(let offset=0;offset<(pool?.length||2000);offset++) {
    const q=generateQuestion(skill,pool?pool[(offset+position*37)%pool.length]:`lesson:${studentId}:${skill}:${position}:${offset}`,{difficulty:level});
    if(q.shape==='reason'||q.shape===result[0]?.shape||banned.has(`${skill}:${q.shape}`))continue;
    const hash=await questionHash(q);if(used.has(hash))continue;
    const encoded=JSON.stringify(q);
    if(cached) {
     // Keep the old example's hash reserved even after its template is flagged.
     const archivePosition=-1-Number.parseInt((await questionHash(stored)).slice(0,12),16);
     await db.batch([
      st('INSERT OR IGNORE INTO platform_examples(student_id,skill,position,question_hash,question) SELECT student_id,skill,?,question_hash,question FROM platform_examples WHERE student_id=? AND skill=? AND position=?',archivePosition,studentId,skill,position),
      st('UPDATE platform_examples SET question_hash=?,question=? WHERE student_id=? AND skill=? AND position=? AND question=?',hash,encoded,studentId,skill,position,cached.question)
     ]);
    }else await st('INSERT OR IGNORE INTO platform_examples(student_id,skill,position,question_hash,question) VALUES(?,?,?,?,?)',studentId,skill,position,hash,encoded).run();
    selected=JSON.parse((await one('SELECT question FROM platform_examples WHERE student_id=? AND skill=? AND position=?',studentId,skill,position)).question);break;
   }
   if(!selected)fail(503,'This lesson is waiting for fresh checked examples.');
   result.push(selected);
  }
  return result;
 }
 const view=q=>({...publicQuestion(q),answer:answer(q),steps:q.solution,solution:q.solution});
 async function lesson(user,skill) {
  const note=LESSONS[skill];if(!note)fail(404,'That skill was not found.');
  const qs=await examples(user.id,skill),first=qs[0],wrong=first.hints[0];
  const wrongLabel=first.choices&&/^option-\d+$/.test(wrong.answer)?strip(first.choices[Number(wrong.answer.slice(7))]?.label??wrong.answer):wrong.answer;
  return {...note,skill,model:first.svg||note.model,examples:qs.map(view),trap:{answer:String(wrongLabel),text:wrong.text},completed:Boolean(await one('SELECT completed_at FROM platform_lessons WHERE student_id=? AND skill=?',user.id,skill))};
 }
 async function handle(request,user) {
  const url=new URL(request.url),path=url.pathname;
  if(!['/api/v2/student/library','/api/v2/student/lesson','/api/v2/student/lesson-complete'].includes(path))return null;
  if(!user)fail(401,'Sign in first.');if(user.role!=='student')fail(403,'Use a student account for learning.');
  if(path.endsWith('/library')&&request.method==='GET') {
   // Examples are fetched with the lesson so browsing the index stays light.
   return json({skills:Object.values(LESSONS),vocabulary,formulas});
  }
  if(path.endsWith('/lesson')&&request.method==='GET')return json(await lesson(user,url.searchParams.get('skill')));
  if(path.endsWith('/lesson-complete')&&request.method==='POST') {
   if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Send JSON.');
   const raw=await request.text();if(raw.length>16384)fail(413,'That request is too large.');
   let body;try{body=JSON.parse(raw);}catch{fail(400,'That request could not be read.');}
   if(!LESSONS[body?.skill])fail(400,'Choose a skill.');
   const attempts=await one("SELECT COUNT(*) AS count FROM platform_attempts WHERE student_id=? AND skill=? AND source='learn'",user.id,body.skill);
   if(attempts.count<3)fail(409,'Answer the three Your turn questions first.');
   await st('INSERT OR IGNORE INTO platform_lessons(student_id,skill,completed_at) VALUES(?,?,?)',user.id,body.skill,new Date(clock()).toISOString()).run();
   return json({ok:true,skill:body.skill,completed:true});
  }
  return json({error:'Method not allowed.'},405);
 }
 return {handle,lesson};
}
