#!/usr/bin/env node
/** Import a read-only source tree into an immutable, auditable curriculum snapshot.
 * Usage: node scripts/import-curriculum.mjs /path/to/have [source-git-commit]
 * Source expressions are never evaluated as JavaScript or Python code.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] || '/workspace/scratch/curriculum-source/Nov5/have');
const sourceCommit = process.argv[3] || execFileSync('git', ['rev-parse', 'origin/Curriculum'], {cwd:root,encoding:'utf8'}).trim();
const names = ['expanded_student_manifest.json','expanded_answers.json','expanded_deck_meta.json','expanded_lesson_extensions.json'];
const raw = names.map(name=>fs.readFileSync(path.join(source,'work',name),'utf8'));
const [manifest, answers, slides, extensions] = raw.map(JSON.parse);
const policyFiles=['scripts/import-curriculum.mjs','scripts/import-audit.py','scripts/generate-extra.mjs','server/grading.mjs'];
const policyText=policyFiles.filter(file=>fs.existsSync(path.join(root,file))).map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');
const version = 'double-advanced-' + crypto.createHash('sha256').update(raw.join('\n')+'\n'+sourceCommit+'\n'+policyText).digest('hex').slice(0,12);
const output = path.join(source,'outputs','DoubleAdvanced_Expanded');
const shortDays = ['Sat','Sun','Mon','Tue','Wed','Thu','Fri'];
const longDays = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'];
const conflicts = [];
const coverage = {days:0,weeks:0,requiredQuestions:0,challenges:0,optionalQuestions:0,extraPractice:0};
const z = (n,w=3)=>String(n).padStart(w,'0');
const clone = x=>JSON.parse(JSON.stringify(x));
const strip = s=>String(s||'').replace(/[{}]/g,'').replace(/−/g,'-').trim();

// Importer deliberately defaults ambiguous answers to a human rubric.
let inferGrading = q=>({type:'teacher-review',rubric:'Check every requested result, method, diagram, and unit against the worked answer.'});
for (const candidate of ['lib/grading.mjs','server/grading.mjs','grading.mjs']) {
  if(fs.existsSync(path.join(root,candidate))) {
    const mod=await import(pathToFileURL(path.join(root,candidate)).href);
    if(mod.inferGrading) inferGrading=mod.inferGrading;
    break;
  }
}

const methods={
 'N-FACT':'Use a known multiplication fact or its related division fact. Check that the inverse operation takes you back to the starting amount.',
 'N-MULT':'Partition one factor by place value, multiply each part, then add the partial products.',
 'N-DIV':'Divide in place-value order. Check the quotient by multiplying it by the divisor.',
 'F-COMP':'Keep the same whole. Rename the fractions with equal-sized parts, or compare each with a common benchmark.',
 'F-LINE':'Label the whole and divide every unit interval into equal parts before placing the number.',
 'F-ADD':'Rename both fractions with a common denominator. Combine the numerators and keep the size of each part fixed.',
 'F-MULT':'Represent one fraction of the other amount. Multiply the numerators and denominators, then simplify.',
 'F-DIV':'Ask how many groups fit, or how large each equal share is. Check by multiplying the quotient by the divisor.',
 'F-SCALE':'Compare the multiplier with 1 before calculating. A positive multiplier below 1 makes an amount smaller.',
 'D-OPS':'Use place value to keep decimal units consistent. Estimate first, calculate, then check the size of the result.',
 'D-COMP':'Align place values. Compare the first place where the digits differ.',
 'R-RATIO':'Keep the order of the quantities fixed. Multiply or divide both quantities by the same scale factor.',
 'R-RATE':'Divide the amount by the number of units. Label what one unit means.',
 'R-PERCENT':'A percent is a rate per hundred. Write the percentage as a fraction of 100, then multiply by the whole.',
 'E-EXPR':'Substitute values where given and use the order of operations. Combine only like terms.',
 'E-EQU':'Keep both sides equal: apply the same inverse operation to each side. Substitute the result to check.',
 'G-AREA':'Identify the base and perpendicular height. Use the matching area rule and include square units.',
 'G-VOL':'Count the cubic units in one layer and multiply by the number of layers.',
 'N-SIGNED':'Mark zero and use direction and distance carefully. Moving right increases the value.',
 'N-COORD':'Read the horizontal coordinate first, then the vertical coordinate. Compare one coordinate at a time.',
};
const methodFor=q=>methods[q.skill] || 'Identify the quantities and what the question asks. Show a calculation or model, then check the result against the original conditions.';

const answerLookup=new Map();
for(const week of answers.weeks) for(const section of week.sections) for(const item of section.items) {
  answerLookup.set(`${section.day}/${section.id}/${item.id}`,item);
}
const sourceSupplemented=[];
function question(item, section, day, optional=false) {
  const logicalId=`D${z(day.day)}-${section.id}-${item.id}`;
  const matching=answerLookup.get(`${day.day}/${section.id}/${item.id}`);
  if(!matching || matching.text!==item.text || matching.answer!==item.answer || (matching.worked||'')!==(item.worked||''))
    conflicts.push({id:logicalId,kind:'answer-key-mismatch',resolution:'Manifest retained; teacher review required.'});
  const related=day.session?slides.filter(s=>s.session===day.session && (s.problem_numbers||[]).includes(String(item.id))):[];
  const hint = item.discussion?.if_stuck || related.find(s=>s.notes?.if_stuck)?.notes.if_stuck;
  const q={
    id:`${version}-${logicalId}`,logicalId,sourceId:String(item.id),version,origin:optional?'optional-assessment':'required-curriculum',
    week:day.week,day:day.day,dayId:`day-${z(day.day)}`,topic:section.title,prompt:item.text,skill:item.skill,
    case:item.case||null,challenge:Boolean(item.challenge),answer:item.answer,
    solution:item.worked||`${methodFor(item)}\nCheck: ${item.answer}`,
    solutionOrigin:item.worked?'curriculum-source':'authored-method-supplement',
    hints:[hint||methodFor(item),'Show each step on paper. Check that every number and unit in your answer matches what the question asks.'],
    commonMistake:item.wrong?{answer:item.wrong,feedback:item.error||'Check the size and meaning of each quantity.'}:null,
    diagram:item.diagram||null,
    reference:{curriculumVersion:version,sourceCommit,section:section.id,sectionTitle:section.title,questionNumber:String(item.id),
      packetFile:path.basename(day.packet_file),packetPage:item.packet_page,studentPage:item.student_page,
      packetUrl:`resources/packets/${path.basename(day.packet_file)}#page=${item.packet_page}`,
      workbookUrl:`resources/Student_Day_by_Day.pdf#page=${item.student_page}`,
      slides:related.filter(s=>!s.hidden).map(s=>s.number),teacherSlides:related.filter(s=>s.hidden).map(s=>s.number),
      teacherGuide:`Week_${z(day.week,2)}_Teacher_Guide.pdf`,sourcePath:`Nov5/have/outputs/DoubleAdvanced_Expanded/Daily_Packets/${path.basename(day.packet_file)}`},
    sourceCheck:item.check||null,
  };
  if(!item.worked)sourceSupplemented.push(logicalId);
  q.grading=inferGrading(q);
  q.type=q.grading.type;
  if(/\b(explain|draw|sketch|justify|stories? vary|in your own words|repair (?:her|his|the) claim)\b/i.test(q.prompt+' '+q.answer)) q.grading.requiresReasoning=true;
  if(q.challenge){
    // The source has prose solutions, not a machine-readable subpart contract.
    // Preserve the complete task and mark each rubric aspect for human review.
    q.grading={type:'teacher-review',rubric:'Check all requested quantities and comparisons, the supporting calculation or diagram, and the units. Approve only when every part is supported.',requiresReasoning:true};
    q.reviewParts=[{id:'results',label:'Every requested result',expected:q.answer},{id:'method',label:'Reasoning and method',expected:q.solution},{id:'communication',label:'Units, labels, and diagrams',expected:'Labels and units match the original question; diagrams show equal parts or a consistent scale where required.'}];
    q.type='teacher-review';
  }
  if(conflicts.some(c=>c.id===logicalId))q.grading={type:'teacher-review',rubric:'Source conflict: reconcile the imported content with the original packet before approving.'};
  return q;
}

function lesson(day){
  const session=day.session||((day.week-1)*2+(day.weekday==='Mon'?1:2));
  const deck=slides.filter(s=>s.session===session);
  const model=deck.find(s=>s.type==='The model');
  const opener=deck.find(s=>s.type==='Today');
  const worked=deck.filter(s=>s.type==='worked_reveal'&&!s.hidden);
  const extension=extensions.sessions.find(s=>s.session===session);
  return {
    session,kind:day.session?'weekend-lesson':'weekday-recap',
    objective:opener?.text?.split('\n').slice(1,2).join('')||day.title,
    recap:model?.text?.split('\n').slice(1).join('\n')||'Revisit the models from the weekend lesson, then apply them to today’s practice.',
    examples:worked.map(s=>({title:s.title,text:s.text,slide:s.number})),
    teachingSequence:day.session?extension?.timing_blocks||[]:[{phase:'Recall the method',minutes:5},{phase:'Practice and explain',minutes:25},{phase:'Check and correct',minutes:5}],
    timing:day.session?extension?.timing||day.estimated_minutes:day.estimated_minutes,
    guideUrl:`/api/resources/teacher/Week_${z(day.week,2)}_Teacher_Guide.pdf`,
    slides:deck.map(s=>({number:s.number,title:s.title,hidden:s.hidden,phase:s.phase||null,type:s.type||null,problemNumbers:s.problem_numbers||[],text:s.text||s.body||'',notes:s.notes||{},followAlong:s.follow_along||''})),
    deepening:day.session?extension?.deepening||[]:[],discussionMoves:day.session?extension?.discussion_moves||[]:[],
  };
}

const days=manifest.days.map((day,index)=>{
  if(day.day!==index+1 || day.weekday!==shortDays[index%7])throw new Error('Unexpected source day ordering');
  const questions=day.sections.filter(s=>s.assigned).flatMap(s=>s.items.map(i=>question(i,s,day)));
  const optionalActivities=day.sections.filter(s=>!s.assigned).map(s=>({id:s.id,title:s.title,use:s.use,questions:s.items.map(i=>question(i,s,day,true))}));
  const requiredCount=day.weekday==='Wed'?25:20;
  if(questions.length!==requiredCount || questions.filter(q=>q.challenge).length!==2 || day.daily_question_count!==requiredCount) throw new Error(`Incorrect required count on day ${day.day}`);
  coverage.requiredQuestions+=questions.length;coverage.challenges+=2;
  coverage.optionalQuestions+=optionalActivities.reduce((n,a)=>n+a.questions.length,0);
  return {id:`day-${z(day.day)}`,day:day.day,week:day.week,dayIndex:index%7,dayName:longDays[index%7],weekday:day.weekday,
    title:day.title,topic:day.title,requiredCount,challengeCount:2,estimatedMinutes:day.estimated_minutes,
    packet:{file:path.basename(day.packet_file),pageStart:day.workbook_page_start,pageEnd:day.workbook_page_end,pages:day.pages,url:`resources/packets/${path.basename(day.packet_file)}`},
    booster:day.booster,boosterItems:day.booster_items,lesson:lesson(day),questions,optionalActivities};
});
coverage.days=days.length;
const weeks=Array.from({length:10},(_,i)=>{
  const group=days.filter(d=>d.week===i+1);
  return {week:i+1,id:`week-${z(i+1,2)}`,title:group[0].title,subtitle:group[1].title,dayIds:group.map(d=>d.id),
    requiredCount:group.reduce((n,d)=>n+d.requiredCount,0),challengeCount:14,skills:[...new Set(group.flatMap(d=>d.questions.map(q=>q.skill)))],
    teacherGuide:`Week_${z(i+1,2)}_Teacher_Guide.pdf`};
});
coverage.weeks=weeks.length;
if(coverage.requiredQuestions!==1450||coverage.days!==70||coverage.challenges!==140||weeks.some(w=>w.requiredCount!==145))throw new Error('Curriculum coverage invariant failed');
let extraPractice=[];
if(fs.existsSync(path.join(root,'scripts/generate-extra.mjs'))){
  const generator=await import(pathToFileURL(path.join(root,'scripts/generate-extra.mjs')).href);
  extraPractice=generator.generateExtraPractice();
}
coverage.extraPractice=extraPractice.length;
const validation=JSON.parse(execFileSync('python',['scripts/import-audit.py',source],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024}));
if(validation.deckSlideCount!==slides.length)conflicts.push({kind:'slide-count',expected:slides.length,actual:validation.deckSlideCount});
conflicts.push(...validation.arithmeticFailed.map(c=>({...c,kind:'source-arithmetic-failure'})),...validation.packetReferenceConflicts,...validation.deckReferenceConflicts,...validation.teacherGuideConflicts);
const snapshot={schemaVersion:1,version,sourceCommit,title:'Double Advanced',description:'Ten weeks of models, reasoning, and daily practice.',
  weekOrder:longDays,requirements:{ordinary:20,wednesday:25,challengesPerDay:2,weekly:145,course:1450},coverage,weeks,days,extraPractice,
  importNotes:{conflicts,sourceFiles:names.map(name=>({path:`Nov5/have/work/${name}`,sha256:crypto.createHash('sha256').update(raw[names.indexOf(name)]).digest('hex')})),
    sourceSolutionSupplements:sourceSupplemented.length,sourceSolutionSupplementIds:sourceSupplemented,validation},
};
function publicQuestion(q){
  return {id:q.id,logicalId:q.logicalId,sourceId:q.sourceId,version:q.version,origin:q.origin,week:q.week,day:q.day,dayId:q.dayId,topic:q.topic,prompt:q.prompt,skill:q.skill,type:q.type,challenge:q.challenge,diagram:q.diagram,
    availableAfterDay:q.availableAfterDay,family:q.family,
    reference:q.reference?{...q.reference,teacherSlides:undefined}:null};
}
const publicCourse={schemaVersion:1,version,sourceCommit,title:snapshot.title,description:snapshot.description,weekOrder:longDays,requirements:snapshot.requirements,coverage,weeks,
  days:days.map(d=>({...d,lesson:{session:d.lesson.session,kind:d.lesson.kind,objective:d.lesson.objective,recap:d.lesson.recap,examples:d.lesson.examples,teachingSequence:d.lesson.teachingSequence,timing:d.lesson.timing},
    questions:d.questions.map(publicQuestion),optionalActivities:d.optionalActivities.map(a=>({id:a.id,title:a.title,use:a.use,questionCount:a.questions.length}))})),
  extraPractice:extraPractice.map(publicQuestion),
  importStatus:{conflictCount:conflicts.length,verifiedPacketPages:validation.packetPagesVerified,sourceCheckCount:validation.arithmeticPassed},
};
for(const dir of ['data','data/snapshots','public/data','public/resources/packets','private/resources/teacher'])fs.mkdirSync(path.join(root,dir),{recursive:true});
function saveJson(file,data){fs.writeFileSync(path.join(root,file),JSON.stringify(data,null,2)+'\n');}
// Never overwrite an existing historical version with changed content.
const historical=path.join(root,'data/snapshots',version+'.json');
if(fs.existsSync(historical)&&fs.readFileSync(historical,'utf8')!==JSON.stringify(snapshot,null,2)+'\n')throw new Error('Refusing to alter an immutable historical curriculum snapshot');
if(!fs.existsSync(historical))saveJson('data/snapshots/'+version+'.json',snapshot);
saveJson('data/curriculum.json',snapshot);
saveJson('public/data/course.json',publicCourse);
saveJson('data/import-report.json',{version,sourceCommit,coverage,validation,conflicts,sourceSolutionSupplements:sourceSupplemented.length,
  requiredSolutionSupplements:days.flatMap(day=>day.questions).filter(q=>q.solutionOrigin==='authored-method-supplement').length,
  note:'Twenty source summaries require teacher judgment. Original answer/worked fields are cross-checked against expanded_answers.json. Missing source worked text receives an explicitly tagged authored method supplement. Source check strings are audited by a restricted AST interpreter, never eval.'});
for(const file of fs.readdirSync(path.join(output,'Daily_Packets')))if(file.endsWith('.pdf'))fs.copyFileSync(path.join(output,'Daily_Packets',file),path.join(root,'public/resources/packets',file));
for(const file of ['Student_Day_by_Day.pdf','Start_Here.pdf'])fs.copyFileSync(path.join(output,file),path.join(root,'public/resources',file));
for(const file of fs.readdirSync(path.join(output,'Teacher_Weeks')))if(file.endsWith('.pdf'))fs.copyFileSync(path.join(output,'Teacher_Weeks',file),path.join(root,'private/resources/teacher',file));
fs.copyFileSync(path.join(output,'DoubleAdvanced_Weekend_Slides.pptx'),path.join(root,'private/resources/teacher/DoubleAdvanced_Weekend_Slides.pptx'));
console.log(JSON.stringify({version,sourceCommit,coverage,conflicts:conflicts.length,sourceChecksPassed:validation.arithmeticPassed,packetPagesVerified:validation.packetPagesVerified,slides:validation.deckSlideCount},null,2));
