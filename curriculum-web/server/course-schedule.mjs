import plan from './plan.json' with { type: 'json' };
import { addDays, dayInfo, START_DATE, buildSlots } from './plan.mjs';
import { GRADE5_REVIEW_SKILLS, CURRICULUM_BRIDGES, CURRICULUM_SKILLS } from './curriculum.mjs';
export const FOUNDATION_SKILLS=GRADE5_REVIEW_SKILLS;
const deadlines=new Map(),calendars=new Map();

// A due date is the next local midnight, not midnight in the viewer's browser.
// Resolve the zone offset from Intl so teacher-delayed dates also handle DST.
export function courseDueAt(date) {
  if(deadlines.has(date))return deadlines.get(date);
  const desired=Date.parse(`${addDays(date,1)}T00:00:00Z`);
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:plan.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  let result=desired;
  for(let i=0;i<3;i++) {
    const fields=Object.fromEntries(formatter.formatToParts(new Date(result)).map(p=>[p.type,p.value]));
    const rendered=Date.parse(`${fields.year}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}:${fields.second}Z`);
    const difference=desired-rendered;if(!difference)break;result+=difference;
  }
  const dueAt=new Date(result).toISOString();if(deadlines.size>1000)deadlines.clear();deadlines.set(date,dueAt);return dueAt;
}

export function scheduledCourseDays(program={}) {
  const key=JSON.stringify([program.startDate??START_DATE,program.weekOffsets??[]]);if(calendars.has(key))return calendars.get(key);
  const days=plan.days.map((_,index)=>{
    const day=dayInfo(index,program.startDate??START_DATE);
    const bridges=CURRICULUM_BRIDGES.filter(bridge=>bridge.practiceDays.includes(index));
    const coreFocus=day.focus.filter(skill=>(CURRICULUM_SKILLS[skill]?.introductionDay??0)<=index);
    return {...day,coreFocus,bridgeSkills:bridges.map(bridge=>bridge.skill),bridges,focus:[...new Set([...coreFocus,...bridges.map(bridge=>bridge.skill)])],date:addDays(day.date,Number(program.weekOffsets?.[day.week-1]||0))};
  });
  if(calendars.size>100)calendars.clear();calendars.set(key,days);return days;
}

export function introducedSkills(program,date) {
  return new Set([...FOUNDATION_SKILLS,...scheduledCourseDays(program).filter(day=>day.date<=date).flatMap(day=>day.focus)]);
}

// Keep topic selection independent from the six-warm-up/fourteen-story format.
// Each bridge uses at most two focus positions; its prerequisites are introduced
// first. Review spirals include the same dated bridge lessons as the calendar.
export function courseSlots(dayIndex,{program={},date,round=0}={}) {
  const days=scheduledCourseDays(program),day=days[dayIndex],allowed=introducedSkills(program,date??day.date),slots=buildSlots(dayIndex,'required',round);
  const unique=items=>[...new Set(items)].filter(skill=>allowed.has(skill));
  const priorWeekStart=Math.floor(dayIndex/7)*7,recentStart=Math.max(0,priorWeekStart-14);
  const pools={foundation:[...FOUNDATION_SKILLS],focus:unique(day.coreFocus),recent:unique(days.slice(recentStart,priorWeekStart).flatMap(item=>item.focus)),older:unique([...days.slice(0,recentStart).flatMap(item=>item.focus),...FOUNDATION_SKILLS])};
  if(!pools.recent.length)pools.recent=[...FOUNDATION_SKILLS];if(!pools.focus.length)pools.focus=[...FOUNDATION_SKILLS];
  const introductionDay=round===0&&day.coreFocus.some(skill=>CURRICULUM_SKILLS[skill]?.introductionDay===dayIndex),orderedFocus=[],visited=new Set();
  const visit=skill=>{if(visited.has(skill))return;visited.add(skill);for(const prerequisite of CURRICULUM_SKILLS[skill]?.prerequisites??[])if(pools.focus.includes(prerequisite))visit(prerequisite);orderedFocus.push(skill);};
  for(const skill of pools.focus)visit(skill);
  if(introductionDay)pools.focus=orderedFocus;
  const bridges=day.bridges.filter(bridge=>allowed.has(bridge.skill)&&bridge.prerequisites.every(skill=>allowed.has(skill))),focusPositions=slots.map((slot,index)=>slot.category==='focus'?index:-1).filter(index=>index>=0),bridgePositions=bridges.length?focusPositions.slice(0,2):[];
  const offsets={foundation:0,focus:0,recent:0,older:0};let coreOffset=0;
  return slots.map((slot,index)=>{
    const category=slot.category==='warm'?'foundation':slot.category,pool=pools[category],offset=offsets[category]++;
    const bridgeIndex=bridgePositions.indexOf(index),bridge=bridgeIndex>=0?bridges[bridgeIndex%bridges.length]:null;
    const firstCore=category==='focus'&&!bridge?coreOffset++:null;
    const chosen=introductionDay&&firstCore!==null&&firstCore<pool.length?pool[firstCore]:pool[(dayIndex*7+round*11+offset)%pool.length];
    return {...slot,category,skill:bridge?.skill??chosen,focusKind:category==='focus'?(bridge?'bridge':'core'):null};
  });
}

