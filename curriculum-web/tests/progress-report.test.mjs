import test from 'node:test';
import assert from 'node:assert/strict';
import { progressReport } from '../server/progress-report.mjs';

function fixture() {
  return {
    student: { id: 'learner', name: 'Ari', username: 'private-login', email: 'private@example.test' },
    summary: { answered: 0, correct: 0, accuracy: null, streak: 0 },
    points: 0,
    schedule: {
      phase: 'active', timeZone: 'America/Los_Angeles', startDate: '2026-11-07',
      backlog: { behind: 160, overdue: 140, remainingToday: 20, requiredToDate: 160, completedToDate: 0, catchupCredit: 0, overdueDays: 7, completedDays: 0, oldestDueDate: '2026-11-07' },
      days: [{ date: '2026-11-14', expected: 20, answered: 0, correct: 0, remaining: 20, title: 'Exponents count equal factors', week: 2, focus: ['E-EXP'], dueAt: '2026-11-15T08:00:00.000Z' }]
    },
    days: [],
    skills: [{ skill: 'E-EXP', name: 'Whole-number exponents', attempts: 0, mastery: 'Not started', difficulty: 1 }],
    attempts: [],
    conversations: [{ text: 'Private conversation' }]
  };
}

test('report shows the full 160-question backlog, no invented zero-percent accuracy, and copyable next steps', () => {
  const report = progressReport(fixture(), { date: '2026-11-14' });
  assert.equal(report.backlog.behind, 160);
  assert.equal(report.today.target, 20);
  assert.equal(report.accuracy.overall.percent, null);
  assert.equal(report.accuracy.recent.percent, null);
  assert.equal(report.levels.latest, null);
  assert.match(report.text, /160 — 140 overdue from earlier days \+ 20 left today/);
  assert.match(report.text, /Overall accuracy: No answers yet/);
  assert.match(report.text, /Finish 20 questions for today's goal, then start catch-up practice/);
  assert.match(report.text, /Current focus: Exponents count equal factors \(week 2\)/);
  assert.doesNotMatch(JSON.stringify(report), /private-login|private@example|Private conversation/);
});

test('report preserves canonical catch-up credit instead of subtracting raw attempts from requirements', () => {
  const detail = fixture();
  detail.schedule.backlog = { ...detail.schedule.backlog, behind: 135, overdue: 135, remainingToday: 0, completedToDate: 25, catchupCredit: 5 };
  detail.summary = { answered: 45, correct: 36, streak: 1 };
  detail.days = [{ date: '2026-11-14', answered: 25, correct: 20 }];
  const report = progressReport(detail, { date: '2026-11-14' });
  assert.equal(report.backlog.behind, 135);
  assert.equal(report.totals.answered, 45);
  assert.equal(report.totals.completedToDate, 25);
  assert.match(report.text, /Today: 25\/20 questions answered; 0 left/);
  assert.match(report.text, /135 overdue questions in catch-up practice/);
});

test('recent accuracy is weighted by answers and includes exactly seven course dates', () => {
  const detail = fixture();
  detail.summary = { answered: 13, correct: 5, streak: 0 };
  detail.days = [
    { date: '2026-11-07', answered: 2, correct: 2 },
    { date: '2026-11-08', answered: 1, correct: 1 },
    { date: '2026-11-14', answered: 9, correct: 1 },
    { date: '2026-11-15', answered: 1, correct: 1 }
  ];
  const report = progressReport(detail, { date: '2026-11-14' });
  assert.deepEqual(report.accuracy.recent, { startDate: '2026-11-08', endDate: '2026-11-14', answered: 10, correct: 2, percent: 20 });
  assert.equal(report.accuracy.overall.percent, 38);
});

test('website levels summarize practiced skills and latest work without treating unstarted skills as a level', () => {
  const detail = fixture();
  detail.skills.push(
    { skill: 'D-SUB', attempts: 12, mastery: 'Mastered', difficulty: 3 },
    { skill: 'D-DIV', attempts: 5, mastery: 'Practicing', difficulty: 2 },
    { skill: 'D-SCALE', attempts: 2, mastery: 'Learning', difficulty: 1 }
  );
  detail.attempts = [
    { date: '2026-11-14', createdAt: '2026-11-14T20:00:00Z', level: 2, givenAnswer: 'Private answer' },
    { date: '2026-11-13', createdAt: '2026-11-13T20:00:00Z', level: 3 }
  ];
  const report = progressReport(detail, { date: '2026-11-14' });
  assert.deepEqual(report.mastery, { total: 4, mastered: 1, practicing: 1, learning: 1, notStarted: 1 });
  assert.deepEqual(report.levels, { counts: { 1: 1, 2: 1, 3: 1 }, practicedSkills: 3, latest: 2 });
  assert.match(report.text, /not school grade or placement readiness/);
  assert.doesNotMatch(JSON.stringify(report), /Private answer/);
});

test('unscheduled days do not invent a target, and reports require a valid date and canonical backlog', () => {
  const detail = fixture();
  detail.schedule.phase = 'before';
  detail.schedule.backlog = { ...detail.schedule.backlog, behind: 0, overdue: 0, remainingToday: 0, requiredToDate: 0, completedToDate: 0 };
  const report = progressReport(detail, { date: '2026-11-06' });
  assert.equal(report.today.target, 0);
  assert.match(report.text, /no daily set scheduled/);
  assert.match(report.nextAction, /Daily practice starts 2026-11-07/);
  assert.throws(() => progressReport(detail, { date: '2026-02-30' }), RangeError);
  delete detail.schedule.backlog;
  assert.throws(() => progressReport(detail, { date: '2026-11-14' }), TypeError);
});
