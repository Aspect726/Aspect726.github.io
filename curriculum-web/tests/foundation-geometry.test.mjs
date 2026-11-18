import test from 'node:test';
import assert from 'node:assert/strict';
import {generateFoundationGeometry,foundationGeometrySkills,foundationGeometryScenarios} from '../server/generators/foundation-geometry.mjs';

const shapes=['missing','compare','backward','mistake','what-if'];
const belongs=(g,family)=>family==='rectangle'?g.sides===4&&g.rightAngles===4:family==='rhombus'?g.sides===4&&g.equalSides===4:family==='parallelogram'?g.sides===4&&g.parallelPairs===2:g.sides===4;
const vol=d=>d.l*d.w*d.h;
function independentlySolve(q){
 const v=q.verification,i=v.inputs;
 if(q.skill==='G-CLASS'){
  const qualified=v.groups.filter(group=>belongs(group,v.family)),eligible=qualified.reduce((sum,group)=>sum+group.count,0);
  assert.equal(qualified.length,2);assert.ok(qualified.includes(v.groups[0]));assert.ok(qualified.includes(v.groups[1]));
  if(!q.story)return q.shape==='missing'?v.groups[0].count:eligible;
  if(q.storyShape==='backward')return (i.finalCount+i.used)/i.kits-v.groups[1].count;
  const total=(eligible+(q.storyShape==='what-if'?i.extra:0))*i.kits;
  if(q.storyShape==='compare'){assert.equal(q.answerChoice,total>i.other?'A':'B');return Math.abs(total-i.other);}
  return total-i.used;
 }
 const a=v.dimensions.a,b=v.dimensions.b,quantity=vol(a)+(b?vol(b):0);
 assert.equal(v.quantity,quantity);
 if(!q.story)return q.shape==='missing'?a.h:quantity;
 if(q.storyShape==='backward')return (i.supply-i.left-(b?vol(b):0))/(a.l*a.w);
 if(q.storyShape==='compare'){assert.equal(q.answerChoice,quantity>i.other?'A':'B');return Math.abs(quantity-i.other);}
 if(q.storyShape==='what-if')return i.supply-a.l*a.w*(a.h+i.extra)-(b?vol(b):0);
 return i.supply-quantity;
}
function independentOp({op,a,b}){
 if(op==='add')return a+b;
 if(op==='sub')return a-b;
 if(op==='mul')return a*b;
 if(op==='div')return a/b;
 if(op==='add-prism')return a+b.reduce((total,dimension)=>total*dimension,1);
 if(op==='subtract-prism')return a-b.reduce((total,dimension)=>total*dimension,1);
 if(op==='prism-height')return a/(b[0]*b[1]);
 if(op==='height-volume')return a*b[0]*b[1];
 throw Error('Unknown operation '+op);
}
function validate(q){
 assert.equal(Number(q.answer),independentlySolve(q),q.skill+' '+q.shape+' final answer');
 assert.ok(Number.isSafeInteger(Number(q.answer))&&Number(q.answer)>0);
 assert.ok(q.answerUnit&&q.unitAliases.includes(q.answerUnit));
 assert.ok(q.plainPrompt.includes(q.answerUnit));
 assert.ok(q.hint.length>30&&q.solution.length>=2);
 assert.ok(q.svg.includes('role="img"'));
 assert.equal(q.hints.length,3);assert.equal(new Set(q.hints.map(h=>h.answer)).size,3);
 assert.ok(q.hints.every(h=>h.answer!==q.answer&&h.text.length>20));
 const ops=q.verification.operations;
 for(const [index,operation] of ops.entries()){
  assert.equal(operation.result,independentOp(operation),q.skill+' operation '+index);
  if(index)assert.ok([operation.a,operation.b].flat().includes(ops[index-1].result),'step must use the preceding result');
 }
 assert.equal(ops.at(-1).result,Number(q.answer));
 if(q.story){assert.ok(q.stepCount>=2&&q.stepCount<=4);assert.equal(q.stepCount,q.solution.length);assert.equal(q.stepCount,ops.length);assert.equal(q.choices,undefined);}
 if(q.storyShape==='compare'){assert.deepEqual(Object.keys(q.choiceLabels),['A','B']);assert.match(q.answerChoice,/^[AB]$/);}
 if(q.storyShape==='mistake')assert.notEqual(q.verification.claimedAnswer,Number(q.answer),'the claimed answer must actually be wrong');
 if(q.skill==='G-WVOL')for(const prism of Object.values(q.verification.dimensions))assert.ok(Object.values(prism).every(Number.isInteger),'Grade5 volume uses whole-number edges');
}

