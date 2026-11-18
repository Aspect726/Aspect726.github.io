// Test tooling only. Never import the private paper corpus into a request handler.
import { parseNumber, fraction } from './math.mjs';
import { SKILLS, STRENGTHS, dayInfo } from './plan.mjs';
import { questionIdentity } from './questions.mjs';

const words = { zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90 };
export function normalizeText(value) {
  const superscripts='⁰¹²³⁴⁵⁶⁷⁸⁹';
  return String(value ?? '').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g,ch=>`^${superscripts.indexOf(ch)}`).normalize('NFKC').toLowerCase().replace(/<[^>]*>/g,' ').replace(/[−–—]/g,'-').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/[{}]/g,'').replace(/\s+/g,' ').trim().replace(/[.?!]+$/,'');
}
function canonicalNumber(value, signed = false) {
  const parsed = parseNumber(String(value).replace(/[{}]/g,'').replaceAll('−','-'));
  // Unsigned arithmetic ignores operator signs; signed-number skills retain them.
  return parsed ? fraction({n:!signed&&parsed.n<0n?-parsed.n:parsed.n,d:parsed.d}) : null;
}
export function extractNumbers(text) {
  const superscripts='⁰¹²³⁴⁵⁶⁷⁸⁹';
  let source=String(text??'').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g,ch=>` ^ ${superscripts.indexOf(ch)} `).normalize('NFKC').toLowerCase().replace(/[−–—]/g,'-').replace(/<[^>]*>/g,' ');
  source=source.replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[ -](one|two|three|four|five|six|seven|eight|nine)\b/g,(_,a,b)=>String(words[a]+words[b]));
  source=source.replace(new RegExp(`\\b(${Object.keys(words).join('|')})\\b`,'g'),word=>String(words[word]));
  source=source.replace(/(\d)\s*\{\s*(\d+)\s*\/\s*(\d+)\s*\}/g,'$1 $2/$3').replace(/[{}]/g,'');
  const numeric=/[+-]?\d+(?:,\d{3})*(?:\.\d+)?\s+\d+\s*\/\s*\d+|[+-]?\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?|[+-]?\d+(?:,\d{3})*(?:\.\d+)?/g;
  return (source.match(numeric)||[]).map(s=>canonicalNumber(s.trim(),true)).filter(Boolean);
}
export function numberSignature(numbers) {
  return numbers.map(value=>canonicalNumber(value,true)).filter(Boolean).sort().join('|');
}
const signedSkills=new Set(['N-OPP','N-ABS','N-ORDER','N-COORD','N-REFLECT','N-DIST','E-INEQ','N-ADD','N-MULT']);
function inferSkills(row, text) {
  if(row.skill && SKILLS[row.skill]) return { skills:[row.skill], inferred:false };
  const s = normalizeText(text), selected = new Set();
  const include=(condition,...ids)=>{if(condition)ids.forEach(id=>selected.add(id));};
  const fractionIn=/\d+\s*\/?\s*\d*\s*\/\s*\d+/.test(s);
  include(/opposite|negative of|^-\s*\(/.test(s),'N-OPP');
  include(/absolute|\|\s*-?\d/.test(s),'N-ABS');
  include(/order.*(least|greatest|cold|warm|number)|compare.*(negative|signed)|[<>_].*-\d|-\d.*[<>_]/.test(s),'N-ORDER');
  include(/reflect|reflection/.test(s),'N-REFLECT');
  include(/coordinate|quadrant|ordered pair|plot.*point/.test(s),'N-COORD');
  include(/distance.*point|points.*distance/.test(s),'N-DIST');
  include(/inequal|number line|[≤≥]/.test(s),'E-INEQ');
  include(/statistical|vary|variability/.test(s),'S-QUESTION');
  include(/dot plot|histogram|frequency|data display/.test(s),'S-DISPLAY');
  include(/mean|average|fair share/.test(s),'S-MEAN');
  include(/median|middle value/.test(s),'S-MEDIAN');
  include(/unusual|outlier|mean or median/.test(s),'S-CENTER');
  include(/\brange\b/.test(s),'S-RANGE');
  include(/quartile|\biqr\b|interquartile/.test(s),'S-IQR');
  include(/box plot|five.number summary/.test(s),'S-BOX');
  include(/\bmad\b|mean absolute deviation/.test(s),'S-MAD');
  include(/spread|compare.*data|data.*compare/.test(s),'S-SPREAD');
  include(/parallelogram/.test(s),'G-PARA');
  include(/triangle/.test(s),'G-TRI');
  include(/composite|corner.*(cut|remov)|l.shape/.test(s),'G-COMP');
  include(/surface area|\bnet\b|pyramid/.test(s),'G-SA');
  include(/perimeter/.test(s),'G-PERIM');
  include(/volume/.test(s),'G-VOL');
  include(/circumference|around.*circle/.test(s),'G-CIRC');
  include(/circle.*area|area.*circle|radius|diameter/.test(s),'G-CAREA','G-CIRC');
  include(/map|drawing scale/.test(s),'P-MAP');
  include(/scale|scaled|copy|copies/.test(s),'P-SCALE','P-MAP');
  include(/proportion|\bk\b|y\s*=|through.*origin/.test(s),'P-PROP','E-GRAPH');
  include(/input|output|dependent|rule|table|graph/.test(s),'E-RELATE','E-GRAPH');
  include(/expand|distribut|\d+\s*\([a-z].*[+*-]/.test(s),'E-DIST');
  include(/factor|greatest common factor/.test(s),'E-FACTOR');
  include(/like terms|equivalent|simplify.*[a-z]|\d+[a-z]\s*[+-]\s*\d+[a-z]/.test(s),'E-LIKE');
  include(/exponent|power|squared|square.*fraction|\^|[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(text),'E-EXP','E-ORDER');
  include(/order of operations|evaluate|\(.+\).*[*/+]|[*/].*[+]/.test(s),'E-ORDER');
  include(/solve|equation|[a-z]\s*[+=]|\d+[a-z].*=/.test(s),'E-SOLVE','E-STORY','E-2STEP');
  include(/ratio|\d+\s*:\s*\d+/.test(s),'R-RATIO');
  include(/per |each|cost.*one|unit rate|equally/.test(s),'R-RATE');
  include(/percent|%/.test(s),'P-PERCENT');
  include(/increase|decrease|discount|sale|original price/.test(s),'P-CHANGE');
  include(/full|whole|part.*of|of .* is/.test(s),'F-WHOLE');
  include(fractionIn && /[+]/.test(s),'F-ADD');
  include(fractionIn && /-|subtract/.test(s),'F-SUB','F-ADD');
  include(fractionIn && /[*]|multiply|of/.test(s),'F-MULT');
  include(fractionIn && /÷|divide|scoop/.test(text),'F-DIV');
  include(fractionIn && /[<>_]|compare/.test(s),'F-COMP');
  include(/÷|divide|share|equally/.test(text),'D-LONG','D-DIV','N-DIV');
  include(/\d+\.\d+/.test(s) && /-|subtract|left|cut|change/.test(s),'D-SUB');
  include(/[-−]\s*\d/.test(text) && /[+−-]/.test(s),'N-ADD');
  include(/[-−]\s*\d/.test(text) && /[×*]|multiply/.test(text),'N-MULT');
  include(/warm.up/.test(String(row.section??row.source).toLowerCase()),'WARMUP');
  include(/^(?:find\s+)?[\d.,\s]+[×*+]\s*[\d.,\s]+[.]?$/.test(String(text).toLowerCase()) || /^(double|half of)\b/.test(s),'WARMUP');
  if(selected.size) return {skills:[...selected],inferred:true};
  // A solution step inherits its example's kind, rather than becoming unrelated math.
  if(text !== row.question && row.question) return inferSkills({...row,question:undefined},row.question);
  const weekday=['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'].indexOf(row.weekday);
  if(Number.isInteger(row.week)&&row.week>=1&&row.week<=10&&weekday>=0) {
    const focus=Array.from({length:row.week},(_,index)=>[...dayInfo(index*7).focus,...dayInfo(index*7+1).focus]).flat();
    const skills=[...focus,...STRENGTHS];
    return {skills:[...new Set(skills)],inferred:true,ambiguous:true};
  }
  // Unidentified material without a lesson context gets every skill.
  return {skills:[...Object.keys(SKILLS),'WARMUP'],inferred:true,ambiguous:true};
}
function isSubset(needle, haystack) {
  const remaining=[...haystack];
  for(const item of needle) { const index=remaining.indexOf(item); if(index<0)return false; remaining.splice(index,1); }
  return true;
}
export function buildExclusions(data) {
  const rows=Array.isArray(data)?data:data?.questions;
  if(!Array.isArray(rows)||!rows.length)throw new Error('Paper corpus is missing or empty.');
  if(data.count!==undefined && data.count!==rows.length)throw new Error('Paper corpus count does not match its questions.');
  const exact = new Set(), bySkill = new Map(), stats={records:rows.length,segments:0,inferred:0,ambiguous:0};
  for(const [index,row] of rows.entries()) {
    if(typeof row.question!=='string'&&!row.prompt)throw new Error(`Paper record ${index} has no question text.`);
    // Slide steps can contain a second worked example. Answers are never used.
    const texts=[row.question??row.prompt,...(Array.isArray(row.steps)?row.steps:[]),...(Array.isArray(row.work)?row.work:[])];
    for(const text of texts) {
      const normalized=normalizeText(text);if(!normalized)continue;
      exact.add(normalized); const numeric=extractNumbers(text); const guessed=inferSkills(row,text);
      stats.segments++;stats.inferred+=Number(guessed.inferred);stats.ambiguous+=Number(guessed.ambiguous??false);
      if(!numeric.length)continue;
      for(const skill of guessed.skills) {
        if(!bySkill.has(skill))bySkill.set(skill,[]);
        const numbers=numeric.map(value=>canonicalNumber(value,signedSkills.has(skill)));
        // Generators may represent a fraction as its numerator and denominator.
        // Keep both that representation and its exact reduced value for comparison.
        for(const value of [...numbers]) {
          const rational=parseNumber(value);
          if(rational.d!==1n)numbers.push(String(rational.n),String(rational.d));
        }
        bySkill.get(skill).push({numbers,sourceIndex:index,source:row.source??'paper'});
      }
    }
  }
  return {exact,bySkill,stats};
}
export function overlaps(question, exclusions) {
  const prompt=normalizeText(question.plainPrompt??question.prompt);
  const complete=normalizeText(questionIdentity(question).replaceAll('|',' '));
  if(exclusions.exact.has(prompt)||exclusions.exact.has(complete))return {kind:'text'};
  const numbers=(question.numbers??extractNumbers(question.plainPrompt??question.prompt)).map(value=>canonicalNumber(value,signedSkills.has(question.skill))).filter(Boolean);
  if(!numbers.length)return null;
  for(const source of exclusions.bySkill.get(question.skill)??[]) {
    if(isSubset(numbers,source.numbers))return {kind:'numbers',sourceIndex:source.sourceIndex,source:source.source};
  }
  return null;
}
