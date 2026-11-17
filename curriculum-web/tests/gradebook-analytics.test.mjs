import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReadiness, scoreBand } from '../server/gradebook-analytics.mjs';

const today = '2027-01-10';
const weeklyWeeks = [1, 2, 3, 4, 6, 7, 8];
const score = (kind, value, maxScore, extra = {}) => ({
  id: `${kind}-score`, assessmentId: `${kind}-assessment`, kind,
  score: value, maxScore, attempt: 1, takenOn: today, ...extra
});
const fixture = () => ({
  today,
  scores: [
    score('final', 24, 26), score('checkpoint', 24, 30), score('rehearsal', 36, 40),
    ...weeklyWeeks.map(week => score('weekly', 18, 21, { id: `week-${week}-score`, assessmentId: `week-${week}`, week }))
  ],
  days: Array.from({ length: 7 }, (_, index) => ({ date: `2027-01-${String(index + 4).padStart(2, '0')}`, online: { answered: 20, correct: 16, target: 20 } }))
});
const component = (result, key) => result.components.find(item => item.key === key);
const benchmark = (result, key) => result.benchmarks.find(item => item.key === key);

test('bands use exact thresholds rather than rounded percentages', () => {
  assert.equal(scoreBand('standards', 35, 39).key, 'solid');
  assert.equal(scoreBand('standards', 29, 39).key, 'gaps');
  assert.equal(scoreBand('standards', 28, 39).key, 'reteach');
  assert.equal(scoreBand('standards', 35, 37).key, 'needs-setup');
  assert.equal(scoreBand('weekly', 19, 21).key, 'strong');
  assert.equal(scoreBand('weekly', 16, 21).key, 'on-track');
  assert.equal(scoreBand('weekly', 12, 21).key, 'repeat');
  assert.equal(scoreBand('weekly', 11, 21).key, 'reteach');
  assert.equal(scoreBand('weekly', 90, 100).key, 'on-track');
  assert.equal(scoreBand('final', 24, 26).key, 'strong');
  assert.equal(scoreBand('final', 23, 26).key, 'on-track');
  assert.equal(scoreBand('daily', 90, 100).key, 'strong');
  assert.equal(scoreBand('paper', 75, 100).key, 'on-track');
  assert.equal(scoreBand('checkpoint', 899, 1000).key, 'on-track');
  assert.equal(scoreBand('checkpoint', 749, 1000).key, 'reteach');
  assert.equal(scoreBand('rehearsal', 30, 40).key, 'on-track');
  assert.equal(scoreBand('practice', 2, 23).key, 'diagnostic');
  assert.equal(scoreBand('custom', 5, 10).key, 'diagnostic');
  for (const [value, maximum] of [[-1, 21], [22, 21], [0, 0], [NaN, 21], [1, Infinity]]) {
    assert.throws(() => scoreBand('weekly', value, maximum), RangeError);
  }
  assert.throws(() => scoreBand('unknown', 1, 2), RangeError);
});

test('the seven-check policy excludes replacement weeks and gives diagnostics no weight', () => {
  const data = fixture();
  data.scores.push(score('weekly', 0, 21, { assessmentId: 'replaced-week-5', week: 5 }),
    score('weekly', 0, 21, { assessmentId: 'replaced-week-9', week: 9 }),
    score('standards', 0, 39), score('practice', 2, 23), score('custom', 0, 100));
  const result = buildReadiness(data);
  assert.equal(result.status, 'complete');
  assert.equal(result.audience, 'teacher');
  assert.equal(result.percent, 86.6);
  assert.equal(result.coveredWeight, 100);
  assert.equal(result.totalWeight, 100);
  assert.deepEqual(component(result, 'weekly').weeks, weeklyWeeks);
  assert.equal(component(result, 'weekly').count, 7);
  assert.deepEqual(benchmark(result, 'weekly-streak').weeks, [6, 7, 8]);
  assert.match(benchmark(result, 'weekly-streak').interpretation, /Weeks 6, 7 and 8/);
  assert.equal(result.review.ready, true);
  assert.match(result.review.note, /not BSD placement cutoffs/);
  assert.equal(benchmark(result, 'standards').met, false);
});