test('foundation geometry story cases cover sixteen scenarios, five shapes and three levels independently',()=>{
 let cases=0;
 for(const skill of foundationGeometrySkills){
  assert.equal(new Set(foundationGeometryScenarios(skill)).size,16);
  for(const scenarioId of foundationGeometryScenarios(skill))for(const storyShape of shapes)for(const difficulty of [1,2,3])for(let seed=0;seed<30;seed++){
   const q=generateFoundationGeometry(skill,`proof:${seed}`,{mode:'story',scenarioId,storyShape,difficulty});
   validate(q);assert.equal(q.scenarioId,scenarioId);assert.equal(q.storyShape,storyShape);assert.match(q.plainPrompt,/Maya|Leo|Ari|Nora|Sam|Ivy|Omar|Zoe/);cases++;
  }
 }
 assert.equal(cases,14400);
});

test('five hundred warmup examples per template and level have exact answers, units and worked models',()=>{
 let cases=0;
 for(const skill of foundationGeometrySkills)for(const shape of ['calculation','missing'])for(const difficulty of [1,2,3])for(let seed=0;seed<500;seed++){
  const q=generateFoundationGeometry(skill,`warm:${seed}`,{shape,difficulty});validate(q);assert.equal(q.story,undefined);assert.equal(q.shape,shape);cases++;
 }
 assert.equal(cases,6000);
});

test('shape hierarchy includes special cases and rejects unrelated shapes, not just a cosmetic story',()=>{
 const families=new Set();
 for(let seed=0;seed<100;seed++){
  const q=generateFoundationGeometry('G-CLASS',seed,{mode:'story',scenarioId:'art-club',storyShape:'mistake'}),v=q.verification;
  families.add(v.family);assert.equal(belongs(v.groups[0],v.family),true);assert.equal(belongs(v.groups[1],v.family),true);assert.equal(belongs(v.groups[2],v.family),false);
  assert.match(q.solution[0],/four right angles|four equal sides|two pairs of parallel sides|four sides/);
  assert.match(q.plainPrompt,/group P does not belong/);
  assert.notEqual(v.claimedAnswer,Number(q.answer));
 }
 assert.deepEqual([...families].sort(),['parallelogram','quadrilateral','rectangle','rhombus']);
});

test('composite prism examples add real non-overlapping volumes and inverse drawings conceal unknown heights',()=>{
 let composite=0,single=0;
 for(let seed=0;seed<100;seed++){
  const q=generateFoundationGeometry('G-WVOL',seed,{mode:'story',scenarioId:'robot-club',storyShape:'backward'}),v=q.verification;
  if(v.composite){composite++;assert.ok(v.operations.some(op=>op.op==='subtract-prism'));assert.match(q.plainPrompt,/joined without overlap/);}else single++;
  assert.equal(q.answerUnit,'centimetres');assert.match(q.svg,/\? cm/);assert.match(q.svg,/height is unknown/);assert.match(q.svg,/Height layers are not shown/);
  assert.doesNotMatch(q.plainPrompt.split('Section B')[0],new RegExp(`${v.dimensions.a.h} cm high`),'hidden first height is not stated as a dimension');
 }
 assert.ok(composite>20&&single>20);
});

test('each story frame has ample distinct numeric parameters and choices are reproducible',()=>{
 for(const skill of foundationGeometrySkills)for(const storyShape of shapes)for(const difficulty of [1,2,3]){
  const signatures=new Set();
  for(let n=0;n<60;n++)signatures.add(generateFoundationGeometry(skill,`capacity:${n}`,{mode:'story',scenarioId:'science-fair',storyShape,difficulty}).signature);
  assert.ok(signatures.size>=40,`${skill}/${storyShape}/${difficulty} needs distinct parameter sets`);
 }
 const options={mode:'story',scenarioId:'space-camp',storyShape:'compare',difficulty:3};
 assert.deepEqual(generateFoundationGeometry('G-WVOL','repeat',options),generateFoundationGeometry('G-WVOL','repeat',options));
 assert.throws(()=>generateFoundationGeometry('unknown','seed'));
 assert.throws(()=>generateFoundationGeometry('G-CLASS','seed',{difficulty:4}));
 assert.throws(()=>generateFoundationGeometry('G-CLASS','seed',{mode:'story',scenarioId:'unknown'}));
 assert.throws(()=>generateFoundationGeometry('G-CLASS','seed',{mode:'story',storyShape:'unknown'}));
});
