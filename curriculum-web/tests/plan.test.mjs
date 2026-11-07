import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SKILLS, STRENGTHS, buildSlots, calendar, dayInfo, pacificDate, validDate } from '../server/plan.mjs';
import { buildExclusions, overlaps, extractNumbers } from '../server/overlap.mjs';

test('all 70 dates follow the authoritative focus and exact required mix', () => {
  assert.equal(Object.keys(SKILLS).length,54);
  const days = calendar('2026-11-07','2026-11-07');
  assert.equal(days.length,70); assert.equal(days[0].date,'2026-11-07'); assert.equal(days[69].date,'2027-01-15');
  for (const day of days) {
    const slots = buildSlots(day.index);
    assert.equal(slots.length,20);
    assert.deepEqual(Object.fromEntries(['warm','focus','recent','older'].map(category=>[category,slots.filter(s=>s.category===category).length])), {warm:2,focus:10,recent:5,older:3});
    assert.deepEqual(slots.slice(0,6).map(s=>s.category),['warm','warm','focus','focus','focus','focus']);
    assert.ok(slots.filter(s=>s.category==='focus').every(s=>day.focus.includes(s.skill)));
    if(day.week===1) assert.ok(slots.filter(s=>s.category==='recent').every(s=>STRENGTHS.includes(s.skill)));
    assert.ok(slots.every(s=>s.skill==='WARMUP'||SKILLS[s.skill]));
  }
  assert.deepEqual(dayInfo(0).focus,['D-SUB','D-LONG']);
  assert.deepEqual(dayInfo(2).focus,dayInfo(0).focus);
  assert.deepEqual(dayInfo(3).focus,dayInfo(1).focus);
  assert.equal(dayInfo(64).focus.length,54);
});

test('calendar shifts without DST drift and pauses do not delete required days', () => {
  const shifted=calendar('2027-03-06','2027-03-14',['2027-03-14']);
  assert.equal(shifted[8].date,'2027-03-14'); assert.equal(shifted[8].status,'paused');
  assert.equal(shifted[9].date,'2027-03-15'); assert.equal(shifted[69].date,'2027-05-14');
  assert.deepEqual(shifted[8].focus,dayInfo(8).focus);
  assert.equal(pacificDate('2026-11-07T07:59:59Z'),'2026-11-06');
  assert.equal(pacificDate('2026-11-07T08:00:00Z'),'2026-11-07');
  assert.equal(pacificDate('2027-03-14T07:59:59Z'),'2027-03-13');
  assert.equal(pacificDate('2027-03-14T08:00:00Z'),'2027-03-14');
  assert.equal(validDate('2027-02-29'),false); assert.equal(validDate('2028-02-29'),true);
  assert.throws(()=>dayInfo(70)); assert.throws(()=>calendar('2026-02-30'));
});

test('bonus rounds have 15 then 10 questions, more current focus and harder practice', () => {
  for(let day=0;day<70;day++) for(let round=0;round<4;round++) {
    const slots=buildSlots(day,'bonus',round);
    assert.equal(slots.length,round===0?15:10);
    assert.ok(slots.filter(s=>s.category==='focus').length/slots.length>0.5);
    assert.ok(slots.filter(s=>s.category!=='warm').every(s=>s.difficulty===3));
    assert.deepEqual(slots,buildSlots(day,'bonus',round));
  }
});

test('paper overlap normalizes equivalent numbers, word numbers and slide examples', () => {
  assert.deepEqual(extractNumbers('Four friends share $7.00.'),['4','7']);
  assert.deepEqual(extractNumbers('A box is 2 {1/2} ft by 0.50 ft.'),['5/2','1/2']);
  const exclusion=buildExclusions({count:3,questions:[
    {question:'Find 20 − 7.408.',source:'paper sheet'},
    {question:'Find the mean of 3, 7, 8.',steps:['A second example: mean of 4, 9, 11.'],source:'slide worked example'},
    {question:'Four friends share $7 equally.',source:'paper sheet'}
  ]});
  assert.equal(overlaps({skill:'D-SUB',plainPrompt:'Find 20 − 7.408!',numbers:['20','7.408']},exclusion).kind,'text');
  assert.equal(overlaps({skill:'D-SUB',plainPrompt:'A new story.',numbers:['20.000','926/125']},exclusion).kind,'numbers');
  assert.equal(overlaps({skill:'D-LONG',plainPrompt:'Different names.',numbers:['7','4']},exclusion).kind,'numbers');
  assert.equal(overlaps({skill:'S-MEAN',plainPrompt:'More data.',numbers:['4','9','11']},exclusion).kind,'numbers');
  assert.equal(overlaps({skill:'D-SUB',plainPrompt:'Find a difference.',numbers:['31','9.541']},exclusion),null);
  assert.throws(()=>buildExclusions({questions:[]}));
});

test('release overlap check fails explicitly when the private corpus is absent', () => {
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/check-overlap.mjs',import.meta.url))],{
    env:{...process.env,PAPER_QUESTIONS_PATH:''},encoding:'utf8'
  });
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/Release blocked: set PAPER_QUESTIONS_PATH/);
});
