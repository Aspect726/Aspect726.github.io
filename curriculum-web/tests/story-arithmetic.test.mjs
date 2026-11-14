import test from 'node:test';
import assert from 'node:assert/strict';
import { generateStoryArithmetic, storyArithmeticSkills, arithmeticStoryScenarios } from '../server/generators/story-arithmetic.mjs';
import { arithmeticSkills } from '../server/generators/arithmetic.mjs';
import { generateArithmetic } from '../server/generators/arithmetic.mjs';

// Separate integer-pair oracle: neither the generator's rational helpers nor its
// stored answers calculate the expected results used here.
function pair(value){const s=String(value);if(s.includes('/'))return s.split('/').map(BigInt);const [a,b='']=s.split('.');return [BigInt(a+b),10n**BigInt(b.length)];}
const equal=(a,b)=>a[0]*b[1]===b[0]*a[1];
function gcf(a,b){a=a<0n?-a:a;b=b<0n?-b:b;while(b)[a,b]=[b,a%b];return a;}
function oracle(op,left,right){const a=pair(left),b=pair(right);switch(op){
 case 'add':return [a[0]*b[1]+b[0]*a[1],a[1]*b[1]];
 case 'sub':return [a[0]*b[1]-b[0]*a[1],a[1]*b[1]];
 case 'mul':return [a[0]*b[0],a[1]*b[1]];
 case 'div':assert.notEqual(b[0],0n);return [a[0]*b[1],a[1]*b[0]];
 case 'pow':assert.ok(['2','3','4'].includes(right));return [a[0]**BigInt(right),a[1]**BigInt(right)];
 case 'abs':return [a[0]<0n?-a[0]:a[0],a[1]];
 case 'gcd':assert.equal(a[1],1n);assert.equal(b[1],1n);return [gcf(a[0],b[0]),1n];
 case 'max':return a[0]*b[1]>b[0]*a[1]?a:b;
 case 'min':return a[0]*b[1]<b[0]*a[1]?a:b;
 default:throw Error('Oracle must handle operation '+op);
}}
const shapes=['missing','compare','backward','mistake','what-if'];

test('arithmetic stories cover the course, sixteen real scenes, and five question shapes',()=>{
 assert.deepEqual([...storyArithmeticSkills].sort(),[...arithmeticSkills].sort());
 for(const skill of storyArithmeticSkills){
  const scenarios=arithmeticStoryScenarios(skill);
  assert.equal(new Set(scenarios).size,16);
  for(const difficulty of [1,2,3])for(const scenarioId of scenarios)for(const storyShape of shapes)for(let seed=0;seed<4;seed++){
   const q=generateStoryArithmetic(skill,`independent:${seed}`,{difficulty,scenarioId,storyShape});
   assert.equal(q.scenarioId,scenarioId);assert.equal(q.storyShape,storyShape);assert.equal(q.story,true);
   assert.ok(q.stepCount>=2&&q.stepCount<=4,`${skill}/${storyShape}: two to four steps`);
   assert.equal(q.solution.length,q.stepCount);
   assert.match(q.plainPrompt,/(Maya|Leo|Ari|Nora|Sam|Ivy|Omar|Zoe|Luca|Asha|Ben|Tara) is helping/);
   assert.ok(q.plainPrompt.includes(q.answerUnit),`${skill}: ask for explicit answer units`);
   assert.match(q.plainPrompt,/Include|including units/);
   assert.ok(q.hint.length>15);assert.ok(q.unitAliases.length);
   assert.doesNotMatch(q.plainPrompt,/undefined|NaN|Infinity/);
   assert.doesNotMatch(q.answer,/NaN|Infinity/);
   const steps=q.verification.operations;
   for(const [index,step] of steps.entries()){
    if(step.op==='sqrt'){
     const [n,d]=pair(step.result),source=pair(step.a);
     assert.ok(n>=0n);assert.ok(equal([n*n,d*d],source));
    }else assert.ok(equal(oracle(step.op,step.a,step.b),pair(step.result)),`${skill}/${storyShape}: ${JSON.stringify(step)}`);
    if(index>0)assert.ok(equal(pair(step.a),pair(steps[index-1].result))||equal(pair(step.b),pair(steps[index-1].result)),`${skill}/${storyShape}: step ${index+1} must use the previous result`);
   }
   assert.ok(equal(pair(q.answer),pair(steps.at(-1).result)));
   const [numerator,denominator]=pair(q.answer),g=gcf(numerator,denominator);
   // Counts are whole numbers; measured quantities are exact finite decimals
   // or small rational fractions, never unconstrained noisy decimal answers.
   assert.ok(denominator/g<=1000n,`${skill}: clean reduced denominator`);
   if(storyShape==='compare'){
    assert.match(q.answerChoice,/^[AB]$/);assert.deepEqual(Object.keys(q.choiceLabels),['A','B']);
    assert.ok(numerator>0n);assert.match(q.plainPrompt,/Which option is better/);
    assert.equal(q.choices,undefined,'A comparison needs an option AND a numeric answer with units');
   }
   if(storyShape==='mistake'){assert.match(q.plainPrompt,/Find and fix/);assert.ok(!equal(pair(q.verification.claimedAnswer),pair(q.answer)),'A find-the-mistake claim must really be incorrect');}
   if(storyShape==='what-if')assert.match(q.plainPrompt,/What if/);
  }
 }
});

