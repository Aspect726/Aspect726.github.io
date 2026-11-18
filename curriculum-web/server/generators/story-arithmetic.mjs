import { rational as R, parseNumber, add, sub, mul, div, pow, abs, compare, format as F, fraction, gcd } from '../math.mjs';
import { rng, makeQuestion, escapeHTML } from './common.mjs';

// Each scene has its own tangible supplies, grouping and map context. A scene ID
// survives changes of names, quantities and question shape, so the set builder
// can prevent a disguised repeat of the same situation.
const scenes = [
 {id:'bake-sale',place:'the school bake sale',item:'cupcakes',group:'boxes',resource:'icing',unit:'kilograms',single:'kilogram',part:'cake',map:'the bake-sale stall plan',space:'display mats'},
 {id:'bike-trip',place:'a class bike trip',item:'energy bars',group:'rider packs',resource:'drinking water',unit:'litres',single:'litre',part:'bottle',map:'the cycle-route map',space:'rest-stop signs'},
 {id:'school-garden',place:'the school garden',item:'seedlings',group:'planting trays',resource:'compost',unit:'kilograms',single:'kilogram',part:'plant pot',map:'the garden grid',space:'square garden beds'},
 {id:'game-quest',place:'a cooperative video-game quest',item:'crystals',group:'treasure chests',resource:'potion',unit:'litres',single:'litre',part:'potion flask',map:'the game-world map',space:'square game tiles'},
 {id:'science-fair',place:'the science fair',item:'sample tubes',group:'experiment kits',resource:'water for the experiments',unit:'litres',single:'litre',part:'experiment',map:'the science-fair floor plan',space:'square display panels'},
 {id:'animal-shelter',place:'an animal-shelter collection',item:'pet treats',group:'care packs',resource:'pet food',unit:'kilograms',single:'kilogram',part:'food bag',map:'the shelter-site map',space:'square exercise mats'},
 {id:'art-club',place:'art club',item:'beads',group:'craft kits',resource:'ribbon',unit:'metres',single:'metre',part:'decoration',map:'the art-room grid',space:'square fabric panels'},
 {id:'school-play',place:'the school play',item:'tickets',group:'ticket bundles',resource:'fabric for the costumes',unit:'metres',single:'metre',part:'costume',map:'the stage plan',space:'square scenery panels'},
 {id:'library-challenge',place:'the library reading challenge',item:'bookmarks',group:'reader packs',resource:'ribbon for bookmarks',unit:'metres',single:'metre',part:'bookmark',map:'the library-event floor plan',space:'square book-display mats'},
 {id:'sports-day',place:'school sports day',item:'medals',group:'team packs',resource:'ribbon for medals',unit:'metres',single:'metre',part:'medal',map:'the sports-field map',space:'square activity mats'},
 {id:'aquarium',place:'the school aquarium project',item:'shells',group:'habitat kits',resource:'clean water',unit:'litres',single:'litre',part:'small habitat',map:'the aquarium-room grid',space:'square tank-base pads'},
 {id:'space-camp',place:'space camp',item:'mission badges',group:'crew packs',resource:'cord for model landers',unit:'metres',single:'metre',part:'model lander',map:'the model moon-base map',space:'square solar-panel models'},
 {id:'music-club',place:'music club',item:'concert tickets',group:'ticket bundles',resource:'cable for the speakers',unit:'metres',single:'metre',part:'speaker connection',map:'the concert-room plan',space:'square sound panels'},
 {id:'beach-cleanup',place:'a beach cleanup',item:'reusable gloves',group:'volunteer packs',resource:'collected plastic',unit:'kilograms',single:'kilogram',part:'sorting bag',map:'the beach-cleanup map',space:'square sorting mats'},
 {id:'school-cafe',place:'the school cafe',item:'fruit cups',group:'lunch trays',resource:'juice',unit:'litres',single:'litre',part:'drink cup',map:'the cafe floor plan',space:'square table mats'},
 {id:'robot-club',place:'robot club',item:'gears',group:'robot kits',resource:'wire',unit:'metres',single:'metre',part:'robot',map:'the robot-course grid',space:'square robot-base panels'}
];
const sceneById=new Map(scenes.map(s=>[s.id,s]));
export const storyArithmeticSkills=['D-SUB','D-LONG','D-DIV','F-WHOLE','E-EXP','E-ORDER','E-DIST','E-FACTOR','E-LIKE','E-SOLVE','E-STORY','E-RELATE','E-GRAPH','N-OPP','N-ABS','N-ORDER','N-COORD','N-REFLECT','N-DIST','E-INEQ','P-PROP','N-ADD','N-MULT','E-2STEP','F-ADD','F-SUB','F-MULT','F-DIV','F-COMP','R-RATIO','R-RATE','P-PERCENT','P-CHANGE','N-DIV','WARMUP'];
export const arithmeticStoryScenarios = skill => storyArithmeticSkills.includes(skill) ? scenes.map(s=>s.id) : [];
const kinds=['missing','compare','backward','mistake','what-if'];
const asString=value=>typeof value==='object'?F(value):String(value);
const asR=value=>typeof value==='object'?value:parseNumber(value);
function exactRoot(a){a=asR(a);const n=BigInt(Math.sqrt(Number(a.n))),d=BigInt(Math.sqrt(Number(a.d)));if(n*n!==a.n||d*d!==a.d)throw new Error('A story square must have an exact rational root.');return R(n,d);}
const operations={add,sub,mul,div,pow:(a,b)=>pow(a,Number(b)),sqrt:exactRoot,abs:(a)=>abs(a),gcd:(a,b)=>R(gcd(BigInt(a),BigInt(b))),max:(a,b)=>compare(a,b)>=0?asR(a):asR(b),min:(a,b)=>compare(a,b)<=0?asR(a):asR(b)};
function calculate(op,a,b=0){return operations[op](a,b);}
function node(op,a,b,description){const result=calculate(op,a,b);return {op,a:asString(a),b:asString(b),result:F(result),description};}
const val=n=>parseNumber(n.result);
const equation=n=>n.op==='abs'?`|${n.a}| = ${n.result}`:n.op==='sqrt'?`√${n.a} = ${n.result}`:n.op==='gcd'?`GCF(${n.a}, ${n.b}) = ${n.result}`:n.op==='pow'?`${n.a}^${n.b} = ${n.result}`:n.op==='max'||n.op==='min'?`${n.op==='max'?'The greater':'The smaller'} of ${n.a} and ${n.b} is ${n.result}`:`${n.a} ${{add:'+',sub:'−',mul:'×',div:'÷'}[n.op]} ${n.b} = ${n.result}`;
const unitsFor=u=>u==='dollars'?['dollar','$','usd']:u==='metres'?['metre','meters','meter','m']:u==='litres'?['litre','liters','liter','l']:u==='kilograms'?['kilogram','kg']:u==='square metres'?['square metre','square meters','square meter','m²','m2']:u==='percent'?['%','percentage']:u==='percentage points'?['percentage point']:u.endsWith('s')?[u.slice(0,-1)]:[u];
const plan=(text,ask,unit,ops,extra={})=>({text,ask,unit,ops,...extra});

