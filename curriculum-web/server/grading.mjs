/** Exact, bounded math grading. No student input is evaluated as JavaScript. */
const MAX = 256;
const abs = n => n < 0n ? -n : n;
const gcd = (a, b) => { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a; };
function rational(n, d = 1n) {
  if (!d) throw new Error('A denominator cannot be zero.');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
const add = (a,b) => rational(a.n*b.d+b.n*a.d,a.d*b.d);
const mul = (a,b) => rational(a.n*b.n,a.d*b.d);
const neg = a => ({n:-a.n,d:a.d});
const eq = (a,b) => a.n===b.n && a.d===b.d;
const zero = () => rational(0n);
function clean(value) {
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Enter a mathematical answer.');
  const s=String(value).trim();
  if (!s || s.length>MAX) throw new Error('Enter an answer using at most 256 characters.');
  return s.replace(/−|–/g,'-').replace(/÷/g,'/').replace(/×|·/g,'*').replace(/[{}]/g,'').replace(/\u00a0/g,' ');
}
function decimal(s) {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) throw new Error('Use a number, fraction, mixed number, or decimal.');
  const negative=s.startsWith('-');
  s=s.replace(/^[+-]/,'');
  const [whole, fraction='']=s.split('.');
  if ((whole+fraction).length>80) throw new Error('This number is too long.');
  return rational((negative?-1n:1n)*BigInt((whole||'0')+fraction),10n**BigInt(fraction.length));
}
export function parseRational(value) {
  let s=clean(value), percent=false;
  if(s.endsWith('%')) { percent=true;s=s.slice(0,-1).trim(); }
  let result;
  const mixed=s.match(/^([+-]?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  const fraction=s.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*\/\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
  if(mixed) {
    const d=BigInt(mixed[4]),n=BigInt(mixed[3]);
    if(!d || n>=d) throw new Error('Use a proper fraction after the whole number.');
    result=rational((mixed[1]==='-'?-1n:1n)*(BigInt(mixed[2])*d+n),d);
  } else if(fraction) {
    const a=decimal(fraction[1]),b=decimal(fraction[2]);
    if(!b.n) throw new Error('A denominator cannot be zero.');
    result=rational(a.n*b.d,a.d*b.n);
  } else result=decimal(s);
  return percent?mul(result,rational(1n,100n)):result;
}
const unitAliases = new Map([
  ['centimeter','cm'],['centimeters','cm'],['centimetre','cm'],['centimetres','cm'],
  ['meter','m'],['meters','m'],['metre','m'],['metres','m'],['kilometer','km'],['kilometers','km'],
  ['liter','l'],['liters','l'],['litre','l'],['litres','l'],['milliliter','ml'],['milliliters','ml'],
  ['inch','in'],['inches','in'],['foot','ft'],['feet','ft'],['yard','yd'],['yards','yd'],
  ['dollar','$'],['dollars','$'],['usd','$'],['cent','cent'],['cents','cent'],
  ['hour','h'],['hours','h'],['hr','h'],['hrs','h'],['minute','min'],['minutes','min'],
  ['second','s'],['seconds','s'],['sec','s'],['mile','mile'],['miles','mile'],
  ['gram','g'],['grams','g'],['kilogram','kg'],['kilograms','kg'],['degree','°'],['degrees','°'],
]);
function normalizeUnits(value) {
  return String(value??'').trim().toLowerCase().replace(/²/g,'^2').replace(/³/g,'^3')
    .replace(/\bsquare\s+([a-z]+)/g,'$1^2').replace(/\bcubic\s+([a-z]+)/g,'$1^3')
    .replace(/\bsq\.?\s*([a-z]+)/g,'$1^2').replace(/\bper\b/g,'/')
    .replace(/[a-z]+/g,m=>unitAliases.get(m)||m.replace(/s$/,''))
    .replace(/\s+/g,'');
}
const quantityWords=new Set(('square cubic sq per of a an unit units cm m mm km in ft yd l ml kg g h min s °c '+
  'cup cups piece pieces muffin muffins scoop scoops bar bars tile tiles bead beads marble marbles sticker stickers '+
  'point points shell shells lap laps runner runners builder builders shelf shelves nut nuts book books marker markers '+
  'serving servings group groups notebook notebooks bag bags can cans yellow green red blue white gold silver water juice '+
  'seed seeds oat oats dollar dollars cent cents each').split(' '));
function safeUnitSuffix(value) {
  const suffix=String(value).trim().replace(/\.$/,'').toLowerCase().replace(/[²³]/g,'').replace(/\^[23]/g,'').replace(/\//g,' ');
  if(/[0-9,;:=]/.test(suffix))return false;
  const words=suffix.split(/\s+/);
  return words.length<=4 && words.every(word=>quantityWords.has(word)||unitAliases.has(word));
}
function quantity(value) {
  const s=clean(value);
  try { return {value:parseRational(s),text:s,units:''}; } catch {}
  const money=s.match(/^\$\s*(.+)$/);
  if(money) return {value:parseRational(money[1]),text:money[1],units:'$'};
  const m=s.match(/^([+-]?(?:\d+\s+\d+\s*\/\s*\d+|(?:\d+(?:\.\d*)?|\.\d+)(?:\s*\/\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+))?%?))\s*([a-zA-Z°][a-zA-Z°²³^\d\s/.-]*)$/);
  if(!m||!safeUnitSuffix(m[2])) throw new Error('Enter a number and, when requested, its units.');
  return {value:parseRational(m[1]),text:m[1],units:normalizeUnits(m[2].replace(/\.$/,''))};
}
function failure(feedback,extra={}) { return {status:'incorrect',correct:false,feedback,...extra}; }
function review(feedback='Your teacher will check this answer and your reasoning.',extra={}) { return {status:'teacher_review',correct:null,feedback,...extra}; }
function success(extra={}) { return {status:'correct',correct:true,equivalent:true,formatValid:true,feedback:'That’s correct. Your answer matches the required value.',...extra}; }
const normalizeText=s=>String(s??'').trim().toLowerCase().replace(/[{}]/g,'').replace(/\s+/g,' ').replace(/[.。]$/,'');
function numericGrade(expected,input,rules) {
  const a=quantity(expected),b=quantity(input);
  let same=eq(a.value,b.value);
  if(rules.tolerance!==undefined) {
    const t=parseRational(rules.tolerance);
    if(t.n<0n) throw new Error('Invalid grading tolerance.');
    const difference=add(a.value,neg(b.value));
    same=abs(difference.n)*t.d<=t.n*difference.d;
  }
  if(!same) return failure('The value needs another look. Check the quantities and try one step at a time.',{equivalent:false});
  const expectedUnits=normalizeUnits(rules.units||a.units);
  if(b.units && expectedUnits && b.units!==expectedUnits) return failure('Check the units. Use the unit requested in the question.',{equivalent:true,formatValid:false});
  if(b.units && !expectedUnits) return review('The value matches; your teacher will check the extra units.',{equivalent:true});
  if(rules.requireUnits && !b.units) return failure('The value matches. Add the requested units to finish your answer.',{equivalent:true,formatValid:false});
  const text=b.text.replace(/\s+/g,' ');
  if(rules.requireSimplified) {
    const f=text.match(/(?:^|\s)([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
    if(f && (gcd(BigInt(f[1]),BigInt(f[2]))!==1n || BigInt(f[2])<0n)) return failure('The value matches. Reduce the fraction to simplest form.',{equivalent:true,formatValid:false});
  }
  if(rules.requireFraction && !/\//.test(text)) return failure('The value matches. Write it as a fraction.',{equivalent:true,formatValid:false});
  if(rules.requireMixed && abs(b.value.n)>b.value.d && b.value.d!==1n && !/^[+-]?\d+ \d+\s*\/\s*\d+$/.test(text)) return failure('The value matches. Write it as a mixed number.',{equivalent:true,formatValid:false});
  if(rules.decimalPlaces!==undefined) {
    const n=rules.decimalPlaces;
    if(!Number.isInteger(n)||n<0||n>12) return review('This rounding rule needs a teacher check.');
    const pattern=n===0?/^[+-]?\d+$/:new RegExp('^[+-]?\\d+\\.\\d{'+n+'}$');
    if(!pattern.test(text)) return failure(`The value matches. Write it with ${n} decimal ${n===1?'place':'places'}.`,{equivalent:true,formatValid:false});
  }
  if(rules.requirePercent && !text.endsWith('%')) return failure('The value matches. Write the answer as a percentage.',{equivalent:true,formatValid:false});
  return success();
}
function list(value) {
  if(Array.isArray(value)) return value;
  const s=clean(value).replace(/^(?:left to right|least to greatest|ordered)\s*:\s*/i,'').replace(/^\(|\)$/g,'');
  return s.split(/\s*(?:,|;|<)\s*/);
}
function relation(value) {
  const s=clean(value).replace(/≤/g,'<=').replace(/≥/g,'>=');
  if(/^(<|>|=|<=|>=)$/.test(s)) return {operator:s};
  const word=normalizeText(s);
  if(['less than','smaller than','less'].includes(word)) return {operator:'<'};
  if(['greater than','larger than','greater'].includes(word)) return {operator:'>'};
  if(['equal','equal to','same'].includes(word)) return {operator:'='};
  const m=s.match(/^(.+?)\s*(<=|>=|<|>|=)\s*(.+)$/);
  if(m && !/[<>=]/.test(m[1]+m[3])) return {operator:m[2],left:parseRational(m[1]),right:parseRational(m[3])};
  throw new Error('Use <, >, or =, or write the complete comparison.');
}
// Sparse exact polynomials. A term key lists variables and nonnegative powers.
function monomial(key) { return key?Object.fromEntries(key.split('*').map(p=>{const[v,e]=p.split('^');return[v,Number(e)];})):{}; }
function monoKey(m) { return Object.keys(m).sort().filter(k=>m[k]).map(k=>`${k}^${m[k]}`).join('*'); }
function polyConstant(r) { return r.n?new Map([['',r]]):new Map(); }
function polyAdd(a,b) {
  const r=new Map(a);for(const[k,v]of b){const next=add(r.get(k)||zero(),v);if(next.n)r.set(k,next);else r.delete(k);}return r;
}
function polyScale(a,s) { return new Map([...a].map(([k,v])=>[k,mul(v,s)]).filter(([,v])=>v.n)); }
function polyMul(a,b) {
  if(a.size*b.size>200) throw new Error('Expression is too complex for automatic grading.');
  let r=new Map();for(const[ka,va]of a)for(const[kb,vb]of b){const m=monomial(ka);for(const[k,e]of Object.entries(monomial(kb)))m[k]=(m[k]||0)+e;if(Object.values(m).some(e=>e>12))throw new Error('Exponent is too large.');r=polyAdd(r,new Map([[monoKey(m),mul(va,vb)]]));}return r;
}
export function parsePolynomial(value) {
  let source=clean(value).replace(/π/g,'pi').replace(/²/g,'^2').replace(/³/g,'^3').replace(/\*\*/g,'^');
  const raw=source.match(/(?:\d+(?:\.\d*)?|\.\d+)|pi|[a-z]|[()+\-*/^]/g)||[];
  if(raw.join('')!==source.replace(/\s+/g,'')||raw.length>96) throw new Error('This expression needs teacher review.');
  const tokens=[];for(const token of raw){const prev=tokens.at(-1);if(prev && (/^(?:\d|\.|[a-z]|\))/.test(prev)) && (/^[a-z(]/.test(token))) tokens.push('*');tokens.push(token);}
  let index=0,depth=0;
  const peek=()=>tokens[index];
  const eat=()=>tokens[index++];
  function primary(){if(++depth>20)throw new Error('Expression nesting is too deep.');const t=eat();let r;if(t==='('){r=sum();if(eat()!==')')throw new Error('Close each parenthesis.');}else if(/^(?:\d|\.)/.test(t||''))r=polyConstant(decimal(t));else if(/^(pi|[a-z])$/.test(t||''))r=new Map([[`${t}^1`,rational(1n)]]);else throw new Error('Check the expression notation.');depth--;return r;}
  function power(){let r=primary();if(peek()==='^'){eat();const e=eat();if(!/^\d+$/.test(e||'')||Number(e)>8)throw new Error('Use a whole-number exponent from 0 to 8.');let product=polyConstant(rational(1n));for(let n=0;n<Number(e);n++)product=polyMul(product,r);r=product;}return r;}
  function unary(){if(peek()==='+'){eat();return unary();}if(peek()==='-'){eat();return polyScale(unary(),rational(-1n));}return power();}
  function product(){let a=unary();while(peek()==='*'||peek()==='/'){const op=eat(),b=unary();if(op==='*')a=polyMul(a,b);else {if(b.size!==1||!b.has('')||!b.get('').n)throw new Error('Variable denominators need teacher review.');const x=b.get('');a=polyScale(a,rational(x.d,x.n));}}return a;}
  function sum(){let a=product();while(peek()==='+'||peek()==='-'){const op=eat(),b=product();a=polyAdd(a,op==='-'?polyScale(b,rational(-1n)):b);}return a;}
  if(!tokens.length)throw new Error('Enter an expression.');const result=sum();if(index!==tokens.length)throw new Error('Check the expression notation.');return result;
}
function polyEq(a,b){return a.size===b.size&&[...a].every(([k,v])=>b.has(k)&&eq(v,b.get(k)));}
function equation(value){const pieces=clean(value).split('=');if(pieces.length!==2)throw new Error('Write both sides of the equation.');return polyAdd(parsePolynomial(pieces[0]),polyScale(parsePolynomial(pieces[1]),rational(-1n)));}
function equationEq(a,b){if(!a.size||!b.size)return !a.size&&!b.size;const key=[...a.keys()].sort()[0];if(!b.has(key))return false;const av=a.get(key),bv=b.get(key);return polyEq(polyScale(a,rational(av.d,av.n)),polyScale(b,rational(bv.d,bv.n)));}
export function inferGrading(question) {
  if(question.grading?.type) return question.grading;
  const answer=question.answer??question.expectedAnswer;
  const prompt=question.prompt??question.text??'';
  const base={expected:answer};
  const needsConstruction=/\b(explain|justify|draw|sketch|prove|reasoning|plot|show)\b/i.test(prompt)||(/\bplace\b/i.test(prompt)&&/\b(line|plane|grid)\b/i.test(prompt));
  if(question.challenge || needsConstruction)return {...base,type:'teacher-review'};
  try {
    const q=quantity(answer);
    const places=prompt.match(/(?:to |nearest )(tenth|hundredth|thousandth|whole number|integer)/i);
    const digits=prompt.match(/(?:to |using )(\d+) decimal places?/i);
    const decimalPlaces=digits?Number(digits[1]):places?({tenth:1,hundredth:2,thousandth:3,'whole number':0,integer:0}[places[1].toLowerCase()]):undefined;
    return {...base,type:'number',...(q.units?{units:q.units}:{}),
      requireSimplified:/simpl(?:est|ify|ified)/i.test(prompt),requireMixed:/mixed[ -]number/i.test(prompt),
      requireFraction:/\b(as a fraction|fraction form)\b/i.test(prompt),requirePercent:/\b(as a percent|as a percentage|percent form)\b/i.test(prompt),
      requireUnits:/\b(include units|with units|label the units)\b/i.test(prompt),
      ...(decimalPlaces===undefined?{}:{decimalPlaces})};
  }catch{}
  try { relation(answer);return {...base,type:'comparison'}; }catch{}
  if(typeof answer==='string'&&/^[\d\s.{}+\-/:]+$/.test(answer)&&answer.includes(':'))return {...base,type:'ratio'};
  try {const values=list(answer);if(values.length>1&&values.every(v=>{parseRational(v);return true;}))return {...base,type:'ordered-list'};}catch{}
  if(typeof answer==='string' && /[a-zπ]/.test(answer) && !/[a-z]{2,}/.test(answer.replace(/pi/g,''))) {
    try {if(answer.includes('=')){equation(answer);return {...base,type:'equation'};}parsePolynomial(answer);return {...base,type:'expression',requireSimplified:/simpl(?:est|ify|ified)|combine like terms/i.test(prompt),requireExpanded:/\bexpand/i.test(prompt)};}catch{}
  }
  return {...base,type:'teacher-review'};
}
export function gradeAnswer(question,response) {
  const rules=inferGrading(question), expected=rules.expected??rules.answer??question.answer??question.expectedAnswer;
  const raw=typeof response==='object'&&response!==null&&!Array.isArray(response)?response.answer??response.value??'':response;
  if(rules.type==='multipart') {
    const parts=rules.parts??question.parts;
    if(!Array.isArray(parts)||!parts.length)return review('Your teacher will review each part of this challenge.');
    const supplied=response?.parts??response;
    const results=parts.map((part,i)=>({id:part.id??String(i+1),...gradeAnswer(part,Array.isArray(supplied)?supplied[i]:supplied?.[part.id??String(i+1)])}));
    const allCorrect=results.every(p=>p.status==='correct'),needsReview=results.some(p=>p.status==='teacher_review');
    return {status:allCorrect?'correct':needsReview?'teacher_review':'incorrect',correct:allCorrect?true:needsReview?null:false,parts:results,feedback:allCorrect?'All parts are correct. This counts as one completed question.':needsReview?'Your teacher will review the indicated parts. This challenge counts as one question.':'Some parts need another look. Keep the correct parts and retry the others.'};
  }
  if(typeof raw!=='string'&&typeof raw!=='number'&&!Array.isArray(raw))return failure('Enter your answer before checking it.');
  if(!Array.isArray(raw)&&!String(raw).trim())return failure('Enter your answer before checking it.');
  if(rules.type==='teacher-review'||rules.type==='teacher_review'||rules.type==='reasoning')return review(undefined,{rubric:rules.rubric??'Check all requested quantities, units, method, and reasoning.'});
  if(expected===undefined||expected===null)return review('The answer key for this question needs a teacher check.');
  let result;
  try {
    switch(rules.type){
      case 'number': case 'fraction': case 'decimal': case 'percent': case 'numeric': result=numericGrade(expected,raw,rules);break;
      case 'comparison':{
        const a=relation(expected),b=relation(raw);
        const same=a.operator===b.operator&&(!b.left||!a.left||(eq(a.left,b.left)&&eq(a.right,b.right)));
        // A bare-key comparison cannot safely validate unrelated full inequalities.
        if(!a.left&&b.left)result=review('Please enter just the comparison symbol, or ask your teacher to check the full comparison.');
        else result=same?success():failure('Check which quantity is larger. Compare both against the same whole or unit.');break;
      }
      case 'ratio':{
        const a=clean(expected).split(':'),b=clean(raw).split(':');if(a.length!==2||b.length!==2)throw new Error('Write the ratio as two values separated by a colon.');
        const aa=a.map(parseRational),bb=b.map(parseRational);if(!aa[1].n||!bb[1].n)throw new Error('This ratio needs teacher review.');
        result=eq(mul(aa[0],bb[1]),mul(bb[0],aa[1]))?success():failure('Check the order of the two quantities and scale both parts by the same factor.');
        if(result.correct&&rules.requireSimplified&&bb.every(v=>v.d===1n)&&gcd(bb[0].n,bb[1].n)!==1n)result=failure('The ratio is equivalent. Reduce both parts to simplest form.',{equivalent:true,formatValid:false});break;
      }
      case 'ordered-list': case 'coordinates':{
        const a=list(expected),b=list(raw);if(a.length!==b.length){result=failure(`Enter all ${a.length} values in the requested order.`);break;}
        const checks=a.map((value,i)=>numericGrade(value,b[i],{...rules,units:undefined,requireUnits:false}));
        result=checks.every(v=>v.correct)?success():failure(rules.type==='coordinates'?'Check the x-coordinate first, then the y-coordinate.':'Check every value and its position in the list.');break;
      }
      case 'expression':{
        result=polyEq(parsePolynomial(expected),parsePolynomial(raw))?success():failure('The expressions are not equivalent. Check distribution, signs, and like terms.');
        if(result.correct&&rules.requireExpanded&&/[()]/.test(String(raw)))result=failure('The expression is equivalent. Expand the brackets to match the requested form.',{equivalent:true,formatValid:false});
        else if(result.correct&&rules.requireSimplified)result=review('The expression is equivalent. Your teacher will check that it is fully simplified.',{equivalent:true});
        break;
      }
      case 'equation':result=equationEq(equation(expected),equation(raw))?success():failure('Check the operation on both sides of the equation.');break;
      default:return review();
    }
  }catch(error){
    if(rules.type==='expression'||rules.type==='equation')return review('This form needs a teacher check. Your answer has been kept for review.');
    return failure(error.message||'Check the answer format and try again.');
  }
  if(result.correct&&(rules.requiresReasoning||rules.requiresReview))return review('The mathematical answer matches. Your teacher will check the explanation or diagram.',{equivalent:true,formatValid:true});
  if(!result.correct&&question.commonMistake?.answer&&normalizeText(raw)===normalizeText(question.commonMistake.answer)) {
    result.feedback=`This answer can happen when ${question.commonMistake.feedback||'one of the steps uses the wrong quantity'}. Check your method before trying again.`;
  }
  return result;
}
export const grade = gradeAnswer;
