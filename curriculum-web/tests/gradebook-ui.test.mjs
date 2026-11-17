import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderGradebook, parseQuestionNumbers, gradeTrend } from '../public/gradebook.mjs';

const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function gradebookData(){
  const days=Array.from({length:7},(_,i)=>({date:`2026-11-${String(i+7).padStart(2,'0')}`,title:`Lesson ${i+1}`,online:{answered:i===0?4:0,correct:i===0?3:0,percent:i===0?75:null,target:20,credited:i===0?4:0,catchupCredit:0},paper:i===1?{correct:18,total:20,percent:90,minutes:12,note:'Use a drawing',band:{label:'Strong'}}:null}));
  return {student:{id:'s1',name:'Sam'},today:'2026-11-10',settings:{showScores:false},weeks:[{week:1,startDate:'2026-11-07',endDate:'2026-11-13',days},{week:2,startDate:'2026-11-14',endDate:'2026-11-20',days:days.map((day,i)=>({...day,date:`2026-11-${i+14}`,title:`Week 2 lesson ${i+1}`,paper:null}))}],assessments:[{id:'weekly-1',kind:'weekly',title:'Week 1 check',maxScore:21,week:1,plannedDate:'2026-11-13',active:true,builtIn:true,areas:[{id:'decimals',label:'Decimals',questions:[1,2,3]}]},{id:'diagnostic',kind:'standards',title:'Grade 5 diagnostic',maxScore:39,active:true,builtIn:true,areas:[]}],scores:[{id:'sc1',studentId:'s1',assessmentId:'weekly-1',kind:'weekly',title:'Week 1 check',week:1,attempt:1,takenOn:null,score:15,maxScore:21,percent:15/21*100,band:{key:'repeat',label:'Repeat weakest skill'},minutes:null,missed:null,byArea:[{id:'decimals',label:'Decimals',total:3,correct:null,percent:null}],note:'',redoDue:'2026-11-15',redoCompleted:false}],readiness:{status:'incomplete',percent:null,components:[{label:'Online daily accuracy · last 14 days',weight:15,percent:75,complete:true},{label:'Final check',weight:30,percent:null,complete:false}],benchmarks:[{label:'Last three scheduled weekly checks (Weeks 6, 7, 8)',status:'pending'}]}};
}
function fixture(data=gradebookData()){
  const dom=new JSDOM('<main id="app"></main>',{url:'https://practice.test/t/gradebook'}),old={document:globalThis.document,FormData:globalThis.FormData};
  globalThis.document=dom.window.document;globalThis.FormData=dom.window.FormData;
  const writes=[],navigations=[],messages=[];
  const ctx={selectedStudent:data.student,state:{studentId:'s1',routeVersion:1},escape,shell:html=>{document.getElementById('app').innerHTML=html;},navigate:path=>{navigations.push(path);},tell:(...args)=>messages.push(args),api:async(path,body,method=body===undefined?'GET':'POST')=>{if(method==='GET')return data;writes.push({path,body,method});return {ok:true,id:'created-test'};}};
  return {dom,ctx,data,writes,navigations,messages,render:(path='/t/gradebook')=>renderGradebook(path,ctx),close(){dom.window.close();globalThis.document=old.document;globalThis.FormData=old.FormData;}};
}
const input=(id,value)=>{document.getElementById(id).value=String(value);};
async function submit(f,id){const form=document.getElementById(id);form.dispatchEvent(new f.dom.window.Event('submit',{bubbles:true,cancelable:true}));for(let i=0;i<100&&form.dataset.saving==='true';i++)await new Promise(resolve=>setTimeout(resolve,1));assert.notEqual(form.dataset.saving,'true');return form;}

test('daily grades keep missing paper blank, distinguish online totals, and save the actual moved date',async()=>{
  const f=fixture();try{
    await f.render('/t/gradebook?week=2');
    assert.equal(document.querySelectorAll('.gradebook-day').length,7);
    assert.equal(document.getElementById('paper-2026-11-14-correct').value,'');
    assert.match(document.querySelector('.paper-grade-result').textContent,/Not entered/);
    assert.match(document.querySelector('.gradebook-status').textContent,/do not complete online questions or change reward points/);
    assert.equal(document.querySelector('a[aria-current="page"]').textContent,'Daily practice');
    assert.equal(document.getElementById('gradebook-week').value,'2');
    input('paper-2026-11-14-correct',17);input('paper-2026-11-14-total',20);input('paper-2026-11-14-minutes',14);input('paper-2026-11-14-note','<Use a model>');
    await submit(f,'paper-2026-11-14');
    assert.equal(f.writes.length,1);assert.match(f.writes[0].path,/paper-days\?studentId=s1/);
    assert.deepEqual({...f.writes[0].body,requestId:'id'},{requestId:'id',studentId:'s1',date:'2026-11-14',correct:17,total:20,minutes:14,note:'<Use a model>'});
    assert.equal(f.navigations[0],'/t/gradebook?week=2');
  }finally{f.close();}
});

