"""Weekly teaching companions for the revised deck and day-by-day student workbook."""
from pathlib import Path
from fractions import Fraction as F
from decimal import Decimal as D
import json, re, math, statistics, argparse, zipfile
import xml.etree.ElementTree as ET
from reportlab.platypus import SimpleDocTemplate, Flowable, Spacer, PageBreak, KeepTogether, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.lib import colors
from pypdf import PdfReader, PdfWriter
import pdf_engine as pe

BASE=Path('outputs/DoubleAdvanced_Revised')
WORK=Path('work/revised_teacher');WORK.mkdir(parents=True,exist_ok=True)
WEEKDAYS=['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday']
QA=[]
MOVES=json.load(open('work/revised_teacher_moves.json'))

def plain(s):
 if isinstance(s,list):s='; '.join(str(x) for x in s)
 if isinstance(s,dict):s='; '.join(f'{k}: {v}' for k,v in s.items())
 text=str(s or '').replace('—',' - ').replace('–','-').replace('•','; ')
 return re.sub(r'(?<![A-Za-z0-9])[-+]?\d+(?:\.\d+)?E[+-]\d+(?![A-Za-z0-9])',lambda m:format(D(m.group()),'f'),text)

def lines_for(s,width,size,font):
 line=[];width_used=0;lines=[]
 for token in pe.tokens(plain(s)):
  if '\n' in token:
   lines.append(line);line=[];width_used=0;continue
  ww=pe.tw(token,size,font)
  if width_used+ww>width and line:
   lines.append(line);line=[];width_used=0
   if token.isspace():continue
  line.append(token);width_used+=ww
 if line:lines.append(line)
 return lines

class Anchor(Flowable):
 def __init__(self,key,title,level=0):
  Flowable.__init__(self);self.key=key;self.title=title;self.level=level
 def wrap(self,w,h):return w,0
 def draw(self):
  self.canv.bookmarkPage(self.key)
  self.canv.addOutlineEntry(self.title,self.key,level=self.level,closed=False)

class Text(Flowable):
 def __init__(self,s,size=11.2,font='Old',after=5):
  Flowable.__init__(self);self.s=plain(s);self.size=size;self.font=font;self.after=after
 def wrap(self,availWidth,availHeight):
  self.width=availWidth;self.lines=lines_for(self.s,availWidth,self.size,self.font)
  self.content_h=sum(self.size*(2.01 if any(t.startswith('{') for t in ln) else 1.32) for ln in self.lines)
  self.height=self.content_h+self.after
  return self.width,self.height
 def draw(self):
  pe.text(self.canv,self.s,0,self.height-self.size*.87,self.width,self.size,self.font,leading=self.size*1.32)

