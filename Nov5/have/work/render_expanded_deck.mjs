import fs from 'node:fs/promises';
import {PresentationFile,FileBlob} from '@oai/artifact-tool';
const p=await PresentationFile.importPptx(await FileBlob.load('work/expanded_deck_candidate.pptx'));
const args=process.argv.slice(2),targets=args.length?args.map(Number):p.slides.items.map((_,i)=>i+1);
await fs.mkdir('work/expanded_deck_render',{recursive:true});
for(const n of targets){const z=await p.export({slide:p.slides.items[n-1],format:'png',scale:1});await fs.writeFile(`work/expanded_deck_render/slide-${String(n).padStart(3,'0')}.png`,new Uint8Array(await z.arrayBuffer()));if(n%25===0)console.log('Rendered',n,'of',p.slides.items.length);}
console.log('Render complete',targets.length);
