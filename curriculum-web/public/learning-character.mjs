// A small geometry character for feedback; it never changes scoring or focus.
export function learningCharacter({ celebrate = false, small = false, variant = 'triangle' } = {}) {
  const body = variant === 'circle' ? '<circle cx="60" cy="54" r="35" fill="#95CEEE" stroke="#263F73" stroke-width="3"/><path d="M30 42q7-18 23-20" stroke="#DFF4FF" stroke-width="4" stroke-linecap="round"/>' : '<path d="M57 17a4 4 0 0 1 7 0l36 64a5 5 0 0 1-4 8H24a5 5 0 0 1-4-8Z" fill="#FFD06C" stroke="#263F73" stroke-width="3" stroke-linejoin="round"/>';
  return `<span class="geometry-friend ${variant==='circle'?'circle-friend':'triangle-friend'}${celebrate ? ' celebrating' : ''}${small ? ' small' : ''}" aria-hidden="true"><svg viewBox="0 0 120 110" width="120" height="110" fill="none"><g class="friend-sparks" stroke-width="3" stroke-linecap="round"><path d="M15 20v10m-5-5h10" stroke="#E68437"/><path d="m98 20 5-6m2 19 7 1" stroke="#7160C6"/><path d="m13 65-5 3m98-7 6 5" stroke="#387FC3"/></g><g class="friend-body"><ellipse cx="60" cy="101" rx="29" ry="4" fill="#DDDDF4"/><path d="m44 82-5 16m38-16 5 16" stroke="#263F73" stroke-width="5" stroke-linecap="round"/>${body}<path d="m25 64-10-9-5-12m87 21 10-12 3-13" stroke="#263F73" stroke-width="4" stroke-linecap="round"/><path d="M45 57v5m30-5v5" stroke="#263F73" stroke-width="5" stroke-linecap="round"/><path d="M51 71q9 10 18 0" stroke="#263F73" stroke-width="3" stroke-linecap="round"/><circle cx="38" cy="67" r="5" fill="#F6957C"/><circle cx="82" cy="67" r="5" fill="#F6957C"/><path d="M30 78h10v10" stroke="#CF9132" stroke-width="2"/></g></svg></span>`;
}

export function pointProgress(summary = {}) {
  const dailyTarget = Math.max(1, Number(summary.dailyTarget ?? 20));
  const bonusFirst = Math.max(1, Number(summary.bonusFirst ?? 15));
  const bonusStep = Math.max(1, Number(summary.bonusStep ?? 10));
  const answered = Math.max(0, Number(summary.answered ?? 0));
  const first = dailyTarget + bonusFirst;
  const computedNext = answered < first ? first : first + (Math.floor((answered - first) / bonusStep) + 1) * bonusStep;
  const next = Number(summary.nextPointAt) > answered ? Number(summary.nextPointAt) : computedNext;
  const previous = next === first ? 0 : Math.max(0, next - bonusStep);
  return { dailyTarget, bonusFirst, bonusStep, answered, first, next, previous,
    remaining: Math.max(0, next - answered), completed: Math.max(0, answered - previous),
    span: Math.max(1, next - previous), points: Math.max(0, Number(summary.points ?? 0)) };
}
