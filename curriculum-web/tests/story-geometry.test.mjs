import test from 'node:test';
import assert from 'node:assert/strict';
import { generateStoryGeometry,storyGeometrySkills,geometryStoryScenarios } from '../server/generators/story-geometry.mjs';
import { geometrySkills } from '../server/generators/geometry.mjs';

// These formulas are deliberately independent of the generator's model builder.
function measure(skill,d) {
 switch(skill) {
  case 'G-PERIM': return 2*d.l+2*d.w;
  case 'G-PARA': return d.b*d.h;
  case 'G-TRI': return d.b*d.h/2;
  case 'G-COMP': return d.l*d.w-d.cutW*d.cutH;
  case 'G-SA': return d.surfaceVariant==='triangular-prism'?d.triA*d.triB+(d.triA+d.triB+d.triC)*d.prismLength:d.surfaceVariant==='square-pyramid'?d.surfaceSide*d.surfaceSide+2*d.surfaceSide*d.slant:6*d.edge*d.edge;
  case 'P-SCALE': return d.l*d.w*d.scale*d.scale;
  case 'P-MAP': return d.mapLength*d.scale;
  case 'G-CIRC': return 6.28*d.radius;
  case 'G-CAREA': return 3.14*d.radius*d.radius;
  case 'G-VOL': return d.l*d.w*d.h;
 }
}
function inverse(skill,d) {
 switch(skill) {
  case 'G-PERIM':return d.w;
  case 'G-PARA':case 'G-TRI':case 'G-VOL':return d.h;
  case 'G-COMP':return d.cutW*d.cutH;
  case 'G-SA':return d.surfaceVariant==='triangular-prism'?d.triA*d.triB/2:d.surfaceVariant==='square-pyramid'?d.surfaceSide*d.slant/2:d.edge*d.edge;
  case 'P-SCALE':return d.l*d.w;
  case 'P-MAP':return d.mapLength;
  case 'G-CIRC':return 2*d.radius;
  case 'G-CAREA':return d.radius;
 }
}
function operationValue({op,a,b}) {
 switch(op) {
  case 'add':return a+b;
  case 'sub':return a-b;
  case 'mul':return a*b;
  case 'div':return a/b;
  case 'perimeter':return 2*(a+b);
  case 'triangle-area':return a*b/2;
  case 'subtract-rectangle':return a-b[0]*b[1];
  case 'scale-area':return a*b*b;
  case 'surface-prism':return a+(b[0]+b[1]+b[2])*b[3];
  case 'surface-pyramid':return a+2*b[0]*b[1];
  case 'prism-end-area':return (a-b[0]*b[1])/2;
  case 'pyramid-face-area':return (a-b*b)/4;
  case 'rectangle-width':return a/2-b;
  case 'triangle-height':return 2*a/b;
  case 'rectangle-cutout':return a[0]*a[1]-b;
  case 'circle-radius':return Math.sqrt(a/b);
  case 'rectangular-prism-height':return a/(b[0]*b[1]);
  default:throw Error('Unverified operation '+op);
 }
}
const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-7,`${label}: ${actual} != ${expected}`);

