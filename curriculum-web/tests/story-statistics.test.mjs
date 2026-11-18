import test from 'node:test';
import assert from 'node:assert/strict';
import {generateStoryStatistics, storyStatisticsSkills, statisticsStoryScenarios} from '../server/generators/story-statistics.mjs';
const shapes=['missing','compare','backward','mistake','what-if'];
const order=xs=>xs.slice().sort((a,b)=>a-b);
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const average=xs=>sum(xs)/xs.length;
const med=xs=>{xs=order(xs);return(xs[Math.floor((xs.length-1)/2)]+xs[Math.floor(xs.length/2)])/2;};
const measure=xs=>{const v=order(xs),m=average(v),q1=med(v.slice(0,4)),q3=med(v.slice(4));return{mean:m,median:med(v),range:v.at(-1)-v[0],iqr:q3-q1,q1,q3,mad:average(v.map(x=>Math.abs(x-m)))};};
function independentlySolve(q) {
 const {skill,storyShape:shape}=q,{inputs:i}=q.verification,m=measure(i.values);
 if(skill==='S-QUESTION') {
  if(shape==='backward')return i.perGroup;
  if(shape==='compare')return i.extra;
  return i.groups*i.perGroup*(shape==='what-if'?i.factor:1)-i.collected;
 }
 if(skill==='S-DISPLAY'){
  const total=sum(i.frequencies);
  if(shape==='backward')return i.frequencies[2];
  if(shape==='what-if'||shape==='mistake')return total+i.added;
  return i.added;
 }
 if(['S-MEAN','S-MEDIAN','S-RANGE','S-IQR','S-MAD'].includes(skill)){
  const kind={'S-MEAN':'mean','S-MEDIAN':'median','S-RANGE':'range','S-IQR':'iqr','S-MAD':'mad'}[skill],value=m[kind];
  if(shape==='backward')return kind==='range'?i.delta:kind==='median'?(i.values.length%2?med(i.values)-Math.min(...i.values):order(i.values)[4]):kind==='iqr'?order(i.values)[6]:order(i.values).at(-1);
  if(shape==='compare')return Math.abs(value-i.reference);
  if(shape==='mistake')return(kind==='range'?Math.max(...i.values):kind==='iqr'?m.range:kind==='median'&&i.values.length%2?order(i.values)[Math.floor(i.values.length/2)+1]:2*value)-value;
  if(shape==='what-if')return['mean','median'].includes(kind)?value+i.delta:value*i.factor;
  return['mean','median'].includes(kind)&&!['centimetres','metres'].includes(q.answerUnit)?value*i.target:i.delta;
 }
 if(skill==='S-CENTER'){
  if(shape==='backward')return i.outlier;
  const values=i.values.slice();if(shape==='what-if')values[values.length-1]+=8*i.delta;
  return average(values)-med(values);
 }
 if(skill==='S-BOX')return shape==='backward'?m.q3+i.delta:shape==='mistake'?m.range-m.iqr:shape==='what-if'?m.iqr*i.factor:shape==='compare'?Math.abs(m.iqr-i.reference):i.delta;
 if(skill==='S-SPREAD')return shape==='backward'?i.bMin+m.range*i.factor:shape==='what-if'?Math.abs(m.range*3-i.bRange):Math.abs(m.range-i.bRange);
 throw new Error('Unhandled skill '+skill);
}
function checkOperations(q){
 for(const node of q.verification.operations){
  let result;
  if(node.op==='add')result=Number(node.a)+Number(node.b);
  else if(node.op==='sub')result=Number(node.a)-Number(node.b);
  else if(node.op==='mul')result=Number(node.a)*Number(node.b);
  else if(node.op==='div')result=Number(node.a)/Number(node.b);
  else if(node.op==='sum')result=sum(node.a);
  else if(node.op==='mean')result=average(node.a);
  else if(node.op==='median')result=med(node.a);
  else if(node.op==='distanceSum')result=sum(node.a.map(x=>Math.abs(x-Number(node.b))));
  else if(node.op==='quartiles'){const s=order(node.a);result=[med(s.slice(0,4)),med(s.slice(4))].join(',');}
  else throw new Error('Unhandled operation '+node.op);
  assert.equal(String(result),node.result,`${q.skill}/${q.storyShape} incorrect ${node.op}`);
 }
 assert.equal(q.verification.operations.at(-1).result,q.answer);
}
for(const skill of storyStatisticsSkills)test(`${skill}: all scenes, five shapes and three levels have independently checked multi-step answers`,()=>{
 const scenarios=statisticsStoryScenarios(skill);assert.equal(scenarios.length,16);assert.equal(new Set(scenarios).size,16);
 for(const scenarioId of scenarios)for(const storyShape of shapes)for(const difficulty of [1,2,3])for(let seed=0;seed<30;seed++){
  const q=generateStoryStatistics(skill,`stat-story-test:${seed}`,{scenarioId,storyShape,difficulty});
  assert.equal(q.answer,String(independentlySolve(q)),`${skill}/${storyShape}/${scenarioId}/${seed}`);
  assert.equal(q.shape,'story-'+storyShape);assert.equal(q.story,true);assert.equal(q.scenarioId,scenarioId);
  assert.ok(q.stepCount>=2&&q.stepCount<=4);assert.equal(q.stepCount,q.solution.length);
  assert.ok(q.hint.length>20);assert.ok(q.plainPrompt.includes(q.answerUnit));
  assert.match(q.plainPrompt,/Maya|Leo|Ari|Nora|Sam|Ivy|Omar|Zoe/);
  assert.ok(q.unitAliases.length);assert.ok(q.solution.every(x=>x.length>20));
  assert.ok(Number.isFinite(Number(q.answer)));assert.ok(Number(q.answer)>=0);
  assert.equal(Number(q.answer)*2,Math.trunc(Number(q.answer)*2),'Answers are integers or exact halves');
  assert.equal(new Set(q.hints.map(x=>x.answer)).size,3);assert.ok(q.hints.every(x=>x.answer!==q.answer));
  if(storyShape==='compare')assert.ok(['A','B'].includes(q.answerChoice));
  if(q.answerChoice){assert.ok(q.choiceLabels.A&&q.choiceLabels.B);assert.match(q.plainPrompt,/Choose option A or B/);}
  checkOperations(q);
 }
});
test('statistical misconceptions name the incorrect method, and box-plot backwards tasks do not reveal Q3',()=>{
 for(const [skill,phrase] of Object.entries({'S-MEAN':'instead of 8','S-RANGE':'only the largest','S-IQR':'full range','S-MAD':'instead of 8'}))assert.ok(generateStoryStatistics(skill,'misconception',{storyShape:'mistake'}).plainPrompt.includes(phrase));
 const median=generateStoryStatistics('S-MEDIAN','misconception',{storyShape:'mistake'});
 assert.match(median.plainPrompt,median.verification.inputs.values.length%2?/immediately after the single middle/:/without dividing/);
 assert.equal(generateStoryStatistics('S-BOX','backward',{storyShape:'backward'}).svg,undefined);
});

