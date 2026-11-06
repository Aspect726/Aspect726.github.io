/**
 * Authored, deterministic extra practice. This is NOT original packet content.
 * Every item carries a release day, an exact answer, and a worked explanation.
 * Arithmetic invariants run whenever the bank is generated; invalid items abort.
 */
import assert from 'node:assert/strict';

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
function fraction(n, d = 1) {
  assert(Number.isSafeInteger(n) && Number.isSafeInteger(d) && d !== 0);
  const g = gcd(n, d); n /= g; d /= g;
  if (d < 0) { n = -n; d = -d; }
  return d === 1 ? String(n) : `${n}/${d}`;
}
function numeric(value) {
  const s = String(value);
  if (s.includes('/')) { const [n, d] = s.split('/').map(Number); return n / d; }
  return Number(s);
}
function equal(actual, expected) { assert(Math.abs(numeric(actual) - numeric(expected)) < 1e-9, `${actual} != ${expected}`); }
const names = ['Ari', 'Bea', 'Lina', 'Omar', 'Noor', 'Kai', 'Sam', 'Maya', 'Leo', 'Inez'];
const places = ['garden', 'library', 'workshop', 'market', 'museum', 'school', 'park', 'harbor', 'studio', 'station'];

export function generateExtraPractice() {
  const bank = [];
  function add(family, i, day, skill, prompt, expected, solution, hint, options = {}) {
    const { type = 'number', diagram, ...format } = options;
    assert(prompt && solution && expected !== undefined);
    if (type === 'number') assert(Number.isFinite(numeric(expected)));
    bank.push({
      id: `DA-extra-v1-${family}-${String(i + 1).padStart(2, '0')}`,
      sourceId: null,
      prompt, skill, type, challenge: false, answer: Array.isArray(expected) ? expected.join(', ') : String(expected),
      solution, hints: [hint],
      grading: { type, expected, ...format },
      availableAfterDay: day, origin: 'extra-practice', reference: null,
      family, validation: 'Exact arithmetic and construction invariants checked during generation',
      ...(diagram ? { diagram } : {}),
    });
  }
  for (let i = 0; i < 10; i++) {
    const a = i + 2, b = i + 3, person = names[i], place = places[i];

    // Fractions: comparisons, sharing, part/whole, missing quantities and scale.
    {
      const den = 2 * a + 3, n = a, m = a + 2;
      assert(n < m && m < den);
      add('same-whole', i, 1, 'F-COMP', `Two identical ribbons are divided into ${den} equal pieces. One has ${n} pieces shaded and the other has ${m}. Compare the shaded fractions. Enter <, >, or =.`, '<', `Both wholes and the piece sizes match. ${n} is less than ${m}, so ${n}/${den} < ${m}/${den}.`, 'When the denominator is the same, compare the number of equal pieces.', { type: 'comparison' });
    }
    {
      const den = a + 3, n = den + a, result = fraction(n, den);
      equal(result, 1 + a / den);
      add('line-position', i, 1, 'F-LINE', `A number line has ${den} equal intervals from 0 to 1. ${person} moves ${n} intervals right from 0. What number does the point represent?`, result, `Each interval is 1/${den}. ${n} intervals make ${n}/${den} = 1 + ${a}/${den}.`, 'Count intervals, including those beyond the first whole.', { diagram: { kind: 'numberline', min: 0, max: 2, ticks: 2 * den, values: [], caption: `Each interval represents 1/${den}.` } });
    }
    {
      const cakes = a, children = 2 * a + 1, result = fraction(cakes, children);
      equal(numeric(result) * children, cakes);
      add('equal-sharing', i, 1, 'F-QUOT', `${children} children share ${cakes} identical cakes equally. What fraction of one cake does each child receive?`, result, `Divide ${cakes} cakes among ${children} children: ${cakes} ÷ ${children} = ${result} of a cake each. Multiplying each share by ${children} returns ${cakes} cakes.`, 'The numerator counts cakes; the denominator counts equal shares.');
    }
    {
      const n = a, d = 3 * a, targetDen = d * b, result = n * b;
      equal(n / d, result / targetDen);
      add('equivalent-missing', i, 4, 'F-EQUIV', `Complete the equivalent fraction: ${n}/${d} = □/${targetDen}. What belongs in the box?`, String(result), `The denominator was multiplied by ${b}. Multiply the numerator by ${b} too: ${n} × ${b} = ${result}.`, 'Find the scale factor between the denominators.');
    }
    {
      const d = 2 * a + 3, n1 = a, n2 = a + 1, result = fraction(n1 + n2, d);
      equal(result, n1 / d + n2 / d);
      add('combine-lengths', i, 2, 'F-ADD', `${person} joins a ${n1}/${d}-meter strip to a ${n2}/${d}-meter strip with no overlap. How many meters long is the joined strip? Give an exact fraction.`, result, `The pieces are both measured in ${d}ths. Add the numerators: (${n1} + ${n2})/${d} = ${result} meter.`, 'Use the same unit fraction for both lengths.');
    }
    {
      const den = a + 4, used = a, result = fraction(den - used, den);
      equal(numeric(result) + used / den, 1);
      add('remaining-whole', i, 3, 'F-SUB', `A full bottle holds 1 liter. ${person} pours out ${used}/${den} liter. How many liters remain?`, result, `Write 1 as ${den}/${den}. Subtract ${used}/${den}: (${den} − ${used})/${den} = ${result} liter.`, 'Rename the whole using the same denominator.');
    }
    {
      const den = a + 2, total = den * b, result = a * b;
      equal(total * a / den, result);
      add('fraction-of-set', i, 2, 'F-MULT', `There are ${total} seedlings at the ${place}. Exactly ${a}/${den} are herbs. How many are herbs?`, String(result), `One ${den}th of ${total} is ${b}. Take ${a} of those groups: ${a} × ${b} = ${result}.`, 'Divide into equal denominator-sized groups, then take the numerator number of groups.');
    }
    {
      const meters = a + 1, pieceDen = b, result = meters * pieceDen;
      equal(result / pieceDen, meters);
      add('measurement-division', i, 2, 'F-DIV', `A cord is ${meters} meters long. It is cut into pieces exactly 1/${pieceDen} meter long. How many pieces can be cut?`, String(result), `Each meter contains ${pieceDen} pieces. Across ${meters} meters there are ${meters} × ${pieceDen} = ${result} pieces.`, 'First find how many pieces fit in one meter.');
    }
    {
      const amountN = a, amountD = a + 3, friends = b, result = fraction(amountN, amountD * friends);
      equal(numeric(result) * friends, amountN / amountD);
      add('fraction-shared', i, 4, 'F-DIV1', `${person} shares ${amountN}/${amountD} liter of juice equally among ${friends} cups. How many liters go in each cup?`, result, `Dividing ${amountN}/${amountD} by ${friends} gives ${amountN}/(${amountD} × ${friends}) = ${result} liter. The ${friends} equal shares add back to the original amount.`, 'Divide the amount by the number of equal shares.');
    }
    {
      const smallerN = a, smallerD = a + 2, largerN = a + 1, largerD = a + 3;
      assert(smallerN * largerD < largerN * smallerD);
      add('unlike-comparison', i, 1, 'F-COMP', `Two walkers cover ${smallerN}/${smallerD} and ${largerN}/${largerD} of the same route. Compare the first distance with the second. Enter <, >, or =.`, '<', `Use denominator ${smallerD * largerD}: the numerators become ${smallerN * largerD} and ${largerN * smallerD}. The first is smaller.`, 'Use equal wholes and rename both fractions with a common denominator.', { type: 'comparison' });
    }

    // Ratios, rates and percentages, including inverse and missing-value tasks.
    {
      const red = a, blue = b, groups = i + 4, blueTotal = blue * groups, result = red * groups;
      equal(result / blueTotal, red / blue);
      add('ratio-missing', i, 8, 'R-RATIO', `A tile pattern uses ${red} coral tiles for every ${blue} teal tiles. A larger matching pattern has ${blueTotal} teal tiles. How many coral tiles does it need?`, String(result), `There are ${blueTotal} ÷ ${blue} = ${groups} groups. Each group needs ${red} coral tiles: ${groups} × ${red} = ${result}.`, 'Find how many full groups the teal count represents.');
    }
    {
      const first = a, second = a + 2, groups = b, total = (first + second) * groups, result = first * groups;
      equal(result + second * groups, total);
      add('ratio-whole', i, 9, 'R-WHOLE', `A box has black and white beads in the ratio ${first}:${second}. There are ${total} beads altogether. How many black beads are there?`, String(result), `One ratio group has ${first + second} beads. ${total} ÷ ${first + second} = ${groups} groups, so black beads total ${first} × ${groups} = ${result}.`, 'Add the ratio parts before dividing the whole.');
    }
    {
      const units = a + 1, cost = units * (i + 3), result = i + 3;
      equal(cost / units, result);
      add('unit-price', i, 15, 'R-RATE', `${units} identical notebooks cost $${cost}. What is the cost of one notebook, in dollars?`, String(result), `Divide total cost by notebook count: ${cost} ÷ ${units} = ${result} dollars per notebook.`, 'A unit rate tells you the amount for one item.');
    }
    {
      const minutes = a + 3, perMinute = b + 1, total = minutes * perMinute, newMinutes = a + 6, result = newMinutes * perMinute;
      equal(total / minutes, result / newMinutes);
      add('constant-rate', i, 15, 'R-RATE', `A printer makes ${total} labels in ${minutes} minutes at a steady rate. How many labels will it make in ${newMinutes} minutes?`, String(result), `Its rate is ${total} ÷ ${minutes} = ${perMinute} labels per minute. In ${newMinutes} minutes: ${perMinute} × ${newMinutes} = ${result}.`, 'Find the per-minute rate first, then scale to the new time.');
    }
    {
      const percent = 5 * (i + 2), total = 20 * (i + 3), result = percent * total / 100;
      equal(result / total, percent / 100);
      add('percent-part', i, 16, 'P-PART', `A library has ${total} new books. ${percent}% are about science. How many new science books are there?`, String(result), `${percent}% means ${percent}/100. Multiply ${total} × ${percent}/100 = ${result}.`, 'Use 10% or 5% as a helpful building block.');
    }
    {
      const total = 20 * (i + 4), percent = 5 * (i + 1), part = total * percent / 100;
      equal(part / total * 100, percent);
      add('find-percent', i, 16, 'P-PERCENT', `${part} of ${total} collected cans are aluminum. What percentage are aluminum? Enter the number before the % sign.`, String(percent), `The fraction is ${part}/${total}. Multiply by 100 to express it per hundred: ${part}/${total} × 100 = ${percent}%.`, 'Compare the part to the whole, then convert to a rate per hundred.');
    }
    {
      const percent = 10 * (i % 5 + 1), whole = 20 * (i + 6), part = whole * percent / 100;
      equal(part / (percent / 100), whole);
      add('find-whole', i, 16, 'P-WHOLE', `${person} has saved $${part}, which is ${percent}% of a target amount. What is the target amount, in dollars?`, String(whole), `If ${percent}% is ${part}, then 1% is ${part / percent}. Multiply by 100: the target is $${whole}.`, 'Find what 1% represents, or divide by the percentage written as a decimal.');
    }

    // Decimals: exact money arithmetic and reverse-operation checks.
    {
      const priceCents = 125 + i * 37, count = i + 3, totalCents = priceCents * count, result = (totalCents / 100).toFixed(2);
      equal(numeric(result) * 100, totalCents);
      add('decimal-purchase', i, 29, 'D-MONEY', `A roll of tape costs $${(priceCents / 100).toFixed(2)}. ${person} buys ${count} rolls. What is the total cost, in dollars?`, result, `Multiply ${priceCents} cents by ${count}: ${totalCents} cents. Divide by 100 to convert back to dollars: $${result}.`, 'Working in cents keeps the decimal places clear.');
    }
    {
      const paidCents = 1000 + i * 200, costCents = 367 + i * 73, change = paidCents - costCents, result = (change / 100).toFixed(2);
      equal(change + costCents, paidCents);
      add('decimal-change', i, 29, 'D-SUB', `${person} pays $${(paidCents / 100).toFixed(2)} for supplies costing $${(costCents / 100).toFixed(2)}. How much change is due, in dollars?`, result, `Align the hundredths: ${(paidCents / 100).toFixed(2)} − ${(costCents / 100).toFixed(2)} = ${result}. Check that change plus cost equals the amount paid.`, 'Line up the decimal points and subtract the smaller amount.');
    }
    {
      const lengthTenths = (i + 4) * (i + 3), pieceTenths = i + 3, result = i + 4;
      equal(lengthTenths / pieceTenths, result);
      add('decimal-pieces', i, 30, 'D-DIV', `A ribbon is ${(lengthTenths / 10).toFixed(1)} meters long. Each piece must be ${(pieceTenths / 10).toFixed(1)} meter long. How many complete pieces can be cut?`, String(result), `Multiply both lengths by 10: ${lengthTenths} ÷ ${pieceTenths} = ${result}. Scaling both quantities does not change the number of pieces.`, 'Express both measurements in tenths of a meter.');
    }

    // Algebra: evaluation, powers and one-step equations in varied contexts.
    {
      const coefficient = a, x = b, constant = i + 5, result = coefficient * x + constant;
      equal(result - constant, coefficient * x);
      add('evaluate-rule', i, 36, 'E-EVAL', `The rule for a pattern is ${coefficient}n + ${constant}. What is the value when n = ${x}?`, String(result), `Substitute ${x} for n, multiply first, then add: ${coefficient} × ${x} + ${constant} = ${result}.`, 'Replace the letter with its value before doing the arithmetic.');
    }
    {
      const base = a, exponent = i % 3 + 2, result = base ** exponent;
      equal(Array(exponent).fill(base).reduce((p, n) => p * n, 1), result);
      add('power-value', i, 36, 'E-EXP', `Evaluate ${base}^${exponent}.`, String(result), `The exponent asks for ${exponent} factors of ${base}: ${Array(exponent).fill(base).join(' × ')} = ${result}.`, 'An exponent counts repeated factors, not an amount to multiply by.');
    }
    {
      const x = 3 * a + 1, addend = a + 6, sum = x + addend;
      equal(sum - addend, x);
      add('inverse-addition', i, 37, 'E-ADD', `Solve x + ${addend} = ${sum}. What is x?`, String(x), `Subtract ${addend} from both sides: x = ${sum} − ${addend} = ${x}. Substitute back: ${x} + ${addend} = ${sum}.`, 'Undo addition with subtraction.');
    }
    {
      const count = a + 2, unknown = b + 4, total = count * unknown;
      equal(total / count, unknown);
      add('equation-story', i, 37, 'E-STORY', `${count} equal boxes hold ${total} markers altogether. If x is the number of markers in one box, ${count}x = ${total}. Find x.`, String(unknown), `Divide both sides by ${count}: x = ${total}/${count} = ${unknown}. Check: ${count} boxes of ${unknown} make ${total}.`, 'Use equal grouping to identify the inverse operation.');
    }

    // Geometry: distinguish perpendicular height, face area and volume.
    {
      const base = 2 * a, height = b + 2, result = base * height / 2;
      equal(result * 2, base * height);
      add('triangle-area', i, 43, 'G-TRI', `A triangular sign has a base of ${base} cm and a perpendicular height of ${height} cm. What is its area in square centimeters?`, String(result), `Two matching triangles form a parallelogram. Area = base × height ÷ 2 = ${base} × ${height} ÷ 2 = ${result} square centimeters.`, 'Use the perpendicular height and remember that a triangle occupies half the matching parallelogram.');
    }
    {
      const base = a + 5, height = b, slant = b + 2, result = base * height;
      equal(result / base, height);
      add('parallelogram-height', i, 43, 'G-PARA', `A parallelogram has base ${base} cm, sloping side ${slant} cm, and perpendicular height ${height} cm. Find its area in square centimeters.`, String(result), `Use the perpendicular height, not the sloping side. ${base} × ${height} = ${result} square centimeters.`, 'Which measurement is at right angles to the base?');
    }
    {
      const length = a, width = b, height = i + 4, result = length * width * height;
      equal(result / height, length * width);
      add('box-volume', i, 44, 'G-VOL', `A rectangular box is ${length} cm long, ${width} cm wide, and ${height} cm high. How many cubic centimeters does it hold?`, String(result), `One layer contains ${length} × ${width} = ${length * width} unit cubes. ${height} layers hold ${length * width} × ${height} = ${result} cubic centimeters.`, 'Find cubes per layer, then multiply by the number of layers.');
    }
    {
      const length = a, width = b, height = i + 4, result = 2 * (length * width + length * height + width * height);
      equal(result, length * width * 2 + length * height * 2 + width * height * 2);
      add('surface-area', i, 44, 'G-SA', `A closed rectangular box measures ${length} cm by ${width} cm by ${height} cm. How much card covers all six faces, in square centimeters?`, String(result), `There are two faces of each size: 2(${length} × ${width} + ${length} × ${height} + ${width} × ${height}) = ${result} square centimeters.`, 'List the three different face areas, then double their sum.');
    }

    // Integers and coordinates, keeping coordinate order explicit.
    {
      const start = -(a + 3), end = b + 2, result = end - start;
      equal(start + result, end);
      add('temperature-rise', i, 50, 'N-CONTEXT', `The temperature rises from ${start}°C to ${end}°C. By how many degrees does it rise?`, String(result), `From ${start} to zero is ${-start} degrees, then ${end} more degrees. The total rise is ${-start} + ${end} = ${result} degrees.`, 'Split the journey at zero.');
    }
    {
      const position = -(3 * a + 2), result = -position;
      equal(Math.abs(position), result);
      add('distance-zero', i, 50, 'N-ABS', `A point is at ${position} on a number line. What is its distance from zero?`, String(result), `Distance is nonnegative. The point is ${result} unit intervals from zero, so |${position}| = ${result}.`, 'Distance tells how far, without a left or right sign.');
    }
    {
      const x1 = -a, x2 = b + 4, y = i - 4, result = x2 - x1;
      equal(Math.abs(x2 - x1), result);
      add('coordinate-distance', i, 51, 'N-DIST', `A is at (${x1}, ${y}) and B is at (${x2}, ${y}). How many units apart are they?`, String(result), `The y-coordinates match, so the distance is horizontal: |${x2} − (${x1})| = ${result} units.`, 'Only one coordinate changes. Find the distance between those values.');
    }

    // Data interpretation and spread: ordered calculations with known invariants.
    {
      const center = 4 * a, data = [center - a, center + b, center, center + a, center - b], result = center;
      equal(data.reduce((s, n) => s + n, 0) / data.length, result);
      add('mean-balanced', i, 57, 'S-MEAN', `Five reading times, in minutes, are ${data.join(', ')}. What is the mean reading time?`, String(result), `Add the times: ${data.reduce((s, n) => s + n, 0)} minutes. Divide by 5: the mean is ${result} minutes. Values above and below ${center} balance.`, 'The mean redistributes the total equally across all five readings.');
    }
    {
      const sorted = [a, b + 2, b + 4, b + 8, b + 14], data = [sorted[4], sorted[1], sorted[3], sorted[0], sorted[2]], result = sorted[2];
      assert.deepEqual([...data].sort((x, y) => x - y), sorted);
      add('median-unsorted', i, 57, 'S-MEDIAN', `The numbers of visitors in five groups are ${data.join(', ')}. What is the median group size?`, String(result), `Order the counts: ${sorted.join(', ')}. The third value is the middle of five, so the median is ${result}.`, 'Order the values before locating the middle.');
    }
    {
      const data = [a + 1, a + 9, a + 3, a + 14, a + 6], result = Math.max(...data) - Math.min(...data);
      equal(result, 13);
      add('range-data', i, 58, 'S-RANGE', `The lengths of five leaves, in millimeters, are ${data.join(', ')}. What is the range?`, String(result), `The longest leaf is ${Math.max(...data)} mm and the shortest is ${Math.min(...data)} mm. Range = ${Math.max(...data)} − ${Math.min(...data)} = ${result} mm.`, 'Range uses only the minimum and maximum.');
    }
    {
      const q1 = a + 4, q3 = q1 + i + 7, result = q3 - q1;
      equal(q1 + result, q3);
      add('iqr-summary', i, 58, 'S-IQR', `A box plot has lower quartile ${q1}, median ${q1 + 3}, and upper quartile ${q3}. What is the interquartile range?`, String(result), `The IQR measures the middle half of the data: Q3 − Q1 = ${q3} − ${q1} = ${result}.`, 'Subtract the lower quartile from the upper quartile; the median is not needed.');
    }

    // Scale drawings provide multiplicative reasoning without adding required work.
    {
      const perCm = a + 1, mapCm = b + 2, result = perCm * mapCm;
      equal(result / mapCm, perCm);
      add('map-scale', i, 64, 'P-MAP', `On a map, 1 cm represents ${perCm} km. The ${place} is ${mapCm} cm from a campsite on the map. What real distance, in kilometers, does that represent?`, String(result), `There are ${mapCm} copies of 1 cm. Multiply ${mapCm} × ${perCm} = ${result} km.`, 'Keep the map and real-world units paired as you scale.');
    }
  }
  assert.equal(bank.length, 360);
  assert.equal(new Set(bank.map(q => q.id)).size, bank.length);
  assert.equal(new Set(bank.map(q => q.prompt)).size, bank.length);
  assert.equal(new Set(bank.map(q => q.family)).size, 36);
  assert(bank.every(q => q.availableAfterDay >= 1 && q.availableAfterDay <= 70));
  assert(bank.every(q => q.origin === 'extra-practice' && q.reference === null && !q.challenge));
  return bank;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const bank = generateExtraPractice();
  console.log(JSON.stringify({ questions: bank.length, families: new Set(bank.map(q => q.family)).size, skills: new Set(bank.map(q => q.skill)).size, uniquePrompts: new Set(bank.map(q => q.prompt)).size, validation: 'passed' }, null, 2));
}
