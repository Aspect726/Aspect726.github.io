import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion, publicQuestion, gradeQuestion, allSkills } from '../server/questions.mjs';
import { geometrySkills } from '../server/generators/geometry.mjs';
import { math } from '../server/generators/common.mjs';

const shapes = ['calculation', 'story', 'missing', 'mistake', 'reason'];
const decode = s => String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replaceAll('−', '-');
const plain = s => decode(String(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const mathLabels = html => [...html.matchAll(/<math\b[^>]*aria-label="([^"]+)"/g)].map(m => decode(m[1]));

// Deliberately independent from the answer checker's parser.
function rationalKey(value) {
  const s = String(value).replaceAll('−', '-').replaceAll(',', '').trim();
  let n, d;
  if (/^[+-]?\d+\/\d+$/.test(s)) [n, d] = s.split('/').map(BigInt);
  else if (/^[+-]?\d+(?:\.\d+)?$/.test(s)) {
    const [whole, decimal = ''] = s.split('.');
    n = BigInt(whole.replace(/^[+-]/, '') + decimal) * (whole.startsWith('-') ? -1n : 1n);
    d = 10n ** BigInt(decimal.length);
  } else return null;
  if (!d) return null;
  let a = n < 0n ? -n : n, b = d;
  while (b) [a, b] = [b, a % b];
  return `number:${n / a}/${d / a}`;
}

// These generators use only linear expression choices. Compare their meaning,
// rather than trusting different option IDs or different surface spellings.
function linearKey(value) {
  const s = String(value).replace(/\s+/g, '');
  const factored = /^(\d+)\(x\+(\d+)\)$/.exec(s);
  if (factored) return `linear:${BigInt(factored[1])}:${BigInt(factored[1]) * BigInt(factored[2])}`;
  if (!s.includes('x') || !/^[\dx+]+$/.test(s)) return null;
  let coefficient = 0n, constant = 0n;
  for (const term of s.split('+')) {
    if (/^\d*x$/.test(term)) coefficient += BigInt(term.slice(0, -1) || '1');
    else if (/^\d+$/.test(term)) constant += BigInt(term);
    else return null;
  }
  return `linear:${coefficient}:${constant}`;
}

const semanticKey = s => rationalKey(s) ?? linearKey(s) ?? `text:${plain(s).toLowerCase().replace(/\s/g, '')}`;
function choiceMeaning(choice, skill) {
  const labels = mathLabels(choice.label);
  if (['E-DIST', 'E-FACTOR', 'E-LIKE'].includes(skill) && labels.length === 1) return semanticKey(labels[0]);
  return semanticKey(plain(choice.label));
}

test('Every generated choice is unique in meaning; wrong hints are distinct and actually wrong', () => {
  for (const skill of allSkills) {
    for (let seed = 0; seed < 100; seed++) {
      const q = generateQuestion(skill, seed, { shape: shapes[seed % shapes.length], difficulty: 2 });
      const where = `${skill} seed ${seed} ${q.shape}`;
      assert.ok(q.hints.length >= 3, where);
      assert.equal(new Set(q.hints.map(h => semanticKey(h.answer))).size, q.hints.length, `${where}: equivalent hints`);
      for (const h of q.hints) assert.equal(gradeQuestion(q, h.answer).correct, false, `${where}: a hint targets a correct answer`);
      if (q.choices) {
        const meanings = q.choices.map(c => choiceMeaning(c, skill));
        assert.equal(new Set(meanings).size, meanings.length, `${where}: equivalent option labels`);
        const visible = publicQuestion(q);
        assert.equal(visible.choices.filter(c => gradeQuestion(q, c.value).correct).length, 1, `${where}: exactly one accepted choice`);
        for (const c of visible.choices) assert.match(c.value, /^option-\d+$/, `${where}: neutral public option IDs`);
      }
    }
  }
});

test('Known duplicate expression and reflection seeds stay unambiguous', () => {
  for (const [skill, seed] of [['E-DIST', 94], ['E-LIKE', 70], ['N-REFLECT', 0]]) {
    for (const shape of shapes) {
      const q = generateQuestion(skill, seed, { shape, difficulty: 2 });
      const meanings = q.choices.map(c => choiceMeaning(c, skill));
      assert.equal(new Set(meanings).size, meanings.length, `${skill}/${shape}: ${meanings.join(', ')}`);
    }
  }
});

test('Missing-quotient questions give the dividend, not the answer as an equal factor', () => {
  for (const skill of ['D-LONG', 'N-DIV']) for (let seed = 0; seed < 20; seed++) {
    const q = generateQuestion(skill, seed, { shape: 'missing', difficulty: 2 });
    const labels = mathLabels(q.prompt);
    assert.equal(labels.length, 2, `${skill} seed ${seed}: only divisor and dividend should be given`);
    assert.ok(labels.some(label => rationalKey(label) === rationalKey(q.verification.a)), 'Dividend is given.');
    assert.ok(labels.some(label => rationalKey(label) === rationalKey(q.verification.b)), 'Divisor is given.');
    assert.ok(labels.every(label => rationalKey(label) !== rationalKey(q.answer)), 'Quotient must be found.');
  }
});

test('Geometry reason hints match the visible misconception, and every wrong option has its own hint', () => {
  for (const skill of geometrySkills) {
    const q = generateQuestion(skill, 'content-review', { shape: 'reason', difficulty: 2 });
    assert.equal(q.choices.length, 4, `${skill}: four choices`);
    const wrong = q.choices.filter(c => !gradeQuestion(q, c.value).correct);
    for (const c of wrong) assert.ok(q.hints.some(h => h.answer === c.value), `${skill}: ${plain(c.label)} has a matched hint`);
  }
  const para = generateQuestion('G-PARA', 'content-review', { shape: 'reason' });
  const slant = para.choices.find(c => /slanted side/.test(c.label));
  const border = para.choices.find(c => /four side/.test(c.label));
  assert.match(gradeQuestion(para, slant.value).hint, /slanted|perpendicular/);
  assert.match(gradeQuestion(para, border.value).hint, /perimeter|side lengths/);
});

test('Parallelogram height meets the depicted base segment; geometry text anchors remain inside its viewBox', () => {
  for (const skill of geometrySkills) for (let seed = 0; seed < 100; seed++) {
    const q = generateQuestion(skill, seed, { shape: 'picture', difficulty: 2 });
    if (skill === 'G-PARA') assert.ok(q.model.offset <= q.model.b, 'Perpendicular foot lies on the drawn base.');
    for (const match of q.svg.matchAll(/<text\b([^>]*)>/g)) {
      const [, attrs] = match;
      const x = Number(/\bx="([^"]+)"/.exec(attrs)?.[1]);
      const y = Number(/\by="([^"]+)"/.exec(attrs)?.[1]);
      assert.ok(x >= 0 && x <= 520 && y >= 16 && y <= 284, `${skill}/${seed}: label anchor (${x},${y}) inside diagram`);
    }
  }
});