test('median stories use both parity rules and odd backwards questions require two dependent calculations',()=>{
 for(const scenarioId of statisticsStoryScenarios('S-MEDIAN'))for(const storyShape of shapes){
  const counts=new Set();
  for(let seed=0;seed<100;seed++){
   const q=generateStoryStatistics('S-MEDIAN',`median-parity:${seed}`,{scenarioId,storyShape,difficulty:1+seed%3}),{values,medianCorrection}=q.verification.inputs;
   const odd=values.length%2===1;counts.add(values.length);
   assert.equal(Number(q.answer),independentlySolve(q));checkOperations(q);
   assert.match(q.hint,odd?/single middle value/:/middle pair/);
   if(storyShape==='backward'&&odd){
    assert.ok(medianCorrection>0&&medianCorrection<values[Math.floor(values.length/2)+1]-med(values));
    const operations=q.verification.operations;
    assert.equal(operations.length,2);assert.equal(operations[1].a,Number(operations[0].result));
    assert.equal(Number(operations[0].result),med(values));
    assert.match(q.plainPrompt,/original middle reading than the smallest/);
   }
   if(storyShape==='mistake')assert.notEqual(q.verification.inputs.wrong,med(values));
  }
  assert.deepEqual([...counts].sort(),[7,8,9],scenarioId+'/'+storyShape);
 }
});
test('story selectors reject unsupported scenarios, shapes and skills',()=>{
 assert.throws(()=>generateStoryStatistics('NOPE',1));
 assert.throws(()=>generateStoryStatistics('S-MEAN',1,{scenarioId:'nope'}));
 assert.throws(()=>generateStoryStatistics('S-MEAN',1,{storyShape:'nope'}));
});

test('frequency-table mistake requires restoring the omitted group before adding new observations',()=>{
 for(let seed=0;seed<100;seed++){
  const q=generateStoryStatistics('S-DISPLAY',`omitted-frequency:${seed}`,{storyShape:'mistake'});
  const {frequencies,added}=q.verification.inputs;
  assert.equal(Number(q.answer),sum(frequencies)+added);
  assert.equal(q.stepCount,3);
  assert.ok(![...frequencies,added].includes(Number(q.answer)));
  assert.match(q.plainPrompt,/forgetting the high group/);
  assert.match(q.plainPrompt,/correct updated total/);
  const steps=q.verification.operations;
  assert.equal(Number(steps[1].a),Number(steps[0].result));
  assert.equal(Number(steps[2].a),Number(steps[1].result));
 }
});
