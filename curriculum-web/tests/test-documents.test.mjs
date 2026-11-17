import test from 'node:test';
import assert from 'node:assert/strict';
import {createSQLiteDB} from '../server/storage.mjs';
import {createManagement} from '../server/management.mjs';
import {createTestDocuments,TEST_DOCUMENT_MAX_BYTES} from '../server/test-documents.mjs';

const PDF=new TextEncoder().encode('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
const teacher={id:'teacher',role:'teacher'},learner={id:'learner',role:'student'},other={id:'other',role:'student'};
function memoryBucket(){const entries=new Map();return {entries,async put(key,bytes){entries.set(key,new Uint8Array(bytes));},async get(key){const bytes=entries.get(key);return bytes?{body:bytes,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}:null;},async delete(key){entries.delete(key);}};}
async function fixture({ai={},initialDocuments=[]}={}){
 const db=createSQLiteDB();db.migrate();const clock=()=>new Date('2026-11-20T22:00:00Z');
 for(const [id,role] of [['teacher','parent'],['learner','student'],['other','student']])await db.prepare('INSERT INTO practice_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind(id,id,id,role,'test',clock().toISOString()).run();
 const management=createManagement({db,clock});await management.gradebook.initialize();
 const bucket=memoryBucket();const service=createTestDocuments({db,clock,bucket,ai:{apiKey:'test-secret-provider-key',...ai},initialDocuments,ensureCatalog:management.gradebook.initialize});
 const call=async(path,data,user=teacher,method=data===undefined?'GET':'POST')=>{
  const request=new Request(`https://practice.test/api/v2/${path}`,{method,headers:data===undefined?{}:{'content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});
  try{const res=await service.handle(request,user)??await management.handle(request,user);return {status:res.status,value:res.headers.get('content-type')?.includes('json')?await res.json():new Uint8Array(await res.arrayBuffer()),headers:res.headers};}catch(e){if(!e.status)throw e;return {status:e.status,value:{error:e.message}};}
 };
 const upload=async(kind,scoreId=null,{sid='learner',aid='weekly-1',rid='upload-'+crypto.randomUUID(),bytes=PDF,filename='work.pdf',contentType='application/pdf',user=teacher}={})=>{
  const query=new URLSearchParams({studentId:sid,assessmentId:aid,kind,requestId:rid,...scoreId?{scoreId}:{}});
  try{const res=await service.handle(new Request('https://practice.test/api/v2/teacher/test-documents/upload?'+query,{method:'POST',headers:{'content-type':contentType,'x-file-name':encodeURIComponent(filename)},body:bytes}),user);return {status:res.status,value:await res.json()};}catch(e){if(!e.status)throw e;return {status:e.status,value:{error:e.message}};}
 };
 const score=async(sid='learner',more={})=>(await call('teacher/scores',{studentId:sid,assessmentId:'weekly-1',score:19,takenOn:'2026-11-20',missed:[2,7],requestId:'grade-'+crypto.randomUUID(),...more})).value.id;
 return {db,bucket,service,call,upload,score,close:()=>db.close()};
}
const reviewData={summary:'Review equal groups and explain your units.',questions:[{number:2,status:'mistake',evidence:'The written response shows 4 groups.',explanation:'Check the number of equal groups before multiplying.',nextStep:'Draw the groups first.',skillIds:['N-DIV']}],focus:[{skillId:'N-DIV',reason:'The grouping step needs another look.',nextStep:'Draw equal groups and count them.'}],uncertainties:[]};
const provider=(data=reviewData,inspect=()=>{})=>async(url,options)=>{inspect(url,options);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(data)}]}],usage:{input_tokens:120,output_tokens:160}});};

