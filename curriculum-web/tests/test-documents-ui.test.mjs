import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderTestDocuments, validateTestPdf } from '../public/test-documents.mjs';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fixture(overrides={}) {
  const dom=new JSDOM('<section id="panel"></section>',{url:'https://practice.test/t/scores'}),oldDocument=globalThis.document;
  globalThis.document=dom.window.document;
  const requests=[],uploads=[],messages=[];
  const data={documents:[{id:'blank1',kind:'blank',assessmentId:'ratios',filename:'Blank test.pdf',size:3000,createdAt:'2026-11-17T20:00:00Z'},{id:'work1',kind:'completed',assessmentId:'ratios',scoreId:'score1',studentId:'s1',filename:'Marked work.pdf',size:4000,createdAt:'2026-11-17T20:00:00Z'}],reviews:[],ai:{configured:true,enabled:true,maxBytes:10*1024*1024},...overrides};
  const ctx={state:{routeVersion:1},escape,selectedStudent:{id:'s1',name:'Sam'},assessment:{id:'ratios',title:'Ratios, rates and percents'},scores:[{id:'score1',attempt:1,score:19,maxScore:25,takenOn:'2026-11-17',missed:[1,4,9,10,16,25]},{id:'score2',attempt:2,score:23,maxScore:25,takenOn:'2026-11-17',missed:[1,9]}],scoreId:'score1',tell:(...args)=>messages.push(args),api:async(path,body,method=body===undefined?'GET':'POST')=>{requests.push({path,body,method});return method==='GET'?data:{ok:true};},uploadTestPdf:async(path,file)=>{uploads.push({path,file});return {ok:true};}};
  const container=document.getElementById('panel');
  return {dom,ctx,data,requests,uploads,messages,container,render:()=>renderTestDocuments(container,ctx),close(){dom.window.close();globalThis.document=oldDocument;}};
}
async function submit(f,selector){const form=f.container.querySelector(selector);assert.ok(form,selector);form.dispatchEvent(new f.dom.window.Event('submit',{bubbles:true,cancelable:true}));for(let i=0;i<100&&form.dataset.saving==='true'&&form.isConnected;i++)await new Promise(resolve=>setTimeout(resolve,1));assert.ok(!form.isConnected||form.dataset.saving!=='true');await until(()=>f.container.textContent!=='Opening test papers…');return form;}
async function until(predicate){for(let i=0;i<100&&!predicate();i++)await new Promise(resolve=>setTimeout(resolve,1));assert.ok(predicate());}

test('private paper uploads bind completed work to the selected attempt and preserve the filename',async()=>{
  const f=fixture();try{
    await f.render();assert.match(f.container.textContent,/19 \/ 25/);assert.equal(f.container.querySelector('a').getAttribute('href'),'/api/v2/teacher/test-documents/blank1/file');
    const file={name:'Marked attempt.pdf',size:6500,type:'application/pdf'};Object.defineProperty(f.container.querySelector('#completed-pdf'),'files',{value:[file]});
    await submit(f,'#upload-completed-pdf');assert.equal(f.uploads.length,1);
    const url=new URL(f.uploads[0].path,'https://practice.test');assert.equal(url.searchParams.get('studentId'),'s1');assert.equal(url.searchParams.get('assessmentId'),'ratios');assert.equal(url.searchParams.get('scoreId'),'score1');assert.equal(url.searchParams.get('kind'),'completed');assert.ok(url.searchParams.get('requestId'));assert.equal(f.uploads[0].file,file);
  }finally{f.close();}
});

test('upload retries keep their identity and do not submit invalid files',async()=>{
  const f=fixture();try{
    let attempts=0;f.ctx.uploadTestPdf=async(path,file)=>{f.uploads.push({path,file});if(++attempts===1)throw Error('Connection lost');};await f.render();
    const file={name:'Work.pdf',size:2000};Object.defineProperty(f.container.querySelector('#completed-pdf'),'files',{value:[file]});
    const form=await submit(f,'#upload-completed-pdf');assert.match(form.querySelector('.form-error').textContent,/Connection lost/);await submit(f,'#upload-completed-pdf');assert.equal(f.uploads[0].path,f.uploads[1].path);
    Object.defineProperty(f.container.querySelector('#blank-pdf'),'files',{value:[{name:'Answers.exe',size:20}]});await submit(f,'#upload-blank-pdf');assert.equal(f.uploads.length,2);assert.match(f.container.querySelector('#upload-blank-pdf .form-error').textContent,/PDF file/);
  }finally{f.close();}
});