test('story operation chains model independently checkable physical situations',()=>{
 // These semantic checks inspect complete dependencies, not just an answer
 // copied into an evidence object. Changing a model operation breaks them.
 for(let seed=0;seed<100;seed++){
  const make=skill=>generateStoryArithmetic(skill,`model:${seed}`,{scenarioId:'school-garden',storyShape:'missing',difficulty:3});
  for(const skill of ['D-DIV','F-DIV']){
   const q=make(skill),[available,groups]=q.verification.operations;
   assert.equal(available.op,'sub');assert.equal(groups.op,'div');
   assert.ok(equal(oracle('mul',q.answer,groups.b),pair(available.result)),'All available compost is used in complete pots');
   assert.equal(pair(q.answer)[1],1n);assert.equal(q.answerUnit,'plant pots');
  }
  const percent=make('P-CHANGE'),[change,ratio,pct]=percent.verification.operations;
  assert.ok(equal(pair(ratio.b),pair(change.b)),'Percent change uses the original count, never the final count');
  assert.equal(pct.b,'100');
  const reflect=make('N-REFLECT'),[reflection,distance]=reflect.verification.operations;
  assert.equal(reflection.b,'-1');assert.ok(equal(pair(distance.b),pair(reflection.result)));
  const exponent=make('E-EXP'),[square,panels]=exponent.verification.operations;
  assert.equal(square.op,'pow');assert.equal(panels.op,'mul');assert.equal(exponent.answerUnit,'kilograms');
  const inequality=make('E-INEQ'),[budget,groups]=inequality.verification.operations;
  assert.ok(equal(oracle('add',budget.b,oracleAsString(groups.result,groups.b,'mul')),pair(budget.a)));
 }
});
function oracleAsString(a,b,op){const [n,d]=oracle(op,a,b);return `${n}/${d}`;}

test('inverse stories reconstruct the original rather than reveal it in the prompt',()=>{
 for(const skill of ['D-SUB','D-DIV','F-WHOLE','F-MULT','E-EXP','E-LIKE','N-REFLECT','P-PERCENT','P-CHANGE']){
  const q=generateStoryArithmetic(skill,'inverse-proof',{scenarioId:'science-fair',storyShape:'backward'});
  assert.ok(q.verification.operations.length>=2);
  assert.ok(q.solution.at(-1).includes(q.answer));
  if(skill==='E-EXP'){
   assert.deepEqual(q.verification.operations.map(n=>n.op),['pow','div']);
   assert.doesNotMatch(q.plainPrompt,/It starts at/,'The unknown starting amount must not already be given');
  }
 }
 const order=generateStoryArithmetic('E-ORDER','12',{scenarioId:'art-club',storyShape:'backward'});
 assert.equal(order.verification.operations.at(-1).op,'sqrt');
 assert.doesNotMatch(order.plainPrompt,/Each display has \d+ rows/);
 const factoring=generateStoryArithmetic('E-FACTOR','12',{scenarioId:'art-club',storyShape:'backward'});
 assert.match(factoring.plainPrompt,/Across all the groups/);
 assert.match(factoring.plainPrompt,/number of regular/);
 assert.deepEqual(factoring.verification.operations.map(s=>s.op),['mul','sub','div']);
});

test('mistake claims remain wrong when intermediate and final values coincide',()=>{
 for(const skill of storyArithmeticSkills)for(const difficulty of [1,2,3])for(let seed=0;seed<200;seed++){
  const q=generateStoryArithmetic(skill,`claim:${seed}`,{difficulty,scenarioId:'bake-sale',storyShape:'mistake'});
  assert.ok(!equal(pair(q.verification.claimedAnswer),pair(q.answer)),`${skill}/${difficulty}/${seed}`);
 }
});

test('invalid story options fail explicitly and seeded stories are reproducible',()=>{
 const options={difficulty:2,scenarioId:'bike-trip',storyShape:'compare'};
 assert.deepEqual(generateStoryArithmetic('D-DIV','seed',options),generateStoryArithmetic('D-DIV','seed',options));
 assert.throws(()=>generateStoryArithmetic('bad','seed'));
 assert.throws(()=>generateStoryArithmetic('D-DIV','seed',{scenarioId:'unknown'}));
 assert.throws(()=>generateStoryArithmetic('D-DIV','seed',{storyShape:'fake'}));
 assert.throws(()=>generateStoryArithmetic('D-DIV','seed',{difficulty:4}));
});

