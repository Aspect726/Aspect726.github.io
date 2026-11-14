import { rng, makeQuestion, escapeHTML } from './common.mjs';

export const storyGeometrySkills = ['G-PERIM','G-PARA','G-TRI','G-COMP','G-SA','P-SCALE','P-MAP','G-CIRC','G-CAREA','G-VOL'];
const SHAPES = ['missing','compare','backward','mistake','what-if'];
const SCENES = [
  ['bake-sale','the school bake sale','a price sign','a cake-board label','a cake display block','the walk from the bakery to the bake-sale stall'],
  ['bike-trip','a cycling-club trip','a route sign','a wheel badge','a repair-kit display block','the bike route from the station to the lake'],
  ['school-garden','the school garden','a plant label','a flower-bed sign','a garden display block','the garden path from the gate to the greenhouse'],
  ['game-quest','a new video-game quest','a cardboard map tile','a treasure token','a model game-world block','the game map route from the village to the castle'],
  ['science-fair','the science fair','an experiment display panel','a planet display disk','an exhibit block','the route between the school and the science museum'],
  ['animal-shelter','a fundraiser for an animal shelter','an adoption sign','a pet-name badge','a model animal shelter','the delivery route from the shop to the shelter'],
  ['art-club','an art-club exhibition','a collage panel','a mosaic disk','a sculpture block','the art-walk route from the school to the gallery'],
  ['school-play','the school play','a scenery panel','a stage badge','a scenery block','the costume-delivery route from the workshop to the theatre'],
  ['library-challenge','a library reading challenge','a book-review display panel','a reading-club badge','a book-display block','the reading-trail route from the library to the park'],
  ['sports-day','school sports day','a team sign','a finish-line medal','a podium model','the sports route from the hall to the playing field'],
  ['aquarium','an aquarium learning day','a fish-care display panel','a sea-life badge','a model aquarium','the walking route from the station to the aquarium'],
  ['space-camp','space camp','a mission display panel','a planet badge','a model cargo block','the moon-map route from the landing site to the research base'],
  ['music-club','a music-club concert','a concert sign','a band badge','a stage model','the instrument-delivery route from the school to the concert hall'],
  ['beach-cleanup','a beach cleanup','a recycling sign','a volunteer badge','a model collection box','the cleanup route from the beach entrance to the pier'],
  ['school-cafe','a school-cafe project','a menu sign','a table-number disk','a cafe display block','the ingredient-delivery route from the market to the school cafe'],
  ['robot-club','a robot-club demonstration','a robot display panel','a team badge','a model robot body','the robot-map route from the charging station to the finish line']
];
const sceneMap = new Map(SCENES.map(([id,project,flat,round,solid,route])=>[id,{id,project,flat,round,solid,route}]));
export const geometryStoryScenarios = skill => storyGeometrySkills.includes(skill) ? SCENES.map(row=>row[0]) : [];
const F = n => String(Number(Number(n).toFixed(8)));
const n = x => Number(F(x));
const op = (ops,kind,a,b,result) => {const value=n(result);ops.push({op:kind,a,b,result:value});return value;};
const sceneMaterials={'bake-sale':'coloured card','bike-trip':'weatherproof vinyl','school-garden':'waterproof label paper','game-quest':'printed game artwork','science-fair':'display paper','animal-shelter':'colourful adoption-poster paper','art-club':'collage paper','school-play':'scenery paper','library-challenge':'book-cover paper','sports-day':'team-colour paper','aquarium':'waterproof display paper','space-camp':'shiny craft foil','music-club':'concert-poster paper','beach-cleanup':'weatherproof sign material','school-cafe':'laminated menu paper','robot-club':'metallic craft paper'};
const aliases = unit => ({'centimetres':['centimetres','centimetre','centimeters','centimeter','cm'],'square centimetres':['square centimetres','square centimetre','square centimeters','square centimeter','cm²','cm2','cm^2','sq cm'],'cubic centimetres':['cubic centimetres','cubic centimetre','cubic centimeters','cubic centimeter','cm³','cm3','cm^3','cu cm'],'metres':['metres','metre','meters','meter','m'],'cents':['cents','cent','¢']}[unit]);
function diagram(kind,values) {
 const label=(x,y,text)=>`<text x="${x}" y="${y}" text-anchor="middle" fill="#25385F" stroke="none" font-family="sans-serif" font-size="17">${escapeHTML(text)}</text>`;
 let drawing='';
 if(kind==='rectangle')drawing=`<rect x="95" y="35" width="250" height="115" rx="2"/>${label(220,180,values[0]+' cm')}${label(55,100,values[1]+' cm')}`;
 if(kind==='parallelogram')drawing=`<path d="M80 155 135 40h220l-55 115Z"/><path d="M135 40v115" stroke-dasharray="5 5"/><path d="M135 142h13v13"/>${label(190,185,values[0]+' cm')}${label(165,103,values[1]+' cm')}`;
 if(kind==='triangle')drawing=`<path d="M85 155 175 35 350 155Z"/><path d="M175 35v120" stroke-dasharray="5 5"/><path d="M175 142h13v13"/>${label(220,185,values[0]+' cm')}${label(205,100,values[1]+' cm')}`;
 if(kind==='circle')drawing=`<circle cx="220" cy="100" r="72"/><path d="M148 100h144"/>${label(220,90,'diameter '+values[0]+' cm')}${label(220,195,'Use π = 3.14')}`;
 if(!drawing)return undefined;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 215" role="img" aria-label="${escapeHTML(kind+'; '+values.join(' by ')+' centimetres; diagram not to scale')}"><title>${escapeHTML(kind+' dimensions')}</title><g fill="#EDF4FF" stroke="#507DCB" stroke-width="2">${drawing}</g></svg>`;
}

