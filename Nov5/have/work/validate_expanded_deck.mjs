import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PresentationFile,FileBlob} from '@oai/artifact-tool';
const root=process.cwd(),skill='/Users/sahil/.codex/plugins/cache/openai-primary-runtime/presentations/26.1104.11149/skills/presentations',rt='/Users/sahil/.cache/codex-runtimes/codex-primary-runtime/dependencies',py=path.join(rt,'python/bin/python3');
const candidate=path.join(root,'work/expanded_deck_candidate.pptx');
const n=JSON.parse(await fs.readFile('work/expanded_deck_meta.json')).length;
function cli(name,args){const r=spawnSync(py,[path.join(skill,'container_tools',name),candidate,...args],{encoding:'utf8',maxBuffer:20*1024*1024});if(r.status!==0)throw Error(name+' failed '+r.stdout+' '+r.stderr);return JSON.parse(r.stdout);}
const integrity=cli('inspect_presentation_package_integrity.py',[]);
const layout=cli('inspect_presentation_layout_geometry.py',['--expected-slide-size-emu','12192000,6858000','--expected-slide-count',String(n),'--approved-font-family','Georgia','--approved-font-family','Calibri','--approved-font-family','STIX Two Math','--validate-heading-fit','--validate-bullet-geometry']);
await fs.writeFile('work/expanded_full_layout.json',JSON.stringify(layout,null,2));if(layout.finding_count||layout.warning_count)throw Error('Whole deck layout requires review: '+JSON.stringify(layout.warnings));
const whole=await PresentationFile.importPptx(await FileBlob.load(candidate));if(whole.slides.items.length!==n)throw Error('Full import count differs');
console.log('Whole deck imported',n);
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const halves=[]; await fs.mkdir(path.join(root,'work/expanded_validation_output'),{recursive:true});
const partitions=Math.ceil(n/300);
for(let part=0;part<partitions;part++){const deck=await PresentationFile.importPptx(await FileBlob.load(candidate)),start=part*300,end=Math.min(n,(part+1)*300);deck.slides.keep(Array.from({length:end-start},(_,i)=>start+i));const c=path.join(root,`work/expanded_part${part+1}.pptx`),f=path.join(root,`work/expanded_validation_output/expanded_part${part+1}_validated.pptx`);await (await PresentationFile.exportPptx(deck)).save(c);await fs.rm(f,{force:true});await fs.rm(path.join(root,`work/expanded_part${part+1}_validation.json`),{force:true});const v=await finalizePresentation({workspaceDir:root,candidatePath:c,finalPath:f,pythonExecutable:py,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit','--validate-bullet-geometry'],explicitTotalSlideCount:end-start,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:['Georgia','Calibri','STIX Two Math']},verifyArtifactToolImport:true,receiptPath:path.join(root,`work/expanded_part${part+1}_validation.json`)});halves.push({slides:[start+1,end],passed:true,warnings:v.presentationLayout.warning_count,sha256:v.finalSha256});console.log('Validated slides',start+1,end);}
const bytes=await fs.readFile(candidate),hash=createHash('sha256').update(bytes).digest('hex');const out=path.join(root,'outputs/DoubleAdvanced_Expanded/DoubleAdvanced_Weekend_Slides.pptx');await fs.copyFile(candidate,out);
await fs.writeFile('work/expanded_deck_validation.json',JSON.stringify({path:out,slides:n,bytes:bytes.length,sha256:hash,whole_package_integrity:integrity,whole_layout:layout,whole_import:{passed:true,slide_count:n},bounded_finalizer_validation:halves,validation_note:`The packaged chart-discovery validator caps input decks at 500 slides. All ${partitions} partitions passed the unmodified finalizer; the full ${n}-slide file separately passed package, geometry, font, and first-party import checks.`},null,2));console.log('READY',out,bytes.length,hash);
