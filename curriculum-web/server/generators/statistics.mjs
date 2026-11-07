import { rng, escapeHTML, math } from './common.mjs';
import { rational, add, sub, mul, div, format } from '../math.mjs';

export const statisticsSkills = ['S-QUESTION', 'S-DISPLAY', 'S-MEAN', 'S-MEDIAN', 'S-CENTER', 'S-RANGE', 'S-IQR', 'S-BOX', 'S-MAD', 'S-SPREAD'];
const SHAPES = ['calculation', 'story', 'missing', 'mistake', 'reason', 'picture'];
const names = ['Maya', 'Leo', 'Ari', 'Nina', 'Sam', 'Theo', 'Zoe', 'Isha'];
const contexts = [
  { unit: 'minutes', label: 'practice times', activity: 'practises basketball' },
  { unit: 'blocks', label: 'tower heights', activity: 'builds towers' },
  { unit: 'points', label: 'game scores', activity: 'plays a board game' },
  { unit: 'minutes', label: 'walking times', activity: 'walks a dog' },
  { unit: 'grapes', label: 'snack portions', activity: 'packs snacks' },
];

const qnum = n => typeof n === 'object' ? n : rational(n);
const total = xs => xs.reduce((s, n) => add(s, qnum(n)), rational(0));
const average = xs => div(total(xs), rational(xs.length));
const abs = x => rational(x.n < 0n ? -x.n : x.n, x.d);
const val = x => format(qnum(x));
const list = xs => xs.map(val).join(', ');
const inlineList = xs => `<span class="data-list">${xs.map(n => math(val(n))).join(', ')}</span>`;
const med = xs => xs.length % 2 ? qnum(xs[(xs.length - 1) / 2]) : average(xs.slice(xs.length / 2 - 1, xs.length / 2 + 1));

// For even-sized lists, Q1 and Q3 are the medians of the two equal halves.
// All generated lists have eight entries, avoiding competing odd-size conventions.
function summary(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = average(sorted);
  const median = med(sorted);
  const q1 = med(sorted.slice(0, 4));
  const q3 = med(sorted.slice(4));
  const distances = sorted.map(x => abs(sub(qnum(x), mean)));
  return { sorted, mean, median, q1, q3, iqr: sub(q3, q1), range: rational(sorted[7] - sorted[0]), mad: average(distances), distances, sum: total(sorted) };
}

function statsData(r, difficulty) {
  const base = r.int(4, 58);
  const step = r.int(1, difficulty > 1 ? 6 : 4);
  const offsets = r.pick([[0, 1, 2, 3, 5, 6, 7, 12], [0, 1, 2, 4, 5, 7, 8, 13], [0, 2, 3, 4, 6, 7, 9, 13], [0, 1, 3, 4, 6, 8, 9, 13]]);
  const values = offsets.map(x => base + x * step);
  const s = summary(values);
  let displayed = r.shuffle(values);
  // Deliberately keep the middle of the unsorted list different from the median.
  if (val(average(displayed.slice(3, 5))) === val(s.median)) displayed = [values[6], values[2], values[5], values[0], values[1], values[7], values[3], values[4]];
  return { values, displayed, ...s };
}

function svgRoot(title, description, body, height = 250) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 ${height}" role="img" aria-label="${escapeHTML(`${title}. ${description}`)}"><title>${escapeHTML(title)}</title><desc>${escapeHTML(description)}</desc><g fill="none" stroke="#1D2A2E" stroke-width="2">${body}</g></svg>`;
}
const text = (x, y, value, anchor = 'middle', color = '#1D2A2E') => `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" stroke="none" font-family="Source Serif 4,serif" font-size="18">${escapeHTML(value)}</text>`;

function dotplot(values, title = 'Dot plot', xLabel = 'Value') {
  const counts = new Map();
  for (const x of values) counts.set(x, (counts.get(x) || 0) + 1);
  const unique = [...counts.keys()].sort((a, b) => a - b);
  const minimum = unique[0], maximum = unique.at(-1);
  const x = v => 45 + 550 * (v - minimum) / Math.max(1, maximum - minimum);
  const bottom = 176;
  const spacing = Math.min(20, 130 / Math.max(...counts.values()));
  const radius = Math.min(6, spacing / 2 - 1);
  let body = `<path d="M30 ${bottom}H610"/>`;
  for (const v of unique) {
    body += `<path d="M${x(v)} ${bottom}v6"/>${text(x(v), 207, String(v))}`;
    for (let i = 0; i < counts.get(v); i++) body += `<circle cx="${x(v)}" cy="${bottom - 18 - spacing * i}" r="${radius}" fill="#1F5A63" stroke="#1F5A63"/>`;
  }
  body += text(30, 25, title, 'start') + text(320, 239, xLabel);
  return svgRoot(title, `${list(values)}. Each dot is one value.`, body);
}

