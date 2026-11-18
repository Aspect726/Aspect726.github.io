import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import plan from '../server/plan.json' with { type:'json' };
import { SUPPLEMENTAL_SKILLS, GRADE5_REVIEW_SKILLS, CURRICULUM_SKILLS, CURRICULUM_BRIDGES, curriculumForSkill, curriculumOverview } from '../server/curriculum.mjs';
import { LESSONS } from '../server/lessons.mjs';

test('curriculum covers every original and supplemental skill without assuming mastery',()=>{
  const expected=Object.keys({...plan.skills,...SUPPLEMENTAL_SKILLS});
  assert.deepEqual(Object.keys(CURRICULUM_SKILLS),expected);
  assert.deepEqual(Object.keys(LESSONS),expected);
  assert.equal(Object.keys(SUPPLEMENTAL_SKILLS).length,16);
  for(const skill of Object.values(CURRICULUM_SKILLS)) {
    assert.equal(skill.masteryAssumed,false,skill.id);
    assert.ok(['grade5','imt1','bridge'].includes(skill.stage),skill.id);
    assert.ok(skill.standards.length>0,skill.id);
    assert.ok(skill.introductionDay>=0&&skill.introductionDay<70,skill.id);
    for(const prerequisite of skill.prerequisites)assert.ok(CURRICULUM_SKILLS[prerequisite],`${skill.id}: ${prerequisite}`);
    for(const url of skill.standardUrls)assert.match(url,/^https:\/\/www\.thecorestandards\.org\/Math\/Content\/[4-7]\/[A-Z]+\/$/);
  }
  assert.equal(curriculumForSkill('not-a-skill'),null);
  assert.match(curriculumOverview().scope,/not a district placement decision/);
});

test('grade 5 review does not silently introduce grade 6 and 7 strength labels',()=>{
  for(const skill of ['F-DIV','R-RATIO','R-RATE','P-PERCENT','P-CHANGE','G-VOL','N-SDIV','S-PROB','S-SAMPLE']) {
    assert.ok(!GRADE5_REVIEW_SKILLS.includes(skill),skill);
    assert.equal(CURRICULUM_SKILLS[skill].reviewFromStart,false,skill);
  }
  for(const skill of ['F-UNITDIV','G-WVOL','N-PLACE','M-CONVERT','G-CLASS','S-LINEPLOT'])assert.ok(GRADE5_REVIEW_SKILLS.includes(skill),skill);
  assert.equal(CURRICULUM_SKILLS['G-WVOL'].stage,'grade5');
  assert.equal(CURRICULUM_SKILLS['G-VOL'].stage,'imt1');
  assert.ok(CURRICULUM_SKILLS['G-VOL'].standards.includes('6.G.A.2'));
});

test('bridge practice follows its prerequisites and never crowds out the dated focus',()=>{
  const counts=new Map();
  for(const bridge of CURRICULUM_BRIDGES) {
    assert.equal(bridge.practiceDays[0],bridge.dayIndex,bridge.skill);
    for(const prerequisite of bridge.prerequisites)assert.ok(CURRICULUM_SKILLS[prerequisite].introductionDay<=bridge.dayIndex,`${bridge.skill} precedes ${prerequisite}`);
    for(const day of bridge.practiceDays){assert.ok(day>=bridge.dayIndex&&day<70);counts.set(day,(counts.get(day)||0)+1);}
  }
  assert.ok([...counts.values()].every(count=>count<=2));
  const day=skill=>CURRICULUM_BRIDGES.find(x=>x.skill===skill).dayIndex;
  assert.ok(day('R-RATIO')<day('R-RATE'));
  assert.ok(day('R-RATE')<day('P-PERCENT'));
  assert.ok(day('P-PERCENT')<day('P-CHANGE'));
  assert.ok(day('P-CHANGE')>CURRICULUM_SKILLS['P-PROP'].introductionDay);
});

test('every supplemental lesson explains an idea and has a valid accessible concept diagram',()=>{
  for(const id of Object.keys(SUPPLEMENTAL_SKILLS)) {
    const lesson=LESSONS[id];
    assert.ok(lesson.rule.length>25,id);assert.ok(lesson.idea.length>80,id);
    assert.ok(lesson.relationship.length>10,id);
    const dom=new JSDOM(lesson.model,{contentType:'image/svg+xml'});
    const svg=dom.window.document.documentElement;
    assert.equal(svg.tagName,'svg',id);assert.equal(svg.getAttribute('role'),'img',id);
    assert.ok(svg.getAttribute('aria-label').length>30,id);
    assert.ok(svg.querySelector('title')?.textContent,id);
    assert.ok(svg.querySelector('desc')?.textContent,id);
    assert.ok(svg.querySelector('path,circle,rect'),id);
    assert.equal(svg.querySelector('script,foreignObject'),null,id);
    assert.equal(lesson.curriculum.id,id);
    dom.window.close();
  }
});
