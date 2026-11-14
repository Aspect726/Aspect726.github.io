import { rng, name, makeQuestion, escapeHTML } from './common.mjs';

export const storyStatisticsSkills = ['S-QUESTION','S-DISPLAY','S-MEAN','S-MEDIAN','S-CENTER','S-RANGE','S-IQR','S-BOX','S-MAD','S-SPREAD'];
const SHAPES = ['missing','compare','backward','mistake','what-if'];
// These IDs identify the actual scene across all skill families, not a name or a seed.
const scenes = [
 {id:'bake-sale',unit:'cupcakes',aliases:['cupcake'],setup:'helps run a school bake sale',observations:'cupcakes sold by each team',record:'team',goal:'cupcakes to prepare'},
 {id:'bike-trip',unit:'minutes',aliases:['minute','min'],setup:'plans a cycling-club trip',observations:'minutes taken by riders on the practice route',record:'rider',goal:'minutes to allow'},
 {id:'school-garden',unit:'centimetres',aliases:['centimetre','centimeters','centimeter','cm'],setup:'looks after the school garden',observations:'heights of seedlings in centimetres',record:'seedling',goal:'centimetres of growth'},
 {id:'game-quest',unit:'points',aliases:['point'],setup:'tests a new video-game quest',observations:'points earned by players in one round',record:'player',goal:'points to earn'},
 {id:'science-fair',unit:'centimetres',aliases:['centimetre','centimeters','centimeter','cm'],setup:'tests model rockets for the science fair',observations:'rocket flight heights in centimetres',record:'flight',goal:'centimetres of flight height'},
 {id:'animal-shelter',unit:'minutes',aliases:['minute','min'],setup:'helps schedule dog walks at an animal shelter',observations:'minutes spent on each dog walk',record:'walk',goal:'minutes of walking'},
 {id:'art-club',unit:'beads',aliases:['bead'],setup:'makes bracelets with the art club',observations:'beads used in each bracelet',record:'bracelet',goal:'beads to set aside'},
 {id:'school-play',unit:'minutes',aliases:['minute','min'],setup:'organizes rehearsals for the school play',observations:'minutes used by each rehearsal',record:'rehearsal',goal:'minutes to reserve'},
 {id:'library-challenge',unit:'pages',aliases:['page'],setup:'joins a library reading challenge',observations:'pages read by each reader in one evening',record:'reader',goal:'pages to read'},
 {id:'sports-day',unit:'metres',aliases:['metre','meters','meter','m'],setup:'organizes a throwing event for sports day',observations:'throwing distances in metres',record:'throw',goal:'metres of distance'},
 {id:'aquarium',unit:'centimetres',aliases:['centimetre','centimeters','centimeter','cm'],setup:'helps measure fish at the school aquarium',observations:'fish lengths in centimetres',record:'fish',goal:'centimetres of length'},
 {id:'space-camp',unit:'seconds',aliases:['second','sec','s'],setup:'times rover tasks at space camp',observations:'seconds needed for each rover task',record:'task',goal:'seconds to allow'},
 {id:'music-club',unit:'minutes',aliases:['minute','min'],setup:'organizes practice sessions for the music club',observations:'minutes spent in each practice session',record:'session',goal:'minutes to reserve'},
 {id:'beach-cleanup',unit:'bottles',aliases:['bottle'],setup:'helps with a beach cleanup',observations:'bottles collected by each team',record:'team',goal:'bottles to collect'},
 {id:'school-cafe',unit:'sandwiches',aliases:['sandwich'],setup:'helps plan lunches for the school cafe',observations:'sandwiches ordered by each class',record:'class',goal:'sandwiches to make'},
 {id:'robot-club',unit:'seconds',aliases:['second','sec','s'],setup:'tests robots with the robot club',observations:'seconds taken by each robot on an obstacle course',record:'robot',goal:'seconds to allow'}
];
export function statisticsStoryScenarios(skill) {
 if (!storyStatisticsSkills.includes(skill)) throw new Error(`Unknown statistics story skill ${skill}`);
 return scenes.map(scene=>scene.id);
}
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const sorted=xs=>[...xs].sort((a,b)=>a-b);
const mean=xs=>sum(xs)/xs.length;
const median=xs=>{const a=sorted(xs);return(a[(a.length-1)>>1]+a[a.length>>1])/2;};
const quartiles=xs=>{const a=sorted(xs);return{q1:median(a.slice(0,4)),q3:median(a.slice(4))};};
const mad=xs=>{const m=mean(xs);return mean(xs.map(x=>Math.abs(x-m)));};
const list=xs=>xs.join(', ');
const operation=(op,a,b,result)=>({op,a,b,result:String(result)});
const n=value=>String(Number(value));
const plural=(count,word)=>`${count} ${count===1?word:word==='fish'?'fish':word==='class'?'classes':word+'s'}`;