function histogram(start, width, frequencies, title = 'Histogram') {
  const maximum = Math.max(...frequencies);
  const left = 64, top = 48, bottom = 190, barWidth = 116;
  let body = `<path d="M${left} ${top - 12}V${bottom}H${left + barWidth * frequencies.length}"/>`;
  for (let i = 0; i <= maximum; i++) {
    const y = bottom - (bottom - top) * i / maximum;
    body += `<path d="M${left - 6} ${y}h6"/>${text(left - 14, y + 6, String(i), 'end')}`;
  }
  for (let i = 0; i < frequencies.length; i++) {
    const h = (bottom - top) * frequencies[i] / maximum;
    body += `<rect x="${left + i * barWidth}" y="${bottom - h}" width="${barWidth}" height="${h}" fill="#E0D6C2"/>`;
    body += text(left + i * barWidth, 220, String(start + width * i));
  }
  body += text(left + frequencies.length * barWidth, 220, String(start + frequencies.length * width));
  body += text(30, 24, title, 'start') + text(320, 250, 'Value (left edge included)');
  return svgRoot(title, frequencies.map((f, i) => `${start + i * width} to less than ${start + (i + 1) * width}: ${f} values`).join('; '), body, 264);
}

function boxplot(s, title = 'Box plot') {
  const minimum = s.sorted[0], maximum = s.sorted[7];
  const scalar = r => Number(r.n) / Number(r.d);
  const x = v => 50 + 540 * (v - minimum) / (maximum - minimum);
  const q1 = scalar(s.q1), median = scalar(s.median), q3 = scalar(s.q3);
  let body = `<path d="M${x(minimum)} 84V136M${x(maximum)} 84V136M${x(minimum)} 110H${x(q1)}M${x(q3)} 110H${x(maximum)}"/><rect x="${x(q1)}" y="75" width="${x(q3) - x(q1)}" height="70" fill="#E0D6C2"/><path d="M${x(median)} 75V145" stroke="#1F5A63"/><path d="M30 180H610"/>`;
  const ticks = [minimum, q1, median, q3, maximum];
  for (let i = 0; i < ticks.length; i++) {
    const v = ticks[i];
    body += `<path d="M${x(v)} 180v6"/>${text(x(v), i % 2 ? 232 : 207, String(v))}`;
  }
  body += text(30, 25, title, 'start');
  return svgRoot(title, `Minimum ${minimum}; Q1 ${val(s.q1)}; median ${val(s.median)}; Q3 ${val(s.q3)}; maximum ${maximum}.`, body);
}

function baseQ(skill, seed, shape, data) {
  return { skill, seed, shape, ...data };
}

function numeric(skill, seed, shape, prompt, answer, solution, candidates, model, svg) {
  const answerText = val(answer);
  const seen = new Set([answerText]);
  const hints = [];
  for (const [wrong, hint] of candidates) {
    const value = val(wrong);
    if (!seen.has(value)) { hints.push({ answer: value, text: hint }); seen.add(value); }
  }
  if (hints.length < 3) throw new Error(`${skill} needs three different misconception answers`);
  return baseQ(skill, seed, shape, {
    prompt, plainPrompt: prompt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    answer: answerText, hints: hints.slice(0, 3), hint: model.genericHint,
    solution, numbers: model.numbers.map(String), model, ...(svg ? { svg } : {}),
  });
}

function choice(skill, seed, shape, r, prompt, correct, wrong, solution, model, svg) {
  const choices = r.shuffle([correct, ...wrong].map(([value, label]) => ({ value, label: escapeHTML(label) })));
  return baseQ(skill, seed, shape, {
    prompt, plainPrompt: prompt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    answer: correct[0], choices,
    hints: wrong.map(([answer, , hint]) => ({ answer, text: hint })), hint: model.genericHint,
    solution, numbers: model.numbers.map(String), model, ...(svg ? { svg } : {}),
  });
}

function commonWrong(s) {
  return [
    [s.sum, 'A total and a typical value are different. Check which measure is asked for.'],
    [s.range, 'The range uses only the smallest and largest values. Check the requested measure.'],
    [s.mean, 'The mean uses every value. Check whether this question asks for the mean.'],
    [s.median, 'The median is the middle after ordering. Check the requested measure.'],
    [s.iqr, 'The IQR measures the middle half. Check which part of the data you need.'],
    [rational(8), 'That counts the values. Use their sizes to find the requested measure.'],
    [rational(s.sorted[7]), 'The largest value alone does not describe this measure.'],
  ];
}

