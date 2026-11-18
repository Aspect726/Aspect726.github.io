import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM_SKILLS } from '../server/curriculum.mjs';
import { IM_UNITS, IM_SKILL_ALIGNMENT, alignmentForSkill, unitForSkill, unitCoverage } from '../server/im-alignment.mjs';

test('all 70 course skills have a valid explicit IM home and separate supporting connections', () => {
  assert.deepEqual(Object.keys(IM_SKILL_ALIGNMENT).sort(), Object.keys(CURRICULUM_SKILLS).sort());
  assert.equal(Object.keys(IM_SKILL_ALIGNMENT).length, 70);
  const units = new Set(IM_UNITS.map(unit => unit.id));
  for (const [id, alignment] of Object.entries(IM_SKILL_ALIGNMENT)) {
    assert.equal(alignment.skillId, id);
    assert.ok(units.has(alignment.primaryUnitId));
    assert.equal(alignment.primaryUnit, unitForSkill(id));
    assert.ok(alignment.standards.length > 0);
    for (const related of alignment.relatedUnits) {
      assert.ok(units.has(related.id));
      assert.notEqual(related.id, alignment.primaryUnitId);
      assert.equal(related.relationship, 'supporting');
    }
  }
  assert.equal(unitForSkill('unknown'), null);
  assert.equal(alignmentForSkill('WARMUP'), null, 'a generator family is not a curriculum skill');
});

test('unit mappings preserve important grade boundaries and contextual targets', () => {
  const homes = {
    'G-WVOL':'5.1', 'G-VOL':'6.4', 'F-UNITDIV':'5.3', 'F-DIV':'6.4',
    'R-RATIO':'6.2', 'R-RATE':'6.3', 'P-PERCENT':'6.3', 'P-CHANGE':'7.4',
    'P-SCALE':'7.1', 'P-PROP':'7.2', 'G-CIRC':'7.3', 'G-CAREA':'7.3',
    'N-REFLECT':'6.7', 'N-FACTORS':'6.7', 'E-INEQ':'6.7', 'E-2STEP':'7.6',
    'N-ADD':'7.5', 'N-SDIV':'7.5', 'S-PROB':'7.8', 'S-SAMPLE':'7.8',
    'S-LINEPLOT':'5.6', 'G-PERIM':'6.6', 'E-NUM':'5.1'
  };
  for (const [skill, unit] of Object.entries(homes)) assert.equal(unitForSkill(skill).id, unit, skill);
  assert.equal(alignmentForSkill('F-COMP').relationship, 'prerequisite');
  assert.match(alignmentForSkill('F-COMP').note, /earlier-grade prerequisite/);
});

test('coverage counts measured course progress once and never infers a completed IM unit', () => {
  const progress = [
    {skill:'D-SUB'},
    {skill:'D-SUB',attempts:12,mastery:'mastered'},
    {skill:'D-SUB',attempts:12,mastery:'mastered'},
    {skill:'D-ADD',attempts:2,mastery:'learning'},
    {skill:'D-DIV',attempts:0,mastery:'mastered'},
    {skill:'unknown',attempts:500,mastery:'mastered'},
    {id:'F-COMP',attempts:3,level:'practicing'}
  ];
  const snapshot=JSON.stringify(progress), result=unitCoverage(progress);
  assert.equal(JSON.stringify(progress),snapshot,'does not edit the source progress');
  assert.deepEqual(result.summary,{courseSkills:70,practiced:3,mastered:1});
  assert.equal(result.units.reduce((sum,unit)=>sum+unit.skillCount,0),70);
  const decimals=result.units.find(unit=>unit.id==='5.5');
  assert.equal(decimals.practiced,2);
  assert.equal(decimals.mastered,1);
  assert.equal(decimals.notStarted,3);
  assert.equal(result.units.find(unit=>unit.id==='6.5').mastered,0,'a status without actual attempts does not establish mastery');
  assert.match(result.scope,/not all lessons/);
  assert.ok(result.units.every(unit=>!('complete' in unit)));
});

test('empty coverage preserves unmapped units and never treats availability as mastery', () => {
  const result=unitCoverage();
  assert.equal(result.units.length,26);
  assert.deepEqual(result.summary,{courseSkills:70,practiced:0,mastered:0});
  for(const id of ['5.8','6.9','7.7','7.9']) {
    const unit=result.units.find(unit=>unit.id===id);
    assert.equal(unit.skillCount,0);
    assert.equal(unit.practiced,0);
    assert.equal(unit.mastered,0);
    assert.match(unit.coverageLabel,/No primary course skills mapped/);
  }
  assert.deepEqual(unitCoverage(null).summary,result.summary);
  const quotientUnit=result.units.find(unit=>unit.id==='5.2');
  assert.equal(quotientUnit.skillCount,0);
  assert.equal(quotientUnit.relatedSkillCount,3);
  assert.equal(quotientUnit.coverageLabel,'Supporting connections only');
});