function stockProblem(skill,r,s,who,hard,shape){
 const n=r.int(3,hard?12:7),m=r.int(2,hard?9:5),per=R(r.int(4,hard?21:12),4),reserve=R(r.int(2,12),4),total=add(mul(n,per),reserve);
 if(skill==='D-SUB'){
  const start=r.int(12,hard?80:35),use=R(r.int(311,Math.max(312,(start-5)*1000)),1000),after=sub(start,use),second=R(r.int(101,Math.max(102,Math.floor(Number(F(after))*500))),1000);
  const ops=[node('sub',start,use,'Find the supply left after the first job.'),node('sub',after,second,'Subtract the supply needed for the next job.')];
  const reverse=[node('add',val(ops[1]),second,'Put back the amount used for the second job.'),node('add',val(ops[0]),use,'Put back the amount used for the first job.')];
  return plan(`${who} starts with ${start} ${s.unit} of ${s.resource}. The first job uses ${F(use)} ${s.unit}. The next job uses ${F(second)} ${s.unit}.`,`How much ${s.resource} is left for another job?`,s.unit,ops,{quantity:`${s.resource} left`,backward:plan(`${who} uses ${F(use)} ${s.unit} of ${s.resource} for one job and ${F(second)} ${s.unit} for the next. Afterwards, ${ops[1].result} ${s.unit} remain.`,`How much ${s.resource} was there before either job?`,s.unit,reverse),whatifText:`${who} starts with ${start} ${s.unit} of ${s.resource} and uses ${F(use)} ${s.unit} on the first job. The next job was planned to use ${F(add(second,R(1,10)))} ${s.unit}. What if its design changes and it uses only ${F(second)} ${s.unit} instead?`});
 }
 if(['D-LONG','N-DIV','D-DIV','F-DIV'].includes(skill)){
  let amount,part,share,first,unit,ask,text,backward;
  if(skill==='D-LONG'||skill==='N-DIV'){
   const count=r.pick([4,8,16]),whole=skill==='D-LONG'?r.int(7,hard?31:19)*2+1:count*r.int(3,hard?16:9),use=skill==='D-LONG'?R(1,8):R(1),each=div(whole,count),left=sub(each,use);
   const ops=[node('div',whole,count,`Share the ${s.resource} equally among the teams.`),node('sub',each,use,'Subtract what each team uses on its first task.')];
   const reverse=[node('add',left,use,'Rebuild the amount one team received.'),node('mul',each,count,'Combine the equal team shares to rebuild the total.')];
   return plan(`${who} shares ${whole} ${s.unit} of ${s.resource} equally among ${count} teams. Each team uses ${F(use)} ${s.unit} on its first task.`,`How much does each team still have?`,s.unit,ops,{quantity:`${s.resource} each team has left`,backward:plan(`Each of ${count} teams uses ${F(use)} ${s.unit} of ${s.resource} and has ${F(left)} ${s.unit} left. ${who} had shared the original supply equally.`,`How much was in the original supply?`,s.unit,reverse),whatifText:`${who} shares ${whole} ${s.unit} of ${s.resource} equally among ${count} teams. A team's first task normally uses ${F(mul(use,2))} ${s.unit}. What if the team changes the design and uses ${F(use)} ${s.unit} instead?`});
  }
  const unitAmount=skill==='D-DIV'?R(r.pick([5,8,12,15,25]),100):R(r.pick([1,2,3]),4),pieces=r.int(7,hard?42:23),kept=R(r.int(1,7),4),stock=add(mul(unitAmount,pieces),kept),available=sub(stock,kept),ops=[node('sub',stock,kept,`Set aside the ${s.resource} that must be saved.`),node('div',available,unitAmount,`Divide the available supply by the amount needed for one ${s.part}.`)];
  const reverse=[node('mul',pieces,unitAmount,`Rebuild the amount used for all ${s.part}s.`),node('add',available,kept,'Add the supply that was set aside.')];
  return plan(`${who} has ${F(stock)} ${s.unit} of ${s.resource} and sets aside ${F(kept)} ${s.unit}. Each ${s.part} needs ${F(unitAmount)} ${s.unit}.`,`How many complete ${s.part}s can be supplied?`,`${s.part}s`,ops,{quantity:`complete ${s.part}s supplied`,backward:plan(`${who} supplies ${pieces} ${s.part}s using ${F(unitAmount)} ${s.unit} of ${s.resource} each, after first setting aside ${F(kept)} ${s.unit}. None of the usable supply is left.`,`How much ${s.resource} was there at the start?`,s.unit,reverse),whatifText:`${who} has ${F(stock)} ${s.unit} of ${s.resource} and saves ${F(kept)} ${s.unit}. The original design needed ${F(mul(unitAmount,2))} ${s.unit} per ${s.part}. What if a smaller design needs only ${F(unitAmount)} ${s.unit} per ${s.part}?`});
 }
 if(skill==='F-WHOLE'){
  const den=r.pick([4,5,8]),num=r.int(1,den-1),one=r.int(3,hard?16:9),all=den*one,part=num*one,used=r.int(1,one-1),ops=[node('div',part,num,'Find the amount represented by one equal part.'),node('mul',one,den,'Rebuild all the equal parts.'),node('sub',all,used,'Subtract the amount used after the count.')];
  const rev=[node('add',all-used,used,'Rebuild the complete collection.'),node('div',all,den,'Find one equal fraction part.'),node('mul',one,num,'Find the requested fraction of the collection.')];
  return plan(`${who} has counted ${num}/${den} of the ${s.item}; that is ${part} ${s.item}. Then ${used} ${s.item} are used.`,`How many ${s.item} remain in the whole collection?`,s.item,ops,{quantity:`${s.item} remaining`,backward:plan(`${who} uses ${used} ${s.item} and has ${all-used} left. Before using any, a counted section was ${num}/${den} of the collection.`,`How many ${s.item} were in that counted section?`,s.item,rev),whatifText:`${who} counts ${num}/${den} of the ${s.item}, which is ${part} ${s.item}. The plan was to use ${used+1} ${s.item}. What if only ${used} are needed instead?`});
 }
 if(skill==='F-ADD'||skill==='F-SUB'){
  const a=R(r.int(12,hard?48:28),4),b=R(r.int(1,7),8),used=R(r.int(1,5),8),op=skill==='F-ADD'?'add':'sub',mid=calculate(op,a,b),ops=[node(op,a,b,skill==='F-ADD'?`Combine both deliveries of ${s.resource}.`:`Subtract the amount used from the ${s.resource} supply.`),node('sub',mid,used,'Subtract the amount kept for a later project.')];
  const rev=[node('add',val(ops[1]),used,'Put back the amount saved for later.'),node(op==='add'?'sub':'add',mid,b,op==='add'?'Remove the second delivery to find the first.':'Put back the amount used to find the starting supply.')];
  const text=op==='add'?`${who} receives ${fraction(a)} ${s.unit} of ${s.resource}, then another ${fraction(b)} ${s.unit}.`:`${who} has ${fraction(a)} ${s.unit} of ${s.resource} and uses ${fraction(b)} ${s.unit}.`;
  return plan(`${text} ${fraction(used)} ${s.unit} must also be kept for next week.`,`How much is available for today's project?`,s.unit,ops,{quantity:`${s.resource} available today`,backward:plan(`${who} ${op==='add'?'receives another':'uses'} ${fraction(b)} ${s.unit} of ${s.resource}, then saves ${fraction(used)} ${s.unit} for next week. There are ${fraction(val(ops[1]))} ${s.unit} available today.`,`How much was there before ${op==='add'?'the extra delivery':'any was used'}?`,s.unit,rev),whatifText:`${text} The plan was to save ${fraction(add(used,R(1,8)))} ${s.unit} for next week. What if only ${fraction(used)} ${s.unit} must be saved?`});
 }
 if(skill==='F-MULT'){
  const fractionUsed=R(r.pick([1,3,5,7]),4),whole=R(r.int(5,hard?19:11),2),portion=mul(whole,fractionUsed),teams=r.int(2,5),scaling=compare(fractionUsed,1)<0?'less':'greater',ops=[node('mul',whole,fractionUsed,`Multiply by the scale factor. A factor ${scaling} than 1 makes the order ${scaling==='less'?'smaller':'larger'} than the usual supply.`),node('div',portion,teams,'Share the scaled order equally among the teams.')];
  const inverseDenominator=r.pick([2,4,5,8]),inversePortion=div(whole,inverseDenominator),inverseShare=div(inversePortion,teams),rev=[node('mul',inverseShare,teams,'Rebuild the unit-fraction order from every team’s share.'),node('mul',inversePortion,inverseDenominator,`Rebuild the whole supply from ${inverseDenominator} equal unit-fraction parts.`)];
  return plan(`${who}'s usual order is ${F(whole)} ${s.unit} of ${s.resource}. A new order is ${fraction(fractionUsed)} times the usual amount and is shared equally by ${teams} teams.`,`How much does each team get?`,s.unit,ops,{quantity:`${s.resource} per team`,compareAlternative:div(whole,teams),compareLabel:'Share the usual, unscaled order among the same teams',backward:plan(`Each of ${teams} teams receives ${F(inverseShare)} ${s.unit} of ${s.resource}. Their complete order was 1/${inverseDenominator} of ${who}'s usual supply.`,`How much was in the usual supply?`,s.unit,rev),whatifText:`${who}'s usual order is ${F(whole)} ${s.unit} of ${s.resource}. The new order is scaled by ${fraction(fractionUsed)} and was going to be shared by ${teams+1} teams. What if only ${teams} teams take part, sharing equally?`});
 }
 if(skill==='F-COMP'){
  const den=r.pick([4,8,10]),numA=r.int(1,den-2),numB=r.int(numA+1,den-1),a=R(numA,den),b=R(numB,den),needed=R(r.int(1,numA),den*2),remaining=sub(b,needed),ops=[node('max',a,b,'Compare the fractions to choose the larger supply.'),node('sub',b,needed,'Subtract the amount used from the chosen supply.')];
  const rev=[node('add',remaining,needed,'Rebuild the supply in the chosen container.'),node('sub',b,a,'Compare the rebuilt supply with the other container.')];
  return plan(`${who} can take one of two containers of ${s.resource}: ${fraction(a)} ${s.unit} or ${fraction(b)} ${s.unit}. They choose the fuller container and use ${fraction(needed)} ${s.unit}.`,`How much remains in the chosen container?`,s.unit,ops,{quantity:`${s.resource} remaining after choosing the fuller container`,backward:plan(`${who} chooses the fuller container of ${s.resource}, uses ${fraction(needed)} ${s.unit}, and has ${F(remaining)} ${s.unit} left. The other container holds ${fraction(a)} ${s.unit}.`,`How much more was in the chosen container than the other container?`,s.unit,rev),whatifText:`${who} can choose a container holding ${fraction(a)} ${s.unit} of ${s.resource} or one holding ${fraction(b)} ${s.unit}. They choose the fuller one. What if a new design uses ${fraction(needed)} ${s.unit} rather than ${fraction(add(needed,R(1,den*2)))} ${s.unit}?`});
 }
 return null;
}