function questionSkill(skill, seed, shape, r) {
  const name = r.pick(names), count = r.int(8, shape === 'picture' ? 12 : 35), minutes = r.int(3, 25);
  const objects = r.pick(['blocks', 'cards', 'game pieces', 'stickers']);
  const setting = `<p>${count} children sort ${objects} for ${minutes} minutes.</p>`;
  const genericHint = 'A statistical question expects answers that can vary across a group.';
  const model = { kind: 'statistical-question', count, minutes, objects, numbers: [count, minutes], genericHint };
  const solution = ['Identify who or what is measured.', 'Check whether answers could be different.', 'A statistical question expects variation across a group.'];
  if (shape === 'calculation') {
    const prompt = `${setting}<p>How many of these questions are statistical?</p><ol><li>How many ${objects} does each child sort?</li><li>How long is this sorting session?</li><li>How many piles does each child make?</li><li>How many children are in this group?</li></ol>`;
    return numeric(skill, seed, shape, prompt, rational(2), solution, [
      [1, 'Both group questions can have different answers.'],
      [3, 'The session length and group size are fixed facts, not varying observations.'],
      [4, 'A numerical answer alone does not make a question statistical.'],
    ], { ...model, kind: 'statistical-count' });
  }
  if (shape === 'missing') return choice(skill, seed, shape, r,
    `${setting}<p>Complete a statistical question.</p><p>How many ${objects} are sorted by ____ during this session?</p>`,
    ['group', `each of the ${count} children`], [
      ['one', name, 'One fixed count does not ask how values vary across a group.'],
      ['fixed', 'the whole group altogether', 'One group total does not show how individual counts vary.'],
      ['definition', 'the first child only', 'One child’s fixed count does not describe a group’s variation.'],
    ], solution, model);
  if (shape === 'mistake') return choice(skill, seed, shape, r,
    `${setting}<p>${name} says every question about these numbers is statistical.</p><p>Choose the correction.</p>`,
    ['variation', 'It must expect variation across a group.'], [
      ['large', 'It must have a large answer.', 'The size of an answer does not determine whether values vary.'],
      ['whole', 'It must have a whole-number answer.', 'Measurements can vary even when they include decimals.'],
      ['person', 'It must ask one person one fixed fact.', 'One fixed fact does not describe variation.'],
    ], solution, model);
  if (shape === 'reason') return choice(skill, seed, shape, r,
    `${setting}<p>Why is “How many ${objects} does each child sort?” statistical?</p>`,
    ['variation', 'The children may have different counts.'], [
      ['number', 'Every question with numbers is statistical.', 'A fixed numerical fact need not vary.'],
      ['same', 'Every child must give the same answer.', 'Statistical questions allow different answers.'],
      ['total', 'It only asks how many children there are.', 'The question asks for each child’s count, not the group size.'],
    ], solution, model);
  if (shape === 'picture') {
    const values = Array.from({ length: count }, () => r.int(1, 9));
    return choice(skill, seed, shape, r,
      `${setting}<p>Each dot shows how many one child sorted.</p><p>Which question does this plot answer?</p>`,
      ['counts', `How many ${objects} does each child sort?`], [
        ['names', 'What is each child’s name?', 'The dots give counts, not names.'],
        ['fixed', 'How many sides does a square have?', 'The dots show varying observations, not one fixed fact.'],
        ['tomorrow', `How many ${objects} will one child have tomorrow?`, 'The plot records the observed group, not a future count.'],
      ], solution, { ...model, numbers: [count, minutes, ...values], values }, dotplot(values, 'Counts in a group', 'Count'));
  }
  return choice(skill, seed, shape, r,
    `${setting}<p>${name} records what happened.</p><p>Which question is statistical?</p>`,
    ['group', `How many ${objects} does each child sort?`], [
      ['one', `How many ${objects} does ${name} have today?`, 'That asks for one fixed count, not variation across the group.'],
      ['definition', 'How long is this sorting session?', 'The session length is one fixed fact.'],
      ['fixed', 'How many children are in this group?', 'The group size is one fixed count.'],
    ], solution, model);
}

