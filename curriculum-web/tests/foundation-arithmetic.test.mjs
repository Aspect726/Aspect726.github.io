import test from 'node:test';
import assert from 'node:assert/strict';
import {foundationArithmeticSkills as skills,foundationBranches,foundationArithmeticScenarios as scenarios,generateFoundationArithmetic as generate} from '../server/generators/foundation-arithmetic.mjs';

// An independent integer-pair oracle. It never imports the generator's maths.
const pair=x=>{const s=String(x);if(s.includes('/'))return s.split('/').map(BigInt);const [n,d='']=s.split('.');return [BigInt(n+d),10n**BigInt(d.length)];};
const equal=(a,b)=>a[0]*b[1]===b[0]*a[1];
const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b)[a,b]=[b,a%b];return a;};
function calculate(op,x,y){const a=pair(x),b=pair(y);switch(op){
 case 'add':return [a[0]*b[1]+b[0]*a[1],a[1]*b[1]];
 case 'sub':return [a[0]*b[1]-b[0]*a[1],a[1]*b[1]];
 case 'mul':return [a[0]*b[0],a[1]*b[1]];
 case 'div':assert.notEqual(b[0],0n);return [a[0]*b[1],a[1]*b[0]];
 case 'pow':return [a[0]**b[0],a[1]**b[0]];
 case 'round':{const places=Number(y),topScale=places>=0?10n**BigInt(places):1n,bottomScale=places<0?10n**BigInt(-places):1n,top=a[0]*topScale,bottom=a[1]*bottomScale,q=top/bottom,rem=top%bottom;return [(q+(2n*rem>=bottom?1n:0n))*bottomScale,topScale];}
 case 'gcd':return [gcd(a[0],b[0]),1n];
 case 'lcm':return [a[0]*b[0]/gcd(a[0],b[0]),1n];
 case 'max':return a[0]*b[1]>b[0]*a[1]?a:b;
 default:throw Error('Missing oracle for '+op);
}}
const shapes=['missing','compare','backward','mistake','what-if'];
function verify(q){
 const steps=q.verification.operations;
 assert.equal(q.solution.length,steps.length);
 assert.doesNotMatch(q.plainPrompt,/undefined|NaN|Infinity/);
 assert.ok(q.plainPrompt.includes(q.answerUnit));assert.match(q.plainPrompt,/Include/);
 assert.equal(q.hints.length,3);assert.equal(new Set(q.hints.map(h=>h.answer)).size,3);
 for(const hint of q.hints)assert.ok(!equal(pair(hint.answer),pair(q.answer)));
 for(const [i,n] of steps.entries()){
  assert.ok(equal(calculate(n.op,n.a,n.b),pair(n.result)),`${q.skill}: ${JSON.stringify(n)}`);
  if(i)assert.ok(equal(pair(n.a),pair(steps[i-1].result))||equal(pair(n.b),pair(steps[i-1].result)),`${q.skill}: step ${i+1} must depend on step ${i}`);
 }
 assert.ok(equal(pair(q.answer),pair(steps.at(-1).result)));
 const [n,d]=pair(q.answer);assert.ok(d/gcd(n,d)<=10000n,'Constrained, clean answers');
 if(q.storyShape==='mistake')assert.ok(!equal(pair(q.verification.claimedAnswer),pair(q.answer)));
 if(q.storyShape==='compare'){
  assert.match(q.answerChoice,/^[AB]$/);assert.deepEqual(Object.keys(q.choiceLabels),['A','B']);
  assert.ok(n>0n);assert.match(q.plainPrompt,/option A or B and units/);
 }
}

test('every foundation branch provides all sixteen scenes, five story shapes, and two warm-up shapes',()=>{
 assert.equal(skills.length,11);
 for(const skill of skills)for(const branch of foundationBranches[skill])for(const difficulty of [1,2,3]){
  assert.equal(new Set(scenarios(skill)).size,16);
  for(const scenarioId of scenarios(skill))for(const storyShape of shapes)for(let seed=0;seed<3;seed++){
   const q=generate(skill,`independent:${seed}`,{mode:'story',branch,difficulty,scenarioId,storyShape});
   assert.equal(q.story,true);assert.equal(q.scenarioId,scenarioId);assert.equal(q.verification.branch,branch);
   assert.ok(q.stepCount>=2&&q.stepCount<=4);assert.equal(q.stepCount,q.solution.length);verify(q);
  }
  for(const shape of ['calculation','missing'])for(let seed=0;seed<10;seed++){
   const q=generate(skill,`warm:${seed}`,{branch,difficulty,shape});assert.equal(q.story,undefined);assert.equal(q.shape,shape);verify(q);
  }
 }
});

