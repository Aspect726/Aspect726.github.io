import test, { after } from 'node:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const validationRows=[];
after(()=>{if(process.env.GENERATOR_REPORT_DIR){mkdirSync(process.env.GENERATOR_REPORT_DIR,{recursive:true});writeFileSync(join(process.env.GENERATOR_REPORT_DIR,'questions.json'),JSON.stringify(validationRows,null,2)+'\n');}});
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
    case 'F-MULT':assert.ok(!equal(r(v.a),r(1))&&!equal(r(v.b),r(1)),'Fraction multiplication must not use a factor of one.');answer=times(r(v.a),r(v.b));break;
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

// Check the mathematical method independently of the generator's correct-choice
// key. This catches an answer-key swap even when grading trusts that same key.
function methodOracle(q) {
 const v=q.verification;
 const methods={
  'D-SUB':/^Line up decimal points, then regroup/, 'D-LONG':/^Divide into equal groups and continue/,
  'D-DIV':/^Multiply both numbers by the same power/, 'F-WHOLE':/^Divide the given amount by the numerator, then multiply by the denominator/,
  'E-EXP':/^Multiply the base by itself/, 'E-ORDER':v.power===2?/^Evaluate the exponent, then multiply, then add/:/^Multiply first, then add/,
  'E-DIST':/^Multiply every term inside/, 'E-FACTOR':/^Find the common factor of every term/,
  'E-LIKE':/^Combine the coefficients of x and keep the constant separate/,
  'E-SOLVE':v.kind==='multiply-equation'?/^Divide both sides by the coefficient/:/^Undo the added amount, then divide/,
  'E-STORY':/^Undo the added amount, then divide/, 'E-2STEP':/^Undo the added amount, then divide/,
  'E-RELATE':/^x is independent\. The value of y depends on x/, 'E-GRAPH':/^Use x as the input and calculate y/,
  'N-OPP':/^Keep the distance from zero and change the sign/, 'N-ABS':/^Count the distance from zero and give a nonnegative value/,
  'N-ORDER':/^Choose the number farther right/, 'N-COORD':/^Read horizontal movement, then vertical/,
  'N-REFLECT':new RegExp(`^Keep the ${v.axis}-coordinate and change the other`),
  'N-DIST':/^Add each point’s distance from zero because they are on opposite sides/,
  'E-INEQ':/^Choose a number on the side named by the inequality/,
  'P-PROP':new RegExp(`^Every nonzero ratio y ÷ x is ${v.k}, and the graph passes through \\(0, 0\\)`),
  'N-ADD':/^Start at the first number and move by the signed change/,
  'N-MULT':/^Multiply absolute values, then use the signs/,
  'F-ADD':/^Make equal denominators, combine the numerators, then simplify/,
  'F-SUB':/^Make equal denominators, combine the numerators, then simplify/,
  'F-MULT':/^Multiply the numerators and denominators, then simplify/,
  'F-DIV':/^Keep the first fraction and multiply by the reciprocal of the second/,
  'F-COMP':/^Use equal denominators, then compare the numerators/,
  'R-RATIO':/^Scale both parts of the ratio by the same factor/,
  'R-RATE':/^Divide to find the unit rate, then multiply/,
  'P-PERCENT':/^Multiply the whole amount by the percent divided by 100/,
  'P-CHANGE':/^Divide the change by the starting amount, then multiply by 100/,
  'N-DIV':/^Split the dividend into multiples of the divisor/, 'WARMUP':/^Keep the tens and add the ones/
 };
 assert.ok(methods[q.skill],`No independent method check for ${q.skill}`);
 const correct=q.choices.filter(choice=>methods[q.skill].test(choice.label));
 assert.equal(correct.length,1,`${q.skill} must have one mathematically sound method`);
 assert.equal(q.answer,correct[0].value);
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

for(const skill of allSkills)test(`${skill}: 500 seeds per template per level, five shapes, exact answers and matched hints`,()=>{
  const seen=new Set();
  for(const shape of ['calculation','story','missing','mistake','reason'])for(let difficulty=1;difficulty<=3;difficulty++)for(let seed=0;seed<500;seed++){
    const q=generateQuestion(skill,seed,{difficulty,shape});
    if(/^-?\d+\/\d+$/.test(q.answer)){const [numerator,denominator]=q.answer.split('/').map(BigInt);assert.notEqual(numerator%denominator,0n,'A fractional answer must not disguise a whole number.');}
    seen.add(q.shape);assert.equal(q.skill,skill);assert.equal(q.seed,seed);assert.equal(q.shape,shape);
    assert.ok(q.prompt.length>15);assert.ok(q.solution.length>=3&&q.solution.length<=4);assert.ok(q.hints.length>=3);
    assert.equal(gradeQuestion(q,q.choices?`option-${q.choices.findIndex(c=>String(c.value)===q.answer)}`:q.answer).correct,true,`${skill}/${seed} rejects its computed answer`);
    for(const h of q.hints){const index=q.choices?.findIndex(c=>String(c.value)===String(h.answer));if(q.choices&&index<0)continue;const result=gradeQuestion(q,q.choices?`option-${index}`:h.answer);assert.equal(result.correct,false,`${skill}/${seed}: misconception is correct`);assert.equal(result.formOnly,false);assert.equal(result.hint,h.text);}
    if(arithmeticSkills.includes(skill)){if(shape==='reason')methodOracle(q);else arithmeticOracle(q);}
    if(q.choices){const values=q.choices.map(c=>c.value);assert.equal(new Set(values).size,values.length);const correct=q.choices.findIndex(c=>String(c.value)===q.answer);assert.notEqual(correct,-1);assert.equal(gradeQuestion(q,`option-${correct}`).correct,true);}
    const visible=publicQuestion(q);for(const field of ['answer','hints','hint','solution','numbers','verification','model','seed','generationSeed','signature'])assert.equal(field in visible,false,field);
    if(visible.choices)visible.choices.forEach((choice,i)=>assert.equal(choice.value,`option-${i}`));
  }
  assert.equal(seen.size,5);
  validationRows.push({skill,templates:5,levels:3,questionsChecked:7500,failures:0});
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
