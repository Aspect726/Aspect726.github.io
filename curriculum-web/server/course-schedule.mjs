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

export function courseSchedule({program,attempts=[],rules=[],today}) {
  const counts=new Map();
  for(const row of attempts){const count=counts.get(row.date)??{answered:0,correct:0};count.answered++;count.correct+=row.is_correct?1:0;counts.set(row.date,count);}
  const ruleMap=new Map(rules.map(rule=>[rule.date,rule.daily_target]));
  const days=scheduledCourseDays(program).map(day=>{
    const expected=ruleMap.get(day.date)??(day.date<today?20:program.dailyTarget??20);
    const {answered=0,correct=0}=counts.get(day.date)??{},credited=Math.min(expected,answered),remaining=Math.max(0,expected-answered);
    const status=day.date>today?'upcoming':remaining===0?'complete':day.date<today?'missed':answered?'partial':'today';
    return {...day,dayNumber:day.index+1,expected,answered,credited,remaining,correct,accuracy:answered?Math.round(correct/answered*100):null,dueAt:courseDueAt(day.date),status};
  });
  const due=days.filter(day=>day.date<=today),overdue=days.filter(day=>day.date<today&&day.remaining>0),current=days.find(day=>day.date===today)??null;
  const sum=(rows,key)=>rows.reduce((total,row)=>total+row[key],0),completed=days.filter(day=>day.date<=today&&day.remaining===0).length;
  return {startDate:days[0].date,endDate:days.at(-1).date,timeZone:plan.timezone,dailyTarget:program.dailyTarget??20,totalDays:days.length,
    phase:today<days[0].date?'before':today>days.at(-1).date?'finished':current?'active':'break',today:current,nextDue:days.find(day=>day.date>=today&&day.remaining>0)??null,days,
    requiredToDate:sum(due,'expected'),answeredToDate:sum(due,'answered'),creditedToDate:sum(due,'credited'),remainingToDate:sum(due,'remaining'),remainingToday:current?.remaining??0,
    overdueDays:overdue.length,overdueQuestions:sum(overdue,'remaining'),completedDays:completed,onTimeCompletions:completed,totalRequired:sum(days,'expected'),totalAnswered:sum(days,'answered'),totalCredited:sum(days,'credited'),totalRemaining:sum(days,'remaining')};
}
