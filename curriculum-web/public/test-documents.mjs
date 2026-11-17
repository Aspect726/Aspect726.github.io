const list = value => Array.isArray(value) ? value : [];
const number = value => Number(value || 0).toLocaleString('en-US');
const dateLabel = value => value ? new Date(value.length === 10 ? `${value}T12:00:00Z` : value).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'America/Los_Angeles'}) : 'Date not recorded';
const errorBox = '<p class="form-error" role="alert" hidden></p>';

export function validateTestPdf(file,maxBytes=10*1024*1024) {
  if(!file || !file.name)throw Error('Choose a PDF to upload.');
  if(!/\.pdf$/i.test(file.name))throw Error('Choose a PDF file.');
  if(!Number.isFinite(file.size)||file.size<5)throw Error('That PDF is empty. Choose the saved test file.');
  if(file.size>maxBytes)throw Error(`Choose a PDF no larger than ${Math.floor(maxBytes/1024/1024)} MB.`);
  return file;
}

async function uploadPdf(path,file,api) {
  api.invalidate?.();
  try {
    const response=await fetch('/api'+path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/pdf','X-File-Name':encodeURIComponent(file.name)},body:file});
    const result=await response.json().catch(()=>({error:'The upload response could not be read. Try again.'}));
    if(!response.ok)throw Object.assign(Error(result.error||'That PDF could not be saved.'),{status:response.status});
    return result;
  } finally {api.invalidate?.();}
}

function feedbackMarkup(review,e,name) {
  const analysis=review.analysis||{},shared=Boolean(review.shared),ready=review.status==='ready';
  const status=review.stale?'Needs a new review':shared?'Shared with the student':ready?'Draft · teacher review':review.status==='pending'?'Review in progress':'Review unavailable';
  const coverage=review.coverage;
  const coverageText=coverage&&coverage.knownMissed!==null&&coverage.knownMissed!==undefined?`Reviewed ${number(coverage.reviewedMisses)} of ${number(coverage.knownMissed)} teacher-marked misses${coverage.complete?'':'. This draft is incomplete'}.`:'This draft may cover only some questions. Check the whole test alongside it.';
  return `<article class="test-feedback" data-review="${e(review.id)}"><div class="test-feedback-heading"><div><h4>Feedback on this attempt</h4><small>${e(dateLabel(review.createdAt))}</small></div><span class="grade-band">${e(status)}</span></div>${review.stale?'<p class="test-feedback-caution">The score or papers changed after this review. Run a new review before sharing it.</p>':''}${review.status==='failed'?`<p role="status">${e(review.message||'The papers could not be reviewed this time. Your files and entered grade are still saved. Try a new review.')}</p>`:''}${review.status==='pending'?'<p role="status">The review is still running. Use Refresh below to check for the result.</p>':''}${ready?`<p class="test-review-coverage">${e(coverageText)}</p>${analysis.summary?`<p>${e(analysis.summary)}</p>`:''}${list(analysis.questions).length?`<ol class="test-feedback-questions">${analysis.questions.map(question=>`<li><div class="test-feedback-question-heading"><strong>Question ${number(question.number)}</strong><span>${e(({mistake:'Review this step',unclear:'Needs a closer look',correct:'Evidence of understanding'})[question.status]||'Review this question')}</span></div>${question.evidence?`<details><summary>What the review found in the work</summary><p>${e(question.evidence)}</p></details>`:''}${question.explanation?`<p>${e(question.explanation)}</p>`:''}${question.nextStep?`<p class="test-feedback-next"><strong>Try next:</strong> ${e(question.nextStep)}</p>`:''}</li>`).join('')}</ol>`:''}${list(analysis.focus).length?`<h4>Focus next</h4><ul class="test-feedback-focus">${analysis.focus.map(item=>`<li><strong>${e(item.skillName||item.skillId||'Review focus')}</strong>${item.reason?`<p>${e(item.reason)}</p>`:''}${item.nextStep?`<p>${e(item.nextStep)}</p>`:''}</li>`).join('')}</ul>`:''}${list(analysis.uncertainties).length?`<div class="test-feedback-caution"><strong>Check these before sharing</strong><ul>${analysis.uncertainties.map(item=>`<li>${e(typeof item==='string'?item:item.detail||item.reason||'Part of the work could not be read clearly.')}</li>`).join('')}</ul></div>`:''}<p class="small">The helper suggests feedback from the uploaded work. Your recorded score stays unchanged. Check the question numbers and explanations before sharing.</p><form data-share-review="${e(review.id)}"><input type="hidden" name="shared" value="${shared?'false':'true'}">${!shared&&!review.stale?`<label class="checkbox-label"><input type="checkbox" name="checked" required> I checked this feedback against the completed work.</label>`:''}${errorBox}<button type="submit" class="button ${shared?'secondary':''}" ${review.stale&&!shared?'disabled':''}>${shared?'Stop sharing feedback':`Share feedback with ${e(name)}`}</button><span role="status" aria-live="polite"></span></form>`:''}</article>`;
}

export async function renderTestDocuments(container,ctx) {
  const {api,escape:e,state,selectedStudent,assessment}=ctx;
  if(!container||!assessment||!selectedStudent)return;
  const marker=crypto.randomUUID(),version=state.routeVersion;
  container.dataset.documentView=marker;
  const isCurrent=()=>container.isConnected&&container.dataset.documentView===marker&&state.routeVersion===version;
  const scores=list(ctx.scores),selected=scores.find(score=>score.id===ctx.scoreId)||scores[0]||null;
  const query=extra=>new URLSearchParams({studentId:selectedStudent.id,assessmentId:assessment.id,...extra}).toString();
  const path=`/v2/teacher/test-documents?${query()}`;
  container.innerHTML='<p role="status">Opening test papers…</p>';
  let data;
  try{data=await api(path);}catch(error){if(!isCurrent())return;container.innerHTML=`<h3>Test papers & feedback</h3><p role="alert">${e(error.message)}</p><button class="button secondary" type="button" data-doc-retry>Try again</button>`;container.querySelector('[data-doc-retry]')?.addEventListener('click',()=>renderTestDocuments(container,ctx));return;}
  if(!isCurrent())return;
  const documents=list(data.documents),reviews=list(data.reviews).filter(review=>review.scoreId===selected?.id),config=data.ai||{};
  const maxBytes=Number(config.maxBytes)||10*1024*1024;
  const matching=kind=>documents.filter(doc=>doc.kind===kind&&(kind==='blank'||doc.scoreId===selected?.id)).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const blank=matching('blank')[0],completed=matching('completed')[0];
  const orderedReviews=reviews.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const available=Boolean(config.configured&&config.enabled&&blank&&completed&&selected);
  const docMarkup=doc=>doc?`<div class="test-document-saved"><span aria-hidden="true">▤</span><div><a href="/api/v2/teacher/test-documents/${encodeURIComponent(doc.id)}/file" target="_blank" rel="noopener">${e(doc.filename)}</a><small>${number(Math.ceil(Number(doc.size||0)/1024))} KB · ${e(dateLabel(doc.createdAt))}</small></div><span class="grade-band">Saved</span></div>`:'<p class="test-document-empty">No PDF uploaded yet.</p>';
  const uploadForm=(kind,title,description,doc,disabled=false)=>`<section class="test-document-upload"><h4>${e(title)}</h4><p class="small">${e(description)}</p>${docMarkup(doc)}${!disabled?`<form id="upload-${kind}-pdf"><label for="${kind}-pdf">${doc?'Replace PDF':'Choose a PDF'}</label><input id="${kind}-pdf" name="file" type="file" accept="application/pdf,.pdf" required><p class="small">PDF · up to ${number(Math.floor(maxBytes/1024/1024))} MB</p>${errorBox}<div class="form-actions"><button class="button secondary" type="submit">${doc?'Replace PDF':'Upload PDF'}</button><span role="status" aria-live="polite"></span></div></form>`:'<p class="small">Save a score above to attach the completed work to that attempt.</p>'}</section>`;
  const aiHelp=!config.configured?'The paper-review helper is not connected yet. You can still upload files and enter grades.':!config.enabled?'The paper-review helper is turned off in Settings.':!selected?'Save the teacher-graded score first.':!blank||!completed?'Upload the blank test and the completed work to review this attempt.':'The helper will compare both PDFs with your entered grade, then prepare feedback for you to check.';
  container.innerHTML=`<div class="test-papers-heading"><div><p class="eyebrow">Papers & feedback</p><h3>${e(assessment.title)}</h3></div><span class="grade-band">Private classroom</span></div>${scores.length?`<div class="field test-attempt-picker"><label for="document-score">Completed work for</label><select id="document-score">${scores.map(score=>`<option value="${e(score.id)}" ${score.id===selected.id?'selected':''}>${score.attempt===1?'First attempt':`Retake ${Number(score.attempt)-1}`} · ${number(score.score)} / ${number(score.maxScore)} · ${score.takenOn?e(dateLabel(score.takenOn)):'date not recorded'}</option>`).join('')}</select></div>`:''}<div class="test-document-grid">${uploadForm('blank','1. Blank test','The original questions, without student answers.',blank)}${uploadForm('completed','2. Completed work',selected?`Attach the graded work for this attempt: ${selected.score} / ${selected.maxScore}.`:'The student’s written answers and your marking.',completed,!selected)}</div><section class="test-review-start"><div><h4>3. Review the work</h4><p>${e(aiHelp)}</p>${selected?`<p class="small">Recorded grade: <strong>${number(selected.score)} / ${number(selected.maxScore)}</strong>${selected.missed===null||selected.missed===undefined?' · missed question numbers not entered':` · ${number(selected.missed.length)} missed question numbers entered`}. This review cannot change it.</p>`:''}</div><form id="analyze-test-work">${errorBox}<button class="button" type="submit" ${available?'':'disabled'}>${reviews.some(review=>review.status==='ready')?'Run a new review':'Review uploaded work'}</button><span role="status" aria-live="polite"></span></form></section>${reviews.length?`<div class="test-review-history">${feedbackMarkup(orderedReviews[0],e,selectedStudent.name)}${orderedReviews.length>1?`<details class="earlier-test-reviews"><summary>Earlier reviews (${orderedReviews.length-1})</summary>${orderedReviews.slice(1).map(review=>feedbackMarkup(review,e,selectedStudent.name)).join('')}</details>`:''}</div>`:'<p class="small">Shared feedback appears with this student’s test results and helps guide future explanations.</p>'}<button class="text-link" type="button" data-refresh-documents>Refresh papers & feedback</button>`;
  const refresh=()=>renderTestDocuments(container,{...ctx,scoreId:selected?.id});
  container.querySelector('[data-refresh-documents]')?.addEventListener('click',refresh);
  container.querySelector('#document-score')?.addEventListener('change',event=>renderTestDocuments(container,{...ctx,scoreId:event.target.value}));
  function bind(form,callback,message,busyText){
    if(!form)return;
    let requestId=crypto.randomUUID();
    form.addEventListener('change',()=>{if(form.dataset.saving!=='true')requestId=crypto.randomUUID();});
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(form.dataset.saving==='true'||!isCurrent())return;
      const button=form.querySelector('[type=submit]');if(button?.disabled)return;
      const error=form.querySelector('.form-error'),status=form.querySelector('[role=status]');
      form.dataset.saving='true';if(button)button.disabled=true;if(error)error.hidden=true;if(status)status.textContent=busyText||'Saving…';
      try{await callback(requestId,form);if(!isCurrent())return;ctx.tell?.(message);await refresh();}
      catch(failure){if(!isCurrent())return;if(error){error.textContent=failure.message;error.hidden=false;}if(status)status.textContent='';}
      finally{if(form.isConnected){form.dataset.saving='false';if(button)button.disabled=false;}}
    });
  }
  for(const kind of ['blank','completed'])bind(container.querySelector(`#upload-${kind}-pdf`),async requestId=>{
    const file=validateTestPdf(container.querySelector(`#${kind}-pdf`)?.files?.[0],maxBytes);
    const endpoint=`/v2/teacher/test-documents/upload?${query({kind,requestId,...kind==='completed'?{scoreId:selected.id}:{}})}`;
    await (ctx.uploadTestPdf||((path,file)=>uploadPdf(path,file,api)))(endpoint,file);
  },'PDF saved.','Uploading PDF…');
  bind(container.querySelector('#analyze-test-work'),async requestId=>{
    await api('/v2/teacher/test-reviews',{studentId:selectedStudent.id,scoreId:selected.id,requestId});
  },'Review request saved.','Reviewing both PDFs…');
  for(const form of container.querySelectorAll('[data-share-review]'))bind(form,async requestId=>{
    const shared=form.querySelector('[name=shared]').value==='true';
    if(shared&&!form.querySelector('[name=checked]')?.checked)throw Error('Check the feedback against the work before sharing it.');
    await api(`/v2/teacher/test-reviews/${encodeURIComponent(form.dataset.shareReview)}`,{studentId:selectedStudent.id,shared,requestId},'PATCH');
  },form.querySelector('[name=shared]').value==='true'?'Feedback shared with the student.':'Feedback is no longer shared.');
}
