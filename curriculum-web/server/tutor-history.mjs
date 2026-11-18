import { SKILLS } from './plan.mjs';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const plain=value=>String(value??'').replace(/<math\b[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<\/math>/gi,'$1').replace(/<[^>]+>/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const clipped=(value,length)=>{const text=plain(value);return text.length>length?text.slice(0,length-1)+'…':text;};
const requestId=value=>{if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(value))fail(400,'Please try that help request again.');return value;};
const field=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.length>max)fail(400,`${label} is not valid.`);return value.trim();};
const sameConversation=(row,b)=>row.question_id===b.questionId&&row.message===b.studentMessage&&row.mode===b.mode&&row.part===b.part;
const conversationView=row=>({id:row.id,questionId:row.question_id,studentMessage:row.message,tutorReply:row.reply,mode:row.mode,part:row.part,assessment:row.assessment,source:row.source,createdAt:row.created_at});
const cursorEncode=row=>btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify([row.created_at,row.cursor_key])))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
function cursorDecode(value){
 if(!value)return null;
 try{if(typeof value!=='string'||value.length>500||!/^[A-Za-z0-9_-]+$/.test(value))throw 0;const [at,key]=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))));if(typeof at!=='string'||at.length>40||!/^\d{4}-\d\d-\d\d/.test(at)||typeof key!=='string'||key.length>200)throw 0;return {at,key};}catch{fail(400,'That history page could not be read. Open the first page again.');}
}