test('analysis needs both PDFs and an entered grade, then sends only the selected score identity',async()=>{
  const f=fixture();try{
    await f.render();await submit(f,'#analyze-test-work');const write=f.requests.find(row=>row.method==='POST');assert.deepEqual({...write.body,requestId:'id'},{studentId:'s1',scoreId:'score1',requestId:'id'});assert.equal(write.path,'/v2/teacher/test-reviews');assert.equal(f.requests.filter(row=>row.path.includes('/scores')).length,0);
    f.data.documents=f.data.documents.filter(doc=>doc.kind==='blank');await f.render();assert.equal(f.container.querySelector('#analyze-test-work button').disabled,true);
    f.ctx.scores=[];await f.render();assert.equal(f.container.querySelector('#upload-completed-pdf'),null);assert.match(f.container.textContent,/Save a score above/);
  }finally{f.close();}
});

test('sharing requires teacher review, never changes the grade, and escapes uploaded feedback',async()=>{
  const f=fixture({reviews:[{id:'r1',scoreId:'score1',status:'ready',shared:false,stale:false,analysis:{summary:'<script>unsafe</script>',questions:[{number:1,status:'mistake',evidence:'<img src=x onerror=alert(1)>',explanation:'Compare equal quantities.',nextStep:'Draw a double number line.'}],focus:[{skillId:'R-RATE',reason:'Find one item first.',nextStep:'Try a unit rate.'}],uncertainties:['Question 9 is faint.']}}]});try{
    await f.render();assert.equal(f.container.querySelector('script'),null);assert.equal(f.container.querySelector('img'),null);assert.match(f.container.textContent,/<script>unsafe<\/script>/);
    await submit(f,'[data-share-review]');assert.equal(f.requests.filter(row=>row.method==='PATCH').length,0);
    f.container.querySelector('[name=checked]').checked=true;await submit(f,'[data-share-review]');const write=f.requests.find(row=>row.method==='PATCH');assert.equal(write.path,'/v2/teacher/test-reviews/r1');assert.equal(write.body.shared,true);assert.equal(write.body.studentId,'s1');assert.equal('score'in write.body,false);
  }finally{f.close();}
});

test('stale reviews cannot be shared but already shared feedback can be withdrawn',async()=>{
  const review={id:'r1',scoreId:'score1',status:'ready',shared:false,stale:true,analysis:{summary:'Old result'}};const f=fixture({reviews:[review]});try{
    await f.render();assert.equal(f.container.querySelector('[data-share-review] button').disabled,true);review.shared=true;await f.render();assert.equal(f.container.querySelector('[data-share-review] button').disabled,false);await submit(f,'[data-share-review]');assert.equal(f.requests.find(row=>row.method==='PATCH').body.shared,false);
  }finally{f.close();}
});

test('changing attempts loads the matching work and obsolete route responses are ignored',async()=>{
  const f=fixture();try{
    await f.render();const picker=f.container.querySelector('#document-score');picker.value='score2';picker.dispatchEvent(new f.dom.window.Event('change',{bubbles:true}));await until(()=>f.container.querySelector('#document-score')?.value==='score2');assert.match(f.container.textContent,/23 \/ 25/);assert.equal(f.container.querySelector('#analyze-test-work button').disabled,true);
    let release;f.ctx.api=()=>new Promise(resolve=>{release=resolve;});const pending=f.render();f.ctx.state.routeVersion=2;release(f.data);await pending;assert.equal(f.container.querySelector('#upload-blank-pdf'),null);
  }finally{f.close();}
});