class SlideBlock(Flowable):
 def __init__(self,entry,session,dayinfo):
  Flowable.__init__(self);self.e=entry;self.session=session;self.dayinfo=dayinfo
  n=entry['number']; title=entry['title']; mins=entry.get('minutes',0)
  timing=(f' | {mins:g} min' if isinstance(mins,(int,float)) and mins>0 else '')
  self.parts=[Text(f'Slide {n}. {title}{timing}',12.7,'OldB',4)]
  ref=plain(entry.get('follow_along','')).removeprefix('Follow along: ')
  if not ref and dayinfo:ref=day_ref(dayinfo)
  topic=plain(entry.get('topic',''))
  if not topic and session:topic=session['title']
  if topic:self.parts.append(Text('Topic: '+topic,10.2,'OldI',2))
  if ref:self.parts.append(Text('Student: '+ref,10.2,'OldI',4))
  notes=entry.get('notes',{})
  if not isinstance(notes,dict):notes=parse_notes(notes)
  notes=dict(notes)
  for key in ['say','ask','expect','if_stuck']:
   if key in notes:notes[key]=plain(notes[key]).replace('handout or notebook','matching student workbook pages').replace('Use your handout','Use your student workbook')
  pnums=entry.get('problem_numbers',[])
  if not pnums:pnums=re.findall(r'\bP(\d+)\.',plain(entry.get('text','')))
  if session and pnums and not entry.get('review_section'):
   matched=[]
   for num in pnums:
    try:idx=int(str(num).lstrip('P'))-1
    except (ValueError,TypeError):continue
    if 0<=idx<len(session['problems']):matched.append((idx+1,session['problems'][idx]))
   asks=[];hints=[];seen=set()
   for num,problem in matched:
    skill=problem.get('skill','')
    if skill in MOVES and skill not in seen:
     seen.add(skill);asks.append(f'P{num}: '+MOVES[skill][0]);hints.append(f'P{num}: '+MOVES[skill][1])
   if asks:notes['ask']=' '.join(asks)
   if hints:notes['if_stuck']=' '.join(hints)
   if matched:notes['expect']='; '.join(f'P{n}: '+p['answer'] for n,p in matched)
  if session and notes.get('if_stuck'):
   hint=plain(notes['if_stuck']).strip(' .')
   material_list=', '.join(session.get('materials',[])).strip(' .')
   if hint.lower()==material_list.lower():notes['if_stuck']=session['look_fors'][0]['move']
  if notes.get('expect'):
   notes['expect']=re.sub(r'(?<!;)\s+(?=(?:P|R|M)?\d{1,2}:)', '; ', plain(notes['expect']))
  if entry.get('hidden'):
   self.parts.append(Text('Tutor only. Keep this slide hidden during the lesson. Use it after collecting the exit ticket.',11.2,after=3))
   if session:
    self.parts.append(Text('Exit answer: '+session['exit']['answer'],11.2,after=3))
    for k,label in [('got','Got it'),('almost','Almost there'),('reteach','Needs re-teaching')]:
     self.parts.append(Text(label+': '+session['exit_sort'][k],11.2,after=3))
   elif notes.get('expect'):self.parts.append(Text('Expect: '+plain(notes['expect']),11.2,after=3))
  elif entry.get('review_section'):
   # The full, matched answers are printed later in this same guide.
   self.parts.append(Text('Say: '+plain(notes.get('say','Check this section only after the student has completed the matching work.')),11.2,after=3))
   if notes.get('ask'):self.parts.append(Text('Ask: '+plain(notes['ask']),11.2,after=3))
   self.parts.append(Text('Use: Match the visible item IDs to the complete answer section later in this guide. Compare the first step that differs, then ask the student to repair it.',11.2,after=3))
   if notes.get('if_stuck'):self.parts.append(Text('If stuck: '+plain(notes['if_stuck']),11.2,after=3))
  else:
   for key,label in [('say','Say'),('ask','Ask'),('expect','Expect'),('if_stuck','If stuck')]:
    val=notes.get(key,notes.get('stuck','') if key=='if_stuck' else '')
    if val:self.parts.append(Text(label+': '+plain(val),11.2,after=3))
  self.parts.append(Spacer(1,8))
 def wrap(self,availWidth,availHeight):
  self.width=availWidth;self.heights=[]
  for part in self.parts:
   _,h=part.wrap(availWidth,availHeight);self.heights.append(h)
  self.height=sum(self.heights)
  if self.height>665:QA.append({'issue':'slide block too tall','slide':self.e['number'],'height':self.height})
  return self.width,self.height
 def draw(self):
  y=self.height
  for part,h in zip(self.parts,self.heights):y-=h;part.drawOn(self.canv,0,y)

class AnswerBlock(Flowable):
 def __init__(self,item):
  Flowable.__init__(self);self.item=item
  ident=plain(item.get('id',''));skill=plain(item.get('skill',''))
  label=ident+(f'  [{skill}]' if skill else '')
  if item.get('student_page'):label+=f'  |  student p. {item["student_page"]}'
  if item.get('booster'):label+='  |  Built-in review: '+plain(item['booster'])
  self.parts=[Text(label,11.7,'OldB',3)]
  # Item IDs and exact workbook pages identify the prompt without repeating it here.
  self.parts.append(Text('Answer: '+plain(item.get('answer','')),11.2,after=3))
  worked=plain(item.get('worked',''))
  answer=plain(item.get('answer',''))
  if worked and worked.strip()!=answer.strip():self.parts.append(Text('Reasoning: '+worked,10.8,after=3))
  if item.get('wrong') and item.get('error'):self.parts.append(Text('Watch for '+plain(item['wrong'])+': '+plain(item['error']),10.4,after=3))
  self.parts.append(Spacer(1,5))
 def wrap(self,availWidth,availHeight):
  self.width=availWidth;self.heights=[]
  for p in self.parts:
   _,h=p.wrap(availWidth,availHeight);self.heights.append(h)
  self.height=sum(self.heights)
  if self.height>665:QA.append({'issue':'answer block too tall','item':self.item.get('id'),'height':self.height})
  return self.width,self.height
 def draw(self):
  y=self.height
  for p,h in zip(self.parts,self.heights):y-=h;p.drawOn(self.canv,0,y)

