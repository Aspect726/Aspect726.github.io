import plan from './plan.json' with { type: 'json' };
import { SKILLS, dayInfo, addDays, pacificDate } from './plan.mjs';
import { courseSchedule, introducedSkills, courseSlots } from './course-schedule.mjs';
import { curriculumForSkill } from './curriculum.mjs';
import { generateQuestion, gradeQuestion, publicQuestion, questionIdentity, storyScenarios, storyShapes, formatQuestionAnswer, parseUnitAnswer, decodeStorySeed } from './questions.mjs';
import { parseNumber, rational, add, sub, mul, div, eq, compare } from './math.mjs';

const json = (value, status = 200) => new Response(JSON.stringify(value), {status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const fail = (status,message) => { throw Object.assign(new Error(message),{status}); };
const uuid=()=>crypto.randomUUID();
const strip=value=>String(value??'').replace(/<math\b[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<\/math>/g,'$1').replace(/<[^>]+>/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export const readableAnswer=q=>q.choices?strip(q.choices.find((_,i)=>gradeQuestion(q,`option-${i}`).correct)?.label??q.answer):q.skill==='E-INEQ'&&q.verification?.kind==='inequality'?`One possible answer: ${q.answer}`:formatQuestionAnswer(q);
export async function platformQuestionHash(q){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(questionIdentity(q))))).map(x=>x.toString(16).padStart(2,'0')).join('');}
const skillsForWeek=week=>[...new Set([...week.saturday.skills,...week.sunday.skills].flatMap(id=>id==='ALL'?Object.keys(SKILLS):[id]))];
const skillWeek=id=>Math.floor((curriculumForSkill(id)?.introductionDay??0)/7)+1;
const accuracy=rows=>rows.length?Math.round(rows.filter(r=>r.is_correct).length/rows.length*100):null;
export function skillStats(attempts, learned=[]){
  return Object.entries(SKILLS).map(([skill,name])=>{
    const rows=attempts.filter(a=>a.skill===skill).sort((a,b)=>a.created_at.localeCompare(b.created_at)||(a.sequence!=null&&b.sequence!=null?a.sequence-b.sequence:a.id.localeCompare(b.id)));
    let level=1,right=0,wrong=0,mastered=false;
    rows.forEach((row,i)=>{if(row.is_correct){right++;wrong=0;if(right===3){level=Math.min(3,level+1);right=0;}}else{wrong++;right=0;if(wrong===2){level=Math.max(1,level-1);wrong=0;}}const recent=rows.slice(Math.max(0,i-9),i+1),pct=accuracy(recent);if(i>=9&&pct>=85&&new Set(rows.slice(0,i+1).filter(a=>a.is_correct).map(a=>a.date)).size>=2)mastered=true;if(mastered&&pct<70)mastered=false;});
    const last=rows.slice(-10),pct=accuracy(last);
    const mastery=rows.length===0?(learned.includes(skill)?'Learning':'Not started'):mastered?'Mastered':rows.length<5||pct<60?'Learning':'Practicing';
    return {skill,name,week:skillWeek(skill),curriculum:curriculumForSkill(skill),attempts:rows.length,accuracy:pct,correct:rows.filter(r=>r.is_correct).length,level:mastery,mastery,difficulty:level,lastPracticed:rows.at(-1)?.date??null,offerExample:rows.length>=2&&rows.slice(-2).every(r=>!r.is_correct)};
  });
}
// Parse only linear expressions. Exact coefficient pairs avoid evaluation or
// floating-point substitution and reject nonlinear input instead of guessing.
export function linearExpression(value) {
  const source=String(value).toLowerCase().replaceAll('−','-').replaceAll('×','*').replace(/\s/g,'');
  if(!source||source.length>100)return null;
  const tokens=source.match(/(?:\d+(?:\.\d+)?|\.\d+)|x|[()+*\/-]/g);
  if(!tokens||tokens.join('')!==source)return null;
  let index=0;const zero=()=>rational(0),constant=b=>({a:zero(),b});
  const combine=(left,right,subtract=false)=>({a:(subtract?sub:add)(left.a,right.a),b:(subtract?sub:add)(left.b,right.b)});
  function atom(){const token=tokens[index++];if(token==='+'||token==='-'){const v=atom();return token==='-'?{a:mul(v.a,-1),b:mul(v.b,-1)}:v;}if(token==='x')return{a:rational(1),b:zero()};if(token==='('){const v=expression();if(tokens[index++]!==')')throw 0;return v;}const number=parseNumber(token);if(!number)throw 0;return constant(number);}
  function product(){let value=atom();while(index<tokens.length&&!['+', '-', ')'].includes(tokens[index])){let op=tokens[index];if(op==='*'||op==='/')index++;else op='*';const right=atom();if(op==='/'){if(!eq(right.a,0)||eq(right.b,0))throw 0;value={a:div(value.a,right.b),b:div(value.b,right.b)};}else{if(!eq(value.a,0)&&!eq(right.a,0))throw 0;value={a:add(mul(value.a,right.b),mul(right.a,value.b)),b:mul(value.b,right.b)};}}return value;}
  function expression(){let value=product();while(tokens[index]==='+'||tokens[index]==='-'){const op=tokens[index++];value=combine(value,product(),op==='-');}return value;}
  try{const value=expression();return index===tokens.length?value:null;}catch{return null;}
}
export function platformGrade(q,input){
  if(q.answerUnit)return gradeQuestion(q,input);
  if(q.skill==='E-INEQ'&&!q.choices&&q.verification?.kind==='inequality'){
    const value=parseNumber(input);if(!value)return{correct:false,formOnly:true,hint:'Enter a number that makes the inequality true.'};
    const order=compare(value,q.verification.boundary),sign=q.verification.sign,correct=sign==='<'?order<0:sign==='>'?order>0:sign==='≤'?order<=0:order>=0;
    return{correct,formOnly:false,hint:correct?'Correct.':q.hint};
  }
  if(['E-DIST','E-FACTOR','E-LIKE'].includes(q.skill)&&!q.choices){const actual=linearExpression(input),expected=linearExpression(q.answer);if(actual&&expected&&eq(actual.a,expected.a)&&eq(actual.b,expected.b)){const unformed=q.skill==='E-FACTOR'?!/[()]/.test(input):/[()]/.test(input)||(String(input).match(/x/gi)||[]).length>1;return unformed?{correct:false,formOnly:true,hint:q.skill==='E-FACTOR'?'Right value. Write it as a product with the common factor outside parentheses.':'Right value. Expand and combine the like terms.'}:{correct:true,formOnly:false,hint:'Correct.'};}}
  const coordinate=/^\(\s*-?\d+\s*,\s*-?\d+\s*\)$/.test(q.answer);
  return gradeQuestion(coordinate?{...q,answer:q.answer.replace(/\s/g,'')}:q,coordinate?String(input).replaceAll('−','-').replace(/\s/g,''):input);
}
export function createPlatform({db,clock=()=>new Date(),production=false,questionPool=null}){
  const now=()=>new Date(clock()),today=()=>pacificDate(now()),iso=()=>now().toISOString();
  const st=(sql,...args)=>db.prepare(sql).bind(...args),one=(sql,...args)=>st(sql,...args).first(),all=async(sql,...args)=>(await st(sql,...args).all()).results,run=(sql,...args)=>st(sql,...args).run();
  async function body(request){if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Send JSON.');const raw=await request.text();if(raw.length>16384)fail(413,'That request is too large.');try{const x=JSON.parse(raw);if(!x||typeof x!=='object'||Array.isArray(x))throw 0;return x;}catch{fail(400,'That request could not be read.');}}
  async function program(studentId){
    await run('INSERT OR IGNORE INTO platform_program(student_id) VALUES(?)',studentId);
    const row=await one('SELECT * FROM platform_program WHERE student_id=?',studentId);
    let p={studentId,startDate:row.start_date,weekOffsets:JSON.parse(row.week_offsets),dailyTarget:row.daily_target,bonusFirst:row.bonus_first,bonusStep:row.bonus_step,pendingSettings:JSON.parse(row.pending_settings),effectiveDate:row.effective_date};
    if(row.effective_date&&row.effective_date<=today())p={...p,...p.pendingSettings};
    await run('INSERT OR IGNORE INTO platform_daily_rules(student_id,date,daily_target,bonus_first,bonus_step) VALUES(?,?,?,?,?)',studentId,today(),p.dailyTarget,p.bonusFirst,p.bonusStep);
    const frozen=await one('SELECT * FROM platform_daily_rules WHERE student_id=? AND date=?',studentId,today());
    return {...p,dailyTarget:frozen.daily_target,bonusFirst:frozen.bonus_first,bonusStep:frozen.bonus_step};
  }
  async function attempts(studentId){return all('SELECT rowid AS sequence,* FROM platform_attempts WHERE student_id=? ORDER BY created_at,rowid',studentId);}
  async function analytics(studentId){
    const rows=await attempts(studentId),p=await program(studentId),learned=(await all('SELECT skill FROM platform_lessons WHERE student_id=?',studentId)).map(x=>x.skill);
    const ledger=await all('SELECT * FROM practice_ledger WHERE student_id=? ORDER BY created_at DESC',studentId);
    const rules=await all('SELECT * FROM platform_daily_rules WHERE student_id=?',studentId);
    const days=Object.entries(Object.groupBy(rows,r=>r.date)).map(([date,rs])=>({date,answered:rs.length,correct:rs.filter(r=>r.is_correct).length,accuracy:accuracy(rs),seconds:Math.round(rs.reduce((n,r)=>n+r.seconds,0)),minutes:Math.round(rs.reduce((n,r)=>n+r.seconds,0)/60),pointsEarned:ledger.filter(l=>l.kind==='bonus'&&pacificDate(l.created_at)===date).reduce((n,l)=>n+l.amount,0),target:rules.find(r=>r.date===date)?.daily_target??20})).sort((a,b)=>a.date.localeCompare(b.date));
    let bestStreak=0,current=0,previous=null;for(const d of days){if(d.answered>=d.target){current=previous===addDays(d.date,-1)?current+1:1;bestStreak=Math.max(bestStreak,current);previous=d.date;}else{current=0;previous=null;}}
    let streak=0,cursor=today();if(!days.find(d=>d.date===cursor&&d.answered>=d.target))cursor=addDays(cursor,-1);while(days.find(d=>d.date===cursor&&d.answered>=d.target)){streak++;cursor=addDays(cursor,-1);}
    return {studentId,attempts:rows,skills:skillStats(rows,learned),days,ledger,points:ledger.reduce((n,l)=>n+l.amount,0),streak,bestStreak,totalQuestions:rows.length,overallAccuracy:accuracy(rows),program:p,schedule:courseSchedule({program:p,attempts:rows,rules,today:today()})};
  }
  async function weeks(studentId,data){
    const a=data??await analytics(studentId),p=a.program,t=today();
    return plan.weeks.map((w,i)=>{const offset=Number(p.weekOffsets[i]||0),startDate=addDays(p.startDate,i*7+offset),endDate=addDays(startDate,6),rows=a.attempts.filter(x=>x.date>=startDate&&x.date<=endDate),days=a.schedule.days.filter(day=>day.week===w.week),skillIds=[...new Set(days.flatMap(day=>day.focus))],bridges=[...new Map(days.flatMap(day=>day.bridges).map(bridge=>[bridge.skill,bridge])).values()];return{week:w.week,title:w.title,startDate,endDate,bridges,status:t<startDate?'upcoming':t<=endDate?'current':Array.from({length:7},(_,j)=>a.days.find(d=>d.date===addDays(startDate,j))).every(d=>d&&d.answered>=d.target)?'done':'missed',accuracy:accuracy(rows),skills:skillIds.map(id=>a.skills.find(s=>s.skill===id)).filter(Boolean)};});
  }
  async function context(studentId){
    const a=await analytics(studentId),ws=await weeks(studentId,a),t=today(),current=ws.find(w=>w.status==='current')??[...ws].reverse().find(w=>w.startDate<=t)??ws[0];
    const delta=Math.max(0,Math.min(6,Math.floor((Date.parse(t)-Date.parse(current.startDate))/86400000))),index=(current.week-1)*7+delta,day={...dayInfo(index,a.program.startDate),...a.schedule.days[index],date:addDays(current.startDate,delta)};
    return{a,weeks:ws,week:current,day,introduced:introducedSkills(a.program,t)};
  }
  async function dueReviews(studentId,c,skill=null){
    const allowed=c?.introduced??introducedSkills((await program(studentId)),today());
    return (await all('SELECT * FROM platform_review_queue WHERE student_id=? AND cleared_at IS NULL AND due_date<=? ORDER BY due_date,id',studentId,today())).filter(row=>allowed.has(row.skill)&&(!skill||row.skill===skill));
  }
  async function summary(studentId,ctx){
    const c=ctx??await context(studentId),{a,week,day}=c,p=a.program,t=today(),rs=a.attempts.filter(r=>r.date===t),answered=rs.length;
    const bonusEarned=answered<p.dailyTarget+p.bonusFirst?0:1+Math.floor((answered-p.dailyTarget-p.bonusFirst)/p.bonusStep),nextPointAt=p.dailyTarget+p.bonusFirst+bonusEarned*p.bonusStep;
    const due=await dueReviews(studentId,c);
    const note=await one('SELECT text FROM platform_teacher_notes WHERE student_id=? AND week=?',studentId,week.week);
    return{today:t,date:t,day,week,answered,correct:rs.filter(r=>r.is_correct).length,accuracy:accuracy(rs),dailyTarget:p.dailyTarget,points:a.points,bonusFirst:p.bonusFirst,bonusStep:p.bonusStep,nextPointAt,untilNextPoint:nextPointAt-answered,bonusEarned,requiredDone:answered>=p.dailyTarget,remaining:Math.max(0,p.dailyTarget-answered),dueAt:a.schedule.today?.dueAt??null,schedule:a.schedule,reviewDue:due.length,streak:a.streak,bestStreak:a.bestStreak,teacherNote:note?.text??'',weekDays:Array.from({length:7},(_,i)=>{const date=addDays(week.startDate,i),d=a.days.find(x=>x.date===date),scheduled=a.schedule.days.find(x=>x.date===date);return{date,weekday:['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'][i],index:(week.week-1)*7+i,answered:d?.answered??0,correct:d?.correct??0,remaining:scheduled?.remaining??0,dueAt:scheduled?.dueAt??null,status:d&&d.answered>=d.target?'done':date>t?'upcoming':date<t?'missed':d?.answered?'partial':'today',lessonDay:i<2};})};
  }
  async function generateSample(skill,level=1,index=0,shape=null,options={}){
    if(!SKILLS[skill]&&skill!=='WARMUP')fail(400,'Choose a skill from the course.');
    const story=options.mode==='story',pool=questionPool?.[story?'stories':'skills']?.[skill]?.[String(level)];
    if(production&&!pool?.length)fail(503,'The checked question bank is not ready.');
    for(let n=0;n<(pool?.length??2000);n++){const entry=pool?.[(index+n)%pool.length],decoded=story&&entry?decodeStorySeed(skill,level,entry,questionPool):null,seed=decoded?.seed??entry??`platform:${skill}:${level}:${index+n}`;const q=generateQuestion(skill,seed,{difficulty:level,...options,...(decoded??{})});if(!shape||q.shape===shape)return q;}
    fail(503,'A fresh question is being prepared. Try a different skill.');
  }
  async function choose(studentId,b,c,slot=0){
    const source=b.source??'practice';if(!['practice','review','learn','library'].includes(source))fail(400,'Choose a practice source.');
    if(b.skill&&!SKILLS[b.skill])fail(400,'Choose a skill from the course.');
    const t=today(),{a,day}=c;
    if(source==='review') {const r=(await dueReviews(studentId,c,b.skill))[0];return r?{source,skill:r.skill,reviewId:r.id,category:'review'}:null;}
    if(b.skill)return{source,skill:b.skill};
    if(source!=='practice')fail(400,'Choose a skill first.');
    const assigned=await all('SELECT * FROM platform_assignments WHERE student_id=? AND start_date<=? AND end_date>=? ORDER BY created_at,id',studentId,t,t);
    for(const ass of assigned){const count=await one('SELECT COUNT(*) AS n FROM platform_questions q JOIN platform_attempts a ON a.question_id=q.id WHERE q.assignment_id=? AND a.date=?',ass.id,t);if(count.n<ass.count)return{source:'assigned',skill:ass.skill,assignmentId:ass.id};}
    const slots=courseSlots(day.index,{program:a.program,date:t,round:Math.floor(slot/20)}),planned=slots[slot%20],skill=planned.skill;
    const reviews=a.attempts.filter(x=>x.date===t&&x.source==='review').length;
    if(reviews<5&&planned.category==='recent') {
      // Spaced reviews include lessons introduced yesterday in this same week;
      // their due dates take priority inside the five review positions.
      const review=(await dueReviews(studentId,c))[0];
      if(review)return{source:'review',skill:review.skill,reviewId:review.id,category:planned.category};
    }
    return{source:'practice',skill,category:planned.category,focusKind:planned.focusKind};
  }
  async function ownedQuestion(studentId,questionId){
    if(typeof questionId!=='string'||!questionId||questionId.length>100)fail(400,'Reopen the question to get help.');
    const record=await one('SELECT * FROM platform_questions WHERE id=? AND student_id=?',questionId,studentId);
    if(!record)fail(404,'That question was not found.');
    return {question:JSON.parse(record.q),record};
  }
  async function help(studentId,b){
    const {question:q}=await ownedQuestion(studentId,b.questionId);
    return {questionId:b.questionId,hint:q.hint||'Identify what is known and what the question asks you to find.',steps:q.solution,answer:readableAnswer(q),answerUnit:q.answerUnit??null,choiceLabels:q.choiceLabels??null};
  }
  function visibleQuestion(row,c){
    const q=JSON.parse(row.q);
    return {...publicQuestion(q),name:SKILLS[q.skill],courseCategory:q.courseCategory??null,focusKind:q.focusKind??null,courseDay:q.courseDay??null,offerExample:Boolean(c.a.skills.find(x=>x.skill===q.skill)?.offerExample),id:row.id,level:row.level,source:row.source,helpAvailable:true,...(['learn','library'].includes(row.source)?{hint:q.hint}:{})};
  }
  async function question(studentId,b,retry=0){
    if(retry>30)fail(409,'Your other tab is updating this set. Try again.');
    const requestedSource=b.source??'practice';
    if(!['practice','review','learn','library'].includes(requestedSource))fail(400,'Choose a practice source.');
    if(b.skill&&!SKILLS[b.skill])fail(400,'Choose a skill from the course.');
    if(['learn','library'].includes(requestedSource)&&!b.skill)fail(400,'Choose a skill first.');
    const c=await context(studentId),date=today();
    if(b.intent==='daily'&&(!c.a.schedule.today||c.a.schedule.today.remaining===0))return{question:null,done:true,summary:await summary(studentId,c)};
    const reviewSelection=requestedSource==='review'?await choose(studentId,b,c):null;
    if(requestedSource==='review'&&!reviewSelection)return{question:null,done:true,summary:await summary(studentId,c)};
    const todayAttempts=c.a.attempts.filter(x=>x.date===date),blockStart=Math.floor(todayAttempts.length/20)*20;
    const reservations=await all('SELECT q.*,a.id AS attempt_id FROM platform_questions q LEFT JOIN platform_attempts a ON a.question_id=q.id WHERE q.student_id=? AND q.date=? AND q.slot_index>=? AND q.slot_index<? ORDER BY q.slot_index',studentId,date,blockStart,blockStart+20);
    const automatic=(b.source??'practice')==='practice'&&!b.skill;
    const automaticPending=automatic&&reservations.find(row=>!row.attempt_id&&(['practice','review'].includes(row.source)&&c.introduced.has(row.skill)||row.source==='assigned')&&(b.intent!=='daily'||row.slot_index<c.a.program.dailyTarget));
    if(automaticPending)return{question:visibleQuestion(automaticPending,c),summary:await summary(studentId,c)};
    // Legacy answered work takes its existing place. New slots are atomic reservations,
    // so a second tab cannot allocate another warm-up or repeat a scene in this set.
    const legacyCount=todayAttempts.filter(row=>JSON.parse(row.params||'{}').slotIndex==null).length;
    const occupied=new Set(reservations.map(row=>row.slot_index));
    for(let i=blockStart;i<Math.min(legacyCount,blockStart+20);i++)occupied.add(i);
    const slot=Array.from({length:20},(_,i)=>blockStart+i).find(i=>!occupied.has(i)&&(b.intent!=='daily'||i<c.a.program.dailyTarget));
    if(slot===undefined){
      const waiting=reservations.find(row=>!row.attempt_id&&(!automatic||c.introduced.has(row.skill)||row.source==='assigned')&&(requestedSource!=='review'||row.source==='review'&&row.review_id===reviewSelection.reviewId)&&(b.intent!=='daily'||row.slot_index<c.a.program.dailyTarget));
      if(waiting)return{question:visibleQuestion(waiting,c),summary:await summary(studentId,c),resumedPending:true};
      if(reservations.some(row=>!row.attempt_id))fail(409,'Finish an open extra-practice question before starting another set.');
      return question(studentId,b,retry+1);
    }
    const selection=reviewSelection??await choose(studentId,b,c,slot);
    if(!selection)return{question:null,done:true,summary:await summary(studentId,c)};
    const pending=reservations.find(row=>!row.attempt_id&&row.source===selection.source&&row.skill===selection.skill&&(!selection.reviewId||row.review_id===selection.reviewId)&&(b.intent!=='daily'||row.slot_index<c.a.program.dailyTarget));
    if(pending)return{question:visibleQuestion(pending,c),summary:await summary(studentId,c)};
    const targetRemainder=c.a.program.dailyTarget-blockStart,blockTarget=targetRemainder>0&&targetRemainder<20?targetRemainder:20;
    const firstWarmups=Math.min(6,Math.floor(blockTarget*.3)),warmupPositions=[...Array.from({length:firstWarmups},(_,i)=>i),...Array.from({length:6-firstWarmups},(_,i)=>blockTarget+i)];
    const position=slot-blockStart,story=!warmupPositions.includes(position),storyPosition=position-warmupPositions.filter(i=>i<position).length;
    const skill=selection.skill,stats=c.a.skills.find(x=>x.skill===skill),level=selection.forcedLevel??stats?.difficulty??1;
    const banned=new Set((await all('SELECT template_id FROM platform_flags WHERE resolved_at IS NULL')).map(x=>x.template_id));
    const served=new Set((await all('SELECT question_hash FROM platform_questions WHERE student_id=?',studentId)).map(x=>x.question_hash));
    for(const example of await all('SELECT question_hash FROM platform_examples WHERE student_id=?',studentId))served.add(example.question_hash);
    const old=new Set((await all('SELECT plain_prompt FROM practice_questions WHERE student_id=?',studentId)).map(x=>x.plain_prompt.toLowerCase().replace(/\s+/g,' ').trim()));
    const scenes=new Set(reservations.map(row=>row.scenario_id).filter(Boolean));
    const pool=questionPool?.[story?'stories':'skills']?.[skill]?.[String(level)];
    if(production&&!pool?.length)fail(503,story?'The checked story questions are not ready yet.':'The checked question bank is not ready.');
    const start=crypto.getRandomValues(new Uint32Array(1))[0]%(pool?.length??2000),wantedShape=storyShapes[storyPosition%storyShapes.length];
    const warmupShapes=banned.has(`${skill}:calculation`)?['missing']:['calculation','missing'];
    const scenarios=story?storyScenarios(skill):[];
    for(let pass=0;pass<2;pass++)for(let attempt=0;attempt<(pool?.length??2000);attempt++){
      const index=start+attempt,entry=pool?.[index%pool.length],decoded=story&&entry?decodeStorySeed(skill,level,entry,questionPool):null,seed=decoded?.seed??entry??`platform:${story?'story:':''}${skill}:${level}:${index}`;
      const options=story?{mode:'story',difficulty:level,scenarioId:decoded?.scenarioId??scenarios[Math.floor(index/storyShapes.length)%scenarios.length],storyShape:decoded?.storyShape??storyShapes[index%storyShapes.length]}:{difficulty:level};
      if(story&&pass===0&&options.storyShape!==wantedShape)continue;
      let q=generateQuestion(skill,seed,options);
      if(!story&&!warmupShapes.includes(q.shape))continue;
      if(story&&scenes.has(q.scenarioId))continue;
      const templateId=`${skill}:${q.shape}`,hash=await platformQuestionHash(q);
      if(banned.has(templateId)||served.has(hash)||old.has(questionIdentity(q)))continue;
      if(!story&&q.choices&&(parseNumber(q.answer)||/^\(\s*-?\d+\s*,\s*-?\d+\s*\)$/.test(q.answer)||(['E-DIST','E-FACTOR','E-LIKE'].includes(skill)&&linearExpression(q.answer)))){q={...q};delete q.choices;}
      if(!story&&q.choices&&skill==='F-COMP'&&['left','right','equal'].includes(q.answer)){const answer=q.answer==='equal'?'equal':q.answer==='left'?q.verification.a:q.verification.b;q={...q,answer,prompt:q.prompt+'<p>Type the greater fraction, or equal.</p>',plainPrompt:q.plainPrompt+' Type the greater fraction, or equal.',hints:q.hints.map(h=>({...h,answer:h.answer==='left'?q.verification.a:h.answer==='right'?q.verification.b:h.answer}))};delete q.choices;}
      if(q.choices){const recent=c.a.attempts.slice(-4);if(recent.length<4||recent.some(x=>JSON.parse(x.params)?.choices))continue;}
      q={...q,courseCategory:selection.category??(selection.source==='assigned'?'assigned':null),focusKind:selection.focusKind??null,courseDay:c.a.schedule.today?.index??null,setPosition:slot%20+1,setNumber:Math.floor(slot/20)+1,stage:story?'story':'warmup',answerInstructions:q.answerUnit?`Include ${q.answerChoice?'the option and ':''}the amount in ${q.answerUnit}.`:q.choices?'Choose the answer that fits.':'This warm-up has no measurement unit. Give the number or expression requested.'};
      const id=uuid();
      try{await run('INSERT INTO platform_questions(id,student_id,date,skill,template_id,level,question_hash,q,source,review_id,assignment_id,created_at,slot_index,scenario_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',id,studentId,date,skill,templateId,level,hash,JSON.stringify(q),selection.source,selection.reviewId??null,selection.assignmentId??null,iso(),slot,story?q.scenarioId:null);}
      catch(error){if(/UNIQUE|constraint/i.test(error.message))return question(studentId,b,retry+1);throw error;}
      return{question:visibleQuestion({id,q:JSON.stringify(q),level,source:selection.source},c),summary:await summary(studentId,c)};
    }
    fail(503,'This skill needs more checked questions. Try another skill.');
  }
  async function answer(studentId,b){
    if(typeof b.questionId!=='string'||typeof b.requestId!=='string'||b.requestId.length>100||!b.requestId)fail(400,'Reopen this question and try again.');
    if(typeof b.answer!=='string'||!b.answer.trim()||b.answer.length>100)fail(400,'Enter an answer first.');
    const row=await one('SELECT * FROM platform_questions WHERE id=? AND student_id=?',b.questionId,studentId);if(!row)fail(404,'That question was not found.');
    const existing=await one('SELECT * FROM platform_attempts WHERE question_id=? AND student_id=?',row.id,studentId);
    if(existing)return{...JSON.parse(existing.result),summary:await summary(studentId),pointsAwarded:0};
    if(row.slot_index==null)fail(409,'This question belongs to an earlier practice version. Open a fresh question to continue.');
    if(row.date!==today())fail(409,'A new practice day has begun. Open a fresh question for today.');
    const answeredToday=Number((await one('SELECT COUNT(*) AS n FROM platform_attempts WHERE student_id=? AND date=?',studentId,today())).n);
    if(row.slot_index!=null&&Math.floor(row.slot_index/20)>Math.floor(answeredToday/20))fail(409,'Finish the questions in your current set first.');
    const q=JSON.parse(row.q),grade=platformGrade(q,b.answer);
    if(grade.formOnly)return{correct:false,formOnly:true,hint:grade.hint,summary:await summary(studentId)};
    const submitted=q.choices?strip(q.choices[Number(b.answer.replace('option-',''))]?.label??b.answer):b.answer;
    const numericalInput=q.answerUnit?parseUnitAnswer(q,b.answer).value:b.answer;
    const match=q.hints.find(h=>String(h.answer).trim()===String(q.choices?q.choices[Number(b.answer.replace('option-',''))]?.value:numericalInput).trim());
    const result={correct:grade.correct,formOnly:false,answer:readableAnswer(q),rightAnswer:readableAnswer(q),submittedAnswer:submitted,hint:grade.correct?'':grade.hint,solution:q.solution,reason:strip(q.solution.at(-1)??`The answer is ${readableAnswer(q)}.`),mistakeLabel:match?`${q.skill}:${q.hints.indexOf(match)}`:null};
    const date=today(),time=iso(),p=await program(studentId),seconds=Math.max(0,Math.min(3600000,Number(b.elapsedMs)||0))/1000,id=`${studentId}:${b.requestId}`;
    const legacyBonus=(await all("SELECT amount,created_at FROM practice_ledger WHERE student_id=? AND kind='bonus' AND id NOT LIKE 'platform:bonus:%'",studentId)).filter(l=>pacificDate(l.created_at)===date).reduce((sum,l)=>sum+l.amount,0);
    const statements=[st('INSERT OR IGNORE INTO platform_attempts(id,question_id,student_id,date,skill,template_id,level,question_hash,question_text,params,given_answer,correct_answer,is_correct,mistake_label,seconds,source,created_at,result) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',id,row.id,studentId,date,row.skill,row.template_id,row.level,row.question_hash,q.plainPrompt,JSON.stringify({numbers:q.numbers,choices:Boolean(q.choices),seed:q.seed,story:Boolean(q.story),scenarioId:q.scenarioId??null,storyShape:q.storyShape??null,slotIndex:row.slot_index??null}),submitted,result.rightAnswer,grade.correct?1:0,result.mistakeLabel,seconds,row.source,time,JSON.stringify(result)),st("WITH RECURSIVE thresholds(n,ordinal) AS (SELECT ?,1 UNION ALL SELECT n+?,ordinal+1 FROM thresholds WHERE n+?<=(SELECT COUNT(*) FROM platform_attempts WHERE student_id=? AND date=?)) INSERT OR IGNORE INTO practice_ledger(id,student_id,amount,kind,note,run_id,created_at) SELECT 'platform:bonus:'||?||':'||?||':'||n,?,1,'bonus','Answered '||n||' questions',?,? FROM thresholds WHERE n<=(SELECT COUNT(*) FROM platform_attempts WHERE student_id=? AND date=?) AND ordinal>? AND EXISTS(SELECT 1 FROM platform_attempts WHERE id=? AND question_id=?)",p.dailyTarget+p.bonusFirst,p.bonusStep,p.bonusStep,studentId,date,studentId,date,studentId,row.id,time,studentId,date,legacyBonus,id,row.id)];
    if(row.review_id){
      const r=await one('SELECT * FROM platform_review_queue WHERE id=? AND student_id=?',row.review_id,studentId);
      if(r){const nextStage=grade.correct?(r.stage===1?3:r.stage===3?7:7):1,clear=grade.correct&&r.stage===7;
        statements.push(st('UPDATE platform_review_queue SET stage=?,due_date=?,origin_date=?,cleared_at=? WHERE id=? AND EXISTS(SELECT 1 FROM platform_attempts WHERE id=? AND question_id=?)',nextStage,clear?date:grade.correct?addDays(r.origin_date,nextStage):addDays(date,1),grade.correct?r.origin_date:date,clear?time:null,r.id,id,row.id));}
    }else if(!grade.correct){statements.push(st('INSERT OR IGNORE INTO platform_review_queue(id,student_id,skill,due_date,stage,from_attempt_id,origin_date,cleared_at) SELECT ?,?,?,?,1,?,?,NULL WHERE EXISTS(SELECT 1 FROM platform_attempts WHERE id=? AND question_id=?)',uuid(),studentId,row.skill,addDays(date,1),id,date,id,row.id));}
    await db.batch(statements);
    const saved=await one('SELECT * FROM platform_attempts WHERE question_id=? AND student_id=?',row.id,studentId);
    if(!saved)fail(409,'That answer identifier was already used. Reopen the question.');
    const s=await summary(studentId);
    return{...JSON.parse(saved.result),summary:s,pointsAwarded:Number((await one("SELECT COUNT(*) AS n FROM practice_ledger WHERE student_id=? AND kind='bonus' AND run_id=?",studentId,row.id)).n),milestone:s.answered===s.dailyTarget};
  }
  async function handle(request,user){
    const path=new URL(request.url).pathname;if(!path.startsWith('/api/v2/student/'))return null;
    if(!user)fail(401,'Sign in first.');if(user.role!=='student')fail(403,'Use a student account for practice.');
    const route=path.slice('/api/v2/student/'.length),id=user.id,method=request.method;
    if(route==='summary'&&method==='GET')return json(await summary(id));
    if(route==='map'&&method==='GET')return json({weeks:await weeks(id)});
    if(route==='progress'&&method==='GET'){const a=await analytics(id);return json({...a,attempts:undefined,ledger:undefined,weeks:await weeks(id,a),checks:await all('SELECT week,score,note FROM platform_weekly_checks WHERE student_id=? ORDER BY week',id)});}
    if(route==='review'&&method==='GET'){const requested=new URL(request.url).searchParams.get('skill');if(requested&&!SKILLS[requested])fail(400,'Choose a skill from the course.');const due=await dueReviews(id,null,requested);return json({due:due.map(x=>({id:x.id,skill:x.skill,stage:x.stage,dueDate:x.due_date,name:SKILLS[x.skill]})),count:due.length});}
    if(route==='question'&&method==='POST')return json(await question(id,await body(request)));
    if(route==='help'&&method==='POST')return json(await help(id,await body(request)));
    if(route==='answer'&&method==='POST')return json(await answer(id,await body(request)));
    return null;
  }
  return{handle,analytics,program,weeks,generateSample,summary,question,answer,help,ownedQuestion};
}
