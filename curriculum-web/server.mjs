import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gradeAnswer } from './server/grading.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const arg = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = Number(arg('--port') || process.env.PORT || 3000);
const host = arg('--host') || process.env.HOST || '127.0.0.1';
const production = process.env.NODE_ENV === 'production';
const databasePath = process.env.DATABASE_PATH || path.join(root, 'private', 'progress.sqlite');
fs.mkdirSync(path.dirname(databasePath), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(databasePath);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('teacher','student')), password TEXT NOT NULL, teacher_id TEXT REFERENCES users(id), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS snapshots(id TEXT PRIMARY KEY,version TEXT NOT NULL,question TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY,submission_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),question_id TEXT NOT NULL REFERENCES snapshots(id),version TEXT NOT NULL,response TEXT NOT NULL,explanation TEXT NOT NULL DEFAULT '',status TEXT NOT NULL,feedback TEXT NOT NULL,result TEXT NOT NULL,hints INTEGER NOT NULL DEFAULT 0,solution_viewed INTEGER NOT NULL DEFAULT 0,active_seconds INTEGER NOT NULL DEFAULT 0,origin TEXT NOT NULL DEFAULT 'online',created_at TEXT NOT NULL,UNIQUE(user_id,submission_id));
CREATE INDEX IF NOT EXISTS attempts_user_question ON attempts(user_id,question_id,created_at);
CREATE TABLE IF NOT EXISTS drafts(user_id TEXT NOT NULL REFERENCES users(id),question_id TEXT NOT NULL REFERENCES snapshots(id),response TEXT NOT NULL,explanation TEXT NOT NULL,scratch TEXT NOT NULL,revision INTEGER NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,question_id));
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),question_id TEXT NOT NULL REFERENCES snapshots(id),type TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY,attempt_id TEXT NOT NULL REFERENCES attempts(id),teacher_id TEXT NOT NULL REFERENCES users(id),approved INTEGER NOT NULL,feedback TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS assignments(student_id TEXT NOT NULL REFERENCES users(id),day_id TEXT NOT NULL,data TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(student_id,day_id));
CREATE TABLE IF NOT EXISTS settings(teacher_id TEXT PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS extra_assignments(student_id TEXT NOT NULL REFERENCES users(id),question_id TEXT NOT NULL REFERENCES snapshots(id),assigned_at TEXT NOT NULL,note TEXT NOT NULL,PRIMARY KEY(student_id,question_id));
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL);
`);
try { fs.chmodSync(databasePath, 0o600); } catch {}
const now = () => new Date().toISOString();
const j = (s, fallback = null) => { try { return JSON.parse(s); } catch { return fallback; } };
const hash = s => createHash('sha256').update(s).digest('hex');
function passwordHash(password) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
function passwordMatches(password, encoded) { const [salt, expected] = encoded.split(':'); const actual = scryptSync(password, salt, 64); const b = Buffer.from(expected, 'hex'); return b.length === actual.length && timingSafeEqual(b, actual); }
function publicUser(user) { return user ? { id: user.id, username: user.username, displayName: user.name, role: user.role } : null; }
function audit(actor, action, detail) { db.prepare('INSERT INTO audit VALUES(?,?,?,?,?)').run(randomUUID(), actor, action, JSON.stringify(detail), now()); }
function createUser(username, password, displayName, role, teacherId = null) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) fail(400, 'Use a username of 3–40 letters, numbers, dots, dashes, or underscores.');
  if (typeof password !== 'string' || password.length < 3 || password.length > 256) fail(400, 'Use a password with at least 3 characters.');
  if (typeof displayName !== 'string' || displayName.trim().length < 1 || displayName.length > 60) fail(400, 'Choose a display name of 1–60 characters.');
  const id = randomUUID();
  try { db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)').run(id, username.toLowerCase(), displayName.trim(), role, passwordHash(password), teacherId, now()); }
  catch(e) { if (String(e).includes('UNIQUE')) fail(409, 'That username is already in use.'); throw e; }
  return db.prepare('SELECT * FROM users WHERE id=?').get(id);
}
if (process.argv.includes('--create-teacher')) {
  try {
    const u = createUser(process.env.TEACHER_USERNAME, process.env.TEACHER_PASSWORD, process.env.TEACHER_NAME || 'Teacher', 'teacher');
    console.log(`Teacher account created: ${u.username}. Start the server, then sign in to create student accounts.`);
    db.close(); process.exit(0);
  } catch (e) { console.error(e.message); db.close(); process.exit(1); }
}

let course = { version: 'awaiting-import', days: [], weeks: [], extraPractice: [] };
let courseMtime = 0;
let questions = new Map();
let questionDays = new Map();
let optionalIds = new Set();
const curriculumPath = process.env.CURRICULUM_PATH || path.join(root, 'data', 'curriculum.json');
function loadCourse() {
  if (!fs.existsSync(curriculumPath)) return;
  const mtime = fs.statSync(curriculumPath).mtimeMs;
  if (mtime === courseMtime) return;
  const next = JSON.parse(fs.readFileSync(curriculumPath, 'utf8'));
  if (!Array.isArray(next.days) || typeof next.version !== 'string') throw Error('Invalid curriculum snapshot');
  const nextQuestions = new Map(), nextDays = new Map(),nextOptional=new Set();
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const d of next.days) for (const q of d.questions || []) { nextQuestions.set(q.id, q); nextDays.set(q.id, d); }
    for (const q of next.extraPractice || []) nextQuestions.set(q.id, q);
    for (const q of next.optionalQuestions || []) {nextQuestions.set(q.id, q);nextOptional.add(q.id);}
    for (const d of next.days) for(const activity of d.optionalActivities||[])for(const q of activity.questions||[]){nextQuestions.set(q.id,q);nextOptional.add(q.id);nextDays.set(q.id,d);}
    const insert = db.prepare('INSERT OR IGNORE INTO snapshots VALUES(?,?,?)');
    for (const q of nextQuestions.values()) {
      const existing = db.prepare('SELECT question FROM snapshots WHERE id=?').get(q.id);
      if (existing && JSON.stringify(JSON.parse(existing.question)) !== JSON.stringify(q)) throw Error(`Question ${q.id} changed without a new stable ID; import a new version.`);
      insert.run(q.id, next.version, JSON.stringify(q));
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  course = next; questions = nextQuestions; questionDays = nextDays; optionalIds=nextOptional;courseMtime = mtime;
}
loadCourse();
function fail(status, message, details) { const error = new Error(message); error.status = status; error.details = details; throw error; }
function allowedQuestion(q) {
  const keys = ['id','logicalId','sourceId','prompt','skill','type','challenge','reference','topic','week','day','dayId','number','section','diagram','visual','input','units','requiredFormat','minimumWeek','availableAfterDay','family','tags','rubric','origin'];
  const out = Object.fromEntries(keys.filter(k => q[k] !== undefined).map(k => [k, q[k]]));
  if (Array.isArray(q.reviewParts)) out.reviewParts=q.reviewParts.map((p,i)=>({id:p.id||String(i+1),label:p.label,prompt:p.prompt}));
  if (Array.isArray(q.parts)) out.parts = q.parts.map((p, i) => ({ id:p.id || String(i+1), prompt:p.prompt || p.label || `Part ${i+1}`,type:p.type || 'text' }));
  return out;
}
function publicDay(d, includeQuestions = false) {
  const keys = ['id','day','week','dayIndex','dayName','weekday','title','requiredCount','challengeCount','packet','booster','topic','objectives','recap','workedExamples','estimatedMinutes'];
  const out = Object.fromEntries(keys.filter(k => d[k] !== undefined).map(k => [k, d[k]]));
  if (d.lesson) out.lesson = Object.fromEntries(['session','kind','objective','recap','examples','teachingSequence','timing'].filter(k=>d.lesson[k]!==undefined).map(k=>[k,d.lesson[k]]));
  if (includeQuestions) out.questions = (d.questions || []).map(allowedQuestion);
  return out;
}
function publicCourse() {
  return { version:course.version, sourceCommit:course.sourceCommit, title:course.title, description:course.description, requirements:course.requirements, coverage:course.coverage, days:course.days.map(d => publicDay(d)), weeks:(course.weeks || []).map(w => ({id:w.id,week:w.week,title:w.title,subtitle:w.subtitle,topic:w.topic,objectives:w.objectives,dayIds:w.dayIds,requiredCount:w.requiredCount,challengeCount:w.challengeCount,skills:w.skills})), counts:{weeks:course.weeks?.length || 0,days:course.days.length,required:course.days.reduce((n,d)=>n+(d.questions?.length || 0),0),challenges:course.days.reduce((n,d)=>n+(d.questions?.filter(q=>q.challenge).length || 0),0),extraPractice:course.extraPractice?.length || 0} };
}
const defaultSettings = { startDate:'',timezone:'America/Los_Angeles',releaseSolutions:false,masteryMinQuestions:5,masteryThreshold:0.8 };
function settingsFor(user) {
  const teacherId = user?.role === 'teacher' ? user.id : user?.teacher_id;
  return { ...defaultSettings, ...j(db.prepare('SELECT data FROM settings WHERE teacher_id=?').get(teacherId || '')?.data, {}) };
}
function dayDate(day, settings) {
  if (!settings.startDate) return null;
  const date = new Date(`${settings.startDate}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + Number(day.day || 1) - 1); return date.toISOString().slice(0,10);
}
function localDate(timezone) { const parts = new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()); return ['year','month','day'].map(t=>parts.find(p=>p.type===t).value).join('-'); }
function assignmentFor(user, day) {
  const override = j(db.prepare('SELECT data FROM assignments WHERE student_id=? AND day_id=?').get(user.id, day.id)?.data, {});
  const settings = settingsFor(user);
  let assigned = day.questions || [];
  if (override.questionIds) assigned = override.questionIds.map(id=>questions.get(id)).filter(Boolean);
  else if (Number.isInteger(override.requiredCount)) {
    const challenges = assigned.filter(q=>q.challenge), regular = assigned.filter(q=>!q.challenge);
    assigned = [...regular.slice(0,Math.max(0,override.requiredCount-challenges.length)),...challenges.slice(0,override.requiredCount)];
  }
  return {dayId:day.id,paused:override.paused || false,available:override.available !== false,requiredCount:assigned.length,questionIds:assigned.map(q=>q.id),date:override.date || dayDate(day,settings),overridden:Object.keys(override).length>0,note:override.note || '',override};
}
function questionFor(id) { const q = questions.get(id); if (!q) fail(404, 'Question not found in the current curriculum.'); return q; }
function ensureAvailable(user, q) {
  if (user.role === 'teacher') return;
  const substitutions=db.prepare('SELECT data FROM assignments WHERE student_id=?').all(user.id).map(a=>j(a.data,{})).filter(a=>a.questionIds?.includes(q.id));
  if(substitutions.length){if(substitutions.some(a=>!a.paused&&a.available!==false))return;fail(403,'Your teacher has paused this assignment.');}
  if(optionalIds.has(q.id))fail(403,'Your teacher must assign this optional assessment first.');
  const day = questionDays.get(q.id);
  if (day) { const a = assignmentFor(user, day); if (!a.available || a.paused) fail(403,'Your teacher has paused this lesson.'); }
  else {
    const assigned = db.prepare('SELECT 1 FROM extra_assignments WHERE student_id=? AND question_id=?').get(user.id,q.id);
    const practicedQuestions=db.prepare('SELECT DISTINCT question_id FROM attempts WHERE user_id=?').all(user.id).map(r=>questions.get(r.question_id)).filter(Boolean);
    const practiced = new Set(practicedQuestions.map(p=>p.skill));const latestDay=Math.max(0,...practicedQuestions.map(p=>questionDays.get(p.id)?.day||0));
    if (!assigned && (!practiced.has(q.skill)||latestDay<(q.availableAfterDay||0))) fail(403, 'This extra practice is available after you begin the related lesson, or when your teacher assigns it.');
  }
}
function questionProgress(userId) {
  const result = {};
  const attemptRows=db.prepare('SELECT * FROM attempts WHERE user_id=? ORDER BY created_at,rowid').all(userId);
  for (const a of attemptRows) {
    const old = result[a.question_id] || {status:'not_started',attempts:0,hints:0,solutionViewed:false,firstAttemptCorrect:null,activeSeconds:0};
    if (!old.firstAttemptId && a.origin === 'online') { old.firstAttemptId=a.id;old.firstAttemptStatus=a.status;old.firstAttemptCorrect=a.status==='correct'?true:a.status==='incorrect'?false:null; }
    old.attempts++; old.activeSeconds += a.active_seconds; old.lastAttemptAt = a.created_at; old.lastAttemptId = a.id;
    old.response = j(a.response); old.explanation = a.explanation; old.feedback = a.feedback; old.origin = a.origin;
    if (!['correct','approved'].includes(old.status)) old.status = a.status;
    if (a.status === 'correct' || a.status === 'approved') old.completedAt ||= a.created_at;
    result[a.question_id] = old;
  }
  for (const e of db.prepare('SELECT * FROM events WHERE user_id=? ORDER BY created_at').all(userId)) {
    const p = result[e.question_id] ||= {status:'not_started',attempts:0,hints:0,solutionViewed:false,firstAttemptCorrect:null,activeSeconds:0};
    if (e.type === 'hint') p.hints++;
    if (e.type === 'solution') p.solutionViewed = true;
  }
  const latestReviews=new Map();
  for (const r of db.prepare('SELECT reviews.*,attempts.question_id FROM reviews JOIN attempts ON attempts.id=reviews.attempt_id WHERE attempts.user_id=? ORDER BY reviews.created_at,reviews.rowid').all(userId)) {
    latestReviews.set(r.attempt_id,r);
    const p = result[r.question_id]; if (!p) continue;
    if (r.approved) { p.status = 'approved'; p.completedAt ||= r.created_at; }
    else if (!['correct','approved'].includes(p.status)) p.status = 'incorrect';
    if (p.firstAttemptId===r.attempt_id) {p.firstAttemptCorrect=!!r.approved;p.firstAttemptStatus=r.approved?'approved':'incorrect';}
    p.teacherFeedback = r.feedback; p.reviewedAt = r.created_at;
  }
  const effectiveByQuestion=new Map();
  for(const a of attemptRows){const review=latestReviews.get(a.id),effective=review?(review.approved?'approved':'incorrect'):a.status;const list=effectiveByQuestion.get(a.question_id)||[];list.push({status:effective,at:review?.created_at||a.created_at});effectiveByQuestion.set(a.question_id,list);}
  for(const [id,attempts] of effectiveByQuestion){const p=result[id],finished=attempts.filter(a=>['correct','approved'].includes(a.status));p.status=finished.length?(finished.some(a=>a.status==='correct')?'correct':'approved'):attempts.at(-1).status;if(finished.length)p.completedAt=finished[0].at;else delete p.completedAt;}
  for (const draft of db.prepare('SELECT * FROM drafts WHERE user_id=?').all(userId)) {
    const p = result[draft.question_id] ||= {status:'not_started',attempts:0,hints:0,solutionViewed:false,firstAttemptCorrect:null,activeSeconds:0};
    p.draft = {response:j(draft.response),explanation:draft.explanation,scratch:draft.scratch,revision:draft.revision,updatedAt:draft.updated_at};
  }
  return result;
}
const complete = p => p && ['correct','approved'].includes(p.status);
function progressFor(user) {
  const all = questionProgress(user.id), today = localDate(settingsFor(user).timezone);
  const days = course.days.map(day=>{
    const assignment = assignmentFor(user,day), qs = assignment.questionIds.map(id=>questions.get(id)), ps = qs.map(q=>all[q.id]);
    const completed = ps.filter(complete).length;
    return {...assignment,id:day.id,week:day.week,title:day.title,completed,remaining:qs.length-completed,challengesCompleted:qs.filter(q=>q.challenge && complete(all[q.id])).length,challengeCount:qs.filter(q=>q.challenge).length,needsCorrection:ps.filter(p=>p?.status==='incorrect').length,pendingReview:ps.filter(p=>p?.status==='teacher_review').length,status:assignment.paused?'paused':completed===qs.length?'complete':ps.some(p=>p?.attempts)?'in_progress':'not_started',overdue:!!assignment.date&&assignment.date<today&&completed<qs.length&&!assignment.paused};
  });
  const current = Object.fromEntries(Object.entries(all).filter(([id])=>questions.has(id)));
  const assignedIds = new Set(days.flatMap(d=>d.questionIds));
  const requiredStates = [...assignedIds].map(id=>all[id]).filter(Boolean);
  const attempted = requiredStates.filter(p=>p.firstAttemptId),assessed=attempted.filter(p=>p.firstAttemptCorrect!==null);
  return {version:course.version,questions:current,days,settings:settingsFor(user),summary:{required:assignedIds.size,completed:requiredStates.filter(complete).length,attempted:attempted.length,firstAttemptAssessed:assessed.length,firstAttemptCorrect:assessed.filter(p=>p.firstAttemptCorrect).length,firstAttemptAccuracy:assessed.length?assessed.filter(p=>p.firstAttemptCorrect).length/assessed.length:null,eventualAccuracy:attempted.length?attempted.filter(complete).length/attempted.length:null,pendingReview:requiredStates.filter(p=>p.status==='teacher_review').length,needsCorrection:requiredStates.filter(p=>p.status==='incorrect').length,hints:requiredStates.reduce((n,p)=>n+p.hints,0),retries:requiredStates.reduce((n,p)=>n+Math.max(0,p.attempts-1),0),solutionsViewed:requiredStates.filter(p=>p.solutionViewed).length,activeSeconds:requiredStates.reduce((n,p)=>n+p.activeSeconds,0),completedDays:days.filter(d=>d.status==='complete').length}};
}
function analyticsFor(user) {
  const progress = progressFor(user), all = progress.questions, config = settingsFor(user), skills = new Map();
  for (const [id,p] of Object.entries(all)) {
    if (!p.attempts) continue;
    const q=questions.get(id); if (!q) continue;
    const skill=q.skill || 'Uncategorized'; const s=skills.get(skill)||{skill,questionIds:[],attempted:0,assessed:0,completed:0,paperCompleted:0,firstAttemptCorrect:0,hints:0,retries:0,pendingReview:0};
    s.questionIds.push(id);s.attempted+=Number(!!p.firstAttemptId);s.assessed+=Number(p.firstAttemptCorrect!==null);s.completed+=Number(complete(p));s.paperCompleted+=Number(p.origin==='paper');s.firstAttemptCorrect+=Number(p.firstAttemptCorrect);s.hints+=p.hints;s.retries+=Math.max(0,p.attempts-1);s.pendingReview+=Number(p.status==='teacher_review');skills.set(skill,s);
  }
  const skillRows=[...skills.values()].map(s=>({...s,accuracy:s.assessed?s.firstAttemptCorrect/s.assessed:null,mastery:s.assessed<config.masteryMinQuestions?'not_enough_evidence':s.firstAttemptCorrect/s.assessed>=config.masteryThreshold?'secure':'needs_practice',evidence:`${s.firstAttemptCorrect} of ${s.assessed} assessed online questions correct on the first try; ${s.hints} hints used.`,recommendation:s.assessed<config.masteryMinQuestions?'Collect more independent work before judging this skill.':s.firstAttemptCorrect/s.assessed<config.masteryThreshold?'Revisit a worked example, then ask the learner to explain one step before trying a related problem.':'Return to this skill in spaced review.'}));
  const weeks=Array.from({length:10},(_,i)=>{const days=progress.days.filter(d=>d.week===i+1);const ids=days.flatMap(d=>d.questionIds),assessed=ids.filter(id=>all[id]?.firstAttemptCorrect!==undefined&&all[id]?.firstAttemptCorrect!==null);return {week:i+1,required:days.reduce((n,d)=>n+d.requiredCount,0),completed:days.reduce((n,d)=>n+d.completed,0),firstAttemptAccuracy:assessed.length?assessed.filter(id=>all[id].firstAttemptCorrect).length/assessed.length:null,questionIds:ids};});
  const assignedIds=new Set(progress.days.flatMap(d=>d.questionIds));
  const challengeIds=[...assignedIds].filter(id=>questions.get(id)?.challenge), attemptedChallenges=challengeIds.filter(id=>all[id]?.firstAttemptId);
  return {...progress,student:publicUser(user),skills:skillRows,weeks,masteryCriteria:{minimumQuestions:config.masteryMinQuestions,firstAttemptAccuracy:config.masteryThreshold},challenges:{assigned:challengeIds.length,attempted:attemptedChallenges.length,completed:challengeIds.filter(id=>complete(all[id])).length,questionIds:challengeIds},pendingReview:Object.entries(all).filter(([,p])=>p.status==='teacher_review').map(([id,p])=>({question:allowedQuestion(questions.get(id)),...p})),corrections:Object.entries(all).filter(([,p])=>p.status==='incorrect').map(([id,p])=>({question:allowedQuestion(questions.get(id)),...p}))};
}
function reviewFor(user) {
  const progress=progressFor(user), today=Date.now();
  const items=Object.entries(progress.questions).filter(([,p])=>p.status==='incorrect'||(p.hints>0&&p.completedAt&&today-Date.parse(p.completedAt)>3*86400000)).map(([id,p])=>({question:allowedQuestion(questions.get(id)),dayId:questionDays.get(id)?.id,reason:p.status==='incorrect'?`This question still needs a correction after ${p.attempts} attempt${p.attempts===1?'':'s'}.`:`You used ${p.hints} hint${p.hints===1?'':'s'} here. Try it again after a few days.`,dueAt:p.completedAt?new Date(Date.parse(p.completedAt)+3*86400000).toISOString():p.lastAttemptAt,status:p.status}));
  const taughtSkills=new Set(Object.keys(progress.questions).filter(id=>progress.questions[id].attempts).map(id=>questions.get(id)?.skill).filter(Boolean));
  const latestDay=Math.max(0,...Object.keys(progress.questions).filter(id=>progress.questions[id].attempts).map(id=>questionDays.get(id)?.day||0));
  const assigned=new Set(db.prepare('SELECT question_id FROM extra_assignments WHERE student_id=?').all(user.id).map(a=>a.question_id));
  const extra=(course.extraPractice||[]).filter(q=>(taughtSkills.has(q.skill)&&latestDay>=(q.availableAfterDay||0))||assigned.has(q.id)).map(q=>({...allowedQuestion(q),assigned:assigned.has(q.id),progress:progress.questions[q.id]}));
  return {items,extraPractice:extra,requiredWorkUnchanged:true};
}