test('paper entry validates bounds and keeps the same request ID for a failed network retry',async()=>{
  const f=fixture();try{
    await f.render();input('paper-2026-11-07-correct',21);
    const form=await submit(f,'paper-2026-11-07');assert.equal(f.writes.length,0);assert.match(form.querySelector('.form-error').textContent,/from 0 to 20/);
    input('paper-2026-11-07-correct',0);let attempts=0,ids=[];f.ctx.api=()=>{};
    // Renderer captures api; use a fresh render with the simulated transport.
    f.ctx.api=async(path,body)=>{if(!body)return f.data;ids.push(body.requestId);if(++attempts===1)throw Error('Temporary connection error');return {ok:true};};
    await f.render();input('paper-2026-11-07-correct',0);await submit(f,'paper-2026-11-07');await submit(f,'paper-2026-11-07');
    assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);assert.match(document.querySelector('.paper-grade-result').textContent,/0%/);
  }finally{f.close();}
});

test('test scores permit unknown misses, retain unknown dates when editing, and use PATCH for edits',async()=>{
  const f=fixture();try{
    await f.render('/t/scores?editScore=sc1');
    assert.equal(document.getElementById('score-taken').value,'');
    assert.equal(document.getElementById('record-misses').checked,false);
    assert.match(document.getElementById('saved-score-sc1').textContent,/Date not recorded/);
    assert.match(document.getElementById('saved-score-sc1').textContent,/No area scores are inferred/);
    assert.match(document.querySelector('.readiness-score').textContent,/Not complete yet/);
    input('test-score',16);await submit(f,'test-score-form');
    assert.equal(f.writes[0].method,'PATCH');assert.match(f.writes[0].path,/scores\/sc1\?/);assert.equal(f.writes[0].body.takenOn,null);assert.equal(f.writes[0].body.missed,null);
  }finally{f.close();}
});

test('retakes create a new entry and missed-number count must match the entered score',async()=>{
  const f=fixture();try{
    await f.render('/t/scores?assessment=weekly-1');input('test-score',19);
    const toggle=document.getElementById('record-misses');toggle.checked=true;toggle.dispatchEvent(new f.dom.window.Event('change',{bubbles:true}));
    document.querySelector('[name=missed][value="2"]').checked=true;
    let form=await submit(f,'test-score-form');assert.equal(f.writes.length,0);assert.match(form.querySelector('.form-error').textContent,/Select all 2 missed/);
    document.querySelector('[name=missed][value="7"]').checked=true;
    form.dispatchEvent(new f.dom.window.Event('input',{bubbles:true}));assert.match(document.getElementById('score-area-preview').textContent,/2 \/ 3/);
    await submit(f,'test-score-form');assert.equal(f.writes[0].method,'POST');assert.match(f.writes[0].path,/\/scores\?/);assert.deepEqual(f.writes[0].body.missed,[2,7]);
    assert.equal(f.writes[0].body.score,19);assert.equal(f.writes[0].body.assessmentId,'weekly-1');
  }finally{f.close();}
});

test('custom test creation validates optional group ranges and does not invent readiness weights',async()=>{
  const f=fixture();try{
    await f.render('/t/scores');input('test-title','Fractions quiz');input('test-max',10);input('area-label-0','Fractions');input('area-numbers-0','1–5, 8');
    await submit(f,'test-catalog-form');assert.equal(f.writes.length,1);
    assert.equal(f.writes[0].body.kind,'custom');assert.equal(f.writes[0].body.maxScore,10);assert.deepEqual(f.writes[0].body.areas,[{id:'area-1',label:'Fractions',questions:[1,2,3,4,5,8]}]);
    assert.equal('weight' in f.writes[0].body,false);assert.equal(f.navigations[0],'/t/scores?assessment=created-test');
  }finally{f.close();}
});

test('redo completion and visibility changes stay scoped to the selected student',async()=>{
  const f=fixture();try{
    await f.render('/t/scores');input('redo-note-sc1','Used equal groups');await submit(f,'redo-sc1');
    assert.equal(f.writes[0].method,'PATCH');assert.equal(f.writes[0].body.redoCompleted,true);assert.equal(f.writes[0].body.studentId,'s1');
    document.querySelector('#gradebook-visibility [name=showScores]').checked=true;await submit(f,'gradebook-visibility');
    assert.match(f.writes[1].path,/gradebook\/settings\?studentId=s1/);assert.equal(f.writes[1].body.showScores,true);
  }finally{f.close();}
});