test('Public questions exclude generator keys and worked feedback', () => {
  for (const skill of allSkills) {
    const q = generateQuestion(skill, 'private-fields');
    const visible = publicQuestion(q);
    for (const field of ['answer', 'hints', 'hint', 'solution', 'model', 'verification', 'numbers', 'generationSeed']) {
      assert.ok(!(field in visible), `${skill} must not expose ${field}`);
    }
  }
});

test('Inequality pictures show the correct ray and whether the boundary belongs', () => {
  const observed = new Set();
  for (let seed = 0; seed < 60; seed++) {
    const q = generateQuestion('E-INEQ', seed, { shape: 'calculation' });
    const { sign } = q.verification;
    observed.add(sign);
    const closed = sign === '≤' || sign === '≥';
    const greater = sign === '>' || sign === '≥';
    const endpoint = /<circle\b([^>]*)>/.exec(q.svg)?.[1] ?? '';
    const fill = /\bfill="([^"]+)"/.exec(endpoint)?.[1];
    assert.match(q.svg, new RegExp(`boundary ${closed ? 'included' : 'excluded'}`));
    assert.match(q.svg, new RegExp(`Values ${greater ? 'greater' : 'less'} than`));
    assert.equal(fill, closed ? '#1F5A63' : '#FBF8F1');
    const ray = /<path\b[^>]*d="M290 85H([\d.]+)[^"]*"[^>]*stroke="#1F5A63"/.exec(q.svg);
    assert.ok(ray, 'The allowed values are shown as a ray.');
    assert.equal(Number(ray[1]) > 290, greater, 'The ray points toward valid values.');
  }
  assert.equal(observed.size, 4);
});

test('Coordinate picture alternatives describe the same horizontal and vertical movement', () => {
  for (let seed = 0; seed < 30; seed++) {
    const q = generateQuestion('N-COORD', seed, { shape: 'calculation' });
    const { x, y } = q.verification;
    const alternative = /aria-label="([^"]+)"/.exec(q.svg)?.[1] ?? '';
    assert.match(alternative, new RegExp(`${Math.abs(x)} units ${x < 0 ? 'left' : 'right'}`));
    assert.match(alternative, new RegExp(`${Math.abs(y)} units ${y < 0 ? 'down' : 'up'}`));
  }
});

test('Expanded opposite and absolute-value number lines keep zero visible with readable tick spacing', () => {
  for (const skill of ['N-OPP', 'N-ABS']) for (let seed = 0; seed < 30; seed++) {
    const q = generateQuestion(skill, seed, { shape: 'calculation' });
    const ticks = [...q.svg.matchAll(/<text x="([\d.]+)" y="102"[^>]*>([^<]+)<\/text>/g)];
    assert.ok(ticks.some(t => t[2] === '0'), `${skill}/${seed}: zero is visible`);
    for (let i = 1; i < ticks.length; i++) assert.ok(Number(ticks[i][1]) - Number(ticks[i - 1][1]) >= 40, 'Number labels have room.');
  }
});

test('Math formatting groups only the integer part and preserves a stacked mixed number', () => {
  assert.match(math('1234.15625'), /<mn>1,234\.15625<\/mn>/);
  assert.doesNotMatch(math('0.15625'), /0\.15,625/);
  const mixed = math('1 3/4');
  assert.match(mixed, /<mn>1<\/mn><mfrac><mn>3<\/mn><mn>4<\/mn><\/mfrac>/);
});
