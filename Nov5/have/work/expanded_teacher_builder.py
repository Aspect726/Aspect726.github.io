"""Compact weekly teacher companions bound to the expanded slides and workbook."""
from pathlib import Path
from fractions import Fraction as F
from decimal import Decimal as D
import json,re,math,statistics,argparse,hashlib
from reportlab.platypus import BaseDocTemplate,PageTemplate,Frame,Flowable,Spacer,PageBreak,NextPageTemplate,KeepTogether
from reportlab.lib import colors
from pypdf import PdfReader
import expanded_pdf_engine as pe

WORK=Path('work/expanded_teacher');WORK.mkdir(exist_ok=True,parents=True)
OUT=Path('outputs/DoubleAdvanced_Expanded/Teacher_Weeks')
ISSUES=[]
DAYNAMES={'Sat':'Saturday','Sun':'Sunday','Mon':'Monday','Tue':'Tuesday','Wed':'Wednesday','Thu':'Thursday','Fri':'Friday'}

def plain(s):
 if isinstance(s,list):s='; '.join(str(x) for x in s)
 if isinstance(s,dict):s='; '.join(f'{k}: {v}' for k,v in s.items())
 s=str(s or '').replace('—',' - ').replace('–','-')
 return re.sub(r'(?<![A-Za-z0-9])[-+]?\d+(?:\.\d+)?E[+-]\d+(?![A-Za-z0-9])',lambda m:format(D(m.group()),'f'),s)

class Txt(Flowable):
 def __init__(self,s,size=11,font='Old',after=4,keep=False):
  super().__init__();self.s=plain(s);self.size=size;self.font=font;self.after=after;self.keepWithNext=keep
 def wrap(self,w,h):
  self.width=w;self.content_h=pe.text_height(self.s,w,self.size,self.font,leading=self.size*1.27);self.height=self.content_h+self.after
  return w,self.height
 def draw(self):pe.text(self.canv,self.s,0,self.height-self.size*.94,self.width,self.size,self.font,leading=self.size*1.27)

class Anchor(Flowable):
 def __init__(self,key,title,level=0):super().__init__();self.key=key;self.title=title;self.level=level
 def wrap(self,w,h):return w,0
 def draw(self):self.canv.bookmarkPage(self.key);self.canv.addOutlineEntry(self.title,self.key,level=self.level,closed=False)

def head(s,size=15):return Txt(s,size,'OldB',8,True)
def block(parts):return KeepTogether(parts)
def pagerange(a,b):return f'p. {a}' if a==b else f'pp. {a}-{b}'
def dayref(d):return f'Day {d["day"]:03d} · '+pagerange(d['workbook_page_start'],d['workbook_page_end'])
def numbers(nums):
 nums=sorted(set(nums));out=[]
 if not nums:return 'pending'
 start=prev=nums[0]
 for n in nums[1:]:
  if n==prev+1:prev=n
  else:out.append(str(start) if start==prev else f'{start}-{prev}');start=prev=n
 out.append(str(start) if start==prev else f'{start}-{prev}')
 return ', '.join(out)

def load_sources():
 weeks=[]
 for fn in ['work/weeks_1_5.json','work/weeks_6_10.json']:weeks.extend(json.load(open(fn))['weeks'])
 return weeks

def category(e):
 title=e.get('title','').lower();typ=e.get('type','').lower()
 if e.get('hidden'):return 'Tutor check'
 if e.get('sequence')=='optional_assessment' or 'assessment' in typ:return 'Assessment alternative'
 if typ.startswith('challenge'):return 'Challenges'
 if typ.startswith('deepening'):return 'Deepening'
 if typ=='guided_practice' or 'your turn' in title:return 'Guided practice'
 if typ=='worked_reveal' or title=='the model':return 'Model'
 if 'recall' in title:return 'Recall'
 if 'two ways' in title:return 'Compare methods'
 if 'claim to check' in title:return 'Discuss an error'
 if 'words and meaning' in title:return 'Language'
 if 'in your own words' in title:return 'Summary'
 if 'exit ticket' in title:return 'Exit'
 if 'week ahead' in title:return 'Weekday bridge'
 if title=='today' or title.startswith('week '):return 'Orient'
 return 'Explore'