test('a missing component leaves the overall score uncomputed with useful coverage', () => {
  const data = fixture();
  data.scores = data.scores.filter(item => item.kind !== 'final' && item.week !== 3);
  const result = buildReadiness(data);
  assert.equal(result.status, 'incomplete');
  assert.equal(result.percent, null);
  assert.equal(result.coveredWeight, 45);
  assert.equal(component(result, 'weekly').count, 6);
  assert.deepEqual(component(result, 'weekly').missing, ['Week 3 check']);
  assert.ok(result.missing.includes('Final check'));
  assert.equal(benchmark(result, 'final').status, 'missing');
  assert.equal(result.review.ready, false);
  const unresolved = buildReadiness({ ...fixture(), weeklyPolicy: 'unresolved' });
  assert.equal(unresolved.status, 'needs-setup');
  assert.equal(unresolved.percent, null);
  assert.equal(unresolved.review.ready, null);
});

test('latest retake replaces the first attempt even when its score is lower', () => {
  const data = fixture();
  data.scores.push(score('final', 10, 26, { id: 'final-retake', attempt: 2 }));
  const result = buildReadiness(data);
  assert.equal(component(result, 'final').score.id, 'final-retake');
  assert.equal(component(result, 'final').score.attempt, 2);
  assert.equal(component(result, 'final').count, 1);
  assert.equal(result.percent, 70.5);
  assert.equal(benchmark(result, 'final').met, false);
  assert.equal(result.review.ready, false);
});

test('daily accuracy uses question counts, exactly 14 calendar dates and no paper points', () => {
  const data = fixture();
  data.days = [
    { date: '2026-12-27', online: { answered: 100, correct: 100 } },
    { date: '2026-12-28', online: { answered: 1, correct: 1 }, paper: { total: 10, correct: 10 } },
    { date: '2027-01-10', online: { answered: 9, correct: 1 }, paper: { total: 90, correct: 0 } },
    { date: '2027-01-11', online: { answered: 100, correct: 100 } }
  ];
  const result = buildReadiness(data);
  assert.deepEqual(result.accuracy.online, { startDate: '2026-12-28', endDate: today, answered: 10, correct: 2, recordedDays: 2, percent: 20 });
  assert.equal(result.accuracy.paper.percent, 10);
  assert.equal(component(result, 'daily').percent, 20);
  assert.equal(result.percent, 77.6);
  assert.match(component(result, 'daily').scope, /Online first attempts only/);
  assert.equal(benchmark(result, 'daily-completion').completed, 0);
  data.days.push({ date: today, online: { answered: 9, correct: 1 }, paper: { total: 90, correct: 0 } });
  assert.deepEqual(buildReadiness(data).accuracy, result.accuracy, 'duplicate joined dates cannot double-count a day');
});

test('empty accuracy remains unknown while a recorded zero score is real', () => {
  const data = fixture();
  data.days = [{ date: today, online: { correct: 0, answered: 0 }, paper: { correct: 0, total: 20 } }];
  data.scores.find(item => item.kind === 'checkpoint').score = 0;
  const result = buildReadiness(data);
  assert.equal(result.percent, null);
  assert.equal(component(result, 'daily').percent, null);
  assert.equal(component(result, 'checkpoint').percent, 0);
  assert.equal(component(result, 'checkpoint').complete, true);
  assert.equal(result.accuracy.paper.percent, 0);
  assert.ok(result.missing.includes('Online answers in the last 14 days'));
});

test('completion counts actual dates, not paper work, catch-up allocations or days without a target', () => {
  const data = fixture();
  data.days[0] = { ...data.days[0], online: { answered: 0, correct: 0, target: 20 }, completion: true, catchupCredit: 20, paper: { correct: 20, total: 20 } };
  assert.equal(benchmark(buildReadiness(data), 'daily-completion').completed, 6);
  assert.equal(buildReadiness(data).review.ready, true);
  data.days[1].online.target = 0;
  const result = buildReadiness(data);
  assert.equal(benchmark(result, 'daily-completion').completed, 5);
  assert.equal(result.review.ready, false);
  assert.match(benchmark(result, 'daily-completion').scope, /later catch-up credit do not change/);
});

test('standards correction completion alone does not certify fixed gaps', () => {
  const data = fixture();
  const standards = score('standards', 28, 39, { redoCompleted: true });
  data.scores.push(standards);
  assert.equal(benchmark(buildReadiness(data), 'standards').met, false);
  standards.areasRetakenFixed = true;
  assert.equal(benchmark(buildReadiness(data), 'standards').met, true);
  standards.maxScore = 37;
  assert.equal(benchmark(buildReadiness(data), 'standards').met, null);
  assert.equal(benchmark(buildReadiness(data), 'standards').status, 'needs-clarification');
});