test('PDF uploads are private, scoped, bounded and replay safe',async()=>{
 const f=await fixture();try{
  const score=await f.score(),data={rid:'upload-fixed-request',filename:'../Completed work.pdf'};
  assert.equal((await f.upload('blank',null,{user:learner})).status,403);
  const first=await f.upload('completed',score,data);assert.equal(first.status,201);assert.equal(first.value.document.filename,'Completed work.pdf');assert.equal('storage_key'in first.value.document,false);
  assert.equal((await f.upload('completed',score,data)).status,200);assert.equal(f.bucket.entries.size,1);
  assert.equal((await f.upload('completed',score,{...data,filename:'other.pdf'})).status,409);
  assert.equal((await f.upload('completed',score,{sid:'other'})).status,404);
  assert.equal((await f.upload('completed',score,{bytes:new TextEncoder().encode('<html>fake pdf</html>')})).status,400);
  assert.equal((await f.upload('blank',null,{contentType:'application/pdf-bogus'})).status,415);
  assert.equal((await f.upload('blank',null,{bytes:new Uint8Array(TEST_DOCUMENT_MAX_BYTES+1)})).status,413);
  const path=first.value.document.url.replace('/api/v2/','');assert.equal((await f.call(path,undefined,learner)).status,403);
  const file=await f.call(path);assert.equal(file.status,200);assert.deepEqual(file.value,PDF);assert.match(file.headers.get('cache-control'),/no-store/);assert.match(file.headers.get('content-disposition'),/attachment/);
 }finally{f.close();}
});

test('bundled blank PDFs initialize idempotently without a public path',async()=>{
 const f=await fixture({initialDocuments:[{seedId:'synthetic-test',assessmentId:'weekly-1',filename:'blank.pdf',base64:Buffer.from(PDF).toString('base64')}]});try{
  await f.service.ensureInitialDocuments();await f.service.ensureInitialDocuments();assert.equal(f.bucket.entries.size,1);
  const list=await f.call('teacher/test-documents?studentId=learner&assessmentId=weekly-1');assert.equal(list.value.documents.length,1);assert.equal(list.value.documents[0].kind,'blank');assert.equal('base64'in list.value.documents[0],false);
 }finally{f.close();}
});

test('review sends only the selected PDFs and numerical teacher record, caches output, and never regrades',async()=>{
 let calls=0;const f=await fixture({ai:{fetch:provider(reviewData,(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.model,'gpt-5-nano');assert.equal(body.max_output_tokens,6000);assert.equal(body.input[0].content.filter(c=>c.type==='input_file').length,2);const reference=JSON.parse(body.input[0].content[0].text);assert.equal(reference.teacherRecord.score,19);assert.deepEqual(reference.teacherRecord.missed,[2,7]);assert.equal('note'in reference.teacherRecord,false);})}});try{
  const score=await f.score();await f.upload('blank');await f.upload('completed',score);
  const request={studentId:'learner',scoreId:score,requestId:'review-request-one'};
  const first=await f.call('teacher/test-reviews',request);assert.equal(first.status,200);assert.equal(first.value.review.status,'ready');assert.equal(first.value.review.shared,false);
  assert.equal((await f.call('teacher/test-reviews',request)).value.cached,true);
  assert.equal((await f.call('teacher/test-reviews',{...request,requestId:'review-request-two'})).value.cached,true);assert.equal(calls,1);
  assert.equal((await f.db.prepare('SELECT score FROM platform_scores WHERE id=?').bind(score).first()).score,19);
  assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM platform_attempts').first()).n,0);
 }finally{f.close();}
});