test('whole-number exponents span powers two to four and whole, fraction and decimal bases',()=>{
 const powers=new Set(),kinds=new Set(),storyPowers=new Set();
 for(let seed=0;seed<300;seed++){
  const q=generateArithmetic('E-EXP',`coverage:${seed}`,{shape:'calculation'}),v=q.verification;
  powers.add(v.power);kinds.add(v.baseKind);
  assert.ok(equal(oracle('pow',v.base,String(v.power)),pair(q.answer)));
  const inverse=generateArithmetic('E-EXP',`coverage:${seed}`,{shape:'missing'});
  assert.ok(equal(pair(inverse.answer),pair(v.base)));
  const story=generateStoryArithmetic('E-EXP',`coverage:${seed}`,{storyShape:'missing'}),[power,total]=story.verification.operations;
  storyPowers.add(Number(power.b));assert.equal(total.op,'mul');
  assert.ok(equal(oracle('pow',power.a,power.b),pair(power.result)));
  const backward=generateStoryArithmetic('E-EXP',`coverage:${seed}`,{storyShape:'backward'});
  assert.deepEqual(backward.verification.operations.map(n=>n.op),['pow','div']);
 }
 assert.deepEqual([...powers].sort(),[2,3,4]);assert.deepEqual([...storyPowers].sort(),[2,3,4]);assert.deepEqual([...kinds].sort(),['decimal','fraction','whole']);
 for(const difficulty of [1,2,3]){
  const signatures=new Set();
  for(let seed=0;seed<5000;seed++)signatures.add(generateArithmetic('E-EXP',seed,{difficulty,shape:'calculation'}).signature);
  assert.ok(signatures.size>=180,`Level ${difficulty} needs enough distinct exponent parameters for the private 14-day no-repeat window`);
 }
});

test('signed ordering includes decimals and fractions and compares negative values by position',()=>{
 const representations=new Set();let nonWholeStories=0,bothNegative=0;
 for(let seed=0;seed<300;seed++){
  const q=generateArithmetic('N-ORDER',seed,{shape:'calculation'}),v=q.verification;
  representations.add(v.representation);assert.ok(equal(oracle('max',v.a,v.b),pair(q.answer)));
  const story=generateStoryArithmetic('N-ORDER',seed,{storyShape:'missing'}),compare=story.verification.operations[0];
  assert.equal(compare.op,'max');assert.ok(equal(oracle('max',compare.a,compare.b),pair(compare.result)));
  if(pair(compare.a)[1]>1n||pair(compare.b)[1]>1n)nonWholeStories++;
  if(pair(compare.a)[0]<0n&&pair(compare.b)[0]<0n)bothNegative++;
 }
 assert.deepEqual([...representations].sort(),['decimal','fraction','whole']);assert.ok(nonWholeStories>150);assert.equal(bothNegative,300);
});

test('fraction multiplication assesses scaling above and below one against the unscaled option',()=>{
 const directions=new Set();
 for(let seed=0;seed<200;seed++){
  const q=generateStoryArithmetic('F-MULT',seed,{storyShape:'compare'}),[scale,share,difference]=q.verification.operations,factor=pair(scale.b);
  const grows=factor[0]>factor[1];directions.add(grows?'grows':'shrinks');
  assert.equal(q.answerChoice,grows?'A':'B');assert.match(q.choiceLabels.B,/unscaled/);
  const originalShare=oracle('div',scale.a,share.b),newShare=pair(share.result);
  const [n,d]=oracle('sub',`${newShare[0]}/${newShare[1]}`,`${originalShare[0]}/${originalShare[1]}`);
  assert.ok(equal([n<0n?-n:n,d],pair(q.answer)));assert.equal(difference.op,'sub');
  const reason=generateArithmetic('F-MULT',seed,{shape:'reason'});
  assert.match(reason.prompt,/scaling prediction/);assert.match(reason.choices.find(c=>c.value===reason.answer).label,/than 1, the product is/);
  const backward=generateStoryArithmetic('F-MULT',seed,{storyShape:'backward'});
  assert.deepEqual(backward.verification.operations.map(n=>n.op),['mul','mul'],'Early inverse sharing must not require untaught general fraction division');
  assert.match(backward.plainPrompt,/order was 1\//);assert.equal(pair(backward.verification.operations.at(-1).b)[1],1n);
 }
 assert.deepEqual([...directions].sort(),['grows','shrinks']);
});

test('coordinate rectangles derive area from four vertices and invert area to find a missing side coordinate',()=>{
 let rectangleCount=0,routeCount=0;
 for(let seed=0;seed<250;seed++){
  const options={scenarioId:'school-garden',storyShape:'missing'},q=generateStoryArithmetic('N-DIST',seed,options);
  if(q.answerUnit==='square metres'){
   rectangleCount++;assert.match(q.plainPrompt,/four vertices/);
   const vertices=[...q.plainPrompt.matchAll(/\((-?\d+), (-?\d+)\)/g)].map(m=>m.slice(1).map(Number));assert.equal(vertices.length,4);
   const xs=vertices.map(p=>p[0]),ys=vertices.map(p=>p[1]);
   assert.equal(Number(q.answer),(Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys)));
   const backward=generateStoryArithmetic('N-DIST',seed,{...options,storyShape:'backward'});assert.equal(Number(backward.answer),Math.min(...xs));
   assert.deepEqual(backward.verification.operations.map(n=>n.op),['div','sub']);
  }else routeCount++;
 }
 assert.ok(rectangleCount>60);assert.ok(routeCount>60);
});
