import test, { after } from 'node:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const validationRows=[];
after(()=>{if(process.env.GENERATOR_REPORT_DIR){mkdirSync(process.env.GENERATOR_REPORT_DIR,{recursive:true});writeFileSync(join(process.env.GENERATOR_REPORT_DIR,'geometry.json'),JSON.stringify(validationRows,null,2)+'\n');}});
import assert from 'node:assert/strict';
import { generateGeometry, geometrySkills } from '../server/generators/geometry.mjs';
import { parseNumber, eq, rational } from '../server/math.mjs';

const shapes=['calculation','story','missing','mistake','reason','picture'];
function expected(q) {
  const m=q.model;
  if(q.shape==='reason') {
    const correct={
      'G-PERIM':'Add both lengths and both widths.',
      'G-PARA':'Multiply base by perpendicular height.',
      'G-TRI':'Multiply base by perpendicular height, then halve.',
      'G-COMP':'Subtract the corner’s area from the full rectangle’s area.',
      'G-SA':'Find the three face areas, add them, then double.',
      'P-SCALE':'Multiply area by the scale factor twice.',
      'P-MAP':'Multiply map centimetres by metres per centimetre.',
      'G-CIRC':'Find π × diameter, then multiply by the number of circles.',
      'G-CAREA':'Find π × radius squared, then multiply by the number of circles.',
      'G-VOL':'Multiply base area by height.'
    }[q.skill];
    return q.choices.find(choice=>choice.label===correct)?.value;
  }
  if(q.shape==='missing') {
    if(q.skill==='G-PERIM')return rational(m.result/2-m.w);
    if(q.skill==='G-PARA')return rational(m.result/m.b);
    if(q.skill==='G-TRI')return rational(2*m.result/m.b);
    if(q.skill==='G-COMP')return rational((m.w*m.h-m.result)/m.cutH);
    if(q.skill==='G-SA')return rational((m.result-2*m.l*m.w)/(2*(m.l+m.w)));
    if(q.skill==='P-SCALE')return rational(Math.sqrt(m.result/(m.w*m.h)));
    if(q.skill==='P-MAP')return rational(m.result/m.meters);
    if(q.skill==='G-CIRC')return rational(m.radiusTenths,10);
    if(q.skill==='G-CAREA')return rational(m.radiusTenths,10);
    if(q.skill==='G-VOL')return rational(m.result/(m.l*m.w));
  }
  if(q.skill==='G-PERIM')return rational(m.l+m.w+m.l+m.w);
  if(q.skill==='G-PARA')return rational(m.b*m.h);
  if(q.skill==='G-TRI')return rational(m.b*m.h,2);
  if(q.skill==='G-COMP')return rational((m.w-m.cutW)*m.h+m.cutW*(m.h-m.cutH));
  if(q.skill==='G-SA')return rational(m.l*m.w*2+m.h*m.w*2+m.l*m.h*2);
  if(q.skill==='P-SCALE')return rational((m.w*m.k)*(m.h*m.k));
  if(q.skill==='P-MAP')return rational(Array(m.n).fill(m.meters).reduce((a,b)=>a+b,0));
  if(q.skill==='G-CIRC')return rational(314*2*m.radiusTenths*m.count,1000);
  if(q.skill==='G-CAREA')return rational(314*m.radiusTenths*m.radiusTenths*m.count,10000);
  if(q.skill==='G-VOL')return rational(m.l*m.w*m.h);
  throw new Error(q.skill);
}

for(const skill of geometrySkills) {
  test(`${skill}: 500 seeds per template per level, exact answers, six shapes and consistent diagrams`,()=>{
    const seen=new Set();
    for(const shape of shapes)for(let difficulty=1;difficulty<=3;difficulty++)for(let seed=0;seed<500;seed++) {
      const q=generateGeometry(skill,seed,{shape,difficulty});
      seen.add(q.shape);
      if(q.shape==='reason')assert.equal(q.answer,expected(q));
      else assert.ok(eq(parseNumber(q.answer),expected(q)),`${skill} seed ${seed}: ${q.answer}`);
      assert.ok(q.hints.length>=3,`${skill} ${q.shape}: at least three misconceptions`);
      assert.equal(new Set(q.hints.map(h=>h.answer)).size,q.hints.length);
      for(const h of q.hints) {
        const hp=parseNumber(h.answer), ap=parseNumber(q.answer);
        assert.ok(h.answer!==q.answer,`hint is correct answer: ${skill}`);
        if(hp&&ap)assert.ok(!eq(hp,ap));
        assert.ok(h.text.length>15);
      }
      assert.ok(q.solution.length>=3 && q.solution.length<=4);
      assert.ok(q.numbers.length>=1);
      if(q.choices)assert.ok(q.choices.every(choice=>/^option-\d$/.test(choice.value)));
      assert.ok(!JSON.stringify(q).includes('NaN'));
      assert.ok(!JSON.stringify(q).includes('Infinity'));
      if(q.svg) {
        assert.match(q.svg,/viewBox="0 0 520 300"/);
        assert.match(q.svg,/role="img"/);
        assert.match(q.svg,/<title>/);
        assert.ok(!q.svg.includes('undefined'));
      }
      const m=q.model;
      if(skill==='G-PARA')assert.equal(m.h*m.h+m.offset*m.offset,m.side*m.side);
      if(skill==='G-TRI') {
        const a=Math.hypot(m.b*m.apexFraction,m.h),b=Math.hypot(m.b*(1-m.apexFraction),m.h);
        assert.ok(a+b>m.b&&a+m.b>b&&b+m.b>a);
      }
      if(skill==='G-COMP')assert.ok(m.w>m.cutW&&m.h>m.cutH);
      if(q.shape==='missing'&&skill==='P-SCALE')assert.equal(q.svg,undefined);
      assert.deepEqual(q,generateGeometry(skill,seed,{shape,difficulty}));
    }
    assert.equal(seen.size,6);
    validationRows.push({skill,templates:6,levels:3,questionsChecked:9000,failures:0});
  });
}

test('geometry has enough visible-operand variety for the default bonus and replacement reserve',()=>{
  for(const skill of ['G-PERIM','G-PARA','G-TRI','G-SA','P-MAP']) {
    const signatures=new Set();
    for(let seed=0;seed<3000;seed++) {
      const question=generateGeometry(skill,`capacity-${seed}`,{difficulty:3});
      signatures.add(question.numbers.toSorted().join('|'));
    }
    assert.ok(signatures.size >= (skill==='P-MAP'?220:200),`${skill} only has ${signatures.size} distinct visible-operand sets`);
  }
});
