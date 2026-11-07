import test from 'node:test';
import assert from 'node:assert/strict';
import { generateStatistics, statisticsSkills } from '../server/generators/statistics.mjs';

const shapes = ['calculation', 'story', 'missing', 'mistake', 'reason', 'picture'];

// Independent test arithmetic: do not import the generator's rational helpers.
function gcd(a, b) { a = a < 0n ? -a : a; while (b) [a, b] = [b, a % b]; return a; }
function fraction(n, d = 1n) {
  n = BigInt(n); d = BigInt(d);
  if (d < 0n) { n = -n; d = -d; }
  const divisor = gcd(n, d);
  return [n / divisor, d / divisor];
}
function parse(s) {
  s = String(s);
  if (s.includes('/')) { const [n, d] = s.split('/'); return fraction(n, d); }
  const [whole, decimals = ''] = s.split('.');
  const sign = whole.startsWith('-') ? -1n : 1n;
  return fraction(sign * BigInt(whole.replace('-', '') + decimals), 10n ** BigInt(decimals.length));
}
const plus = (a, b) => fraction(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const minus = (a, b) => fraction(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const dividedBy = (a, n) => fraction(a[0], a[1] * BigInt(n));
const absolute = a => [a[0] < 0n ? -a[0] : a[0], a[1]];
const sum = xs => xs.map(x => Array.isArray(x) ? x : parse(x)).reduce(plus, [0n, 1n]);
const avg = xs => dividedBy(sum(xs), xs.length);
function measures(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mean = avg(sorted), median = avg(sorted.slice(3, 5));
  const q1 = avg(sorted.slice(1, 3)), q3 = avg(sorted.slice(5, 7));
  const distances = sorted.map(x => absolute(minus(parse(x), mean)));
  return { sorted, mean, median, q1, q3, iqr: minus(q3, q1), range: parse(sorted[7] - sorted[0]), mad: avg(distances), distances };
}

function numericOracle(q) {
  const m = q.model;
  if (m.kind === 'statistical-count') return parse(2);
  if (m.kind === 'display-total') return parse(m.frequencies.reduce((a, b) => a + b));
  if (m.kind === 'display-frequency') return parse(m.frequencies[m.target]);
  if (m.kind === 'mean-increase') return fraction(m.increase, 8);
  if (m.kind === 'missing-increase') return parse(m.increase);
  if (m.kind === 'spread-missing-mad') {
    const given = parse(m.givenMad);
    return fraction(given[0] * BigInt(m.factor), given[1]);
  }
  if (m.kind.startsWith('spread-')) {
    const a = measures(m.a), b = measures(m.b);
    if (m.kind === 'spread-range-difference') return minus(b.range, a.range);
    if (m.kind === 'spread-iqr-difference') return minus(b.iqr, a.iqr);
  }
  const s = measures(m.values);
  if (['mean', 'median', 'range', 'iqr', 'mad'].includes(m.kind)) return s[m.kind];
  if (m.kind === 'box' || m.kind === 'missing-iqr') return s.q3;
  if (m.kind === 'missing-box-median') return s.median;
  if (m.kind === 'missing-mean' || m.kind === 'missing-median') return parse(m.values[m.hidden]);
  if (m.kind === 'missing-range') return parse(s.sorted[7]);
  if (m.kind === 'missing-mad') return s.distances[m.hidden];
  throw new Error(`No independent oracle for ${m.kind}`);
}

function choiceOracle(q) {
  if (q.skill === 'S-QUESTION') return ({ story: 'group', missing: 'group', mistake: 'variation', reason: 'variation', picture: 'counts' })[q.shape];
  return ({ 'S-DISPLAY': 'sum', 'S-MEAN': 'mean', 'S-MEDIAN': 'middle', 'S-CENTER': 'median', 'S-RANGE': 'difference', 'S-IQR': 'quartiles', 'S-BOX': 'quarters', 'S-MAD': 'absolute', 'S-SPREAD': 'b' })[q.skill];
}

for (const skill of statisticsSkills) {
  test(`${skill}: 500 seeds, all six shapes, independently checked answers and hints`, () => {
    const observedShapes = new Set();
    for (let seed = 0; seed < 500; seed++) {
      const q = generateStatistics(skill, `statistics-test-${seed}`, { shape: shapes[seed % 6], difficulty: seed % 3 + 1 });
      observedShapes.add(q.shape);
      assert.equal(q.skill, skill);
      assert.equal(q.seed, `statistics-test-${seed}`);
      assert.ok(q.prompt && q.plainPrompt && q.hint);
      assert.ok(q.numbers.length);
      assert.ok(q.solution.length >= 3 && q.solution.length <= 4);
      assert.equal(q.hints.length, 3);
      assert.equal(new Set(q.hints.map(h => h.answer)).size, 3);
      if (q.choices) {
        assert.equal(q.answer, choiceOracle(q), `${skill}/${q.shape}/${seed}`);
        assert.equal(q.choices.length, 4);
        assert.equal(q.choices.filter(c => c.value === q.answer).length, 1);
        assert.equal(new Set(q.choices.map(c => c.value)).size, 4);
        for (const hint of q.hints) {
          assert.ok(q.choices.some(c => c.value === hint.answer));
          assert.notEqual(hint.answer, q.answer);
        }
      } else {
        assert.deepEqual(parse(q.answer), numericOracle(q), `${skill}/${q.shape}/${seed}`);
        for (const hint of q.hints) assert.notDeepEqual(parse(hint.answer), parse(q.answer));
      }
      for (const hint of q.hints) {
        assert.ok(hint.text.length > 10);
        assert.ok(!/Wrong!|Oops|Great job|awesome|master|journey/i.test(hint.text));
      }
      if (q.shape === 'picture') {
        assert.match(q.svg, /<svg[^>]+role="img"/);
        assert.match(q.svg, /<title>/);
        assert.match(q.svg, /<desc>/);
        assert.doesNotMatch(q.svg, /NaN|Infinity|undefined|<script/);
      }
      assert.deepEqual(generateStatistics(skill, `statistics-test-${seed}`, { shape: shapes[seed % 6], difficulty: seed % 3 + 1 }), q);
    }
    assert.deepEqual([...observedShapes].sort(), [...shapes].sort());
  });
}

test('Median first orders the list; IQR uses two halves; MAD uses absolute distances', () => {
  for (let seed = 0; seed < 50; seed++) {
    const median = generateStatistics('S-MEDIAN', seed, { shape: 'mistake' });
    const unsortedMiddle = avg(median.model.displayed.slice(3, 5));
    assert.notDeepEqual(unsortedMiddle, parse(median.answer));
    assert.ok(median.hints.some(h => /order/i.test(h.text)));
    const iqr = generateStatistics('S-IQR', seed, { shape: 'calculation' });
    assert.deepEqual(parse(iqr.answer), measures(iqr.model.values).iqr);
    const mad = generateStatistics('S-MAD', seed, { shape: 'mistake' });
    assert.ok(mad.hints.some(h => h.answer === '0' && /never negative/.test(h.text)));
    assert.ok(parse(mad.answer)[0] > 0n);
  }
});

test('Histogram bins are left-inclusive and frequencies match the accessible description', () => {
  const q = generateStatistics('S-DISPLAY', 'histogram-boundaries', { shape: 'picture' });
  assert.match(q.prompt, /at least/);
  assert.match(q.prompt, /less than/);
  for (let i = 0; i < q.model.frequencies.length; i++) {
    assert.ok(q.svg.includes(`${q.model.start + i * q.model.width} to less than ${q.model.start + (i + 1) * q.model.width}: ${q.model.frequencies[i]} values`));
  }
});

test('Repeat signatures use visible givens rather than unused hidden source data', () => {
  for (let seed = 0; seed < 50; seed++) {
    for (const shape of ['story', 'mistake', 'missing']) {
      const q = generateStatistics('S-CENTER', seed, { shape });
      assert.equal(q.numbers.length, 2);
      assert.deepEqual(parse(q.numbers[0]), parse(8));
      assert.deepEqual(parse(q.numbers[1]), shape === 'missing' ? fraction(q.model.increase, 8) : parse(q.model.increase));
    }
    const spread = generateStatistics('S-SPREAD', seed, { shape: 'missing' });
    assert.equal(spread.numbers.length, 2);
    assert.deepEqual(parse(spread.numbers[0]), parse(spread.model.givenMad));
    assert.deepEqual(parse(spread.numbers[1]), parse(spread.model.factor));
    for (const skill of ['S-IQR', 'S-BOX', 'S-MEDIAN']) {
      const q = generateStatistics(skill, seed, { shape: 'picture' });
      const s = measures(q.model.values);
      assert.deepEqual(q.numbers.map(parse), [parse(s.sorted[0]), s.q1, s.median, s.q3, parse(s.sorted[7])]);
    }
    for (const shape of ['calculation', 'story', 'missing', 'mistake', 'reason']) {
      const q = generateStatistics('S-QUESTION', seed, { shape });
      assert.deepEqual(q.numbers, [String(q.model.count), String(q.model.minutes)]);
      assert.ok(q.prompt.includes(`${q.model.count} children`));
      assert.ok(q.prompt.includes(`${q.model.minutes} minutes`));
    }
  }
});