const loginLimits=new Map();
function send(res,status,data,headers={}) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));}
async function body(req) {
  if (!String(req.headers['content-type']||'').startsWith('application/json')) fail(415,'Send JSON with Content-Type: application/json.');
  let length=0,chunks=[];for await(const chunk of req){length+=chunk.length;if(length>65536)fail(413,'The submitted answer is too long.');chunks.push(chunk);}
  let data;try{data=JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{fail(400,'Invalid JSON.');}if(!data||Array.isArray(data)||typeof data!=='object')fail(400,'Expected a JSON object.');return data;
}
function sessionUser(req) {
  const raw=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('da_session='))?.slice(11);
  if(!raw||raw.length!==64)return null;
  return db.prepare('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires_at>?').get(hash(raw),Date.now())||null;
}
function requireUser(user) {if(!user)fail(401,'Sign in to save and resume your work.');return user;}
function requireTeacher(user) {requireUser(user);if(user.role!=='teacher')fail(403,'This page is for teachers.');return user;}
function studentFor(teacher,id) {
  requireTeacher(teacher);
  const student=id?db.prepare("SELECT * FROM users WHERE id=? AND teacher_id=? AND role='student'").get(id,teacher.id):db.prepare("SELECT * FROM users WHERE teacher_id=? AND role='student' ORDER BY created_at LIMIT 1").get(teacher.id);
  if(!student)fail(404,'Create a student account first.');return student;
}
function validateOrigin(req) {
  const origin=req.headers.origin;if(!origin)return;
  const expected=process.env.APP_ORIGIN||`${production?'https':'http'}://${req.headers.host}`;
  const extra=(process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(origin!==expected&&!extra.includes(origin))fail(403,'This request came from an unrecognized website.');
}
function sessionCookie(value,maxAge) {return `da_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${production?'; Secure':''}`;}
function boundedText(value,max=12000){if(value===undefined)return '';if(typeof value!=='string'||value.length>max)fail(400,`Text must be no longer than ${max} characters.`);return value;}
function responseValid(response){if(response===undefined||response===null||JSON.stringify(response).length>16000)fail(400,'Enter an answer before submitting.');if(typeof response==='string'&&!response.trim())fail(400,'Enter an answer before submitting.');}

async function api(req,res,url,user) {
  const route=url.pathname, method=req.method;
  if(method==='GET'&&route==='/api/health')return send(res,200,{ok:true,database:true,curriculumLoaded:course.days.length>0,version:course.version});
  if(method==='GET'&&route==='/api/me')return send(res,200,{user:publicUser(user),configured:!!db.prepare("SELECT 1 FROM users WHERE role='teacher' LIMIT 1").get(),storage:'server',version:course.version});
  if(method==='POST'&&route==='/api/login'){
    const data=await body(req),ip=req.socket.remoteAddress||'unknown',limit=loginLimits.get(ip)||{count:0,until:Date.now()+900000};
    if(limit.until<Date.now()){limit.count=0;limit.until=Date.now()+900000;}
    if(limit.count>=12)fail(429,'Too many sign-in attempts. Wait 15 minutes and try again.');limit.count++;loginLimits.set(ip,limit);
    const username=boundedText(data.username,40).toLowerCase(),password=boundedText(data.password,256);
    const found=db.prepare('SELECT * FROM users WHERE username=?').get(username);
    if(!found||!passwordMatches(password,found.password))fail(401,'The username or password does not match.');
    loginLimits.delete(ip);const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),found.id,Date.now()+7*86400000);
    db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
    return send(res,200,{user:publicUser(found)},{'Set-Cookie':sessionCookie(token,7*86400)});
  }
  if(method==='POST'&&route==='/api/logout'){
    const raw=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('da_session='))?.slice(11);if(raw)db.prepare('DELETE FROM sessions WHERE token=?').run(hash(raw));
    return send(res,200,{ok:true},{'Set-Cookie':sessionCookie('',0)});
  }
  if(method==='GET'&&route==='/api/course')return send(res,200,publicCourse());
  if(method==='GET'&&route.startsWith('/api/resources/teacher/')){
    requireTeacher(user);const filename=decodeURIComponent(route.slice('/api/resources/teacher/'.length));
    if(!/^[A-Za-z0-9_. -]+\.(pdf|pptx)$/.test(filename))fail(404,'Resource not found.');
    const base=path.join(root,'private','resources','teacher'),target=path.join(base,filename);
    if(!fs.existsSync(target)||!fs.statSync(target).isFile()||!fs.realpathSync(target).startsWith(fs.realpathSync(base)+path.sep))fail(404,'Resource not found.');
    res.writeHead(200,{'Content-Type':filename.endsWith('.pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.presentationml.presentation','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':`inline; filename="${filename}"`});fs.createReadStream(target).pipe(res);return;
  }
  if(method==='GET'&&route.startsWith('/api/days/')){
    const day=course.days.find(d=>d.id===decodeURIComponent(route.slice(10)));if(!day)fail(404,'Lesson not found.');
    if(user?.role==='student'){const a=assignmentFor(user,day);if(!a.available)fail(403,'Your teacher has not opened this lesson yet.');}
    const assignment=user?assignmentFor(user,day):null;
    return send(res,200,{...publicDay(day,true),...(assignment?{questions:assignment.questionIds.map(id=>allowedQuestion(questions.get(id))),originalRequiredCount:day.requiredCount,requiredCount:assignment.requiredCount}:{}),assignment,progress:user?questionProgress(user.id):{}});
  }
  if(method==='GET'&&/^\/api\/questions\/[^/]+$/.test(route)){requireUser(user);const q=questionFor(decodeURIComponent(route.slice('/api/questions/'.length)));ensureAvailable(user,q);return send(res,200,{question:allowedQuestion(q),progress:questionProgress(user.id)[q.id]||null});}
  if(method==='GET'&&route==='/api/progress')return send(res,200,progressFor(requireUser(user)));
  if(method==='GET'&&route==='/api/review')return send(res,200,reviewFor(requireUser(user)));
  if(method==='POST'&&route==='/api/attempts'){
    requireUser(user);const data=await body(req),q=questionFor(data.questionId);ensureAvailable(user,q);responseValid(data.response);
    if(typeof data.submissionId!=='string'||!/^[a-zA-Z0-9_-]{12,100}$/.test(data.submissionId))fail(400,'A unique submission ID is required.');
    const prior=db.prepare('SELECT * FROM attempts WHERE user_id=? AND submission_id=?').get(user.id,data.submissionId);
    if(prior){if(prior.question_id!==q.id||prior.response!==JSON.stringify(data.response))fail(409,'This submission ID was already used for a different answer.');return send(res,200,{...j(prior.result),attempt:serializeAttempt(prior),progress:questionProgress(user.id)[q.id],duplicate:true});}
    const explanation=boundedText(data.explanation),p=questionProgress(user.id)[q.id];
    const gradingResponse=typeof data.response==='object'?{...data.response,explanation:data.explanation||data.response.explanation}:{answer:data.response,explanation:data.explanation};
    const result=gradeAnswer(q,gradingResponse);
    const id=randomUUID(),time=now(),activeSeconds=Math.max(0,Math.min(300,Math.floor(Number(data.activeSeconds)||0)));
    db.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,data.submissionId,user.id,q.id,course.version,JSON.stringify(data.response),explanation,result.status,result.feedback||'',JSON.stringify(result),p?.hints||0,Number(p?.solutionViewed||false),activeSeconds,'online',time);
    const attempt=db.prepare('SELECT * FROM attempts WHERE id=?').get(id);
    return send(res,201,{...result,attempt:serializeAttempt(attempt),progress:questionProgress(user.id)[q.id]});
  }
  if(method==='PUT'&&route.startsWith('/api/drafts/')){
    requireUser(user);const q=questionFor(decodeURIComponent(route.slice(12)));ensureAvailable(user,q);const data=await body(req);
    if(JSON.stringify(data.response??'').length>16000)fail(400,'Answer is too long.');const explanation=boundedText(data.explanation),scratch=boundedText(data.scratch,20000);
    const current=db.prepare('SELECT * FROM drafts WHERE user_id=? AND question_id=?').get(user.id,q.id);
    if(data.revision!==undefined&&Number(data.revision)!==(current?.revision||0))fail(409,'A newer draft was saved in another tab. Reload it before saving.',{draft:current?{response:j(current.response),explanation:current.explanation,scratch:current.scratch,revision:current.revision}:null});
    const revision=(current?.revision||0)+1,time=now();
    db.prepare('INSERT INTO drafts VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,question_id) DO UPDATE SET response=excluded.response,explanation=excluded.explanation,scratch=excluded.scratch,revision=excluded.revision,updated_at=excluded.updated_at').run(user.id,q.id,JSON.stringify(data.response??''),explanation,scratch,revision,time);
    return send(res,200,{saved:true,revision,updatedAt:time});
  }
  const assistance=route.match(/^\/api\/questions\/([^/]+)\/(hint|solution)$/);
  if(method==='POST'&&assistance){
    requireUser(user);const q=questionFor(decodeURIComponent(assistance[1]));ensureAvailable(user,q);const kind=assistance[2],p=questionProgress(user.id)[q.id];
    if(kind==='solution'&&user.role!=='teacher'&&!settingsFor(user).releaseSolutions)fail(403,'Your teacher has not released worked solutions.');
    const hints=q.hints?.length?q.hints:['Underline what the problem asks for. Write down the quantities you know.','Look back at the worked example for this lesson. Which step can you use here?','Show one step on paper and ask your teacher to check your approach.'];
    if(kind==='hint'&&(p?.hints||0)>=hints.length)return send(res,200,{hint:hints[hints.length-1],index:hints.length,total:hints.length});
    db.prepare('INSERT INTO events VALUES(?,?,?,?,?,?)').run(randomUUID(),user.id,q.id,kind,JSON.stringify({index:(p?.hints||0)+1}),now());
    return send(res,200,kind==='hint'?{hint:hints[p?.hints||0],index:(p?.hints||0)+1,total:hints.length}:{answer:q.answer,solution:q.solution,solutionOrigin:q.solutionOrigin,parts:q.parts,reference:q.reference});
  }
  if(method==='GET'&&route==='/api/teacher/students'){
    requireTeacher(user);return send(res,200,{students:db.prepare("SELECT * FROM users WHERE teacher_id=? AND role='student' ORDER BY created_at").all(user.id).map(s=>({...publicUser(s),summary:progressFor(s).summary}))});
  }
  if(method==='POST'&&route==='/api/teacher/students'){
    requireTeacher(user);const data=await body(req);const student=createUser(data.username,data.password,data.displayName||data.username,'student',user.id);audit(user.id,'create_student',{studentId:student.id});return send(res,201,{student:publicUser(student)});
  }
  if(method==='GET'&&route==='/api/teacher/analytics')return send(res,200,analyticsFor(studentFor(user,url.searchParams.get('studentId'))));
  if(method==='GET'&&route==='/api/teacher/attempts'){
    const student=studentFor(user,url.searchParams.get('studentId'));let rows=db.prepare('SELECT * FROM attempts WHERE user_id=? ORDER BY created_at DESC').all(student.id);if(url.searchParams.get('questionId'))rows=rows.filter(a=>a.question_id===url.searchParams.get('questionId'));
    return send(res,200,{attempts:rows.map(a=>({...serializeAttempt(a),question:j(db.prepare('SELECT question FROM snapshots WHERE id=?').get(a.question_id)?.question),reviews:db.prepare('SELECT approved,feedback,created_at AS createdAt FROM reviews WHERE attempt_id=? ORDER BY created_at').all(a.id)}))});
  }
  if(method==='GET'&&route==='/api/teacher/answers'){
    requireTeacher(user);const week=Number(url.searchParams.get('week'));return send(res,200,{version:course.version,days:course.days.filter(d=>!week||d.week===week),weeks:(course.weeks||[]).filter(w=>!week||w.week===week),extraPractice:week?[]:course.extraPractice,optionalQuestions:course.optionalQuestions||[]});
  }
  if(method==='POST'&&route==='/api/teacher/review'){
    requireTeacher(user);const data=await body(req);const attempt=db.prepare('SELECT * FROM attempts WHERE id=?').get(data.attemptId);if(!attempt)fail(404,'Attempt not found.');studentFor(user,attempt.user_id);
    if(typeof data.approved!=='boolean')fail(400,'Specify whether this answer is approved.');const feedback=boundedText(data.feedback,3000);
    db.prepare('INSERT INTO reviews VALUES(?,?,?,?,?,?)').run(randomUUID(),attempt.id,user.id,Number(data.approved),feedback,now());audit(user.id,'review_attempt',{attemptId:attempt.id,approved:data.approved});return send(res,200,{ok:true,progress:questionProgress(attempt.user_id)[attempt.question_id]});
  }
  if(method==='POST'&&route==='/api/teacher/paper'){
    requireTeacher(user);const data=await body(req),student=studentFor(user,data.studentId),q=questionFor(data.questionId),id=randomUUID(),feedback=boundedText(data.feedback,3000)||'Paper work checked by your teacher.';
    const result={status:'approved',correct:null,feedback};
    db.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,`paper-${id}`,student.id,q.id,course.version,JSON.stringify('Completed on paper'),'',result.status,feedback,JSON.stringify(result),0,0,0,'paper',now());
    audit(user.id,'record_paper',{studentId:student.id,questionId:q.id});return send(res,201,{ok:true,progress:questionProgress(student.id)[q.id]});
  }
  if(method==='POST'&&route==='/api/teacher/assignment'){
    requireTeacher(user);const data=await body(req),student=studentFor(user,data.studentId),day=course.days.find(d=>d.id===data.dayId);if(!day)fail(404,'Lesson not found.');
    const old=j(db.prepare('SELECT data FROM assignments WHERE student_id=? AND day_id=?').get(student.id,day.id)?.data,{}),changed={...old};
    for(const key of ['paused','available'])if(data[key]!==undefined){if(typeof data[key]!=='boolean')fail(400,`${key} must be true or false.`);changed[key]=data[key];}
    if(data.requiredCount!==undefined){if(!Number.isInteger(data.requiredCount)||data.requiredCount<0||data.requiredCount>day.questions.length)fail(400,'Required count must fit the source lesson. Use explicit question IDs for substitutions.');changed.requiredCount=data.requiredCount;delete changed.questionIds;}
    if(data.questionIds!==undefined){if(!Array.isArray(data.questionIds)||new Set(data.questionIds).size!==data.questionIds.length||data.questionIds.some(id=>!questions.has(id)))fail(400,'Choose valid, unique question IDs for this assignment.');changed.questionIds=data.questionIds;delete changed.requiredCount;}
    if(data.date!==undefined){validateDate(data.date);changed.date=data.date;}
    if(data.note!==undefined)changed.note=boundedText(data.note,1000);
    db.prepare('INSERT INTO assignments VALUES(?,?,?,?) ON CONFLICT(student_id,day_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').run(student.id,day.id,JSON.stringify(changed),now());audit(user.id,'adjust_assignment',{studentId:student.id,dayId:day.id,before:old,after:changed});return send(res,200,{assignment:assignmentFor(student,day)});
  }
  if(method==='POST'&&route==='/api/teacher/extra-practice'){
    requireTeacher(user);const data=await body(req),student=studentFor(user,data.studentId);if(!Array.isArray(data.questionIds)||data.questionIds.some(id=>!questions.has(id)||questionDays.has(id)))fail(400,'Choose extra-practice question IDs.');
    const insert=db.prepare('INSERT OR IGNORE INTO extra_assignments VALUES(?,?,?,?)');for(const id of data.questionIds)insert.run(student.id,id,now(),boundedText(data.note,1000));audit(user.id,'assign_extra_practice',{studentId:student.id,questionIds:data.questionIds});return send(res,200,{ok:true});
  }
  if(method==='GET'&&route==='/api/teacher/settings'){requireTeacher(user);return send(res,200,settingsFor(user));}
  if(method==='POST'&&route==='/api/teacher/settings'){
    requireTeacher(user);const data=await body(req),settings=settingsFor(user);
    if(data.startDate!==undefined){validateDate(data.startDate);settings.startDate=data.startDate;}
    if(data.timezone!==undefined){try{new Intl.DateTimeFormat('en',{timeZone:data.timezone});}catch{fail(400,'Choose a valid IANA timezone.');}settings.timezone=data.timezone;}
    if(data.releaseSolutions!==undefined){if(typeof data.releaseSolutions!=='boolean')fail(400,'releaseSolutions must be true or false.');settings.releaseSolutions=data.releaseSolutions;}
    if(data.masteryMinQuestions!==undefined){if(!Number.isInteger(data.masteryMinQuestions)||data.masteryMinQuestions<3||data.masteryMinQuestions>100)fail(400,'Use at least 3 and at most 100 questions for mastery evidence.');settings.masteryMinQuestions=data.masteryMinQuestions;}
    if(data.masteryThreshold!==undefined){if(typeof data.masteryThreshold!=='number'||data.masteryThreshold<0.5||data.masteryThreshold>1)fail(400,'Choose a mastery threshold between 0.5 and 1.');settings.masteryThreshold=data.masteryThreshold;}
    db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(teacher_id) DO UPDATE SET data=excluded.data').run(user.id,JSON.stringify(settings));audit(user.id,'update_settings',settings);return send(res,200,settings);
  }
  if(method==='GET'&&route==='/api/export'){
    const student=studentFor(user,url.searchParams.get('studentId'));return send(res,200,{exportedAt:now(),student:publicUser(student),analytics:analyticsFor(student),attempts:db.prepare('SELECT * FROM attempts WHERE user_id=? ORDER BY created_at').all(student.id).map(serializeAttempt),events:db.prepare('SELECT * FROM events WHERE user_id=? ORDER BY created_at').all(student.id),assignments:db.prepare('SELECT * FROM assignments WHERE student_id=?').all(student.id).map(a=>({...a,data:j(a.data)}))},{'Content-Disposition':`attachment; filename="progress-${student.username}.json"`});
  }
  fail(404,'This API endpoint does not exist.');
}
function serializeAttempt(a){return {id:a.id,questionId:a.question_id,version:a.version,response:j(a.response),explanation:a.explanation,status:a.status,feedback:a.feedback,hints:a.hints,solutionViewed:!!a.solution_viewed,activeSeconds:a.active_seconds,origin:a.origin,createdAt:a.created_at,result:j(a.result)};}
function validateDate(date){if(date==='')return;if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(`${date}T12:00:00Z`))||new Date(`${date}T12:00:00Z`).toISOString().slice(0,10)!==date)fail(400,'Use a valid date in YYYY-MM-DD format.');}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.pdf':'application/pdf'};
function staticFile(req,res,url){
  const base=path.join(root,'public');let decoded;try{decoded=decodeURIComponent(url.pathname);}catch{fail(400,'Invalid URL.');}
  if(decoded.includes('\0')||decoded.split('/').some(p=>p.startsWith('.')))fail(404,'File not found.');
  let target=path.resolve(base,`.${decoded==='/'?'/index.html':decoded}`);
  if(!target.startsWith(base+path.sep))fail(404,'File not found.');
  if(!fs.existsSync(target)||!fs.statSync(target).isFile()){if(path.extname(decoded))fail(404,'File not found.');target=path.join(base,'index.html');}
  if(!fs.existsSync(target))fail(404,'The frontend has not been built yet.');
  if(!fs.realpathSync(target).startsWith(fs.realpathSync(base)+path.sep))fail(404,'File not found.');
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':path.extname(target)==='.html'?'no-cache':'public, max-age=300','Content-Security-Policy':"default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"});
  if(req.method==='HEAD')return res.end();fs.createReadStream(target).pipe(res);
}
export const server=http.createServer(async(req,res)=>{
  try{
    loadCourse();const url=new URL(req.url,'http://localhost');
    if(!['GET','HEAD','POST','PUT','OPTIONS'].includes(req.method))fail(405,'Method not allowed.');
    if(req.method==='OPTIONS'){validateOrigin(req);res.writeHead(204,{'Access-Control-Allow-Origin':req.headers.origin||'', 'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Vary':'Origin'});return res.end();}
    if(req.headers.origin){validateOrigin(req);res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');}
    if(url.pathname.startsWith('/api/'))return await api(req,res,url,sessionUser(req));
    if(!['GET','HEAD'].includes(req.method))fail(405,'Method not allowed.');staticFile(req,res,url);
  }catch(error){if(res.headersSent){res.end();return;}if(!error.status)console.error('Request failed:',error.message);send(res,error.status||500,{error:error.status?error.message:'The server could not save this request. Please try again.',...(error.details?{details:error.details}:{})});}
});
server.listen(port,host,()=>console.log(`Double Advanced server: http://${host}:${server.address().port} (${course.days.length} days; persistent SQLite enabled)`));
function shutdown(){server.close(()=>{db.close();process.exit(0);});setTimeout(()=>process.exit(1),5000).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
