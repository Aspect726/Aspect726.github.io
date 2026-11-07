import { parseNumber, format, fraction } from '../math.mjs';
export const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function rng(seed) {
  let state=2166136261; for(const c of String(seed)){state^=c.charCodeAt(0);state=Math.imul(state,16777619);}
  const next=()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  const r={int:(min,max)=>Math.floor(next()*(max-min+1))+min,pick:arr=>arr[Math.floor(next()*arr.length)],shuffle:arr=>{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}};return r;
}
export const shapes=['calculation','story','missing','mistake','reason'];
export function math(value) {
  const s=typeof value==='object'?fraction(value):String(value); const p=parseNumber(s);
  if (!p) return `<math xmlns="http://www.w3.org/1998/Math/MathML" aria-label="${escapeHTML(s)}"><mtext>${escapeHTML(s.replaceAll('-','−'))}</mtext></math>`;
  let body;
  const mixed=/^([+-]?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s);
  const f=/^([+-]?)(\d+)\s*\/\s*(\d+)$/.exec(s);
  if(mixed)body=`${mixed[1]==='-'?'<mo>−</mo>':''}<mn>${mixed[2]}</mn><mfrac><mn>${mixed[3]}</mn><mn>${mixed[4]}</mn></mfrac>`;
  else if(f)body=`${f[1]==='-'?'<mo>−</mo>':''}<mfrac><mn>${f[2]}</mn><mn>${f[3]}</mn></mfrac>`;
  else {const [integer,decimal]=s.replaceAll('-','−').split('.');body=`<mn>${escapeHTML(integer.replace(/\B(?=(\d{3})+(?!\d))/g,','))}${decimal!==undefined?'.'+escapeHTML(decimal):''}</mn>`;}
  return `<math xmlns="http://www.w3.org/1998/Math/MathML" aria-label="${escapeHTML(s)}"><mrow>${body}</mrow></math>`;
}
export const frac=(n,d)=>math(`${n}/${d}`);
export const expression = (html, label) => `<math xmlns="http://www.w3.org/1998/Math/MathML" aria-label="${escapeHTML(label)}"><mrow>${html}</mrow></math>`;
export const name = r => r.pick(['Maya','Leo','Ari','Nora','Sam','Ivy','Omar','Zoe']);
export function makeQuestion(q) {
  const numbers=(q.numbers??[]).map(x=>{const p=parseNumber(String(x));return p?fraction(p):String(x);});
  const answer=typeof q.answer==='object'?format(q.answer):String(q.answer);
  return { ...q, answer, numbers, plainPrompt:q.plainPrompt??q.prompt.replace(/<[^>]+>/g,' '), hint:q.hint??'Check what each number represents.', solution:q.solution??[], hints:q.hints??[], signature:`${q.skill}:${[...numbers].sort().join('|')}` };
}
