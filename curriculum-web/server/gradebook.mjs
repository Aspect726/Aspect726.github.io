import { GRADEBOOK_BOOTSTRAP_SQL } from './gradebook-bootstrap.mjs';
import { pacificDate, validDate, addDays } from './plan.mjs';
import { scheduledCourseDays, courseSchedule } from './course-schedule.mjs';
import { buildReadiness } from './gradebook-analytics.mjs';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const integer=(v,min,max,label)=>{if(!Number.isInteger(v)||v<min||v>max)fail(400,`${label} must be a whole number from ${min} to ${max}.`);return v;};
const clean=(v,n=1000)=>typeof v==='string'?v.trim().slice(0,n):'';
const nullableDate=(v,label)=>{if(v===null||v==='')return null;if(!validDate(v))fail(400,`Choose a valid ${label}.`);return v;};
const optionalMinutes=v=>v===null||v===''||v===undefined?null:integer(v,0,1440,'Minutes');
const percent=(a,b)=>b?Math.round(a/b*1000)/10:null;
const parse=(v,fallback)=>{try{return JSON.parse(v);}catch{return fallback;}};
const decodeId=value=>{try{return decodeURIComponent(value);}catch{fail(400,'That record ID could not be read.');}};
const KINDS=['standards','practice','weekly','checkpoint','rehearsal','final','custom'];
const policies={
 weekly:{version:1,thresholds:[['strong','Strong',19,21],['on-track','On track',16,21],['repeat','Repeat the weakest idea',12,21],['reteach','Re-teach together',0,1]]},
 standards:{version:1,thresholds:[['strong','Solid',35,39],['on-track','A few gaps',29,39],['reteach','Fix these gaps first',0,1]]},
 daily:{version:1,thresholds:[['strong','Strong',90,100],['on-track','On track',75,100],['reteach','Re-teach together',0,1]]},
 practice:{version:1,thresholds:[['diagnostic','Starting point',0,1]]},
 custom:{version:1,thresholds:[['recorded','Score recorded',0,1]]}
};
const policyFor=kind=>policies[kind==='final'?'weekly':['checkpoint','rehearsal'].includes(kind)?'daily':kind]??policies.custom;
function band(score,max,policy){
 const rows=policy.thresholds,index=rows.findIndex(([, ,n,d])=>score*d>=max*n),[key,label,n,d]=rows[index<0?rows.length-1:index];
 return {key,label,percent:percent(score,max),minimumPercent:n/d*100,maximumPercent:index>0?rows[index-1][2]/rows[index-1][3]*100:100};
}
function areasInput(value,max){
 if(!Array.isArray(value)||value.length>30)fail(400,'Areas must be a list of at most 30 groups.');
 const ids=new Set(),covered=new Set();
 return value.map((area,index)=>{
  if(!area||typeof area!=='object')fail(400,'Enter a valid topic area.');
  const id=clean(area.id,80)||`area-${index+1}`,label=clean(area.label,160);
  if(!label||ids.has(id))fail(400,'Each area needs a name and a unique ID.');ids.add(id);
  if(!Array.isArray(area.questions)||!area.questions.length)fail(400,'Each area needs question numbers.');
  const questions=area.questions.map(q=>integer(q,1,max,'Question number')).sort((a,b)=>a-b);
  for(const q of questions){if(covered.has(q))fail(400,'A question can belong to only one area.');covered.add(q);}
  return {id,label,questions};
 });
}
function missedInput(value,max,score){
 if(value===null||value===undefined)return null;
 if(!Array.isArray(value)||value.length>max)fail(400,'Enter a complete list of missed question numbers, or leave it unknown.');
 const missed=value.map(n=>integer(n,1,max,'Missed question')).sort((a,b)=>a-b);
 if(new Set(missed).size!==missed.length)fail(400,'A missed question can be listed only once.');
 if(score!==max-missed.length)fail(400,'The complete missed-question list must match the score. For partial credit, enter the score and leave missed questions unknown.');
 return missed;
}
function byArea(areas,missed){return areas.map(a=>{const total=a.questions.length,correct=missed===null?null:total-a.questions.filter(q=>missed.includes(q)).length;return {id:a.id,label:a.label,total,correct,percent:correct===null?null:percent(correct,total),missed:missed===null?null:a.questions.filter(q=>missed.includes(q)),needsReteach:missed===null?null:a.questions.filter(q=>missed.includes(q)).length>=2};});}

