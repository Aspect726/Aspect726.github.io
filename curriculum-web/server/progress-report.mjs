import { addDays, validDate } from './plan.mjs';

const count = value => Number.isInteger(value) && value >= 0 ? value : null;
const plain = value => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const percent = (correct, answered) => answered > 0 && correct !== null ? Math.round(correct / answered * 100) : null;
const quantity = (value, noun) => `${value} ${noun}${value === 1 ? '' : 's'}`;
const accuracyText = value => value.percent === null ? 'No answers yet' : `${value.percent}% (${value.correct}/${value.answered} correct)`;
const safePercent = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value * 10) / 10 : null;

// Keep the shareable report separate from the teacher's full gradebook. In
// particular, score notes, missed-answer notes and audit history stay private.
function gradebookReport(source) {
  if (!source) return null;
  const test = source.latestTest, score = count(test?.score), maxScore = count(test?.maxScore);
  const latestTest = test && score !== null && maxScore > 0 && score <= maxScore ? {
    title: plain(test.title), score, maxScore, percent: Math.round(score / maxScore * 1000) / 10,
    takenOn: validDate(test.takenOn) ? test.takenOn : null, attempt: count(test.attempt) ?? 1
  } : null;
  const planning = source.readiness;
  const readiness = planning ? {
    label: 'Program planning estimate',
    status: ['complete', 'incomplete', 'needs-setup'].includes(planning.status) ? planning.status : 'incomplete',
    percent: planning.status === 'complete' ? safePercent(planning.percent) : null,
    missing: Array.isArray(planning.missing) ? planning.missing.filter(item => typeof item === 'string').map(plain) : [],
    note: 'This is a course planning estimate, not a BSD placement decision.'
  } : null;
  const paper = source.paper ? { recordedDays: count(source.paper.recordedDays), correct: count(source.paper.correct), total: count(source.paper.total) } : null;
  if (paper) paper.percent = paper.total > 0 && paper.correct !== null ? Math.round(paper.correct / paper.total * 1000) / 10 : null;
  return { latestTest, readiness, paper, nextAction: source.nextAction?.text ? plain(source.nextAction.text) : null };
}