MOVES={'Orient': 'Read the goal. Ask what is familiar; name the quantity or relationship in focus.', 'Recall': 'Try from memory, then check. Use one error for a quick reminder; keep this brief.', 'Explore': 'Let the learner start first. Ask for a drawing or first step, then compare quantities, units, and strategies.', 'Model': 'Reveal one step at a time after the attempt. Ask what each number or mark represents before moving on.', 'Guided practice': 'Let the learner finish and justify each missing step. Reduce hints after one successful explanation.', 'Compare methods': 'Connect diagram and calculation. Ask where each quantity appears and why both methods preserve it.', 'Discuss an error': 'Locate the first incorrect step. Explain why it is tempting; repair it with a model or counterexample.', 'Language': 'Attach each term to a model. Ask for an example and a non-example.', 'Deepening': 'Use the investigation below. Predict, calculate, and explain the structural reason. Budget about 8 minutes.', 'Challenges': 'Budget about 10 minutes per challenge. Require linked reasoning; give a single hint after an independent attempt.', 'Summary': 'Ask for one sentence or annotated example in the learner’s own words. Listen for the main relationship.', 'Exit': 'Keep answers hidden. Collect an independent response and its reasoning before helping.', 'Weekday bridge': 'Point to the next five days: 18 routines plus 2 challenges, or 23 routines plus 2 challenges on Wednesday.', 'Tutor check': 'After the exit, use the hidden tutor slide to identify secure understanding, a small repair, or needed re-teaching.', 'Assessment alternative': 'Replace ordinary practice with this check, or use a separate sitting. It is not extra assigned work.'}

def ordered_flow(entries):
 groups=[]
 for e in entries:
  cat=category(e)
  if groups and groups[-1][0]==cat:groups[-1][1].append(e)
  else:groups.append((cat,[e]))
 return groups

def session_story(w,s,d,ext,entries):
 sid=s['id'];ns=[e['number'] for e in entries];story=[Anchor(f's{sid}',f'{DAYNAMES[d["weekday"]]} teaching'),head(f'{DAYNAMES[d["weekday"]]}. {s["title"]}',19),Txt(f'{dayref(d)} | Slides {numbers(ns)}',11,'OldB',8),Txt('Goal: '+s['goal'],11,after=5),Txt('Check first: '+s['prerequisite'],10.5,after=5),Txt('Materials: pencil and plain paper; use the projected models. Sketch strips, grids, or nets as needed; make any manipulatives from plain paper.',10.5,after=7),Txt(ext.get('timing','80 minutes; allow up to 90 for discussion.'),10.3,after=7),Txt('Follow the numbered slide order below. The timing budgets span the named phases even when guided practice or discussion returns later. On busy weekends, split the lesson into two sittings and resume at the next slide.',10.3,after=9),head('Teaching sequence',13)]
 for cat,es in ordered_flow(entries):
  ids=list(dict.fromkeys(p for e in es for p in e.get('problem_numbers',[])))
  label=f'Slides {numbers([e["number"] for e in es])} · {cat}'+(' · '+', '.join(ids) if ids else '')
  story.append(block([Txt(label,10.8,'OldB',2),Txt(MOVES[cat],10.4,after=5)]))
 story += [Spacer(1,10),head(f'{DAYNAMES[d["weekday"]]}. Discussion and support',16)]
 deep=ext.get('deepening',[])
 if isinstance(deep,dict):deep=[deep]
 for p in deep:
  story.append(head('Investigation T: '+p.get('title','Deeper comparison'),13))
  story.append(Txt('Watch and discuss; this is a projected investigation, not an extra assigned question.',10.3,'OldI',5))
  story.append(Txt(p.get('prompt',''),10.8,after=5))
  steps=p.get('steps') or [p.get('worked','')]
  for i,st in enumerate(steps):story.append(Txt(f'{i+1}. '+st,10.5,after=3))
  story.append(Txt('Ask: '+p.get('teacher_ask',p.get('notes',{}).get('ask','Explain why the model supports the result.')),10.5,after=3))
  story.append(Txt('If stuck: '+p.get('teacher_hint',p.get('notes',{}).get('if_stuck','Return to the meaning of one part.')),10.5,after=7))
  story.append(Txt('Expected: '+p.get('answer',''),10.5,'OldB',8))
 for c in ext.get('challenges',[]):
  ds=c.get('discussion',{});ident=c.get('id','C')
  story.append(block([head(f'{ident} · Challenge discussion',12),Txt('Ask: '+ds.get('ask','Which quantities connect the first step to the next?'),10.5,after=3),Txt('If stuck: '+ds.get('if_stuck','Sketch the quantities and solve one part before combining them.'),10.5,after=3),Txt('Expected: '+c['answer'],10.5,after=6)]))
 story.append(head('What to notice',12))
 for row in s.get('look_fors',[])[:2]:story.append(Txt(row['response']+' → '+row['move'],10.2,after=4))
 if s.get('misconceptions'):row=s['misconceptions'][0];story.append(Txt('Common error: '+row['response']+' Repair: '+row['move'],10.2,after=4))
 return story

