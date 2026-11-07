// Private validation only: never load the paper corpus from a request handler.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { generateQuestion, allSkills } from '../server/questions.mjs';
import { geometrySkills } from '../server/generators/geometry.mjs';
import { statisticsSkills } from '../server/generators/statistics.mjs';

const numberWords='zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand'.split(' ');
export function paperFrame(value) {
 return String(value??'').replace(/<math\b[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<\/math>/gi,'$1').normalize('NFKC').toLowerCase().replace(/<[^>]*>/g,' ')
  .replace(/[−–—]/g,'-').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/[{}]/g,'')
  .replace(new RegExp(`\\b(?:${numberWords.join('|')})(?:[ -](?:${numberWords.join('|')}))*\\b`,'g'),'#')
  .replace(/[+-]?\d+(?:,\d{3})*(?:\.\d+)?/g,'#').replace(/\s+/g,' ').trim();
}
export function loadPaperFrames(data) {
 const rows=Array.isArray(data)?data:data?.questions;
 if(!rows?.length)throw new Error('A nonempty private paper corpus is required.');
 if(!Array.isArray(data)&&data.count!==undefined&&data.count!==rows.length)throw new Error('Paper count does not match its records.');
 const frames=new Set();let segments=0;
 for(const row of rows)for(const text of [row.question??row.prompt,...(row.steps??[]),...(row.work??[])]) {
  if(typeof text!=='string'||!text.trim())continue;
  frames.add(paperFrame(text));segments++;
 }
 return {frames,records:rows.length,segments};
}
export function checkFrames(data,{perTemplate=500}={}) {
 const paper=loadPaperFrames(data),report={paperRecords:paper.records,paperFramesLoaded:paper.segments,uniquePaperFrames:paper.frames.size,perTemplate,skills:[],matchingTemplates:0,questionsChecked:0};
 const collisions=new Set();
 for(const skill of allSkills) {
  const shapes=['calculation','story','missing','mistake','reason',...(geometrySkills.includes(skill)||statisticsSkills.includes(skill)?['picture']:[])];
  const record={skill,templates:shapes.length,levels:3,questionsChecked:0,matchingTemplates:[]};
  for(const shape of shapes)for(let level=1;level<=3;level++)for(let index=0;index<perTemplate;index++) {
   const q=generateQuestion(skill,`frame:${index}`,{shape,difficulty:level});
   record.questionsChecked++;
   if(paper.frames.has(paperFrame(q.prompt??q.plainPrompt)))collisions.add(`${skill}:${shape}`);
  }
  record.matchingTemplates=[...collisions].filter(value=>value.startsWith(skill+':'));
  report.questionsChecked+=record.questionsChecked;report.skills.push(record);
 }
 report.matchingTemplates=collisions.size;
 return report;
}
export function checkPoolFrames(data,pool) {
 const paper=loadPaperFrames(data),collisions=new Set();let checked=0;
 if(!pool?.skills)throw new Error('A checked seed pool is required.');
 for(const [skill,levels] of Object.entries(pool.skills))for(const [level,seeds] of Object.entries(levels))for(const seed of seeds) {
  const q=generateQuestion(skill,seed,{difficulty:Number(level)});checked++;
  if(paper.frames.has(paperFrame(q.prompt??q.plainPrompt)))collisions.add(`${skill}:${q.shape}`);
 }
 return {poolQuestionsChecked:checked,poolMatchingTemplates:[...collisions]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 const path=process.env.PAPER_QUESTIONS_PATH;if(!path)throw new Error('Set PAPER_QUESTIONS_PATH to the private paper and slide JSON.');
 const perTemplate=Number(process.env.FRAME_SAMPLES||500);if(!Number.isInteger(perTemplate)||perTemplate<1)throw new Error('FRAME_SAMPLES must be a positive integer.');
 const corpus=JSON.parse(await readFile(path,'utf8'));
 const report=checkFrames(corpus,{perTemplate});
 if(process.env.VETTED_SEEDS_PATH) {
  const rawPool=await readFile(process.env.VETTED_SEEDS_PATH,'utf8'),pool=JSON.parse(rawPool);
  Object.assign(report,checkPoolFrames(corpus,pool));
  report.generatorFiles={};
  for(const relative of [...Object.keys(pool.evidence.generatorFiles),'scripts/check-paper-frames.mjs']) {
   if(!/^(server|scripts)\/[\w/.-]+$/.test(relative)||relative.includes('..'))throw new Error('Invalid provenance path.');
   report.generatorFiles[relative]=createHash('sha256').update(await readFile(new URL('../'+relative,import.meta.url))).digest('hex');
  }
  report.poolDigest=createHash('sha256').update(rawPool).digest('hex');
 }
 console.log(JSON.stringify(report,null,2));
 if(process.env.FRAME_REPORT_PATH)await writeFile(process.env.FRAME_REPORT_PATH,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 if(report.matchingTemplates||report.poolMatchingTemplates?.length)process.exitCode=1;
}
