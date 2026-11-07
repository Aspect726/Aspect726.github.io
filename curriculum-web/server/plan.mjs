import plan from './plan.json' with { type: 'json' };

export const SKILLS = Object.freeze({ ...plan.skills });
export const START_DATE = plan.start_date;
export const STRENGTHS = Object.freeze([...plan.strength_skills]);
export const WEEKDAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_MS = 86_400_000;
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
}
export function addDays(date, count) {
  if (!validDate(date) || !Number.isInteger(count)) throw new RangeError('Use a valid calendar date and whole number of days.');
  return new Date(Date.parse(`${date}T00:00:00Z`) + count * DAY_MS).toISOString().slice(0,10);
}
export function pacificDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: plan.timezone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date(date));
  const get = name => parts.find(part => part.type === name).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
const unique = list => [...new Set(list)];
function expand(skills) { return skills.includes('ALL') ? Object.keys(SKILLS) : skills; }
function weekSkills(index) { const week = plan.weeks[index]; return unique([...expand(week.saturday.skills), ...expand(week.sunday.skills)]); }
export function dayInfo(index, startDate = START_DATE) {
  if (!Number.isInteger(index) || index < 0 || index >= plan.days.length) throw new RangeError('Day index must be from 0 to 69.');
  const source = plan.days[index], week = plan.weeks[source.week - 1];
  const focus = source.focus === 'mixed' ? weekSkills(source.week - 1) : expand(week[source.focus].skills);
  // Focus fields are authoritative. Week 10's editorial titles disagree with them.
  const title = source.week === 10 && source.focus !== 'mixed' ? week[source.focus].topic : source.title.replace(' (optional on Thanksgiving)', '');
  const date = addDays(startDate, index);
  const weekday = new Intl.DateTimeFormat('en-US', { weekday:'long', timeZone:'UTC' }).format(new Date(`${date}T12:00:00Z`));
  return { index, date, week:source.week, title, focus:[...focus], weekday, lessonWeekday:source.weekday };
}
export function calendar(startDate = START_DATE, today = pacificDate(), pauses = []) {
  if (!validDate(today)) throw new RangeError('Use a valid date for today.');
  const paused = new Set(Array.isArray(pauses) ? pauses : []);
  return plan.days.map((_, index) => {
    const day = dayInfo(index, startDate);
    return { ...day, paused:paused.has(day.date) || paused.has(index), status:paused.has(day.date) || paused.has(index) ? 'paused' : day.date > today ? 'ahead' : day.date === today ? 'today' : 'missed' };
  });
}

export function buildSlots(dayIndex, kind = 'required', round = 0) {
  const day = dayInfo(dayIndex), weekIndex = day.week - 1;
  if (!['required', 'bonus'].includes(kind)) throw new RangeError('Set kind must be required or bonus.');
  if (!Number.isInteger(round) || round < 0) throw new RangeError('Round must be a nonnegative integer.');
  const recent = weekIndex === 0 ? STRENGTHS : unique(plan.weeks.slice(Math.max(0, weekIndex-2), weekIndex).flatMap((_, i) => weekSkills(Math.max(0, weekIndex-2)+i)));
  const older = unique([...plan.weeks.slice(0, Math.max(0,weekIndex-2)).flatMap((_,i) => weekSkills(i)), ...STRENGTHS]);
  const difficulty = kind === 'bonus' ? 3 : ['Wednesday','Thursday'].includes(day.lessonWeekday) ? 3 : day.lessonWeekday === 'Friday' ? 2 : 1;
  const pools = { warm:['WARMUP'], focus:day.focus, recent, older };
  const counts = kind === 'required' ? {warm:2,focus:10,recent:5,older:3} : round === 0 ? {warm:1,focus:9,recent:3,older:2} : {warm:1,focus:6,recent:2,older:1};
  const offsets = {warm:0,focus:0,recent:0,older:0};
  const take = category => {
    const choices = pools[category], offset = offsets[category]++;
    return { skill:choices[(dayIndex * 7 + round * 11 + offset) % choices.length], category, difficulty:category === 'warm' ? 1 : category === 'older' ? Math.max(2,difficulty) : difficulty };
  };
  const out = [];
  for (let i=0;i<counts.warm;i++) out.push(take('warm'));
  const opening = kind === 'required' ? 4 : Math.min(3,counts.focus);
  for (let i=0;i<opening;i++) out.push(take('focus'));
  counts.focus -= opening; counts.warm = 0;
  // Interleave review after the first six required questions.
  while (Object.values(counts).some(Boolean)) for (const category of ['recent','focus','older','focus']) {
    if (counts[category] > 0) { out.push(take(category)); counts[category]--; }
  }
  return out;
}