export function courseSchedule({program={},attempts=[],rules=[],today}) {
  const counts=new Map(),seen=new Set();
  for(const row of attempts){
    // Persisted answers are unique; also keep imported/replayed rows from earning
    // a second credit if a caller includes the same attempt more than once.
    const identity=row.question_id??row.id;
    if(identity&&seen.has(identity))continue;
    if(identity)seen.add(identity);
    const count=counts.get(row.date)??{answered:0,correct:0};
    count.answered++;count.correct+=row.is_correct?1:0;counts.set(row.date,count);
  }
  const ruleMap=new Map(rules.map(rule=>[rule.date,rule.daily_target]));
  const days=scheduledCourseDays(program).map(day=>{
    const expected=ruleMap.get(day.date)??(day.date<today?20:program.dailyTarget??20);
    const {answered=0,correct=0}=counts.get(day.date)??{};
    const onTimeCredited=day.date<=today?Math.min(expected,answered):0;
    return {...day,dayNumber:day.index+1,expected,answered,correct,
      accuracy:answered?Math.round(correct/answered*100):null,dueAt:courseDueAt(day.date),
      onTimeCredited,onTimeRemaining:expected-onTimeCredited,
      catchupCredit:0,catchupEarned:0,credited:onTimeCredited,remaining:expected-onTimeCredited};
  });
  const chronological=[...days].sort((a,b)=>a.date.localeCompare(b.date)||a.index-b.index);
  const startDate=chronological[0].date,endDate=chronological.at(-1).date;
  const history=[];let actualAnsweredToDate=0,unallocatedExtra=0;
  // Answers first fulfill that date's own goal. Only the surplus can catch up
  // older work. Replaying chronologically never prepays a later daily goal,
  // including during a teacher-delayed week or after the course has ended.
  for(const [date,count] of [...counts.entries()].sort(([a],[b])=>a.localeCompare(b))){
    if(date<startDate||date>today)continue;
    actualAnsweredToDate+=count.answered;
    const ownDay=days.find(day=>day.date===date);
    let extra=Math.max(0,count.answered-(ownDay?.expected??0));
    for(const day of chronological){
      if(!extra||day.date>=date)break;
      const credit=Math.min(extra,day.remaining);if(!credit)continue;
      day.catchupCredit+=credit;day.credited+=credit;day.remaining-=credit;extra-=credit;
      if(ownDay)ownDay.catchupEarned+=credit;
      history.push({answerDate:date,dueDate:day.date,courseDay:day.index,questions:credit});
    }
    unallocatedExtra+=extra;
  }
  for(const day of days){
    day.caughtUp=day.remaining===0&&day.catchupCredit>0;
    day.status=day.date>today?'upcoming':day.remaining===0?'complete':day.date<today?'missed':day.answered?'partial':'today';
  }
  const due=chronological.filter(day=>day.date<=today),overdue=due.filter(day=>day.date<today&&day.remaining>0),current=days.find(day=>day.date===today)??null;
  const sum=(rows,key)=>rows.reduce((total,row)=>total+row[key],0);
  const completedDays=due.filter(day=>day.remaining===0).length,onTimeCompletions=due.filter(day=>day.onTimeRemaining===0).length;
  const requiredToDate=sum(due,'expected'),completedToDate=sum(due,'credited'),behind=requiredToDate-completedToDate;
  const backlog={requiredToDate,completedToDate,actualAnsweredToDate,behind,overdue:sum(overdue,'remaining'),remainingToday:current?.remaining??0,
    daysEquivalent:Math.round(behind/(program.dailyTarget??20)*100)/100,overdueDays:overdue.length,
    oldestDueDate:overdue[0]?.date??(current?.remaining?current.date:null),nextCatchupDay:overdue[0]??null,
    catchupCredit:sum(due,'catchupCredit'),catchupToday:history.filter(item=>item.answerDate===today).reduce((n,item)=>n+item.questions,0),
    bankedCredit:0,unallocatedExtra,history,completedDays,onTimeCompletions};
  return {startDate,endDate,todayDate:today,timeZone:plan.timezone,dailyTarget:program.dailyTarget??20,totalDays:days.length,
    phase:today<startDate?'before':today>endDate?'finished':current?'active':'break',today:current,nextDue:chronological.find(day=>day.date>=today&&day.remaining>0)??null,days,backlog,
    requiredToDate,answeredToDate:actualAnsweredToDate,creditedToDate:completedToDate,remainingToDate:behind,remainingToday:backlog.remainingToday,
    overdueDays:backlog.overdueDays,overdueQuestions:backlog.overdue,completedDays,onTimeCompletions,
    totalRequired:sum(days,'expected'),totalAnswered:actualAnsweredToDate,totalCredited:completedToDate,totalRemaining:sum(days,'remaining')};
}
