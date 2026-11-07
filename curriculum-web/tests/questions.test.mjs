import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion, gradeQuestion, publicQuestion, allSkills } from '../server/questions.mjs';
import { arithmeticSkills } from '../server/generators/arithmetic.mjs';
import { math } from '../server/generators/common.mjs';
import { parseNumber, format, fraction, rational, add, sub, mul, div, isSimplest } from '../server/math.mjs';

// Independent cross-multiplication oracle. This deliberately does not use the
// implementation's arithmetic or its stored verification answer.
function rat(value){const s=String(value);if(s.includes('/')){const [n,d]=s.split('/');return [BigInt(n),BigInt(d)];}const [w,f='']=s.split('.');return [BigInt(w+f),10n**BigInt(f.length)];}
const plus=(a,b)=>[a[0]*b[1]+b[0]*a[1],a[1]*b[1]];
const minus=(a,b)=>[a[0]*b[1]-b[0]*a[1],a[1]*b[1]];
const times=(a,b)=>[a[0]*b[0],a[1]*b[1]];
const over=(a,b)=>[a[0]*b[1],a[1]*b[0]];
const equal=(a,b)=>a[0]*b[1]===b[0]*a[1];
function arithmeticOracle(q){
  const v=q.verification,missing=q.shape==='missing';
  const r=x=>rat(x);let answer;
  switch(v.kind){
    case 'sub': answer=missing?r(v.b):minus(r(v.a),r(v.b));break;
    case 'div': answer=over(r(v.a),r(v.b));break;
    case 'whole':answer=over(times(r(v.part),r(v.d)),r(v.n));break;
    case 'square':answer=missing?r(v.base):times(r(v.base),r(v.base));break;
    case 'order':answer=missing?r(v.b):plus(r(v.a),times(r(v.b**(v.power??1)),r(v.c)));break;
    case 'F-ADD':answer=plus(r(v.a),r(v.b));break;
    case 'F-SUB':answer=minus(r(v.a),r(v.b));break;
    case 'F-MULT':answer=times(r(v.a),r(v.b));break;
    case 'F-DIV':answer=over(r(v.a),r(v.b));break;
    case 'ratio':answer=over(times(r(v.known),r(v.c)),r(v.a));break;
    case 'rate':answer=times(over(r(v.cost),r(v.count)),r(v.target));break;
    case 'percent':answer=over(times(r(v.whole),r(v.pct)),r(100));break;
    case 'percent-change':{const change=minus(r(v.now),r(v.old));change[0]=change[0]<0n?-change[0]:change[0];answer=times(over(change,r(v.old)),r(100));break;}
    case 'E-DIST':return assert.equal(q.answer,`${v.a}x + ${v.a*v.c}`);
    case 'E-FACTOR':return assert.equal(q.answer,`${v.a}(x + ${v.c})`);
    case 'E-LIKE':return assert.equal(q.answer,`${v.a+v.c}x + ${v.d}`);
    case 'multiply-equation':answer=over(r(v.total),r(v.coefficient));break;
    case 'equation':answer=over(minus(r(v.total),r(v.b)),r(v.a));break;
    case 'rule':answer=missing&&q.skill==='E-RELATE'?r(v.x):plus(times(r(v.k),r(v.x)),r(v.c));break;
    case 'proportion-constant':answer=over(r(v.y),r(v.x));break;
    case 'opposite':answer=r(-v.n);break;
    case 'absolute':answer=r(Math.abs(v.n));break;
    case 'greater':answer=r(Math.max(v.a,v.b));break;
    case 'coordinate':return assert.equal(q.answer,`(${v.x}, ${v.y})`);
    case 'reflection':return assert.equal(q.answer,`(${v.axis==='y'?-v.x:v.x}, ${v.axis==='x'?-v.y:v.y})`);
    case 'distance':answer=r(Math.abs(v.b-v.a));break;
    case 'inequality':{const c=Number(q.answer);assert.ok(v.sign==='>'?c>v.boundary:v.sign==='<'?c<v.boundary:v.sign==='≥'?c>=v.boundary:c<=v.boundary);return;}
    case 'signed-multiply':case 'multiply':answer=times(r(v.a),r(v.b));break;
    case 'signed-add':case 'addition':answer=plus(r(v.a),r(v.b));break;
    case 'fraction-compare':{const a=r(v.a),b=r(v.b);assert.ok(a[0]*b[1]<b[0]*a[1]);return assert.equal(q.answer,'right');}
    default:throw new Error(`Missing independent oracle for ${v.kind}`);
  }
  assert.ok(equal(r(q.answer),answer),`${q.skill} ${q.seed} ${q.shape}: answer ${q.answer}`);
}

test('exact arithmetic accepts equivalent fractions, mixed numbers and decimals',()=>{
  assert.deepEqual(parseNumber('1 3/4'),parseNumber('1.75'));
  assert.deepEqual(parseNumber('-1 3/4'),parseNumber('−1.75'));
  assert.deepEqual(parseNumber('3/4'),parseNumber('0.75'));
  assert.deepEqual(parseNumber('1,240.25'),parseNumber('1240.25'));
  assert.equal(format(sub('12','4.685')),'7.315');
  assert.equal(format(div('7.2','0.06')),'120');
  assert.equal(fraction(mul('2/3','2/3')),'4/9');
  assert.equal(format(add('0.1','0.2')),'0.3');
  assert.equal(format(rational(1,32)),'0.03125');
  for(const input of ['','1/0','0/0','1 7/4','1e3','1,23','Infinity','NaN','2x','--2'])assert.equal(parseNumber(input),null,input);
});

