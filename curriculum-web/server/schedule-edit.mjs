import { validDate } from './plan.mjs';
import { scheduledCourseDays } from './course-schedule.mjs';

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
export const scheduleVersion = (startDate, storedOffsets) => JSON.stringify([startDate, storedOffsets]);

// Pure preview: no attempt, ledger or course record is rewritten here.
export function previewScheduleEdit(program, input) {
  if (input.preview !== undefined && typeof input.preview !== 'boolean') fail('Choose whether to preview or apply the date change.');
  const week = input.week;
  if (!Number.isInteger(week) || week < 1 || week > 10) fail('Choose a week from 1 to 10.');
  if (input.expectedVersion !== undefined && input.expectedVersion !== program.scheduleVersion) fail('The course dates changed in another tab. Reload the curriculum and preview again.', 409);
  const before = scheduledCourseDays(program);
  let days = input.days ?? 7;
  if (input.startDate !== undefined) {
    if (!validDate(input.startDate) || input.startDate < '2000-01-01' || input.startDate > '2100-12-31') fail('Choose a valid start date between 2000 and 2100.');
    if (input.days !== undefined) fail('Choose either a start date or a number of days.');
    days = Math.round((Date.parse(input.startDate + 'T12:00:00Z') - Date.parse(before[(week - 1) * 7].date + 'T12:00:00Z')) / 86400000);
  }
  if (!Number.isInteger(days) || Math.abs(days) > 366) fail('Move the course by at most 366 days at a time.');
  const offsets = Array.from({ length: 10 }, (_, i) => Number(program.weekOffsets[i] || 0) + (i >= week - 1 ? days : 0));
  const after = scheduledCourseDays({ ...program, weekOffsets: offsets });
  for (let i = 1; i < after.length; i++) if (after[i].date <= after[i - 1].date) fail(`Week ${Math.floor(i / 7) + 1} would overlap Week ${Math.floor((i - 1) / 7) + 1}, which ends ${after[i - 1].date}. Choose a later date or move the earlier week too.`);
  if (after[0].date < '2000-01-01' || after.at(-1).date > '2100-12-31') fail('The resulting course dates must stay between 2000 and 2100.');
  const affectedWeeks = Array.from({ length: 11 - week }, (_, i) => {
    const number = week + i, index = (number - 1) * 7;
    return { week: number, oldStartDate: before[index].date, oldEndDate: before[index + 6].date, startDate: after[index].date, endDate: after[index + 6].date };
  });
  return { week, deltaDays: days, from: { startDate: before[(week - 1) * 7].date, endDate: before.at(-1).date }, to: { startDate: after[(week - 1) * 7].date, endDate: after.at(-1).date }, affectedWeeks, expectedVersion: program.scheduleVersion, offsets };
}