export function createTutorHistory({db,clock=()=>new Date(),testDocuments=null}){
 const st=(sql,...args)=>db.prepare(sql).bind(...args),one=(sql,...args)=>st(sql,...args).first(),all=async(sql,...args)=>(await st(sql,...args).all()).results,run=(sql,...args)=>st(sql,...args).run();
 const now=()=>new Date(clock()).toISOString();
 async function ownedQuestion(studentId,questionId){
  if(typeof questionId!=='string'||!questionId||questionId.length>100)fail(400,'Open a question before viewing its help.');
  const record=await one('SELECT id,student_id,skill,q FROM platform_questions WHERE id=? AND student_id=?',questionId,studentId);
  if(!record)fail(404,'That question was not found.');
  return {record,question:JSON.parse(record.q)};
 }
 function partFor(question,value,required=false){const part=value??0;if(!Number.isInteger(part)||part<0||part>(question.solution??[]).length||(required&&part<1))fail(400,'Choose one of this question’s worked steps.');return part;}
 async function recordHelp(studentId,b){
  const {question,record}=await ownedQuestion(studentId,b.questionId),id=requestId(b.requestId);
  const kind=b.kind==='worked-answer'?'answer':b.kind;
  if(!['hint','step','answer'].includes(kind))fail(400,'Choose a hint, step or worked answer.');
  const part=partFor(question,kind==='step'?(b.part??(Number.isInteger(b.stepIndex)?b.stepIndex+1:undefined)):0,kind==='step');
  const inserted=await run('INSERT OR IGNORE INTO platform_tutor_events(id,student_id,question_id,skill,kind,part,request_id,created_at) VALUES(?,?,?,?,?,?,?,?)',crypto.randomUUID(),studentId,record.id,record.skill,kind,part,id,now());
  const row=await one('SELECT * FROM platform_tutor_events WHERE student_id=? AND request_id=?',studentId,id);
  if(row.question_id!==record.id||row.kind!==kind||row.part!==part)fail(409,'This request was already used for different help.');
  return {ok:true,event:{id:row.id,kind:row.kind,part:row.part,createdAt:row.created_at},duplicate:!inserted.meta?.changes};
 }
 async function recordConversation(studentId,b){
  const {question,record}=await ownedQuestion(studentId,b.questionId);
  const input={...b,requestId:requestId(b.requestId),studentMessage:field(b.studentMessage,600,'The question'),tutorReply:field(b.tutorReply,1500,'The tutor reply'),part:partFor(question,b.part)};
  if(!['explain','check-reasoning'].includes(input.mode)||!['sound','needs_work','unclear'].includes(input.assessment)||!['ai','worked-help'].includes(input.source))fail(400,'That tutor message is not valid.');
  const inserted=await run('INSERT OR IGNORE INTO platform_tutor_conversations(id,student_id,question_id,skill,mode,part,message,reply,assessment,source,request_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',crypto.randomUUID(),studentId,record.id,record.skill,input.mode,input.part,input.studentMessage,input.tutorReply,input.assessment,input.source,input.requestId,now());
  const row=await one('SELECT * FROM platform_tutor_conversations WHERE student_id=? AND request_id=?',studentId,input.requestId);
  if(!sameConversation(row,input))fail(409,'This request was already used for a different tutor question.');
  return {...conversationView(row),duplicate:!inserted.meta?.changes};
 }
 async function getConversation(studentId,id){
  requestId(id);
  const row=await one('SELECT * FROM platform_tutor_conversations WHERE student_id=? AND request_id=?',studentId,id);
  return row?{...conversationView(row),requestId:row.request_id}:null;
 }
 async function questionHistory(studentId,questionId){
  await ownedQuestion(studentId,questionId);
  const rows=await all('SELECT * FROM platform_tutor_conversations WHERE student_id=? AND question_id=? ORDER BY created_at DESC,rowid DESC LIMIT 10',studentId,questionId);
  return {conversations:rows.reverse().map(conversationView)};
 }
 async function progress(studentId,skill=null){
  const rows=await all(`SELECT skill,COUNT(*) AS attempts,SUM(is_correct) AS correct,MAX(date) AS lastPracticed FROM platform_attempts WHERE student_id=?${skill?' AND skill=?':''} GROUP BY skill ORDER BY skill`,...[studentId,...(skill?[skill]:[])]);
  return rows.map(row=>({...row,name:SKILLS[row.skill]??row.skill,attempts:Number(row.attempts),correct:Number(row.correct),accuracy:Math.round(Number(row.correct)*100/Number(row.attempts))}));
 }
 async function mistakes(studentId,skill=null,limit=8){
  const rows=await all(`SELECT g.*,q.q FROM (SELECT skill,template_id AS templateId,COALESCE(mistake_label,'') AS code,COUNT(*) AS count,MAX(created_at) AS lastAt,MAX(question_id) AS sample FROM platform_attempts WHERE student_id=? AND is_correct=0${skill?' AND skill=?':''} GROUP BY skill,template_id,COALESCE(mistake_label,'') ORDER BY count DESC,lastAt DESC LIMIT ?) g LEFT JOIN platform_questions q ON q.id=g.sample`,...[studentId,...(skill?[skill]:[]),limit]);
  return rows.map(row=>{const q=row.q?JSON.parse(row.q):{},index=Number(row.code.split(':').at(-1));return {skill:row.skill,name:SKILLS[row.skill]??row.skill,templateId:row.templateId,label:row.code?(q.hints?.[index]?.text??'Answers to revisit; no matching mistake pattern.'):'Answers to revisit; no matching mistake pattern.',count:Number(row.count),lastAt:row.lastAt};});
 }
 async function helpSummary(studentId,skill=null){
  const filter=skill?' AND skill=?':'',args=[studentId,...(skill?[skill]:[])];
  const [counts,conversations]=await Promise.all([one(`SELECT COUNT(*) AS total,SUM(kind='hint') AS hint,SUM(kind='step') AS step,SUM(kind='answer') AS answer FROM platform_tutor_events WHERE student_id=?${filter}`,...args),one(`SELECT COUNT(*) AS n FROM platform_tutor_conversations WHERE student_id=?${filter}`,...args)]);
  return {hint:Number(counts.hint||0),step:Number(counts.step||0),answer:Number(counts.answer||0),total:Number(counts.total||0),conversations:Number(conversations.n)};
 }
 async function context(studentId,{questionId}){
  const {record}=await ownedQuestion(studentId,questionId),skill=record.skill;
  const [stats,recent,common,used,events,conversations,testProfile]=await Promise.all([
   progress(studentId,skill),
   all('SELECT question_text,given_answer,correct_answer,is_correct FROM platform_attempts WHERE student_id=? AND skill=? ORDER BY created_at DESC,rowid DESC LIMIT 6',studentId,skill),
   mistakes(studentId,skill,3),helpSummary(studentId,skill),
   all('SELECT kind,part FROM platform_tutor_events WHERE student_id=? AND skill=? ORDER BY created_at DESC,rowid DESC LIMIT 8',studentId,skill),
   all("SELECT c.message,c.reply,c.assessment,c.mode,c.part,json_extract(q.q,'$.plainPrompt') AS question FROM platform_tutor_conversations c JOIN platform_questions q ON q.id=c.question_id WHERE c.student_id=? AND c.skill=? ORDER BY c.created_at DESC,c.rowid DESC LIMIT 3",studentId,skill),
   testDocuments?.profile?testDocuments.profile(studentId,{skill,limit:3}).catch(()=>({visible:false,reviews:[]})):null
  ]);
  const metric=stats[0];
  const value={skill:{name:SKILLS[skill]??skill,answered:metric?.attempts??0,accuracy:metric?.accuracy??null,recentAccuracy:recent.length?Math.round(recent.filter(row=>row.is_correct).length*100/recent.length):null},recentAnswers:recent.map(row=>({question:clipped(row.question_text,90),given:clipped(row.given_answer,40),correctAnswer:clipped(row.correct_answer,40),correct:Boolean(row.is_correct)})),commonMistakes:common.map(row=>({description:clipped(row.label,100),count:row.count})),helpUsed:{hint:used.hint,step:used.step,answer:used.answer,recent:events.map(row=>({kind:row.kind,part:row.part}))},conversations:conversations.map(row=>({question:clipped(row.question,70),message:clipped(row.message,180),reply:clipped(row.reply,220),assessment:row.assessment,mode:row.mode,part:row.part}))};
  if(testProfile?.visible===true){
   value.testReviews=(Array.isArray(testProfile.reviews)?testProfile.reviews:[]).slice(0,3).map(review=>({
    source:'Teacher-shared test feedback',
    focus:(Array.isArray(review.focus)?review.focus:[]).filter(item=>item.skillId===skill).slice(0,1).map(item=>({reason:clipped(item.reason,90),nextStep:clipped(item.nextStep,130)})),
    questions:(Array.isArray(review.questions)?review.questions:[]).filter(item=>Array.isArray(item.skillIds)&&item.skillIds.includes(skill)&&['mistake','unclear'].includes(item.status)).slice(0,1).map(item=>({status:item.status,explanation:clipped(item.explanation,110),nextStep:clipped(item.nextStep,130)}))
   })).filter(review=>review.focus.length||review.questions.length);
   if(!value.testReviews.length)delete value.testReviews;
  }
  // Keep relevant history a small supplement to the code-computed current problem.
  // Prefer a few recent tutoring turns; trim old answers and repeated events first.
  while(JSON.stringify(value).length>2200){
   if(value.recentAnswers.length>2)value.recentAnswers.pop();
   else if(value.helpUsed.recent.length>3)value.helpUsed.recent.pop();
   else if(value.conversations.length>2)value.conversations.pop();
   else if(value.testReviews?.length>1)value.testReviews.pop();
   else if(value.commonMistakes.length>1)value.commonMistakes.pop();
   else if(value.recentAnswers.length)value.recentAnswers.pop();
   else if(value.conversations.length>1)value.conversations.pop();
   else if(value.testReviews?.length)value.testReviews.pop();
   else break;
  }
  return value;
 }
 async function teacherHistory(studentId,{skill=null,limit=30,cursor=null}={}){
  if(typeof studentId!=='string'||!studentId||studentId.length>100)fail(400,'Choose a student first.');
  const student=await one("SELECT id,name,username FROM practice_users WHERE id=? AND role='student'",studentId);
  if(!student)fail(404,'That student was not found.');
  if(skill&&!SKILLS[skill])fail(400,'Choose a skill from the course.');
  if(!Number.isInteger(limit)||limit<1||limit>100)fail(400,'Choose a history page size from 1 to 100.');
  const before=cursorDecode(cursor),filter=skill?' AND a.skill=?':'',filterHelp=skill?' AND h.skill=?':'',filterConversation=skill?' AND c.skill=?':'';
  const args=[studentId,...(skill?[skill]:[]),studentId,...(skill?[skill]:[]),studentId,...(skill?[skill]:[])];
  const rows=await all(`SELECT * FROM (
   SELECT 'answer:'||a.id AS cursor_key,a.created_at,json_object('type','answer','id',a.id,'questionId',a.question_id,'skill',a.skill,'questionText',a.question_text,'givenAnswer',a.given_answer,'correctAnswer',a.correct_answer,'correct',a.is_correct,'seconds',a.seconds,'source',a.source,'createdAt',a.created_at) AS payload FROM platform_attempts a WHERE a.student_id=?${filter}
   UNION ALL
   SELECT 'help:'||h.id,h.created_at,json_object('type','help','id',h.id,'questionId',h.question_id,'skill',h.skill,'questionText',COALESCE(json_extract(q.q,'$.plainPrompt'),json_extract(q.q,'$.prompt')),'kind',h.kind,'part',h.part,'createdAt',h.created_at) FROM platform_tutor_events h JOIN platform_questions q ON q.id=h.question_id WHERE h.student_id=?${filterHelp}
   UNION ALL
   SELECT 'conversation:'||c.id,c.created_at,json_object('type','conversation','id',c.id,'questionId',c.question_id,'skill',c.skill,'questionText',COALESCE(json_extract(q.q,'$.plainPrompt'),json_extract(q.q,'$.prompt')),'mode',c.mode,'part',c.part,'message',c.message,'reply',c.reply,'assessment',c.assessment,'source',c.source,'createdAt',c.created_at) FROM platform_tutor_conversations c JOIN platform_questions q ON q.id=c.question_id WHERE c.student_id=?${filterConversation}
  )${before?' WHERE created_at<? OR (created_at=? AND cursor_key<?)':''} ORDER BY created_at DESC,cursor_key DESC LIMIT ?`,...args,...(before?[before.at,before.at,before.key]:[]),limit+1);
  const more=rows.length>limit,page=rows.slice(0,limit),items=page.map(row=>{const item=JSON.parse(row.payload);item.questionText=plain(item.questionText);item.skillName=SKILLS[item.skill]??item.skill;if(item.type==='answer')item.correct=Boolean(item.correct);return item;});
  const [skillSummaries,usage,commonMistakes]=await Promise.all([progress(studentId,skill),helpSummary(studentId,skill),mistakes(studentId,skill)]);
  return {student,skills:Object.entries(SKILLS).map(([skill,name])=>({skill,name})),skillSummaries,helpSummary:usage,commonMistakes,items,pagination:{limit,nextCursor:more?cursorEncode(page.at(-1)):null,hasMore:more}};
 }
 async function body(request){if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Send JSON.');const raw=await request.text();if(raw.length>2000)fail(413,'That help request is too large.');try{const value=JSON.parse(raw);if(value&&typeof value==='object'&&!Array.isArray(value))return value;}catch{}fail(400,'That help request could not be read.');}
 async function handle(request,user){
  const url=new URL(request.url),path=url.pathname;
  if(!['/api/v2/student/help-event','/api/v2/student/tutor-history','/api/v2/teacher/tutor-history'].includes(path))return null;
  if(!user)fail(401,'Sign in first.');
  if(path.startsWith('/api/v2/teacher/')){
   if(user.role!=='teacher')fail(403,'A teacher account is needed.');
   if(request.method!=='GET')fail(405,'That action is not available.');
   return json(await teacherHistory(url.searchParams.get('studentId'),{skill:url.searchParams.get('skill'),limit:url.searchParams.has('limit')?Number(url.searchParams.get('limit')):30,cursor:url.searchParams.get('cursor')}));
  }
  if(user.role!=='student')fail(403,'Use a student account for learning.');
  if(path.endsWith('/help-event')&&request.method==='POST')return json(await recordHelp(user.id,await body(request)));
  if(path.endsWith('/tutor-history')&&request.method==='GET')return json(await questionHistory(user.id,url.searchParams.get('questionId')));
  fail(405,'That action is not available.');
 }
 return {recordHelp,recordConversation,getConversation,questionHistory,teacherHistory,context,handle};
}
