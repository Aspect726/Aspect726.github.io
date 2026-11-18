import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderStudent } from '../public/student.mjs';
import { progressReport } from '../server/progress-report.mjs';
import { createSQLiteDB } from '../server/storage.mjs';
import { createPlatform } from '../server/platform.mjs';
import { createManagement } from '../server/management.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const progress = { weeks:[], skills:[], days:[{date:'2026-11-14',answered:20,target:20,accuracy:85}], totalQuestions:20, overallAccuracy:85, streak:1, checks:[{week:99,score:21}] };
const score = {id:'practice',title:'Week 1 practice test',kind:'practice',attempt:1,takenOn:null,score:4,maxScore:23,percent:17.4,notes:'Private teacher note',redoNote:'Private correction note'};
const gradebook = () => ({visible:true,today:'2026-11-14',scores:[score],weeks:[{week:1,startDate:'2026-11-07',endDate:'2026-11-13',days:[
  {date:'2026-11-07',title:'Decimals',paper:{correct:0,total:20,percent:0,minutes:0,note:'Private paper note'}},
  {date:'2026-11-08',title:'Find the whole',paper:null},
  {date:'2026-11-09',title:'Scaling decimals',paper:{correct:17,total:20,percent:85,minutes:25}},
]}],readiness:{percent:62,secret:'Private planning result'},audit:[{text:'Private audit'}]});
function setup(api) {
  const dom = new JSDOM('<main id="app"></main>',{url:'https://practice.test/s/progress'});
  globalThis.document=dom.window.document;
  const ctx={api,escape,mathMarkup:escape,state:{user:{name:'Ari',role:'student'},routeVersion:1},navigate:()=>{},tell:()=>{},shell:html=>{document.querySelector('#app').innerHTML=html;}};
  return {dom,ctx};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test('student results preserve an undated diagnostic, real zero grades and unrecorded paper days',async()=>{
  const {dom,ctx}=setup(async path=>path.endsWith('/gradebook')?gradebook():progress);
  try {
    await renderStudent('/s/progress',ctx);
    const grades=document.querySelector('.student-gradebook');
    assert.match(grades.textContent,/4 \/ 23/);
    assert.match(grades.textContent,/Date not recorded/);
    assert.match(grades.textContent,/2 days graded/);
    assert.equal(grades.querySelectorAll('tbody tr').length,3);
    assert.match(grades.querySelector('tbody tr:first-child').textContent,/0 \/ 20.*0%.*0 min/);
    assert.match(grades.querySelector('tbody tr:nth-child(2)').textContent,/Not recorded/);
    assert.match(grades.querySelector('tbody tr:nth-child(3)').textContent,/17 \/ 20.*85%.*25 min/);
    assert.match(grades.textContent,/do not change your catch-up count or reward points/);
    assert.doesNotMatch(grades.textContent,/Private|readiness|planning|Week 99/i);
    assert.equal(grades.querySelector('.student-test-trend'),null,'An unknown test date must not be invented for a time series.');
    assert.ok(grades.querySelector('th[scope="row"]'));
    assert.ok(grades.querySelector('caption'));
    assert.equal(document.querySelector('.calendar-square.complete').textContent.includes('20 / 20'),true);
  } finally {dom.window.close();}
});

test('student tests use percentages for different denominators, retain retakes and expose chart values without hover',async()=>{
  const data=gradebook();
  data.scores.push(
    {...score,id:'weekly',title:'Week 1 weekly check',takenOn:'2026-11-13',score:16,maxScore:21,redoDue:'2026-11-15'},
    {...score,id:'weekly-retake',title:'Week 1 weekly check',takenOn:'2026-11-14',score:19,maxScore:21,attempt:2,redoCompleted:true},
    {...score,id:'blank',title:'No score yet',takenOn:'2026-11-12',score:null,maxScore:39}
  );
  const {dom,ctx}=setup(async path=>path.endsWith('/gradebook')?data:progress);
  try {
    await renderStudent('/s/progress',ctx);
    assert.equal(document.querySelectorAll('.student-test-history>li').length,3);
    assert.match(document.querySelector('.student-grade-highlight').textContent,/19 \/ 21.*90%/);
    assert.match(document.querySelector('.student-grade-highlight').textContent,/Attempt 2/);
    assert.match(document.querySelector('.student-test-history').textContent,/Corrections reviewed/);
    assert.match(document.querySelector('.student-test-history').textContent,/by Nov 15/);
    assert.ok(document.querySelector('.student-test-trend svg[role="img"]'));
    const values=document.querySelector('.student-test-trend .chart details');
    assert.match(values.textContent,/Nov 13 · attempt 1: 76%/);
    assert.match(values.textContent,/Nov 14 · attempt 2: 90%/);
    assert.doesNotMatch(values.textContent,/Date not recorded|No score yet/);
  } finally {dom.window.close();}
});

test('previously recorded paper grades remain visible when the course calendar moves',async()=>{
  const data=gradebook();
  data.unmappedPaperDays=[{date:'2026-11-01',correct:18,total:20,minutes:22,note:'Private earlier note'}];
  const {dom,ctx}=setup(async path=>path.endsWith('/gradebook')?data:progress);
  try {
    await renderStudent('/s/progress',ctx);
    const grades=document.querySelector('.student-gradebook');
    assert.match(grades.textContent,/3 days graded/);
    assert.match(grades.textContent,/Earlier paper records/);
    assert.match(grades.textContent,/outside your current course calendar/);
    assert.match(grades.textContent,/Nov 1, 2026.*18 \/ 20.*90%.*22 min/);
    assert.doesNotMatch(grades.textContent,/Private earlier note/);
  } finally {dom.window.close();}
});

test('hidden and unspecified score visibility omit every result, including legacy weekly checks',async()=>{
  for(const visible of [false,undefined]) {
    const {dom,ctx}=setup(async path=>path.endsWith('/gradebook')?{...gradebook(),visible,unmappedPaperDays:[{date:'2026-11-01',correct:18,total:20}]}:progress);
    try {
      await renderStudent('/s/progress',ctx);
      const text=document.body.textContent;
      assert.match(text,/Your teacher will share test and paper results here/);
      assert.doesNotMatch(text,/Week 1 practice test|Week 99|4 \/ 23|17 \/ 20|Private|Friday paper scores/);
      assert.equal(document.querySelector('.student-test-history'),null);
      assert.equal(document.querySelector('.student-paper-table'),null);
    } finally {dom.window.close();}
  }
});

test('gradebook errors leave online progress available without exposing stale scores',async()=>{
  const {dom,ctx}=setup(async path=>{if(path.endsWith('/gradebook'))throw Error('Network');return progress;});
  try {
    await renderStudent('/s/progress',ctx);
    assert.match(document.querySelector('.student-gradebook').textContent,/could not load/);
    assert.ok(document.querySelector('.calendar-square.complete'));
    assert.doesNotMatch(document.body.textContent,/Week 99/);
  } finally {dom.window.close();}
});

test('student progress requests grades in parallel and suppresses stale results after logout',async()=>{
  const pending={},calls=[];
  const {dom,ctx}=setup(path=>{calls.push(path);return new Promise(resolve=>pending[path]=resolve);});
  try {
    const rendering=renderStudent('/s/progress',ctx);
    await tick();
    assert.deepEqual(calls,['/v2/student/progress','/v2/student/gradebook','/v2/student/test-reviews']);
    ctx.state.user=null;ctx.state.routeVersion++;
    document.querySelector('#app').textContent='Signed out';
    pending['/v2/student/progress'](progress);pending['/v2/student/gradebook'](gradebook());pending['/v2/student/test-reviews']({visible:true,reviews:[]});
    await rendering;
    assert.equal(document.body.textContent,'Signed out');
  } finally {dom.window.close();}
});

test('student test titles and paper lesson names are rendered as text',async()=>{
  const data=gradebook();
  data.scores[0]={...score,title:'<img src=x onerror="alert(1)">'};
  data.weeks[0].days[0].title='<script>private()</script>';
  const {dom,ctx}=setup(async path=>path.endsWith('/gradebook')?data:progress);
  try {await renderStudent('/s/progress',ctx);assert.equal(document.querySelector('.student-gradebook img, .student-gradebook script'),null);assert.match(document.querySelector('.student-gradebook').textContent,/<img src=x/);}finally{dom.window.close();}
});

function reportFixture() {
 return {student:{id:'ari',name:'Ari'},summary:{answered:20,correct:17,streak:1},points:0,days:[{date:'2026-11-14',answered:20,correct:17}],skills:[],schedule:{phase:'active',timeZone:'America/Los_Angeles',startDate:'2026-11-07',backlog:{behind:140,overdue:140,remainingToday:0,requiredToDate:160,completedToDate:20,catchupCredit:0,overdueDays:7,completedDays:1},days:[{date:'2026-11-14',expected:20,answered:20,correct:17,title:'Exponents',week:2,focus:[]}]},gradebookSummary:{latestTest:score,paper:{recordedDays:2,correct:17,total:40,note:'Private paper note'},readiness:{label:'Course planning score',status:'incomplete',percent:88,missing:['Final check','Week 2 check'],benchmarks:[{note:'Private benchmark detail'}]},nextAction:{text:'Review the missed questions together.',href:'/t/scores'},notes:'Private teacher note',audit:[{note:'Private audit'}]}};
}

test('shareable report adds stored grades and incomplete planning status without private notes or assumed dates',()=>{
  const report=progressReport(reportFixture(),{date:'2026-11-14'});
  assert.deepEqual(report.gradebook.latestTest,{title:'Week 1 practice test',score:4,maxScore:23,percent:17.4,takenOn:null,attempt:1});
  assert.equal(report.gradebook.readiness.percent,null,'An incomplete estimate is never presented as a completed score.');
  assert.match(report.text,/Latest recorded test: Week 1 practice test — 4\/23 \(17.4%\), date not recorded/);
  assert.match(report.text,/Program planning estimate: More results needed/);
  assert.match(report.text,/Still needed: Final check; Week 2 check/);
  assert.match(report.text,/not a BSD placement decision/);
  assert.match(report.text,/Paper practice: 2 days graded; 17\/40 correct \(42.5%\)/);
  assert.match(report.text,/Test & paper next step: Review the missed questions together/);
  assert.equal(report.backlog.behind,140);
  assert.equal(report.points,0);
  assert.doesNotMatch(JSON.stringify(report),/Private|benchmarks|\/t\/scores|88%/);
});

test('shareable report preserves missing test scores and distinguishes complete from incomplete evidence',()=>{
 const detail=reportFixture();
 detail.gradebookSummary.latestTest=null;
 detail.gradebookSummary.paper={recordedDays:0,correct:0,total:0};
 detail.gradebookSummary.readiness={status:'complete',percent:87.25,missing:[]};
 const report=progressReport(detail,{date:'2026-11-14'});
 assert.equal(report.gradebook.latestTest,null);
 assert.equal(report.gradebook.paper.percent,null);
 assert.match(report.text,/No grade recorded yet/);
 assert.match(report.text,/Paper practice: No grades recorded yet/);
 assert.match(report.text,/Program planning estimate: 87.3%/);
 assert.doesNotMatch(report.text,/Ready|0%/);
});

async function serviceFixture() {
  const db=createSQLiteDB();db.migrate();
  const clock=()=>new Date('2026-11-17T20:00:00Z');
  for (const [id,role] of [['teacher','parent'],['learner','student']]) await db.prepare('INSERT INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind(id,id,id,role,'test',clock().toISOString()).run();
  const platform=createPlatform({db,clock});
  const management=createManagement({db,clock,platform,initialScore:{seedId:'synthetic-diagnostic',assessmentId:'week1-practice',score:4,maxScore:23,takenOn:null,note:'Private diagnostic note'}});
  const teacher={id:'teacher',role:'teacher'},student={id:'learner',role:'student'};
  async function call(path,{user=student,data,method=data?'POST':'GET'}={}) {
    const request=new Request(`https://practice.test/api/v2/${path}`,{method,headers:data?{'content-type':'application/json'}:{},...(data?{body:JSON.stringify(data)}:{})});
    try {const response=await management.handle(request,user) || await platform.handle(request,user);return {status:response.status,value:await response.json()};}
    catch(error) {if(!error.status)throw error;return {status:error.status,value:{error:error.message}};}
  }
  return {db,clock,platform,management,teacher,student,call};
}

test('real gradebook service feeds the student page and teacher shareable report without private fields',async()=>{
  const f=await serviceFixture();let dom;
  try {
    const shared=await f.call('student/gradebook');
    assert.equal(shared.status,200);
    assert.equal(shared.value.scores[0].score,4);
    assert.equal(shared.value.scores[0].takenOn,null);
    assert.equal(/Private|readiness|weight|studentId|note|audit|private-import/i.test(JSON.stringify(shared.value)),false,'Student API contains only permitted score fields, not planning metadata or private notes.');
    const teacher=await f.call('teacher/progress-summary?studentId=learner',{user:f.teacher});
    assert.equal(teacher.status,200);
    assert.equal(teacher.value.progressReport.gradebook.latestTest.score,4);
    assert.equal(teacher.value.progressReport.gradebook.readiness.percent,null);
    assert.match(teacher.value.progressReport.text,/Program planning estimate: More results needed/);
    assert.doesNotMatch(JSON.stringify(teacher.value.progressReport),/Private diagnostic note|private-import/);
    const page=setup(async path=>{const result=await f.call(path.replace('/v2/',''));assert.equal(result.status,200);return result.value;});dom=page.dom;
    await renderStudent('/s/progress',page.ctx);
    assert.match(document.querySelector('.student-undated-tests').textContent,/4 \/ 23/);
    assert.doesNotMatch(document.body.textContent,/Program planning|Private diagnostic note/);
  } finally {dom?.window.close();f.db.close();}
});

test('real grade visibility hides modern and legacy scores, isolates students and preserves online counts',async()=>{
  const f=await serviceFixture();
  try {
    await f.call('student/gradebook'); // Import the synthetic single-student diagnostic before a second account exists.
    await f.db.prepare('INSERT INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind('second','second','Second','student','test',f.clock().toISOString()).run();
    const other={id:'second',role:'student'};
    assert.equal((await f.call('teacher/scores',{user:f.teacher,data:{requestId:'second-test-score',studentId:'second',assessmentId:'week1-practice',score:13,takenOn:null,note:'Private second student'}})).status,201);
    assert.equal((await f.call('teacher/checks',{user:f.teacher,data:{studentId:'learner',week:1,score:16,note:'Private weekly note'}})).status,200);
    assert.equal((await f.call('teacher/paper-days',{user:f.teacher,data:{requestId:'paper-day-for-test',studentId:'learner',date:'2026-11-07',correct:17,total:20,minutes:22,note:'Private paper note'}})).status,200);
    const mine=(await f.call('student/gradebook?studentId=second')).value;
    assert.ok(mine.scores.some(row=>row.score===4));
    assert.equal(mine.scores.some(row=>row.score===13),false);
    assert.equal(/Private|readiness|weight|studentId|note|audit/i.test(JSON.stringify(mine)),false,'Student score and paper response excludes all private fields.');
    assert.equal((await f.call('student/gradebook?studentId=learner',{user:other})).value.scores[0].score,13);
    assert.equal((await f.call('teacher/scores',{data:{requestId:'student-write-test',studentId:'learner',assessmentId:'week1-practice',score:23}})).status,403);
    const before=(await f.call('student/progress')).value;
    assert.equal(before.checks.length,1);
    assert.equal((await f.call('teacher/gradebook/settings',{user:f.teacher,method:'PATCH',data:{requestId:'hide-scores-test',studentId:'learner',showScores:false}})).status,200);
    const hidden=(await f.call('student/gradebook')).value;
    assert.equal(hidden.visible,false);
    assert.deepEqual(hidden.scores,[]);assert.deepEqual(hidden.weeks,[]);assert.deepEqual(hidden.unmappedPaperDays,[]);
    const after=(await f.call('student/progress')).value;
    assert.deepEqual(after.checks,[]);
    assert.equal(after.totalQuestions,before.totalQuestions);
    assert.deepEqual(after.backlog,before.backlog);
    assert.equal((await f.call('student/gradebook',{user:other})).value.visible,true);
    assert.equal((await f.call('teacher/progress-summary?studentId=learner',{user:f.teacher})).value.progressReport.gradebook.paper.recordedDays,1);
  } finally {f.db.close();}
});

test('teacher-shared test feedback points to real skills without changing grades or showing private fields',async()=>{
 const shared={visible:true,reviews:[{id:'r1',scoreId:'s1',title:'Ratios check',attempt:1,takenOn:'2026-11-13',summary:'Compare equal groups before finding the missing amount.',teacherNote:'DO_NOT_SHOW_PRIVATE',focus:[{skillId:'R-RATIO',reason:'Keep both parts in the same order.',nextStep:'Draw a ratio table.'},{skillId:'not-a-skill',reason:'Check this together.',nextStep:'Ask your teacher.'}],questions:[{number:3,status:'mistake',evidence:'The ratio order changed.',explanation:'The first quantity should stay first.',nextStep:'Label both columns.',skillIds:['R-RATIO']},{number:4,status:'unclear',evidence:'The writing is faint.',explanation:'This step needs a closer look.',nextStep:'Check the page with your teacher.',skillIds:[]}],uncertainties:['Question 4 needs checking.']}],readiness:{secret:'DO_NOT_SHOW_PRIVATE'}};
 const ownProgress={...progress,skills:[{skill:'R-RATIO',name:'Ratio relationships',level:'learning'}]};
 const {dom,ctx}=setup(async path=>path.endsWith('/gradebook')?gradebook():path.endsWith('/test-reviews')?shared:ownProgress);
 try{
  await renderStudent('/s/progress',ctx);
  const feedback=document.querySelector('.student-test-feedback');assert.ok(feedback);
  assert.match(feedback.textContent,/Your next practice/);assert.match(feedback.textContent,/Question 3/);assert.match(feedback.textContent,/Check together/);
  assert.ok(feedback.querySelector('a[href="/s/learn/R-RATIO"]'));assert.ok([...feedback.querySelectorAll('a')].some(link=>link.getAttribute('href')==='/s/practice?source=library&skill=R-RATIO&count=5'));
  assert.equal(feedback.querySelector('a[href*="not-a-skill"]'),null);assert.doesNotMatch(feedback.textContent,/DO_NOT_SHOW_PRIVATE|readiness|planning/i);
  assert.match(document.querySelector('.student-undated-tests').textContent,/4 \/ 23/,'Review feedback never substitutes for the teacher grade.');
 }finally{dom.window.close();}
});

test('test feedback is hidden when either sharing gate is closed and its text cannot inject HTML',async()=>{
 const review={title:'<img src=x onerror=alert(1)>',summary:'<script>private()</script>',focus:[],questions:[]};
 for(const [gradesVisible,reviewVisible] of [[false,true],[true,false]]){
  const {dom,ctx}=setup(async path=>path.endsWith('/gradebook')?{...gradebook(),visible:gradesVisible}:path.endsWith('/test-reviews')?{visible:reviewVisible,reviews:[review]}:progress);
  try{await renderStudent('/s/progress',ctx);assert.equal(document.querySelector('.student-test-feedback'),null);}finally{dom.window.close();}
 }
 const {dom,ctx}=setup(async path=>path.endsWith('/gradebook')?gradebook():path.endsWith('/test-reviews')?{visible:true,reviews:[review]}:progress);
 try{await renderStudent('/s/progress',ctx);assert.equal(document.querySelector('.student-test-feedback img,.student-test-feedback script'),null);assert.match(document.querySelector('.student-test-feedback').textContent,/<script>/);}finally{dom.window.close();}
});

test('course map labels IM units and describes only the skills practiced in this course',async()=>{
 const unit={id:'6.2',grade:6,number:2,title:'Introducing Ratios',label:'IM 6.2',skillCount:1,practiced:1,mastered:0,skills:[{id:'R-RATIO',name:'Ratio relationships',level:'learning',attempts:2}]};
 const data={weeks:[{week:1,title:'Ratios',status:'current',startDate:'2026-11-07',endDate:'2026-11-13',skills:[{skill:'R-RATIO',name:'Ratio relationships',level:'learning',im:{primaryUnit:unit,relationship:'focus'}}]}],unitCoverage:{scope:'Course skills grouped by their main IM unit.',units:[unit,{id:'6.9',title:'Putting It All Together',label:'IM 6.9',skillCount:0,skills:[]}]}};
 const {dom,ctx}=setup(async()=>data);
 try{await renderStudent('/s/map',ctx);assert.match(document.querySelector('.im-skill-tag').textContent,/IM 6.2.*Introducing Ratios/);assert.match(document.querySelector('.im-coverage').textContent,/1 of 1 course skills tried/);assert.match(document.querySelector('.im-coverage').textContent,/not a grade for a whole IM unit/);assert.match(document.querySelector('.im-coverage').textContent,/No focused practice/);assert.equal(document.querySelector('.im-coverage progress').max,1);assert.equal(document.querySelector('.im-coverage progress').value,1);}finally{dom.window.close();}
});

test('real course map carries a valid IM home for every course skill and zero invented practice',async()=>{
 const f=await serviceFixture();try{
  const result=await f.call('student/map');assert.equal(result.status,200);
  const skills=result.value.weeks.flatMap(week=>week.skills),unique=new Set(skills.map(item=>item.skill));
  assert.equal(unique.size,70);assert.ok(skills.every(skill=>skill.im?.primaryUnit?.id));
  assert.equal(result.value.unitCoverage.summary.courseSkills,70);assert.equal(result.value.unitCoverage.summary.practiced,0);assert.equal(result.value.unitCoverage.summary.mastered,0);
  assert.equal(result.value.unitCoverage.units.reduce((n,unit)=>n+unit.skillCount,0),70);
 }finally{f.db.close();}
});

test('older and undated tests stay in closed disclosures while recent tests remain prominent',async()=>{
 const data=gradebook();data.today='2026-12-20';
 data.scores=[{...score,id:'old',title:'Five-week-old test',takenOn:'2026-11-13',score:12,maxScore:21},{...score,id:'boundary-old',title:'Older than the window',takenOn:'2026-12-06',score:13,maxScore:21},{...score,id:'recent-edge',title:'Start of the recent window',takenOn:'2026-12-07',score:16,maxScore:21},{...score,id:'recent',title:'This week’s check',takenOn:'2026-12-19',score:19,maxScore:21},score];
 const {dom,ctx}=setup(async path=>path.endsWith('/gradebook')?data:progress);
 try{
  await renderStudent('/s/progress',ctx);
  const recent=document.querySelector('.student-grade-highlight');assert.match(recent.textContent,/This week’s check/);assert.doesNotMatch(recent.textContent,/Five-week-old|practice test/);
  const earlier=document.querySelector('.student-earlier-tests'),undated=document.querySelector('.student-undated-tests');
  assert.equal(earlier.open,false);assert.equal(undated.open,false);assert.equal(earlier.querySelectorAll('.student-test-history>li').length,2);assert.match(earlier.textContent,/Five-week-old test/);assert.match(earlier.textContent,/Older than the window/);assert.doesNotMatch(earlier.textContent,/Start of the recent window/);
  assert.match(undated.textContent,/Date not recorded/);assert.equal(document.querySelectorAll('.student-test-history>li').length,5,'No historical attempt is removed.');
  assert.equal(document.querySelector('.student-test-trend').open,false,'The full historical chart is also collapsed.');
 }finally{dom.window.close();}
});