def parse_notes(text):
 text=plain(text);names=[('Say.','say'),('Ask.','ask'),('Expect.','expect'),('If stuck.','if_stuck'),('Time.','time')];result={}
 for i,(marker,key) in enumerate(names):
  start=text.find(marker)
  if start<0:continue
  end=min([q for m,k in names[i+1:] if (q:=text.find(m,start+len(marker)))>=0] or [len(text)])
  result[key]=text[start+len(marker):end].strip()
 return result

def day_num(d):return int(d.get('day',d.get('day_number',0)))
def pages(d):
 if d.get('workbook_page_start'):
  a=d['workbook_page_start'];b=d.get('workbook_page_end',a)
 elif d.get('student_pages'):
  a,b=d['student_pages']
 else:return 'pages pending'
 return f'page {a}' if a==b else f'pages {a}-{b}'
def day_ref(d):return f'Day {day_num(d):03d}, {pages(d)}'
def weekday(d):
 name=d.get('weekday',WEEKDAYS[(day_num(d)-1)%7]);return next((q for q in WEEKDAYS if q.lower().startswith(name.lower())),name)
def load_weeks():
 result=[]
 for f in ['work/weeks_1_5.json','work/weeks_6_10.json']:
  q=json.load(open(f));result.extend(q['weeks'] if isinstance(q,dict) else q)
 return result

def heading(s,size=16):
 t=Text(s,size,'OldB',10);t.keepWithNext=True;return t

def session_setup(s,entries,d):
 nums=[e['number'] for e in entries if e.get('session')==s['id'] and not e.get('review_section')]
 slide_range=f'{min(nums)}-{max(nums)}' if nums else 'pending'
 out=[heading(f'{weekday(d)}. {s["title"]}',18),Text(f'{day_ref(d)} | PowerPoint slides {slide_range}',11.5,'OldB',11),Text('Goal: '+s['goal'],11.7,after=7),Text('Set out: '+', '.join(s['materials'])+'.',11.2,after=6),Text('Check first: '+s['prerequisite'],11.2,after=7)]
 try:
  from build_program import agenda
  out.append(Text('Pacing: '+agenda(s),10.8,after=8))
 except ImportError:pass
 out.append(Text('Explore: what to watch for',12.3,'OldB',5))
 for row in s['look_fors'][:3]:
  out.append(Text(row['response']+' Why it matters: '+row['why']+' Tutor move: '+row['move'],10.6,after=5))
 out.append(Text('Likely misconceptions',12.3,'OldB',5))
 for row in s['misconceptions'][:2]:
  out.append(Text(row['response']+' Why: '+row['why']+' Tutor move: '+row['move'],10.6,after=5))
 out.append(Text('Follow the slide numbers below. Let the student attempt the task before showing the model or the answer. Write on the matching workbook pages; use extra paper only when more room is helpful.',11.2,after=10))
 return out

def booster_text(d):
 vals=d.get('booster_items',d.get('boosters',d.get('booster',[])))
 if not vals:return ''
 if isinstance(vals,str):return vals
 if isinstance(vals,dict):vals=[vals]
 pieces=[]
 for v in vals:
  if isinstance(v,dict):
   ids=v.get('items',v.get('item_numbers',v.get('item',v.get('id',''))));name=v.get('name',v.get('booster',v.get('skill','review')))
   pieces.append(f'{name}: items {plain(ids)}' if ids else str(name))
  else:pieces.append(str(v))
 return '; '.join(pieces)