function boxDiagram(values,unit) {
 const a=sorted(values), {q1,q3}=quartiles(a), mid=median(a), minimum=a[0],maximum=a.at(-1);
 const x=v=>35+(v-minimum)/(maximum-minimum)*450;
 const labels=[minimum,q1,mid,q3,maximum];
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 205" role="img" aria-label="Box plot in ${escapeHTML(unit)}: minimum ${minimum}, lower quartile ${q1}, median ${mid}, upper quartile ${q3}, maximum ${maximum}."><title>Box plot of the measurements</title><g stroke="#345EC2" stroke-width="2" fill="none"><path d="M${x(minimum)} 70v40m0-20H${x(q1)}M${x(q3)} 90H${x(maximum)}m0-20v40"/><rect x="${x(q1)}" y="60" width="${x(q3)-x(q1)}" height="60" rx="4" fill="#EAF0FE"/><path d="M${x(mid)} 60v60M25 145H495"/></g>${labels.map((v,i)=>`<text x="${x(v)}" y="${i%2?185:166}" text-anchor="middle" fill="#21334F" font-family="sans-serif" font-size="15">${v}</text>`).join('')}<text x="260" y="24" text-anchor="middle" fill="#21334F" font-family="sans-serif" font-size="14">${escapeHTML(unit)}</text></svg>`;
}

