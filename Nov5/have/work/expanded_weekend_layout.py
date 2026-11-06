"""Three-page weekend packet layout, sharing the canonical question records."""
import copy,math
from pathlib import Path
from expanded_pdf_engine import text,text_height,newpdf,line_model

def build_weekend(api,d,core,challenges,extras):
 WEEKS,WORK,COL,COLOR=api['WEEKS'],api['WORK'],api['COL'],api['COLOR']
 norm,drawitem,split_balanced=api['norm'],api['drawitem'],api['split_balanced']
 path=WORK/f'Day_{d["day"]:03d}.pdf';c=newpdf(path,d['title']);sections=[];resources=[]
 s=next(s for s in WEEKS[d['week']-1]['sessions'] if s['id']==d['session'])
 tail=[p for p in core if p['id'] in ['S','E']];body=[p for p in core if p['id'] not in ['S','E']]
 assessment=[old for old in extras if not old['id'].endswith('_Study_Try')]
 facts=next((old for old in assessment if old['id']=='Diagnostic_Facts'),None)
 tests=[old for old in assessment if old['id']!='Diagnostic_Facts']
 def head(pg,label):
  text(c,f'WEEK {d["week"]}  /  DAY {d["day"]:03d}  /  '+('SATURDAY' if d['weekday']=='Sat' else 'SUNDAY')+f'  /  PACKET {pg} OF 3',42,755,528,9.5,'OldB',COLOR)
  y=text(c,d['title'],42,730,528,17,'OldB')-2
  y=text(c,label,42,y,528,11,'OldB',COLOR)-3
  y=text(c,'20 daily questions include C1 and C2. Use separate paper when helpful.',42,y,528,10.4)-10
  c.setStrokeColorRGB(.7,.7,.7);c.setLineWidth(.5);c.line(42,y+4,570,y+4)
  return y-10
 def group(ps,y,pg,size=11.2,space=10):
  left,right,h=split_balanced(ps,size)
  bottom=y
  for x,items in [(42,left),(316,right)]:
   yy=y
   for p in items:yy=drawitem(c,p,x,yy,COL,size,pg)-space
   bottom=min(bottom,yy)
  return bottom
 def example(y,limit=70):
  if y<limit+120:return
  y=text(c,'Worked example - compare with the slide model',42,y,528,12.5,'OldB',COLOR)-5
  ex=s['example'];y=text(c,ex['text'],42,y,528,11.2)-4
  for step in ex['steps']:
   h=text_height(step,510,10.8)
   if y-h<limit+25:break
   y=text(c,step,56,y,510,10.8)-3
  if y>limit+20:text(c,'Result: '+ex['answer'],56,y,510,11.2,'OldB')
 if tests:
  # A compact assessment alternative fills page2; page1 keeps all ordinary questions.
  y=head(1,'Lesson questions');end=group(core,y,1,11,0)
  if end<45:raise ValueError(('Weekend first-page overflow',d['day'],end))
  c.showPage();y=head(2,tests[0]['title']+' - assessment alternative')
  y=text(c,'Use this in place of ordinary practice, or in a separate assessment sitting. It is not added to the 20 daily questions.',42,y,528,10.7)-16
  for test in tests:
   ps=[norm(p) for p in test['items']];end=group(ps,y,2,10.8,0)
   if end<45:raise ValueError(('Assessment overflow',d['day'],end))
   sections.append({'id':test['id'],'title':test['title'],'day':d['day'],'student_pages_local':[2,2],'items':ps,'assigned':False,'use':'Assessment alternative; replaces routine work'})
   y=end-10
  if len(tests[0]['items'])<=10:example(y-15)
  c.showPage();y=head(3,'Challenge and reasoning')
  for p in challenges:
   y=drawitem(c,p,42,y,528,11.8,3)-20
   if not facts:
    for yy in [y,y-22,y-44]:c.setStrokeColorRGB(.82,.82,.82);c.setLineWidth(.35);c.line(42,yy,570,yy)
    y-=70
  if facts:
   y=text(c,'Optional oral fact snapshot',42,y-5,528,12,'OldB',COLOR)-4
   y=text(c,'Use a short oral sample to identify facts to revisit. This is not extra written homework.',42,y,528,10.5)-14
   ps=[norm(p) for p in facts['items']]
   for j,p in enumerate(ps):p['local_page']=3;text(c,p['id']+'. '+p['text'],42+(j%3)*178,y-(j//3)*23,165,10.5)
   if y-9*23<45:raise ValueError(('Facts overflow',d['day'],y))
   sections.insert(0,{'id':facts['id'],'title':facts['title'],'day':d['day'],'student_pages_local':[3,3],'items':ps,'assigned':False,'use':'Optional oral assessment'})
  elif len(tests[0]['items'])>10:example(y-10)
 else:
  k=(len(body)+1)//2
  y=head(1,'Explore and build the idea');y=text(c,'Lesson focus: '+s['goal'],42,y,528,11)-16
  end=group(body[:k],y,1,11.5,12)
  # The exact supplied model provides a useful visual for discussion without inventing new quantities.
  model=copy.deepcopy(s.get('model') or {})
  if s['id']==9:
   model.update(rows=10,cols=10,shade_rows=4,shade_cols=5,shadeColumns=5,shadeRows=4)
  if model and end>260:
   caption=model.pop('caption',None)
   text(c,'Lesson model',42,end-8,528,12,'OldB',COLOR)
   line_model(c,model,125,75,360,min(170,end-125))
  c.showPage();y=head(2,'Practice and compare methods');end=group(body[k:],y,2,11.5,12)
  example(end-12)
  c.showPage();y=head(3,'Challenge, explain and check')
  for p in challenges:
   y=drawitem(c,p,42,y,528,11.8,3)-14
   for yy in [y,y-24,y-48]:c.setStrokeColorRGB(.82,.82,.82);c.setLineWidth(.35);c.line(42,yy,570,yy)
   y-=78
  y=text(c,'Finish the lesson',42,y,528,12.5,'OldB',COLOR)-8
  for p in tail:y=drawitem(c,p,42,y,528,11.3,3)-12
  if y<45:raise ValueError(('Challenge page overflow',d['day'],y))
 c.showPage();c.save()
 main={'id':f'S{d["session"]:02d}','title':d['title'],'day':d['day'],'student_pages_local':[1,3],'items':core+challenges,'assigned':True}
 sections.insert(0,main)
 d.update(file=str(path.resolve()),pages=3,sections=sections,resources=resources,daily_question_count=20,challenge_count=2)
 return d
