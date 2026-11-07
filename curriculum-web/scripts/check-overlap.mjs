import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { buildExclusions, overlaps } from '../server/overlap.mjs';
import { SKILLS, buildSlots } from '../server/plan.mjs';
import { generateQuestion, questionIdentity } from '../server/questions.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source=process.env.PAPER_QUESTIONS_PATH;
if(!source || !fs.existsSync(source)) throw new Error('Release blocked: set PAPER_QUESTIONS_PATH to the supplied private paper_questions.json. No fixture fallback is permitted.');
const data=JSON.parse(fs.readFileSync(source,'utf8'));
const exclusions=buildExclusions(data);
const poolPath=process.env.QUESTION_POOL_PATH || path.join(root,'private','vetted-seeds.json');
const building=process.argv.includes('--write-pool');
const reserveTwins=process.argv.includes('--with-twins');
const seedTarget=Number(process.env.VETTED_SEED_TARGET || 1024);
const candidateLimit=Number(process.env.VETTED_CANDIDATE_LIMIT || 16000);
const allSkills=[...Object.keys(SKILLS),'WARMUP'];
const generatorPaths=['server/questions.mjs','server/math.mjs','server/generators/common.mjs','server/generators/arithmetic.mjs','server/generators/geometry.mjs','server/generators/statistics.mjs','server/plan.mjs','server/plan.json','server/overlap.mjs','scripts/check-overlap.mjs'];
const generatorFiles=Object.fromEntries(generatorPaths.map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const generatorDigest=createHash('sha256').update(Object.entries(generatorFiles).map(([file,digest])=>`${file}:${digest}\n`).join('')).digest('hex');
let pool;
if(building) {
  pool={version:1,sourceCount:data.questions?.length??data.length,generatedAt:new Date().toISOString(),skills:{},evidence:{generatorDigest,generatorFiles,classification:exclusions.stats,uniqueSignatures:{},rejectedCandidates:0}};
  for(const skill of allSkills) {
    pool.skills[skill]={}; pool.evidence.uniqueSignatures[skill]={};
    for(const difficulty of [1,2,3]) {
      const approved=[],signatures=new Set();
      for(let n=0;n<candidateLimit && approved.length<seedTarget;n++) {
        const seed=`practice-v2:${skill}:${n}`;
        const q=generateQuestion(skill,seed,{difficulty});
        if(overlaps(q,exclusions)) {pool.evidence.rejectedCandidates++;continue;}
        approved.push(seed);signatures.add(q.signature);
      }
      if(!approved.length)throw new Error(`No eligible seeds for ${skill} difficulty ${difficulty}. Expand or repair the generator; never skip this skill.`);
      pool.skills[skill][difficulty]=approved;
      pool.evidence.uniqueSignatures[skill][difficulty]=signatures.size;
    }
    console.log(`${skill}: vetted seeds ${[1,2,3].map(d=>pool.skills[skill][d].length).join('/')}; distinct signatures ${[1,2,3].map(d=>pool.evidence.uniqueSignatures[skill][d]).join('/')}`);
  }
} else {
  if(!fs.existsSync(poolPath))throw new Error('Release blocked: no vetted seed pool. Run check-overlap.mjs --write-pool first.');
  pool=JSON.parse(fs.readFileSync(poolPath,'utf8'));
  if(pool.evidence?.generatorDigest!==generatorDigest)throw new Error('Release blocked: generator or validation code changed. Rebuild the vetted seed pool.');
}

// Re-check every approved seed against the supplied corpus on each invocation.
let verifiedSeeds=0;
const shapeCoverage={};
for(const skill of allSkills)for(const difficulty of [1,2,3]) {
  const seeds=pool.skills[skill]?.[difficulty];
  if(!Array.isArray(seeds)||!seeds.length)throw new Error(`Missing pool for ${skill}/${difficulty}.`);
  shapeCoverage[skill]??={};shapeCoverage[skill][difficulty]={};
  for(const seed of seeds) {
    const q=generateQuestion(skill,seed,{difficulty});
    const overlap=overlaps(q,exclusions);
    if(overlap)throw new Error(`Paper overlap: ${skill}/${difficulty}, seed ${seed}, ${overlap.kind}, source record ${overlap.sourceIndex??'text match'}.`);
    shapeCoverage[skill][difficulty][q.shape]=(shapeCoverage[skill][difficulty][q.shape]??0)+1;
    verifiedSeeds++;
  }
  const requiredShapes=['calculation','story','missing','mistake','reason',...(/^[GS]-/.test(skill)||['P-SCALE','P-MAP'].includes(skill)?['picture']:[])];
  for(const shape of requiredShapes)if(!shapeCoverage[skill][difficulty][shape])throw new Error(`Vetted pool lost the ${shape} shape for ${skill}/${difficulty}.`);
}

// Materialize required sets and all four default bonus rounds for all 70 days.
// This checks practical 14-day capacity, not just an isolated question sample.
let bankCount=0;
const history=[];
for(let day=0;day<70;day++) {
  const recent=history.filter(item=>item.day>=day-14);
  const used=new Set(recent.map(item=>item.signature));
  const usedPrompts=new Set(recent.map(item=>item.prompt));
  const sets=[buildSlots(day),...Array.from({length:4},(_,round)=>buildSlots(day,'bonus',round))].map(slots=>reserveTwins?slots.flatMap(slot=>[slot,{...slot,twin:true}]):slots);
  for(let run=0;run<sets.length;run++)for(const [position,slot] of sets[run].entries()) {
    const seeds=pool.skills[slot.skill]?.[slot.difficulty];
    let q;
    const offset=(day*131+run*47+position*17)%seeds.length;
    for(let scan=0;scan<seeds.length;scan++) {
      const candidate=generateQuestion(slot.skill,seeds[(offset+scan)%seeds.length],{difficulty:slot.difficulty});
      if(!used.has(candidate.signature)&&!usedPrompts.has(questionIdentity(candidate))){q=candidate;break;}
    }
    if(!q)throw new Error(`Insufficient distinct questions for ${slot.skill} in a 14-day window at day ${day+1}, run ${run}. Expand its generator.`);
    const overlap=overlaps(q,exclusions);if(overlap)throw new Error(`Unexpected overlap in full bank at day ${day+1}.`);
    const identity=questionIdentity(q);
    used.add(q.signature);usedPrompts.add(identity);history.push({day,signature:q.signature,prompt:identity});bankCount++;
  }
}
pool.evidence={...pool.evidence,shapeCoverage,verifiedSeeds,bankCount,requiredQuestions:1400,bonusQuestions:3150,twinReserveQuestions:reserveTwins?4550:0,days:70,repeatWindowDays:14,checkedAt:new Date().toISOString()};
if(building) {
  fs.mkdirSync(path.dirname(poolPath),{recursive:true,mode:0o700});
  const temporary=poolPath+'.tmp';fs.writeFileSync(temporary,JSON.stringify(pool),{mode:0o600});fs.renameSync(temporary,poolPath);
}
console.log(JSON.stringify({result:'passed',sourceRecords:pool.sourceCount,verifiedSeeds,fullBankQuestions:bankCount,days:70,classification:exclusions.stats,poolWritten:building}));
