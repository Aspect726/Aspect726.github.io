import test from 'node:test';
import assert from 'node:assert/strict';
import { generateStoryArithmetic, storyArithmeticSkills, arithmeticStoryScenarios } from '../server/generators/story-arithmetic.mjs';
import { arithmeticSkills } from '../server/generators/arithmetic.mjs';

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
 case 'pow':assert.equal(right,'2');return [a[0]*a[0],a[1]*a[1]];
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
  assert.equal(square.op,'pow');assert.equal(panels.op,'mul');assert.equal(exponent.answerUnit,'square metres');
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
   assert.equal(q.verification.operations.at(-1).op,'sqrt');
   assert.doesNotMatch(q.plainPrompt,/One side of each square is/,'The unknown side must not already be given');
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
