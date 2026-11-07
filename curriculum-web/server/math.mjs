// Exact arithmetic shared by the server-only generators and answer checker.
export function gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; }
export function rational(n, d = 1) {
  if (n && typeof n === 'object' && 'n' in n) return rational(n.n, n.d);
  if (typeof n === 'number' && !Number.isInteger(n)) { const p = parseNumber(String(n)); if (!p) throw new Error('Invalid rational'); return div(p, rational(d)); }
  n = BigInt(n); d = BigInt(d); if (!d) throw new Error('Zero denominator');
  if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g };
}
export function parseNumber(value) {
  const s = String(value ?? '').trim().replaceAll('−', '-').replaceAll('⁄', '/').replaceAll('−', '-');
  if (!s || s.length > 100) return null;
  let m;
  try {
    if ((m = /^([+-]?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s))) {
      const den = BigInt(m[4]), num = BigInt(m[3]); if (!den || num >= den) return null;
      return rational((BigInt(m[2]) * den + num) * (m[1] === '-' ? -1n : 1n), den);
    }
    if ((m = /^([+-]?\d+)\s*\/\s*([+-]?\d+)$/.exec(s))) return BigInt(m[2]) ? rational(m[1], m[2]) : null;
    if ((m = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))$/.exec(s))) {
      const decimals = m[3] ?? m[4] ?? ''; const whole = m[2] ?? '0';
      return rational(BigInt(whole + decimals) * (m[1] === '-' ? -1n : 1n), 10n ** BigInt(decimals.length));
    }
    // Grouped whole numbers are accepted only with correctly placed commas.
    if (/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(s)) return parseNumber(s.replaceAll(',', ''));
  } catch { return null; }
  return null;
}
const asR = a => typeof a === 'object' && a !== null && 'n' in a ? a : (parseNumber(String(a)) ?? rational(a));
export const add = (a,b) => { a=asR(a); b=asR(b); return rational(a.n*b.d+b.n*a.d,a.d*b.d); };
export const sub = (a,b) => { a=asR(a); b=asR(b); return rational(a.n*b.d-b.n*a.d,a.d*b.d); };
export const mul = (a,b) => { a=asR(a); b=asR(b); return rational(a.n*b.n,a.d*b.d); };
export const div = (a,b) => { a=asR(a); b=asR(b); return rational(a.n*b.d,a.d*b.n); };
export const eq = (a,b) => { a=asR(a); b=asR(b); return a.n*b.d===b.n*a.d; };
export const compare = (a,b) => { a=asR(a); b=asR(b); const d=a.n*b.d-b.n*a.d; return d<0n?-1:d>0n?1:0; };
export const abs = a => { a=asR(a); return rational(a.n<0n?-a.n:a.n,a.d); };
export const pow = (a,k) => { a=asR(a); return rational(a.n**BigInt(k),a.d**BigInt(k)); };
export const fraction = a => { a=asR(a); return a.d===1n?String(a.n):`${a.n}/${a.d}`; };
export function format(a) {
  a=asR(a); let d=a.d, twos=0, fives=0; while(d%2n===0n){d/=2n;twos++;} while(d%5n===0n){d/=5n;fives++;}
  if(d!==1n) return fraction(a); const places=Math.max(twos,fives); if(!places) return String(a.n);
  const scaled=(a.n<0n?-a.n:a.n)*2n**BigInt(places-twos)*5n**BigInt(places-fives);
  const digits=String(scaled).padStart(places+1,'0');
  return `${a.n<0n?'-':''}${digits.slice(0,-places)}.${digits.slice(-places)}`.replace(/0+$/,'').replace(/\.$/,'');
}
export function isSimplest(value) {
  const s=String(value).trim().replaceAll('−','-'); const m=/(\d+)\s*\/\s*([+-]?\d+)$/.exec(s);
  if (!m) return true; const d=BigInt(m[2]); return d>0n && gcd(BigInt(m[1]),d)===1n;
}
