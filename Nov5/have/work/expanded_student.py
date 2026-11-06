"""Compact daily question sheets; all solutions live in weekly teacher guides."""
from pathlib import Path
import copy,json,math,re,io
from fractions import Fraction as F
from decimal import Decimal as D
import statistics
from reportlab.pdfgen import canvas
from pypdf import PdfReader,PdfWriter
import expanded_pdf_engine as pe
from expanded_pdf_engine import text,text_height,line_model,newpdf

OUT=Path('outputs/DoubleAdvanced_Expanded');WORK=Path('work/expanded_days');WORK.mkdir(parents=True,exist_ok=True);OUT.mkdir(exist_ok=True)
OLD=json.load(open('work/revised_student_manifest.json'))['days']
WEEKS=[]
for f in ['work/weeks_1_5.json','work/weeks_6_10.json']:
 o=json.load(open(f));WEEKS+=o['weeks'] if isinstance(o,dict) else o
CONTENT=[]
for f in ['work/expanded_content_1_5.json','work/expanded_content_6_10.json']:
 if Path(f).exists():CONTENT+=json.load(open(f))['weeks']
CONTENT={w['week']:w for w in CONTENT}
for f in sorted(Path('work').glob('expanded_week_*.json')):
 o=json.load(open(f));w=o['weeks'][0] if 'weeks' in o else o
 if w['week'] not in CONTENT:CONTENT[w['week']]=w
DAYS=[];ANSWERS=[{'week':i,'sections':[]} for i in range(1,11)];EXTENSIONS=[];QA=[]
COLOR='#1F5A63';GRAY='#555555';W=528;COL=254

def tidy(s):
 s=str(s).replace('The diagram has','There are')
 s=s.replace('ofπ','of π')
 for v,f in {'½':'{1/2}','⅓':'{1/3}','⅔':'{2/3}','¼':'{1/4}','¾':'{3/4}','⅕':'{1/5}','⅖':'{2/5}','⅗':'{3/5}','⅘':'{4/5}','⅛':'{1/8}','⅜':'{3/8}','⅝':'{5/8}','⅞':'{7/8}'}.items():
  s=re.sub(r'(?<=\d)'+v,' '+f,s).replace(v,f)
 s=re.sub(r'(?<![\w{])([−-]?\d+)/(\d+)(?![\w}])',r'{\1/\2}',s)
 s=re.sub(r'(?<=[A-Za-z])(?=[$\{])',' ',s)
 s=re.sub(r'(?<=[}])(?=[A-Za-z])',' ',s)
 s=re.sub(r'(?<=[A-Za-z])\.(?=\d)','. ',s)
 s=re.sub(r'\bat(?=[a-z]\s*=)','at ',s)
 s=re.sub(r'\s*([+=×÷])\s*',r' \1 ',s)
 s=re.sub(r'(?<=[0-9}a-z])−(?=[0-9{a-z])',' − ',s)
 s=re.sub(r'\)(?=[A-Za-z])',') ',s)
 s=re.sub(r'([?!])(?=\S)',r'\1 ',s)
 return re.sub(r' {2,}',' ',s)

def norm(p):
 def walk(v):
  if isinstance(v,dict):return {k:(x if k=='check' else walk(x)) for k,x in v.items()}
  if isinstance(v,list):return [walk(x) for x in v]
  return tidy(v) if isinstance(v,str) else v
 p=walk(copy.deepcopy(p))
 for k in ['local_page','student_page']:p.pop(k,None)
 return p

def dayhead(c,d,title,count,continuation=False):
 text(c,f'WEEK {d["week"]}  /  DAY {d["day"]:03d}  /  '+{'Sat':'SATURDAY','Sun':'SUNDAY','Mon':'MONDAY','Tue':'TUESDAY','Wed':'WEDNESDAY','Thu':'THURSDAY','Fri':'FRIDAY'}[d['weekday']],42,755,528,9.5,'OldB',COLOR)
 title=title+(' - continued' if continuation else '')
 y=text(c,title,42,730,528,17,'OldB')
 if not continuation:
  y=text(c,f'{count} questions, including 2 challenges. Write your work and answers on separate paper.',42,y-2,528,10.5)-8
 else:y-=8
 c.setStrokeColorRGB(.7,.7,.7);c.setLineWidth(.5);c.line(42,y+3,570,y+3)
 return y-12

