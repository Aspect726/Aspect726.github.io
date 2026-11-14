import { parseNumber, eq, isSimplest } from './math.mjs';
import { makeQuestion } from './generators/common.mjs';
import { generateArithmetic, arithmeticSkills } from './generators/arithmetic.mjs';
import { generateGeometry, geometrySkills } from './generators/geometry.mjs';
import { generateStatistics, statisticsSkills } from './generators/statistics.mjs';
import { generateStoryArithmetic, arithmeticStoryScenarios } from './generators/story-arithmetic.mjs';
import { generateStoryGeometry, geometryStoryScenarios } from './generators/story-geometry.mjs';
import { generateStoryStatistics, statisticsStoryScenarios } from './generators/story-statistics.mjs';

export const STORY_SHAPES=['missing','compare','backward','mistake','what-if'];
export const storyShapes=STORY_SHAPES;
export function storyScenarios(skill){const canonical=skill==='N-WARM'?'WARMUP':skill;return arithmeticSkills.includes(canonical)?arithmeticStoryScenarios(canonical):geometrySkills.includes(canonical)?geometryStoryScenarios(canonical):statisticsSkills.includes(canonical)?statisticsStoryScenarios(canonical):[];}


// Compact private pools avoid duplicating the same scene and shape labels thousands
// of times in the Worker. The seeded generator still receives the full contract.
export function decodeStorySeed(skill,level,entry,pool={}){
 if(entry&&typeof entry==='object'&&!Array.isArray(entry))return {seed:entry.seed,scenarioId:entry.scenarioId,storyShape:entry.storyShape};
 if(typeof entry!=='string'||!/^\d+:\d+:\d+$/.test(entry))throw new Error('Invalid checked story seed.');
 const [sceneIndex,shapeIndex]=entry.split(':').map(Number),scenarios=pool.storyEncoding?.scenarios??storyScenarios(skill),shapes=pool.storyEncoding?.shapes??STORY_SHAPES;
 if(!Array.isArray(scenarios)||!scenarios[sceneIndex]||!shapes[shapeIndex])throw new Error('Invalid checked story scene or shape.');
 return {seed:`story-v1:${skill}:${level}:${entry}`,scenarioId:scenarios[sceneIndex],storyShape:shapes[shapeIndex]};
}

