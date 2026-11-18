import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { renderStudent } from '../public/student.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/\nboot\(\);\s*$/,'')+'\nglobalThis.testApp={state,shell,route,syncDrawer};';
function shellFixture(path='/s/today'){
 const dom=new JSDOM('<div id="app"></div><div id="notice"></div>',{url:'https://example.test'+path});
 const calls=[];const api=async endpoint=>endpoint==='/v2/teacher/students'?{students:[{id:'learner',name:'Ari'}]}:{};api.invalidate=()=>{};
 const context=vm.createContext({window:dom.window,document:dom.window.document,location:dom.window.location,history:dom.window.history,innerWidth:390,NodeFilter:dom.window.NodeFilter,URL,setTimeout,clearTimeout,createApiClient:()=>api,renderStudent:async()=>{},renderTeacher:async path=>calls.push(path)});
 vm.runInContext(source,context);return {dom,context,calls,app:context.testApp};
}
test('one four-link student menu stays usable at phone width and groups learning routes',()=>{
 const f=shellFixture('/s/library');try{
  f.app.state.user={role:'student',name:'Ari'};f.app.shell('<h1>Library</h1>',{title:'Learn'});
  const nav=f.dom.window.document.querySelector('[aria-label="Student navigation"]');
  assert.deepEqual([...nav.querySelectorAll('a')].map(a=>a.textContent.trim()),['Today','Learn','My progress','Rewards']);
  assert.equal(nav.querySelector('[aria-current=page]').getAttribute('href'),'/s/map');
  assert.equal(f.dom.window.document.querySelector('#menu-toggle'),null);
  assert.equal(f.dom.window.document.querySelector('#school-navigation').hidden,false);
  assert.equal(f.dom.window.document.querySelector('.sidebar').inert,false);
  assert.equal(f.dom.window.document.querySelector('.workspace').inert,false);
  assert.equal(f.dom.window.document.querySelector('.student-account-link').getAttribute('href'),'/s/settings');
 }finally{f.dom.window.close();}
});
test('teacher deep-link hash reaches the gradebook renderer',async()=>{
 const f=shellFixture('/t/scores?assessment=ratio#test-papers');try{
  f.app.state.user={role:'teacher',name:'Teacher'};await f.app.route();
  assert.equal(f.calls[0],'/t/scores?assessment=ratio#test-papers');
 }finally{f.dom.window.close();}
});
function pageFixture(api){const dom=new JSDOM('<main id="app"></main>',{url:'https://example.test/s/progress'});globalThis.document=dom.window.document;const ctx={api,escape,mathMarkup:escape,state:{user:{role:'student',name:'Ari'}},navigate:()=>{},tell:()=>{},shell:html=>{document.querySelector('#app').innerHTML=html;}};return {dom,ctx};}
test('progress leads with recorded learning and a teacher-shared next step without invented gains',async()=>{
 const progress={skills:[{skill:'D-SUB',name:'Subtract decimals',mastery:'mastered',attempts:12},{skill:'F-DIV',name:'Divide fractions',mastery:'learning',attempts:4}],weeks:[],days:[],totalQuestions:16,overallAccuracy:75};
 const f=pageFixture(async path=>path.endsWith('/gradebook')?{visible:true,scores:[],weeks:[]}:path.endsWith('/test-reviews')?{visible:true,reviews:[{title:'Fractions',focus:[{skillId:'F-DIV',reason:'Use equal groups.',nextStep:'Draw the groups.'}],questions:[]}]}:progress);
 try{await renderStudent('/s/progress',f.ctx);const steps=document.querySelector('.learning-next-steps');assert.match(steps.textContent,/1 skill mastered/);assert.match(steps.textContent,/Practicing nowDivide fractions/);assert.equal(steps.querySelector('a').getAttribute('href'),'/s/learn/F-DIV');assert.doesNotMatch(steps.textContent,/improved by|placement|readiness|ranking/i);}finally{f.dom.window.close();}
});
test('IM details stay collapsed while lessons and library remain easy to reach',async()=>{
 const f=pageFixture(async()=>({weeks:[{week:1,title:'Fractions',startDate:'2026-11-17',endDate:'2026-11-23',status:'current',skills:[{skill:'F-DIV',name:'Divide fractions',level:'learning',im:{primaryUnit:{label:'IM 6.4',title:'Dividing Fractions'},standards:['6.NS.A.1']}}]}]}));
 try{await renderStudent('/s/map',f.ctx);const details=document.querySelector('.im-skill-details');assert.ok(details);assert.equal(details.open,false);assert.equal(details.querySelector('summary').textContent,'Details');assert.match(details.textContent,/IM 6.4/);assert.equal(document.querySelectorAll('.map-start-card .geometry-friend').length,1);assert.ok(document.querySelector('.map-start-card a[href="/s/library"]'));assert.match(document.querySelector('.course-meta').textContent,/Nov 17 – Nov 23/);}finally{f.dom.window.close();}
});