def overview(w,days,sections,entries):
 wk=w['week'];ns=[e['number'] for e in entries];out=[Anchor('overview','Week overview'),head(f'Week {wk:02d} teacher guide',23),Txt(w['title'],15,after=12),Txt(f'PowerPoint slides {numbers(ns)} | Student workbook '+pagerange(days[0]['workbook_page_start'],days[-1]['workbook_page_end']),10.8,'OldB',9),Txt(w['big_idea'],11.3,after=12),head('The seven days',14)]
 for d in days:
  n=d.get('daily_question_count',25 if d['weekday']=='Wed' else 20)
  out.append(block([Txt(f'{dayref(d)} · {DAYNAMES[d["weekday"]]} · {n} questions,including 2 challenges',10.8,'OldB',2),Txt(d['title'],10.5,after=5)]))
 out += [Spacer(1,5),head('Use one day at a time',13),Txt('Each weekend lesson uses a three-page packet; each weekday uses one question page. Work on separate plain paper, labeling the Day number and item IDs. Weekend lessons and ordinary weekdays contain 20 questions including C1 and C2; Wednesday contains 25. Allow 30–45 minutes on ordinary weekdays and 40–55 minutes on Wednesday. Split a demanding day into two sittings if needed.',10.7,after=7),Txt('The weekend packet includes models and worked examples, or a scheduled assessment alternative. Read a worked example after an attempt. Keep answer-review slides out of view until the corresponding work is complete. Weekly answer review is optional after Friday and does not add to the 80-minute weekend lesson.',10.7,after=7)]
 # Show actual integrated review placements, without a separate worksheet library.
 boosts=[]
 for d in days[2:]:
  groups={}
  for sec in sections:
   if sec.get('day')==d['day']:
    for it in sec['items']:
     if it.get('booster'):groups.setdefault(str(it['booster']),[]).append(it['id'])
  if groups:boosts.append(f'Day {d["day"]:03d}: '+'; '.join(f'{name} ({", ".join(map(str,ids))})' for name,ids in groups.items()))
 if boosts:
  out.append(head('Built-in review',12))
  for line in boosts:out.append(Txt(line,10.1,after=3))
 out += [Txt('On Friday, record routine accuracy out of 18 separately from the two challenge explanations. For each challenge, note whether the learner connected the steps, used a valid model or calculation, and justified the conclusion. Revisit a missed model, then check with a fresh item later.',10.5,after=6)]
 optional=[s for s in sections if not s.get('assigned',True)]
 if optional:out.append(Txt('Assessment alternatives: '+'; '.join(s['title']+' ('+pagerange(*s['student_pages'])+')' for s in optional)+'. Replace ordinary practice or use a separate assessment sitting; do not add these on top of the assigned day.',10.3,after=5))
 return out

def index_story(entries,days):
 out=[Anchor('slide_index','Slide-order index'),head('Slide-order index',17),Txt('Follow this numerical order. The session plans explain how to teach each phase; full scripts remain in PowerPoint speaker notes. Item IDs match the student workbook.',10.1,after=9)]
 current=None
 for e in entries:
  group=('Answer review' if e.get('review_section') else 'Saturday' if e.get('session',0)%2 else 'Sunday') if e.get('session') else ('Answer review' if e.get('review_section') else 'Orientation')
  if group!=current:out.append(head(group,12));current=group
  ref=plain(e.get('follow_along','')).replace('Follow along: ','').replace('Student workbook','Workbook')
  if not ref:ref='Watch and discuss'
  if e.get('hidden'):ref='Tutor only;hidden in slide show'
  out.append(block([Txt(f'{e["number"]}. {e["title"]}',10.4,'OldB',1),Txt(ref,9.3,after=5)]))
 return out

def needs_reason(it):
 if it.get('challenge') or str(it.get('id','')).startswith('C'):return True
 if it.get('id') in ['D','S','E','F']:return True
 text=it.get('text','').lower()
 return any(x in text for x in ['explain','why','show','compare','justify','model','which','equivalent','graph','plot','interpret','describe','reason','check','find the mistake','statistical'])

