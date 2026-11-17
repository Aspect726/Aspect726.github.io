import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {learningCharacter,mathCharacterDiagram} from '../public/learning-character.mjs';
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const root=Object.fromEntries([...css.match(/:root\{([^}]+)\}/)[1].matchAll(/(--[\w-]+):([^;]+)/g)].map(m=>[m[1],m[2]]));
const value=key=>root[key]?.startsWith('var(')?value(root[key].slice(4,-1)):root[key];
const luminance=color=>{const [r,g,b]=color.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return r*.2126+g*.7152+b*.0722;};
const contrast=(a,b)=>{const [light,dark]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (light+.05)/(dark+.05);};

test('workbook text and control tokens meet measured contrast on their assigned surfaces',()=>{
 for(const token of ['--ink','--muted','--royal','--coral-text','--gold-text','--lavender-text'])assert.ok(contrast(value(token),value('--card'))>=4.5,token);
 assert.ok(contrast(value('--ink'),value('--paper'))>=11);
 assert.ok(contrast(value('--control-edge'),value('--card'))>=3);
 assert.ok(contrast(value('--royal'),value('--accent-soft'))>=4.5);
 for(const fill of ['--coral','--gold','--lavender'])assert.ok(contrast(value('--ink'),value(fill))>=4.5,fill);
 assert.ok(contrast(value('--good'),value('--good-soft'))>=4.5);
 assert.ok(contrast(value('--coral-text'),value('--warm-soft'))>=4.5);
 assert.match(css,/outline:3px solid var\(--royal\)/);
 assert.doesNotMatch(css,/(?:linear|radial)-gradient\(/);
});

test('body, headings and math use local licensed fonts with valid WOFF2 files',()=>{
 for(const family of ['plus-jakarta-sans','source-sans-3','source-serif-4']){
  const font=readFileSync(new URL(`../public/assets/fonts/${family}-latin.woff2`,import.meta.url));
  assert.equal(font.subarray(0,4).toString(),'wOF2');assert.ok(font.length>10000);
  assert.ok(readFileSync(new URL(`../public/assets/fonts/${family}-LICENSE.txt`,import.meta.url),'utf8').includes('SIL OPEN FONT LICENSE'));
  assert.ok(css.includes(`/assets/fonts/${family}-latin.woff2`));
 }
 assert.equal(value('--heading'),"'Plus Jakarta Sans',Arial,sans-serif");
 assert.equal(value('--sans'),"'Source Sans 3',Arial,sans-serif");
 assert.match(css,/question-prompt math,math\{font-family:var\(--serif\)\}/);
 assert.doesNotMatch(css,/@import|https?:\/\/[^;]+fonts/i);
});

test('four original characters support six safe, static poses and two clear sizes',()=>{
 const shapes={pip:'circle',tess:'path',quad:'rect',dot:'circle'};
 for(const [name,shape]of Object.entries(shapes))for(const pose of ['welcome','think','point','explain','cheer','encourage']){
  const dom=new JSDOM(learningCharacter({variant:name,pose}));const friend=dom.window.document.querySelector('.geometry-friend');
  assert.equal(friend.getAttribute('aria-hidden'),'true');assert.equal(friend.dataset.character,name);assert.equal(friend.dataset.pose,pose);
  assert.equal(friend.querySelector('svg').getAttribute('width'),'180');assert.ok(friend.querySelector(shape));assert.equal(friend.classList.contains('celebrating'),false);
  assert.equal(friend.querySelectorAll('a,input,button,animate,animateTransform').length,0);dom.window.close();
 }
 const icon=new JSDOM(learningCharacter({variant:'dot',size:'icon',celebrate:true}));assert.equal(icon.window.document.querySelector('svg').getAttribute('width'),'40');assert.ok(icon.window.document.querySelector('.circle-friend.celebrating'));icon.window.close();
 const unsafe=learningCharacter({variant:'<img onerror=alert(1)>',pose:'<script>'});assert.doesNotMatch(unsafe,/<img|<script>/);
});

test('teaching character diagrams describe exact number-line, angle and fraction models',()=>{
 const pip=new JSDOM(mathCharacterDiagram({variant:'pip'}));const psvg=pip.window.document.querySelector('svg');assert.equal(psvg.getAttribute('role'),'img');assert.match(psvg.getAttribute('aria-label'),/from 0 to 4.*above 2/);
 assert.deepEqual([...psvg.querySelectorAll('text')].map(t=>[t.textContent,Number(t.getAttribute('x'))]),[['0',20],['1',70],['2',120],['3',170],['4',220]]);pip.window.close();
 const tess=mathCharacterDiagram({variant:'tess'});assert.match(tess,/M36 32V142H146Z/);assert.match(tess,/M36 128H50V142/);assert.match(tess,/90°/);
 const quad=new JSDOM(mathCharacterDiagram({variant:'quad'}));const tiles=[...quad.window.document.querySelectorAll('rect[height="40"]')];assert.equal(tiles.length,4);assert.equal(tiles.filter(t=>t.getAttribute('fill')==='#B6A2DF').length,3);assert.ok(tiles.every(t=>t.getAttribute('width')==='48'));quad.window.close();
 assert.match(mathCharacterDiagram({variant:'dot'}),/Three labelled milestones in order, 1, 2 and 3/);
});
