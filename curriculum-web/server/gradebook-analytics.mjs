import { addDays, validDate, pacificDate } from './plan.mjs';

const KINDS = new Set(['standards', 'practice', 'weekly', 'checkpoint', 'rehearsal', 'final', 'custom', 'daily', 'paper']);
const WEEKLY_POLICIES = Object.freeze({ seven: [1, 2, 3, 4, 6, 7, 8], nine: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
const WEIGHTS = Object.freeze({ final: 30, weekly: 25, checkpoint: 15, rehearsal: 15, daily: 15 });
const round = value => Math.round(value * 10) / 10;
const ratio = (score, maxScore) => score / maxScore * 100;
const count = value => Number.isInteger(value) && value >= 0;
const validScore = (score, maxScore) => Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0 && score >= 0 && score <= maxScore;

/** Bands describe course work, never a district placement decision. */
export function scoreBand(kind, score, maxScore) {
  if (!KINDS.has(kind)) throw new RangeError('Unknown assessment kind.');
  if (!validScore(score, maxScore)) throw new RangeError('Score must be between zero and a positive maximum.');
  const percent = Math.round(ratio(score, maxScore));
  const band = (key, label, minimumPercent = null, maximumPercent = null) => ({ key, label, percent, minimumPercent, maximumPercent });
  if (kind === 'practice' || kind === 'custom') return band('diagnostic', 'Diagnostic');
  if (kind === 'standards') {
    // The supplied syllabus is the 39-question version. Another version needs
    // its own agreed bands, rather than silently applying 35/39 to a new test.
    if (maxScore !== 39) return { ...band('needs-setup', 'Confirm score bands'), note: 'The syllabus bands apply to the 39-question standards check.' };
    if (score >= 35) return band('solid', 'Solid', 35 / 39 * 100, 100);
    if (score >= 29) return band('gaps', 'A few gaps', 29 / 39 * 100, 35 / 39 * 100);
    return band('reteach', 'Fix gaps first', 0, 29 / 39 * 100);
  }
  if (kind === 'weekly' || kind === 'final') {
    // Compare exact ratios before rounding a displayed percentage. In
    // particular, 90% is below the weekly strong threshold of 19/21.
    if (score * 21 >= maxScore * 19) return band('strong', 'Strong', 19 / 21 * 100, 100);
    if (score * 21 >= maxScore * 16) return band('on-track', 'On track', 16 / 21 * 100, 19 / 21 * 100);
    if (score * 21 >= maxScore * 12) return band('repeat', 'Repeat the weakest idea', 12 / 21 * 100, 16 / 21 * 100);
    return band('reteach', 'Reteach', 0, 12 / 21 * 100);
  }
  if (score * 100 >= maxScore * 90) return band('strong', 'Strong', 90, 100);
  if (score * 100 >= maxScore * 75) return band('on-track', 'On track', 75, 90);
  return band('reteach', 'Reteach', 0, 75);
}

function attemptOrder(a, b) {
  return (Number(a.attempt) || 1) - (Number(b.attempt) || 1)
    || String(a.takenOn).localeCompare(String(b.takenOn))
    || String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
    || String(a.id || '').localeCompare(String(b.id || ''));
}

function chronologicalOrder(a, b) {
  return String(a.takenOn).localeCompare(String(b.takenOn))
    || String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
    || attemptOrder(a, b);
}

function latestScores(scores, today) {
  const byAssessment = new Map();
  let invalidCount = 0;
  for (const score of scores) {
    // A custom test can share a kind with a syllabus test, but that does not
    // grant it authority to replace the course's weighted evidence.
    if (score?.readinessEligible === false || (score?.weight === 0 && score?.kind !== 'standards')) continue;
    if (['practice', 'custom', 'daily', 'paper'].includes(score?.kind)) continue;
    if (!score || !score.assessmentId || !KINDS.has(score.kind)) {
      invalidCount++;
      continue;
    }
    const previous = byAssessment.get(score.assessmentId);
    if (!previous || attemptOrder(score, previous) > 0) byAssessment.set(score.assessmentId, score);
  }
  const selected = [], dateNeeded = [];
  for (const score of byAssessment.values()) {
    // Resolve the latest attempt first. Missing dates or a bad latest result
    // must never resurrect an older, higher score as current evidence.
    if (!validScore(score.score, score.maxScore)) { invalidCount++; continue; }
    if (!validDate(score.takenOn) || score.takenOn > today) {
      dateNeeded.push({ assessmentId: score.assessmentId, kind: score.kind, week: score.week ?? null,
        reason: !validDate(score.takenOn) ? 'date-needed' : 'future-date' });
      continue;
    }
    selected.push(score);
  }
  return { scores: selected, invalidCount, dateNeeded };
}

function latest(list) { return [...list].sort(chronologicalOrder).at(-1) || null; }
function scoreView(score) {
  if (!score) return null;
  return {
    id: score.id ?? null, assessmentId: score.assessmentId, kind: score.kind,
    week: score.week ?? null, score: score.score, maxScore: score.maxScore,
    percent: round(ratio(score.score, score.maxScore)), takenOn: score.takenOn,
    attempt: Number(score.attempt) || 1
  };
}

function sumAccuracy(days, source, startDate, endDate) {
  let answered = 0, correct = 0, recordedDays = 0;
  for (const day of days) {
    if (day.date < startDate || day.date > endDate) continue;
    const value = day[source], total = source === 'paper' ? value?.total : value?.answered;
    if (!value || !count(total) || !count(value.correct) || value.correct > total || total === 0) continue;
    answered += total;
    correct += value.correct;
    recordedDays++;
  }
  return { startDate, endDate, answered, correct, recordedDays, percent: answered ? round(ratio(correct, answered)) : null };
}

/**
 * Teacher-only planning aggregate. Callers must enforce authorization before
 * returning this object. Only actual, dated first attempts belong in `online`;
 * allocated catch-up credit and paper grades never count as on-time completion.
 */
export function buildReadiness({ scores = [], days = [], today = pacificDate(), weeklyPolicy = 'seven', standardsMax = 39, startDate = '2026-11-07', assessmentDates = {} } = {}) {
  if (!validDate(today) || !validDate(startDate)) throw new RangeError('Use valid calendar dates.');
  if (!Array.isArray(scores) || !Array.isArray(days)) throw new TypeError('Scores and days must be arrays.');
  if (!['seven', 'nine', 'unresolved'].includes(weeklyPolicy)) throw new RangeError('Unknown weekly-check policy.');
  if (!Number.isInteger(standardsMax) || standardsMax < 1) throw new RangeError('Standards maximum must be positive.');
  const { scores: selected, invalidCount, dateNeeded } = latestScores(scores, today);
  const dueDate = (id, offset) => validDate(assessmentDates?.[id]) ? assessmentDates[id] : addDays(startDate, offset);
  const needsDate = (kind, week = null) => dateNeeded.filter(score => score.kind === kind && (week === null || score.week === week));
  const missingLabel = (label, kind, week = null) => needsDate(kind, week).length ? `${label}: confirm the latest attempt’s test date` : label;
  const weeks = WEEKLY_POLICIES[weeklyPolicy] || [];
  const byKind = kind => latest(selected.filter(score => score.kind === kind));
  const selectedWeekly = weeks.map(week => latest(selected.filter(score => score.kind === 'weekly' && score.week === week)));
  const uniqueDays = [...new Map(days.filter(day => day && validDate(day.date)).map(day => [day.date, day])).values()];
  const recentStart = addDays(today, -13);
  const online = sumAccuracy(uniqueDays, 'online', recentStart, today);
  const paper = sumAccuracy(uniqueDays, 'paper', recentStart, today);
  const components = [];
  for (const [key, label] of [['final', 'Final check'], ['weekly', 'Weekly checks'], ['checkpoint', 'Halfway checkpoint'], ['rehearsal', 'Dress rehearsal'], ['daily', 'Online accuracy, last 14 days']]) {
    const weight = WEIGHTS[key];
    if (key === 'weekly') {
      const recorded = selectedWeekly.filter(Boolean);
      const missing = weeks.filter((_, index) => !selectedWeekly[index]).map(week => missingLabel(`Week ${week} check`, 'weekly', week));
      if (!weeks.length) missing.push('Confirm the weekly-check policy');
      components.push({ key, label, weight, percent: recorded.length ? round(recorded.reduce((sum, score) => sum + ratio(score.score, score.maxScore), 0) / recorded.length) : null,
        complete: Boolean(weeks.length) && recorded.length === weeks.length, count: recorded.length, expectedCount: weeks.length || null, weeks: [...weeks], missing, dateNeeded: needsDate('weekly'), scores: recorded.map(scoreView) });
    } else if (key === 'daily') {
      components.push({ key, label, weight, percent: online.percent, complete: online.answered > 0, count: online.recordedDays, expectedCount: 14,
        answered: online.answered, correct: online.correct, scope: 'Online first attempts only, weighted by questions answered; paper grades shown separately.',
        startDate: recentStart, endDate: today, missing: online.answered ? [] : ['Online answers in the last 14 days'] });
    } else {
      const score = byKind(key);
      components.push({ key, label, weight, percent: score ? round(ratio(score.score, score.maxScore)) : null,
        complete: Boolean(score), count: score ? 1 : 0, expectedCount: 1, missing: score ? [] : [missingLabel(label, key)], dateNeeded: needsDate(key), score: scoreView(score) });
    }
  }
  const missing = components.flatMap(component => component.missing);
  if (invalidCount) missing.push(`${invalidCount} invalid score ${invalidCount === 1 ? 'record needs' : 'records need'} review`);
  const complete = missing.length === 0;
  // Retain full precision for the aggregate; round only the final displayed value.
  const rawComponent = key => {
    if (key === 'daily') return ratio(online.correct, online.answered);
    if (key === 'weekly') return selectedWeekly.reduce((sum, score) => sum + ratio(score.score, score.maxScore), 0) / selectedWeekly.length;
    const score = byKind(key);
    return ratio(score.score, score.maxScore);
  };
  const percent = complete ? round(components.reduce((sum, component) => sum + rawComponent(component.key) * component.weight / 100, 0)) : null;
  const benchmark = (key, label, score, targetPercent, dueDate) => ({
    key, label, status: !score ? 'missing' : score.score * 100 >= score.maxScore * targetPercent ? 'met' : 'not-yet',
    met: score ? score.score * 100 >= score.maxScore * targetPercent : false,
    percent: score ? round(ratio(score.score, score.maxScore)) : null, targetPercent, dueDate, dateNeeded: needsDate(key), score: scoreView(score)
  });
  const standardsScore = byKind('standards');
  const standards = benchmark('standards', 'Grade 5 standards check', standardsScore, 35 / 39 * 100, dueDate('standards-5', 27));
  // A completed redo is not evidence that an area was retested successfully.
  const standardsFixed = standardsScore?.areasRetakenFixed === true;
  if (standardsMax !== 39 || (standardsScore && standardsScore.maxScore !== standardsMax)) {
    standards.status = 'needs-clarification'; standards.met = null;
    standards.note = 'Confirm the standards test version and its benchmark.';
  } else {
    standards.met = standardsScore ? standardsScore.score >= 35 || standardsFixed : false;
    standards.status = !standardsScore ? 'missing' : standards.met ? 'met' : 'not-yet';
    standards.note = '35 of 39, or separately confirmed missed areas retaken and fixed.';
  }
  const benchmarkWeeks = weeks.slice(-3);
  const benchmarkScores = benchmarkWeeks.map(week => latest(selected.filter(score => score.kind === 'weekly' && score.week === week)));
  const streakMet = benchmarkScores.length === 3 && benchmarkScores.every(score => score && score.score * 21 >= score.maxScore * 16);
  const weekly = {
    key: 'weekly-streak', label: 'Last three scheduled weekly checks',
    status: !weeks.length ? 'needs-clarification' : benchmarkScores.some(score => !score) ? 'missing' : streakMet ? 'met' : 'not-yet',
    met: weeks.length ? streakMet : null, weeks: benchmarkWeeks, targetPercent: 16 / 21 * 100,
    scores: benchmarkScores.filter(Boolean).map(scoreView), missingWeeks: benchmarkWeeks.filter((_, index) => !benchmarkScores[index]),
    interpretation: weeklyPolicy === 'seven'
      ? 'Weeks 6, 7 and 8 are the last three scheduled weekly checks; the Week 5 checkpoint and Week 9 rehearsal are separate tests.'
      : weeklyPolicy === 'nine' ? 'Weeks 7, 8 and 9 are the last three scheduled weekly checks.' : 'Choose which weekly checks count before evaluating this target.'
  };
  const completionStart = addDays(today, -6);
  const daysByDate = new Map(uniqueDays.map(day => [day.date, day]));
  const completionDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(completionStart, index), day = daysByDate.get(date);
    const target = day?.online?.target ?? day?.completionTarget ?? 20;
    const answered = count(day?.online?.answered) ? day.online.answered : 0;
    return { date, answered, target: count(target) ? target : 20,
      complete: date >= startDate && count(target) && target > 0 && answered >= target };
  });
  const completed = completionDays.filter(day => day.complete).length;
  const completion = { key: 'daily-completion', label: 'Daily goal on at least 6 of the last 7 days', status: completed >= 6 ? 'met' : 'not-yet',
    met: completed >= 6, completed, target: 6, totalDays: 7, startDate: completionStart, endDate: today, days: completionDays,
    scope: 'Actual online answers on each date; paper work and later catch-up credit do not change on-time completion.' };
  const final = benchmark('final', 'Final check', byKind('final'), 90, dueDate('final', 64));
  const benchmarks = [standards,
    benchmark('checkpoint', 'Halfway checkpoint', byKind('checkpoint'), 75, dueDate('checkpoint', 34)),
    benchmark('rehearsal', 'Dress rehearsal', byKind('rehearsal'), 85, dueDate('rehearsal', 62)), final, weekly, completion];
  const reviewNeedsSetup = weekly.met === null || invalidCount > 0;
  const ready = reviewNeedsSetup ? null : final.met && weekly.met && completion.met;
  return {
    label: 'Course planning score', audience: 'teacher',
    status: weeklyPolicy === 'unresolved' ? 'needs-setup' : complete ? 'complete' : 'incomplete',
    percent, totalWeight: 100, coveredWeight: components.filter(component => component.complete).reduce((sum, component) => sum + component.weight, 0),
    components, missing, benchmarks,
    review: { status: reviewNeedsSetup ? 'needs-setup' : ready ? 'targets-met' : 'not-yet', ready,
      label: 'Course targets for asking the school about a placement review',
      note: 'These are this course’s planning targets, not BSD placement cutoffs or a placement decision.' },
    accuracy: { online, paper },
    policy: { weeklyPolicy, weeklyWeeks: [...weeks], standardsMax, dailyAccuracyScope: 'online-first-try', weights: { ...WEIGHTS },
      retakes: 'Latest attempt per eligible assessment. An undated or future-dated latest attempt needs its date confirmed; an older result is not substituted.',
      diagnostics: ['standards', 'practice', 'custom'],
      note: 'Paper grades, test scores and this planning estimate never change online counts, backlog or points.' }
  };
}