export function generateStoryStatistics(skill, seed, {difficulty=1,scenarioId,storyShape}={}) {
 if (!storyStatisticsSkills.includes(skill)) throw new Error(`Unknown statistics story skill ${skill}`);
 if (storyShape && !SHAPES.includes(storyShape)) throw new Error(`Unknown statistics story shape ${storyShape}`);
 const r=rng(`stats-story:${skill}:${seed}`), scene=scenarioId?scenes.find(x=>x.id===scenarioId):r.pick(scenes);
 if (!scene) throw new Error(`Unknown statistics story scenario ${scenarioId}`);
 const shape=storyShape??r.pick(SHAPES), who=name(r), other=r.pick(['Isha','Ben','Theo','Lina']);
 const step=2*r.int(1,Math.max(1,Math.min(3,difficulty))), center=r.int(24,58)+4*step;
 const values=[-4,-3,-2,-1,1,2,3,4].map(x=>center+x*step), shown=r.shuffle(values);
 const {q1,q3}=quartiles(values), range=values.at(-1)-values[0], spread=q3-q1, deviation=mad(values);
 const delta=2*r.int(2,9), factor=r.int(2,4), target=r.int(3,6);
 const unit=scene.unit;
 let body='', solution=[], operations=[], answer, hint='', answerChoice, choiceLabels, answerUnit=unit, unitAliases=scene.aliases, svg;
 let inputs={values,scene:scene.id,center,step,delta,factor,target};
 const intro=`${who} ${scene.setup}.`;
 const data=`The ${scene.observations} are ${list(shown)}.`;
 const addStep=(text,op)=>{solution.push(text);if(op)operations.push(op);};
 const compare=(value,reference,label='smaller value',lower=true)=>{
   inputs.reference=reference;inputs.preferLower=lower;
   const aWins=lower?value<reference:value>reference;
   answerChoice=aWins?'A':'B';choiceLabels={A:'the recorded group',B:'the comparison group'};
   answer=Math.abs(value-reference);
   addStep(`Compare ${n(value)} and ${n(reference)}: option ${answerChoice} has the ${label}. The difference is ${n(Math.max(value,reference))} − ${n(Math.min(value,reference))} = ${n(answer)} ${unit}.`,operation('sub',Math.max(value,reference),Math.min(value,reference),answer));
 };
 const measure=(kind)=>kind==='mean'?mean(values):kind==='median'?median(values):kind==='range'?range:kind==='iqr'?spread:deviation;
 const basic=(kind)=>{
   const value=measure(kind);
   if(kind==='mean')addStep(`Add all eight measurements and share the total equally: ${sum(values)} ÷ 8 = ${n(value)} ${unit}.`,operation('mean',values,null,value));
   else if(kind==='median')addStep(`Put the measurements in order: ${list(values)}. The middle pair gives (${values[3]} + ${values[4]}) ÷ 2 = ${n(value)} ${unit}.`,operation('median',values,null,value));
   else if(kind==='range')addStep(`Find the range: largest − smallest = ${values.at(-1)} − ${values[0]} = ${range} ${unit}.`,operation('sub',values.at(-1),values[0],range));
   else if(kind==='iqr'){
     addStep(`Order the measurements. The lower-half median is Q1 = (${values[1]} + ${values[2]}) ÷ 2 = ${q1}; the upper-half median is Q3 = (${values[5]} + ${values[6]}) ÷ 2 = ${q3} ${unit}.`,operation('quartiles',values,null,[q1,q3].join(',')));
     addStep(`Find the middle-half spread: Q3 − Q1 = ${q3} − ${q1} = ${spread} ${unit}.`,operation('sub',q3,q1,spread));
   }else{
     addStep(`Find the mean: ${sum(values)} ÷ 8 = ${center} ${unit}.`,operation('mean',values,null,center));
     addStep(`Use that mean to find the eight distances: ${list(values.map(x=>Math.abs(x-center)))}. Their total is ${sum(values.map(x=>Math.abs(x-center)))} ${unit}.`,operation('distanceSum',values,center,sum(values.map(x=>Math.abs(x-center)))));
     addStep(`Share the total distance across eight readings: ${sum(values.map(x=>Math.abs(x-center)))} ÷ 8 = ${deviation} ${unit}. This is the MAD.`,operation('div',sum(values.map(x=>Math.abs(x-center))),8,deviation));
   }
   return value;
 };

 if(skill==='S-QUESTION') {
   // The question is statistical because different records can have different answers.
   const groups=r.int(3,7), perGroup=2*r.int(3,7), collected=r.int(1,groups-1)*perGroup, total=groups*perGroup;
   inputs={...inputs,groups,perGroup,collected,total};answerUnit='records';unitAliases=['record','responses','response','answers','answer'];
   const query=`“How do the ${scene.observations} vary?”`;
   const plan=`The investigation asks ${query} It needs ${perGroup} observations from each of ${groups} groups.`;
   hint='A statistical question expects different answers across a group. Count every observation, not just the groups.';
   if(shape==='backward'){
     const extra=r.int(3,9);inputs.extra=extra;
     body=`The investigation asks ${query} Each of ${groups} groups supplies the same number of observations. A visitor supplies ${extra} extra observations, making ${total+extra} records altogether. Work backward to find how many records came from each group.`;
     addStep(`Remove the visitor's extra observations: ${total+extra} − ${extra} = ${total} records from the groups.`,operation('sub',total+extra,extra,total));
     answer=perGroup;addStep(`Share those records across the groups: ${total} ÷ ${groups} = ${perGroup} records per group.`,operation('div',total,groups,perGroup));
   }else if(shape==='compare'){
     const extra=r.int(2,7),reference=total+extra;inputs.extra=extra;
     body=`To answer ${query}, plan A collects ${perGroup} observations from each of ${groups} groups. Plan B collects ${reference} observations across all groups. Which plan collects more data, and by how many records?`;
     addStep(`Plan A collects ${groups} × ${perGroup} = ${total} records; a record is one observation, not one group.`,operation('mul',groups,perGroup,total));
     answer=extra;answerChoice='B';choiceLabels={A:'collect from each group',B:'collect across all groups'};
     addStep(`Plan B collects more: ${reference} − ${total} = ${extra} records. Comparing varying observations helps answer the statistical question.`,operation('sub',reference,total,extra));
   }else{
     body=`${plan} ${collected} observations have been recorded. ${shape==='mistake'?`${other} counts only the ${groups} groups and says the investigation is finished. Explain the counting mistake, then find how many records are still needed.`:shape==='what-if'?`What if every group contributes ${factor} times the planned number of observations? How many more records are needed beyond the ${collected} already collected?`:'How many more records are needed to complete the investigation?'}`;
     addStep(`Each observation can differ, so count records: ${groups} × ${perGroup} = ${total} planned records.`,operation('mul',groups,perGroup,total));
     const required=shape==='what-if'?total*factor:total;
     if(shape==='what-if')addStep(`The larger sample needs ${total} × ${factor} = ${required} records.`,operation('mul',total,factor,required));
     answer=required-collected;addStep(`Subtract records already collected: ${required} − ${collected} = ${answer} records still needed.`,operation('sub',required,collected,answer));
   }
 } else if(skill==='S-DISPLAY') {
   const frequencies=[r.int(3,7),r.int(4,9),r.int(3,8)], first=frequencies[0]+frequencies[1], all=sum(frequencies), added=r.int(3,7), remaining=all+added;
   inputs={...inputs,frequencies,added};answerUnit='records';unitAliases=['record','responses','response'];
   const table=`The frequency table for ${scene.observations} has three groups: low ${frequencies[0]}, middle ${frequencies[1]}, and high ${frequencies[2]}. Each observation is counted in exactly one group.`;
   hint='The frequencies tell you how many observations there are. Add the frequencies, not the category labels.';
   body=table+' ';
   if(shape==='backward'){
     const hidden=frequencies[2];
     body=`A frequency table has ${remaining} records after ${added} new observations are added. Before that, the low and middle groups together contained ${first} records. How many records were originally in the high group?`;
     addStep(`Undo the new observations: ${remaining} − ${added} = ${all} original records.`,operation('sub',remaining,added,all));
     answer=hidden;addStep(`Remove the known low and middle frequencies: ${all} − ${first} = ${hidden} records in the high group.`,operation('sub',all,first,hidden));
   }else{
     addStep(`Combine the first two frequencies: ${frequencies[0]} + ${frequencies[1]} = ${first} records.`,operation('add',frequencies[0],frequencies[1],first));
     addStep(`Include the high group: ${first} + ${frequencies[2]} = ${all} records in the table.`,operation('add',first,frequencies[2],all));
     if(shape==='compare'){
       body+=`Plan A keeps this table. Plan B collects ${remaining} records. Which plan has more records, and by how many?`;
       answer=added;answerChoice='B';choiceLabels={A:'current frequency table',B:'new collection'};
       addStep(`Plan B has more: ${remaining} − ${all} = ${added} records.`,operation('sub',remaining,all,added));
     }else if(shape==='mistake'){
       body+=`${other} adds only the low and middle frequencies, forgetting the high group. Then ${who} collects ${added} new observations. Fix the omitted group and find the correct updated total number of records.`;
       answer=all+added;addStep(`After restoring the omitted high group, include the new observations: ${all} + ${added} = ${answer} records in the updated table.`,operation('add',all,added,answer));
     }else if(shape==='what-if'){
       body+=`What if ${added} more observations enter the middle group? How many records would the updated table contain?`;
       answer=all+added;addStep(`Add the new observations: ${all} + ${added} = ${answer} records.`,operation('add',all,added,answer));
     }else{
       const goal=all+added;
       body+=`${who}'s goal is ${goal} records. How many more are needed?`;
       answer=added;addStep(`Compare with the collection goal: ${goal} − ${all} = ${added} more records.`,operation('sub',goal,all,added));
     }
   }
 } else if(['S-MEAN','S-MEDIAN','S-RANGE','S-IQR','S-MAD'].includes(skill)) {
   const kind={'S-MEAN':'mean','S-MEDIAN':'median','S-RANGE':'range','S-IQR':'iqr','S-MAD':'mad'}[skill];
   const label={mean:'mean',median:'median',range:'range',iqr:'interquartile range (IQR)',mad:'mean absolute deviation (MAD)'}[kind];
   hint=kind==='mean'?'Add the measurements, then divide by how many there are.':kind==='median'?'Order all eight measurements before finding the middle pair.':kind==='range'?'Find the largest and smallest readings first.':kind==='iqr'?'Split the ordered eight readings into two halves of four; find the median of each half.':'Find the mean first, then measure every distance from it without using negative distances.';
   if(shape==='backward'){
     if(kind==='mean'){
       const known=values.slice(0,7),wanted=sum(values)-sum(known);
       body=`The mean of eight ${scene.observations} is ${center} ${unit}. Seven readings are ${list(r.shuffle(known))}. Work backward to find the missing eighth reading.`;
       addStep(`A mean of ${center} across eight readings requires a total of ${center} × 8 = ${center*8} ${unit}.`,operation('mul',center,8,center*8));
       answer=wanted;addStep(`The seven known readings total ${sum(known)}. Subtract that total: ${center*8} − ${sum(known)} = ${answer} ${unit}.`,operation('sub',center*8,sum(known),answer));
     }else if(kind==='median'){
       body=`The ordered ${scene.observations} are ${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, ?, ${values[5]}, ${values[6]}, ${values[7]}. Their median is ${center} ${unit}. Work backward to find the missing reading.`;
       addStep(`The two middle readings must total twice the median: ${center} × 2 = ${center*2} ${unit}.`,operation('mul',center,2,center*2));
       answer=values[4];addStep(`One middle reading is ${values[3]}. The other is ${center*2} − ${values[3]} = ${answer} ${unit}.`,operation('sub',center*2,values[3],answer));
     }else if(kind==='range'){
       const originalMax=values.at(-1),largerRange=range+delta;
       body=`The smallest of the ${scene.observations} is ${values[0]} ${unit}, and the current largest is ${originalMax} ${unit}. A new largest reading makes the range ${largerRange} ${unit}. How much larger is the new reading than the old largest?`;
       const newMax=values[0]+largerRange;
       addStep(`Work backward from the new range: ${values[0]} + ${largerRange} = ${newMax} ${unit}, the new largest reading.`,operation('add',values[0],largerRange,newMax));
       answer=newMax-originalMax;addStep(`Compare with the old largest: ${newMax} − ${originalMax} = ${answer} ${unit} larger.`,operation('sub',newMax,originalMax,answer));
     }else if(kind==='iqr'){
       body=`Eight ordered ${scene.observations} have Q1 = ${q1} ${unit} and IQR = ${spread} ${unit}. The upper half is ${values[4]}, ${values[5]}, ?, ${values[7]}. Work backward to find the missing upper-half reading.`;
       addStep(`Find Q3 from the IQR: ${q1} + ${spread} = ${q3} ${unit}.`,operation('add',q1,spread,q3));
       addStep(`The two middle readings of the upper half total ${q3} × 2 = ${2*q3} ${unit}.`,operation('mul',q3,2,2*q3));
       answer=values[6];addStep(`Subtract the known middle reading: ${2*q3} − ${values[5]} = ${answer} ${unit}.`,operation('sub',2*q3,values[5],answer));
     }else{
       const knownDistances=values.slice(0,7).map(x=>Math.abs(x-center)),totalDistance=deviation*8;
       body=`Eight ${scene.observations} have mean ${center} ${unit} and MAD ${deviation} ${unit}. Seven distances from the mean are ${list(knownDistances)} ${unit}. The missing reading is above the mean. Work backward to find that reading.`;
       addStep(`Undo the averaging: ${deviation} × 8 = ${totalDistance} ${unit} of total distance.`,operation('mul',deviation,8,totalDistance));
       const missingDistance=totalDistance-sum(knownDistances);addStep(`Subtract the seven known distances: ${totalDistance} − ${sum(knownDistances)} = ${missingDistance} ${unit}.`,operation('sub',totalDistance,sum(knownDistances),missingDistance));
       answer=center+missingDistance;addStep(`The reading is above the mean: ${center} + ${missingDistance} = ${answer} ${unit}.`,operation('add',center,missingDistance,answer));
     }
   }else{
     const value=basic(kind);
     body=data+' ';
     if(shape==='compare'){
       const reference=value+(r.int(0,1)?delta:-Math.min(delta,value/2));
       body+=`Call this group A. Group B has ${label} ${n(reference)} ${unit}. ${kind==='mean'||kind==='median'?'Choose the group with the higher typical measurement.':'Choose the group with the smaller spread.'} Which group should ${who} choose, and what is the difference between those two ${label} values?`;
       compare(value,reference,kind==='mean'||kind==='median'?'higher typical measurement':'smaller spread',!['mean','median'].includes(kind));
     }else if(shape==='mistake'){
       const wrong=kind==='range'?values.at(-1):kind==='iqr'?range:2*value;
       const error=kind==='mean'?`divides the total by 4 instead of 8`:kind==='median'?`adds the two middle readings without dividing by 2`:kind==='range'?`uses only the largest reading`:kind==='iqr'?`uses the full range instead of the spread of the middle half`:`divides the total distance by 4 instead of 8`;
       inputs.wrong=wrong;
       body+=`${other} ${error} and reports a ${label} of ${wrong} ${unit}. Fix the calculation and find by how much the report is too high.`;
       answer=wrong-value;addStep(`The report should use the ${label} ${n(value)}, not ${wrong}. It is ${wrong} − ${n(value)} = ${n(answer)} ${unit} too high.`,operation('sub',wrong,value,answer));
     }else if(shape==='what-if'){
       const additive=['mean','median'].includes(kind);
       body+=additive?`What if each reading increases by ${delta} ${unit}? Use the original ${label} to find the new ${label}.`:`What if a new version of the activity makes every measurement ${factor} times as large? Find the new ${label}.`;
       answer=additive?value+delta:value*factor;
       addStep(additive?`Each reading rises by ${delta}, so the ${label} rises by ${delta}: ${n(value)} + ${delta} = ${n(answer)} ${unit}.`:`Distances scale by the same factor: ${n(value)} × ${factor} = ${n(answer)} ${unit}.`,operation(additive?'add':'mul',value,additive?delta:factor,answer));
     }else{
       const goal=value+delta;
       if(['mean','median'].includes(kind)&&['centimetres','metres'].includes(unit)){
         body+=`A new ${scene.record} has a measurement of ${goal} ${unit}. How much greater is that measurement than the original ${label}?`;
         answer=goal-value;addStep(`Compare the new measurement with the original ${label}: ${goal} − ${n(value)} = ${n(answer)} ${unit} greater.`,operation('sub',goal,value,answer));
       }else if(['mean','median'].includes(kind)){
         body+=`${who} uses the ${label} to estimate the ${scene.goal} for ${plural(target,scene.record)} next time. What total does the estimate give?`;
         answer=value*target;addStep(`Use the ${label} for each of the ${plural(target,scene.record)}: ${n(value)} × ${target} = ${n(answer)} ${unit}.`,operation('mul',value,target,answer));
       }else{
         body+=`The project allows a ${label} of at most ${goal} ${unit}. How far below that limit is the current spread?`;
         answer=goal-value;addStep(`Subtract the current spread from the limit: ${goal} − ${n(value)} = ${n(answer)} ${unit} below the limit.`,operation('sub',goal,value,answer));
       }
     }
   }
 } else if(skill==='S-CENTER') {
   const usual=[center-3*step,center-2*step,center-step,center,center+step,center+2*step,center+3*step], outlier=center+8*delta, withOutlier=[...usual,outlier], typical=median(withOutlier), total=sum(withOutlier), average=total/8;
   inputs={...inputs,values:withOutlier,usual,outlier,typical};
   hint='One unusually large reading pulls the mean upward. The median still comes from the middle of the ordered list.';
   if(shape==='backward'){
     body=`Seven usual ${scene.observations} are ${list(r.shuffle(usual))}. An eighth unusually large reading makes the mean ${n(average)} ${unit}. Work backward to find that unusual reading.`;
     addStep(`Undo the average: ${n(average)} × 8 = ${total} ${unit} in all.`,operation('mul',average,8,total));
     answer=outlier;addStep(`The seven usual readings total ${sum(usual)}. The unusual reading is ${total} − ${sum(usual)} = ${outlier} ${unit}.`,operation('sub',total,sum(usual),outlier));
   }else{
     body=`The ${scene.observations} are ${list(r.shuffle(withOutlier))}. One reading is unusually high. `;
     addStep(`The seven usual readings total ${sum(usual)} ${unit}.`,operation('sum',usual,null,sum(usual)));
     const newOutlier=shape==='what-if'?outlier+8*delta:outlier;
     if(shape==='what-if')body+=`What if the unusual reading becomes ${newOutlier} ${unit}? By how much will the new mean exceed the unchanged median?`;
     else if(shape==='compare')body+=`Estimate A uses the mean and estimate B uses the median for a typical record. Which estimate is less affected by this unusually high reading, and by how much does the larger estimate exceed the smaller one?`;
     else if(shape==='mistake')body+=`${other} says the mean is the middle measurement and uses it for a typical record. Find the median instead, then find how much the mean overstates that typical amount.`;
     else body+=`${who} uses the median for a typical record. How much higher is the mean than the median?`;
     const newTotal=sum(usual)+newOutlier,newMean=newTotal/8;
     addStep(`Include the unusual reading: ${sum(usual)} + ${newOutlier} = ${newTotal} ${unit}.`,operation('add',sum(usual),newOutlier,newTotal));
     addStep(`Divide the total by eight to get the mean: ${newTotal} ÷ 8 = ${n(newMean)} ${unit}.`,operation('div',newTotal,8,newMean));
     answer=newMean-typical;
     addStep(`The middle pair gives median (${center} + ${center+step}) ÷ 2 = ${typical}. The mean is ${n(newMean)} − ${typical} = ${n(answer)} ${unit} higher. The median is less affected by the unusual reading.`,operation('sub',newMean,typical,answer));
     if(shape==='compare'){answerChoice='B';choiceLabels={A:'mean estimate',B:'median estimate'};}
   }
 } else if(skill==='S-BOX') {
   svg=boxDiagram(values,unit);inputs={...inputs,q1,q3,range,iqr:spread};
   hint='The box runs from the lower quartile Q1 to the upper quartile Q3. Its width is the IQR, in the original measurement units.';
   if(shape==='backward'){
     svg=undefined;
     const above=delta;
     body=`A box plot of ${scene.observations} has lower quartile ${q1} ${unit} and IQR ${spread} ${unit}. A project marker is ${above} ${unit} above the upper quartile. What measurement belongs at the marker?`;
     addStep(`Find the upper quartile: ${q1} + ${spread} = ${q3} ${unit}.`,operation('add',q1,spread,q3));
     answer=q3+above;addStep(`Move to the marker: ${q3} + ${above} = ${answer} ${unit}.`,operation('add',q3,above,answer));
   }else{
     body=`The box plot summarizes the ${scene.observations}. `;
     addStep(`Read Q1 = ${q1} and Q3 = ${q3}. The box width is ${q3} − ${q1} = ${spread} ${unit}.`,operation('sub',q3,q1,spread));
     if(shape==='compare'){
       const bSpread=spread+delta;body+=`Call this group A. Group B has an IQR of ${bSpread} ${unit}. Which group has the more consistent middle half, and by how much is its IQR smaller?`;
       compare(spread,bSpread,'smaller middle-half spread');
     }else if(shape==='mistake'){
       body+=`${other} uses the full whisker-to-whisker range ${range} ${unit} for the middle-half spread. Find the actual middle-half spread, then how much too large that report is.`;
       answer=range-spread;addStep(`The middle-half spread is the box width, not the full range. The report is ${range} − ${spread} = ${answer} ${unit} too large.`,operation('sub',range,spread,answer));
     }else if(shape==='what-if'){
       body+=`What if every measurement is multiplied by ${factor}? Find the new width of the box.`;
       answer=spread*factor;addStep(`The box width scales with all the measurements: ${spread} × ${factor} = ${answer} ${unit}.`,operation('mul',spread,factor,answer));
     }else{
       const allowed=spread+delta;body+=`The project allows an IQR of at most ${allowed} ${unit}. How much room is left before that limit?`;
       answer=delta;addStep(`Subtract the box width from the limit: ${allowed} − ${spread} = ${delta} ${unit}.`,operation('sub',allowed,spread,delta));
     }
   }
 } else if(skill==='S-SPREAD') {
   hint='Compare the same measure of spread in the same units. A smaller range means the extreme readings are closer together.';
   const bRange=range+delta, bMin=values[0]-step, bMax=bMin+bRange;
   inputs={...inputs,bRange,bMin,bMax};
   if(shape==='backward'){
     body=`Group A records these ${scene.observations}: ${list(shown)}. Group B must have a range ${factor} times as wide. Its smallest reading is ${bMin} ${unit}. What must its largest reading be?`;
     addStep(`Find group A's range: ${values.at(-1)} − ${values[0]} = ${range} ${unit}.`,operation('sub',values.at(-1),values[0],range));
     const desired=range*factor;addStep(`Group B needs range ${range} × ${factor} = ${desired} ${unit}.`,operation('mul',range,factor,desired));
     answer=bMin+desired;addStep(`Work backward to the largest reading: ${bMin} + ${desired} = ${answer} ${unit}.`,operation('add',bMin,desired,answer));
   }else{
     body=`Group A records these ${scene.observations}: ${list(shown)}. Group B has a range of ${bRange} ${unit}. `;
     addStep(`Find group A's range: ${values.at(-1)} − ${values[0]} = ${range} ${unit}.`,operation('sub',values.at(-1),values[0],range));
     if(shape==='what-if'){
       body+=`What if every measurement in group A triples? Which group's range is then wider, and by how much?`;
       const doubled=range*3;addStep(`Tripling every measurement triples A's range: ${range} × 3 = ${doubled} ${unit}.`,operation('mul',range,3,doubled));
       answerChoice='A';choiceLabels={A:'tripled group A',B:'unchanged group B'};
       answer=Math.abs(doubled-bRange);addStep(`Compare the new ranges: ${Math.max(doubled,bRange)} − ${Math.min(doubled,bRange)} = ${answer} ${unit}; ${doubled>bRange?'A':'B'} is wider.`,operation('sub',Math.max(doubled,bRange),Math.min(doubled,bRange),answer));
     }else{
       if(shape==='compare')body+=`Using range, which group is more consistent, and by how much is its range smaller?`;
       else if(shape==='mistake')body+=`${other} says group B is more consistent because its range is larger. Correct that statement, then find the difference in ranges.`;
       else body+=`How much narrower is A's range than B's?`;
       compare(range,bRange,'smaller spread');
       if(shape!=='compare'){answerChoice=undefined;choiceLabels=undefined;}
     }
   }
 }
 if(!Number.isFinite(answer)||answer<0||solution.length<2||solution.length>4)throw new Error(`Invalid statistics story ${skill}/${shape}`);
 const ask=answerChoice?`Choose option A or B and give the difference in ${answerUnit}.`:`Write your answer in ${answerUnit}.`;
 const plainPrompt=`${intro} ${body} ${ask}`;
 const displayedNumbers=(plainPrompt.replace(/\bQ[13]\b/g,'quartile').match(/\d+(?:\.\d+)?/g)??[]);
 if(svg)displayedNumbers.push(...[values[0],q1,median(values),q3,values.at(-1)].map(String));
 const hints=[
  {answer:n(answer+1),text:hint},
  {answer:n(answer+2),text:'Check which statistic the story asks for, then use it in the final step.'},
  {answer:n(answer+3),text:'Keep the measurement unit throughout the calculation and compare the result with the story.'}
 ];
 return makeQuestion({skill,seed,shape:'story-'+shape,story:true,scenarioId:scene.id,storyShape:shape,stepCount:solution.length,answer:n(answer),answerUnit,unitAliases,answerChoice,choiceLabels,prompt:`<p>${escapeHTML(intro)}</p><p>${escapeHTML(body)}</p><p>${escapeHTML(ask)}</p>`,plainPrompt,solution,hint,hints,svg,numbers:displayedNumbers,verification:{kind:'statistics-story',skill,shape,inputs,operations,answer:n(answer)}});
}