def weekday_support(days,answer_sections):
 out=[heading('Weekday teaching and review',18),Text('Use one day at a time. Aim for 15-20 minutes, or 15 minutes during a holiday week. Accuracy and a clear explanation matter more than finishing quickly.',11.5,after=10)]
 for d in days[2:]:
  name=weekday(d);n=day_num(d);out.append(heading(f'Day {n:03d}. {name} | {pages(d)}',13))
  if name.lower().startswith('mon'):move='Ask for a model from Saturday before checking an answer. Let the student choose a method. After checking, have the student correct the first step that changed the quantity.'
  elif name.lower().startswith('tue'):move='Connect the practice to Sunday’s model. Ask what each number counts and how a multiplication check, diagram, or estimate supports the answer.'
  elif name.lower().startswith('wed'):move='Let the student choose the method for each mixed problem. For the puzzle, ask which conditions are already met. Accept any solution that meets every condition.'
  elif name.lower().startswith('thu'):move='Ask the student to explain the planted error before repairing it. Optional Stretch comes after the required work and may be skipped without delaying the next day.'
  else:move='Give the weekly check independently, without coaching or a calculator. Score the required reasoning as well as the answer. Afterward, choose one error to discuss calmly.'
  out.append(Text(move,11.2,after=5))
  flagged=[it for sec in answer_sections if int(sec.get('day',0) or 0)==n for it in sec.get('items',[]) if it.get('booster')]
  groups={}
  for it in flagged:groups.setdefault(str(it['booster']),[]).append(str(it.get('id','')))
  boost='; '.join(name+': items '+', '.join(ids) for name,ids in groups.items()) or booster_text(d)
  if boost:out.append(Text('Built-in Booster review: '+boost+'. These items replace ordinary practice; they are not extra homework.',10.8,after=5))
  out.append(Text('If the same skill causes three misses, stop and revisit its model. Use the included review item as a teaching example, then try it again later without the explanation. Do not add a separate worksheet.',10.8,after=9))
 out.extend([heading('After Friday',13),Text('On a 10-item check: 9-10 correct is strong; 7-8 is on track; 5-6 needs another review of the missed topic; 0-4 calls for 20 minutes of re-teaching at the next session. Record the skill and one observation. Check it again with a fresh item at least a week later.',11.2,after=5)])
 return out

