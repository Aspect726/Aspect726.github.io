import { readFile, writeFile, mkdir, readdir, cp, rm } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { decodeStorySeed } from '../server/questions.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const poolPath = process.env.VETTED_SEEDS_PATH || join(root, 'private/vetted-seeds.json');
let pool;
try { pool = JSON.parse(await readFile(poolPath, 'utf8')); }
catch { throw new Error('Generate the private vetted seed pool with npm run test:paper before building.'); }
if (!pool?.evidence?.generatorFiles || pool.evidence.days !== 70 || pool.evidence.requiredQuestions !== 1400 || pool.evidence.bankCount < 4550) throw new Error('A complete 70-day paper validation is required.');
for (const [relative, expected] of Object.entries(pool.evidence.generatorFiles)) {
  if (!/^(server|scripts)\/[\w/.-]+$/.test(relative) || relative.includes('..')) throw new Error('Invalid generator provenance path.');
  const actual = createHash('sha256').update(await readFile(join(root, relative))).digest('hex');
  if (actual !== expected) throw new Error(`The checked pool is stale after a change to ${relative}. Run the paper test again.`);
}
const story=pool.storyEvidence;
const storySkillIds=Object.keys(pool.skills??{});
if(!pool.stories||story?.result!=='passed'||story.days!==70||story.requiredQuestions!==1400||story.storyQuestions<840||story.storiesPerDay<12||story.warmupsPerDay>8||story.uniqueScenariosPerDay<14||story.repeatQuestions!==0||story.minimumPerSkillLevel<1200||story.minimumScenarios<14||story.minimumShapes<5||story.matchingQuestions!==0||story.matchingFrames!==0)throw new Error('A complete passing 70-day story-bank validation is required.');
for(const skill of storySkillIds)for(const level of [1,2,3]){
 const entries=pool.stories[skill]?.[level];
 const decoded=Array.isArray(entries)?entries.map(entry=>decodeStorySeed(skill,level,entry,pool)):[];
 if(!Array.isArray(entries)||entries.length<1200||new Set(decoded.map(entry=>entry.scenarioId)).size<14||new Set(decoded.map(entry=>entry.storyShape)).size<5)throw new Error(`Incomplete checked story pool for ${skill}/${level}.`);
}
if(story.poolDigest!==createHash('sha256').update(JSON.stringify({encoding:pool.storyEncoding,stories:pool.stories})).digest('hex'))throw new Error('The story-bank report does not match the story seed pool.');
for(const required of ['server/generators/story-arithmetic.mjs','server/generators/story-geometry.mjs','server/generators/story-statistics.mjs','scripts/check-story-bank.mjs','scripts/check-paper-frames.mjs'])if(!pool.evidence.generatorFiles[required])throw new Error('Story provenance is missing '+required);
const framePath = process.env.FRAME_REPORT_PATH || join(root,'private/frame-validation.json');
let frames;
try { frames=JSON.parse(await readFile(framePath,'utf8')); } catch { throw new Error('Run the private template frame check before building.'); }
if(frames.paperRecords<2000 || frames.perTemplate<500 || frames.matchingTemplates!==0 || !Array.isArray(frames.poolMatchingTemplates) || frames.poolMatchingTemplates.length || !frames.poolQuestionsChecked || !frames.generatorFiles) throw new Error('Complete passing paper-frame evidence is required.');
for(const [relative,expected] of Object.entries(frames.generatorFiles)) {
 if(!/^(server|scripts)\/[\w/.-]+$/.test(relative)||relative.includes('..'))throw new Error('Invalid frame provenance path.');
 if(createHash('sha256').update(await readFile(join(root,relative))).digest('hex')!==expected)throw new Error('The paper-frame report is stale: '+relative);
}
if(frames.poolDigest!==createHash('sha256').update(await readFile(poolPath)).digest('hex'))throw new Error('The paper-frame report does not match the seed pool.');
if(frames.storyPoolQuestionsChecked!==story.checkedStoryQuestions||!Array.isArray(frames.storyPoolMatchingTemplates)||frames.storyPoolMatchingTemplates.length)throw new Error('Passing paper-frame evidence for every checked story seed is required.');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.txt':'text/plain; charset=utf-8' };
const assets = {};
async function walk(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes:true })) {
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) { await walk(join(directory, entry.name), relative); continue; }
    const type = types[extname(entry.name)];
    if (!type || /(?:course|paper_questions|answer|packet)/i.test(relative)) throw new Error(`Unexpected public asset: ${relative}`);
    const bytes = await readFile(join(directory, entry.name));
    const binary = extname(entry.name) === '.woff2';
    assets[relative] = { type, encoding:binary ? 'base64' : 'utf8', body:bytes.toString(binary ? 'base64' : 'utf8') };
  }
}
await walk(join(root,'public'));
await mkdir(join(root,'generated'),{recursive:true});
await writeFile(join(root,'generated/assets.json'), JSON.stringify(assets));
await writeFile(join(root,'generated/vetted-seeds.json'), JSON.stringify(pool));
await rm(join(root,'dist'),{recursive:true,force:true});
await mkdir(join(root,'dist/server'),{recursive:true});
await mkdir(join(root,'dist/.openai'),{recursive:true});
await build({entryPoints:[join(root,'worker/index.mjs')],outfile:join(root,'dist/server/index.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none'});
await cp(join(root,'.openai/hosting.json'),join(root,'dist/.openai/hosting.json'));
// Apply and validate only new versioned migrations; never rewrite deployed files.
const journalPath = join(root,'drizzle/meta/_journal.json');
const journal = JSON.parse(await readFile(journalPath,'utf8'));
const migrationCheck = new DatabaseSync(':memory:');
try {
 for (const filename of (await readdir(join(root,'migrations'))).filter(f=>f.endsWith('.sql')).sort()) {
  const sql=await readFile(join(root,'migrations',filename),'utf8');
  const statements=sql.match(/\s*CREATE\s+TRIGGER\b[\s\S]*?\bEND\s*;|[^;]+;/gi);
  for(const statement of statements||[]) migrationCheck.exec(statement);
  const tag=filename.slice(0,-4);
  if(!journal.entries.some(e=>e.tag===tag)){
   await writeFile(join(root,'drizzle',filename),statements.map(s=>s.trim()).join('\n--> statement-breakpoint\n')+'\n');
   journal.entries.push({idx:journal.entries.length,version:'6',when:1794040000000+journal.entries.length,tag,breakpoints:true});
  }
 }
} finally {migrationCheck.close();}
await writeFile(journalPath,JSON.stringify(journal,null,2)+'\n');
await cp(join(root,'drizzle'),join(root,'dist/drizzle'),{recursive:true});
const module = await import(new URL('../dist/server/index.js',import.meta.url));
if (typeof module.default?.fetch !== 'function') throw new Error('Build has no Worker fetch handler.');
console.log(`Built private Worker with ${Object.keys(assets).length} public shell assets.`);