def essential_diagram(p):
 # Only a diagram that supplies information absent from the words must be printed.
 if re.search(r'Read P and Q from the grid',p['text']):
  m=copy.deepcopy(p['diagram']);m.pop('caption',None);m['point_label_offsets']=[[-12,4],[4,4]];return m
 return None

def item_height(p,width,size):
 h=text_height(p['id']+'. '+p['text'],width,size)+8
 if essential_diagram(p):h+=165
 return h

def drawitem(c,p,x,y,width,size,local):
 p['local_page']=local
 yy=text(c,p['id']+'. '+p['text'],x,y,width,size)
 m=essential_diagram(p)
 if m:line_model(c,m,x+8,yy-159,width-16,152);yy-=165
 return yy-8

def split_balanced(ps,size):
 heights=[item_height(p,COL,size) for p in ps]
 if not heights:return [],[],0
 k=min(range(1,len(ps)+1),key=lambda k:max(sum(heights[:k]),sum(heights[k:])))
 return ps[:k],ps[k:],max(sum(heights[:k]),sum(heights[k:]))

def make_day(d,core,challenges,extras):
 if d['session']:
  from expanded_weekend_layout import build_weekend
  return build_weekend(globals(),d,core,challenges,extras)
 path=WORK/f'Day_{d["day"]:03d}.pdf';c=newpdf(path,d['title']);pg=1;sections=[];resources=[]
 count=len(core)+len(challenges);y=dayhead(c,d,d['title'],count)
 challenge_h=max(text_height(p['id']+'. '+p['text'],COL,11.1)+18 for p in challenges)+35
 available=y-48-challenge_h-20
 size=11.1
 left,right,h=split_balanced(core,size)
 if h>available:
  size=10.6;left,right,h=split_balanced(core,size)
 # Only genuinely long lesson sets spill to a second page, never tiny type.
 if h>available:
  allitems=core+challenges;left,right,h=split_balanced(core,11.1);size=11.1
  if h>y-60:
   raise ValueError(('Routine items too long',d['day'],h,y))
  for x,group in [(42,left),(316,right)]:
   yy=y
   for p in group:yy=drawitem(c,p,x,yy,COL,size,pg)
  c.showPage();pg+=1;y=dayhead(c,d,'Challenge and reasoning',2,True)
  text(c,'Take time to plan. Explain why your method works.',42,y,528,11,'OldI');y-=30
  for p in challenges:y=drawitem(c,p,42,y,528,11.5,pg)-18
 else:
  for x,group in [(42,left),(316,right)]:
   yy=y
   for p in group:yy=drawitem(c,p,x,yy,COL,size,pg)
  cy=y-h-14
  c.setStrokeColorRGB(.68,.68,.68);c.line(42,cy+8,570,cy+8)
  text(c,'CHALLENGE  /  Explain your plan and check the result',42,cy-7,528,10.5,'OldB',COLOR);cy-=32
  for x,p in zip([42,316],challenges):
   end=drawitem(c,p,x,cy,COL,11.1,pg)
   if end<44:QA.append({'day':d['day'],'issue':'challenge underflow','end':end})
 sec={'id':f'S{d["session"]:02d}' if d['session'] else f'Day{d["day"]:03d}_Practice','title':d['title'],'day':d['day'],'student_pages_local':[1,pg],'items':core+challenges,'assigned':True}
 sections.append(sec);c.showPage()
 # Extra assessments are retained compactly and explicitly substitute for routine work.
 for oldsec in extras:
  ps=[norm(p) for p in oldsec['items']]
  if oldsec['id'].endswith('_Study_Try'):continue
  if oldsec['id']=='Diagnostic_Facts':
   pg+=1;start=pg;text(c,'Optional oral fact snapshot',42,746,528,17,'OldB')
   text(c,'Use a short oral sample to spot facts needing practice. This is not extra daily homework.',42,717,528,11);yy=680
   for j,p in enumerate(ps):
    p['local_page']=pg;text(c,p['id']+'. '+p['text'],42+(j%3)*178,yy-(j//3)*34,166,11.5)
   c.showPage()
  else:
   pg+=1;start=pg;text(c,oldsec['title'],42,746,528,17,'OldB')
   yy=text(c,'Tutor choice: use this check in place of the routine questions, or in a separate assessment sitting. Keep the two daily challenges for discussion.',42,715,528,10.8)-18
   left,right,h=split_balanced(ps,11)
   if h>yy-55:
    # Split long checks into two balanced groups.
    chunks=[ps[:math.ceil(len(ps)/2)],ps[math.ceil(len(ps)/2):]]
   else:chunks=[ps]
   for ci,chunk in enumerate(chunks):
    if ci:pg+=1;yy=725;text(c,oldsec['title']+' - continued',42,750,528,15,'OldB')
    left,right,h=split_balanced(chunk,11)
    for x,group in [(42,left),(316,right)]:
     yy2=yy
     for p in group:yy2=drawitem(c,p,x,yy2,COL,11,pg)
    c.showPage()
  sections.append({'id':oldsec['id'],'title':oldsec['title'],'day':d['day'],'student_pages_local':[start,pg],'items':ps,'assigned':False,'use':'Assessment alternative; replaces routine work'})
 # One concise reference page per Sunday replaces four-page study guides and loose templates.
 if d['weekday']=='Sun':
  pg+=1;start=pg;w=WEEKS[d['week']-1]
  text(c,f'Week {d["week"]} reference',42,750,528,19,'OldB');yy=text(c,w['big_idea'],42,716,528,11.5)-16
  for s in w['sessions']:
   yy=text(c,s['title'],42,yy,528,13,'OldB',COLOR)-3
   yy=text(c,s['key_idea'],42,yy,528,11.1)-6
   ex=s['example'];yy=text(c,'Example: '+ex['text'],42,yy,528,11.1)-2
   for step in ex['steps']:yy=text(c,step,54,yy,516,10.7)-2
   yy=text(c,'Result: '+ex['answer'],54,yy,516,11.1,'OldB')-12
  yy=text(c,'Words to use',42,yy,528,12.5,'OldB',COLOR)-4
  voc=[]
  for s in w['sessions']:
   for v in s['vocab']:
    if v['term'] not in [z['term'] for z in voc]:voc.append(v)
  for v in voc[:5]:yy=text(c,v['term']+': '+v['meaning'],42,yy,528,10.5)-3
  if yy<45:QA.append({'day':d['day'],'issue':'reference underflow','end':yy})
  resources.append({'title':'Weekly reference (read when needed)','local_pages':[start,pg]});c.showPage()
 c.save();d.update(file=str(path.resolve()),pages=pg,sections=sections,resources=resources,daily_question_count=count,challenge_count=2)
 return d

def enrich_day(old):
 d={k:copy.deepcopy(v) for k,v in old.items() if k not in ['sections','resources','file','pages','workbook_page_start','workbook_page_end','source_keys']}
 cw=CONTENT[d['week']];dc=next(z for z in cw['days'] if z['weekday']==d['weekday'])
 target=25 if d['weekday']=='Wed' else 20
 main=next(s for s in old['sections'] if s['id'].startswith('S') and s['id'][1:].isdigit()) if d['session'] else old['sections'][0]
 core=[norm(p) for p in main['items']]
 seen={re.sub(r'\s+',' ',p['text']).strip().lower() for p in core}
 for p in dc['practice']:
  if len(core)>=target-2:break
  key=re.sub(r'\s+',' ',p['text']).strip().lower()
  if key not in seen:
   q=norm(p);q['id']=f'X{sum(str(t.get("id","")).startswith("X") for t in core)+1}' if d['session'] else str(len(core)+1);core.append(q);seen.add(key)
 assert len(core)==target-2,(d['day'],len(core),target)
 if d['session']:
  order={'R':0,'P':1,'F':2,'D':3,'M':4,'X':5,'S':6,'E':7}
  core.sort(key=lambda p:(order.get(re.sub(r'\d','',str(p['id'])),99),int(re.sub(r'\D','',str(p['id'])) or 0)))
 if not d['session']:
  for i,p in enumerate(core):p['id']=str(i+1)
 # Replace two repeated inherited warm-up/review prompts with fresh place-value practice.
 for ix,oldp in enumerate(core):
  replacement=None
  if d['day']==5 and oldp['id']=='9':replacement={'text':'30 × 10','answer':'300','worked':'Multiplying by 10 moves each digit one place to the left: 30 × 10 = 300.','skill':'N-SCALE','check':'30*10==300'}
  if d['day']==19 and oldp['id']=='10':replacement={'text':'0.7 × 100','answer':'70','worked':'Seven tenths multiplied by 100 is 70. Check: 70 ÷ 100 = 0.7.','skill':'N-SCALE','check':'D("0.7")*100==70'}
  if replacement:core[ix]=dict(norm(replacement),id=oldp['id'])
 challenges=[norm(p) for p in dc['challenges']]
 assert len(challenges)==2
 for i,p in enumerate(challenges):p['id']='C'+str(i+1);p['challenge']=True
 d['estimated_minutes']='75-90 minute lesson' if d['session'] else ('40-55 minutes' if d['weekday']=='Wed' else '30-45 minutes')
 d['booster_items']=[p['id'] for p in core if p.get('booster')]
 if d['session']:
  ext=next(s for s in cw['sessions'] if s['session']==d['session'])
  deep=norm(ext['deepening']);EXTENSIONS.append({'session':d['session'],'timing':'80 minutes: recall 7; launch and explore 18; model and guided practice 20; compare methods 10; challenges 20; summary and exit 5. Allow up to 10 extra minutes for discussion. Assessment alternatives replace routine practice.','timing_blocks':[{'phase':'Recall','minutes':7},{'phase':'Launch and explore','minutes':18},{'phase':'Model and guided practice','minutes':20},{'phase':'Compare methods','minutes':10},{'phase':'Challenges','minutes':20},{'phase':'Summary and exit','minutes':5}],'challenges':challenges,'additional_practice':[p for p in core if str(p['id']).startswith('X')],'deepening':[{**deep,'id':'T','title':deep['title'],'kind':'comparison','prompt':deep.get('prompt',deep.get('text')),'steps':deep.get('steps',[deep['worked']]),'visual_hint':deep.get('visual_hint',''),'diagram':deep.get('diagram'),'answer':deep['answer'],'check':deep.get('check'),'skill':deep['skill'],'notes':{'say':deep.get('prompt',deep.get('text')),'ask':deep['teacher_ask'],'expect':deep['answer'],'if_stuck':deep['teacher_hint'],'time':'8-10 minutes'},'item_ids':[]}],'discussion_moves':ext.get('discussion_moves',[])})
 extras=[s for s in old['sections'] if s is not main and not s['id'].endswith('_Study_Try')]
 return make_day(d,core,challenges,extras)

if __name__=='__main__':
 import sys
 prototype='--prototype' in sys.argv
 selected=[d for d in OLD if d['week'] in CONTENT]
 if not prototype:assert len(CONTENT)==10,sorted(CONTENT)
 for old in selected:DAYS.append(enrich_day(old))
 if QA:raise ValueError(QA)
 # Two pages of front matter; all references are stable absolute PDF page numbers.
 nextpage=3
 for d in DAYS:
  d['workbook_page_start']=nextpage;d['workbook_page_end']=nextpage+d['pages']-1
  for s in d['sections']:
   s['student_pages']=[a+nextpage-1 for a in s.pop('student_pages_local')]
   for p in s['items']:
    p['packet_page']=p['local_page'];p['student_page']=p.pop('local_page')+nextpage-1
   ANSWERS[d['week']-1]['sections'].append(s)
  for r in d['resources']:r['student_pages']=[a+nextpage-1 for a in r.pop('local_pages')]
  nextpage+=d['pages']
 front=WORK/'front.pdf';c=newpdf(front,'Daily questions')
 text(c,'Double Advanced',42,742,528,27,'OldB');text(c,'Daily questions',42,705,528,23,'OldB',COLOR)
 yy=text(c,'Ten weeks of practice, reasoning and challenge',42,654,528,15)-26
 for title,body in [('One day at a time','Every Saturday and Sunday is a three-page packet with 20 daily questions. Each weekday is one page: 20 questions normally and 25 on Wednesday. Two daily challenges, C1 and C2, are included in those totals.'),('Use separate paper','Use the three weekend pages for lesson work, practice and challenges. Use separate paper when helpful. On weekdays, write the day number and question label on your own paper.'),('During weekend lessons','R is recall; P is a lesson problem; F is your turn; D is discussion; M is mixed review; X is extra practice; S is your summary; E is the exit ticket. Match the same label on the slide.'),('Pace the work','Allow about30-45minutes on ordinary weekdays and40-55minutes on Wednesday. Work in two sittings when helpful. Weekend lessons allow75-90minutes for attempts, models, comparison and discussion.'),('Checks and references','Worked examples and lesson models are inside the weekend packets. Assessment alternatives also stay inside the three-page weekend packet. Your tutor selects them instead of ordinary practice or in a separate sitting.')]:
  body=re.sub(r'(?<=[a-zA-Z])(?=\d)|(?<=\d)(?=[a-zA-Z])',' ',body)
  yy=text(c,title,42,yy,528,13,'OldB')-3;yy=text(c,body,42,yy,528,11.5)-20
 c.showPage();text(c,'Find a day',42,746,528,23,'OldB');text(c,'Print only the pages you need. Use PDF bookmarks to jump to a week or day.',42,711,528,11)
 for j,h in enumerate(['Week','Sat','Sun','Mon','Tue','Wed','Thu','Fri']):text(c,h,42+j*66,672,62,11,'OldB')
 for wk in range(1,11):
  y=635-(wk-1)*53;text(c,str(wk),42,y,62,12,'OldB')
  for slot,d in enumerate([d for d in DAYS if d['week']==wk],1):
   text(c,f'Day {d["day"]:03d}',42+slot*66,y,62,10)
   a,b=d['workbook_page_start'],d['workbook_page_end'];text(c,f'p. {a}'+(f'-{b}' if a!=b else ''),42+slot*66,y-16,62,9.5)
 c.showPage();c.save();full=PdfWriter();full.append(str(front));marks={}
 for d in DAYS:
  if d['week'] not in marks:marks[d['week']]=full.add_outline_item(f'Week {d["week"]}',len(full.pages))
  full.add_outline_item(f'Day {d["day"]:03d} - {d["weekday"]}',len(full.pages),parent=marks[d['week']])
  packet=PdfWriter()
  for i,p in enumerate(PdfReader(d['file']).pages):
   buf=io.BytesIO();cv=canvas.Canvas(buf,pagesize=(612,792));text(cv,f'Day {d["day"]:03d} | Packet {i+1} of {d["pages"]}',42,24,400,9);text(cv,f'Student p. {d["workbook_page_start"]+i}',480,24,100,9);cv.save();p.merge_page(PdfReader(buf).pages[0]);full.add_page(p);packet.add_page(p)
  if not prototype:
   folder=OUT/'Daily_Packets';folder.mkdir(exist_ok=True);packetfile=folder/f'Day_{d["day"]:03d}_{d["weekday"]}_Week_{d["week"]:02d}.pdf'
   packet.add_metadata({'/Title':f'Day {d["day"]:03d} - {d["weekday"]} - Week {d["week"]}'});packet.write(str(packetfile));d['packet_file']=str(packetfile.resolve())
 target=Path('work/expanded_prototype_student.pdf') if prototype else OUT/'Student_Day_by_Day.pdf';full.write(str(target))
 json.dump({'workbook':str(target.resolve()),'total_pages':len(full.pages),'days':DAYS},open('work/expanded_student_manifest.json','w'),indent=2)
 json.dump({'weeks':ANSWERS},open('work/expanded_answers.json','w'),indent=2)
 json.dump({'sessions':EXTENSIONS},open('work/expanded_lesson_extensions.json','w'),indent=2)
 print(json.dumps({'pages':len(full.pages),'days':len(DAYS),'assigned_items':sum(d['daily_question_count'] for d in DAYS),'all_answers':sum(len(s['items']) for w in ANSWERS for s in w['sections']),'issues':QA},indent=2))
