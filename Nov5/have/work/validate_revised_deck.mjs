import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PresentationFile,FileBlob} from '@oai/artifact-tool';
const root=process.cwd(),skill='/Users/sahil/.codex/plugins/cache/openai-primary-runtime/presentations/26.1104.11149/skills/presentations',rt='/Users/sahil/.cache/codex-runtimes/codex-primary-runtime/dependencies',py=path.join(rt,'python/bin/python3');
const candidate=path.join(root,'work/revised_deck_candidate.pptx');
const n=JSON.parse(await fs.readFile('work/revised_deck_meta.json')).length;
function cli(name,args){const r=spawnSync(py,[path.join(skill,'container_tools',name),candidate,...args],{encoding:'utf8',maxBuffer:20*1024*1024});if(r.status!==0)throw Error(name+' failed '+r.stdout+' '+r.stderr);return JSON.parse(r.stdout);}
const integrity=cli('inspect_presentation_package_integrity.py',[]);
const layout=cli('inspect_presentation_layout_geometry.py',['--expected-slide-size-emu','12192000,6858000','--expected-slide-count',String(n),'--approved-font-family','Georgia','--approved-font-family','Calibri','--validate-heading-fit','--validate-bullet-geometry']);
await fs.writeFile('work/revised_full_layout.json',JSON.stringify(layout,null,2));if(layout.finding_count||layout.warning_count)throw Error('Whole deck layout requires review: '+JSON.stringify(layout.warnings));
const whole=await PresentationFile.importPptx(await FileBlob.load(candidate));if(whole.slides.items.length!==n)throw Error('Full import count differs');
console.log('Whole deck imported',n);
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const halves=[]; await fs.mkdir(path.join(root,'work/revised_validation_output'),{recursive:true});
for(let part=0;part<2;part++){const deck=await PresentationFile.importPptx(await FileBlob.load(candidate)),start=part?Math.ceil(n/2):0,end=part?n:Math.ceil(n/2);deck.slides.keep(Array.from({length:end-start},(_,i)=>start+i));const c=path.join(root,`work/revised_part${part+1}.pptx`),f=path.join(root,`work/revised_validation_output/revised_part${part+1}_validated.pptx`);await (await PresentationFile.exportPptx(deck)).save(c);await fs.rm(f,{force:true});const v=await finalizePresentation({workspaceDir:root,candidatePath:c,finalPath:f,pythonExecutable:py,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit','--validate-bullet-geometry'],explicitTotalSlideCount:end-start,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'user_request',families:['Georgia','Calibri']},verifyArtifactToolImport:true,receiptPath:path.join(root,`work/revised_part${part+1}_validation.json`)});halves.push({slides:[start+1,end],passed:true,warnings:v.presentationLayout.warning_count,sha256:v.finalSha256});console.log('Validated slides',start+1,end);}
const bytes=await fs.readFile(candidate),hash=createHash('sha256').update(bytes).digest('hex');const out=path.join(root,'outputs/DoubleAdvanced_Revised/DoubleAdvanced_Weekend_Slides.pptx');await fs.copyFile(candidate,out);
await fs.writeFile('work/revised_deck_validation.json',JSON.stringify({path:out,slides:n,bytes:bytes.length,sha256:hash,whole_package_integrity:integrity,whole_layout:layout,whole_import:{passed:true,slide_count:n},bounded_finalizer_validation:halves,validation_note:'The packaged chart-discovery validator caps input decks at500slides. Both halves passed the unmodified finalizer; the full630-slide file separately passed package, geometry, font, and first-party import checks.'},null,2));console.log('READY',out,bytes.length,hash);