function algebraProblem(skill,r,s,who,hard){
 const x=r.int(3,hard?15:9),n=r.int(3,hard?12:7),bonus=r.int(2,7),fee=r.int(3,15);
 if(skill==='E-EXP'){
  const power=r.int(2,4),baseKind=r.pick(['whole','fraction','decimal']),base=baseKind==='whole'?R(r.int(2,4)):baseKind==='fraction'?r.pick([R(1,2),R(3,4),R(3,2),R(5,4)]):r.pick([R(4,5),R(6,5),R(3,2)]),shown=baseKind==='fraction'?fraction(base):F(base),factor=pow(base,power),initial=r.int(3,hard?19:11),total=mul(initial,factor),ops=[node('pow',base,power,`Repeated scaling uses ${power} equal factors of ${shown}.`),node('mul',factor,initial,'Multiply the starting quantity by the combined scale factor.')];
  const reverse=[node('pow',base,power,`Combine the ${power} equal scale factors first.`),node('div',total,factor,'Undo the combined scaling to recover the starting quantity.')];
  return plan(`${who} models a changing supply of ${s.resource}. It starts at ${initial} ${s.unit}. After each round, the amount is ${shown} times the previous amount. There are ${power} rounds.`,`How much is there after all the rounds?`,s.unit,ops,{quantity:`${s.resource} after the repeated scaling`,backward:plan(`${who}'s model supply of ${s.resource} becomes ${shown} times its previous amount in each of ${power} rounds. It ends at ${F(total)} ${s.unit}.`,`Work backward to find the starting quantity.`,s.unit,reverse),whatifText:`${who}'s model starts with ${initial} ${s.unit} of ${s.resource}. Each round makes the amount ${shown} times the previous amount. The plan had ${power+1} rounds. What if it stops after only ${power} rounds?`});
 }
 if(skill==='E-ORDER'){
  const side=r.int(3,hard?9:6),trays=r.int(2,6),loose=r.int(3,15),square=side*side,packed=square*trays,total=packed+loose,ops=[node('pow',side,2,'Find the number in one square arrangement.'),node('mul',square,trays,'Find the number in all the square arrangements.'),node('add',packed,loose,'Add the loose items after multiplying.')];
  const rev=[node('sub',total,loose,'Remove the loose items.'),node('div',packed,trays,'Find the number in one square arrangement.'),node('sqrt',square,0,'Find the equal row and column count whose square gives the display total.')];
  return plan(`${who} arranges ${s.item} in ${trays} square displays, each with ${side} rows of ${side} ${s.item}. There are also ${loose} loose ${s.item}.`,`How many ${s.item} are there altogether?`,s.item,ops,{quantity:`${s.item} altogether`,backward:plan(`${who} has ${total} ${s.item}: ${loose} loose ones and ${trays} identical square displays. In each display, the number of rows equals the number of ${s.item} in a row.`,`How many ${s.item} are in one row?`,s.item,rev),whatifText:`${who} has ${trays} square displays, each with ${side} rows of ${side} ${s.item}. There were going to be ${loose+3} loose ${s.item}. What if ${3} of those loose ones are moved to storage, leaving ${loose} loose ${s.item}?`});
 }
 if(skill==='E-DIST'){
  const per=x+bonus,total=n*per,ops=[node('add',x,bonus,'Combine the regular and extra items in one group.'),node('mul',per,n,`Use the distributive relationship ${n}(x + ${bonus}) = ${n}x + ${n*bonus} for all the groups.`)];
  const rev=[node('div',total,n,'Undo the repeated groups to find one group.'),node('sub',per,bonus,'Remove the bonus items from one group.')];
  return plan(`${who} prepares ${n} ${s.group}. Each holds x regular ${s.item} plus ${bonus} extra ${s.item}, so the total is ${n}(x + ${bonus}). For this event, x = ${x}.`,`How many ${s.item} are needed in total?`,s.item,ops,{quantity:`${s.item} needed`,backward:plan(`${who} puts ${total} ${s.item} into ${n} identical ${s.group}. Each group contains x regular ${s.item} and ${bonus} extras.`,`Find x, the number of regular ${s.item} in each group.`,s.item,rev),whatifText:`${who} prepares ${n} ${s.group}, each with x regular ${s.item} and ${bonus} extras. The plan used x = ${x+2}. What if x is reduced to ${x}, while the extra ${bonus} stay in every group?`});
 }
 if(skill==='E-FACTOR'){
  const a=r.int(2,hard?12:7),c=r.int(2,8),b=a*c,total=a*x+b,ops=[node('gcd',a,b,'Find the greatest common factor of both terms.'),node('div',b,a,'Divide the constant term by that factor.'),node('add',x,c,'Evaluate the contents of one factored group.')];
  const rev=[node('mul',a,x+c,'Find the total represented by all the equal factored groups.'),node('sub',total,b,'Remove the extra items from the entire collection.'),node('div',a*x,a,'Share the regular items among the equal groups to recover x.')];
  return plan(`${who}'s supply list is ${a}x + ${b} ${s.item}, with x = ${x}. They factor out the greatest common factor of ${a} and ${b} to write the list as identical ${s.group}.`,`How many ${s.item} does the expression inside the brackets represent for one group?`,s.item,ops,{quantity:`${s.item} per factored group`,backward:plan(`${who}'s factored supply list makes ${a} identical ${s.group}, each with ${x+c} ${s.item}. Across all the groups, ${b} ${s.item} are extras. The remaining items are divided equally as the regular supplies.`,`Work backward to find x, the number of regular ${s.item} in each group.`,s.item,rev),whatifText:`${who}'s supply expression is ${a}x + ${b} ${s.item}. They make groups by factoring out the greatest common factor of ${a} and ${b}. What if x changes from ${x+1} to ${x}?`});
 }
 if(skill==='E-LIKE'){
  const a=r.int(2,8),b=r.int(2,8),c=r.int(2,12),coefficient=a+b,subtotal=coefficient*x,total=subtotal+c,ops=[node('add',a,b,'Combine the coefficients of the like x terms.'),node('mul',coefficient,x,'Evaluate the combined variable term.'),node('add',subtotal,c,'Add the separate items, which are not x terms.')];
  const rev=[node('sub',total,c,'Remove the separate items.'),node('div',subtotal,coefficient,'Undo the combined coefficient to find the equal pack size.')];
  return plan(`${who} collects ${a} packs of x ${s.item}, then ${b} more packs of x ${s.item}, plus ${c} separate ${s.item}. This is ${a}x + ${b}x + ${c}, with x = ${x}.`,`Combine like terms and find the total number of ${s.item}.`,s.item,ops,{quantity:`${s.item} collected`,backward:plan(`${who} has ${total} ${s.item} altogether: ${a} equal packs, ${b} more packs of the same size, and ${c} separate ${s.item}.`,`How many ${s.item} are in each pack?`,s.item,rev),whatifText:`${who}'s collection is ${a}x + ${b}x + ${c} ${s.item}. They expected x = ${x+1} in each pack. What if every pack contains x = ${x} instead?`});
 }
 if(['E-SOLVE','E-STORY','E-2STEP'].includes(skill)){
  const price=r.int(2,hard?13:7),count=r.int(4,hard?17:10),fixed=r.int(3,19),itemCost=price*count,total=itemCost+fixed,ops=[node('sub',total,fixed,'Remove the fixed charge before counting the equal-price groups.'),node('div',itemCost,price,'Divide the remaining cost by the price of one group.')];
  const rev=[node('sub',total,fixed,'Remove the delivery charge from the bill.'),node('div',itemCost,count,'Undo the equal-price groups to find the price of one.')];
  return plan(`${who} pays ${total} dollars for some ${s.group}, at ${price} dollars per group, plus a ${fixed}-dollar delivery charge.${skill==='E-STORY'?' Let x stand for the number of groups. Write an equation to help you.':` The number of groups is x, so ${price}x + ${fixed} = ${total}.`}`,`How many ${s.group} were ordered?`,s.group,ops,{quantity:`${s.group} bought`,backward:plan(`${who} orders ${count} ${s.group} at the same price each. The final bill is ${total} dollars, including a ${fixed}-dollar delivery charge.`,`Work backward to find the price of one group.`,'dollars',rev),whatifText:`${who} has a ${total}-dollar budget. Delivery normally costs ${fixed+price} dollars. What if delivery is reduced to ${fixed} dollars and ${s.group} cost ${price} dollars each?`});
 }
 if(['E-RELATE','E-GRAPH','P-PROP'].includes(skill)){
  const rate=r.int(2,hard?11:6),hours=r.int(2,6),extra=r.int(2,5),first=rate*hours,all=rate*(hours+extra),ops=[node('div',first,hours,'Find the constant rate from the first observation.'),node('mul',rate,extra,'Use the rate to find the output in the additional time.'),node('add',rate*extra,first,'Add that extra output to the amount already prepared.')];
  const rev=[node('div',all,rate,'Use the output and rate to recover total time.'),node('sub',hours+extra,hours,'Remove the time that had already passed.')];
  const record=skill==='E-GRAPH'?`On a graph of time (hours) against ${s.item} prepared, the straight line passes through (0, 0) and (${hours}, ${first}).`:`In ${hours} hours, ${who} prepares ${first} ${s.item} at a steady rate, starting from zero.`;
  return plan(`${record} Work continues at the same rate for another ${extra} hours.`,`How many ${s.item} have been prepared by the end?`,s.item,ops,{quantity:`${s.item} prepared`,backward:plan(`${who} prepares ${all} ${s.item} at a steady rate of ${rate} per hour, starting from zero. A first shift lasted ${hours} hours.`,`How many more hours of work came after that first shift?`,'hours',rev),whatifText:`${record} The next shift was going to last ${extra-1} hours. What if it lasts ${extra} more hours instead, at the same rate?`});
 }
 if(skill==='E-INEQ'){
  const perGroup=r.int(3,8),fixed=r.int(3,12),groups=r.int(4,hard?14:8),budget=perGroup*groups+fixed,ops=[node('sub',budget,fixed,'Take the fixed charge out of the spending limit.'),node('div',budget-fixed,perGroup,'Find the greatest whole number of groups that fits the remaining limit.')];
  const rev=[node('mul',groups,perGroup,'Find the cost of the greatest allowed group count.'),node('add',groups*perGroup,fixed,'Add the fixed charge to find the exact spending limit.')];
  return plan(`${who} may spend at most ${budget} dollars on ${s.group}. Each group costs ${perGroup} dollars and delivery costs ${fixed} dollars. The inequality is ${perGroup}x + ${fixed} ≤ ${budget}.`,`What is the greatest whole number of ${s.group} that can be bought?`,s.group,ops,{quantity:`${s.group} affordable`,backward:plan(`${who} can buy at most ${groups} ${s.group} at ${perGroup} dollars each, with a fixed ${fixed}-dollar delivery fee. Buying exactly ${groups} uses the entire budget.`,`What was the spending limit?`,'dollars',rev),whatifText:`${who} has ${budget} dollars and ${s.group} cost ${perGroup} dollars each. Delivery was going to cost ${fixed+perGroup} dollars. What if it costs ${fixed} dollars instead? The total must still be at most ${budget} dollars.`});
 }
 return null;
}