test('only teacher-approved current feedback reaches the owning student and hidden scores hide feedback',async()=>{
 const f=await fixture({ai:{fetch:provider()}});try{
  const score=await f.score();await f.upload('blank');await f.upload('completed',score);
  const result=(await f.call('teacher/test-reviews',{studentId:'learner',scoreId:score,requestId:'review-for-sharing'})).value.review;
  assert.deepEqual((await f.call('student/test-reviews',undefined,learner)).value.reviews,[]);
  assert.equal((await f.call(`teacher/test-reviews/${encodeURIComponent(result.id)}`,{studentId:'learner',shared:true,requestId:'approve-first-review'},learner,'PATCH')).status,403);
  await f.call(`teacher/test-reviews/${encodeURIComponent(result.id)}`,{studentId:'learner',shared:true,requestId:'approve-first-review'},teacher,'PATCH');
  const shared=(await f.call('student/test-reviews?studentId=other',undefined,learner)).value;assert.equal(shared.reviews.length,1);assert.equal(shared.reviews[0].score,19);assert.equal('model'in shared.reviews[0],false);assert.equal('sharedBy'in shared.reviews[0],false);
  assert.deepEqual((await f.call('student/test-reviews?studentId=learner',undefined,other)).value.reviews,[]);
  const context=await f.service.profile('learner',{skill:'N-DIV',limit:3});assert.equal(context.reviews.length,1);assert.deepEqual((await f.service.profile('learner',{skill:'D-SUB'})).reviews,[]);
  await f.call('teacher/gradebook/settings',{studentId:'learner',showScores:false,requestId:'hide-scores-review'},teacher,'PATCH');assert.deepEqual((await f.service.profile('learner')).reviews,[]);
  await f.call('teacher/gradebook/settings',{studentId:'learner',showScores:true,requestId:'show-scores-review'},teacher,'PATCH');
  await f.call(`teacher/scores/${encodeURIComponent(score)}`,{studentId:'learner',score:18,missed:[2,7,8],requestId:'correct-score-for-review'},teacher,'PATCH');
  assert.deepEqual((await f.service.profile('learner')).reviews,[]);
  assert.equal((await f.call(`teacher/test-reviews/${encodeURIComponent(result.id)}`,{studentId:'learner',shared:true,requestId:'approve-stale-review'},teacher,'PATCH')).status,409);
 }finally{f.close();}
});

test('AI uncertainty and provider failure remain unshared and cannot change authoritative grades',async()=>{
 const malformed={...reviewData,questions:[{...reviewData.questions[0],number:3}]};const f=await fixture({ai:{fetch:provider(malformed)}});try{
  const score=await f.score();await f.upload('blank');await f.upload('completed',score);
  const response=await f.call('teacher/test-reviews',{studentId:'learner',scoreId:score,requestId:'bad-provider-result'});assert.equal(response.value.review.status,'failed');assert.equal(response.value.review.issue,'invalid_response');assert.equal(response.value.review.analysis,null);assert.deepEqual((await f.service.profile('learner')).reviews,[]);
  assert.equal((await f.db.prepare('SELECT score FROM platform_scores WHERE id=?').bind(score).first()).score,19);
 }finally{f.close();}
});

test('concurrent review requests reserve one provider call and a changed upload makes prior feedback stale',async()=>{
 let release,calls=0;const gate=new Promise(resolve=>release=resolve),f=await fixture({ai:{fetch:async(...args)=>{calls++;await gate;return provider()(...args);}}});try{
  const score=await f.score();await f.upload('blank');await f.upload('completed',score);const request={studentId:'learner',scoreId:score,requestId:'concurrent-review'};
  const a=f.call('teacher/test-reviews',request);while(!calls)await new Promise(r=>setTimeout(r,1));
  const b=await f.call('teacher/test-reviews',request);assert.equal(b.value.review.status,'pending');release();const completed=await a;assert.equal(calls,1);
  await f.upload('completed',score,{bytes:new Uint8Array([...PDF,10,32])});const overview=await f.call('teacher/test-documents?studentId=learner&assessmentId=weekly-1');assert.equal(overview.value.reviews[0].stale,true);
 }finally{release();f.close();}
});

