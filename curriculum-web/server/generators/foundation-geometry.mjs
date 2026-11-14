import {rng,makeQuestion,escapeHTML} from './common.mjs';

export const foundationGeometrySkills=['G-CLASS','G-WVOL'];
const SHAPES=['missing','compare','backward','mistake','what-if'];
const SCENES=[
 ['bake-sale','the school bake sale','cake-box decorations','a cake-display model'],
 ['bike-trip','a cycling-club trip','route-sign decorations','a model bike shelter'],
 ['school-garden','the school garden','plant-label decorations','a model raised garden bed'],
 ['game-quest','a video-game design project','game tokens','a model game-world tower'],
 ['science-fair','the science fair','experiment-board decorations','a model exhibit stand'],
 ['animal-shelter','an animal-shelter fundraiser','adoption-board decorations','a model animal shelter'],
 ['art-club','the art-club exhibition','collage pieces','a block sculpture'],
 ['school-play','the school play','scenery decorations','a model stage platform'],
 ['library-challenge','a library reading challenge','bookmark decorations','a model book display'],
 ['sports-day','school sports day','team-sign decorations','a model winners’ podium'],
 ['aquarium','an aquarium learning day','fish-display decorations','a model aquarium exhibit'],
 ['space-camp','space camp','mission-board decorations','a model space station'],
 ['music-club','a music-club concert','concert-poster decorations','a model concert stage'],
 ['beach-cleanup','a beach cleanup','recycling-sign decorations','a model collection station'],
 ['school-cafe','a school-cafe project','menu-board decorations','a model cafe counter'],
 ['robot-club','a robot-club demonstration','team-badge decorations','a model robot body']
];
const people=['Maya','Leo','Ari','Nora','Sam','Ivy','Omar','Zoe'];
export const foundationGeometryScenarios=skill=>foundationGeometrySkills.includes(skill)?SCENES.map(s=>s[0]):[];
const unitAliases={cards:['cards','card','shape cards','shape card'],centimetres:['centimetres','centimetre','centimeters','centimeter','cm'],'cubic centimetres':['cubic centimetres','cubic centimetre','cubic centimeters','cubic centimeter','cm³','cm3','cm^3','cu cm']};
const op=(operations,kind,a,b,result)=>{operations.push({op:kind,a,b,result});return result;};
const volume=d=>d.l*d.w*d.h;
const txt=(x,y,text,size=14)=>`<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="#37466A" stroke="none">${escapeHTML(text)}</text>`;
const svg=(title,body,height=230)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 ${height}" role="img" aria-label="${escapeHTML(title)}"><title>${escapeHTML(title)}</title><g font-family="sans-serif" stroke="#6C60AA" stroke-width="1.5" stroke-linejoin="round">${body}</g></svg>`;
const shapeModels={
 square:{name:'squares',sides:4,rightAngles:4,equalSides:4,parallelPairs:2,description:'four equal sides and four right angles',path:'M24 24h58v58H24Z'},
 rectangle:{name:'non-square rectangles',sides:4,rightAngles:4,equalSides:2,parallelPairs:2,description:'four right angles, with two long and two short sides',path:'M14 30h80v46H14Z'},
 rhombus:{name:'rhombuses without right angles',sides:4,rightAngles:0,equalSides:4,parallelPairs:2,description:'four equal sides and no right angles',path:'M12 53 54 23 96 53 54 83Z'},
 parallelogram:{name:'slanted parallelograms',sides:4,rightAngles:0,equalSides:2,parallelPairs:2,description:'two pairs of parallel sides, no right angles and two long and two short sides',path:'M15 78 34 30h63L78 78Z'},
 trapezoid:{name:'trapezoids with only one parallel pair',sides:4,rightAngles:0,equalSides:2,parallelPairs:1,description:'four sides and exactly one pair of parallel sides',path:'M14 79 34 30h44l24 49Z'},
 triangle:{name:'triangles',sides:3,rightAngles:0,equalSides:3,parallelPairs:0,description:'three sides',path:'M15 82 54 18 93 82Z'}
};
const families=[
 {target:'rectangle',groups:['square','rectangle','rhombus'],rule:'A rectangle has four right angles. Squares have these angles too, so both groups P and Q belong; R does not.'},
 {target:'rhombus',groups:['square','rhombus','rectangle'],rule:'A rhombus has four equal sides. Squares do too, so both groups P and Q belong; R does not.'},
 {target:'parallelogram',groups:['rectangle','rhombus','trapezoid'],rule:'A parallelogram has two pairs of parallel sides. Both groups P and Q do; R has only one pair.'},
 {target:'quadrilateral',groups:['parallelogram','trapezoid','triangle'],rule:'A quadrilateral has four sides. Both groups P and Q do; R has three sides.'}
];
function cardsDiagram(groups,counts){
 return svg('Three separate groups of shape cards. Each drawing represents the stated number of cards.',groups.map((kind,i)=>{
  const x=18+i*178,model=shapeModels[kind];
  return `<g transform="translate(${x} 0)"><rect x="0" y="10" width="166" height="190" rx="12" fill="${i===0?'#F0EAFE':i===1?'#EAF1FF':'#FFF3DC'}" stroke="#D4D8E7"/>${txt(83,37,`Group ${'PQR'[i]}`,15)}<g transform="translate(29 41)"><path d="${model.path}" fill="#D8CCF7"/>${model.rightAngles===4?`<path d="${kind==='square'?'M24 72h10v10':'M14 66h10v10'}" fill="none"/>`:''}</g>${txt(83,174,`${counts[i]} cards`,15)}</g>`;
 }).join(''),215);
}
function cubeDiagram(dimensions,{unknownHeight=false,composite=false}={}){
 const draw=(d,x,section,hideHeight=false)=>{
  const L=128,H=96,dx=39,dy=-30,y=153;
  let lines='';
  for(let i=1;i<d.l;i++){const px=x+L*i/d.l;lines+=`M${px} ${y}v${-H}l${dx} ${dy}`;}
  for(let i=1;i<d.w;i++){const ox=dx*i/d.w,oy=dy*i/d.w;lines+=`M${x+ox} ${y-H+oy}h${L}v${H}`;}
  // Unknown heights have no row grid that would reveal the answer by counting.
  if(!hideHeight)for(let i=1;i<d.h;i++){const py=y-H*i/d.h;lines+=`M${x} ${py}h${L}l${dx} ${dy}`;}
  return `<path d="M${x} ${y}h${L}v${-H}h${-L}Z" fill="#E6E0FA"/><path d="M${x} ${y-H}l${dx} ${dy}h${L}l${-dx} ${-dy}Z" fill="#F5F1FF"/><path d="M${x+L} ${y}l${dx} ${dy}v${-H}l${-dx} ${-dy}Z" fill="#D3DFF5"/><path d="${lines}" fill="none" stroke="#A79BC9" stroke-width=".7"/>${txt(x+L/2,181,`${d.l} cm long`)}${txt(x+L+dx-8,150,`${d.w} cm`,12)}${txt(x-15,106,hideHeight?'? cm':`${d.h} cm`,12)}${txt(x+L/2,20,section,15)}`;
 };
 const body=composite?draw(dimensions.a,37,'Section A',unknownHeight)+draw(dimensions.b,310,'Section B')+txt(260,105,'+',23)+txt(270,218,'Join the two sections without overlap.'):draw(dimensions.a,165,'Unit-cube model',unknownHeight)+txt(270,218,'Each small cube has volume 1 cubic centimetre.');
 return svg(`${composite?'Two rectangular-prism sections':'A rectangular prism'} made from unit cubes. ${unknownHeight?'The first height is unknown. ':''}Use the labelled dimensions; drawing not to scale.`,body+(unknownHeight?txt(270,244,'Height layers are not shown; find the unknown height.',12):''),unknownHeight?265:240);
}
function wrongHints(answer,candidates){
 const seen=new Set([String(answer)]),hints=[];
 for(const [value,text] of candidates){if(!Number.isFinite(value)||seen.has(String(value)))continue;seen.add(String(value));hints.push({answer:String(value),text});if(hints.length===3)return hints;}
 for(let offset=1;hints.length<3;offset++){const value=Number(answer)+offset;if(seen.has(String(value)))continue;seen.add(String(value));hints.push({answer:String(value),text:'Keep the result from one step and check how the next step uses it, including the units.'});}
 return hints;
}
function finish(skill,seed,shape,{prompt,answer,unit,solution,hint,hints,diagram,verification,scene,answerChoice,choiceLabels}){
 const story=Boolean(scene);
 return makeQuestion({skill,seed,shape:story?`story-${shape}`:shape,...(story?{story:true,scenarioId:scene[0],storyShape:shape,stepCount:solution.length}:{}),prompt:`<p>${escapeHTML(prompt)}</p>`,plainPrompt:prompt,answer:String(answer),answerUnit:unit,unitAliases:unitAliases[unit],solution,hint,hints,svg:diagram,answerChoice,choiceLabels,numbers:prompt.match(/\d+(?:\.\d+)?/g)??[],verification:{...verification,answer:String(answer)}});
}
function classify(skill,seed,r,difficulty,shape,scene){
 const family=r.pick(families),who=r.pick(people),a=r.int(3,12+8*difficulty),b=r.int(3,12+8*difficulty),c=r.int(3,16+5*difficulty),kits=r.int(2,5+difficulty),extra=r.int(2,9),eligible=a+b;
 const groups=family.groups.map((kind,i)=>({kind,...shapeModels[kind],count:[a,b,c][i]})),ops=[];
 const describe=(unknown=false)=>groups.map((group,i)=>`Group ${'PQR'[i]} has ${i===0&&unknown?'an unknown number of':group.count} cards whose shapes have ${group.description}`).join('; ')+'.';
 const start=scene?`${who} prepares shape cards for ${scene[2]} at ${scene[1]}. `:`${who} sorts shape cards for a class display. `;
 const counted=`Count every card in the ${family.target} family, including its special cases. The three groups contain separate cards.`;
 let prompt,answer,solution,answerChoice,choiceLabels,used,other,finalCount,claimedAnswer,unknown=false;
 if(!scene){
  if(shape==='missing'){
   unknown=true;answer=op(ops,'sub',eligible,b,a);
   prompt=start+describe(true)+` ${counted} There are ${eligible} cards in that family altogether. How many cards are in group P? Include cards in your answer.`;
   solution=[family.rule,`Only P and Q belong. Subtract group Q from the family total: ${eligible} − ${b} = ${a} cards in P.`];
  }else{
   answer=op(ops,'add',a,b,eligible);prompt=start+describe()+` ${counted} How many cards belong to this family? Include cards in your answer.`;
   solution=[family.rule,`Combine the two qualifying groups: ${a} + ${b} = ${eligible} cards.`];
  }
 }else if(shape==='backward'){
  unknown=true;used=r.int(2,eligible*kits-1);finalCount=eligible*kits-used;
  const original=op(ops,'add',finalCount,used,eligible*kits),perKit=op(ops,'div',original,kits,eligible);answer=op(ops,'sub',perKit,b,a);
  prompt=start+`Each of ${kits} identical kits has these groups. `+describe(true)+` ${counted} After ${used} qualifying cards are used, ${finalCount} qualifying cards remain from all the kits. How many cards were in group P of each kit? Include cards in your answer.`;
  solution=[`Restore the used cards: ${finalCount} + ${used} = ${original} qualifying cards originally.`,`${family.rule} Share that original total among the ${kits} identical kits: ${original} ÷ ${kits} = ${perKit} qualifying cards per kit.`,`Remove group Q from that per-kit amount: ${perKit} − ${b} = ${answer} cards in group P.`];
 }else{
  let current=op(ops,'add',a,b,eligible);solution=[`${family.rule} One kit therefore has ${a} + ${b} = ${eligible} qualifying cards.`];
  prompt=start+`Each kit has these groups. `+describe()+` ${counted} `;
  if(shape==='what-if'){
   current=op(ops,'add',current,extra,eligible+extra);solution.push(`Add the extra group-P cards to that qualifying amount: ${eligible} + ${extra} = ${current} per kit.`);
   prompt+=`What if ${extra} more group-P cards are added to every kit? `;
  }
  const total=op(ops,'mul',current,kits,current*kits);solution.push(`Use that amount for ${kits} identical kits: ${current} × ${kits} = ${total} qualifying cards.`);
  if(shape==='compare'){
   const gap=r.int(2,Math.max(3,Math.floor(total/3)));other=total+(r.int(0,1)?gap:-gap);answer=op(ops,'sub',Math.max(total,other),Math.min(total,other),Math.abs(total-other));answerChoice=total>other?'A':'B';choiceLabels={A:`${kits} kits of the groups shown`,B:`${other} qualifying cards`};
   prompt+=`Option A provides ${kits} kits. Option B provides ${other} cards already checked to be in the ${family.target} family. Which option gives more qualifying cards, and by how much? Answer A or B and the difference in cards.`;
   solution.push(`Compare ${total} cards with ${other} cards: ${Math.max(total,other)} − ${Math.min(total,other)} = ${answer} cards. Option ${answerChoice} gives ${answer} more cards.`);
  }else{
   used=r.int(1,Math.max(2,Math.min(b*kits-1,total-1)));answer=op(ops,'sub',total,used,total-used);
   prompt+=`${who} opens ${kits} kits and uses ${used} qualifying cards for the decorations. `;
   if(shape==='mistake'){claimedAnswer=b*kits-used;prompt+=`A friend says group P does not belong to the ${family.target} family, so only ${claimedAnswer} qualifying cards remain. Find and fix that mistake. `;}
   prompt+='How many qualifying cards remain? Include cards in your answer.';
   solution.push(`Subtract the cards used from that total: ${total} − ${used} = ${answer} cards remain.${shape==='mistake'?' Group P also belongs in the family; leaving it out caused the mistake.':''}`);
  }
 }
 const hint=`Look at the defining attributes of a ${family.target}. A special kind of shape can belong to a larger family too. ${shape==='backward'?'Restore the used cards first, then find one kit’s amount.':'Decide which groups qualify before counting their cards.'}`;
 return finish(skill,seed,shape,{scene,prompt,answer,unit:'cards',solution,hint,hints:wrongHints(answer,[[b,'A special shape can belong to more than one family. Check group P’s attributes.'],[a+b+c,'Not every group satisfies the family definition. Check every group’s attributes.'],[eligible*kits,'The question may ask what remains or a difference, not just the starting total.']]),diagram:cardsDiagram(family.groups,[unknown?'?':a,b,c]),answerChoice,choiceLabels,verification:{kind:'foundation-shape-classification',family:family.target,groups,inputs:{kits,extra,used,other,finalCount},claimedAnswer,operations:ops}});
}
function wholeVolume(skill,seed,r,difficulty,shape,scene){
 const who=r.pick(people),a={l:r.int(3,12+6*difficulty),w:r.int(2,8+4*difficulty),h:r.int(2,8+3*difficulty)};
 const composite=Boolean(scene)&&r.int(0,1)===1,b={l:r.int(2,5+difficulty),w:r.int(2,5+difficulty),h:r.int(2,4+difficulty)},dimensions={a,...(composite?{b}:{})};
 const vA=volume(a),vB=composite?volume(b):0,quantity=vA+vB,left=r.int(7,90),extra=r.int(1,4),stock=quantity+left,ops=[];
 const intro=scene?`${who} builds ${scene[3]} for ${scene[1]} with small cubes. `:`${who} builds a rectangular-prism model with small cubes. `;
 const units='Each small cube measures 1 cm on every edge and fills 1 cubic centimetre. There are no gaps inside the solid model. ';
 const description=(unknown=false)=>composite?`The model has two rectangular-prism sections joined without overlap. Section A is ${a.l} cm long and ${a.w} cm wide${unknown?', with an unknown height':`, and ${a.h} cm high`}. Section B is ${b.l} cm long, ${b.w} cm wide and ${b.h} cm high. `:`The model is ${a.l} cm long and ${a.w} cm wide${unknown?', with an unknown height':`, and ${a.h} cm high`}. `;
 const buildVolume=(height=a.h)=>{
  const base=op(ops,'mul',a.l,a.w,a.l*a.w),first=op(ops,'mul',base,height,base*height);
  const lines=[`One base layer has ${a.l} × ${a.w} = ${base} square centimetres, so it contains ${base} unit cubes.`,`Use that base layer for the ${height} cm height: ${base} × ${height} = ${first} cubic centimetres${composite?' in section A':''}.`];
  if(composite){const all=op(ops,'add-prism',first,[b.l,b.w,b.h],first+vB);lines.push(`Add the second, non-overlapping section to that volume: ${first} + (${b.l} × ${b.w} × ${b.h}) = ${all} cubic centimetres.`);return {total:all,lines};}
  return {total:first,lines};
 };
 let prompt,answer,unit='cubic centimetres',solution,unknown=false,answerChoice,choiceLabels,claimedAnswer,other,supply=stock;
 if(!scene){
  unknown=shape==='missing';
  if(unknown){unit='centimetres';const cross=op(ops,'div',vA,a.l,a.w*a.h);answer=op(ops,'div',cross,a.w,a.h);prompt=intro+units+description(true)+`The model fills ${vA} cubic centimetres. Find its missing height. Include centimetres in your answer.`;solution=[`Divide the volume by the length: ${vA} ÷ ${a.l} = ${cross} square centimetres for width × height.`,`Use that result and the width: ${cross} ÷ ${a.w} = ${answer} centimetres high.`];}
  else{const built=buildVolume();answer=built.total;solution=built.lines;prompt=intro+units+description()+`How much space does the model fill? Include cubic centimetres in your answer.`;}
 }else if(shape==='backward'){
  unknown=true;unit='centimetres';const total=op(ops,'sub',stock,left,quantity);solution=[`Find the volume used in the model: ${stock} − ${left} = ${total} cubic centimetres.`];
  let first=total;
  if(composite){first=op(ops,'subtract-prism',total,[b.l,b.w,b.h],vA);solution.push(`Remove section B’s volume from that total: ${total} − (${b.l} × ${b.w} × ${b.h}) = ${first} cubic centimetres in A.`);}
  answer=op(ops,'prism-height',first,[a.l,a.w],a.h);solution.push(`Use that volume to find ${composite?'A’s':'the'} height: ${first} ÷ (${a.l} × ${a.w}) = ${a.h} centimetres.`);
  prompt=intro+units+description(true)+`${who} starts with ${stock} unit cubes. After building the model, ${left} unit cubes remain. What is the unknown height? Include centimetres in your answer.`;
 }else if(shape==='what-if'){
  const newHeight=op(ops,'add',a.h,extra,a.h+extra),first=op(ops,'height-volume',newHeight,[a.l,a.w],a.l*a.w*newHeight);solution=[`Find the new height${composite?' of section A':''}: ${a.h} + ${extra} = ${newHeight} centimetres.`,`Use that height in the volume calculation: ${a.l} × ${a.w} × ${newHeight} = ${first} cubic centimetres${composite?' in section A':''}.`];
  let total=first;if(composite){total=op(ops,'add-prism',first,[b.l,b.w,b.h],first+vB);solution.push(`Add section B, which stays the same: ${first} + (${b.l} × ${b.w} × ${b.h}) = ${total} cubic centimetres.`);}
  supply=total+left;answer=op(ops,'sub',supply,total,left);solution.push(`Subtract that new model volume from the supply: ${supply} − ${total} = ${left} cubic centimetres of cubes remain.`);
  prompt=intro+units+description()+`${who} has ${supply} unit cubes. What if ${composite?'section A’s':'the model’s'} height increases by ${extra} cm while ${composite?'section B and all other dimensions stay':'the length and width stay'} the same? What volume of unused cubes will remain? Include cubic centimetres in your answer.`;
 }else{
  const built=buildVolume();solution=built.lines;
  if(shape==='compare'){
   const gap=r.int(3,Math.max(4,Math.floor(quantity/4)));other=quantity+(r.int(0,1)?gap:-gap);answer=op(ops,'sub',Math.max(quantity,other),Math.min(quantity,other),Math.abs(quantity-other));answerChoice=quantity>other?'A':'B';choiceLabels={A:'The model described above',B:`An alternative filling ${other} cubic centimetres`};
   prompt=intro+units+description()+`Option A uses the model just described. Option B is a solid model that fills ${other} cubic centimetres. ${who} wants the model that uses more unit cubes. Which option should be chosen, and by how much is its volume larger? Answer A or B and the difference in cubic centimetres.`;
   solution.push(`Compare the two volumes: ${Math.max(quantity,other)} − ${Math.min(quantity,other)} = ${answer} cubic centimetres. Option ${answerChoice} uses ${answer} more cubic centimetres of cubes.`);
  }else{
   answer=op(ops,'sub',stock,quantity,left);
   prompt=intro+units+description()+`${who} has ${stock} unit cubes. `;
   if(shape==='mistake'){claimedAnswer=stock-a.l*a.w-(composite?b.l*b.w:0);prompt+=`A friend counts only the bottom layer${composite?' of each section':''} and says ${claimedAnswer} cubic centimetres of cubes remain. Find and fix this mistake. `;}
   prompt+='After building the entire model, what volume of unused cubes remains? Include cubic centimetres in your answer.';
   solution.push(`Subtract the full model volume from the supply: ${stock} − ${quantity} = ${left} cubic centimetres of cubes remain.${shape==='mistake'?' Counting just the bottom layer misses the cubes above it.':''}`);
  }
 }
 const hint=shape==='backward'?'Find the used volume from the unit-cube supply. Remove any known section, then divide by the known base area.':'Volume counts unit cubes in all three dimensions. Find the cubes in one layer, then use all the layers. Add non-overlapping sections when there are two.';
 return finish(skill,seed,shape,{scene,prompt,answer,unit,solution,hint,hints:wrongHints(answer,[[a.l*a.w,'That counts just one base layer. Volume includes every layer.'],[a.l+a.w+a.h,'Adding edge lengths does not count the unit cubes inside a solid.'],[quantity,'Check whether the question asks for model volume, a difference, a missing height or the unused cubes.']]),diagram:cubeDiagram(dimensions,{unknownHeight:unknown,composite}),answerChoice,choiceLabels,verification:{kind:'foundation-whole-volume',dimensions,composite,quantity,inputs:{supply,left,extra,other},claimedAnswer,operations:ops}});
}
export function generateFoundationGeometry(skill,seed,{mode,difficulty=1,shape,scenarioId,storyShape}={}){
 if(!foundationGeometrySkills.includes(skill))throw new Error('Unknown foundation geometry skill '+skill);
 if(![1,2,3].includes(difficulty))throw new Error('Invalid difficulty');
 const r=rng(`foundation-geometry:${skill}:${seed}:${difficulty}`),story=mode==='story';
 const scene=story?SCENES.find(row=>row[0]===(scenarioId??r.pick(SCENES)[0])):null;
 if(story&&!scene)throw new Error('Unknown foundation geometry scenario '+scenarioId);
 const selected=story?(storyShape??r.pick(SHAPES)):(shape??r.pick(['calculation','missing']));
 if(!(story?SHAPES:['calculation','missing']).includes(selected))throw new Error('Unknown foundation geometry question shape '+selected);
 return (skill==='G-CLASS'?classify:wholeVolume)(skill,seed,r,difficulty,selected,scene);
}
