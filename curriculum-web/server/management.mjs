import { SKILLS, START_DATE, dayInfo, addDays, pacificDate, validDate } from './plan.mjs';
import { generateQuestion, publicQuestion, gradeQuestion } from './questions.mjs';

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const json = (value, status=200) => new Response(JSON.stringify(value), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const text = (value, limit=500) => typeof value === 'string' ? value.trim().slice(0,limit) : '';
const integer = (value,min,max,label) => { if (!Number.isInteger(value)||value<min||value>max) fail(400,`${label} is not valid.`); return value; };
const safeUser = u => u && ({id:u.id,name:u.name,username:u.username,role:u.role==='parent'?'teacher':u.role});
const plain = value => String(value??'').replace(/<math\b[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<\/math>/g,'$1').replace(/<[^>]+>/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const rightAnswer = q => q.choices ? plain(q.choices.find((_,i)=>gradeQuestion(q,`option-${i}`).correct)?.label??q.answer) : String(q.answer);
const skillList = Object.entries(SKILLS).map(([skill,name])=>({skill,name}));
const skillWeek = skill => { for(let i=0;i<70;i++) if(dayInfo(i).focus.includes(skill)) return Math.floor(i/7)+1; return 1; };
const skillName = skill => SKILLS[skill]||skill;
const accuracy = (correct,total) => total ? Math.round(correct/total*100) : null;

export function createManagement({db,clock=()=>new Date(),production=false,questionPool=null,platform=null}) {
  const stmt=(sql,...args)=>db.prepare(sql).bind(...args);
  const one=(sql,...args)=>stmt(sql,...args).first();
  const all=async(sql,...args)=>(await stmt(sql,...args).all()).results;
  const run=(sql,...args)=>stmt(sql,...args).run();
  const today=()=>pacificDate(clock());
  const iso=()=>new Date(clock()).toISOString();
  const students=async()=> (await all("SELECT id,name,username,role FROM practice_users WHERE role='student' ORDER BY created_at,id")).map(safeUser);
  const balance=async id=>Number((await one('SELECT COALESCE(SUM(amount),0) AS amount FROM practice_ledger WHERE student_id=?',id)).amount);
  async function body(request) {
    if(!request.headers.get('content-type')?.startsWith('application/json')) fail(415,'Send JSON.');
    const raw=await request.text(); if(raw.length>16384) fail(413,'That request is too large.');
    try {const data=JSON.parse(raw);if(!data||Array.isArray(data)||typeof data!=='object')throw new Error();return data;}catch{fail(400,'That request could not be read.');}
  }
  async function chooseStudent(user,url,data={}) {
    const id=user.role==='student'?user.id:(data.studentId||url.searchParams.get('studentId'));
    const result=id?await one("SELECT id,name,username,role FROM practice_users WHERE id=? AND role='student'",id):(await students())[0];
    if(id&&!result) fail(404,'That student was not found.');
    return safeUser(result);
  }
  async function program(id) {
    // Apply next-day settings through the same service as question selection.
    if(platform?.program) await platform.program(id);
    await run('INSERT OR IGNORE INTO platform_program(student_id,start_date) VALUES(?,?)',id,START_DATE);
    let row=await one('SELECT * FROM platform_program WHERE student_id=?',id);
    if(row.effective_date&&row.effective_date<=today()) {
      const p=JSON.parse(row.pending_settings||'{}');
      await run("UPDATE platform_program SET daily_target=?,bonus_first=?,bonus_step=?,pending_settings='{}',effective_date=NULL WHERE student_id=? AND effective_date=?",p.dailyTarget??row.daily_target,p.bonusFirst??row.bonus_first,p.bonusStep??row.bonus_step,id,row.effective_date);
      row=await one('SELECT * FROM platform_program WHERE student_id=?',id);
    }
    return {studentId:id,startDate:row.start_date,weekOffsets:JSON.parse(row.week_offsets||'[]'),dailyTarget:row.daily_target,bonusFirst:row.bonus_first,bonusStep:row.bonus_step,pendingSettings:JSON.parse(row.pending_settings||'{}'),effectiveDate:row.effective_date};
  }
  async function weeks(id) {
    const p=await program(id),date=today();
    return Array.from({length:10},(_,i)=>{
      const days=Array.from({length:7},(_,j)=>dayInfo(i*7+j,p.startDate));
      const offset=Number(p.weekOffsets[i]||0),startDate=addDays(days[0].date,offset),endDate=addDays(days[6].date,offset);
      const skills=[...new Set(days.flatMap(d=>d.focus))].map(skill=>({skill,name:skillName(skill)}));
      const topics=[...new Set([days[0].title,days[1].title])];
      return {week:i+1,topic:topics.join(' · '),startDate,endDate,status:date<startDate?'upcoming':date>endDate?'done':'current',skills};
    });
  }
  const attemptView=a=>({id:a.id,date:a.date,skill:a.skill,templateId:a.template_id,level:a.level,question:a.question_text,questionText:a.question_text,givenAnswer:a.given_answer,correctAnswer:a.correct_answer,correct:Boolean(a.is_correct),mistakeLabel:a.mistake_label,seconds:a.seconds,source:a.source,createdAt:a.created_at});
  async function detail(id) {
    const student=safeUser(await one("SELECT id,name,username,role FROM practice_users WHERE id=? AND role='student'",id));
    if(!student)fail(404,'That student was not found.');
    const p=await program(id),canonical=platform?.analytics?await platform.analytics(id):null,rows=canonical?.attempts??await all('SELECT * FROM platform_attempts WHERE student_id=? ORDER BY created_at,id',id);
    const ledger=await all('SELECT * FROM practice_ledger WHERE student_id=? ORDER BY created_at,id',id);
    const byDate=new Map();
    for(const a of rows){if(!byDate.has(a.date))byDate.set(a.date,{date:a.date,answered:0,correct:0,seconds:0});const d=byDate.get(a.date);d.answered++;d.correct+=a.is_correct?1:0;d.seconds+=a.seconds;}
    const days=[...byDate.values()].map(d=>({...d,accuracy:accuracy(d.correct,d.answered),minutes:Math.round(d.seconds/60*10)/10,points:ledger.filter(l=>pacificDate(l.created_at)===d.date&&l.amount>0&&l.kind==='bonus').reduce((s,l)=>s+l.amount,0),target:canonical?.days.find(x=>x.date===d.date)?.target??20,status:d.answered>=(canonical?.days.find(x=>x.date===d.date)?.target??20)?'done':'partial'})).sort((a,b)=>b.date.localeCompare(a.date));
    const completed=new Set(days.filter(d=>d.status==='done').map(d=>d.date));
    let bestStreak=0,chain=0,previous=null;
    for(const d of [...completed].sort()){chain=previous&&addDays(previous,1)===d?chain+1:1;bestStreak=Math.max(bestStreak,chain);previous=d;}
    let streak=0,cursor=completed.has(today())?today():addDays(today(),-1);while(completed.has(cursor)){streak++;cursor=addDays(cursor,-1);} if(canonical){streak=canonical.streak;bestStreak=canonical.bestStreak;}
    const skills=canonical?.skills??skillList.map(({skill,name})=>{
      const attempts=rows.filter(a=>a.skill===skill),last=attempts.slice(-10),correct=last.filter(a=>a.is_correct).length,percent=accuracy(correct,last.length);
      const distinct=new Set(attempts.filter(a=>a.is_correct).map(a=>a.date)).size;
      let level=!attempts.length?'Not started':attempts.length<5||percent<60?'Learning':attempts.length>=10&&percent>=85&&distinct>=2?'Mastered':'Practicing';
      return {skill,name,week:skillWeek(skill),attempts:attempts.length,accuracy:percent,correct:last.filter(a=>a.is_correct).length,last10:last.length,level,lastPracticed:attempts.at(-1)?.date??null};
    });
    const mistakes=new Map();for(const a of rows)if(!a.is_correct&&a.mistake_label){const key=`${a.skill}|${a.mistake_label}`;if(!mistakes.has(key))mistakes.set(key,{skill:a.skill,name:skillName(a.skill),label:JSON.parse(a.result||'{}').hint||a.mistake_label,count:0,examples:[]});const m=mistakes.get(key);m.count++;if(m.examples.length<3)m.examples.push(attemptView(a));}
    return {student,program:p,summary:{answered:rows.length,correct:rows.filter(a=>a.is_correct).length,accuracy:accuracy(rows.filter(a=>a.is_correct).length,rows.length),streak,bestStreak},days,skills,mistakes:[...mistakes.values()].filter(m=>m.count>=2).sort((a,b)=>b.count-a.count),attempts:rows.map(attemptView).reverse(),checks:await all('SELECT week,score,note FROM platform_weekly_checks WHERE student_id=? ORDER BY week',id)};
  }
  async function rewards(id) {
    const prizes=(await all('SELECT p.*,COALESCE(n.note,\'\') AS note FROM practice_prizes p LEFT JOIN platform_prize_notes n ON n.prize_id=p.id ORDER BY p.cost,p.created_at')).map(p=>({id:p.id,name:p.name,cost:p.cost,note:p.note,active:Boolean(p.active)}));
    if(!id)return {points:0,nextPoint:{answered:0,target:35,remaining:35},prizes,requests:[],history:[]};
    const p=await program(id),answered=Number((await one('SELECT COUNT(*) AS n FROM platform_attempts WHERE student_id=? AND date=?',id,today())).n);
    const first=p.dailyTarget+p.bonusFirst,target=answered<first?first:first+(Math.floor((answered-first)/p.bonusStep)+1)*p.bonusStep;
    return {points:await balance(id),nextPoint:{answered,target,remaining:target-answered},prizes,
      requests:(await all('SELECT * FROM practice_requests WHERE student_id=? ORDER BY created_at DESC',id)).map(r=>({id:r.id,prizeId:r.prize_id,name:r.prize_name,cost:r.cost,status:r.status==='pending'?'requested':r.status,createdAt:r.created_at,reviewedAt:r.reviewed_at})),
      history:(await all('SELECT * FROM practice_ledger WHERE student_id=? ORDER BY created_at DESC,id DESC',id)).map(l=>({id:l.id,amount:l.amount,kind:l.kind,note:l.note,createdAt:l.created_at}))};
  }
  async function dashboard(learner) {
    if(!learner)return {student:null,today:today(),week:null,days:[],attention:[],weakSkills:[],saturdayPrep:null,points:0,earnedThisWeek:0,requests:[]};
    const d=await detail(learner.id),ws=await weeks(learner.id),week=ws.find(w=>w.status==='current')||ws.find(w=>w.status==='upcoming')||ws.at(-1);
    const recent=d.attempts.filter(a=>a.date>=week.startDate&&a.date<=week.endDate);
    const weakSkills=skillList.map(({skill,name})=>{const a=recent.filter(a=>a.skill===skill),correct=a.filter(a=>a.correct).length;return {skill,name,attempts:a.length,correct,accuracy:accuracy(correct,a.length)};}).filter(s=>s.attempts>=5).sort((a,b)=>a.accuracy-b.accuracy).slice(0,5);
    const reward=await rewards(learner.id),requests=reward.requests.filter(r=>['requested','approved'].includes(r.status));
    const days=Array.from({length:7},(_,i)=>{const date=addDays(week.startDate,i);return d.days.find(d=>d.date===date)||{date,answered:0,correct:0,accuracy:null,minutes:0,points:0,status:date>today()?'upcoming':date===today()?'today':'missed'};});
    const attention=[];
    const lowCheck=d.checks.filter(c=>c.score<12).at(-1);
    if(lowCheck)attention.push({text:`Week ${lowCheck.week} paper check: ${lowCheck.score} of 21. Re-teach before new content.`,href:'/t/checks'});
    if(weakSkills[0]?.accuracy<60){const s=weakSkills[0];attention.push({text:`${s.name}: ${s.correct} of ${s.attempts} right this week. Re-teach Saturday.`,href:`/t/students/${learner.id}?section=skills&skill=${encodeURIComponent(s.skill)}`});}
    const missed=days.filter(d=>d.status==='missed').at(-1);if(missed)attention.push({text:`No practice on ${missed.date}.`,href:`/t/students/${learner.id}?section=days&date=${missed.date}`});
    if(requests.length)attention.push({text:`Prize request: ${requests[0].name}, ${requests[0].cost} points.`,href:'/t/rewards'});
    const next=ws.find(w=>w.startDate>today())||week;
    return {student:learner,today:today(),week,days,attention:attention.slice(0,3),weakSkills,saturdayPrep:{topic:next.topic,suggestion:weakSkills[0]?`Start with ${weakSkills[0].name.toLowerCase()}; review the recorded answers together.`:'Review the week’s practice before introducing the next skills.'},points:reward.points,earnedThisWeek:reward.history.filter(l=>l.kind==='bonus'&&pacificDate(l.createdAt)>=week.startDate&&pacificDate(l.createdAt)<=week.endDate).reduce((n,l)=>n+l.amount,0),requests};
  }
  async function questionBank(skill) {
    if(skill&&!SKILLS[skill])fail(400,'Choose a skill from the course.');
    const flags=await all('SELECT id,template_id AS templateId,reason,created_by AS createdBy,resolved_at AS resolvedAt,created_at AS createdAt FROM platform_flags ORDER BY created_at DESC');
    const servedCounts=await all('SELECT skill,COUNT(*) AS count FROM platform_questions GROUP BY skill');
    const questions=[];
    if(skill){
      if(production&&!questionPool)fail(503,'The checked question bank is not ready.');
      const identities=new Set();
      for(let i=0;i<10;i++){
        const level=i%3+1,pool=questionPool?.skills?.[skill]?.[String(level)];
        if(questionPool&&!pool?.length)fail(503,'This skill needs its checked question bank.');
        let q;
        for(let n=0;n<200;n++){q=generateQuestion(skill,pool?pool[(i*13+n)%pool.length]:`teacher-bank:${skill}:${i}:${n}`,{difficulty:level});if(!identities.has(q.plainPrompt)){identities.add(q.plainPrompt);break;}}
        questions.push({...publicQuestion(q),answer:rightAnswer(q),solution:q.solution,hint:q.hint,templateId:`${skill}:${q.shape}`,level,flagged:flags.some(f=>f.templateId===`${skill}:${q.shape}`&&!f.resolvedAt)});
      }
    }
    return {skills:skillList,skill,questions,flags,servedCounts};
  }
  async function handle(request,user) {
    const url=new URL(request.url),path=url.pathname,method=request.method;
    const studentRewards=path==='/api/v2/student/rewards'||/^\/api\/v2\/student\/rewards\/[^/]+\/request$/.test(path);
    if(!path.startsWith('/api/v2/teacher/')&&!studentRewards)return null;
    if(!user)fail(401,'Sign in first.');
    if(path.startsWith('/api/v2/teacher/')&&user.role!=='teacher')fail(403,'A teacher account is needed.');
    if(studentRewards&&user.role!=='student')fail(403,'Use the student account for rewards.');
    const data=['POST','PATCH','PUT'].includes(method)?await body(request):{};
    const learner=await chooseStudent(user,url,data);
    const requireStudent=()=>{if(!learner)fail(409,'Create a student account first.');return learner.id;};
    if(path==='/api/v2/teacher/students'&&method==='GET')return json({students:await students()});
    if(path==='/api/v2/teacher/dashboard'&&method==='GET')return json(await dashboard(learner));
    let match=path.match(/^\/api\/v2\/teacher\/students\/([^/]+)$/);
    if(match&&method==='GET'){const result=await detail(match[1]),date=url.searchParams.get('date'),skill=url.searchParams.get('skill');if(date){if(!validDate(date))fail(400,'Choose a valid date.');result.attempts=result.attempts.filter(a=>a.date===date);}if(skill)result.attempts=result.attempts.filter(a=>a.skill===skill);return json(result);}
    if(path==='/api/v2/teacher/plan'&&method==='GET')return json({student:learner,weeks:learner?await weeks(learner.id):[],program:learner?await program(learner.id):null});
    if(path==='/api/v2/teacher/plan'&&method==='POST'){
      const id=requireStudent(),week=integer(data.week,1,10,'Week'),days=integer(data.days??7,1,28,'Delay');
      const p=await program(id),offsets=Array.from({length:10},(_,i)=>Number(p.weekOffsets[i]||0)+(i>=week-1?days:0));
      await run('UPDATE platform_program SET week_offsets=? WHERE student_id=?',JSON.stringify(offsets),id);
      return json({ok:true,weeks:await weeks(id)});
    }
    if(path==='/api/v2/teacher/checks'&&method==='GET')return json({student:learner,checks:learner?await all('SELECT week,score,note FROM platform_weekly_checks WHERE student_id=? ORDER BY week',learner.id):[],weeks:learner?await weeks(learner.id):[]});
    if(path==='/api/v2/teacher/checks'&&method==='POST'){
      const id=requireStudent(),week=integer(data.week,1,10,'Week'),score=integer(data.score,0,21,'Score');
      await run('INSERT INTO platform_weekly_checks(student_id,week,score,note) VALUES(?,?,?,?) ON CONFLICT(student_id,week) DO UPDATE SET score=excluded.score,note=excluded.note',id,week,score,text(data.note,1000));return json({ok:true});
    }
    if(path==='/api/v2/teacher/notes'&&method==='GET')return json({student:learner,notes:learner?await all('SELECT week,text FROM platform_teacher_notes WHERE student_id=? ORDER BY week',learner.id):[]});
    if(path==='/api/v2/teacher/notes'&&method==='POST'){
      const id=requireStudent(),week=integer(data.week,1,10,'Week');
      await run('INSERT INTO platform_teacher_notes(student_id,week,text) VALUES(?,?,?) ON CONFLICT(student_id,week) DO UPDATE SET text=excluded.text',id,week,text(data.text,2000));return json({ok:true});
    }
    if(path==='/api/v2/teacher/assignments'&&method==='GET')return json({student:learner,assignments:learner?(await all('SELECT * FROM platform_assignments WHERE student_id=? ORDER BY start_date DESC,created_at DESC',learner.id)).map(a=>({id:a.id,skill:a.skill,name:skillName(a.skill),count:a.count,startDate:a.start_date,endDate:a.end_date,createdAt:a.created_at})):[],skills:skillList});
    if(path==='/api/v2/teacher/assignments'&&method==='POST'){
      const id=requireStudent(),count=integer(data.count,1,100,'Question count');if(!SKILLS[data.skill])fail(400,'Choose a skill from the course.');
      if(!validDate(data.startDate)||!validDate(data.endDate)||data.endDate<data.startDate)fail(400,'Choose a valid date range.');
      const assignmentId=crypto.randomUUID();await run('INSERT INTO platform_assignments(id,student_id,skill,count,start_date,end_date,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)',assignmentId,id,data.skill,count,data.startDate,data.endDate,user.id,iso());return json({ok:true,id:assignmentId},201);
    }
    match=path.match(/^\/api\/v2\/teacher\/assignments\/([^/]+)$/);
    if(match&&method==='DELETE'){const id=requireStudent();await run('DELETE FROM platform_assignments WHERE id=? AND student_id=?',match[1],id);return json({ok:true});}
    if((path==='/api/v2/teacher/rewards'||path==='/api/v2/student/rewards')&&method==='GET')return json({student:learner,...await rewards(learner?.id)});
    match=path.match(/^\/api\/v2\/student\/rewards\/([^/]+)\/request$/);
    if(match&&method==='POST'){
      const id=requireStudent(),prize=await one('SELECT * FROM practice_prizes WHERE id=? AND active=1',match[1]);
      if(!prize)fail(404,'That prize was not found.');if(await balance(id)<prize.cost)fail(409,'You need more points for this prize.');
      await run("INSERT OR IGNORE INTO practice_requests(id,student_id,prize_id,prize_name,cost,status,created_at) VALUES(?,?,?,?,?,'requested',?)",crypto.randomUUID(),id,prize.id,prize.name,prize.cost,iso());return json({ok:true});
    }
    if(path==='/api/v2/teacher/prizes'&&method==='POST'){
      const name=text(data.name,80),cost=integer(data.cost,1,100000,'Point cost');if(!name)fail(400,'Enter a prize name.');const id=crypto.randomUUID();
      await db.batch([stmt('INSERT INTO practice_prizes(id,name,cost,created_at) VALUES(?,?,?,?)',id,name,cost,iso()),stmt('INSERT INTO platform_prize_notes(prize_id,note) VALUES(?,?)',id,text(data.note,500))]);return json({prize:{id,name,cost,note:text(data.note,500),active:true}},201);
    }
    match=path.match(/^\/api\/v2\/teacher\/prizes\/([^/]+)$/);
    if(match&&method==='PATCH'){
      const prize=await one('SELECT * FROM practice_prizes WHERE id=?',match[1]);if(!prize)fail(404,'That prize was not found.');
      const name='name'in data?text(data.name,80):prize.name,cost='cost'in data?integer(data.cost,1,100000,'Point cost'):prize.cost;if(!name)fail(400,'Enter a prize name.');if('active'in data&&typeof data.active!=='boolean')fail(400,'Prize visibility must be on or off.');
      const statements=[stmt('UPDATE practice_prizes SET name=?,cost=?,active=? WHERE id=?',name,cost,'active'in data?Number(data.active):prize.active,prize.id)];
      if('note'in data)statements.push(stmt('INSERT INTO platform_prize_notes(prize_id,note) VALUES(?,?) ON CONFLICT(prize_id) DO UPDATE SET note=excluded.note',prize.id,text(data.note,500)));
      await db.batch(statements);return json({ok:true});
    }
    match=path.match(/^\/api\/v2\/teacher\/requests\/([^/]+)$/);
    if(match&&method==='POST'){
      const r=await one('SELECT * FROM practice_requests WHERE id=?',match[1]);if(!r)fail(404,'That request was not found.');
      if(data.studentId&&r.student_id!==data.studentId)fail(404,'That request was not found for this student.');
      if(!['approve','decline','given'].includes(data.action))fail(400,'Choose approve, decline or given.');
      if(data.action==='approve')await run("UPDATE practice_requests SET status='approved',reviewed_at=? WHERE id=? AND status IN ('requested','pending')",iso(),r.id);
      else if(data.action==='decline')await run("UPDATE practice_requests SET status='declined',reviewed_at=? WHERE id=? AND status IN ('requested','pending','approved')",iso(),r.id);
      else {
        if(r.status==='given')return json({ok:true});if(r.status!=='approved')fail(409,'Approve this request before marking it given.');
        const ledgerId=`prize:${r.id}`;
        await db.batch([stmt("INSERT OR IGNORE INTO practice_ledger(id,student_id,amount,kind,note,created_at) SELECT ?,?,?,'prize',?,? WHERE EXISTS(SELECT 1 FROM practice_requests WHERE id=? AND status='approved') AND (SELECT COALESCE(SUM(amount),0) FROM practice_ledger WHERE student_id=?)>=?",ledgerId,r.student_id,-r.cost,r.prize_name,iso(),r.id,r.student_id,r.cost),stmt("UPDATE practice_requests SET status='given',reviewed_at=? WHERE id=? AND EXISTS(SELECT 1 FROM practice_ledger WHERE id=?)",iso(),r.id,ledgerId)]);
        if(!(await one('SELECT id FROM practice_ledger WHERE id=?',ledgerId)))fail(409,'There are not enough points for this prize.');
      }
      return json({ok:true});
    }
    if(path==='/api/v2/teacher/points'&&method==='POST'){
      const id=requireStudent(),amount=integer(data.amount,-100000,100000,'Points'),note=text(data.note,500),requestId=text(data.requestId,100);
      if(!amount||!note)fail(400,'Enter a nonzero amount and a reason.');if(!/^[A-Za-z0-9_-]{8,100}$/.test(requestId))fail(400,'The change needs a request ID.');
      const ledgerId=`adjustment:${requestId}`,existing=await one('SELECT * FROM practice_ledger WHERE id=?',ledgerId);
      if(existing&&(existing.student_id!==id||existing.amount!==amount||existing.note!==note))fail(409,'That request ID already belongs to another change.');
      await run("INSERT OR IGNORE INTO practice_ledger(id,student_id,amount,kind,note,created_at) SELECT ?,?,?,'adjustment',?,? WHERE (SELECT COALESCE(SUM(amount),0) FROM practice_ledger WHERE student_id=?)+?>=0",ledgerId,id,amount,note,iso(),id,amount);
      const saved=await one('SELECT * FROM practice_ledger WHERE id=?',ledgerId);if(!saved)fail(409,'Points cannot go below zero.');if(saved.student_id!==id||saved.amount!==amount||saved.note!==note)fail(409,'That request ID already belongs to another change.');return json({ok:true});
    }
    if(path==='/api/v2/teacher/questions'&&method==='GET')return json(await questionBank(url.searchParams.get('skill')));
    if(path==='/api/v2/teacher/flags'&&method==='POST'){
      const templateId=text(data.templateId,100),reason=text(data.reason,1000),split=templateId.split(':');
      if(split.length!==2||!SKILLS[split[0]]||!split[1])fail(400,'Choose a valid question template.');if(!reason)fail(400,'Describe the problem.');
      const id=crypto.randomUUID();await run('INSERT INTO platform_flags(id,template_id,reason,created_by,created_at) VALUES(?,?,?,?,?)',id,templateId,reason,user.id,iso());return json({ok:true,id},201);
    }
    match=path.match(/^\/api\/v2\/teacher\/flags\/([^/]+)$/);
    if(match&&method==='PATCH'){
      if(data.resolved!==true)fail(400,'Mark the flag resolved after checking the fix.');
      await run('UPDATE platform_flags SET resolved_at=? WHERE id=? AND resolved_at IS NULL',iso(),match[1]);return json({ok:true});
    }
    if(path==='/api/v2/teacher/settings'&&method==='GET'){
      const p=learner?await program(learner.id):null;return json({student:learner,accounts:(await all('SELECT id,name,username,role FROM practice_users ORDER BY created_at,id')).map(safeUser),program:p,pendingSettings:p?.pendingSettings||{},effectiveDate:p?.effectiveDate||null});
    }
    if(path==='/api/v2/teacher/settings'&&method==='PATCH'){
      const id=requireStudent(),p=await program(id),pending={...p.pendingSettings};
      for(const [key,min,max]of[['dailyTarget',1,100],['bonusFirst',1,100],['bonusStep',1,100]])if(key in data)pending[key]=integer(data[key],min,max,key);
      const effectiveDate=addDays(today(),1);await run('UPDATE platform_program SET pending_settings=?,effective_date=? WHERE student_id=?',JSON.stringify(pending),effectiveDate,id);return json({ok:true,effectiveDate,pendingSettings:pending});
    }
    return json({error:'Not found.'},404);
  }
  return {handle,program,weeks,detail,rewards,dashboard};
}