test('question group parser rejects invalid ranges and trend omits missing grades instead of treating them as zero',()=>{
  assert.deepEqual(parseQuestionNumbers('1–3, 2, 5',5),[1,2,3,5]);
  assert.throws(()=>parseQuestionNumbers('1–6',5),/between 1 and 5/);
  assert.throws(()=>parseQuestionNumbers('three',5),/Use question numbers/);
  assert.throws(()=>parseQuestionNumbers('3-1',5),/between 1 and 5/);
  const chart=gradeTrend([{date:'2026-11-07',online:{percent:80},paper:null},{date:'2026-11-08',online:{percent:null},paper:null},{date:'2026-11-09',online:{percent:90},paper:{percent:70}}],escape);
  assert.equal((chart.match(/<circle /g)||[]).length,3);assert.equal((chart.match(/stroke-width="2.5"/g)||[]).length,0);assert.match(chart,/exact scores are listed below/);
});

test('a stale gradebook request cannot replace a newer route',async()=>{
  const f=fixture();try{
    let release;f.ctx.api=()=>new Promise(resolve=>{release=resolve;});const pending=f.render();f.ctx.state.routeVersion=2;release(f.data);await pending;assert.equal(document.getElementById('app').innerHTML,'');
  }finally{f.close();}
});

test('planning estimates use server completion status and expose missing evidence and benchmark interpretation',async()=>{
  const data=gradebookData();data.readiness={status:'complete',percent:87.2,components:[{label:'Weekly checks',weight:25,percent:80,complete:true,count:7,expectedCount:7},{label:'Daily accuracy',weight:15,percent:90,scope:'Online first attempts only, weighted by questions answered.'}],benchmarks:[{label:'Last three checks',status:'not-yet',interpretation:'Weeks 6, 7 and 8 are the last three scheduled weekly checks.'}]};
  const f=fixture(data);try{await f.render();assert.match(document.querySelector('.readiness-score').textContent,/87.2%/);assert.match(document.querySelector('.readiness-components').textContent,/7 \/ 7 recorded/);assert.match(document.querySelector('.readiness-components').textContent,/Online first attempts only/);assert.match(document.querySelector('.readiness-benchmarks').textContent,/Not yet.*Weeks 6, 7 and 8/);assert.match(document.querySelector('.gradebook-readiness summary').textContent,/Teacher only.*not a BSD placement cutoff/);}finally{f.close();}
});

test('date navigation finds the right week and retained grades keep their original date',async()=>{
  const data=gradebookData();data.unmappedPaperDays=[{date:'2026-11-01',correct:16,total:20,minutes:18,note:'Before course moved'}];const f=fixture(data);
  try{
    await f.render('/t/gradebook?date=2026-11-15');assert.equal(document.getElementById('gradebook-week').value,'2');
    await f.render('/t/gradebook?date=2026-11-01');assert.equal(document.querySelector('.gradebook-archive').open,true);assert.equal(document.getElementById('archive-correct').value,'16');input('archive-correct',17);await submit(f,'earlier-grade');assert.equal(f.writes[0].body.date,'2026-11-01');assert.equal(f.writes[0].body.correct,17);
  }finally{f.close();}
});

test('archived tests and changed test versions retain their attempt history',async()=>{
  const data=gradebookData();data.assessments[0]={...data.assessments[0],title:'Renamed check',maxScore:30,active:false};const f=fixture(data);
  try{await f.render('/t/scores?editScore=sc1');assert.match(document.getElementById('score-assessment').selectedOptions[0].textContent,/Week 1 check.*out of 21/);assert.match(document.getElementById('saved-score-sc1').textContent,/Recorded version: Week 1 check.*out of 21/);assert.match(document.querySelector('.assessment-card').textContent,/Archived test.*earlier scores stay/);assert.equal([...document.querySelectorAll('#saved-score-sc1 a')].some(link=>link.textContent==='Record a retake'),false);}finally{f.close();}
});

test('new score entries leave the redo date default to the server and importing prior evidence uses server-provided values',async()=>{
  const data=gradebookData();data.knownPractice={assessmentId:'diagnostic',score:5,maxScore:39,requiresImport:true,takenOn:null};const f=fixture(data);
  try{await f.render('/t/scores?assessment=weekly-1');input('test-score',18);await submit(f,'test-score-form');assert.equal('redoDue' in f.writes[0].body,false);await submit(f,'import-practice-score');assert.equal(f.writes[1].body.score,5);assert.equal(f.writes[1].body.assessmentId,'diagnostic');assert.equal(f.writes[1].body.takenOn,null);}finally{f.close();}
});

