import test from 'node:test';
import assert from 'node:assert/strict';
import {generateFoundationStatistics as generate,foundationStatisticsSkills as skills,foundationStatisticsScenarios as scenarios} from '../server/generators/foundation-statistics.mjs';
const shapes=['missing','compare','backward','mistake','what-if'];
const near=(actual,expected,label)=>assert.ok(Math.abs(Number(actual)-expected)<1e-8,label+': '+actual+' ≠ '+expected);
const totalLength=i=>i.values.reduce((sum,value,index)=>sum+Number(value)*i.counts[index],0);
function solve(q){
 const i=q.verification.inputs,s=q.verification.storyShape;
 if(q.skill==='S-LINEPLOT'){
  const total=totalLength(i);
  if(!q.story)return total;
  if(s==='backward')return total+Number(i.reserve);
  if(s==='compare')return Math.abs(total-Number(i.reference));
  if(s==='mistake')return total-Number(i.used);
  if(s==='what-if')return total*i.factor-Number(i.used);
  return Number(i.stock)-total;
 }
 if(q.skill==='S-PROB'){
  const probability=i.good/i.total,expected=probability*i.trials;
  if(!q.story&&s==='calculation')return probability*100;
  if(s==='backward')return i.trials-i.earlier;
  if(s==='compare')return Math.abs(i.good-i.bGood)/i.total*i.trials;
  if(s==='mistake')return i.wrong-expected;
  if(s==='what-if')return i.good/(i.total-i.removed)*i.trials;
  return expected;
 }
 const rate=i.yes/i.sampleSize,estimate=rate*i.population;
 if(!q.story&&s==='calculation')return estimate;
 if(s==='backward'||!q.story&&s==='missing')return i.yes;
 if(s==='compare')return Math.abs(i.yes-i.bYes)/i.sampleSize*i.population;
 if(s==='mistake')return estimate-i.yes/100*i.population;
 if(s==='what-if')return rate*i.newPopulation+i.buffer;
 return estimate-i.stock;
}
function checkOperations(q){
 for(const step of q.verification.operations){
  let expected;
  if(step.op==='weightedSum')expected=step.a.reduce((sum,value,index)=>sum+Number(value)*step.b[index],0);
  else if(step.op==='add')expected=Number(step.a)+Number(step.b);
  else if(step.op==='sub')expected=Number(step.a)-Number(step.b);
  else if(step.op==='mul')expected=Number(step.a)*Number(step.b);
  else if(step.op==='div')expected=Number(step.a)/Number(step.b);
  else assert.fail('Unhandled operation '+step.op);
  near(step.result,expected,q.skill+'/'+q.storyShape+'/'+step.op);
 }
 assert.equal(q.verification.operations.at(-1).result,q.answer);
}
for(const skill of skills)test(skill+': all scenes, shapes and difficulties have independently correct story answers',()=>{
 assert.equal(scenarios(skill).length,16);assert.equal(new Set(scenarios(skill)).size,16);
 for(const scenarioId of scenarios(skill))for(const storyShape of shapes)for(const difficulty of [1,2,3])for(let seed=0;seed<30;seed++){
  const q=generate(skill,'foundation-statistics-test:'+seed,{mode:'story',scenarioId,storyShape,difficulty});
  near(q.answer,solve(q),skill+'/'+scenarioId+'/'+storyShape+'/'+seed);
  assert.equal(q.story,true);assert.equal(q.scenarioId,scenarioId);assert.equal(q.shape,'story-'+storyShape);
  assert.ok(q.stepCount>=2&&q.stepCount<=4);assert.equal(q.stepCount,q.solution.length);assert.equal(q.solution.length,q.verification.operations.length);
  assert.ok(q.answerUnit);assert.ok(q.unitAliases.length);assert.match(q.plainPrompt,/Maya|Leo|Ari|Nora|Sam|Ivy|Omar|Zoe/);assert.ok(q.plainPrompt.includes(q.answerUnit));
  assert.ok(Number(q.answer)>=0);assert.ok(q.hint.length>25);assert.equal(q.hints.length,3);
  assert.equal(new Set(q.hints.map(h=>h.answer)).size,3);assert.ok(q.hints.every(h=>Math.abs(Number(h.answer)-Number(q.answer))>1e-9&&h.text.length>30));
  if(storyShape==='compare'){
   assert.ok(q.answerChoice==='A'||q.answerChoice==='B');assert.ok(q.choiceLabels.A&&q.choiceLabels.B);
   const i=q.verification.inputs,aWins=skill==='S-LINEPLOT'?totalLength(i)>Number(i.reference):skill==='S-PROB'?i.good>i.bGood:i.yes>i.bYes;
   assert.equal(q.answerChoice,aWins?'A':'B');
  }
  if(skill==='S-LINEPLOT')near(Number(q.answer)*8,Math.round(Number(q.answer)*8),'line-plot answer is a multiple of an eighth');
  else assert.equal(Number(q.answer),Math.round(Number(q.answer)),'count answers must be whole numbers');
  checkOperations(q);
 }
});
test('warmups have both requested shapes, story frames, exact answers and worked help',()=>{
 for(const skill of skills)for(const shape of ['calculation','missing'])for(const difficulty of [1,2,3])for(let seed=0;seed<200;seed++){
  const q=generate(skill,seed,{shape,difficulty});
  assert.equal(q.shape,shape);assert.notEqual(q.story,true);near(q.answer,solve(q),skill+'/'+shape);
  assert.ok(q.solution.length>=1);assert.ok(q.plainPrompt.includes(q.answerUnit));assert.match(q.plainPrompt,/is helping with/);
  assert.equal(q.hints.length,3);checkOperations(q);
  if(skill==='S-PROB'&&shape==='calculation'){assert.equal(q.answerUnit,'percent');assert.match(q.plainPrompt,/%/);near(Number(q.answer)*2,Math.round(Number(q.answer)*2),'clean percent');}
 }
});
test('fractional line plots show every measured piece at correctly spaced fractional labels',()=>{
 for(let seed=0;seed<150;seed++){
  const q=generate('S-LINEPLOT',seed,{mode:'story',storyShape:'missing',difficulty:3}),i=q.verification.inputs;
  assert.match(q.svg,/role="img"/);assert.match(q.svg,/<title>/);assert.match(q.svg,/<desc>/);
  assert.equal((q.svg.match(/data-mark="measurement"/g)||[]).length,i.counts.reduce((a,b)=>a+b,0));
  assert.match(q.svg,/Each X/);assert.match(q.svg,/\d\/[248]/);
  assert.ok(i.values.every(v=>Number(v)>0&&Number(v)<=1));
  near(Number(i.values[1])-Number(i.values[0]),Number(i.values[2])-Number(i.values[1]),'uniform tick spacing');
 }
});
test('random models state replacement and uncertainty; sampling identifies its population and random selection',()=>{
 for(const scene of scenarios('S-PROB'))for(const shape of shapes){
  const probability=generate('S-PROB','honesty',{mode:'story',scenarioId:scene,storyShape:shape});
  assert.match(probability.plainPrompt,/replaced/);assert.match(probability.plainPrompt,/expect|random|averag|Estimate/);
  assert.match(probability.plainPrompt,/vary|differ|not promised|not a guaranteed/);
  const sample=generate('S-SAMPLE','honesty',{mode:'story',scenarioId:scene,storyShape:shape});
  assert.match(sample.plainPrompt,/random/);assert.match(sample.plainPrompt,/estimat/i);assert.match(sample.plainPrompt,/differ|variation|cannot guarantee/);
  assert.ok(sample.plainPrompt.includes(String(sample.verification.inputs.population)));
 }
});
test('backward questions do not print the unknown sample response count, and mistakes use genuinely wrong mathematics',()=>{
 for(let seed=0;seed<300;seed++){
  const sample=generate('S-SAMPLE',seed,{mode:'story',storyShape:'backward'});
  assert.match(sample.plainPrompt,/number of yes responses/);assert.equal(sample.svg,undefined);
  const i=sample.verification.inputs;near((Number(i.planned)-i.buffer)/i.population*i.sampleSize,Number(sample.answer),'inverse sample');
  const line=generate('S-LINEPLOT',seed,{mode:'story',storyShape:'mistake'});assert.match(line.plainPrompt,/treats each of those units as a whole metre/);
  const li=line.verification.inputs,numerator=li.counts.reduce((s,c,index)=>s+c*(li.start+index),0);assert.notEqual(numerator,totalLength(li));
  const probability=generate('S-PROB',seed,{mode:'story',storyShape:'mistake'});const pi=probability.verification.inputs;assert.ok(pi.wrong>pi.trials*pi.good/pi.total);
 }
});
test('each story frame has enough numerical variety for twenty unique vetted identities',()=>{
 for(const skill of skills)for(const shape of shapes)for(const difficulty of [1,2,3]){
  const identities=new Set();
  for(let seed=0;seed<300;seed++){
   const q=generate(skill,'variation:'+seed,{mode:'story',scenarioId:'bake-sale',storyShape:shape,difficulty});
   identities.add(JSON.stringify(q.verification.inputs));
  }
  assert.ok(identities.size>=20,skill+'/'+shape+'/'+difficulty+': '+identities.size);
 }
});
test('unsupported skill, scene, shape and difficulty are rejected',()=>{
 assert.throws(()=>generate('NOPE',1));
 assert.throws(()=>generate('S-PROB',1,{mode:'story',scenarioId:'unknown'}));
 assert.throws(()=>generate('S-SAMPLE',1,{mode:'story',storyShape:'unknown'}));
 assert.throws(()=>generate('S-LINEPLOT',1,{shape:'reason'}));
 assert.throws(()=>generate('S-PROB',1,{difficulty:4}));
});
test('comparison choices vary, and sampling/measurement explanations use consistent units',()=>{
 for(const skill of skills){
  const counts={A:0,B:0};
  for(let seed=0;seed<400;seed++){const q=generate(skill,'comparison-balance:'+seed,{mode:'story',storyShape:'compare'});counts[q.answerChoice]++;}
  assert.ok(counts.A>100&&counts.B>100,skill+' comparisons should not imply a fixed answer position');
 }
 const sample=generate('S-SAMPLE','same-unit',{mode:'story',scenarioId:'school-garden',storyShape:'missing'});assert.match(sample.plainPrompt,/garden-club members/);assert.doesNotMatch(sample.plainPrompt,/families/);
 const probability=generate('S-PROB','show-total',{mode:'story',storyShape:'what-if'});assert.equal(probability.stepCount,4);assert.equal(probability.verification.operations[0].result,String(probability.verification.inputs.total));
 const exact=generate('S-LINEPLOT','exact-total',{mode:'story',storyShape:'compare'});assert.match(exact.solution.at(-1),/larger total/);
 const patches=generate('S-SAMPLE','singular',{mode:'story',scenarioId:'space-camp',storyShape:'missing'});assert.ok(patches.unitAliases.includes('mission patch'));
});