test('every geometry skill has sixteen distinct stable scenarios and five multi-step story shapes',()=>{
 assert.deepEqual([...storyGeometrySkills].sort(),[...geometrySkills].sort());
 let checked=0;
 for(const skill of storyGeometrySkills) {
  const scenarios=geometryStoryScenarios(skill);assert.equal(new Set(scenarios).size,16);
  for(const scenarioId of scenarios)for(const difficulty of [1,2,3])for(const storyShape of ['missing','compare','backward','mistake','what-if'])for(let seed=0;seed<8;seed++) {
   const q=generateStoryGeometry(skill,`independent:${seed}`,{difficulty,scenarioId,storyShape});
   const {dimensions:d,inputs,operations}=q.verification,quantity=measure(skill,d);
   close(q.verification.quantity,quantity,skill+' quantity');
   const expected=storyShape==='backward'?inverse(skill,d):storyShape==='compare'?Math.abs(quantity*inputs.rate-inputs.costB):inputs.supply-quantity*inputs.count;
   close(Number(q.answer),expected,skill+' final');
   assert.ok(Number.isFinite(Number(q.answer))&&Number(q.answer)>0);
   assert.match(q.answer,/^\d+(?:\.\d{1,2})?$/,'answers are integers or terminating hundredths');
   assert.equal(q.story,true);assert.equal(q.scenarioId,scenarioId);assert.equal(q.storyShape,storyShape);
   assert.equal(q.stepCount,q.solution.length);assert.ok(q.stepCount>=2&&q.stepCount<=4);
   assert.ok(q.answerUnit&&q.unitAliases.includes(q.answerUnit));assert.match(q.plainPrompt,/Include .* in your answer|saving in cents|difference in metres/);
   assert.ok(q.hint.length>30);assert.ok(q.hints.length>=3);assert.equal(new Set(q.hints.map(h=>h.answer)).size,q.hints.length);
   for(const wrong of q.hints)assert.notEqual(wrong.answer,q.answer);
   assert.equal(operations.length,q.stepCount);
   for(let i=0;i<operations.length;i++) {
    close(operations[i].result,operationValue(operations[i]),skill+' step '+i);
    if(i)assert.ok([operations[i].a,operations[i].b].flat().some(x=>Math.abs(Number(x)-operations[i-1].result)<1e-7),skill+' needs its preceding result');
   }
   close(operations.at(-1).result,Number(q.answer),skill+' last operation');
   if(storyShape==='compare') {
    assert.equal(q.answerChoice,quantity*inputs.rate<inputs.costB?'A':'B');
    assert.ok(q.choiceLabels.A&&q.choiceLabels.B);assert.ok(Number.isInteger(inputs.costB));
    close(quantity*inputs.rate,Math.round(quantity*inputs.rate),'whole cents');
   }
   if(storyShape==='backward')assert.equal(q.svg,undefined,'a diagram must not reveal an unknown dimension');
   if(skill==='G-COMP')assert.ok(d.cutW<d.l&&d.cutH<d.w,'corner cut leaves a genuine L-shape');
   checked++;
  }
 }
 assert.equal(checked,19200);
});

test('same seed and options reproduce the same computed problem',()=>{
 const opts={difficulty:2,scenarioId:'science-fair',storyShape:'backward'};
 for(const skill of storyGeometrySkills)assert.deepEqual(generateStoryGeometry(skill,'repeat',opts),generateStoryGeometry(skill,'repeat',opts));
});

test('geometry stories cover fractional volume and external triangle heights',()=>{
 let external=0;
 for(let seed=0;seed<100;seed++){
  const t=generateStoryGeometry('G-TRI',seed,{storyShape:'missing'});if(t.verification.dimensions.outside){external++;assert.match(t.plainPrompt,/outside the triangle/);}
  const v=generateStoryGeometry('G-VOL',seed,{storyShape:'backward'});const d=v.verification.dimensions;assert.ok(d.l%1&&d.h%1);assert.equal(Number(v.answer),d.h);assert.equal(v.answerUnit,'centimetres');
 }
 assert.ok(external>20);
});


test('story surface-area variants use genuine nets and inverse face areas',()=>{
 const variants=new Set();
 for(let seed=0;seed<150;seed++){
  const options={scenarioId:'science-fair',difficulty:2},q=generateStoryGeometry('G-SA',seed,{...options,storyShape:'missing'}),d=q.verification.dimensions;
  variants.add(d.surfaceVariant);
  assert.ok(q.svg);assert.match(q.hint,/face/);
  if(d.surfaceVariant==='triangular-prism'){assert.equal(d.triA*d.triA+d.triB*d.triB,d.triC*d.triC);assert.match(q.plainPrompt,/both triangular ends and all three rectangular sides/);}
  if(d.surfaceVariant==='square-pyramid'){assert.ok(d.slant>d.surfaceSide/2);assert.match(q.plainPrompt,/slant height.*measured along the face/);}
  const backwards=generateStoryGeometry('G-SA',seed,{...options,storyShape:'backward'});
  assert.equal(backwards.svg,undefined);assert.equal(backwards.answerUnit,'square centimetres');
  if(d.surfaceVariant==='triangular-prism')assert.doesNotMatch(backwards.plainPrompt,/perpendicular legs/);
  if(d.surfaceVariant==='square-pyramid')assert.doesNotMatch(backwards.plainPrompt,/slant height/);
 }
 assert.deepEqual([...variants].sort(),['cube','square-pyramid','triangular-prism']);
});