function displaySkill(skill, seed, shape, r) {
  const start = r.int(1, 40), width = r.int(2, 8);
  const frequencies = r.shuffle(Array.from({ length: 12 }, (_, i) => i + 1)).slice(0, 4);
  const values = frequencies.flatMap((count, i) => Array(count).fill(start + i * width));
  const target = r.int(0, 3);
  const useHistogram = shape === 'picture' || shape === 'reason';
  const svg = useHistogram ? histogram(start, width, frequencies) : dotplot(values, 'Game scores', 'Score');
  const genericHint = useHistogram ? 'Read the bar height. Each interval includes its left edge, but not its right edge.' : 'Each dot stands for one observation.';
  const axisValues = Array.from({ length: useHistogram ? 5 : 4 }, (_, i) => start + i * width);
  const model = { kind: 'display-frequency', start, width, frequencies, target, values, numbers: [...axisValues, ...frequencies], genericHint };
  if (shape === 'reason') return choice(skill, seed, shape, r,
    `<p>How do you find the total number of scores in this histogram?</p>`,
    ['sum', 'Add the heights of all the bars.'], [
      ['bars', 'Count only the bars.', 'A bar may represent several observations.'],
      ['labels', 'Add the numbers on the horizontal axis.', 'The horizontal axis shows intervals, not frequencies.'],
      ['highest', 'Use only the tallest bar.', 'Every bar contributes observations to the total.'],
    ], ['Each bar height is a frequency.', `The frequencies are ${frequencies.join(', ')}.`, `Add them: ${frequencies.reduce((a, b) => a + b)} scores.`], model, svg);
  const totalCount = frequencies.reduce((a, b) => a + b);
  const countTask = shape === 'calculation' || shape === 'story' || shape === 'mistake';
  const answer = countTask ? totalCount : frequencies[target];
  let prompt;
  if (shape === 'calculation') prompt = '<p>How many scores are shown altogether?</p>';
  else if (shape === 'story') prompt = `<p>${r.pick(names)} records one score for each game.</p><p>How many games are shown?</p>`;
  else if (shape === 'missing') prompt = `<p>Fill the missing frequency.</p><p>Score ${math(start + target * width)} occurs ____ times.</p>`;
  else if (shape === 'mistake') prompt = `<p>${r.pick(names)} says four different scores mean four games.</p><p>How many games are actually shown?</p>`;
  else prompt = `<p>How many scores are at least ${math(start + target * width)} and less than ${math(start + (target + 1) * width)}?</p>`;
  return numeric(skill, seed, shape, prompt, rational(answer), [
    useHistogram ? 'Find the requested interval on the horizontal axis.' : 'Each dot is one score.',
    countTask ? `The groups contain ${frequencies.join(', ')} scores.` : `Read the group for ${start + target * width}.`,
    countTask ? `Add the frequencies: ${totalCount}.` : `The frequency is ${frequencies[target]}.`,
  ], [
    [4, 'Counting different groups is not the same as counting all observations.'],
    [start + target * width, 'The horizontal label is a score. Count observations above it.'],
    [Math.max(...frequencies), 'The tallest group may not be the requested group.'],
    [totalCount, 'The total counts every group. Check whether just one group is requested.'],
    [frequencies[target] + frequencies[(target + 1) % 4], 'Do not include a neighboring group.'],
    [1, 'Several dots can share one score. Count every dot in the requested group.'],
    [totalCount - 1, 'Count every observation. Check whether you left one out.'],
    [totalCount + frequencies[target], 'Do not count a group twice.'],
  ], { ...model, kind: countTask ? 'display-total' : 'display-frequency' }, svg);
}