test('fraction division includes both unit fraction directions and whole-number sharing as a fraction',()=>{
 for(let seed=0;seed<100;seed++){
  const make=branch=>generate('F-UNITDIV',seed,{mode:'story',storyShape:'missing',branch});
  const sharing=make('whole-sharing'),[share,total]=sharing.verification.operations;
  assert.equal(share.op,'div');assert.equal(pair(share.a)[1],1n);assert.equal(pair(share.b)[1],1n);
  assert.ok(Number(share.a)<Number(share.b));assert.ok(pair(share.result)[1]>1n);
  assert.equal(total.op,'mul');assert.match(sharing.plainPrompt,/equally among.*teams/);
  const unit=make('unit-by-whole').verification.operations[0];assert.equal(unit.op,'div');assert.equal(pair(unit.a)[0]/gcd(...pair(unit.a)),1n);
  const whole=make('whole-by-unit').verification.operations.at(-1);assert.equal(whole.op,'div');assert.equal(pair(whole.b)[0]/gcd(...pair(whole.b)),1n);
 }
});

test('rounding, unit conversions, pattern coordinates, GCF/LCM and signed division exercise their actual models',()=>{
 const factors=new Set(),roundPlaces=new Set(),signed=new Set();let ties=0;
 for(let seed=0;seed<300;seed++){
  const make=(skill,branch)=>generate(skill,`coverage:${seed}`,{mode:'story',storyShape:'missing',branch,difficulty:3});
  for(const branch of foundationBranches['N-ROUND']){
   const q=make('N-ROUND',branch),n=q.verification.operations[0],a=pair(n.a),places=Number(n.b),top=a[0]*(places>=0?10n**BigInt(places):1n),bottom=a[1]*(places<0?10n**BigInt(-places):1n);
   roundPlaces.add(n.b);if(2n*(top%bottom)===bottom)ties++;
  }
  for(const branch of foundationBranches['M-CONVERT']){const q=make('M-CONVERT',branch);factors.add(q.verification.operations[0].b);}
  const graph=make('E-PATTERN'),[round,out]=graph.verification.operations;
  assert.equal(round.op,'div');assert.equal(out.op,'mul');assert.match(graph.svg,/First-quadrant/);assert.match(graph.svg,/Plotted pairs:/);
  assert.ok(Number(round.result)>=4);assert.ok(Number(out.b)>Number(round.b));
  for(const branch of ['gcf','lcm']){const q=make('N-FACTORS',branch);assert.equal(q.verification.operations[0].op,branch==='gcf'?'gcd':'lcm');}
  for(const branch of foundationBranches['N-SDIV']){
   const q=make('N-SDIV',branch),divide=q.verification.operations[0];assert.equal(divide.op,'div');signed.add(Number(divide.result)>0?'positive':'negative');
  }
 }
 assert.deepEqual([...roundPlaces].sort((a,b)=>Number(a)-Number(b)),['-2','-1','0','1','2','3']);assert.ok(ties>20);
 assert.deepEqual([...factors].sort(),['100','1000','12','16','3','60']);assert.deepEqual([...signed].sort(),['negative','positive']);
});

test('place values, decimal comparisons and grouped expressions preserve the required order',()=>{
 const powers=new Set();
 for(let seed=0;seed<150;seed++){
  const q=generate('N-PLACE',seed,{mode:'story',storyShape:'missing',branch:'powers-of-ten',difficulty:3});powers.add(q.verification.operations[0].b);
  const compare=generate('N-PLACE',seed,{mode:'story',storyShape:'missing',branch:'decimal-compare'});assert.equal(compare.verification.operations[0].op,'max');
  const expr=generate('E-NUM',seed,{mode:'story',storyShape:'missing'});assert.deepEqual(expr.verification.operations.map(n=>n.op),['add','mul','add']);assert.match(expr.plainPrompt,/× \(/);
 }
 assert.deepEqual([...powers].sort(),['10','100','1000']);
});

test('defaults vary warm-up shape deterministically and invalid options fail explicitly',()=>{
 const shapeSet=new Set();for(let seed=0;seed<100;seed++)shapeSet.add(generate('N-PLACE',seed).shape);
 assert.deepEqual([...shapeSet].sort(),['calculation','missing']);
 const options={mode:'story',storyShape:'compare',scenarioId:'robot-club',difficulty:2};
 assert.deepEqual(generate('D-ADD','seed',options),generate('D-ADD','seed',options));
 assert.throws(()=>generate('bad','seed'));assert.throws(()=>generate('D-ADD','seed',{difficulty:0}));
 assert.throws(()=>generate('D-ADD','seed',{scenarioId:'bad'}));assert.throws(()=>generate('D-ADD','seed',{shape:'picture'}));
});