test('simplest form is separate from a wrong value',()=>{
  const q={answer:'2/3',simplest:true,hints:[],hint:'Find equal-sized parts.'};
  assert.deepEqual(gradeQuestion(q,'4/6'),{correct:false,formOnly:true,hint:'Right value. Write it in simplest form.'});
  assert.equal(gradeQuestion(q,'2/3').correct,true);
  assert.equal(gradeQuestion(q,'1/3').formOnly,false);
  assert.equal(isSimplest('1 2/4'),false);
});

test('MathML preserves mixed forms and never groups decimal digits',()=>{
  assert.match(math('1 3/4'),/<mn>1<\/mn><mfrac><mn>3<\/mn><mn>4<\/mn>/);
  assert.match(math('4/6'),/<mn>4<\/mn><mn>6<\/mn>/);
  assert.match(math('0.03125'),/<mn>0\.03125<\/mn>/);
  assert.match(math('1234.125'),/<mn>1,234\.125<\/mn>/);
});

for(const skill of allSkills)test(`${skill}: 500 seeds, five shapes, exact answers and matched hints`,()=>{
  const seen=new Set();
  for(let seed=0;seed<500;seed++){
    const shape=['calculation','story','missing','mistake','reason'][seed%5],q=generateQuestion(skill,seed,{difficulty:seed%3+1,shape});
    seen.add(q.shape);assert.equal(q.skill,skill);assert.equal(q.seed,seed);assert.equal(q.shape,shape);
    assert.ok(q.prompt.length>15);assert.ok(q.solution.length>=3&&q.solution.length<=4);assert.ok(q.hints.length>=3);
    assert.equal(gradeQuestion(q,q.choices?`option-${q.choices.findIndex(c=>String(c.value)===q.answer)}`:q.answer).correct,true,`${skill}/${seed} rejects its computed answer`);
    for(const h of q.hints){const index=q.choices?.findIndex(c=>String(c.value)===String(h.answer));if(q.choices&&index<0)continue;const result=gradeQuestion(q,q.choices?`option-${index}`:h.answer);assert.equal(result.correct,false,`${skill}/${seed}: misconception is correct`);assert.equal(result.formOnly,false);assert.equal(result.hint,h.text);}
    if(arithmeticSkills.includes(skill)&&shape!=='reason')arithmeticOracle(q);
    if(q.choices){const values=q.choices.map(c=>c.value);assert.equal(new Set(values).size,values.length);const correct=q.choices.findIndex(c=>String(c.value)===q.answer);assert.notEqual(correct,-1);assert.equal(gradeQuestion(q,`option-${correct}`).correct,true);}
    const visible=publicQuestion(q);for(const field of ['answer','hints','hint','solution','numbers','verification','model','seed','generationSeed','signature'])assert.equal(field in visible,false,field);
    if(visible.choices)visible.choices.forEach((choice,i)=>assert.equal(choice.value,`option-${i}`));
  }
  assert.equal(seen.size,5);
});

test('seeds regenerate the identical server question and public projection',()=>{
  for(const skill of allSkills){const seed='student:a:date:2026-11-07:slot:5';assert.deepEqual(generateQuestion(skill,seed),generateQuestion(skill,seed));}
});

test('expression generators cover exponents, inverse rules, variables and proportional constants',()=>{
  let fractionalCoefficient=false,decimalAnswer=false,constantRate=false;
  for(let seed=0;seed<200;seed++){
    const order=generateQuestion('E-ORDER',seed,{difficulty:2,shape:'calculation'});
    assert.equal(order.verification.power,2);assert.match(order.prompt,/<msup>/);
    const relate=generateQuestion('E-RELATE',seed,{shape:'missing'});
    assert.equal(Number(relate.answer),relate.verification.x);assert.match(relate.prompt,/find x/);
    const variables=generateQuestion('E-RELATE',seed,{shape:'reason'});
    assert.match(variables.choices.find(c=>c.value===variables.answer).label,/x is independent.*y depends on x/);
    const solve=generateQuestion('E-SOLVE',seed,{shape:'calculation'});
    if(solve.verification.kind==='multiply-equation'){
      fractionalCoefficient ||= solve.verification.coefficient.includes('/');
      decimalAnswer ||= solve.answer.includes('.');
    }
    const prop=generateQuestion('P-PROP',seed,{shape:'calculation'});
    constantRate ||= prop.verification.kind==='proportion-constant';
    const why=generateQuestion('P-PROP',seed,{shape:'reason'});
    assert.match(why.choices.find(c=>c.value===why.answer).label,/ratio.*\(0, 0\)/);
    const exp=generateQuestion('E-EXP',seed,{shape:'calculation'});
    assert.match(exp.prompt,/<msup>/);assert.doesNotMatch(exp.prompt,/<mfenced/);
    if(exp.prompt.includes('<mfrac>')){assert.match(exp.prompt,/<mo>\(<\/mo>/);assert.match(exp.prompt,/<mo>\)<\/mo>/);}
  }
  assert.ok(fractionalCoefficient);assert.ok(decimalAnswer);assert.ok(constantRate);
});

test('choice answers require a displayed opaque option, never a private answer key',()=>{
  const q=generateQuestion('E-EXP','private-choice-key',{shape:'reason'});
  assert.equal(gradeQuestion(q,q.answer).correct,false);
  assert.equal(gradeQuestion(q,'reason-correct').correct,false);
  const index=q.choices.findIndex(c=>c.value===q.answer);
  assert.equal(gradeQuestion(q,`option-${index}`).correct,true);
});