function rateProblem(skill,r,s,who,hard){
 if(skill==='R-RATIO'){
  const a=r.int(2,5),b=a+r.int(1,4),groups=r.int(3,hard?15:8),first=a*groups,second=b*groups,ops=[node('div',first,a,'Find how many complete ratio groups the first team has.'),node('mul',groups,b,'Use the same number of groups for the second team.')];
  const rev=[node('div',second,b,'Undo the second part of the ratio.'),node('mul',groups,a,'Recover the first part using the same group count.')];
  return plan(`${who} divides ${s.item} between the morning and afternoon teams in the ratio ${a}:${b}. The morning team gets ${first} ${s.item}.`,`How many ${s.item} should the afternoon team get?`,s.item,ops,{quantity:`${s.item} for the afternoon team`,backward:plan(`${who} shares ${s.item} between morning and afternoon teams in the ratio ${a}:${b}. The afternoon team receives ${second} ${s.item}.`,`Work backward to find how many the morning team received.`,s.item,rev),whatifText:`${who} uses a morning-to-afternoon ratio of ${a}:${b} for ${s.item}. The morning team expected ${first+a} ${s.item}. What if it gets ${first} instead, with the ratio kept the same?`});
 }
 if(skill==='R-RATE'){
  const oldCount=r.int(3,9),price=R(r.int(5,hard?29:17),4),newCount=oldCount+r.int(2,7),bill=mul(price,oldCount),newBill=mul(price,newCount),ops=[node('div',bill,oldCount,'Find the cost of one group.'),node('mul',price,newCount,'Apply that unit price to the new order.')];
  const rev=[node('div',newBill,newCount,'Recover the price of one group from the new bill.'),node('mul',price,oldCount,'Use that price to reconstruct the earlier bill.')];
  return plan(`${who} paid ${F(bill)} dollars for ${oldCount} identical ${s.group}. The price per group stays the same. The next order needs ${newCount} ${s.group}.`,`What will the next order cost?`,'dollars',ops,{quantity:'dollars in the next bill',better:'less',backward:plan(`${who}'s new order of ${newCount} identical ${s.group} costs ${F(newBill)} dollars. An earlier order had ${oldCount} groups at the same price per group.`,`Work backward to reconstruct the earlier bill.`,'dollars',rev),whatifText:`${who} paid ${F(bill)} dollars for ${oldCount} identical ${s.group}. The next order was going to have ${newCount-1} groups. What if one more group is needed, making ${newCount} in all, at the same price per group?`});
 }
 if(skill==='P-PERCENT'){
  const total=r.int(5,hard?35:17)*20,pct=r.pick([10,20,25,30,40,50]),selected=total*pct/100,used=r.int(1,Math.max(2,selected-2)),remaining=selected-used,ops=[node('mul',total,R(pct,100),'Find the percentage of the collection set aside.'),node('sub',selected,used,'Subtract the items already used from that selected amount.')];
  const rev=[node('add',remaining,used,'Rebuild the amount that was originally set aside.'),node('div',selected,R(pct,100),'Undo the percentage to reconstruct the full collection.')];
  return plan(`${who} sets aside ${pct}% of ${total} ${s.item} for the afternoon activity. ${used} of those set-aside ${s.item} are used before the activity begins.`,`How many of the set-aside ${s.item} are still available?`,s.item,ops,{quantity:`set-aside ${s.item} remaining`,backward:plan(`${who} sets aside ${pct}% of the ${s.item}. After ${used} of the set-aside items are used, ${remaining} remain in that section.`,`Work backward to find how many ${s.item} were in the whole collection.`,s.item,rev),whatifText:`${who} sets aside ${pct}% of ${total} ${s.item}. They expected to use ${used+1} before the activity. What if only ${used} of the set-aside items are used?`});
 }
 if(skill==='P-CHANGE'){
  const original=r.int(4,hard?28:15)*20,pct=r.pick([10,20,25,30,40,50]),rise=original*pct/100,after=original+rise,target=pct+r.int(1,4)*5,ops=[node('sub',after,original,'Find the increase in the count.'),node('div',rise,original,'Compare that increase with the original count.'),node('mul',R(pct,100),100,'Convert the increase to a percentage.')];
  // The backward version derives the original from the final count and the
  // multiplicative increase, rather than substituting the displayed answer.
  const factor=add(1,R(pct,100)),rev=[node('add',1,R(pct,100),'Write the final count as a fraction of the original count.'),node('div',after,factor,'Undo that scale factor to find the original count.')];
  return plan(`${who}'s first collection had ${original} ${s.item}. After a second collection, there are ${after}.`,`By what percent did the collection grow?`,'percent',ops,{quantity:'percent growth',backward:plan(`${who}'s collection grows by ${pct}% and ends with ${after} ${s.item}.`,`Work backward to find the original number of ${s.item}.`,s.item,rev),whatifText:`${who} starts with ${original} ${s.item}. The target was ${after+original/10}. What if the actual final collection is ${after} ${s.item} instead?`});
 }
 if(skill==='WARMUP'){
  const packs=r.int(3,7),each=r.int(4,12),used=r.int(2,each-1),all=packs*each,left=all-used,ops=[node('mul',packs,each,'Count the items in all the equal groups.'),node('sub',all,used,'Subtract the items already used.')],rev=[node('add',left,used,'Put back the used items to rebuild the collection.'),node('div',all,packs,'Share that collection back into the original groups.')];
  return plan(`${who} opens ${packs} ${s.group} with ${each} ${s.item} in each. They use ${used} ${s.item}.`,`How many ${s.item} remain?`,s.item,ops,{quantity:`${s.item} remaining`,backward:plan(`${who} opens ${packs} equal ${s.group}, uses ${used} ${s.item}, and has ${left} left.`,`How many ${s.item} were in each group?`,s.item,rev),whatifText:`${who} opens ${packs} ${s.group} with ${each} ${s.item} in each. They expected to use ${used+1}. What if they use only ${used} ${s.item}?`});
 }
 return null;
}