export const allSkills=[...arithmeticSkills,...geometrySkills,...statisticsSkills];
export function generateQuestion(skill,seed,options={}) {
  const canonical=skill==='N-WARM'?'WARMUP':skill;
  if(options.mode==='story') {
    const generate=arithmeticSkills.includes(canonical)?generateStoryArithmetic:geometrySkills.includes(canonical)?generateStoryGeometry:statisticsSkills.includes(canonical)?generateStoryStatistics:null;
    if(!generate)throw new Error(`Unknown story skill ${skill}`);
    const q=makeQuestion({...generate(canonical,seed,options),skill,seed,generationSeed:seed});
    if(!q.story||!q.scenarioId||!q.answerUnit||!parseNumber(q.answer)||q.solution.length<2||q.solution.length>4)throw new Error(`Incomplete story template for ${skill}`);
    return q;
  }
  const generate=arithmeticSkills.includes(canonical)?generateArithmetic:geometrySkills.includes(canonical)?generateGeometry:statisticsSkills.includes(canonical)?generateStatistics:null;
  if(!generate)throw new Error(`Unknown skill ${skill}`);
  for(let retry=0;retry<100;retry++) {
    const generationSeed=retry?`${seed}:variant:${retry}`:seed;
    const q=makeQuestion({...generate(canonical,generationSeed,options),skill,seed,generationSeed});
    // Avoid parameter coincidences where a misconception happens to be correct.
    const distinctHints=q.hints.filter((h,i,all)=>!answersEqual(h.answer,q.answer)&&!all.slice(0,i).some(other=>answersEqual(other.answer,h.answer)));
    const duplicateChoices=q.choices?.some((choice,i,all)=>all.slice(0,i).some(other=>answersEqual(other.value,choice.value)));
    if(distinctHints.length>=3&&!duplicateChoices){q.hints=distinctHints;return q;}
  }
  throw new Error(`Could not generate distinct misconceptions for ${skill}`);
}
const normalized=s=>String(s??'').trim().replaceAll('−','-').replace(/\s+/g,' ').toLowerCase();
function answersEqual(a,b) {const left=parseNumber(a),right=parseNumber(b);return left&&right?eq(left,right):normalized(a)===normalized(b);}
const normalizeUnit=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/²/g,'2').replace(/³/g,'3').replace(/[.]+$/,'').replace(/\s+/g,' ').trim();
const commonUnits={
 metres:['metre','meters','meter','m'],centimetres:['centimetre','centimeters','centimeter','cm'],kilometres:['kilometre','kilometers','kilometer','km'],
 litres:['litre','liters','liter','l'],millilitres:['millilitre','milliliters','milliliter','ml'],kilograms:['kilogram','kg'],grams:['gram','g'],
 'square metres':['square metre','square meters','square meter','m2','m^2','sq m'],
 'square centimetres':['square centimetre','square centimeters','square centimeter','cm2','cm^2','sq cm'],
 'cubic metres':['cubic metre','cubic meters','cubic meter','m3','m^3'], 'cubic centimetres':['cubic centimetre','cubic centimeters','cubic centimeter','cm3','cm^3'],
 boxes:['box'],sandwiches:['sandwich'],points:['point','pt','pts'],
 dollars:['dollar','usd','$'],cents:['cent','¢'],percent:['%','per cent'],minutes:['minute','min','mins'],hours:['hour','hr','hrs'],seconds:['second','sec','secs']
};
export function unitAliases(q){const unit=normalizeUnit(q.answerUnit);return [...new Set([unit,...(q.unitAliases??[]).map(normalizeUnit),...(commonUnits[unit]??[]).map(normalizeUnit),...(unit.endsWith('s')?[unit.slice(0,-1)]:[])])];}
export function formatQuestionAnswer(q){return `${q.answerChoice?`${q.answerChoice}, `:''}${q.answer}${q.answerUnit?` ${q.answerUnit}`:''}`;}
export function parseUnitAnswer(q,input){
 let text=String(input??'').trim().replaceAll('−','-'),choice=null;
 if(q.answerChoice){
  let match=/^(?:option\s*)?([ab])(?:\s*[,;:]\s*|\s+)(.+)$/i.exec(text);
  if(match){choice=match[1].toUpperCase();text=match[2];}
  else if((match=/^(.+?)(?:\s*[,;:]\s*|\s+)(?:option\s*)?([ab])$/i.exec(text))){choice=match[2].toUpperCase();text=match[1];}
  if(!choice)return {error:'Choose option A or B, then give the amount and its units. For example: A, 12 '+q.answerUnit+'.'};
 }
 if(text.startsWith('$')&&unitAliases(q).includes('$')){text=text.slice(1).trim();if(parseNumber(text))text+=' dollars';}
 const m=/^([+-]?(?:\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*[+-]?\d+|(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+))\s*(.*?)\s*$/.exec(text);
 if(!m||!parseNumber(m[1]))return {error:'Enter a number followed by '+q.answerUnit+'.'};
 const unit=normalizeUnit(m[2]);
 if(!unit||!unitAliases(q).includes(unit))return {error:'Include the answer in '+q.answerUnit+(unit?'; check the unit you used.':'.')};
 return {value:m[1],unit,choice};
}
export function gradeQuestion(q,input) {
  if(typeof input!=='string'&&typeof input!=='number')return {correct:false,formOnly:false,hint:'Type a number or choose an answer.'};
  let answer=String(input).trim(),choice=null;
  if(q.answerUnit){const parsed=parseUnitAnswer(q,answer);if(parsed.error)return {correct:false,formOnly:true,hint:parsed.error};answer=parsed.value;choice=parsed.choice;}
  if(q.choices){if(!/^option-\d+$/.test(answer))return {correct:false,formOnly:false,hint:'Choose one of the answers shown.'};const option=q.choices[Number(answer.slice(7))];if(!option)return {correct:false,formOnly:false,hint:'Choose one of the answers shown.'};answer=option.value;}
  if(!answer||answer.length>100)return {correct:false,formOnly:false,hint:'Type a number or choose an answer.'};
  const correct=answersEqual(answer,q.answer)&&(!q.answerChoice||choice===q.answerChoice);
  if(correct&&q.simplest&&!isSimplest(answer))return {correct:false,formOnly:true,hint:'Right value. Write it in simplest form.'};
  if(correct)return {correct:true,formOnly:false,hint:'Right.'};
  if(q.answerChoice&&choice!==q.answerChoice)return {correct:false,formOnly:false,hint:'Work out both options, then check which one is better before finding the difference.'};
  const matched=(q.hints??[]).find(h=>answersEqual(answer,h.answer));
  return {correct:false,formOnly:false,hint:matched?.text??q.hint??'Check each step and try again.'};
}
export function publicQuestion(q) {
  const visible={skill:q.skill,shape:q.shape,prompt:q.prompt,plainPrompt:q.plainPrompt};
  if(q.choices)visible.choices=q.choices.map(({label},i)=>({value:`option-${i}`,label}));
  if(q.svg)visible.svg=q.svg;
  if(q.story)Object.assign(visible,{story:true,scenarioId:q.scenarioId,storyShape:q.storyShape,stepCount:q.stepCount});
  if(q.answerUnit)Object.assign(visible,{answerUnit:q.answerUnit,unitAliases:unitAliases(q)});
  if(q.choiceLabels){visible.choiceLabels=q.choiceLabels;visible.answerChoices=q.choiceLabels;}
  if(q.answerInstructions)visible.answerInstructions=q.answerInstructions;
  if(q.setPosition)Object.assign(visible,{setPosition:q.setPosition,setNumber:q.setNumber,stage:q.stage});
  return visible;
}
export function questionIdentity(q) {
  const strip=s=>String(s??'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|#160);/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim().toLowerCase();
  const svg=String(q.svg??''),diagramLabels=[...svg.matchAll(/<(?:title|desc|text)\b[^>]*>([\s\S]*?)<\/(?:title|desc|text)>/gi)].map(match=>strip(match[1]));
  const aria=[...svg.matchAll(/aria-label="([^"]*)"/g)].map(match=>strip(match[1]));
  return [strip(q.plainPrompt??q.prompt),...(q.choices??[]).map(c=>strip(c.label)).sort(),...aria,...diagramLabels].join('|');
}
