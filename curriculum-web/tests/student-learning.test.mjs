import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pointProgress, learningCharacter } from '../public/learning-character.mjs';

test('points meter follows the daily35,45,55 thresholds without awarding points itself',()=>{
  for(const [answered,next,remaining] of [[0,35,35],[20,35,15],[34,35,1],[35,45,10],[44,45,1],[45,55,10]]){
    const result=pointProgress({answered,dailyTarget:20,bonusFirst:15,bonusStep:10,points:7});
    assert.equal(result.next,next);assert.equal(result.remaining,remaining);
    assert.equal(result.points,7,'balance always comes from saved server state');
    assert.ok(result.completed<=result.span);
  }
});

test('points meter respects changed practice rules and authoritative next threshold',()=>{
  const changed=pointProgress({answered:16,dailyTarget:10,bonusFirst:5,bonusStep:3,points:2});
  assert.equal(changed.first,15);assert.equal(changed.next,18);assert.equal(changed.remaining,2);
  const authoritative=pointProgress({answered:30,nextPointAt:40,dailyTarget:20,bonusFirst:20,bonusStep:5});
  assert.equal(authoritative.next,40);assert.equal(authoritative.remaining,10);
});

test('geometry characters are decorative, static by default and respect reduced motion',()=>{
  const triangle=learningCharacter(),circle=learningCharacter({variant:'circle',celebrate:true});
  assert.match(triangle,/aria-hidden="true"/);assert.doesNotMatch(triangle,/celebrating/);
  assert.match(triangle,/triangle-friend/);assert.match(circle,/circle-friend celebrating/);
  assert.doesNotMatch(triangle+circle,/\$\{body\}|tabindex|autofocus/);
  assert.match(circle,/<circle cx="60" cy="54" r="35"/);
  const css=readFileSync(new URL('../public/student-learning.css',import.meta.url),'utf8');
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.geometry-friend\.celebrating \.friend-body,\.geometry-friend\.celebrating \.friend-sparks\{animation:none\}/);
  assert.doesNotMatch(css,/animation:[^;{}]*infinite/);
});