function signedProblem(skill,r,s,who,hard){
 const magnitude=r.int(3,hard?19:10),start=-magnitude,extra=r.int(2,hard?13:7),east=r.int(2,hard?18:9),north=r.int(2,hard?15:8);
 if(skill==='N-ADD'){
  const debt=r.int(4,20),donation=debt+r.int(5,18),bill=r.int(3,12),middle=donation-debt,final=middle-bill,ops=[node('add',-debt,donation,'Add the donation to the negative starting balance.'),node('sub',middle,bill,'Subtract the bill from the new balance.')];
  const rev=[node('add',final,bill,'Undo paying the bill.'),node('sub',middle,donation,'Undo the donation to recover the starting signed balance.')];
  return plan(`${who}'s project account starts at −${debt} dollars, meaning it owes ${debt} dollars. A ${donation}-dollar donation arrives, then ${who} pays a ${bill}-dollar bill.`,`What is the final signed balance? A negative balance means money is still owed.`,'dollars',ops,{quantity:'dollars in the final signed balance',backward:plan(`${who}'s account receives a ${donation}-dollar donation, then pays a ${bill}-dollar bill. Its final signed balance is ${final} dollars.`,`Work backward to find the starting signed balance.`,'dollars',rev),whatifText:`${who}'s project account starts at −${debt} dollars. A ${donation}-dollar donation arrives. The next bill was expected to be ${bill+3} dollars. What if the bill is only ${bill} dollars?`});
 }
 if(skill==='N-MULT'){
  const days=r.int(3,7),perDay=r.int(2,hard?11:6),opening=days*perDay+r.int(3,20),change=-days*perDay,remaining=opening+change,ops=[node('mul',-perDay,days,'Combine the equal negative daily changes.'),node('add',opening,change,'Apply the total signed change to the starting amount.')];
  const rev=[node('mul',-perDay,days,'Find the total negative change across the days.'),node('sub',remaining,change,'Undo that negative change to recover the starting amount.')];
  return plan(`${who} begins with ${opening} ${s.unit} of ${s.resource}. The log records a change of −${perDay} ${s.unit} each day for ${days} days.`,`How much remains after all those days?`,s.unit,ops,{quantity:`${s.resource} remaining`,backward:plan(`${who}'s supply changes by −${perDay} ${s.unit} per day for ${days} days and ends at ${remaining} ${s.unit}.`,`Work backward to find how much ${s.resource} was there at the start.`,s.unit,rev),whatifText:`${who} starts with ${opening} ${s.unit} of ${s.resource}. The supply changes by −${perDay} ${s.unit} each day. The activity was going to last ${days+1} days. What if it finishes after ${days} days instead?`});
 }
 if(skill==='N-OPP'){
  const reflected=-start,finish=reflected+extra,ops=[node('mul',start,-1,'Take the opposite coordinate to find the mirror position.'),node('add',reflected,extra,'Move east from that mirror position.')];
  const rev=[node('sub',finish,extra,'Undo the eastward move.'),node('mul',reflected,-1,'Take the opposite again to recover the original coordinate.')];
  return plan(`On ${s.map}, east is positive and each grid unit is 1 metre. ${who} marks a supply point at ${start}. Its partner point must be at the opposite coordinate. From that partner point, the route goes ${extra} metres east.`,`What is the ending coordinate, in metres from zero?`,'metres',ops,{quantity:'ending coordinate in metres from zero',backward:plan(`On ${s.map}, east is positive and each grid unit is 1 metre. ${who} first goes to the opposite coordinate from a supply point, then ${extra} metres east, ending at coordinate ${finish}.`,`Work backward to find the original supply-point coordinate, in metres from zero.`,'metres',rev),whatifText:`On ${s.map}, east is positive and every unit is 1 metre. ${who} marks a point at ${start} and finds its opposite coordinate. The next move was ${extra+2} metres east. What if it is shortened to ${extra} metres east?`});
 }
 if(skill==='N-ABS'){
  const total=magnitude+east,ops=[node('abs',start,0,'Use absolute value to find the distance from the starting point to zero.'),node('add',magnitude,east,'Continue from zero to the point east of zero.')];
  const rev=[node('sub',total,east,'Remove the section east of zero from the total journey.'),node('mul',magnitude,-1,'The starting point was west of zero, so its coordinate is negative.')];
  return plan(`On ${s.map}, each grid unit is 1 metre and east is positive. ${who} takes supplies from coordinate ${start} to zero, then continues to coordinate ${east}.`,`What total distance do the supplies travel?`,'metres',ops,{quantity:'metres travelled',better:'less',backward:plan(`${who} travels ${total} metres along ${s.map}, starting west of zero, passing through zero and ending at coordinate ${east}. Each unit is 1 metre and east is positive.`,`What was the starting coordinate, in metres from zero?`,'metres',rev),whatifText:`On ${s.map}, each unit is 1 metre. ${who} starts at ${start}, passes through zero and planned to finish at ${east+2}. What if the destination moves to ${east} instead?`});
 }
 if(skill==='N-ORDER'){
  const denom=r.pick([2,4,5,8,10]),nearer=R(-r.int(3,hard?49:27),denom),farther=sub(nearer,R(r.int(1,9),denom)),move=R(r.int(2,13),denom),finish=add(nearer,move),show=r.int(0,1)?fraction:F,ops=[node('max',farther,nearer,'Compare signed fractions or decimal coordinates: farther right means greater.'),node('add',nearer,move,'Move east from the selected point.')];
  const rev=[node('sub',finish,move,'Undo the eastward move to find the selected starting coordinate.'),node('sub',nearer,farther,'Find the distance from the other starting point to that selected point.')];
  return plan(`On ${s.map}, east is positive and each unit is 1 metre. Two supply points are at ${show(farther)} and ${show(nearer)}. ${who} chooses the point farther east, then moves the supplies ${show(move)} metres east.`,`What is the new coordinate, in metres from zero?`,'metres',ops,{quantity:'new coordinate in metres from zero',backward:plan(`On ${s.map}, one supply point is at ${show(farther)}. ${who} starts at a second point farther east, moves ${show(move)} metres east and finishes at ${show(finish)}. Each unit is 1 metre.`,`Work backward: how far apart were the two original supply points?`,'metres',rev),whatifText:`On ${s.map}, each unit is 1 metre and east is positive. ${who} chooses whichever of the supply points ${show(farther)} and ${show(nearer)} is farther east. The next move was ${show(add(move,1))} metres east. What if that move is only ${show(move)} metres?`});
 }
 if(skill==='N-COORD'){
  const y=-r.int(2,8),cornerY=y+north,horizontal=east-start,total=horizontal+north,ops=[node('sub',east,start,'Read the x-coordinates to find the eastward part of the route.'),node('add',horizontal,north,'Add the northward part after the turn.')];
  const rev=[node('sub',total,north,'Remove the northward leg to recover the eastward distance.'),node('sub',east,horizontal,'Move west from the turning point to recover the starting x-coordinate.')];
  return plan(`On ${s.map}, each square is 1 metre. ${who} carries supplies from (${start}, ${y}) east to (${east}, ${y}), then ${north} metres north to (${east}, ${cornerY}).`,`How long is the whole two-part route?`,'metres',ops,{quantity:'metres in the route',better:'less',backward:plan(`On ${s.map}, each square is 1 metre. ${who}'s route goes east from (x, ${y}) to (${east}, ${y}), then ${north} metres north. The whole route is ${total} metres.`,`Work backward to find the starting x-coordinate, in metres from zero.`,'metres',rev),whatifText:`On ${s.map}, each square is 1 metre. ${who} travels east from (${start}, ${y}) to (${east}, ${y}). The next leg was ${north+2} metres north. What if the destination changes so that leg is only ${north} metres north?`});
 }
 if(skill==='N-REFLECT'){
  const y=r.int(2,7),gate=magnitude+extra,ops=[node('mul',start,-1,'Reflect across the y-axis: the x-coordinate changes sign and y stays the same.'),node('sub',gate,magnitude,'Find the horizontal distance from the reflected point to the gate.')];
  const rev=[node('sub',gate,extra,'Use the distance west of the gate to find the reflected x-coordinate.'),node('mul',magnitude,-1,'Reflect back across the y-axis to recover the original x-coordinate.')];
  return plan(`On ${s.map}, each square is 1 metre. ${who} reflects a station at (${start}, ${y}) across the y-axis. A gate is at (${gate}, ${y}).`,`How far must supplies move from the reflected station to the gate?`,'metres',ops,{quantity:'metres from the reflected station to the gate',better:'less',backward:plan(`On ${s.map}, each square is 1 metre. ${who} reflects a station across the y-axis. The reflected station is ${extra} metres west of the gate at (${gate}, ${y}), at the same y-coordinate.`,`Work backward to find the original station's x-coordinate, in metres from zero.`,'metres',rev),whatifText:`On ${s.map}, each square is 1 metre. ${who} reflects a station at (${start}, ${y}) across the y-axis. The gate was at (${gate+2}, ${y}). What if the gate moves to (${gate}, ${y})?`});
 }
 if(skill==='N-DIST'){
  if(r.int(0,1)){
   const height=r.int(3,12),width=east-start,area=width*height,vertices=`(${start}, 0), (${east}, 0), (${east}, ${height}) and (${start}, ${height})`,ops=[node('sub',east,start,'Find the horizontal side length by subtracting the x-coordinates.'),node('mul',width,height,`The vertical side runs from y = 0 to y = ${height}, so its length is ${height} metres. Multiply width by height.`)],rev=[node('div',area,height,'Divide the rectangle’s area by its vertical side length to recover its width.'),node('sub',east,width,'Move west from the right-hand x-coordinate by that width.')];
   return plan(`${who} marks a rectangular activity space on ${s.map}. Each grid unit is 1 metre. Its four vertices are ${vertices}.`,`What is the area inside the rectangle?`,'square metres',ops,{quantity:'square metres of activity space',backward:plan(`${who}'s rectangular activity space has area ${area} square metres. Its right-hand corners are (${east}, 0) and (${east}, ${height}); the other two corners have the same y-coordinates. Each grid unit is 1 metre.`,`Work backward to find the x-coordinate of its left side, in metres from zero.`,'metres',rev),whatifText:`${who} plans a rectangular activity space on ${s.map}, with each unit equal to 1 metre. What if its left side moves to x = ${start}, making its four vertices ${vertices}, while the right side and height stay fixed?`});
  }
  const y=r.int(-6,6),distance=east-start,total=2*distance,ops=[node('sub',east,start,'Subtract the x-coordinates because the points share a y-coordinate.'),node('mul',distance,2,'Use that distance for the outward and return journeys.')];
  const rev=[node('div',total,2,'Split the round trip into two equal one-way journeys.'),node('add',start,distance,'Move east from the starting point by the one-way distance.')];
  return plan(`On ${s.map}, each square is 1 metre. ${who} takes supplies from (${start}, ${y}) to (${east}, ${y}) and returns along the same straight path.`,`How far is the round trip?`,'metres',ops,{quantity:'metres in the round trip',better:'less',backward:plan(`On ${s.map}, each square is 1 metre. ${who} starts at (${start}, ${y}), goes east to a supply station and returns along the same path. The round trip is ${total} metres.`,`Work backward to find the supply station's x-coordinate, in metres from zero.`,'metres',rev),whatifText:`On ${s.map}, each square is 1 metre. ${who} starts at (${start}, ${y}). A supply station was at (${east+2}, ${y}). What if it moves to (${east}, ${y}) before ${who} makes an outward and return trip?`});
 }
 return null;
}