test('benchmark dates follow course shifts and malformed inputs cannot produce a false complete score', () => {
  const data = fixture();
  const original = buildReadiness(data);
  assert.equal(benchmark(original, 'standards').dueDate, '2026-12-04');
  assert.equal(benchmark(original, 'checkpoint').dueDate, '2026-12-11');
  assert.equal(benchmark(original, 'rehearsal').dueDate, '2027-01-08');
  assert.equal(benchmark(original, 'final').dueDate, '2027-01-10');
  assert.equal(benchmark(buildReadiness({ ...data, startDate: '2026-11-14' }), 'final').dueDate, '2027-01-17');
  data.scores.push(score('final', 101, 100, { assessmentId: 'malformed-eligible-final' }));
  const result = buildReadiness(data);
  assert.equal(result.percent, null);
  assert.equal(result.review.ready, null);
  assert.ok(result.missing.includes('1 invalid score record needs review'));
  assert.throws(() => buildReadiness({ today: '2027-02-30' }), RangeError);
  assert.throws(() => buildReadiness({ scores: null }), TypeError);
  assert.throws(() => buildReadiness({ weeklyPolicy: 'mystery' }), RangeError);
});


test('unknown-date diagnostics and custom test kinds do not replace weighted evidence', () => {
  const data = fixture(), original = buildReadiness(data);
  data.scores.push(
    score('practice', 2, 23, { takenOn: null, readinessEligible: false }),
    score('practice', 2, 23, { assessmentId: 'raw-diagnostic', takenOn: null }),
    score('custom', 200, 100, { assessmentId: 'noncourse-custom', takenOn: null }),
    score('final', 0, 26, { assessmentId: 'custom-final', weight: 0 }),
    score('checkpoint', 0, 30, { assessmentId: 'custom-checkpoint', readinessEligible: false }),
    score('weekly', 0, 21, { assessmentId: 'custom-weekly', week: 8, weight: 0 }),
    score('standards', 0, 39, { assessmentId: 'custom-standards', readinessEligible: false })
  );
  const result = buildReadiness(data);
  assert.equal(result.status, 'complete');
  assert.equal(result.percent, original.percent);
  assert.deepEqual(result.missing, []);
  assert.equal(component(result, 'weekly').count, 7);
  assert.equal(benchmark(result, 'standards').status, 'missing');
});

test('an undated latest retake needs confirmation without reviving an older score or becoming corrupt', () => {
  const data = fixture();
  data.scores.push(score('weekly', 10, 21, { id: 'week8-undated-retake', assessmentId: 'week-8', week: 8, attempt: 2, takenOn: null }));
  const result = buildReadiness(data), weekly = component(result, 'weekly');
  assert.equal(result.status, 'incomplete');
  assert.equal(result.percent, null);
  assert.equal(weekly.count, 6);
  assert.equal(weekly.complete, false);
  assert.deepEqual(weekly.dateNeeded, [{ assessmentId: 'week-8', kind: 'weekly', week: 8, reason: 'date-needed' }]);
  assert.match(weekly.missing[0], /Week 8 check.*confirm.*date/);
  assert.ok(!result.missing.some(label => label.includes('invalid')));
  assert.equal(benchmark(result, 'weekly-streak').status, 'missing');
  assert.equal(result.review.ready, false);
});

test('a future-dated latest attempt cannot fall back to the previous result', () => {
  const data = fixture();
  data.scores.push(score('final', 26, 26, { id: 'future-final', attempt: 2, takenOn: '2027-01-11' }));
  const result = buildReadiness(data), final = component(result, 'final');
  assert.equal(final.count, 0);
  assert.equal(final.score, null);
  assert.equal(final.dateNeeded[0].reason, 'future-date');
  assert.equal(result.percent, null);
  assert.equal(benchmark(result, 'final').met, false);
});

test('benchmark dates use catalog overrides and fall back safely when an override is absent or invalid', () => {
  const data = fixture();
  const result = buildReadiness({ ...data, assessmentDates: {
    'standards-5': '2026-12-06', checkpoint: '2026-12-18', rehearsal: '2027-01-15', final: '2027-01-17'
  } });
  assert.equal(benchmark(result, 'standards').dueDate, '2026-12-06');
  assert.equal(benchmark(result, 'checkpoint').dueDate, '2026-12-18');
  assert.equal(benchmark(result, 'rehearsal').dueDate, '2027-01-15');
  assert.equal(benchmark(result, 'final').dueDate, '2027-01-17');
  const fallback = buildReadiness({ ...data, startDate: '2026-11-14', assessmentDates: { final: 'invalid', checkpoint: null } });
  assert.equal(benchmark(fallback, 'final').dueDate, '2027-01-17');
  assert.equal(benchmark(fallback, 'checkpoint').dueDate, '2026-12-18');
});