test('old completed tests leave the current view and remain directly reachable in past tests',async()=>{
  const data=gradebookData();data.today='2026-12-18';data.scores[0].takenOn='2026-11-13';const f=fixture(data);
  try{
    await f.render('/t/scores');assert.equal(document.getElementById('saved-score-sc1'),null);assert.equal([...document.querySelectorAll('#score-assessment option')].some(option=>option.value==='weekly-1'),false);assert.match(document.querySelector('.test-list-filters').textContent,/Past & hidden \(1\)/);
    await f.render('/t/scores?view=past');assert.ok(document.getElementById('saved-score-sc1'));assert.match(document.querySelector('.test-list-filters [aria-current=page]').textContent,/Past & hidden/);
    await f.render('/t/scores?editScore=sc1');assert.ok(document.getElementById('saved-score-sc1'));assert.equal(document.getElementById('test-score').value,'15');
  }finally{f.close();}
});

test('hide and restore controls save catalog visibility without editing any score or planning weight',async()=>{
  const f=fixture();try{
    await f.render('/t/scores');const hide=document.querySelector('[data-test-active="weekly-1"]');hide.click();for(let i=0;i<100&&!f.writes.length;i++)await new Promise(resolve=>setTimeout(resolve,1));assert.equal(f.writes[0].method,'PATCH');assert.match(f.writes[0].path,/assessments\/weekly-1/);assert.equal(f.writes[0].body.active,false);assert.equal('score'in f.writes[0].body,false);assert.equal('weight'in f.writes[0].body,false);
    f.data.assessments[0].active=false;await f.render('/t/scores?view=past');const restore=document.querySelector('[data-test-active="weekly-1"]');assert.equal(restore.textContent,'Restore test');restore.click();for(let i=0;i<100&&f.writes.length<2;i++)await new Promise(resolve=>setTimeout(resolve,1));assert.equal(f.writes[1].body.active,true);
  }finally{f.close();}
});

test('test papers load only when opened, keeping a normal score-entry visit to one gradebook read',async()=>{
  const f=fixture(),reads=[];const original=f.ctx.api;f.ctx.api=async(path,...args)=>{reads.push(path);return original(path,...args);};
  try{
    await f.render('/t/scores');assert.equal(reads.length,1);assert.match(reads[0],/teacher\/gradebook/);
    document.getElementById('test-papers').open=true;
    for(let i=0;i<100&&!document.getElementById('upload-blank-pdf');i++)await new Promise(resolve=>setTimeout(resolve,1));
    assert.ok(document.getElementById('upload-blank-pdf'));assert.equal(reads.filter(path=>path.includes('/test-documents?')).length,1);
  }finally{f.close();}
});

test('all-weeks gradebook compares paper, online and assessment records without merging them',async()=>{
  const data=gradebookData();data.assessments[0].weight=25;data.assessments.push({id:'quiz-2',kind:'custom',title:'Ratio quiz',week:2,maxScore:25,active:true,weight:0});data.scores.push({id:'zero-quiz',assessmentId:'quiz-2',title:'Ratio quiz',kind:'custom',week:2,score:0,maxScore:25,percent:0,attempt:1});data.weeks[1].days=data.weeks[1].days.map(day=>({...day,online:{answered:0,correct:0,percent:null},paper:null}));
  const f=fixture(data);try{
    await f.render('/t/gradebook');const overview=document.querySelector('.weekly-gradebook');assert.equal(overview.open,false);const rows=overview.querySelectorAll('tbody tr');assert.equal(rows.length,2);assert.match(rows[0].cells[1].textContent,/90%.*1 \/ 7 days entered.*18 \/ 20 correct/);assert.match(rows[0].cells[2].textContent,/75%.*3 \/ 4 answered/);assert.match(rows[0].cells[3].textContent,/15 \/ 21/);assert.match(rows[1].cells[1].textContent,/Enter grades.*0 \/ 7/);assert.match(rows[1].cells[2].textContent,/Not started/);assert.match(rows[1].cells[4].textContent,/Ratio quiz.*0 \/ 25/);assert.equal(rows[1].querySelector('a').getAttribute('href'),'/t/gradebook?week=2');
  }finally{f.close();}
});

test('per-test student score switches respect the master setting and target only that assessment',async()=>{
  const f=fixture();try{
    await f.render('/t/scores?assessment=weekly-1');const form=document.querySelector('[data-test-visibility="weekly-1"]');assert.match(form.textContent,/Main score visibility is off/);form.querySelector('[name=showScores]').checked=false;await submit(f,form.id);assert.equal(f.writes[0].method,'PATCH');assert.match(f.writes[0].path,/assessments\/weekly-1\/visibility\?studentId=s1/);assert.equal(f.writes[0].body.showScores,false);assert.equal(f.writes[0].body.studentId,'s1');assert.equal('active' in f.writes[0].body,false);
  }finally{f.close();}
});