def answer_parts(it):
 ident=str(it.get('id',''));label=ident
 if it.get('skill'):label+=' · '+it['skill']
 if it.get('booster'):label+=' · review'
 parts=[Txt(label,10.4,'OldB',2),Txt(it.get('answer',''),10.4,after=3)]
 reason=plain(it.get('worked',''))
 if needs_reason(it) and reason and reason!=plain(it.get('answer','')):
  if reason.startswith('Use the worked example'):
   reason='Check each step against the projected worked example; require the learner to explain the operation or relationship.'
  parts.append(Txt('Reason: '+reason,10.0,after=3))
 if it.get('id')=='D' and it.get('error'):parts.append(Txt('Watch for: '+it['error'],9.8,after=3))
 parts.append(Spacer(1,4))
 return parts

def keys_story(wk,sections):
 out=[Anchor('answers','Complete weekly answers'),head('Complete weekly answers',17),Txt('Match Day,item ID,and page before checking. Equivalent correct forms and valid alternative methods are welcome. Computational keys are compact; challenges and conceptual items include reasoning. No challenge is complete with an unsupported answer alone.',10.1,after=10)]
 for j,sec in enumerate(sections):
  label=f'Day {sec["day"]:03d} · {sec["title"]}'
  ref='Workbook '+pagerange(*sec['student_pages'])+(' · assigned set' if sec.get('assigned',True) else ' · assessment alternative')
  start=[Anchor(f'key{j}',label,1),head(label,12),Txt(ref,9.6,'OldI',6)]
  items=sec['items']
  if items:start+=answer_parts(items[0])
  out.append(block(start))
  for it in items[1:]:out.append(block(answer_parts(it)))
  out.append(Spacer(1,6))
 return out

def build_week(w,meta,days,sections,extensions,target):
 wk=w['week'];entries=[e for e in meta if e.get('week')==wk or(wk==1 and not e.get('week'))]
 story=overview(w,days,sections,entries)
 for s in w['sessions']:
  day=days[0 if s['id']%2 else 1];ext=next(x for x in extensions if x['session']==s['id']);es=[e for e in entries if e.get('session')==s['id']]
  story.append(PageBreak());story.extend(session_story(w,s,day,ext,es))
 story.extend([NextPageTemplate('two'),PageBreak()]);story.extend(index_story(entries,days))
 story.append(PageBreak());story.extend(keys_story(wk,sections))
 target=Path(target);target.parent.mkdir(exist_ok=True,parents=True)
 def footer(c,doc):
  c.setFont('Old',8.7);c.drawString(40,24,f'Week {wk:02d} teacher guide');c.drawRightString(572,24,str(doc.page));c.setFont('OldI',8.5);c.drawRightString(572,774,'Tutor copy')
 doc=BaseDocTemplate(str(target),pagesize=(612,792),leftMargin=40,rightMargin=40,topMargin=40,bottomMargin=40,title=f'Week {wk:02d}: {w["title"]} | Teacher guide',author='Double Advanced Math Program')
 doc.addPageTemplates([PageTemplate(id='full',frames=[Frame(40,40,532,712,id='full',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=footer),PageTemplate(id='two',frames=[Frame(40,40,256,712,id='left',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0),Frame(316,40,256,712,id='right',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=footer)])
 doc.build(story)
 return {'week':wk,'file':str(target),'pages':len(PdfReader(str(target)).pages),'slides':len(entries),'answers':sum(len(s['items']) for s in sections)}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--prototype',action='store_true');ap.add_argument('--week',type=int);args=ap.parse_args()
 weeks=load_sources();meta=json.load(open('work/expanded_deck_meta.json'));manifest=json.load(open('work/expanded_student_manifest.json'));answers=json.load(open('work/expanded_answers.json'));extensions=json.load(open('work/expanded_lesson_extensions.json'))['sessions']
 count=0
 for w in answers['weeks']:
  for s in w['sections']:
   for it in s['items']:
    if it.get('check'):assert eval(it['check'],{'F':F,'D':D,'math':math,'statistics':statistics}), (w['week'],s['id'],it['id']);count+=1
 results=[]
 for w in weeks:
  if args.week and w['week']!=args.week:continue
  wk=w['week'];target=WORK/f'prototype_week_{wk:02d}.pdf' if args.prototype else OUT/f'Week_{wk:02d}_Teacher_Guide.pdf'
  results.append(build_week(w,meta,[d for d in manifest['days'] if d['week']==wk],next(a['sections'] for a in answers['weeks'] if a['week']==wk),extensions,target))
 report={'guides':results,'math_checks':count,'issues':ISSUES,'inputs':{p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in ['work/expanded_deck_meta.json','work/expanded_student_manifest.json','work/expanded_answers.json','work/expanded_lesson_extensions.json']}};(WORK/'build_report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
if __name__=='__main__':main()
