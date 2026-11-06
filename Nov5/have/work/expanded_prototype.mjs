import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from '@oai/artifact-tool';
import {C,box,line,rect,poly,rich,diagram} from './expanded_helpers.mjs';
import {mathLine,nativeText} from './expanded_math.mjs';
const p=Presentation.create({slideSize:{width:1280,height:720}});
function txt(s,t,x,y,w,fs=32,color=C.ink,font='Calibri'){return rich(s,t,x,y,w,{fs,color,font,maxHeight:500});}
function head(s,topic,title,phase){s.background.fill=C.bg;txt(s,topic,60,22,1130,22,C.teal);nativeText(s,title,60,76,1140,82,46,'Calibri',C.ink,{bold:true});txt(s,phase,60,665,700,20,C.gray);}
function foot(s,t){line(s,60,620,1220,620,'#D2DDD9',1);txt(s,t,60,634,1150,21,C.brick);}
// Fraction explanation: two directions share one unit square.
{
const s=p.slides.add();head(s,'Week 1 · Fraction multiplication','Two thirds of three fourths','Model · Compare the model with the calculation');
const x=90,y=210,u=320;for(let i=0;i<3;i++)for(let j=0;j<4;j++){const fill=i<2&&j<3?'#F6C744':i<2?'#C8EBE8':j<3?'#F7C4B6':'#FFFFFF';rect(s,x+i*u/3,y+j*u/4,u/3,u/4,fill,'#FFFFFF');}rect(s,x,y,u,u,'none',C.ink);
mathLine(s,[{text:'{2/3}',color:C.teal}],190,170,{fs:42});mathLine(s,[{text:'{3/4}',color:C.brick}],22,370,{fs:42});
txt(s,'6 of the 12 equal parts overlap.',80,555,500,29,C.ink);
mathLine(s,[{text:'{2/3}',color:C.teal},'×',{text:'{3/4}',color:C.brick},'=',{text:'{6/12}',color:'#9E7000'},'=',{text:'{1/2}',color:'#9E7000'}],650,260,{fs:53,gap:19});
txt(s,'Keep the whole the same',650,350,530,33,C.teal,'Georgia');txt(s,'Three columns and four rows make twelve equal parts. Six parts belong to both shadings.',650,405,520,29);
foot(s,'Follow along: Day 002 · Worked example · Watch, then explain the overlap');
s.speakerNotes.text='Say. The whole square stays fixed. Teal names the two columns; coral names the three rows. Gold is the overlap.\nAsk. Why does the denominator become twelve?\nExpect. Three equal columns crossed by four equal rows produce twelve equal parts; six are in both groups.\nIf stuck. Count the rows and columns before counting gold parts.\nTime. 4 minutes, followed by a student explanation.';
}
// Geometry comparison with exact height and decomposition.
{
const s=p.slides.add();head(s,'Week 7 · Parallelogram area','Parallelogram and rectangle area','Discuss · Compare the two representations');
const pts=[[105,480],[465,480],[585,300],[225,300]];poly(s,pts,'#D2EEE9',C.teal);poly(s,[[105,480],[225,480],[225,300]],'#F7C4B6',C.brick);line(s,225,300,225,480,C.brick,3);line(s,225,464,241,464,C.brick,2);line(s,241,464,241,480,C.brick,2);txt(s,'3 cm',240,350,95,28,C.brick);txt(s,'6 cm',270,492,160,29,C.teal);
rect(s,770,300,360,180,'#D2EEE9',C.teal);poly(s,[[1010,480],[1130,480],[1130,300]],'#F7C4B6',C.brick);txt(s,'6 cm',890,492,160,29,C.teal);txt(s,'3 cm',1145,360,100,28,C.brick);
txt(s,'Move the\ntriangle',600,315,155,26,C.brick);line(s,600,410,737,410,C.brick,3);
mathLine(s,['A','=',{text:'6',color:C.teal},'×',{text:'3',color:C.brick},'=','18 cm²'],395,565,{fs:42,gap:14});
foot(s,'Follow along: Week 7 · Area model · Explain which length is the height');
s.speakerNotes.text='Say. Cut the left triangle and translate it to the right. No area is added or removed.\nAsk. Why is the slanted side not the height?\nExpect. The height is perpendicular to the six-centimeter base.\nIf stuck. Trace the marked right angle.\nTime. 5 minutes, including a sketch and explanation.';
}
// Colorful opener; the native mathematical evidence occupies half the slide.
{
const s=p.slides.add();s.background.fill='#103D50';txt(s,'WEEK 1 · SUNDAY',60,32,600,23,'#72DDD3');nativeText(s,'Fraction',60,120,620,80,64,'Calibri','#FFF9EF',{bold:true});nativeText(s,'multiplication',60,205,650,85,64,'Calibri','#FFF9EF',{bold:true});txt(s,'Parts of parts',60,325,550,34,'#F6C744','Georgia');txt(s,'Shade a whole. Compare two models.\nExplain why the rule works.',60,390,560,30,'#FFF9EF');
const x=770,y=160,u=350;for(let i=0;i<3;i++)for(let j=0;j<4;j++)rect(s,x+i*u/3,y+j*u/4,u/3,u/4,i<2&&j<3?'#F6C744':i<2?'#37B7AD':j<3?'#F27C62':'#F5EADA','#103D50');
mathLine(s,[{text:'{2/3}',color:'#72DDD3'},'×',{text:'{3/4}',color:'#F9A18E'}],840,580,{fs:55,color:'#FFF9EF',gap:23});txt(s,'Today: model → calculate → justify',60,565,620,25,'#72DDD3');line(s,60,635,1220,635,'#477382',1);txt(s,'Follow along: Day 002 · Student workbook · Begin with Recall',60,650,1150,22,'#FFF9EF');
s.speakerNotes.text='Say. Today we connect the picture of a part of a part to its calculation.\nAsk. What could the gold overlap represent?\nExpect. A conjecture about two thirds of three fourths.\nIf stuck. Name each shading separately.\nTime. 2 minutes.';
}
await fs.mkdir('work/expanded_prototype',{recursive:true});for(let i=0;i<p.slides.items.length;i++){const z=await p.export({slide:p.slides.items[i],format:'png',scale:1});await fs.writeFile(`work/expanded_prototype/style-${i+1}.png`,new Uint8Array(await z.arrayBuffer()));}
await (await PresentationFile.exportPptx(p)).save('work/expanded_prototype.pptx');console.log('Three prototypes rendered');