function summarySkill(skill, seed, shape, r, difficulty) {
  const s = statsData(r, difficulty), name = r.pick(names), context = r.pick(contexts);
  const values = inlineList(s.displayed);
  const numbers = [...s.sorted];
  const genericHints = {
    'S-MEAN': 'Add every value, then divide by how many values there are.',
    'S-MEDIAN': 'Order the values. With eight values, average the two middle values.',
    'S-RANGE': 'Subtract the smallest value from the largest value.',
    'S-IQR': 'Find the median of each half. Subtract Q1 from Q3.',
    'S-BOX': 'Read the five positions: minimum, Q1, median, Q3 and maximum.',
    'S-MAD': 'Find each distance from the mean. Average those nonnegative distances.',
  };
  const model = { kind: skill.slice(2).toLowerCase(), values: s.sorted, displayed: s.displayed, numbers, genericHint: genericHints[skill] };
  const metric = { 'S-MEAN': 'mean', 'S-MEDIAN': 'median', 'S-RANGE': 'range', 'S-IQR': 'IQR', 'S-MAD': 'MAD', 'S-BOX': 'Q3' }[skill];
  const answer = skill === 'S-BOX' ? s.q3 : s[metric.toLowerCase()];
  const solutionMap = {
    'S-MEAN': [`Add the values: ${val(s.sum)}.`, 'There are eight values.', `Divide: ${val(s.sum)} ÷ 8 = ${val(s.mean)}.`],
    'S-MEDIAN': [`Order the values: ${list(s.sorted)}.`, `The two middle values are ${s.sorted[3]} and ${s.sorted[4]}.`, `Average them: ${val(s.median)}.`],
    'S-RANGE': [`The smallest value is ${s.sorted[0]}.`, `The largest value is ${s.sorted[7]}.`, `Subtract: ${s.sorted[7]} − ${s.sorted[0]} = ${val(s.range)}.`],
    'S-IQR': [`Order the values: ${list(s.sorted)}.`, `The lower four have median Q1 = ${val(s.q1)}.`, `The upper four have median Q3 = ${val(s.q3)}.`, `IQR = Q3 − Q1 = ${val(s.iqr)}.`],
    'S-BOX': [`Order the values: ${list(s.sorted)}.`, `Use the upper four: ${list(s.sorted.slice(4))}.`, `Their middle pair is ${s.sorted[5]} and ${s.sorted[6]}.`, `Average that pair: Q3 = ${val(s.q3)}.`],
    'S-MAD': [`The mean is ${val(s.mean)}.`, `The distances are ${list(s.distances)}.`, `Their total is ${val(total(s.distances))}.`, `Divide by eight: MAD = ${val(s.mad)}.`],
  };
  let prompt = `<p>Find the ${metric}.</p><p>${values}</p>`;
  let svg;
  let candidates = commonWrong(s);
  if (skill === 'S-MEAN') candidates = [[s.sum, 'You found the total. Divide by the number of values.'], [s.median, 'The middle gives the median. The mean uses every value.'], [div(s.sum, rational(7)), 'Count all eight values before dividing.'], ...candidates];
  if (skill === 'S-MEDIAN') candidates = [[average(s.displayed.slice(3, 5)), 'Put the values in order before choosing the middle.'], [rational(s.sorted[3]), 'There are two middle values. Average both.'], [rational(s.sorted[4]), 'Use both middle values, not just the upper one.'], ...candidates];
  if (skill === 'S-RANGE') candidates = [[rational(s.sorted[7]), 'The maximum is only one endpoint. Subtract the minimum.'], [rational(s.sorted[7] + s.sorted[0]), 'Range is a difference, not a sum.'], [rational(-Number(s.range.n)), 'Start with the largest value so the distance is nonnegative.'], ...candidates];
  if (skill === 'S-IQR') candidates = [[s.range, 'The IQR uses the middle half, not both endpoints.'], [add(s.q1, s.q3), 'Subtract Q1 from Q3. Do not add the quartiles.'], [s.q3, 'Q3 is a boundary. The IQR is the distance between two boundaries.'], ...candidates];
  if (skill === 'S-BOX') candidates = [[s.median, 'The middle of the whole list is the median. Q3 uses the upper half.'], [s.q1, 'Q1 uses the lower half. Look at the upper half for Q3.'], [rational(s.sorted[7]), 'The upper whisker marks the maximum, not Q3.'], ...candidates];
  if (skill === 'S-MAD') candidates = [[rational(0), 'Signed differences cancel. Distances from the mean are never negative.'], [total(s.distances), 'You added the distances. Now find their mean.'], [s.mean, 'That is the mean of the data. Find distances from it, then average them.'], ...candidates];
  if (shape === 'story') prompt = `<p>${name} ${context.activity}.</p><p>These are eight ${context.label}, in ${context.unit}.</p><p>${values}</p><p>Find the ${metric}.</p>`;
  if (shape === 'picture') {
    svg = ['S-IQR', 'S-BOX', 'S-MEDIAN'].includes(skill) ? boxplot(s) : dotplot(s.sorted, context.label, context.unit);
    prompt = `<p>Use the ${['S-IQR', 'S-BOX', 'S-MEDIAN'].includes(skill) ? 'box plot' : 'dot plot'} to find the ${metric}.</p>`;
    if (['S-IQR', 'S-BOX', 'S-MEDIAN'].includes(skill)) model.numbers = [s.sorted[0], val(s.q1), val(s.median), val(s.q3), s.sorted[7]];
  }
  if (shape === 'mistake') {
    const mistake = candidates.find(([candidate]) => val(candidate) !== val(answer))[0];
    prompt = `<p>${name} says the ${metric} is ${math(val(mistake))}.</p><p>${values}</p><p>Find the correct ${metric}.</p>`;
  }
  if (shape === 'reason') {
    const reasons = {
      'S-MEAN': [['mean', 'Add all the values, then divide by eight.'], ['middle', 'Choose the middle value without ordering.', 'The mean uses every value, not its position.'], ['range', 'Subtract the smallest value from the largest.', 'That finds the range, not the mean.'], ['two', 'Average only the smallest and largest values.', 'Middle values contribute to the mean too.']],
      'S-MEDIAN': [['middle', 'Order the values, then average the middle two.'], ['unsorted', 'Average the middle two in the given order.', 'Order the values before finding the middle.'], ['mean', 'Add all the values and divide by eight.', 'That finds the mean, not the median.'], ['largest', 'Use the largest value because there are eight values.', 'The median divides ordered data into equal halves.']],
      'S-RANGE': [['difference', 'Subtract the smallest value from the largest.'], ['add', 'Add the smallest value to the largest.', 'Range is a distance between endpoints.'], ['mean', 'Add every value and divide by eight.', 'That finds the mean. Range uses only the endpoints.'], ['largest', 'Use the largest value without subtracting.', 'The smallest value may be greater than zero.']],
      'S-IQR': [['quartiles', 'Subtract Q1 from Q3.'], ['endpoints', 'Subtract the minimum from the maximum.', 'That finds the full range, not the middle half’s spread.'], ['add', 'Add Q1 and Q3.', 'The IQR is a distance, so use subtraction.'], ['median', 'Use the middle value of the whole list.', 'The median is a center, not a spread.']],
      'S-BOX': [['quarters', 'Each section between neighboring marks contains one quarter of the data.'], ['length', 'The longest section always contains the most values.', 'A wider section means values are more spread out.'], ['middle', 'The median must be halfway between the endpoints.', 'The median divides counts, not distances.'], ['outside', 'The box includes every observation.', 'The box spans the middle half. Whiskers extend beyond it.']],
      'S-MAD': [['absolute', 'Average the nonnegative distances from the mean.'], ['signed', 'Average signed differences from the mean.', 'Signed differences cancel. A distance is never negative.'], ['total', 'Add the distances and stop there.', 'MAD is a mean, so divide the total distance by the count.'], ['range', 'Subtract the smallest value from the largest.', 'That finds the range. MAD uses all distances.']],
    }[skill];
    const [correct, ...wrong] = reasons;
    const question = skill === 'S-BOX' ? 'What does a box plot show?' : `Which method finds the ${metric}?`;
    return choice(skill, seed, shape, r, `<p>${question}</p><p>${values}</p>`, correct, wrong, solutionMap[skill], model, skill === 'S-BOX' ? boxplot(s) : undefined);
  }
  if (shape === 'missing') {
    if (skill === 'S-MEAN') {
      const hidden = 4, partial = s.sorted.filter((_, i) => i !== hidden), known = total(partial);
      return numeric(skill, seed, shape, `<p>Eight values have mean ${math(val(s.mean))}.</p><p>Seven values are ${inlineList(partial)}.</p><p>Find the missing value.</p>`, rational(s.sorted[hidden]), [
        `Eight values need total ${val(s.mean)} × 8 = ${val(s.sum)}.`, `The seven known values total ${val(known)}.`, `Subtract: ${val(s.sum)} − ${val(known)} = ${s.sorted[hidden]}.`,
      ], [[sub(s.mean, known), 'The mean is not the total. Multiply it by eight first.'], [s.mean, 'The missing value does not have to equal the mean.'], [s.sum, 'This is the required total. Subtract the known values.'], ...commonWrong(s)], { ...model, kind: 'missing-mean', hidden, numbers: [8, val(s.mean), ...partial] });
    }
    if (skill === 'S-MEDIAN') {
      const display = s.sorted.map((x, i) => i === 3 ? '□' : String(x)).join(', ');
      return numeric(skill, seed, shape, `<p>This ordered list has median ${math(val(s.median))}.</p><p>${display}</p><p>Find the missing value.</p>`, rational(s.sorted[3]), [
        'The fourth and fifth values form the middle pair.', `Their sum is 2 × ${val(s.median)} = ${val(mul(rational(2), s.median))}.`, `Subtract the fifth value, ${s.sorted[4]}: the missing value is ${s.sorted[3]}.`,
      ], [[s.median, 'The median is the average of two values. The missing value is only one of them.'], [sub(s.median, rational(s.sorted[4])), 'Double the median before subtracting the other middle value.'], [rational(s.sorted[4]), 'The two middle values need not be equal. Check their average.'], ...commonWrong(s)], { ...model, kind: 'missing-median', hidden: 3, numbers: [val(s.median), ...s.sorted.filter((_, i) => i !== 3)] });
    }
    if (skill === 'S-RANGE') return numeric(skill, seed, shape, `<p>The smallest value is ${math(s.sorted[0])}.</p><p>The range is ${math(val(s.range))}.</p><p>Find the largest value.</p>`, rational(s.sorted[7]), [
      'Range = largest − smallest.', 'Largest = smallest + range.', `${s.sorted[0]} + ${val(s.range)} = ${s.sorted[7]}.`,
    ], [[s.range, 'The range is a distance. Start at the smallest value.'], [sub(rational(s.sorted[0]), s.range), 'Move upward from the minimum by the range.'], [mul(rational(s.sorted[0]), s.range), 'Add the distance to the starting value. Do not multiply.'], ...commonWrong(s)], { ...model, kind: 'missing-range', numbers: [s.sorted[0], val(s.range)] });
    if (skill === 'S-IQR') return numeric(skill, seed, shape, `<p>Q1 is ${math(val(s.q1))} and the IQR is ${math(val(s.iqr))}.</p><p>Find Q3.</p>`, s.q3, [
      'IQR = Q3 − Q1.', 'Q3 = Q1 + IQR.', `${val(s.q1)} + ${val(s.iqr)} = ${val(s.q3)}.`,
    ], [[s.iqr, 'The IQR is a distance from Q1, not Q3 itself.'], [sub(s.q1, s.iqr), 'Q3 lies above Q1. Add the IQR.'], [mul(s.q1, s.iqr), 'Use addition to move from Q1 to Q3.'], ...commonWrong(s)], { ...model, kind: 'missing-iqr', numbers: [val(s.q1), val(s.iqr)] });
    if (skill === 'S-BOX') return numeric(skill, seed, shape, `<p>The ordered values are ${inlineList(s.sorted)}.</p><p>Fill the missing median in this five-number summary.</p><p>${math(s.sorted[0])}, ${math(val(s.q1))}, □, ${math(val(s.q3))}, ${math(s.sorted[7])}</p>`, s.median, solutionMap['S-MEDIAN'], [[s.q1, 'That is the lower-half median. Use the middle of the whole list.'], [s.q3, 'That is the upper-half median. Use the middle of the whole list.'], [s.mean, 'A box plot marks the median, not the mean.'], ...commonWrong(s)], { ...model, kind: 'missing-box-median', numbers: [...s.sorted, val(s.q1), val(s.q3)] });
    if (skill === 'S-MAD') {
      const hidden = r.int(0, 7), partial = s.distances.filter((_, i) => i !== hidden), known = total(partial);
      return numeric(skill, seed, shape, `<p>Eight distances have MAD ${math(val(s.mad))}.</p><p>Seven distances are ${inlineList(partial)}.</p><p>Find the missing distance.</p>`, s.distances[hidden], [
        `The total distance is ${val(s.mad)} × 8 = ${val(total(s.distances))}.`, `The known distances total ${val(known)}.`, `Subtract to find the missing distance: ${val(s.distances[hidden])}.`,
      ], [[s.mad, 'MAD is the mean distance. One distance can be different.'], [sub(s.mad, known), 'Multiply MAD by eight before subtracting known distances.'], [total(s.distances), 'That is the total of all distances. Remove the known ones.'], ...commonWrong(s)], { ...model, kind: 'missing-mad', hidden, numbers: [8, val(s.mad), ...partial.map(val)] });
    }
  }
  return numeric(skill, seed, shape, prompt, answer, solutionMap[skill], candidates, model, svg);
}

