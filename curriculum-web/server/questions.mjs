import { parseNumber, eq, isSimplest } from './math.mjs';
import { makeQuestion } from './generators/common.mjs';
import { generateArithmetic, arithmeticSkills } from './generators/arithmetic.mjs';
import { generateGeometry, geometrySkills } from './generators/geometry.mjs';
import { generateStatistics, statisticsSkills } from './generators/statistics.mjs';

export const allSkills=[...arithmeticSkills,...geometrySkills,...statisticsSkills];
export function generateQuestion(skill,seed,options={}) {
  const canonical=skill==='N-WARM'?'WARMUP':skill;
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
export function gradeQuestion(q,input) {
  if(typeof input!=='string'&&typeof input!=='number')return {correct:false,formOnly:false,hint:'Type a number or choose an answer.'};
  let answer=String(input).trim();
  if(q.choices){if(!/^option-\d+$/.test(answer))return {correct:false,formOnly:false,hint:'Choose one of the answers shown.'};const choice=q.choices[Number(answer.slice(7))];if(!choice)return {correct:false,formOnly:false,hint:'Choose one of the answers shown.'};answer=choice.value;}
  if(!answer||answer.length>100)return {correct:false,formOnly:false,hint:'Type a number or choose an answer.'};
  const correct=answersEqual(answer,q.answer);
  if(correct&&q.simplest&&!isSimplest(answer))return {correct:false,formOnly:true,hint:'Right value. Write it in simplest form.'};
  if(correct)return {correct:true,formOnly:false,hint:'Right.'};
  const matched=q.hints.find(h=>answersEqual(answer,h.answer));
  return {correct:false,formOnly:false,hint:matched?.text??q.hint??'Check each step and try again.'};
}
export function publicQuestion(q) {
  const visible={skill:q.skill,shape:q.shape,prompt:q.prompt,plainPrompt:q.plainPrompt};
  if(q.choices)visible.choices=q.choices.map(({label},i)=>({value:`option-${i}`,label}));
  if(q.svg)visible.svg=q.svg;
  return visible;
}
export function questionIdentity(q) {
  const strip=s=>String(s??'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|#160);/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim().toLowerCase();
  const svg=String(q.svg??''),diagramLabels=[...svg.matchAll(/<(?:title|desc|text)\b[^>]*>([\s\S]*?)<\/(?:title|desc|text)>/gi)].map(match=>strip(match[1]));
  const aria=[...svg.matchAll(/aria-label="([^"]*)"/g)].map(match=>strip(match[1]));
  return [strip(q.plainPrompt??q.prompt),...(q.choices??[]).map(c=>strip(c.label)).sort(),...aria,...diagramLabels].join('|');
}
