import { rng, name, makeQuestion, escapeHTML } from './common.mjs';
import { rational, parseNumber, add, sub, mul, div, format, fraction, eq } from '../math.mjs';

export const foundationStatisticsSkills = ['S-LINEPLOT','S-PROB','S-SAMPLE'];
const SHAPES = ['missing','compare','backward','mistake','what-if'];
const scenes = [
 ['bake-sale','the school bake sale','ribbon for cake boxes','cupcake tokens','bread tokens','bake-sale visitors','cookies'],
 ['bike-trip','the cycling-club trip','reflective strips for bike bags','hill-route cards','flat-route cards','cycling-club riders','fruit bars'],
 ['school-garden','the school garden','string for plant markers','bean cards','carrot cards','garden-club members','seedlings'],
 ['game-quest','a video-game quest','bridge material in the game','emerald cards','quartz cards','game players','avatar badges'],
 ['science-fair','the science fair','model-car track','rocket cards','planet cards','science-fair visitors','stickers'],
 ['animal-shelter','the animal shelter','soft straps for pet toys','dog cards','cat cards','shelter volunteers','notebooks'],
 ['art-club','art club','ribbon for bookmarks','red beads','blue beads','art-club members','craft kits'],
 ['school-play','the school play','fabric strips for costumes','comedy cards','music cards','audience members','programmes'],
 ['library-challenge','the library reading challenge','ribbon for reading badges','mystery cards','adventure cards','reading-challenge students','bookmarks'],
 ['sports-day','school sports day','ribbon for medals','relay cards','jump cards','sports-day spectators','water bottles'],
 ['aquarium','the aquarium-club project','tubing for model tanks','fish cards','shell cards','aquarium-club visitors','stickers'],
 ['space-camp','space camp','cord for model landers','moon cards','Mars cards','space-camp students','mission patches'],
 ['music-club','music club','ribbon for concert badges','drum cards','piano cards','music-night guests','programmes'],
 ['beach-cleanup','the beach cleanup','reusable ties for sorting sacks','beach cards','park cards','cleanup volunteers','glove pairs'],
 ['school-cafe','the school cafe','ribbon for fruit-cup gift packs','apple cards','pear cards','school-cafe customers','apple cups'],
 ['robot-club','robot club','wire for model robots','sensor cards','motor cards','robot-show visitors','stickers']
].map(([id,place,material,good,other,population,item])=>({id,place,material,good,other,population,item}));
export function foundationStatisticsScenarios(skill) {
 if(!foundationStatisticsSkills.includes(skill))throw new Error('Unknown foundation statistics skill '+skill);
 return scenes.map(s=>s.id);
}
const R = value => typeof value==='object'?value:parseNumber(String(value));
const F = value => format(R(value));
const op = (kind,a,b,result) => ({op:kind,a:typeof a==='object'&&!Array.isArray(a)?F(a):a,b:typeof b==='object'&&!Array.isArray(b)?F(b):b,result:F(result)});
const sum = xs => xs.reduce((a,b)=>add(a,b),rational(0));
const aliases = unit => unit==='mission patches'?['mission patch','patches','patch']:unit==='programmes'?['programme','programs','program']:unit==='metres'?['metre','meters','meter','m']:unit==='percent'?['%','per cent']:unit==='successful draws'?['successful draw','successes','success']:unit==='yes responses'?['yes response','responses','response']:[unit.endsWith('s')?unit.slice(0,-1):unit];
const n = value => Number(F(value));
function linePlot(values,counts,unit) {
 const labels=values.map(v=>fraction(R(v))), high=Math.max(...counts),bottom=55+high*25;
 let body='<path d="M45 '+bottom+'H535" stroke="#4c5d83" stroke-width="2"/>';
 values.forEach((v,index)=>{
  const x=90+index*200;
  body+='<path d="M'+x+' '+bottom+'v7" stroke="#4c5d83"/><text x="'+x+'" y="'+(bottom+31)+'" text-anchor="middle" fill="#243654" font-size="17">'+escapeHTML(labels[index])+'</text>';
  for(let i=0;i<counts[index];i++)body+='<path data-mark="measurement" d="M'+(x-7)+' '+(bottom-19-i*25-7)+'l14 14m-14 0l14-14" stroke="#7653bd" stroke-width="3" stroke-linecap="round"/>';
 });
 const desc=labels.map((v,i)=>counts[i]+' pieces of '+v+' '+unit).join('; ');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 '+(bottom+76)+'" role="img" aria-label="'+escapeHTML('Line plot: '+desc+'. Each X is one measured piece.')+'"><title>Fractional lengths on a line plot</title><desc>'+escapeHTML(desc)+'</desc><text x="290" y="25" text-anchor="middle" fill="#243654" font-size="16">Each X = one piece</text>'+body+'<text x="290" y="'+(bottom+61)+'" text-anchor="middle" fill="#243654" font-size="15">'+unit+'</text></svg>';
}
function tallyDiagram(good,total,goodLabel,otherLabel) {
 const width=460,part=width*good/total;
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 130" role="img" aria-label="'+escapeHTML(good+' '+goodLabel+' out of '+total+' equally likely items; '+(total-good)+' '+otherLabel)+'"><title>Two kinds of equally likely items</title><rect x="50" y="35" width="'+part+'" height="32" fill="#8865cb"/><rect x="'+(50+part)+'" y="35" width="'+(width-part)+'" height="32" fill="#f4ac61"/><text x="50" y="25" fill="#243654" font-size="16">'+escapeHTML(good+' '+goodLabel)+'</text><text x="50" y="96" fill="#243654" font-size="16">'+escapeHTML((total-good)+' '+otherLabel+'; '+total+' items altogether')+'</text></svg>';
}