function centerSkill(skill, seed, shape, r, difficulty) {
  const s = statsData(r, difficulty), increase = r.int(2, 240);
  const newValues = [...s.sorted];
  newValues[7] += increase;
  const changed = summary(newValues), meanIncrease = sub(changed.mean, s.mean);
  const genericHint = 'Changing the largest value changes the total. The two middle values stay in place.';
  const model = { kind: 'mean-increase', values: s.sorted, newValues, increase, numbers: [8, ...s.sorted, increase], genericHint };
  const solution = [`The total rises by ${increase}.`, 'There are still eight values.', `The mean rises by ${increase} ÷ 8 = ${val(meanIncrease)}.`, `The median remains ${val(s.median)}.`];
  if (shape === 'reason' || shape === 'picture') return choice(skill, seed, shape, r,
    `<p>The largest value changes from ${math(s.sorted[7])} to ${math(newValues[7])}.</p><p>Which measure stays the same?</p>${shape === 'reason' ? `<p>${inlineList(s.sorted)}</p>` : ''}`,
    ['median', 'Median, because the middle two values do not change.'], [
      ['mean', 'Mean, because the number of values stays the same.', 'The count stays the same, but the total changes.'],
      ['both', 'Both mean and median, because only one value changes.', 'The mean uses every value, including the changed value.'],
      ['neither', 'Neither, because every change moves the middle.', 'Changing the largest value does not move the two middle positions.'],
    ], solution, { ...model, kind: 'center-invariant', numbers: [...s.sorted, newValues[7]] }, shape === 'picture' ? dotplot(s.sorted, 'Before the change') : undefined);
  if (shape === 'missing') return numeric(skill, seed, shape,
    `<p>Only the largest of eight values changes.</p><p>The mean rises by ${math(val(meanIncrease))}.</p><p>How much did the largest value increase?</p>`, rational(increase),
    ['A rise in the mean is shared across all eight values.', 'Only one value changes, so it accounts for the whole rise.', `${val(meanIncrease)} × 8 = ${increase}.`],
    [[meanIncrease, 'That is the rise per value. There are eight values.'], [div(meanIncrease, rational(8)), 'Multiply by the count to recover the change in the total.'], [add(meanIncrease, rational(8)), 'Equal shares use multiplication, not addition.']], { ...model, kind: 'missing-increase', numbers: [8, val(meanIncrease)] });
  let prompt = `<p>Eight values are ${inlineList(s.sorted)}.</p><p>The largest rises by ${math(increase)}.</p><p>How much does the mean increase?</p>`;
  if (shape === 'story') prompt = `<p>${r.pick(names)} records eight game scores.</p><p>One score is corrected upward by ${math(increase)} points.</p><p>How much does the mean increase?</p>`;
  if (shape === 'mistake') prompt = `<p>${r.pick(names)} increases one of eight scores by ${math(increase)}.</p><p>They say the mean rises by ${math(increase)} too.</p><p>Find the correct increase in the mean.</p>`;
  if (shape === 'story' || shape === 'mistake') model.numbers = [8, increase];
  return numeric(skill, seed, shape, prompt, meanIncrease, solution, [
    [rational(increase), 'The change in the total is shared across all eight values.'],
    [rational(0), 'The mean uses the changed value, even though the median may stay fixed.'],
    [rational(increase * 8), 'Divide the change in the total by the number of values.'],
  ], model);
}