def build_week(w,meta,days,answer_sections,target):
 wk=w['week'];entries=sorted([e for e in meta if int(e.get('week') or math.ceil(int(e.get('session',0) or 0)/2))==wk or (wk==1 and (e.get('session') or 0)==0 and not e.get('week'))],key=lambda e:e['number'])
 nums=[e['number'] for e in entries];sessions={s['id']:s for s in w['sessions']}
 if len(days)!=7:raise ValueError(f'Week {wk}: expected seven days, got {len(days)}')
 slides_by_session={s['id']:[e for e in entries if e.get('session')==s['id'] and not e.get('review_section')] for s in w['sessions']}
 story=[Anchor(f'w{wk}_overview','Week overview'),heading(f'Week {wk:02d} teacher guide',23),Text(w['title'],16,'Old',13),Text(f'Keep this guide beside PowerPoint slides {min(nums)}-{max(nums)}. Follow the numbered slide sequence, then use the matching answer section after the student has tried.',11.5,after=12),heading('The seven days',15)]
 for d in days:
  dsl=[]
  if (day_num(d)-1)%7<2:dsl=[e['number'] for e in slides_by_session[w['sessions'][(day_num(d)-1)%7]['id']]]
  trailer=f' | slides {min(dsl)}-{max(dsl)}' if dsl else ''
  story.append(Text(f'Day {day_num(d):03d}. {weekday(d)} | {pages(d)}{trailer}',11.6,'OldB',2))
  story.append(Text(d.get('title',''),10.8,after=6))
 story.extend([Spacer(1,5),heading('This week’s idea',14),Text(w['big_idea'],11.5,after=9),Text('Use the built-in Booster review where it appears in the day’s work. It replaces ordinary practice. No separate Booster packet is needed.',11.2,after=7),Text('PDF bookmarks jump to each lesson and answer section. The student workbook’s Sunday reference pages are for checking an example after an attempt. Keep this teacher guide and the answer-review slides out of view during independent work.',11.2,after=7)])
 # Preserve deck order, including front matter and the answer-review section.
 current_session=None;review_started=False
 for e in entries:
  sid=int(e.get('session',0) or 0);s=sessions.get(sid)
  if e.get('review_section'):
   if not review_started:
    story.append(PageBreak());story.append(Anchor(f'w{wk}_review','PowerPoint answer-review index'));story.append(heading('PowerPoint answer review',18))
    story.append(Text('After Friday, outside the weekend lesson time. Say: Check one completed item at a time. Ask: Where does your method first differ from this one? Expect: The answers and worked reasoning printed in the complete keys below. If stuck: Rebuild the quantity with its model, then have the student repair the first incorrect step.',11.2,after=10))
    story.append(Text('Keep these slides out of view during independent work. The index below follows the answer-review slides in order; every answer is also printed in the complete keys.',11.2,after=10));review_started=True
   ids=plain(e.get('answer_ids',[]));ref=plain(e.get('follow_along',''))
   story.append(KeepTogether([Text(f'Slide {e["number"]}. {e["title"]}',12,'OldB',3),Text(('Items: '+ids+'. ' if ids else '')+ref,10.5,after=7)]))
   continue
  elif sid in sessions and sid!=current_session and not e.get('review_section'):
   current_session=sid;d=days[0 if sid%2 else 1];story.append(PageBreak());story.append(Anchor(f'w{wk}_s{sid}',weekday(d)+' teaching'));story.extend(session_setup(s,entries,d))
  elif sid==0 and current_session is None:
   if not any(isinstance(x,SlideBlock) for x in story):story.append(PageBreak());story.append(Anchor('first_orientation','First-time orientation'));story.append(heading('First-time orientation',18))
  d=days[0 if sid%2 else 1] if sid in sessions else None
  story.append(SlideBlock(e,s,d))
 story.append(PageBreak());story.append(Anchor(f'w{wk}_weekdays','Weekday support and Boosters'));story.extend(weekday_support(days,answer_sections))
 story.append(PageBreak());story.extend([Anchor(f'w{wk}_answers','Complete answers'),heading('Complete answers for the week',21),Text('Match the Day number, item ID, and student page before checking. Questions stay in the student workbook; these keys give every answer and the needed reasoning. Equivalent correct forms and sound alternative methods are welcome. An explanation item needs a reason, model, or valid check as well as its conclusion.',11.5,after=14)])
 for sec_idx,sec in enumerate(answer_sections):
  d=next((d for d in days if day_num(d)==int(sec.get('day',0) or 0)),None)
  label=sec.get('title',sec.get('id','Answers'))
  ref=(f'Day {day_num(d):03d}, student workbook '+pages(sec) if sec.get('student_pages') else day_ref(d)) if d else ('Student workbook '+pages(sec) if sec.get('student_pages') else '')
  section_start=[Anchor(f'w{wk}_key{sec_idx}',f'Day {int(sec.get("day",0)):03d}: '+sec.get('title','Answers'),1),heading(label,15),Text(ref,10.5,'OldI',8)]
  if 'Diagnostic' in sec.get('id',''):
   section_start.append(Text('Diagnostic scoring: record each skill separately. Treat 80% or more correct as secure, 50-79% as developing, and below 50% as a priority for review. A single sampled item gives provisional evidence. Keep the fact snapshot separate from reasoning; unfamiliar content is not a failure.',10.8,after=8))
  elif any(k in sec.get('id','').lower() for k in ['mini_check','cumulative','final_review','final_mixed']):
   section_start.append(Text('Score by skill, including the requested reasoning. Use 80% or more as secure, 50-79% as developing, and below 50% as a review priority. Revisit a missed model, then check again with a different problem. This tutoring check does not determine school placement.',10.8,after=8))
  if sec.get('id')=='Diagnostic_Facts':
   story.append(KeepTogether(section_start))
   cells=[Text(f'{it["id"]}. '+it['text']+' = '+it['answer'],11.2,after=5) for it in sec.get('items',[])]
   rows=[cells[i:i+3]+[Text('')]*(3-len(cells[i:i+3])) for i in range(0,len(cells),3)]
   table=Table(rows,colWidths=[176,176,176]);table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),2)]));story.append(table)
  else:
   items=sec.get('items',[])
   if items:section_start.append(AnswerBlock(items[0]))
   story.append(KeepTogether(section_start))
   for item in items[1:]:story.append(AnswerBlock(item))
  story.append(Spacer(1,10))
 target=Path(target);target.parent.mkdir(parents=True,exist_ok=True)
 def footer(c,doc):
  c.saveState();c.setFont('Old',9);c.drawString(42,26,f'Week {wk:02d} teacher guide');c.drawRightString(570,26,str(doc.page));c.setFont('OldI',9);c.drawRightString(570,775,'Tutor copy');c.restoreState()
 doc=SimpleDocTemplate(str(target),pagesize=(612,792),rightMargin=42,leftMargin=42,topMargin=42,bottomMargin=44,title=f'Week {wk:02d}: {w["title"]} | Teacher guide',author='Double Advanced Math Program')
 doc.build(story,onFirstPage=footer,onLaterPages=footer)
 return {'week':wk,'file':str(target),'pages':len(PdfReader(str(target)).pages),'slides':[min(nums),max(nums)],'slide_count':len(entries),'answer_sections':len(answer_sections),'answer_items':sum(len(s.get('items',[])) for s in answer_sections)}