test('a request ID raced across different students cannot cross-write or double-charge review work',async()=>{
 let release,calls=0;const gate=new Promise(resolve=>release=resolve),f=await fixture({ai:{fetch:async(...args)=>{calls++;await gate;return provider()(...args);}}});try{
  const first=await f.score(),second=await f.score('other');await f.upload('blank');await f.upload('completed',first);await f.upload('completed',second,{sid:'other'});
  const a=f.call('teacher/test-reviews',{studentId:'learner',scoreId:first,requestId:'raced-between-students'}),b=f.call('teacher/test-reviews',{studentId:'other',scoreId:second,requestId:'raced-between-students'});
  while(!calls)await new Promise(r=>setTimeout(r,1));release();const results=await Promise.all([a,b]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(calls,1);
  const rows=(await f.db.prepare('SELECT * FROM platform_test_reviews').all()).results;assert.equal(rows.length,1);assert.equal(rows[0].status,'ready');
 }finally{release();f.close();}
});

test('daily review allowance is atomic and cached feedback does not consume more allowance',async()=>{
 let calls=0;const f=await fixture({ai:{fetch:provider(reviewData,()=>calls++)}});try{
  const score=await f.score();await f.upload('blank');
  for(let n=0;n<6;n++){await f.upload('completed',score,{bytes:new Uint8Array([...PDF,n])});const result=await f.call('teacher/test-reviews',{studentId:'learner',scoreId:score,requestId:'budget-review-'+n});assert.equal(result.status,200);}
  assert.equal(calls,6);
  assert.equal((await f.call('teacher/test-reviews',{studentId:'learner',scoreId:score,requestId:'budget-cached-review'})).status,200);assert.equal(calls,6);
  await f.upload('completed',score,{bytes:new Uint8Array([...PDF,99])});assert.equal((await f.call('teacher/test-reviews',{studentId:'learner',scoreId:score,requestId:'budget-over-limit'})).status,429);assert.equal(calls,6);
 }finally{f.close();}
});

test('changing and reverting a score never resurrects old shared feedback, and profile lookup has bounded queries',async()=>{
 const f=await fixture({ai:{fetch:provider()}});try{
  const score=await f.score();await f.upload('blank');await f.upload('completed',score);const review=(await f.call('teacher/test-reviews',{studentId:'learner',scoreId:score,requestId:'versioned-grade-review'})).value.review;
  await f.call(`teacher/test-reviews/${encodeURIComponent(review.id)}`,{studentId:'learner',shared:true,requestId:'versioned-grade-share'},teacher,'PATCH');
  let queries=0;const original=f.db.prepare;f.db.prepare=(...args)=>{queries++;return original(...args);};
  assert.equal((await f.service.profile('learner',{skill:'N-DIV'})).reviews.length,1);assert.ok(queries<=4,`Expected <=4 database reads, got ${queries}`);f.db.prepare=original;
  await f.call(`teacher/scores/${encodeURIComponent(score)}`,{studentId:'learner',score:18,missed:[2,7,8],requestId:'revision-change-one'},teacher,'PATCH');
  await f.call(`teacher/scores/${encodeURIComponent(score)}`,{studentId:'learner',score:19,missed:[2,7],requestId:'revision-change-back'},teacher,'PATCH');
  assert.deepEqual((await f.service.profile('learner')).reviews,[]);
 }finally{f.close();}
});

test('an unavailable retired model retries only the documented small vision replacement',async()=>{
 const models=[],f=await fixture({ai:{fetch:async(url,options)=>{const selected=JSON.parse(options.body).model;models.push(selected);return selected==='gpt-5-nano'?Response.json({error:{code:'model_not_found'}},{status:404}):provider()(url,options);}}});try{
  const score=await f.score();await f.upload('blank');await f.upload('completed',score);const review=(await f.call('teacher/test-reviews',{studentId:'learner',scoreId:score,requestId:'unavailable-model-review'})).value.review;
  assert.deepEqual(models,['gpt-5-nano','gpt-6-luna']);assert.equal(review.status,'ready');assert.equal(review.model,'gpt-6-luna');
 }finally{f.close();}
});

test('hiding one assessment removes its approved review from student results and tutor history',async()=>{
 const f=await fixture({ai:{fetch:provider()}});try{
  const score=await f.score();await f.upload('blank');await f.upload('completed',score);const review=(await f.call('teacher/test-reviews',{studentId:'learner',scoreId:score,requestId:'per-test-hidden-review'})).value.review;
  await f.call(`teacher/test-reviews/${encodeURIComponent(review.id)}`,{studentId:'learner',shared:true,requestId:'per-test-shared-review'},teacher,'PATCH');
  assert.equal((await f.service.profile('learner',{skill:'N-DIV'})).reviews.length,1);
  assert.equal((await f.call('teacher/assessments/weekly-1/visibility',{studentId:'learner',showScores:false,requestId:'hide-one-assessment'},teacher,'PATCH')).status,200);
  assert.deepEqual((await f.call('student/test-reviews',undefined,learner)).value.reviews,[]);
  assert.deepEqual((await f.service.profile('learner',{skill:'N-DIV'})).reviews,[]);
  assert.equal((await f.call('teacher/test-documents?studentId=learner&assessmentId=weekly-1')).value.reviews.length,1,'teacher retains access to hidden results');
 }finally{f.close();}
});