test('PDF validation rejects empty, oversized and non-PDF files before sending',()=>{
  assert.throws(()=>validateTestPdf(null),/Choose a PDF/);assert.throws(()=>validateTestPdf({name:'a.pdf',size:0}),/empty/);assert.throws(()=>validateTestPdf({name:'a.txt',size:20}),/PDF file/);assert.throws(()=>validateTestPdf({name:'a.pdf',size:11*1024*1024}),/10 MB/);assert.equal(validateTestPdf({name:'A.PDF',size:100}).name,'A.PDF');
});

test('teacher upload, review and share controls work against the private backend without changing the grade',async()=>{
  const {createSQLiteDB}=await import('../server/storage.mjs');
  const {createManagement}=await import('../server/management.mjs');
  const {createTestDocuments}=await import('../server/test-documents.mjs');
  const db=createSQLiteDB();db.migrate();const clock=()=>new Date('2026-11-20T22:00:00Z'),teacher={id:'teacher',role:'teacher'},bytes=new TextEncoder().encode('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
  for(const [id,role] of [['teacher','parent'],['s1','student']])await db.prepare('INSERT INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind(id,id,id,role,'test',clock().toISOString()).run();
  const store=new Map(),bucket={async put(key,data){store.set(key,new Uint8Array(data));},async get(key){const body=store.get(key);return body?{body,arrayBuffer:async()=>body.buffer.slice(body.byteOffset,body.byteOffset+body.byteLength)}:null;},async delete(key){store.delete(key);}};
  const management=createManagement({db,clock});await management.gradebook.initialize();
  const analysis={summary:'Practice equal groups.',questions:[{number:2,status:'mistake',evidence:'The answer uses 4 groups.',explanation:'Count all equal groups before multiplying.',nextStep:'Draw the groups.',skillIds:['N-DIV']}],focus:[{skillId:'N-DIV',reason:'Check the grouping step.',nextStep:'Draw equal groups.'}],uncertainties:[]};
  const service=createTestDocuments({db,bucket,clock,ensureCatalog:management.gradebook.initialize,ai:{apiKey:'fixture-key',fetch:async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(analysis)}]}]})}});
  const f=fixture();try{
    f.ctx.assessment={id:'weekly-1',title:'Week 1 paper check'};
    f.ctx.api=async(path,body,method=body===undefined?'GET':'POST')=>{const request=new Request('https://practice.test/api'+path,{method,headers:body?{'content-type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});const response=await service.handle(request,teacher)??await management.handle(request,teacher);const result=await response.json();if(!response.ok)throw Error(result.error);return result;};
    const saved=await f.ctx.api('/v2/teacher/scores',{studentId:'s1',assessmentId:'weekly-1',score:20,takenOn:'2026-11-20',missed:[2],requestId:'ui-integration-grade'});
    f.ctx.scores=(await f.ctx.api('/v2/teacher/scores?studentId=s1')).scores;f.ctx.scoreId=saved.id;
    f.ctx.uploadTestPdf=async(path,file)=>{const response=await service.handle(new Request('https://practice.test/api'+path,{method:'POST',headers:{'content-type':'application/pdf','x-file-name':encodeURIComponent(file.name)},body:bytes}),teacher);const result=await response.json();if(!response.ok)throw Error(result.error);return result;};
    await f.render();
    for(const kind of ['blank','completed']){Object.defineProperty(f.container.querySelector(`#${kind}-pdf`),'files',{value:[{name:`${kind}.pdf`,size:bytes.length}]});await submit(f,`#upload-${kind}-pdf`);}
    assert.equal(f.container.querySelector('#analyze-test-work button').disabled,false);await submit(f,'#analyze-test-work');assert.match(f.container.textContent,/Draft · teacher review/);assert.match(f.container.querySelector('.test-review-coverage').textContent,/Reviewed 1 of 1 teacher-marked misses/);
    f.container.querySelector('[name=checked]').checked=true;await submit(f,'[data-share-review]');assert.equal((await service.profile('s1')).reviews.length,1);assert.equal((await db.prepare('SELECT score FROM platform_scores WHERE id=?').bind(saved.id).first()).score,20);assert.equal((await db.prepare('SELECT COUNT(*) n FROM platform_attempts').first()).n,0);
  }finally{f.close();db.close();}
});