def fallback_metadata():
 data=json.load(open('work/deck_meta.json'))
 pptx=Path('outputs/DoubleAdvanced_Math_Program/01_Slides/DoubleAdvanced_Weekend_Slides.pptx')
 ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
 with zipfile.ZipFile(pptx) as z:
  for e in data:
   name=f'ppt/notesSlides/notesSlide{e["number"]}.xml'
   text=' '.join(ET.fromstring(z.read(name)).itertext()) if name in z.namelist() else ''
   # Only text runs belong in the notes, not XML attributes.
   if name in z.namelist():text='\n'.join(n.text or '' for n in ET.fromstring(z.read(name)).findall('.//a:t',ns))
   e['notes']=parse_notes(text);e['week']=math.ceil(e.get('session',0)/2);e['text']=e.get('body','')
 return data

def verify_answers(weeks):
 count=0
 for w in weeks:
  for sec in w.get('sections',[]):
   for item in sec.get('items',[]):
    if item.get('check'):
     ok=eval(item['check'],{'F':F,'D':D,'statistics':statistics,'math':math})
     assert ok,(w['week'],sec['id'],item['id'],item['check'])
     count+=1
 return count

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--prototype',action='store_true');ap.add_argument('--week',type=int);ap.add_argument('--provisional',action='store_true');args=ap.parse_args();weeks=load_weeks()
 if args.provisional:
  meta=fallback_metadata();days=json.load(open('work/revised_student_manifest.json'))['days'];answers=json.load(open('work/revised_answers.json'))
  if args.week:weeks=[w for w in weeks if w['week']==args.week]
 elif args.prototype:
  meta=fallback_metadata();wk=args.week or 6;weeks=[w for w in weeks if w['week']==wk];days=[]
  for j,name in enumerate(WEEKDAYS):days.append({'day':(wk-1)*7+j+1,'week':wk,'weekday':name,'title':(weeks[0]['sessions'][j]['title'] if j<2 else 'Daily practice'),'workbook_page_start':1+j*4,'workbook_page_end':4+j*4})
  answers={'weeks':[{'week':wk,'sections':[{'id':f'Day{(wk-1)*7+1}','title':'Saturday session tasks','day':(wk-1)*7+1,'items':[dict(q,id=f'P{i+1}') for i,q in enumerate(weeks[0]['sessions'][0]['problems'])]}]}]}
 else:
  meta=json.load(open('work/revised_deck_meta.json'));days=json.load(open('work/revised_student_manifest.json'))['days'];answers=json.load(open('work/revised_answers.json'))
  if isinstance(meta,dict):meta=meta['slides']
  if args.week:weeks=[w for w in weeks if w['week']==args.week]
 count=verify_answers(answers['weeks']);results=[]
 for w in weeks:
  ad=next(a for a in answers['weeks'] if int(a['week'])==w['week'])
  path=WORK/f'prototype_week_{w["week"]:02d}.pdf' if (args.prototype or args.provisional) else BASE/'Teacher_Weeks'/f'Week_{w["week"]:02d}_Teacher_Guide.pdf'
  results.append(build_week(w,meta,[d for d in days if int(d['week'])==w['week']],ad['sections'],path))
 (WORK/'build_report.json').write_text(json.dumps({'guides':results,'math_checks':count,'layout_issues':QA},indent=2))
 print(json.dumps({'guides':results,'math_checks':count,'layout_issues':QA},indent=2))
if __name__=='__main__':main()