export function generateStoryArithmetic(skill,seed,{difficulty=1,scenarioId,storyShape}={}){
 if(!storyArithmeticSkills.includes(skill))throw new Error(`Unknown arithmetic story skill: ${skill}`);
 if(![1,2,3].includes(difficulty))throw new Error('Story difficulty must be 1, 2 or 3.');
 const r=rng(`arithmetic-story-v1:${skill}:${seed}:${difficulty}`),s=scenarioId?sceneById.get(scenarioId):r.pick(scenes);
 if(!s)throw new Error(`Unknown arithmetic story scenario: ${scenarioId}`);
 const shape=storyShape??r.pick(kinds);if(!kinds.includes(shape))throw new Error(`Unknown story shape: ${shape}`);
 const who=r.pick(['Maya','Leo','Ari','Nora','Sam','Ivy','Omar','Zoe','Luca','Asha','Ben','Tara']);
 let p=stockProblem(skill,r,s,who,difficulty>=2,shape)??algebraProblem(skill,r,s,who,difficulty>=2)??rateProblem(skill,r,s,who,difficulty>=2)??signedProblem(skill,r,s,who,difficulty>=2);
 if(!p)throw new Error(`No arithmetic story implementation: ${skill}`);
 let text=p.text,ask=p.ask,ops=p.ops,unit=p.unit,answerChoice,choiceLabels,choiceAliases,claimedAnswer,mistakeExplanation;
 if(shape==='backward'){if(!p.backward)throw new Error(`Missing inverse story: ${skill}`);p=p.backward;text=p.text;ask=p.ask;ops=p.ops;unit=p.unit;}
 if(shape==='what-if')text=p.whatifText??text;
 if(shape==='mistake'){
  let wrong=asR(p.ops[0].result);
  mistakeExplanation='The first calculation was only an intermediate result, not the final answer.';
  if(compare(wrong,asR(p.ops.at(-1).result))===0){
   const last=p.ops.at(-1),op={add:'mul',sub:'add',mul:'add',div:'mul'}[last.op];
   if(!op)throw new Error('No meaningful replacement for coincident intermediate result.');
   wrong=calculate(op,last.a,last.b);
   if(compare(wrong,asR(last.result))===0)throw new Error('A mistaken operation unexpectedly gives the correct result.');
   text+=` In the last calculation, ${who} ${op==='add'?'adds':op==='mul'?'multiplies':'subtracts'} ${last.a} and ${last.b} instead, and writes “${F(wrong)} ${unit}”.`;
   mistakeExplanation=`That last step needs ${ {add:'addition',sub:'subtraction',mul:'multiplication',div:'division'}[last.op] }, not ${op==='add'?'addition':'multiplication'}.`;
  }else text+=` ${who} stops after the first calculation and writes “${F(wrong)} ${unit}” as the final answer.`;
  claimedAnswer=F(wrong);
  ask=`Find and fix ${who}'s mistake. ${p.ask}`;
 }
 if(shape==='compare'){
  const own=val(ops.at(-1)),gap=R(r.int(1,7),unit==='percent'?1:unit==='dollars'?4:1),less=p.better==='less',signed=['N-ADD','N-OPP','N-ORDER'].includes(skill),other=p.compareAlternative??(r.int(0,1)||(!signed&&compare(own,gap)<=0)?add(own,gap):sub(own,gap)),ownBetter=less?compare(own,other)<0:compare(own,other)>0;
  const hi=compare(own,other)>0?own:other,lo=compare(own,other)>0?other:own;
  answerChoice=ownBetter?'A':'B';choiceLabels={A:'Use the plan in the story',B:p.compareLabel??'Use the alternative plan'};choiceAliases={A:['plan a','option a'],B:['plan b','option b']};
  text+=` Compare the ${p.quantity??'result'} for two plans. Option A is the plan above. Option B ${p.compareLabel?'uses the usual, unscaled order shared among the same teams and ':''}gives ${F(other)} ${unit} for the same goal.`;
  if(unit==='percent')unit='percentage points';
  ask=`The team wants the ${less?'smaller':'larger'} result. Which option is better, and by how many ${unit}? Write option A or B and the difference, including units.`;
  ops=[...ops,node('sub',hi,lo,`Option ${answerChoice} is ${less?'lower':'higher'}. Subtract the two results to find the difference.`)];
 }
 const result=ops.at(-1).result;
 const lead=`${who} is helping with ${s.place}.`;
 const prompt=`${lead} ${text} ${ask}${shape==='compare'?'':` Include ${unit} in your answer.`}`;
 const wrongValues=[add(result,1),sub(result,1),add(result,2)];
 const solution=ops.map((n,i)=>`${i+1}. ${n.description} ${equation(n)}.${i===ops.length-1?` ${shape==='compare'?`Choose option ${answerChoice}; the difference is `:'Answer: '}${n.result} ${unit}.`:''}`);
 if(shape==='mistake')solution[solution.length-1]+=` ${mistakeExplanation}`;
 return makeQuestion({skill,seed,shape:`story-${shape}`,story:true,scenarioId:s.id,scenarioName:s.place,storyShape:shape,stepCount:ops.length,prompt:escapeHTML(prompt),plainPrompt:prompt,answer:result,answerUnit:unit,unitAliases:unitsFor(unit),...(answerChoice?{answerChoice,choiceLabels,choiceAliases}:{}),solution,hint:ops[0].description,hints:wrongValues.map((answer,i)=>({answer:F(answer),text:[`Check the first calculation: ${ops[0].description}`,'Use the answer from one step in the next step.','Check the final calculation and the units.'][i]})),numbers:[...ops.flatMap(n=>[n.a,n.b]),...ops.map(n=>n.result)],verification:{kind:'arithmetic-story',scenarioId:s.id,storyShape:shape,operations:ops.map(({description,...n})=>n),answerChoice:answerChoice??null,answerUnit:unit,...(claimedAnswer?{claimedAnswer}:{})}});
}