// Accept the complete, student-specific teacher detail before UI filters are
// applied. This is a summary of stored metrics, not a new grading calculation.
export function progressReport(detail, { date = detail.schedule?.today?.date, timeZone = detail.schedule?.timeZone ?? 'America/Los_Angeles' } = {}) {
  if (!validDate(date)) throw new RangeError('A report needs its course calendar date.');
  if (!detail.student?.id || !detail.schedule?.backlog) throw new TypeError('A report needs a student and the canonical course backlog.');

  const schedule = detail.schedule, source = schedule.backlog, summary = detail.summary ?? {};
  const backlog = Object.fromEntries(['behind', 'overdue', 'remainingToday', 'requiredToDate', 'completedToDate', 'catchupCredit', 'overdueDays', 'completedDays'].map(key => [key, count(source[key])]));
  backlog.oldestDueDate = validDate(source.oldestDueDate) ? source.oldestDueDate : null;
  const current = schedule.days?.find(day => day.date === date) ?? null;
  const daily = detail.days?.find(day => day.date === date) ?? null;
  const today = {
    answered: count(daily?.answered ?? current?.answered) ?? 0,
    correct: count(daily?.correct ?? current?.correct) ?? 0,
    target: count(current?.expected) ?? 0,
    remaining: count(source.remainingToday),
    dueAt: current?.dueAt ?? null,
    scheduled: Boolean(current)
  };
  today.accuracy = percent(today.correct, today.answered);
  const totals = {
    answered: count(summary.answered),
    correct: count(summary.correct),
    requiredToDate: backlog.requiredToDate,
    completedToDate: backlog.completedToDate
  };
  const recentStart = addDays(date, -6);
  const recentDays = (detail.days ?? []).filter(day => day.date >= recentStart && day.date <= date);
  const recent = recentDays.reduce((result, day) => ({
    ...result,
    answered: result.answered + (count(day.answered) ?? 0),
    correct: result.correct + (count(day.correct) ?? 0)
  }), { startDate: recentStart, endDate: date, answered: 0, correct: 0 });
  recent.percent = percent(recent.correct, recent.answered);
  const accuracy = { overall: { answered: totals.answered, correct: totals.correct, percent: percent(totals.correct, totals.answered) }, recent };

  const skills = detail.skills ?? [];
  const mastery = { total: skills.length, mastered: 0, practicing: 0, learning: 0, notStarted: 0 };
  const masteryKey = { Mastered: 'mastered', Practicing: 'practicing', Learning: 'learning', 'Not started': 'notStarted' };
  const levels = { counts: { 1: 0, 2: 0, 3: 0 }, practicedSkills: 0, latest: null };
  for (const skill of skills) {
    const key = masteryKey[skill.mastery ?? skill.level];
    if (key) mastery[key]++;
    if (skill.attempts > 0 && [1, 2, 3].includes(skill.difficulty)) {
      levels.counts[skill.difficulty]++;
      levels.practicedSkills++;
    }
  }
  const latest = (detail.attempts ?? []).filter(attempt => attempt.date <= date && [1, 2, 3].includes(attempt.level))
    .reduce((last, attempt) => !last || (attempt.createdAt ?? attempt.date) > (last.createdAt ?? last.date) ? attempt : last, null);
  if (latest) levels.latest = latest.level;

  const focusDay = current ?? schedule.nextDue ?? [...(schedule.days ?? [])].reverse().find(day => day.date <= date);
  const focus = focusDay ? {
    title: plain(focusDay.title),
    week: count(focusDay.week),
    skills: (focusDay.focus ?? []).map(id => ({ id, name: plain(skills.find(skill => skill.skill === id)?.name ?? id) })),
    date: focusDay.date,
    upcoming: focusDay.date > date
  } : null;
  const streak = count(summary.streak), points = count(detail.points ?? summary.points);
  let nextAction;
  if (today.remaining > 0) nextAction = `Finish ${quantity(today.remaining, 'question')} for today's goal${backlog.overdue > 0 ? ', then start catch-up practice' : ''}.`;
  else if (backlog.overdue > 0) nextAction = `${today.scheduled ? "Today's goal is complete." : 'No daily set is scheduled today.'} Work on ${quantity(backlog.overdue, 'overdue question')} in catch-up practice.`;
  else if (schedule.phase === 'before') nextAction = `Daily practice starts ${schedule.startDate}. Try extra practice in the meantime.`;
  else nextAction = 'All scheduled questions are complete. Keep building confidence with extra practice or review.';

  const student = { id: detail.student.id, name: plain(detail.student.name) || 'Student' };
  const gradebook = gradebookReport(detail.gradebookSummary);
  const latestTest = gradebook?.latestTest, planning = gradebook?.readiness;
  const lines = [
    `${student.name} — math progress update`,
    `${date} (${timeZone})`,
    '',
    `Questions behind: ${backlog.behind} — ${backlog.overdue} overdue from earlier days + ${backlog.remainingToday} left today.`,
    today.scheduled ? `Today: ${today.answered}/${today.target} questions answered; ${today.remaining} left for today's goal.` : `Today: ${today.answered} questions answered; no daily set scheduled.`,
    `Course progress: ${totals.completedToDate}/${totals.requiredToDate} required questions completed through today.`,
    `Total questions answered: ${totals.answered}.`,
    `Overall accuracy: ${accuracyText(accuracy.overall)}.`,
    `Last 7 days (${recentStart} to ${date}): ${accuracyText(recent)}.`,
    `Skills: ${mastery.mastered}/${mastery.total} mastered; ${mastery.practicing} practicing; ${mastery.learning} learning; ${mastery.notStarted} not started.`,
    levels.practicedSkills ? `Website practice levels: ${[1, 2, 3].map(level => `Level ${level}: ${quantity(levels.counts[level], 'skill')}`).join('; ')}.` : totals.answered === 0 ? 'Website practice level: No questions answered yet.' : 'Website practice level: No level recorded yet.',
    ...(levels.latest ? [`Most recent question: website level ${levels.latest} of 3.`] : []),
    'Practice levels describe question difficulty on this website, not school grade or placement readiness.',
    ...(focus?.title ? [`${focus.upcoming ? 'Next focus' : 'Current focus'}: ${focus.title}${focus.week ? ` (week ${focus.week})` : ''}.`] : []),
    ...(streak !== null ? [`Current streak: ${quantity(streak, 'day')}.`] : []),
    ...(points !== null ? [`Reward points: ${points}.`] : []),
    ...(gradebook ? [
      latestTest ? `Latest recorded test: ${latestTest.title} — ${latestTest.score}/${latestTest.maxScore} (${latestTest.percent}%), ${latestTest.takenOn ?? 'date not recorded'}${latestTest.attempt > 1 ? `, attempt ${latestTest.attempt}` : ''}.` : 'Latest recorded test: No grade recorded yet.',
      ...(gradebook.paper?.recordedDays ? [`Paper practice: ${gradebook.paper.recordedDays} days graded${gradebook.paper.percent !== null ? `; ${gradebook.paper.correct}/${gradebook.paper.total} correct (${gradebook.paper.percent}%)` : ''}.`] : ['Paper practice: No grades recorded yet.']),
      'Paper grades and tests do not change online completion, catch-up counts or reward points.',
      ...(planning ? [
        `Program planning estimate: ${planning.percent !== null ? `${planning.percent}%` : planning.status === 'needs-setup' ? 'Teacher setup needed' : 'More results needed'}.`,
        ...(planning.missing.length ? [`Still needed: ${planning.missing.join('; ')}.`] : []),
        planning.note
      ] : [])
    ] : []),
    '',
    `Next step: ${nextAction}`,
    ...(gradebook?.nextAction ? [`Test & paper next step: ${gradebook.nextAction}`] : []),
    'Practice: https://donteventry.me/s/today'
  ];
  return { date, timeZone, student, backlog, today, totals, accuracy, mastery, levels, focus, streak, points, nextAction, ...(gradebook ? { gradebook } : {}), text: lines.join('\n') };
}