function spreadSkill(skill, seed, shape, r, difficulty) {
  const a = statsData(r, difficulty), factor = r.pick([2, 3]), shift = r.int(1, 12);
  const bValues = a.sorted.map(x => x * factor + shift), b = summary(bValues);
  const genericHint = 'Compare spread using IQR or MAD. A larger value or center alone does not show greater spread.';
  const model = { kind: 'spread-range-difference', a: a.sorted, b: bValues, factor, shift, numbers: [...a.sorted, ...bValues], genericHint };
  const table = `<p>Set A: ${inlineList(a.sorted)}</p><p>Set B: ${inlineList(bValues)}</p>`;
  if (shape === 'reason' || shape === 'picture') return choice(skill, seed, shape, r,
    `<p>Which set has the larger IQR?</p>${table}`,
    ['b', 'Set B; its middle half spans a wider interval.'], [
      ['a', 'Set A; smaller values always mean more spread.', 'Size and spread are different. Compare the distances between quartiles.'],
      ['same-count', 'They match because both contain eight values.', 'Equal counts do not imply equal spread.'],
      ['maximum', 'The maximum alone tells you the IQR.', 'IQR uses Q1 and Q3, not just the maximum.'],
    ], [`Set A has IQR ${val(a.iqr)}.`, `Set B has IQR ${val(b.iqr)}.`, `Set B's IQR is ${factor} times as large.`], { ...model, kind: 'spread-compare' }, shape === 'picture' ? boxplot(b, 'Set B') : undefined);
  if (shape === 'missing') {
    const givenMad = rational(r.int(5, 199), 4), distanceFactor = r.int(2, 5), newMad = mul(givenMad, rational(distanceFactor));
    return numeric(skill, seed, shape,
      `<p>Set A has MAD ${math(val(givenMad))}.</p><p>Every distance in set B is ${math(distanceFactor)} times as large.</p><p>Find set B's MAD.</p>`, newMad,
      ['MAD averages the distances from the mean.', `Each distance is multiplied by ${distanceFactor}.`, `The MAD is also multiplied: ${val(givenMad)} × ${distanceFactor} = ${val(newMad)}.`],
      [[givenMad, 'The distances changed, so their average changes too.'], [add(givenMad, rational(distanceFactor)), 'The distances are multiplied, not increased by a fixed amount.'], [div(givenMad, rational(distanceFactor)), 'The distances are larger, so multiply rather than divide.'], [sub(givenMad, rational(distanceFactor)), 'Larger distances require multiplication, not subtraction.']],
      { kind: 'spread-missing-mad', givenMad: val(givenMad), factor: distanceFactor, numbers: [val(givenMad), distanceFactor], genericHint });
  }
  const metric = shape === 'story' ? 'IQR' : 'range';
  const aMeasure = metric === 'IQR' ? a.iqr : a.range, bMeasure = metric === 'IQR' ? b.iqr : b.range;
  const answer = sub(bMeasure, aMeasure);
  let prompt = `<p>How much greater is set B's ${metric}?</p>${table}`;
  if (shape === 'story') prompt = `<p>Two groups record their game scores.</p>${table}<p>How much greater is group B's IQR?</p>`;
  if (shape === 'mistake') prompt = `<p>${r.pick(names)} says equal-sized groups have equal ranges.</p>${table}<p>How much greater is set B's range?</p>`;
  return numeric(skill, seed, shape, prompt, answer,
    [`Set A has ${metric} ${val(aMeasure)}.`, `Set B has ${metric} ${val(bMeasure)}.`, `Subtract: ${val(bMeasure)} − ${val(aMeasure)} = ${val(answer)}.`],
    [[rational(0), 'Equal counts do not mean equal spread. Compare the requested distances.'], [bMeasure, 'That is set B’s spread. Subtract set A’s spread.'], [rational(b.sorted[7] - a.sorted[7]), 'Comparing maxima alone ignores the lower boundary.'], [add(aMeasure, bMeasure), 'The question asks how much greater, so use subtraction.']],
    { ...model, kind: metric === 'IQR' ? 'spread-iqr-difference' : 'spread-range-difference' });
}

export function generateStatistics(skill, seed, { difficulty = 1, shape } = {}) {
  if (!statisticsSkills.includes(skill)) throw new Error(`Unknown statistics skill: ${skill}`);
  const r = rng(`${skill}:${seed}`);
  if (typeof shape === 'number') shape = SHAPES[((shape % SHAPES.length) + SHAPES.length) % SHAPES.length];
  shape = shape || r.pick(SHAPES);
  if (!SHAPES.includes(shape)) throw new Error(`Unknown statistics shape: ${shape}`);
  if (skill === 'S-QUESTION') return questionSkill(skill, seed, shape, r);
  if (skill === 'S-DISPLAY') return displaySkill(skill, seed, shape, r);
  if (skill === 'S-CENTER') return centerSkill(skill, seed, shape, r, difficulty);
  if (skill === 'S-SPREAD') return spreadSkill(skill, seed, shape, r, difficulty);
  return summarySkill(skill, seed, shape, r, difficulty);
}
