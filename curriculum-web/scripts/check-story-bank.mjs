// Private release validation. Only aggregate counts may be copied to the public repo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { generateQuestion, questionIdentity, storyScenarios, STORY_SHAPES, decodeStorySeed } from '../server/questions.mjs';
import { SKILLS } from '../server/plan.mjs';
import { courseSlots } from '../server/course-schedule.mjs';
import { parseNumber } from '../server/math.mjs';
import { buildExclusions, overlaps } from '../server/overlap.mjs';
import { loadPaperFrames, paperFrame } from './check-paper-frames.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const requiredSkills=[...Object.keys(SKILLS),'WARMUP'];
export const STORY_POOL_MINIMUM=1200;
export const STORY_SCENARIO_MINIMUM=14;
const digest=value=>createHash('sha256').update(value).digest('hex');
export function storyPoolDigest(stories,encoding){return digest(JSON.stringify({encoding,stories}));}
const storyQuestion=(skill,level,entry,pool)=>{const decoded=decodeStorySeed(skill,level,entry,pool);return generateQuestion(skill,decoded.seed,{mode:'story',difficulty:Number(level),scenarioId:decoded.scenarioId,storyShape:decoded.storyShape});};
const parameterIdentity=q=>[q.scenarioId,q.storyShape,...[...(q.numbers??[])].sort(),q.answer].join('|');
function validateStory(q,{skill,scenarioId,storyShape}) {
 if(q.story!==true||q.skill!==skill||q.scenarioId!==scenarioId||q.storyShape!==storyShape)throw new Error(`Story metadata mismatch: ${skill}/${scenarioId}/${storyShape}.`);
 if(!STORY_SHAPES.includes(q.storyShape)||!Number.isInteger(q.stepCount)||q.stepCount<2||q.stepCount>4||q.solution?.length!==q.stepCount||q.solution.some(step=>typeof step!=='string'||!step.trim()))throw new Error(`Story needs 2–4 worked steps: ${skill}/${scenarioId}/${storyShape}.`);
 const number=parseNumber(q.answer);
 if(!number||!q.answerUnit||typeof q.answerUnit!=='string'||!q.hint?.trim()||!q.numbers?.length)throw new Error(`Story needs a computed number, units, quantities and help: ${skill}/${scenarioId}/${storyShape}.`);
 // Exact fractions are allowed; huge or unsafe rational values are not clean school arithmetic.
 if(number.d>1000000n||number.n>1000000000n||number.n< -1000000000n)throw new Error(`Story answer outside clean-number limits: ${skill}/${scenarioId}/${storyShape}.`);
 const text=String(q.plainPrompt??q.prompt).toLowerCase().replace(/<[^>]*>/g,' ');
 if(!text.includes(q.answerUnit.toLowerCase())&&!text.includes('unit'))throw new Error(`Story prompt must ask for its units: ${skill}/${scenarioId}/${storyShape}.`);
 if(q.storyShape==='compare'&&(!['A','B'].includes(q.answerChoice)||!q.choiceLabels?.A||!q.choiceLabels?.B))throw new Error(`Comparison needs an option and an amount: ${skill}/${scenarioId}.`);
}
function paperCollision(q,exclusions,paper) {
 const collision=overlaps(q,exclusions);
 if(collision)return collision.kind;
 return paper.frames.has(paperFrame(q.plainPrompt??q.prompt))?'frame':null;
}
export function buildStoryPools(data,{perFrame=20,candidateLimit=3000,onProgress=()=>{}}={}) {
 if(!Number.isInteger(perFrame)||perFrame<20||!Number.isInteger(candidateLimit)||candidateLimit<perFrame)throw new Error('Story validation requires at least 20 accepted seeds per scene/shape and a sufficient candidate limit.');
 const exclusions=buildExclusions(data),paper=loadPaperFrames(data),stories={},rejected={text:0,numbers:0,frame:0,duplicate:0};
 const storyEncoding={version:1,scenarios:[...new Set(requiredSkills.flatMap(skill=>storyScenarios(skill)))],shapes:[...STORY_SHAPES]};
 for(const skill of requiredSkills){
  const scenes=storyScenarios(skill);
  if(!Array.isArray(scenes)||new Set(scenes).size!==scenes.length||scenes.length<STORY_SCENARIO_MINIMUM)throw new Error(`At least ${STORY_SCENARIO_MINIMUM} distinct story scenes are required for ${skill}.`);
  const target=Math.max(perFrame,Math.ceil(STORY_POOL_MINIMUM/(scenes.length*STORY_SHAPES.length)));
  stories[skill]={};
  for(const level of [1,2,3]){
   const approved=[],identities=new Set(),parameters=new Set();
   for(const scenarioId of scenes)for(const storyShape of STORY_SHAPES){
    let count=0;
    for(let candidate=0;candidate<candidateLimit&&count<target;candidate++){
     const entry=`${storyEncoding.scenarios.indexOf(scenarioId)}:${STORY_SHAPES.indexOf(storyShape)}:${candidate}`;
     const q=storyQuestion(skill,level,entry,{storyEncoding});validateStory(q,{skill,scenarioId,storyShape});
     const collision=paperCollision(q,exclusions,paper);
     if(collision){rejected[collision]++;continue;}
     const identity=questionIdentity(q),parameter=parameterIdentity(q);
     if(identities.has(identity)||parameters.has(parameter)){rejected.duplicate++;continue;}
     identities.add(identity);parameters.add(parameter);approved.push(entry);count++;
    }
    if(count<target)throw new Error(`Insufficient checked stories: ${skill}/${level}/${scenarioId}/${storyShape} has ${count}/${target}. Expand its parameter domain; never loosen exclusions.`);
   }
   stories[skill][level]=approved;
  }
  onProgress(`${skill}: story seeds ${[1,2,3].map(level=>stories[skill][level].length).join('/')}; ${scenes.length} distinct scenes, ${STORY_SHAPES.length} question shapes.`);
 }
 return {stories,rejected,storyEncoding};
}
export function checkStoryPool(data,pool,{onProgress=()=>{}}={}) {
 if(!pool?.stories)throw new Error('Release blocked: no checked multi-step story pool. Run check-overlap.mjs --write-pool.');
 const exclusions=buildExclusions(data),paper=loadPaperFrames(data),bySkill={},shapeCoverage={},scenarioCoverage={};
 let checked=0;
 for(const skill of requiredSkills){
  const scenes=storyScenarios(skill);
  if(new Set(scenes).size!==scenes.length||scenes.length<STORY_SCENARIO_MINIMUM)throw new Error(`Insufficient distinct scenarios for ${skill}.`);
  bySkill[skill]={};shapeCoverage[skill]={};scenarioCoverage[skill]={};
  for(const level of [1,2,3]){
   const entries=pool.stories[skill]?.[level];
   if(!Array.isArray(entries)||entries.length<STORY_POOL_MINIMUM)throw new Error(`Story pool ${skill}/${level} needs at least ${STORY_POOL_MINIMUM} checked entries.`);
   const identities=new Set(),parameters=new Set(),coverage={},decodedEntries=[];
   for(const entry of entries){
    const decoded=decodeStorySeed(skill,level,entry,pool);decodedEntries.push(decoded);
    if(typeof decoded?.seed!=='string'||!scenes.includes(decoded.scenarioId)||!STORY_SHAPES.includes(decoded.storyShape))throw new Error(`Unknown story entry in ${skill}/${level}.`);
    const q=storyQuestion(skill,level,entry,pool);validateStory(q,{skill,...decoded});
    const collision=paperCollision(q,exclusions,paper);
    if(collision)throw new Error(`Private paper ${collision} overlap: ${skill}/${level}/${decoded.scenarioId}/${decoded.storyShape}, seed ${decoded.seed}.`);
    const identity=questionIdentity(q),parameter=parameterIdentity(q);
    if(identities.has(identity)||parameters.has(parameter))throw new Error(`Repeated question/parameter set in ${skill}/${level}.`);
    identities.add(identity);parameters.add(parameter);
    coverage[decoded.scenarioId]??={};coverage[decoded.scenarioId][decoded.storyShape]=(coverage[decoded.scenarioId][decoded.storyShape]??0)+1;
    checked++;
   }
   for(const scene of scenes)for(const shape of STORY_SHAPES)if((coverage[scene]?.[shape]??0)<20)throw new Error(`Missing story capacity ${skill}/${level}/${scene}/${shape}; need 20 unique examples.`);
   bySkill[skill][level]=entries.length;
   shapeCoverage[skill][level]=Object.fromEntries(STORY_SHAPES.map(shape=>[shape,decodedEntries.filter(e=>e.storyShape===shape).length]));
   scenarioCoverage[skill][level]=Object.fromEntries(scenes.map(scene=>[scene,decodedEntries.filter(e=>e.scenarioId===scene).length]));
  }
  onProgress(`${skill}: rechecked all story seeds, shapes, scenes and paper exclusions.`);
 }
 const daily=materializeStoryCourse(pool,exclusions,paper);
 return {version:1,result:'passed',sourceRecords:paper.records,paperSegments:paper.segments,uniquePaperFrames:paper.frames.size,skills:requiredSkills.length,levels:3,checkedStoryQuestions:checked,matchingQuestions:0,matchingFrames:0,minimumPerSkillLevel:Math.min(...Object.values(bySkill).flatMap(levels=>Object.values(levels))),minimumScenarios:Math.min(...requiredSkills.map(skill=>storyScenarios(skill).length)),minimumShapes:STORY_SHAPES.length,bySkill,shapeCoverage,scenarioCoverage,...daily,poolDigest:storyPoolDigest(pool.stories,pool.storyEncoding),checkedAt:new Date().toISOString()};
}
function materializeStoryCourse(pool,exclusions,paper){
 const used=new Set();let bankCount=0,storyCount=0,warmupCount=0;
 for(let day=0;day<70;day++){
  const scenes=new Set(),slots=courseSlots(day);if(slots.length!==20)throw new Error('A daily validation set must contain 20 questions.');
  for(const [position,slot] of slots.entries()){
   const story=position>=6,entries=(story?pool.stories:pool.skills)?.[slot.skill]?.[slot.difficulty];
   if(!entries?.length)throw new Error(`Missing ${story?'story':'warm-up'} pool at day ${day+1}.`);
   const offset=(day*131+position*43)%entries.length;let found;
   for(let scan=0;scan<entries.length;scan++){
    const entry=entries[(offset+scan)%entries.length];
    if(story&&scenes.has(decodeStorySeed(slot.skill,slot.difficulty,entry,pool).scenarioId))continue;
    const q=story?storyQuestion(slot.skill,slot.difficulty,entry,pool):generateQuestion(slot.skill,entry,{difficulty:slot.difficulty}),identity=questionIdentity(q);
    if(used.has(identity)||!story&&!['calculation','missing'].includes(q.shape))continue;
    if(paperCollision(q,exclusions,paper))throw new Error(`Unexpected private paper overlap at day ${day+1}.`);
    found={q,identity};break;
   }
   if(!found)throw new Error(`Insufficient unique ${story?'story scenarios':'warm-ups'} for ${slot.skill}, day ${day+1}, position ${position+1}.`);
   used.add(found.identity);if(story){scenes.add(found.q.scenarioId);storyCount++;}else warmupCount++;bankCount++;
  }
  if(scenes.size!==14)throw new Error(`Day ${day+1} did not contain 14 different story scenarios.`);
 }
 // Also validate the limiting case: an assignment covering one skill for an entire set.
 for(const skill of requiredSkills)for(const level of [1,2,3]){
  const scenes=new Set(pool.stories[skill][level].map(entry=>decodeStorySeed(skill,level,entry,pool).scenarioId));
  if(scenes.size<14)throw new Error(`Single-skill assignment cannot produce 14 different stories: ${skill}/${level}.`);
 }
 return {days:70,requiredQuestions:bankCount,storyQuestions:storyCount,warmupQuestions:warmupCount,storiesPerDay:14,warmupsPerDay:6,storyFraction:.7,uniqueScenariosPerDay:14,repeatQuestions:0,singleSkillSetsChecked:requiredSkills.length*3};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const corpusPath=process.env.PAPER_QUESTIONS_PATH;
 if(!corpusPath||!fs.existsSync(corpusPath))throw new Error('Set PAPER_QUESTIONS_PATH to the private paper_questions.json.');
 const poolPath=process.env.QUESTION_POOL_PATH||path.join(root,'private/vetted-seeds.json'),pool=JSON.parse(fs.readFileSync(poolPath,'utf8')),data=JSON.parse(fs.readFileSync(corpusPath,'utf8'));
 const report=checkStoryPool(data,pool,{onProgress:line=>console.log(line)});
 const aggregate=process.env.STORY_REPORT_PATH||path.join(root,'validation/stories.json');
 fs.mkdirSync(path.dirname(aggregate),{recursive:true});fs.writeFileSync(aggregate,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({result:report.result,checkedStoryQuestions:report.checkedStoryQuestions,days:report.days,storiesPerDay:report.storiesPerDay,warmupsPerDay:report.warmupsPerDay,matchingQuestions:report.matchingQuestions,matchingFrames:report.matchingFrames}));
}