export function createGradebook({db,clock=()=>new Date(),platform=null,program,chooseStudent,initialScore=null}) {
 const stmt=(sql,...args)=>db.prepare(sql).bind(...args),one=(sql,...args)=>stmt(sql,...args).first(),all=async(sql,...args)=>(await stmt(sql,...args).all()).results;
 const iso=()=>new Date(clock()).toISOString(),today=()=>pacificDate(clock());
 const activeGuard='EXISTS(SELECT 1 FROM platform_grade_requests WHERE actor_id=? AND request_id=? AND applied=0)';
 let initialization=null;
 async function initialize(){
  if(!initialization)initialization=db.batch(GRADEBOOK_BOOTSTRAP_SQL.map(sql=>stmt(sql))).catch(error=>{initialization=null;throw error;});
  await initialization;
 }

 async function body(request){if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Send JSON.');const raw=await request.text();if(raw.length>16384)fail(413,'That request is too large.');try{const d=JSON.parse(raw);if(!d||Array.isArray(d)||typeof d!=='object')throw Error();return d;}catch{fail(400,'That request could not be read.');}}
 async function write({user,data,operation,studentId=null,targetId,before=null,after,build,response={ok:true,id:targetId}}){
  const requestId=clean(data.requestId,100);if(!/^[A-Za-z0-9_-]{8,100}$/.test(requestId))fail(400,'This change needs a request ID.');
  const payload=JSON.stringify({operation,studentId,targetId,after}),old=await one('SELECT * FROM platform_grade_requests WHERE actor_id=? AND request_id=?',user.id,requestId);
  if(old){if(old.payload!==payload)fail(409,'That request ID belongs to a different change.');return JSON.parse(old.response);}
  const guard={sql:activeGuard,args:[user.id,requestId]};
  await db.batch([
   stmt('INSERT OR IGNORE INTO platform_grade_requests(actor_id,request_id,operation,payload,response,created_at) VALUES(?,?,?,?,?,?)',user.id,requestId,operation,payload,JSON.stringify(response),iso()),
   ...build(guard),
   stmt(`INSERT INTO platform_grade_audit(id,actor_id,student_id,action,target_id,before_json,after_json,created_at) SELECT ?,?,?,?,?,?,?,? WHERE ${guard.sql}`,`${user.id}:${requestId}`,user.id,studentId,operation,targetId,before===null?null:JSON.stringify(before),JSON.stringify(after),iso(),...guard.args),
   stmt('UPDATE platform_grade_requests SET applied=1 WHERE actor_id=? AND request_id=? AND applied=0',user.id,requestId)
  ]);
  const saved=await one('SELECT payload,response FROM platform_grade_requests WHERE actor_id=? AND request_id=?',user.id,requestId);
  if(saved.payload!==payload)fail(409,'That request ID belongs to a different change.');return JSON.parse(saved.response);
 }
 function scoreView(row,student=false){
  const view={id:row.id,assessmentId:row.assessment_id,title:row.title_snapshot,kind:row.kind_snapshot,week:row.week_snapshot,attempt:row.attempt,takenOn:row.taken_on,score:row.score,maxScore:row.max_score,percent:percent(row.score,row.max_score),band:band(row.score,row.max_score,parse(row.band_policy,policyFor(row.kind_snapshot))),minutes:row.minutes,missed:parse(row.missed,null),byArea:parse(row.by_area,[]),redoDue:row.redo_due,redoCompleted:Boolean(row.redo_completed)};
  if(!student)Object.assign(view,{studentId:row.student_id,revision:row.grade_revision,weight:row.weight_snapshot,readinessEligible:row.weight_snapshot>0||row.assessment_id==='standards-5',note:row.note,redoNote:row.redo_note,createdAt:row.created_at,updatedAt:row.updated_at,source:row.source});
  return view;
 }
 async function visible(id){return (await one('SELECT show_scores FROM platform_gradebook_settings WHERE student_id=?',id))?.show_scores!==0;}
 async function importInitial(){
  if(!initialScore||typeof initialScore!=='object')return;
  const seedId=clean(initialScore.seedId,100);if(!seedId||await one('SELECT id FROM platform_grade_imports WHERE id=?',seedId))return;
  const users=await all("SELECT id FROM practice_users WHERE role='student'");if(users.length!==1)return;
  const a=await one('SELECT * FROM platform_assessments WHERE id=?',initialScore.assessmentId);if(!a||initialScore.maxScore!==a.max_score||!Number.isInteger(initialScore.score)||initialScore.score<0||initialScore.score>a.max_score)return;
  if(initialScore.takenOn!==null&&initialScore.takenOn!==undefined&&!validDate(initialScore.takenOn))return;
  const sid=users[0].id,id=`import:${seedId}`,at=iso();
  // Never overwrite an existing teacher-entered result. A private seed has no
  // authority to create a second attempt or identify a student among several.
  await db.batch([
   stmt(`INSERT OR IGNORE INTO platform_scores(id,student_id,assessment_id,attempt,taken_on,score,max_score,note,title_snapshot,kind_snapshot,week_snapshot,band_policy,weight_snapshot,areas_snapshot,by_area,source,created_at,updated_at) SELECT ?,?,?,1,?,?,?,?,?,?,?,?,?,?,?,'private-import',?,? WHERE (SELECT COUNT(*) FROM practice_users WHERE role='student')=1 AND NOT EXISTS(SELECT 1 FROM platform_scores WHERE student_id=? AND assessment_id=?) AND NOT EXISTS(SELECT 1 FROM platform_grade_imports WHERE id=?)`,id,sid,a.id,initialScore.takenOn??null,initialScore.score,a.max_score,clean(initialScore.note),a.title,a.kind,a.week,a.band_policy,a.weight,a.areas,JSON.stringify(byArea(parse(a.areas,[]),null)),at,at,sid,a.id,seedId),
   stmt("INSERT OR IGNORE INTO platform_grade_audit(id,student_id,action,target_id,after_json,created_at) SELECT ?,?,'private-import',?,?,? WHERE EXISTS(SELECT 1 FROM platform_scores WHERE id=? AND source='private-import')",`import-audit:${seedId}`,sid,id,JSON.stringify({score:initialScore.score,maxScore:a.max_score,takenOn:initialScore.takenOn??null}),at,id),
   stmt('INSERT OR IGNORE INTO platform_grade_imports(id,student_id,score_id,created_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM platform_scores WHERE id=?)',seedId,sid,id,at,id)
  ]);
 }
 function assessmentView(a,days=[]){
  const scheduled=a.week&&a.day_offset!==null?addDays(days[(a.week-1)*7]?.date??'2026-11-07',a.day_offset):null;
  return {id:a.id,kind:a.kind,title:a.title,week:a.week,plannedDate:a.planned_date??scheduled,maxScore:a.max_score,weight:a.weight,areas:parse(a.areas,[]),active:Boolean(a.active),builtIn:Boolean(a.built_in),updatedAt:a.updated_at,versionNote:a.id==='standards-5'?'39-question syllabus version. The older 37-question download is a different test.':null};
 }
 async function catalog(id=null,providedProgram=null){
  await initialize();const p=providedProgram??(id?await program(id):{}),days=scheduledCourseDays(p),globallyVisible=id?await visible(id):true;
  return (await all('SELECT a.*,COALESCE(v.show_scores,1) AS show_scores FROM platform_assessments a LEFT JOIN platform_assessment_visibility v ON v.assessment_id=a.id AND v.student_id=? ORDER BY COALESCE(a.week,0),a.id',id)).map(a=>({...assessmentView(a,days),showScores:Boolean(a.show_scores),effectiveShowScores:globallyVisible&&Boolean(a.show_scores)}));
 }
 async function read(id,{student=false,programData=null,canonical:providedCanonical=null}={}){
  await initialize();await importInitial();
  if(student&&!await visible(id))return {visible:false,today:today(),weeks:[],scores:[],unmappedPaperDays:[]};
  const p=programData??await program(id),canonical=providedCanonical??(platform?.analytics?await platform.analytics(id):null);
  const attempts=canonical?.attempts??await all('SELECT * FROM platform_attempts WHERE student_id=?',id),rules=await all('SELECT * FROM platform_daily_rules WHERE student_id=?',id),schedule=canonical?.schedule??courseSchedule({program:p,attempts,rules,today:today()});
  const attemptDates=new Map();for(const row of attempts){if(!attemptDates.has(row.date))attemptDates.set(row.date,[]);attemptDates.get(row.date).push(row);}
  const papers=await all('SELECT * FROM platform_paper_days WHERE student_id=? ORDER BY date',id),paperMap=new Map(papers.map(row=>[row.date,row]));
  const days=schedule.days.map(day=>{
   const rows=attemptDates.get(day.date)??[],correct=rows.filter(row=>row.is_correct).length,pp=paperMap.get(day.date);
   const paper=pp?{correct:pp.correct,total:pp.total,percent:percent(pp.correct,pp.total),band:band(pp.correct,pp.total,policies.daily),minutes:pp.minutes,...student?{}:{note:pp.note,updatedAt:pp.updated_at}}:null;
   return {date:day.date,index:day.index,title:day.title,focus:day.focus,optionalPaper:day.date==='2026-11-26',online:{answered:rows.length,correct,percent:percent(correct,rows.length),minutes:Math.round(rows.reduce((n,r)=>n+r.seconds,0)/6)/10,target:day.expected,credited:day.credited,catchupCredit:day.catchupCredit,remaining:day.remaining,status:day.status},paper};
  });
  const weeks=Array.from({length:10},(_,i)=>{const ds=days.slice(i*7,i*7+7);return {week:i+1,startDate:ds[0].date,endDate:ds.at(-1).date,days:ds};});
  const scores=(await all(`SELECT s.* FROM platform_scores s WHERE s.student_id=?${student?' AND NOT EXISTS(SELECT 1 FROM platform_assessment_visibility v WHERE v.student_id=s.student_id AND v.assessment_id=s.assessment_id AND v.show_scores=0)':''} ORDER BY s.created_at DESC,s.id DESC`,id)).map(row=>scoreView(row,student));
  if(student)return {visible:true,today:today(),weeks,scores,unmappedPaperDays:papers.filter(row=>!days.some(d=>d.date===row.date)).map(row=>({date:row.date,correct:row.correct,total:row.total,percent:percent(row.correct,row.total),minutes:row.minutes}))};
  const assessments=await catalog(id,p),assessmentDates=Object.fromEntries(assessments.map(a=>[a.id,a.plannedDate]));
  assessmentDates['standards-5']??=days[27].date;
  const analyticsDays=new Map(days.map(day=>[day.date,day])),ruleMap=new Map(rules.map(rule=>[rule.date,rule.daily_target]));
  // Calendar moves do not erase work actually completed on its original date.
  for(const date of new Set([...attemptDates.keys(),...ruleMap.keys(),...paperMap.keys()])){
   if(analyticsDays.has(date))continue;const rows=attemptDates.get(date)??[],pp=paperMap.get(date);
   analyticsDays.set(date,{date,online:{answered:rows.length,correct:rows.filter(row=>row.is_correct).length,target:ruleMap.get(date)??20},paper:pp?{correct:pp.correct,total:pp.total}:null});
  }
  const readiness=buildReadiness({scores,days:[...analyticsDays.values()],today:today(),weeklyPolicy:'seven',standardsMax:39,startDate:p.startDate,assessmentDates});
  const latestTest=[...scores].sort((a,b)=>(b.takenOn??'').localeCompare(a.takenOn??'')||b.attempt-a.attempt||b.createdAt.localeCompare(a.createdAt))[0]??null;
  const overdue=scores.filter(s=>s.redoDue&&s.redoDue<today()&&!s.redoCompleted),redo=scores.filter(s=>s.redoDue&&!s.redoCompleted).sort((a,b)=>a.redoDue.localeCompare(b.redoDue))[0];
  const pp=papers.reduce((v,r)=>({recordedDays:v.recordedDays+1,correct:v.correct+r.correct,total:v.total+r.total}),{recordedDays:0,correct:0,total:0});pp.percent=percent(pp.correct,pp.total);
  const nextAction=redo?{text:`Correct the missed questions from ${redo.title}${redo.redoDue?` by ${redo.redoDue}`:''}.`,href:'/t/scores'}:schedule.backlog?.overdue>40?{text:'Use the next weekend for catch-up before adding new material.',href:'/t/gradebook'}:{text:'Record the paper practice, then check the next test.',href:'/t/gradebook'};
  const summary={latestTest,readiness:{label:readiness.label,status:readiness.status,percent:readiness.percent,missing:readiness.missing,benchmarks:readiness.benchmarks},nextAction,paper:pp,paperToday:days.find(d=>d.date===today())?.paper?{...days.find(d=>d.date===today()).paper,date:today(),optional:days.find(d=>d.date===today()).optionalPaper}:null,overdueRedos:overdue.length};
  const knownPractice=initialScore?{assessmentId:initialScore.assessmentId,score:initialScore.score,maxScore:initialScore.maxScore,takenOn:initialScore.takenOn??null,requiresImport:!scores.some(s=>s.assessmentId===initialScore.assessmentId)}:null;
  return {today:today(),settings:{showScores:await visible(id)},weeks,assessments,scores,readiness,summary,knownPractice,unmappedPaperDays:papers.filter(row=>!days.some(d=>d.date===row.date)).map(row=>({date:row.date,correct:row.correct,total:row.total,percent:percent(row.correct,row.total),minutes:row.minutes,note:row.note}))};
 }
 async function saveScore(user,data,sid,scoreId=null,{allowArchived=false}={}){
  const before=scoreId?await one('SELECT * FROM platform_scores WHERE id=? AND student_id=?',scoreId,sid):null;
  if(scoreId&&!before)fail(404,'That score was not found for this student.');
  const a=before?null:await one('SELECT * FROM platform_assessments WHERE id=?',data.assessmentId);
  if(!before&&!a)fail(404,'Choose a test from the catalog.');
  if(!before&&!a.active&&!allowArchived)fail(409,'This test is archived. Activate it before adding a score.');
  const max=before?.max_score??a.max_score;
  if('maxScore'in data&&data.maxScore!==max)fail(400,'The score total is fixed by this test version. Edit the test for a new attempt.');
  const score='score'in data?integer(data.score,0,max,'Score'):before?.score;if(score===undefined)fail(400,'Enter a score.');
  const takenOn='takenOn'in data?nullableDate(data.takenOn,'test date'):before?.taken_on??null;
  if(takenOn&&takenOn>today())fail(400,'A completed test cannot be dated in the future.');
  const missed=missedInput('missed'in data?data.missed:before?parse(before.missed,null):null,max,score),areas=parse(before?.areas_snapshot??a.areas,[]);
  const redoCompleted='redoCompleted'in data?data.redoCompleted:Boolean(before?.redo_completed);if(typeof redoCompleted!=='boolean')fail(400,'Correction completion must be on or off.');
  const redoDue='redoDue'in data?(nullableDate(data.redoDue,'correction due date')??(score<max&&takenOn?addDays(takenOn,2):null)):('takenOn'in data||!before)?score<max&&takenOn?addDays(takenOn,2):null:before.redo_due;
  if(redoDue&&takenOn&&redoDue<takenOn)fail(400,'Corrections cannot be due before the test.');
  const after={score,maxScore:max,takenOn,minutes:'minutes'in data?optionalMinutes(data.minutes):before?.minutes??null,missed,byArea:byArea(areas,missed),note:'note'in data?clean(data.note):before?.note??'',redoDue,redoCompleted,redoNote:'redoNote'in data?clean(data.redoNote):before?.redo_note??''};
  const id=scoreId??`score:${user.id}:${clean(data.requestId,100)}`;
  return write({user,data,operation:before?'score-edit':'score-add',studentId:sid,targetId:id,before:before?scoreView(before):null,after:{...after,assessmentId:before?.assessment_id??a.id},build:g=>{
   const statements=[];
   if(before)statements.push(stmt(`UPDATE platform_scores SET score=?,taken_on=?,minutes=?,missed=?,by_area=?,note=?,redo_due=?,redo_completed=?,redo_note=?,entered_by=?,updated_at=?,grade_revision=grade_revision+1 WHERE id=? AND student_id=? AND ${g.sql}`,score,takenOn,after.minutes,JSON.stringify(missed),JSON.stringify(after.byArea),after.note,redoDue,Number(redoCompleted),after.redoNote,user.id,iso(),id,sid,...g.args));
   else statements.push(stmt(`INSERT INTO platform_scores(id,student_id,assessment_id,attempt,taken_on,score,max_score,minutes,missed,by_area,note,redo_due,redo_completed,redo_note,title_snapshot,kind_snapshot,week_snapshot,band_policy,weight_snapshot,areas_snapshot,entered_by,created_at,updated_at) SELECT ?,?,?,COALESCE((SELECT MAX(attempt) FROM platform_scores WHERE student_id=? AND assessment_id=?),0)+1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${g.sql}`,id,sid,a.id,sid,a.id,takenOn,score,max,after.minutes,JSON.stringify(missed),JSON.stringify(after.byArea),after.note,redoDue,Number(redoCompleted),after.redoNote,a.title,a.kind,a.week,a.band_policy,a.weight,a.areas,user.id,iso(),iso(),...g.args));
   const kind=before?before.kind_snapshot:a.kind,week=before?before.week_snapshot:a.week,assessmentId=before?.assessment_id??a.id;
   if(kind==='weekly'&&max===21&&week&&assessmentId===`weekly-${week}`)statements.push(stmt(`INSERT INTO platform_weekly_checks(student_id,week,score,note) SELECT ?,?,s.score,s.note FROM platform_scores s WHERE s.student_id=? AND s.assessment_id=? AND ${g.sql} ORDER BY s.attempt DESC LIMIT 1 ON CONFLICT(student_id,week) DO UPDATE SET score=excluded.score,note=excluded.note`,sid,week,sid,before?.assessment_id??a.id,...g.args));
   return statements;
  }});
 }
 async function saveLegacyWeekly(user,sid,week,score,note){
  await initialize();const before=await one('SELECT * FROM platform_scores WHERE student_id=? AND assessment_id=? ORDER BY attempt DESC LIMIT 1',sid,`weekly-${week}`);
  // The old form edits the latest check, preserving its date and frozen version.
  // It must never manufacture a new retake when a modern score already exists.
  return saveScore(user,{requestId:crypto.randomUUID(),assessmentId:`weekly-${week}`,score,note,missed:null},sid,before?.id??null,{allowArchived:true});
 }
 async function handle(request,user){
  const url=new URL(request.url),path=url.pathname,method=request.method;
  const studentRoute=path==='/api/v2/student/gradebook';
  if(!studentRoute&&!/^\/api\/v2\/teacher\/(gradebook(?:\/settings)?|assessments(?:\/[^/]+(?:\/visibility)?)?|scores(?:\/[^/]+)?|paper-days)$/.test(path))return null;
  if(!user)fail(401,'Sign in first.');if(studentRoute&&user.role!=='student')fail(403,'Use a student account.');if(!studentRoute&&user.role!=='teacher')fail(403,'A teacher account is needed.');
  if(studentRoute){if(method!=='GET')fail(405,'Student grades are read only.');return json(await read(user.id,{student:true}));}
  await initialize();
  const data=['POST','PATCH','PUT'].includes(method)?await body(request):{},learner=await chooseStudent(user,url,data),sid=learner?.id;
  if(path==='/api/v2/teacher/assessments'&&method==='GET')return json({assessments:await catalog(sid)});
  let match=path.match(/^\/api\/v2\/teacher\/assessments(?:\/([^/]+))?$/);if(match?.[1])match[1]=decodeId(match[1]);
  if(match&&((method==='POST'&&!match[1])||(method==='PATCH'&&match[1]))){
   const before=match[1]?await one('SELECT * FROM platform_assessments WHERE id=?',match[1]):null;if(match[1]&&!before)fail(404,'That test was not found.');
   const kind=data.kind??before?.kind??'custom';if(!KINDS.includes(kind))fail(400,'Choose a valid test type.');
   if(before?.built_in&&kind!==before.kind)fail(400,'Built-in test types stay fixed; add a custom test instead.');
   const title=clean(data.title??before?.title,160);if(!title)fail(400,'Enter a test title.');
   const maxScore=integer(data.maxScore??before?.max_score,1,500,'Total');
   if(before?.built_in&&maxScore!==before.max_score)fail(400,'The syllabus test total stays fixed; add a new test version instead.');
   const week='week'in data?data.week===null||data.week===''?null:integer(data.week,1,10,'Week'):before?.week??null;
   if(before?.built_in&&week!==before.week)fail(400,'The syllabus test week stays fixed; change its planned date or add a test instead.');
   const plannedDate='plannedDate'in data?nullableDate(data.plannedDate,'planned date'):before?.planned_date??null,areas=areasInput(data.areas??parse(before?.areas,[]),maxScore),active='active'in data?data.active:Boolean(before?.active??true);
   if(typeof active!=='boolean')fail(400,'Test visibility must be on or off.');
   const id=before?.id??`assessment:${user.id}:${clean(data.requestId,100)}`,after={title,kind,week,plannedDate,maxScore,areas,active,weight:before?.weight??0};
   const result=await write({user,data,operation:before?'assessment-edit':'assessment-add',targetId:id,before:before?assessmentView(before):null,after,build:g=>before?[stmt(`UPDATE platform_assessments SET title=?,kind=?,week=?,planned_date=?,max_score=?,areas=?,active=?,band_policy=?,updated_at=? WHERE id=? AND ${g.sql}`,title,kind,week,plannedDate,maxScore,JSON.stringify(areas),Number(active),before.built_in?before.band_policy:JSON.stringify(policyFor(kind)),iso(),id,...g.args)]:[stmt(`INSERT INTO platform_assessments(id,title,kind,week,planned_date,max_score,areas,active,band_policy,created_by,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE ${g.sql}`,id,title,kind,week,plannedDate,maxScore,JSON.stringify(areas),Number(active),JSON.stringify(policyFor(kind)),user.id,iso(),iso(),...g.args)]});return json(result,before?200:201);
  }
  if(!sid){if(method==='GET'&&path==='/api/v2/teacher/gradebook')return json({student:null,today:today(),settings:{showScores:true},weeks:[],scores:[],assessments:await catalog(),readiness:null,summary:null,knownPractice:null});fail(409,'Create a student account first.');}
  const visibilityMatch=path.match(/^\/api\/v2\/teacher\/assessments\/([^/]+)\/visibility$/);
  if(visibilityMatch&&method==='PATCH'){
   if(typeof data.showScores!=='boolean')fail(400,'Score visibility must be on or off.');
   const assessmentId=decodeId(visibilityMatch[1]),assessment=await one('SELECT id FROM platform_assessments WHERE id=?',assessmentId);if(!assessment)fail(404,'That test was not found.');
   const previous=await one('SELECT show_scores FROM platform_assessment_visibility WHERE student_id=? AND assessment_id=?',sid,assessmentId);
   return json(await write({user,data,operation:'assessment-visibility',studentId:sid,targetId:`${sid}:${assessmentId}`,before:{assessmentId,showScores:previous?.show_scores!==0},after:{assessmentId,showScores:data.showScores},build:g=>[stmt(`INSERT INTO platform_assessment_visibility(student_id,assessment_id,show_scores,updated_by,updated_at) SELECT ?,?,?,?,? WHERE ${g.sql} ON CONFLICT(student_id,assessment_id) DO UPDATE SET show_scores=excluded.show_scores,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,sid,assessmentId,Number(data.showScores),user.id,iso(),...g.args)]}));
  }
  if(path==='/api/v2/teacher/gradebook'&&method==='GET')return json({student:learner,...await read(sid)});
  if(path==='/api/v2/teacher/scores'&&method==='GET'){await importInitial();return json({student:learner,scores:(await all('SELECT * FROM platform_scores WHERE student_id=? ORDER BY created_at DESC,id DESC',sid)).map(row=>scoreView(row)),assessments:await catalog(sid)});}
  match=path.match(/^\/api\/v2\/teacher\/scores(?:\/([^/]+))?$/);if(match?.[1])match[1]=decodeId(match[1]);
  if(match&&((method==='POST'&&!match[1])||(method==='PATCH'&&match[1])))return json(await saveScore(user,data,sid,match[1]??null),match[1]?200:201);
  if(path==='/api/v2/teacher/paper-days'&&method==='GET'){const result=await read(sid);const week=url.searchParams.get('week');if(week)integer(Number(week),1,10,'Week');return json({student:learner,weeks:week?result.weeks.filter(w=>w.week===Number(week)):result.weeks,days:result.weeks.filter(w=>!week||w.week===Number(week)).flatMap(w=>w.days),unmappedPaperDays:result.unmappedPaperDays});}
  if(path==='/api/v2/teacher/paper-days'&&method==='POST'){
   const date=nullableDate(data.date,'practice date');if(!date)fail(400,'Choose a practice date.');if(date>today())fail(400,'Completed practice cannot be dated in the future.');
   if(!await one('SELECT date FROM platform_paper_days WHERE student_id=? AND date=?',sid,date)&&!scheduledCourseDays(await program(sid)).some(d=>d.date===date))fail(400,'Choose a date in this student’s course.');
   const total=integer(data.total,1,500,'Total'),correct=integer(data.correct,0,total,'Correct answers'),minutes=optionalMinutes(data.minutes),note=clean(data.note),before=await one('SELECT * FROM platform_paper_days WHERE student_id=? AND date=?',sid,date),after={date,correct,total,minutes,note};
   return json(await write({user,data,operation:'paper-day-save',studentId:sid,targetId:`${sid}:${date}`,before,after,build:g=>[stmt(`INSERT INTO platform_paper_days(student_id,date,correct,total,minutes,note,entered_by,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,? WHERE ${g.sql} ON CONFLICT(student_id,date) DO UPDATE SET correct=excluded.correct,total=excluded.total,minutes=excluded.minutes,note=excluded.note,entered_by=excluded.entered_by,updated_at=excluded.updated_at`,sid,date,correct,total,minutes,note,user.id,iso(),iso(),...g.args)]}));
  }
  if(path==='/api/v2/teacher/gradebook/settings'&&method==='PATCH'){
   if(typeof data.showScores!=='boolean')fail(400,'Score visibility must be on or off.');
   return json(await write({user,data,operation:'score-visibility',studentId:sid,targetId:sid,before:{showScores:await visible(sid)},after:{showScores:data.showScores},build:g=>[stmt(`INSERT INTO platform_gradebook_settings(student_id,show_scores,updated_by,updated_at) SELECT ?,?,?,? WHERE ${g.sql} ON CONFLICT(student_id) DO UPDATE SET show_scores=excluded.show_scores,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,sid,Number(data.showScores),user.id,iso(),...g.args)]}));
  }
  return json({error:'Not found.'},404);
 }
 return {handle,read,catalog,visible,saveLegacyWeekly,initialize,ensureReady:initialize,summary:async(id,options)=>(await read(id,options)).summary};
}