// Dimensions are generated first. Supplies and backwards totals are then derived
// from those dimensions, so there are no fractional physical items or ambiguous
// rounding decisions. All circles use the explicitly stated value pi = 3.14.
function model(skill,r,difficulty,scene) {
 const l=r.int(5,difficulty>1?18:12),w=r.int(2,7),h=r.int(3,9),count=r.int(2,5),ops=[];
 let quantity,description,unit='square centimetres',material=sceneMaterials[scene.id],one,backwardAsk,backwardKnown,backwardResult,inverse,svg;
 const dimensions={l,w,h};
 if(skill==='G-PERIM') {
  quantity=op(ops,'perimeter',l,w,2*(l+w));unit='centimetres';material='decorative edging';one=`rectangular ${scene.flat.slice(2)}`;
  description=`Each ${one} is ${l} cm long and ${w} cm wide. It needs edging all the way around, with no overlap.`;
  backwardKnown=`Each rectangular ${scene.flat.slice(2)} is ${l} cm long. Its width is unknown.`;backwardAsk='What is the width of each piece';backwardResult=w;inverse=each=>({op:'rectangle-width',a:each,b:l,result:each/2-l});
  svg=diagram('rectangle',[l,w]);
 } else if(skill==='G-PARA'||skill==='G-TRI') {
  const b=l*2;dimensions.b=b;const triangle=skill==='G-TRI';
  quantity=op(ops,triangle?'triangle-area':'mul',b,h,triangle?b*h/2:b*h);one=`${triangle?'triangular':'parallelogram-shaped'} ${scene.flat.slice(2)}`;
  description=`Each ${one} has a base of ${b} cm and a perpendicular height of ${h} cm. Cover just one side.`;
  backwardKnown=`Each ${one} has a base of ${b} cm and an unknown perpendicular height. Cover just one side.`;backwardAsk='What is the perpendicular height of each piece';backwardResult=h;inverse=each=>({op:triangle?'triangle-height':'div',a:each,b:b,result:triangle?2*each/b:each/b});
  svg=diagram(triangle?'triangle':'parallelogram',[b,h]);
 } else if(skill==='G-COMP') {
  const cutW=r.int(1,3),cutH=r.int(1,Math.min(2,w-1));dimensions.cutW=cutW;dimensions.cutH=cutH;
  const outer=op(ops,'mul',l,w,l*w);quantity=op(ops,'subtract-rectangle',outer,[cutW,cutH],outer-cutW*cutH);one=`window-shaped ${scene.flat.slice(2)}`;
  description=`Each ${one} starts as a ${l} cm by ${w} cm rectangle. A ${cutW} cm by ${cutH} cm rectangle is removed from one corner. Cover only the remaining L-shape.`;
  backwardKnown=`Each ${one} starts as a ${l} cm by ${w} cm rectangle. A rectangular corner is removed. Cover only the remaining L-shape.`;backwardAsk='What is the area removed from one piece';backwardResult=cutW*cutH;inverse=each=>({op:'rectangle-cutout',a:[l,w],b:each,result:l*w-each});
 } else if(skill==='G-SA') {
  const edge=r.int(3,difficulty>1?10:7);dimensions.edge=edge;
  const face=op(ops,'mul',edge,edge,edge*edge);quantity=op(ops,'mul',face,6,face*6);one=`closed cube-shaped ${scene.solid.slice(2)}`;
  description=`Each ${one} has an edge length of ${edge} cm. Its net has six square faces. Cover all six faces, with no overlap.`;
  backwardKnown=`Each ${one} has six equal square faces. Cover all six faces, with no overlap.`;backwardAsk='What is the area of one square face';backwardResult=edge*edge;inverse=each=>({op:'div',a:each,b:6,result:each/6});
 } else if(skill==='P-SCALE') {
  const scale=r.int(2,4);dimensions.scale=scale;
  const original=op(ops,'mul',l,w,l*w);quantity=op(ops,'scale-area',original,scale,original*scale*scale);one=`enlarged rectangular ${scene.flat.slice(2)}`;
  description=`The original rectangular ${scene.flat.slice(2)} is ${l} cm by ${w} cm. Enlarge every length by a scale factor of ${scale}. Cover one side of each enlarged copy.`;
  backwardKnown=`Every length of an original rectangular ${scene.flat.slice(2)} was enlarged by a scale factor of ${scale}. Cover one side of each enlarged copy.`;backwardAsk='What was the area of one original piece';backwardResult=l*w;inverse=each=>({op:'div',a:each,b:scale*scale,result:each/(scale*scale)});
 } else if(skill==='P-MAP') {
  const localScales={'school-garden':[1,2,5],'robot-club':[1,2,3],'sports-day':[5,10,20],'bake-sale':[10,25,50],'school-cafe':[10,25,50]};
  const scale=r.pick(localScales[scene.id]??[25,50,100]),mapLength=r.int(3,12);dimensions.scale=scale;dimensions.mapLength=mapLength;
  quantity=op(ops,'mul',mapLength,scale,mapLength*scale);unit='metres';material='metres of travel';one='one-way journey';
  description=`On the map, ${scene.route} is ${mapLength} cm long. The scale is 1 cm for ${scale} metres. Each journey follows this entire route.`;
  backwardKnown=`The map scale is 1 cm for ${scale} metres. Each one-way journey follows ${scene.route}.`;backwardAsk='How long is the one-way route on the map';backwardResult=mapLength;inverse=each=>({op:'div',a:each,b:scale,result:each/scale});
 } else if(skill==='G-CIRC'||skill==='G-CAREA') {
  const radius=5*r.int(1,difficulty>1?4:3);dimensions.radius=radius;
  if(skill==='G-CIRC'){quantity=op(ops,'mul',2*radius,3.14,2*radius*3.14);unit='centimetres';material='decorative edging';}
  else {const square=op(ops,'mul',radius,radius,radius*radius);quantity=op(ops,'mul',square,3.14,square*3.14);}
  one=`circular ${scene.round.slice(2)}`;
  description=`Each ${one} has a ${skill==='G-CIRC'?'diameter of '+2*radius:'radius of '+radius} cm. ${skill==='G-CIRC'?'Put edging all the way around it, with no overlap.':'Cover just one side.'} Use π = 3.14.`;
  backwardKnown=`Each ${one} is the same size. ${skill==='G-CIRC'?'Put edging all the way around it, with no overlap.':'Cover just one side.'} Use π = 3.14.`;
  backwardAsk=skill==='G-CIRC'?'What is the diameter of each circle':'What is the radius of each circle';backwardResult=skill==='G-CIRC'?2*radius:radius;
  inverse=each=>({op:skill==='G-CIRC'?'div':'circle-radius',a:each,b:3.14,result:skill==='G-CIRC'?each/3.14:Math.sqrt(each/3.14)});
  svg=diagram('circle',[2*radius]);
 } else if(skill==='G-VOL') {
  const base=op(ops,'mul',l,w,l*w);quantity=op(ops,'mul',base,h,base*h);unit='cubic centimetres';material='modelling clay';one=`solid rectangular ${scene.solid.slice(2)}`;
  description=`Each ${one} is ${l} cm long, ${w} cm wide and ${h} cm high. Make each solid block from clay with no gaps.`;
  backwardKnown=`Each solid rectangular ${scene.solid.slice(2)} is ${l} cm long and ${w} cm wide. Its height is unknown. Make each solid block from clay with no gaps.`;backwardAsk='What is the height of each block';backwardResult=h;inverse=each=>({op:'rectangular-prism-height',a:each,b:[l,w],result:each/(l*w)});
 }
 return {quantity,description,unit,material,one,count,operations:ops,dimensions,backwardKnown,backwardAsk,backwardResult,inverse,svg};
}
function quantitySteps(m) {
 const d=m.dimensions;
 return m.operations.map((x,i)=>{
  const result=F(x.result);
  if(x.op==='perimeter')return `Find the edging for one rectangle: 2 × (${d.l} + ${d.w}) = ${result} centimetres.`;
  if(x.op==='triangle-area')return `Find one triangle’s area: ${d.b} × ${d.h} ÷ 2 = ${result} square centimetres.`;
  if(x.op==='subtract-rectangle')return `Remove the corner from that area: ${F(x.a)} − (${d.cutW} × ${d.cutH}) = ${result} square centimetres.`;
  if(x.op==='scale-area')return `Use that original area and the square of the length factor: ${F(x.a)} × ${d.scale}² = ${result} square centimetres for one enlarged copy.`;
  if(d.radius&&m.unit==='centimetres')return `Find the circumference of one circle: 3.14 × ${d.radius*2} = ${result} centimetres.`;
  if(d.radius&&i===0)return `Square the radius: ${d.radius} × ${d.radius} = ${result}.`;
  if(d.radius)return `Multiply that squared radius by 3.14: ${F(x.a)} × 3.14 = ${result} square centimetres per circle.`;
  if(d.edge&&i===0)return `Find the area of one square face: ${d.edge} × ${d.edge} = ${result} square centimetres.`;
  if(d.edge)return `The six faces use that same area: ${F(x.a)} × 6 = ${result} square centimetres per cube.`;
  if(d.mapLength)return `Use the scale for one journey: ${d.mapLength} × ${d.scale} = ${result} metres.`;
  if(m.unit==='cubic centimetres'&&i===0)return `Find the base area: ${d.l} × ${d.w} = ${result} square centimetres.`;
  if(m.unit==='cubic centimetres')return `Use that base area through ${d.h} cm of height: ${F(x.a)} × ${d.h} = ${result} cubic centimetres per block.`;
  return `Find ${d.scale?'the original area':'the area of one piece'}: ${F(x.a)} × ${F(x.b)} = ${result} square centimetres.`;
 });
}
function backwardStep(m,each,result) {
 const d=m.dimensions;
 if(m.inverse(each).op==='rectangle-width')return `Half that perimeter gives length + width. Width = ${F(each)} ÷ 2 − ${d.l} = ${F(result)} centimetres.`;
 if(m.inverse(each).op==='triangle-height')return `Use that triangle area to find the perpendicular height: 2 × ${F(each)} ÷ ${d.b} = ${F(result)} centimetres.`;
 if(m.inverse(each).op==='rectangle-cutout')return `Compare that remaining area with the full rectangle: (${d.l} × ${d.w}) − ${F(each)} = ${F(result)} square centimetres removed.`;
 if(d.edge)return `Share that surface area among the six equal faces: ${F(each)} ÷ 6 = ${F(result)} square centimetres per face.`;
 if(d.scale&&!d.mapLength)return `Undo the area enlargement: ${F(each)} ÷ ${d.scale}² = ${F(result)} square centimetres.`;
 if(d.mapLength)return `Undo the map scale: ${F(each)} ÷ ${d.scale} = ${F(result)} centimetres on the map.`;
 if(d.radius&&m.unit==='centimetres')return `Undo circumference = 3.14 × diameter: ${F(each)} ÷ 3.14 = ${F(result)} centimetres.`;
 if(d.radius)return `Undo A = 3.14 × r²: r² = ${F(each)} ÷ 3.14 = ${d.radius*d.radius}, so r = ${F(result)} centimetres.`;
 if(m.unit==='cubic centimetres')return `Use that volume and the base dimensions: ${F(each)} ÷ (${d.l} × ${d.w}) = ${F(result)} centimetres high.`;
 return `Divide that area by the base: ${F(each)} ÷ ${d.b} = ${F(result)} centimetres high.`;
}
export function generateStoryGeometry(skill,seed,{difficulty=1,scenarioId,storyShape}={}) {
 if(!storyGeometrySkills.includes(skill))throw new Error('Unknown geometry story skill '+skill);
 const r=rng(`story-geometry:${skill}:${seed}:${difficulty}`),scene=sceneMap.get(scenarioId??r.pick(SCENES)[0]);
 if(!scene)throw new Error('Unknown geometry story scenario '+scenarioId);
 const shape=storyShape??r.pick(SHAPES);if(!SHAPES.includes(shape))throw new Error('Unknown story shape '+shape);
 const who=r.pick(['Maya','Leo','Nora','Ari','Zoe','Omar','Isha','Ben']);
 const m=model(skill,r,difficulty,scene),left=r.int(12,60),used=n(m.quantity*m.count),stock=n(used+left);
 let prompt,answer,unit=m.unit,solution,operations=m.operations.map(x=>({...x})),choiceLabels,answerChoice;
 const inputs={count:m.count,supply:stock,left};
 const intro=`${who} is preparing ${scene.project}. `;
 if(shape==='backward') {
  operations=[];
  const amount=op(operations,'sub',stock,left,stock-left),each=op(operations,'div',amount,m.count,amount/m.count),last=m.inverse(each);operations.push({...last,result:n(last.result)});answer=m.backwardResult;
  unit=['G-COMP','G-SA','P-SCALE'].includes(skill)?'square centimetres':'centimetres';
  prompt=intro+m.backwardKnown+' '+(skill==='P-MAP'?`${who}'s travel goal is ${F(stock)} metres altogether. After ${m.count} one-way journeys, ${left} more metres are needed to reach the goal.`:`${who} makes ${m.count} identical pieces. A supply of ${F(stock)} ${m.unit} of ${m.material} has ${left} ${m.unit} left afterward. None is wasted.`)+` ${m.backwardAsk}? Include ${unit} in your answer.`;
  solution=[`Work backward from what remains: ${F(stock)} − ${left} = ${F(amount)} ${m.unit} used.`,`Share that used amount among ${m.count} identical ${skill==='P-MAP'?'journeys':'pieces'}: ${F(amount)} ÷ ${m.count} = ${F(each)} ${m.unit} each.`,backwardStep(m,each,answer)];
 } else if(shape==='compare'&&skill==='P-MAP') {
  const gap=r.int(3,Math.max(4,Math.floor(m.quantity/3))),aBetter=r.int(0,1)===0,other=n(m.quantity+(aBetter?gap:-Math.min(gap,Math.max(1,Math.floor(m.quantity/2)))));
  Object.assign(inputs,{rate:1,costB:other});answer=n(Math.abs(m.quantity-other));unit='metres';answerChoice=aBetter?'A':'B';choiceLabels={A:'Route A: the map route',B:'Route B: the alternative route'};
  prompt=intro+m.description+` Route A follows that map route. An alternative route B is ${F(other)} metres long. Which route is shorter, and by how much? Answer A or B and the difference in metres.`;
  op(operations,'sub',Math.max(m.quantity,other),Math.min(m.quantity,other),answer);
  solution=[...quantitySteps(m),`Compare Route A’s ${F(m.quantity)} metres with Route B’s ${F(other)} metres: ${F(Math.max(m.quantity,other))} − ${F(Math.min(m.quantity,other))} = ${F(answer)} metres. Route ${answerChoice} is shorter by ${F(answer)} metres.`];
 } else if(shape==='compare') {
  const rate=skill==='G-CIRC'?5*r.int(1,3):skill==='G-CAREA'?2*r.int(1,3):r.int(2,5),costA=n(m.quantity*rate),gap=r.int(3,25),aBetter=r.int(0,1)===0,costB=n(costA+(aBetter?gap:-Math.min(gap,Math.floor(costA/2))));
  Object.assign(inputs,{rate,costB});
  const actualGap=n(Math.abs(costA-costB));answer=actualGap;unit='cents';answerChoice=aBetter?'A':'B';choiceLabels={A:'Pay by the amount used',B:'Pay one fixed price'};
  prompt=intro+m.description+` ${who} needs enough ${skill==='P-MAP'?'travel credit for exactly one journey':m.material+' for exactly one piece'}. Option A costs ${rate} cents per ${m.unit.replace(/s$/,'')}. Option B costs ${F(costB)} cents altogether for exactly the same amount. Which option is cheaper, and by how much? Answer A or B and the saving in cents.`;
  op(operations,'mul',m.quantity,rate,costA);op(operations,'sub',Math.max(costA,costB),Math.min(costA,costB),actualGap);
  solution=[...quantitySteps(m),`Use that amount for Option A: ${F(m.quantity)} × ${rate} = ${F(costA)} cents. Option B’s fixed price is ${F(costB)} cents.`,`Compare those costs: ${F(Math.max(costA,costB))} − ${F(Math.min(costA,costB))} = ${F(actualGap)} cents. Option ${answerChoice} is cheaper by ${F(actualGap)} cents.`];
 } else {
  const count=shape==='what-if'?m.count+r.int(1,3):m.count,needed=n(m.quantity*count),supply=shape==='what-if'?n(needed+left):stock;
  Object.assign(inputs,{count,supply});
  answer=op(operations,'mul',m.quantity,count,needed);answer=op(operations,'sub',supply,needed,supply-needed);
  const start=skill==='P-MAP'?`${who}'s goal is to cover ${F(supply)} metres altogether while checking this route.`:`${who} has ${F(supply)} ${m.unit} of ${m.material}. None is wasted.`;
  const task=skill==='P-MAP'?`After ${count} one-way journeys, how many more metres are needed to reach the goal?`:`How much ${m.material} remains after making ${count} identical pieces?`;
  let special='';
  if(shape==='what-if')special=skill==='P-MAP'?`${who} first planned ${m.count} journeys. What if the plan changes to ${count} journeys instead? `:`${who} first planned ${m.count} pieces. What if ${count} pieces are made instead? `;
  if(shape==='mistake')special=`A friend subtracts the amount for only one ${skill==='P-MAP'?'journey':'piece'} and reports ${F(supply-m.quantity)} ${m.unit} left. Find and fix this mistake. `;
  prompt=intro+m.description+' '+start+' '+special+task+` Include ${unit} in your answer.`;
  solution=[...quantitySteps(m),`Use the result for all ${count} ${skill==='P-MAP'?'journeys':'pieces'}: ${F(m.quantity)} × ${count} = ${F(needed)} ${m.unit}.${shape==='mistake'?' The friend counted only one; every piece or journey must be included.':''}`,`Subtract that total from the ${skill==='P-MAP'?'travel goal':'supply'}: ${F(supply)} − ${F(needed)} = ${F(answer)} ${m.unit} ${skill==='P-MAP'?'still needed':'left'}.`];
 }
 const hints=[{answer:F(Number(answer)+1),text:'Check the unit and the subtraction in your final step.'},{answer:F(Number(answer)+m.quantity),text:'Use the amount for every piece or journey, not just one.'},{answer:F(Number(answer)+2*m.quantity+1),text:'First find the geometric measure, then use it in the story.'}];
 const hint=shape==='backward'?'Start with the original supply minus what is left. That tells you the amount used.':skill==='P-MAP'?'First multiply the map length by the scale to find one real journey.':skill==='G-PERIM'?'First find the full perimeter of one rectangle: twice its length plus twice its width.':skill==='G-TRI'?'First find one triangle’s area: base times perpendicular height, divided by two.':skill==='G-SA'?'First find the area of one square face, then use all six faces.':'First find the required measure of one piece. Keep that result for the next step.';
 return makeQuestion({skill,seed,shape:'story-'+shape,story:true,scenarioId:scene.id,storyShape:shape,stepCount:solution.length,answer:F(answer),answerUnit:unit,unitAliases:aliases(unit),answerChoice,choiceLabels,prompt:`<p>${escapeHTML(prompt)}</p>`,plainPrompt:prompt,solution,hint,hints,numbers:prompt.match(/\d+(?:\.\d+)?/g)??[],svg:shape==='backward'?undefined:m.svg,verification:{kind:'multi-step-geometry',skill,dimensions:m.dimensions,quantity:m.quantity,inputs,operations,answer:F(answer)}});
}