export function generateFoundationStatistics(skill,seed,{mode,shape:requestedWarmShape,scenarioId,storyShape,difficulty=1}={}) {
 if(!foundationStatisticsSkills.includes(skill))throw new Error('Unknown foundation statistics skill '+skill);
 if(![1,2,3].includes(difficulty))throw new Error('Choose difficulty 1, 2 or 3.');
 const story=mode==='story',r=rng('foundation-statistics:'+skill+':'+seed+':'+difficulty),scene=scenarioId?scenes.find(s=>s.id===scenarioId):r.pick(scenes);
 if(!scene)throw new Error('Unknown foundation statistics scene '+scenarioId);
 const shape=story?(storyShape??r.pick(SHAPES)):(requestedWarmShape??r.pick(['calculation','missing']));
 if(!(story?SHAPES:['calculation','missing']).includes(shape))throw new Error('Unknown foundation statistics shape '+shape);
 const who=name(r),other=who==='Maya'?'Leo':'Maya',intro=who+' is helping with '+scene.place+'.';
 let body='',answer,answerUnit,answerChoice,choiceLabels,svg,hint,inputs={},solution=[],operations=[],candidates=[];
 const step=(text,operation)=>{solution.push(text);operations.push(operation);};
 const conclude=(value,unit)=>{answer=R(value);answerUnit=unit;};
 const compare=(a,b,unit,labelA,labelB)=>{
  answerChoice=n(a)>n(b)?'A':'B';choiceLabels={A:labelA,B:labelB};
  const greater=n(a)>n(b)?R(a):R(b),smaller=n(a)>n(b)?R(b):R(a),difference=sub(greater,smaller);
  step('Option '+answerChoice+' has the larger '+(skill==='S-LINEPLOT'?'total':'estimate')+'. Subtract: '+F(greater)+' − '+F(smaller)+' = '+F(difference)+' '+unit+'.',op('sub',greater,smaller,difference));
  conclude(difference,unit);
 };

 if(skill==='S-LINEPLOT') {
  const denominator=r.pick(difficulty===1?[4]:[4,8]),start=r.int(1,denominator-2),values=[start,start+1,start+2].map(x=>rational(x,denominator)),counts=[r.int(1,4),r.int(1,4),r.int(1,4)];
  const products=values.map((v,i)=>mul(v,counts[i])),total=sum(products),reserve=rational(r.int(2,16),denominator),stock=add(total,reserve),used=values[0],factor=r.int(2,4),dotCount=counts.reduce((a,b)=>a+b,0),numeratorTotal=counts.reduce((a,c,i)=>a+c*(start+i),0);
  inputs={denominator,start,values:values.map(F),counts,total:F(total),reserve:F(reserve),stock:F(stock),used:F(used),factor};
  svg=linePlot(values,counts,'metres');
  hint='Every X represents one piece. Multiply each fractional length by its number of X marks, then add the lengths before using the total in the story.';
  body='The line plot shows the lengths of pieces of '+scene.material+'. Each X represents one piece. ';
  const collect=()=>{
   step('Add the lengths of all the pieces: '+counts.map((c,i)=>c+' × '+fraction(values[i])).join(' + ')+' = '+F(total)+' metres.',{op:'weightedSum',a:values.map(F),b:counts,result:F(total)});
  };
  if(!story){
   collect();body+=shape==='missing'?'Complete the total: the pieces have a combined length of ___ metres.':'What is the combined length of all the pieces?';conclude(total,'metres');
  }else if(shape==='backward'){
   body+=who+' cut all these pieces from one roll. The roll has '+F(reserve)+' metres left. Work backward to find the original length of the roll.';
   collect();const original=add(total,reserve);step('Put the cut pieces back together with the leftover roll: '+F(total)+' + '+F(reserve)+' = '+F(original)+' metres originally.',op('add',total,reserve,original));conclude(original,'metres');
  }else if(shape==='compare'){
   const b=r.int(0,1)?add(total,used):sub(total,used);inputs.reference=F(b);
   body+='Collection A contains the pieces shown. Collection B has '+F(b)+' metres of the same material. Which collection provides more material, and by how much?';
   collect();compare(total,b,'metres','pieces in the line plot','second material collection');
  }else if(shape==='mistake'){
   body+=other+' counts lengths in units of 1/'+denominator+' metre, but treats each of those units as a whole metre and reports '+numeratorTotal+' metres. Correct this mistake, then find how much remains after '+who+' uses '+F(used)+' metres for a repair.';
   collect();const remaining=sub(total,used);step('The numerators must still be divided by '+denominator+'. Use the corrected total: '+F(total)+' − '+F(used)+' = '+F(remaining)+' metres remain.',op('sub',total,used,remaining));conclude(remaining,'metres');
  }else if(shape==='what-if'){
   body+='What if '+who+' makes '+factor+' identical collections of these pieces, then uses '+F(used)+' metres for a repair? How much material remains?';
   collect();const scaled=mul(total,factor);step('Use the measured total for all '+factor+' collections: '+F(total)+' × '+factor+' = '+F(scaled)+' metres.',op('mul',total,factor,scaled));const remaining=sub(scaled,used);step('Subtract the repair material: '+F(scaled)+' − '+F(used)+' = '+F(remaining)+' metres remain.',op('sub',scaled,used,remaining));conclude(remaining,'metres');
  }else{
   body+=who+' starts with '+F(stock)+' metres and cuts the pieces shown. How many metres are left?';
   collect();const remaining=sub(stock,total);step('Subtract the combined cut length from the starting supply: '+F(stock)+' − '+F(total)+' = '+F(remaining)+' metres remain.',op('sub',stock,total,remaining));conclude(remaining,'metres');
  }
  candidates=[{answer:String(dotCount),text:'Counting X marks gives the number of pieces, not their total length.'},{answer:String(numeratorTotal),text:'A fractional length is its numerator divided by its denominator; do not treat the numerator as whole metres.'},{answer:F(total),text:'The combined length is an intermediate result. Check whether the story also asks you to add, subtract or compare.'},{answer:F(products[0]),text:'Include the pieces at every labelled length, not just the first group.'}];
 } else if(skill==='S-PROB') {
  const baseTotal=r.pick([4,8,10,20]),copies=r.int(1,difficulty===1?8:16),total=baseTotal*copies,half=total/2,good=(shape==='what-if'?r.int(1,baseTotal/2-1):r.int(1,baseTotal-1))*copies,others=total-good,multiplier=r.int(3,18),trials=total*multiplier,p=div(good,total),percent=mul(p,100),expected=mul(p,trials),earlier=total*r.int(1,multiplier-1);
  inputs={total,good,others,trials,earlier,baseTotal,copies};svg=tallyDiagram(good,total,scene.good,scene.other);
  hint='Probability is favourable items divided by all equally likely items. For repeated draws with replacement, multiply that probability by the number of draws to get an expected count, not a guarantee.';
  const replacement='Each item is equally likely. After every draw, the item is replaced and the container is mixed again. ';
  const drawing='Drawing one of the '+scene.good+' is a success. ';
  if(!story&&shape==='calculation'){
   body='A container has '+good+' '+scene.good+' among '+total+' items. '+replacement+drawing+'What is the probability of success, in percent (%)?';
   step('Divide favourable items by all items: '+good+' ÷ '+total+' = '+F(p)+'.',op('div',good,total,p));step('Convert the probability to percent: '+F(p)+' × 100 = '+F(percent)+'%.',op('mul',p,100,percent));conclude(percent,'percent');
  }else if(story&&shape==='compare'){
   const bGood=good===copies?good+copies:good===total-copies?good-copies:good+(r.int(0,1)?copies:-copies),bP=div(bGood,total),bPercent=mul(bP,100),bExpected=mul(bP,trials);inputs.bGood=bGood;
   body='Game A uses a container with '+good+' '+scene.good+' among '+total+' items. '+replacement+drawing+'Game B gives a '+F(bPercent)+'% chance of success on each independent draw. A computer simulates '+trials+' draws in each game. Which game has the larger expected number of successes, and by how many? These are averages over repeated experiments, not promised results.';
   step('Game A has success probability '+good+' ÷ '+total+' = '+F(p)+'.',op('div',good,total,p));step('Game A expects '+trials+' × '+F(p)+' = '+F(expected)+' successful draws.',op('mul',trials,p,expected));step('Game B expects '+trials+' × '+F(bP)+' = '+F(bExpected)+' successful draws because '+F(bPercent)+'% = '+F(bP)+'.',op('mul',trials,bP,bExpected));compare(expected,bExpected,'successful draws','Game A','Game B');
  }else if(story&&shape==='backward'){
   body='A container has '+good+' '+scene.good+' among '+total+' items. '+replacement+drawing+who+' plans a whole session with an expected '+F(expected)+' successful draws. The first '+earlier+' draws of that plan are finished. Work backward to find how many draws remain in the plan. The actual number of successes can differ from its expected value.';
   step('Find the chance on each draw: '+good+' ÷ '+total+' = '+F(p)+'.',op('div',good,total,p));const planned=div(expected,p);step('Undo expected count = draws × probability: '+F(expected)+' ÷ '+F(p)+' = '+F(planned)+' planned draws.',op('div',expected,p,planned));const left=sub(planned,earlier);step('Remove the draws already completed: '+F(planned)+' − '+earlier+' = '+F(left)+' draws remain.',op('sub',planned,earlier,left));conclude(left,'draws');
  }else if(story&&shape==='what-if'){
   const removed=half,newTotal=total-removed,newP=div(good,newTotal),newExpected=mul(trials,newP);inputs.removed=removed;
   body='A container has '+good+' '+scene.good+' and '+others+' '+scene.other+'. '+drawing+'What if '+who+' removes '+removed+' of the '+scene.other+' before a computer simulates '+trials+' draws? All remaining items are equally likely; each drawn item is replaced before the next draw. Estimate the number of successful draws; random results can vary.';
   step('Count the original items: '+good+' + '+others+' = '+total+' items.',op('add',good,others,total));step('Find how many items remain: '+total+' − '+removed+' = '+newTotal+' items.',op('sub',total,removed,newTotal));step('The number of favourable items stays '+good+', so the new probability is '+good+' ÷ '+newTotal+' = '+F(newP)+'.',op('div',good,newTotal,newP));step('Multiply the new probability by the trial count: '+trials+' × '+F(newP)+' = '+F(newExpected)+' expected successful draws.',op('mul',trials,newP,newExpected));conclude(newExpected,'successful draws');
  }else{
   body='A container has '+good+' '+scene.good+' and '+others+' '+scene.other+'. '+replacement+drawing+'A computer simulates '+trials+' draws. ';
   step('Count all possible items: '+good+' + '+others+' = '+total+' items.',op('add',good,others,total));step('Find success probability: '+good+' ÷ '+total+' = '+F(p)+'.',op('div',good,total,p));step('Multiply by the number of trials: '+trials+' × '+F(p)+' = '+F(expected)+' expected successful draws.',op('mul',trials,p,expected));
   if(story&&shape==='mistake'){
    const wrong=good*trials;inputs.wrong=wrong;body+=other+' multiplies '+trials+' by '+good+' instead of by the probability and predicts '+wrong+' successes. Find the correct expected count, then find how much too high that prediction is. Actual random results can differ.';
    const excess=sub(wrong,expected);step('The probability must be no more than 1. The prediction is '+wrong+' − '+F(expected)+' = '+F(excess)+' successful draws too high; actual random outcomes can vary.',op('sub',wrong,expected,excess));conclude(excess,'successful draws');
   }else{body+=shape==='missing'&&!story?'Complete the expected result: ___ successful draws.':'About how many successful draws should the simulation average?';body+=' This expected count is not a guaranteed result.';conclude(expected,'successful draws');}
  }
  candidates=[{answer:String(good*trials),text:'The multiplier must be a probability between 0 and 1, not the raw number of favourable items.'},{answer:String(good),text:'The favourable-item count describes the container. Convert it to a probability before predicting repeated draws.'},{answer:F(percent),text:'A percent and a predicted count are different quantities. Check the unit requested.'},{answer:String(trials),text:'Not every draw is a success. Use the fraction of favourable items.'}];
 } else {
  const sampleSize=r.pick([20,25,40,50]),yes=r.int(2,sampleSize-2),population=(sampleSize===40?200:100)*r.int(2,10),rate=div(yes,sampleSize),estimate=mul(rate,population),buffer=r.int(3,22),stock=r.int(1,Math.max(2,n(estimate)-1)),factor=r.int(2,3);
  inputs={sampleSize,yes,population,buffer,stock,factor};answerUnit=scene.item;
  hint='A random sample gives an estimate for its population. Divide the yes responses by the sample size, scale to the population, then complete the planning step. The estimate is not a guarantee.';
  const random='The sample is selected randomly from all '+population+' '+scene.population+'. Each interested person would need one item. ';
  const sample='In a sample of '+sampleSize+' people, '+yes+' want the offered '+scene.item+'. ';
  const estimateStep=()=>{step('Find the fraction of yes responses: '+yes+' ÷ '+sampleSize+' = '+F(rate)+'.',op('div',yes,sampleSize,rate));step('Scale that fraction to the population: '+population+' × '+F(rate)+' = '+F(estimate)+' estimated '+scene.item+'.',op('mul',population,rate,estimate));};
  if(!story&&shape==='calculation'){
   body=random+sample+'Estimate how many '+scene.item+' the whole group would request. Actual demand may differ.';estimateStep();conclude(estimate,scene.item);
  }else if(story&&shape==='compare'){
   const bYes=yes+(r.int(0,1)?1:-1),difference=Math.abs(yes-bYes),gapRate=div(difference,sampleSize),gap=mul(gapRate,population);inputs.bYes=bYes;
   answerChoice=yes>bYes?'A':'B';choiceLabels={A:'design A',B:'design B'};
   body=who+' is comparing two designs of '+scene.item+' for '+population+' '+scene.population+'. Separate random samples from this same population each have '+sampleSize+' people. '+yes+' people in the first sample want design A; '+bYes+' in the second want design B. Based on these samples, which design should '+who+' prepare more of, and by how many '+scene.item+'? Treat both results as estimates; sampling variation can change the outcome.';
   step('The samples have equal sizes. Design '+answerChoice+' has '+Math.max(yes,bYes)+' − '+Math.min(yes,bYes)+' = '+difference+' more yes '+(difference===1?'response.':'responses.'),op('sub',Math.max(yes,bYes),Math.min(yes,bYes),difference));step('Convert that sample difference to a fraction: '+difference+' ÷ '+sampleSize+' = '+F(gapRate)+'.',op('div',difference,sampleSize,gapRate));step('Scale the difference to the population: '+population+' × '+F(gapRate)+' = '+F(gap)+' more estimated '+scene.item+' for design '+answerChoice+'.',op('mul',population,gapRate,gap));conclude(gap,scene.item);
  }else if((story&&shape==='backward')||(!story&&shape==='missing')){
   const planned=add(estimate,buffer);inputs.planned=F(planned);
   body=who+' used a random sample of '+sampleSize+' people from all '+population+' '+scene.population+' to plan '+F(planned)+' '+scene.item+'. That plan includes '+buffer+' extra items beyond the sample-based estimate. Each interested person would need one item. Work backward to find the number of yes responses in the sample. This plan estimates demand; it cannot guarantee it.';
   step('Remove the extra items to recover estimated demand: '+F(planned)+' − '+buffer+' = '+F(estimate)+' '+scene.item+'.',op('sub',planned,buffer,estimate));step('Undo population scaling: '+F(estimate)+' ÷ '+population+' = '+F(rate)+', the sample fraction.',op('div',estimate,population,rate));step('Apply that fraction to the sample: '+F(rate)+' × '+sampleSize+' = '+yes+' yes responses.',op('mul',rate,sampleSize,yes));conclude(yes,'yes responses');
  }else if(story&&shape==='mistake'){
   const wrong=mul(population,div(yes,100));inputs.wrong=F(wrong);
   body=random+sample+other+' treats '+yes+' yes responses as '+yes+'%, even though the sample does not contain 100 people, and prepares '+F(wrong)+' '+scene.item+'. Correct the estimated demand, then find how many more '+scene.item+' are needed to reach that estimate. Actual demand may differ.';
   estimateStep();const short=sub(estimate,wrong);step('Use sample size '+sampleSize+' as the denominator. The extra amount needed is '+F(estimate)+' − '+F(wrong)+' = '+F(short)+' '+scene.item+'.',op('sub',estimate,wrong,short));conclude(short,scene.item);
  }else if(story&&shape==='what-if'){
   const newPopulation=population*factor,newEstimate=mul(rate,newPopulation);inputs.newPopulation=newPopulation;
   body=random+sample+'What if the number of '+scene.population+' grows to '+newPopulation+' and the same preference rate is used? Estimate demand, then add '+buffer+' spare '+scene.item+' to the order. How many should '+who+' order? The new estimate assumes similar preferences and may differ from actual demand.';
   step('Find the sample fraction: '+yes+' ÷ '+sampleSize+' = '+F(rate)+'.',op('div',yes,sampleSize,rate));step('Apply it to the larger population: '+newPopulation+' × '+F(rate)+' = '+F(newEstimate)+' estimated '+scene.item+'.',op('mul',newPopulation,rate,newEstimate));const ordered=add(newEstimate,buffer);step('Add the spare items: '+F(newEstimate)+' + '+buffer+' = '+F(ordered)+' '+scene.item+' to order.',op('add',newEstimate,buffer,ordered));conclude(ordered,scene.item);
  }else{
   body=random+sample+who+' already has '+stock+' '+scene.item+'. Estimate how many more are needed for the group. Actual demand may differ.';
   estimateStep();const extra=sub(estimate,stock);step('Subtract the items already available: '+F(estimate)+' − '+stock+' = '+F(extra)+' more '+scene.item+' needed.',op('sub',estimate,stock,extra));conclude(extra,scene.item);
  }
  candidates=[{answer:String(yes),text:'The sample count is only part of the population. Scale the sample fraction before answering the planning question.'},{answer:F(mul(population,div(yes,100))),text:'The number of yes responses is not automatically a percent. Divide by the actual sample size.'},{answer:F(estimate),text:'After estimating demand, check whether the story requires spare items, existing stock, or a difference.'},{answer:String(population),text:'The sample does not say everyone wants an item. Use the yes-response fraction.'}];
 }
 const answerText=F(answer),usedHints=new Set([answerText]),hints=[];
 for(const candidate of candidates){const value=R(candidate.answer);if(!value||[...usedHints].some(old=>eq(R(old),value)))continue;usedHints.add(F(value));hints.push({...candidate,answer:F(value)});if(hints.length===3)break;}
 for(let i=1;hints.length<3;i++){const value=add(answer,i);if([...usedHints].some(old=>eq(R(old),value)))continue;usedHints.add(F(value));hints.push({answer:F(value),text:'Use the result from the earlier calculation in the final step, and keep the requested units.'});}
 const ask=answerChoice?'Choose option A or B and include the difference in '+answerUnit+'.':'Write your answer in '+answerUnit+(answerUnit==='percent'?' (%)':'')+'.';
 const plainPrompt=intro+' '+body+' '+ask;
 if(story&&(solution.length<2||solution.length>4))throw new Error('A story must have2–4worked steps.');
 const numbers=[...plainPrompt.matchAll(/\d+(?:\.\d+)?(?:\/\d+)?/g)].map(m=>m[0]);
 if(skill==='S-LINEPLOT')numbers.push(...inputs.values,...inputs.counts.map(String));
 return makeQuestion({skill,seed,shape:story?'story-'+shape:shape,...(story?{story:true,scenarioId:scene.id,storyShape:shape,stepCount:solution.length}:{}),prompt:'<p>'+escapeHTML(intro)+'</p><p>'+escapeHTML(body)+'</p><p>'+escapeHTML(ask)+'</p>',plainPrompt,answer:answerText,answerUnit,unitAliases:aliases(answerUnit),...(answerChoice?{answerChoice,choiceLabels}:{}),svg,solution,hint,hints,numbers,verification:{kind:'foundation-statistics',skill,storyShape:shape,inputs,operations,answer:answerText}});
}
