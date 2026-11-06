import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRational,gradeAnswer,inferGrading} from '../server/grading.mjs';
const q=(type,expected,extra={})=>({grading:{type,expected,...extra}});
test('exact arithmetic accepts equivalent fractions, decimal and signed mixed numbers',()=>{
  for(const [expected,answer]of [['3/4','6/8'],['3/4','.75'],['-7/4','-1 3/4'],['-1/2','1/-2'],['0.3','3/10'],['1/4','25%']])assert.equal(gradeAnswer(q('number',expected),answer).status,'correct');
  assert.deepEqual(parseRational('-1 3/4'),{n:-7n,d:4n});
  assert.equal(gradeAnswer(q('number','0.3'),'0.30000000000000001').correct,false);
});
test('invalid math never executes and never completes',()=>{
  for(const input of ['1/0','0/0','process.exit()','1;throw new Error()','Infinity','NaN','1e999','<script>alert(1)</script>','1'.repeat(500),''])assert.notEqual(gradeAnswer(q('number','1'),input).status,'correct');
});
test('equivalence and required representation are separate',()=>{
  assert.equal(gradeAnswer(q('number','3/4',{requireSimplified:true}),'6/8').equivalent,true);
  assert.equal(gradeAnswer(q('number','3/4',{requireSimplified:true}),'6/8').formatValid,false);
  assert.equal(gradeAnswer(q('number','7/4',{requireMixed:true}),'7/4').status,'incorrect');
  assert.equal(gradeAnswer(q('number','7/4',{requireMixed:true}),'1 3/4').status,'correct');
  assert.equal(gradeAnswer(q('number','1/4',{requirePercent:true}),'0.25').status,'incorrect');
  assert.equal(gradeAnswer(q('number','1/4',{requirePercent:true}),'25%').status,'correct');
});
test('units and rounding are independently enforced',()=>{
  assert.equal(gradeAnswer(q('number','12',{units:'cm',requireUnits:true}),'12 centimeters').status,'correct');
  assert.equal(gradeAnswer(q('number','12',{units:'cm',requireUnits:true}),'12 m').status,'incorrect');
  assert.equal(gradeAnswer(q('number','12',{units:'square cm',requireUnits:true}),'12 cm²').status,'correct');
  assert.equal(gradeAnswer(q('number','12',{units:'cm',requireUnits:true}),'12').equivalent,true);
  assert.equal(gradeAnswer(q('number','1.3',{decimalPlaces:1}),'1.30').status,'incorrect');
  assert.equal(gradeAnswer(q('number','1.3',{decimalPlaces:1}),'1.3').status,'correct');
  assert.equal(gradeAnswer(q('number','1.3',{tolerance:'0.01'}),'1.31').status,'correct');
  assert.equal(gradeAnswer(q('number','1.3',{tolerance:'0.01'}),'1.3100001').status,'incorrect');
});
test('comparisons validate original operands, lists and coordinates preserve order',()=>{
  assert.equal(gradeAnswer(q('comparison','{3/7} < {5/7}'),'<').status,'correct');
  assert.equal(gradeAnswer(q('comparison','{3/7} < {5/7}'),'6/14 < 10/14').status,'correct');
  assert.equal(gradeAnswer(q('comparison','{3/7} < {5/7}'),'1 < 2').status,'incorrect');
  assert.equal(gradeAnswer(q('ordered-list',['1/4','1/2','3/4']),'0.25, 0.5, .75').status,'correct');
  assert.equal(gradeAnswer(q('ordered-list',['1/4','1/2','3/4']),'0.5, 0.25, .75').status,'incorrect');
  assert.equal(gradeAnswer(q('coordinates','(-2, 3/4)'),'-2, .75').status,'correct');
  assert.equal(gradeAnswer(q('ratio','3:4'),'6:8').status,'correct');
  assert.equal(gradeAnswer(q('ratio','3:4',{requireSimplified:true}),'6:8').status,'incorrect');
});
test('exact polynomial equivalence supports expansion and rejects executable input',()=>{
  for(const [expected,input]of [['2(x+3)','2x+6'],['(x+1)^2','x^2+2x+1'],['x/2+1/3','(3x+2)/6'],['-x^2','-(x*x)'],['36π','18*2*pi']])assert.equal(gradeAnswer(q('expression',expected),input).status,'correct',input);
  assert.equal(gradeAnswer(q('expression','(x+1)^2'),'x^2+1').status,'incorrect');
  assert.equal(gradeAnswer(q('expression','x+1'),'process.exit()').status,'teacher_review');
  assert.equal(gradeAnswer(q('expression','x+1'),'(x^2-1)/(x-1)').status,'teacher_review');
  assert.equal(gradeAnswer(q('expression','2*x+6',{requireExpanded:true}),'2*(x+3)').formatValid,false);
  assert.equal(gradeAnswer(q('expression','2*x+6',{requireSimplified:true}),'x+x+6').status,'teacher_review');
  assert.equal(gradeAnswer(q('equation','2*x=4'),'x=2').status,'correct');
  assert.equal(gradeAnswer(q('equation','2*x=4'),'x=3').status,'incorrect');
});
test('inference is conservative for constructed responses',()=>{
  assert.equal(inferGrading({answer:'3/4',prompt:'Compute.'}).type,'number');
  assert.equal(inferGrading({answer:'12 cm',prompt:'Find the length.'}).type,'number');
  assert.equal(inferGrading({answer:'12',prompt:'Explain your reasoning.'}).type,'teacher-review');
  assert.equal(inferGrading({answer:'12',challenge:true}).type,'teacher-review');
  assert.equal(gradeAnswer({answer:'Lina; 3/4 liter'},'Lina; 3/4 liter').status,'teacher_review');
  assert.equal(inferGrading({answer:'12 cups yellow and 21 cups blue'}).type,'teacher-review');
  assert.equal(inferGrading({answer:'3 groups. Stories vary.'}).type,'teacher-review');
  assert.equal(inferGrading({answer:'1 3/4',prompt:'On a number line, place 7/4.'}).type,'teacher-review');
  assert.equal(inferGrading({answer:'11.819',prompt:'Find 12 − 0.181. Show regrouping.'}).type,'teacher-review');
  assert.equal(gradeAnswer(q('number','4',{requiresReasoning:true}),'4').status,'teacher_review');
});
test('multipart challenges retain per-part grading while counting as one result',()=>{
  const question={grading:{type:'multipart',parts:[{id:'a',...q('number','3/4')},{id:'b',...q('number','12',{units:'cm',requireUnits:true})}]}};
  const correct=gradeAnswer(question,{parts:{a:'0.75',b:'12 cm'}});
  assert.equal(correct.status,'correct');assert.equal(correct.parts.length,2);
  const retry=gradeAnswer(question,{parts:{a:'0.75',b:'13 cm'}});
  assert.equal(retry.status,'incorrect');assert.equal(retry.parts[0].status,'correct');
});
