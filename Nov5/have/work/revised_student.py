from pathlib import Path
import json, io, math, copy, re
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
import pdf_engine as pe
import build_program as bp
from pdf_engine import text, line_model, newpdf, header, problem
from supplements import diagnostic
OLD=Path('outputs/DoubleAdvanced_Math_Program'); OUT=Path('outputs/DoubleAdvanced_Revised');WORK=Path('work/revised_days'); WORK.mkdir(exist_ok=True)
weeks=bp.loadweeks(); captured={}
def cap_packet(path,title,id,wk,day,parts):captured[id]={'week':wk,'day':day,'parts':copy.deepcopy(parts),'check':False}
def cap_check(path,title,id,ps,wk,minutes=20):captured[id]={'week':wk,'day':5,'parts':[('Weekly Check',copy.deepcopy(ps))],'check':True}
# Reuse the verified original packet selection logic without writing the old files.
source=Path('work/build_program.py').read_text();start=source.index(" for d,name in enumerate(['Mon'");end=source.index(' # Consolidated weekly key',start)
ns=dict(vars(bp));ns.update(packet=cap_packet,check_pdf=cap_check,key_pdf=lambda *a,**k:None)
exec('def capture(w,weeks):\n wk=w.get("week");daily=Path("unused");tutor=Path("unused");allkeys=[]\n'+source[start:end],ns)
for w in weeks:ns['capture'](w,weeks)
plan=json.load(open('work/revised_booster_plan.json'))
placements={(int(p['week']),p['weekday']):p for p in plan['placements']}
EXTRAS={s['session']:s for s in json.load(open('work/revised_session_extras.json'))['sessions']}
DAYS=[]; ANSWERS=[{'week':i,'sections':[]} for i in range(1,11)]; CHECKS=[]

def cp(p,id,local_page,booster=None):
 q=copy.deepcopy(p);q['id']=str(id);q['local_page']=local_page
 if booster:q['booster']=booster
 return q

def sect(id,title,day,items,lo,hi):
 return {'id':id,'title':title,'day':day,'student_pages_local':[lo,hi],'items':items}

def safe_diagram(p):
 m=copy.deepcopy(p.get('diagram'))
 if not m:return None
 m.pop('caption',None)
 if m.get('kind')=='numberline' and 'use steps' in p['text'].lower():m['values']=[];m['labels']=[]
 if any(z in p['text'].lower() for z in ['five-number','quartile']):return None
 if m.get('kind')=='area':m['shade_rows']=0;m['shade_cols']=0
 if re.search(r'\b(plot|build|draw|place)\b',p['text'],re.I) and not p['text'].lower().startswith(('read ','a dot plot','the dot plot')):
  if m.get('kind')=='tape':return None
  if m.get('kind')=='coordinate':
   pts=m.get('points',[])
   if pts and not any(k in m for k in ['range','limit','xmax','ymax']):
    xy=[(pt.get('x',0),pt.get('y',0)) if isinstance(pt,dict) else pt[:2] for pt in pts]
    if min(min(a,b) for a,b in xy)<0:m['range']=[min(-1,math.floor(min(min(a,b) for a,b in xy))),max(1,math.ceil(max(max(a,b) for a,b in xy)))]
    else:m['xmax']=max(1,math.ceil(max(a for a,b in xy)));m['ymax']=max(1,math.ceil(max(b for a,b in xy)))
  else:m['labels']=[]
  m['points']=[];m['values']=[];m['data']=[];m['frequencies']=[]
 if m.get('kind')=='doubleline':m['blank_after']=1
 return m

def day_header(c,title,day,w,weekday,page):
 y=header(c,title,f'Day {day:03d}',page,True,f'Week {w} · {weekday}')
 return y

def diagnostic_layout_fix(path):
 r=PdfReader(path);ps,_=diagnostic();local=WORK/'diagnostic_page.pdf';c=newpdf(local,'Diagnostic reasoning')
 y=header(c,'Part B. Reasoning','W01 Diagnostic',5,True,'Week 1')
 for j,p in enumerate(ps[18:24]):
  xx=42+(j%2)*270;yy=y-(j//2)*195
  if j==3:
   text(c,'22. '+p['text'],xx,yy,250,12)
   line_model(c,{'kind':'coordinate','xmax':6,'ymax':5,'points':[]},xx,yy-157,245,120)
  else:problem(c,{k:v for k,v in p.items() if k!='diagram'},19+j,xx,yy,250,space=180,size=12)
 c.save();replacement=PdfReader(local).pages[0];wr=PdfWriter()
 for i,page in enumerate(r.pages):wr.add_page(replacement if i==4 else page)
 target=WORK/'diagnostic_with_writing_grid.pdf';wr.write(str(target));return target

def weekend_file(s,w,day,weekday):
 path=WORK/f'day{day:03d}_lesson.pdf';c=newpdf(path,s['title']);items=[];ex=EXTRAS[s['id']];pg=0
 recall=ex['recall'];mixed=ex['mixed'];summary=ex['summary']
 if recall:
  pg+=1;y=day_header(c,'Recall',day,w,weekday,pg)
  y=text(c,'Work from memory, then check with your tutor.',42,y,528,11)-24
  for j,p in enumerate(recall):
   problem(c,{k:v for k,v in p.items() if k!='diagram'},p['id'],42+(j%2)*270,y-(j//2)*155,250,space=140)
   items.append(cp(p,p['id'],pg))
  y=text(c,'S. Return here near the end of the lesson',42,285,528,14,'OldB')-12
  text(c,summary['text'],42,y,528,12.5)
  for yy in [210,175,140]:c.setLineWidth(.35);c.line(42,yy,570,yy)
  items.append(cp(summary,'S',pg));c.showPage()
 tasklist=[(f'P{i+1}',p) for i,p in enumerate(s['problems'])]
 fade=dict(s['fade'],skill={11:'E-DIST',12:'E-MULT',13:'G-TRI',14:'G-SA',15:'N-ABS',16:'N-REFLECT',17:'S-MEDIAN',18:'S-MAD',19:'P-PROP',20:'G-CIRCLE'}.get(s['id'],s['exit']['skill']),worked='Use the worked example in the slides to check each step.')
 err=dict(text=s['error']['text'],answer=s['error']['correction'],skill=bp.error_skill(s),check=s['error']['check'],worked=s['error']['why']+' '+s['error']['move'])
 tasklist += [('F',fade),('D',err)]
 if not recall:tasklist.append(('S',summary))
 for start in range(0,len(tasklist),3):
  pg+=1;y=day_header(c,s['title'],day,w,weekday,pg)
  y=text(c,'Follow the slide labels. P = problem; F = your turn; D = discussion.',42,y,528,10.5)-18
  for j,(label,p) in enumerate(tasklist[start:start+3]):
   yy=y-j*195;m=safe_diagram(p)
   end=text(c,label+'. '+p['text'],42,yy,250 if m and m.get('kind')=='coordinate' else 528,12.5)
   if m:line_model(c,m,305,yy-170,245,165 if m.get('kind')=='coordinate' else 100)
   else:text(c,'Answer: ______________________________',42,end-10,528,11)
   items.append(cp(p,label,pg))
  c.showPage()
 if mixed:
  pg+=1;y=day_header(c,'Mixed review',day,w,weekday,pg)
  for j,p in enumerate(mixed):
   problem(c,{k:v for k,v in p.items() if k!='diagram'},p['id'],42,y-j*185,528,space=170)
   items.append(cp(p,p['id'],pg))
  c.showPage()
 pg+=1;y=day_header(c,'Exit ticket',day,w,weekday,pg)
 y=text(c,'Work on your own. Show a model or reason when the question asks for one.',42,y,528,11)-30
 problem(c,{k:v for k,v in s['exit'].items() if k!='diagram'},'E',42,y,528,space=160)
 m=safe_diagram(s['exit'])
 if m:line_model(c,m,85,270,440,190)
 items.append(cp(s['exit'],'E',pg));c.save()
 bp.verify([p for _,p in tasklist if p.get('check')]+recall+mixed+[s['exit']],f'Day{day} weekend')
 return path,sect(f'S{s["id"]:02d}',s['title'],day,items,1,pg)

def daily_file(w,d,day,weekday):
 id=f'W{w:02d}_D{d}_{"Fri_Weekly_Check" if d==5 else weekday}';bundle=copy.deepcopy(captured[id]);placement=placements.get((w,weekday));booster=None
 if placement and d!=5:
  booster=placement['label'];bitems=copy.deepcopy(placement['problems'])
  if d==3:
   # The original weekly puzzle is already the correct reasoning practice for this Wednesday.
   for p in bitems:p['booster']=booster
   bundle['parts'][2]=('Part C. Think',bitems)
  else:
   core=bundle['parts'][1][1]
   keep_count=len(core)-len(bitems);keep=[];seen={p['text'] for p in bitems}
   current_sets={1:['01_Fractions','02_Fraction_Operations'],2:['06_Ratios'],3:['06_Ratios','07_Percent'],4:['02_Fraction_Operations'],5:['03_Decimals','04_Multi_Digit'],6:['09_Equations'],7:['10_Area_Volume'],8:['08_Negatives'],9:['12_Statistics'],10:['13_Scale_and_Circles']}
   preferred=(core[-3:]+core[:5]) if d in [1,2] and placement['set_id'] in current_sets[w] and w<10 else core
   if w==10:
    idx={1:[0,2,4,6,7,8],2:[0,1,3,5,7,8],4:[1,2,3,4,5,6]}[d]
    preferred=[core[i] for i in idx]+core
   for p in preferred:
    if p['text'] not in seen:keep.append(p);seen.add(p['text'])
    if len(keep)==keep_count:break
   if len(keep)<keep_count:
    for p in weeks[w-1]['bank']:
     if p['text'] not in seen:keep.append(p);seen.add(p['text'])
     if len(keep)==keep_count:break
   bundle['parts'][1]=(bundle['parts'][1][0],keep+bitems)
   for p in bundle['parts'][1][1][keep_count:]:p['booster']=booster
 path=WORK/f'day{day:03d}_practice.pdf';c=newpdf(path,'Daily practice');items=[];num=1
 if d==5:
  ps=bundle['parts'][0][1]
  for start in [0,5]:
   pg=start//5+1;y=day_header(c,'Weekly check',day,w,weekday,pg)
   if pg==1:y=text(c,'20 minutes. No calculator. Show your work.',42,y,528,11)-18
   for j,p in enumerate(ps[start:start+5]):
    problem(c,{k:v for k,v in p.items() if k!='diagram'},start+j+1,42+(j%2)*270,y-(j//2)*185,250,space=170)
    items.append(cp(p,start+j+1,pg))
   c.showPage()
 else:
  wa=bundle['parts'][0][1];practice=bundle['parts'][1][1];think=bundle['parts'][2][1];stretch=bundle['parts'][3][1] if len(bundle['parts'])>3 else []
  y=day_header(c,'Daily practice',day,w,weekday,1)
  y=text(c,'A. Warm-up  (3 minutes)',42,y,528,14,'OldB')-10
  for j,p in enumerate(wa):
   problem(c,p,num,42+(j%2)*270,y-(j//2)*62,250,space=55);items.append(cp(p,num,1));num+=1
  y-=139;y=text(c,'B. Practice',42,y,528,14,'OldB')-12
  for j,p in enumerate(practice[:4]):
   problem(c,{k:v for k,v in p.items() if k!='diagram'},num,42+(j%2)*270,y-(j//2)*145,250,space=130);items.append(cp(p,num,1,p.get('booster')));num+=1
  c.showPage();y=day_header(c,'Practice and thinking',day,w,weekday,2)
  label='Built-in practice: '+booster if booster and d!=3 else 'B. Practice, continued'
  y=text(c,label,42,y,528,13,'OldB')-12
  for j,p in enumerate(practice[4:]):
   problem(c,{k:v for k,v in p.items() if k!='diagram'},num,42+(j%2)*270,y-(j//2)*102,250,space=90);items.append(cp(p,num,2,p.get('booster')));num+=1
  y-=math.ceil(len(practice[4:])/2)*102+7;y=text(c,'C. Think: weekly puzzle' if d==3 else 'C. Think',42,y,528,14,'OldB')-12
  for p in think:
   y=problem(c,{k:v for k,v in p.items() if k!='diagram'},num,42,y,528,space=85 if stretch else 100);items.append(cp(p,num,2,p.get('booster')));num+=1
  if stretch:
   y=text(c,'Stretch (optional)',42,y,528,13,'OldB')-12
   for j,p in enumerate(stretch):
    problem(c,p,num,42+(j%2)*270,y,250,space=65);items.append(cp(p,num,2,p.get('booster')));num+=1
  c.showPage()
 c.save();bp.verify(items,f'Day{day} daily');return path,sect(f'Day{day:03d}_Practice','Weekly check' if d==5 else 'Daily practice',day,items,1,2),booster

def special_check(w):
 if w==3:return 'Mini Check A',weeks[0]['bank'][:2]+weeks[1]['bank'][:2]+weeks[2]['bank'][:2]+weeks[2]['bank'][12:14],'W03_Mini_Check_A.pdf'
 if w==9:
  selections={2:[0,12],3:[0,12,17],4:[0,12,15],5:[0,12,14],6:[0,12,20],7:[3,6,16],8:[0,12,18],9:[0,3,15,18]}
  return 'Grade 6 cumulative check',[weeks[k-1]['bank'][j] for k,inds in selections.items() for j in inds],'W09_Grade_6_Cumulative_Check.pdf'
 if w==10:return 'Final mixed review',[bp.choose(q['bank'],1,200+q['week'])[0] for q in weeks],'W10_Final_Mixed_Review.pdf'
 return None

def chunk_add(writer,path,sections,offset):
 writer.append(str(path));count=len(PdfReader(path).pages)
 for sec in sections:
  sec['student_pages_local']=[a+offset for a in sec['student_pages_local']]
  for it in sec['items']:it['local_page']+=offset
 return count

for w in weeks:
 wk=w['week']
 for slot,weekday in enumerate(['Sat','Sun','Mon','Tue','Wed','Thu','Fri']):
  day=(wk-1)*7+slot+1;writer=PdfWriter();sections=[];n=0;booster=None;resources=[]
  if slot<2:
   s=w['sessions'][slot]
   if day==1:
    ps,facts=diagnostic();path=diagnostic_layout_fix(OLD/'02_Weeks/Week_01/1_Weekend_Handouts/W01_Diagnostic.pdf')
    a=sect('Diagnostic_Facts','Diagnostic: fact snapshot',day,[cp(p,i+1,1) for i,p in enumerate(facts)],1,1)
    b=sect('Diagnostic','Diagnostic: computation and reasoning',day,[cp(p,i+1,i//6+2) for i,p in enumerate(ps)],2,6)
    n+=chunk_add(writer,path,[a,b],n);sections.extend([a,b])
   path,sec=weekend_file(s,wk,day,weekday);n+=chunk_add(writer,path,[sec],n);sections.append(sec)
   if slot==1:
    special=special_check(wk)
    if special:
     title,ps,name=special;path=OLD/'02_Weeks'/f'Week_{wk:02d}'/'1_Weekend_Handouts'/name;per=6 if len(ps)>12 else 5
     sec=sect(name[:-4],title,day,[cp(p,i+1,i//per+1) for i,p in enumerate(ps)],1,len(PdfReader(path).pages))
     n+=chunk_add(writer,path,[sec],n);sections.append(sec)
    # The study guide belongs to this Sunday; reference pages are not extra assigned work.
    path=OLD/'02_Weeks'/f'Week_{wk:02d}'/'3_Study_Guide'/f'W{wk:02d}_Study_Guide.pdf'
    tries=w['bank'][:2]+w['bank'][12:15]
    sec=sect(f'W{wk:02d}_Study_Try','Study guide: Try it',day,[cp(p,i+1,4) for i,p in enumerate(tries)],1,4)
    study_start=n+1;n+=chunk_add(writer,path,[sec],n);sections.append(sec);resources.append({'title':'Study guide (reference)','local_pages':[study_start,n]})
   # Include a tool exactly where it first becomes useful; no separate printables folder.
   chosen={1:[('Fraction_Strips.pdf',None)],2:[('Tape_Diagram_Template.pdf',None)],3:[('Ratio_Table_Template.pdf',None),('Double_Number_Line_Template.pdf',None)],7:[('Number_Lines.pdf',[0,1])],13:[('One_Centimeter_Grid.pdf',None)],14:[('Cut_Out_Nets.pdf',None)],15:[('Number_Lines.pdf',[2,3])],16:[('Coordinate_Planes.pdf',None)]}.get(s['id'],[])
   for name,pages in chosen:
    path=OLD/'04_Printables'/name;r=PdfReader(path);chosenpages=pages if pages is not None else range(len(r.pages));start=n+1
    for i in chosenpages:writer.add_page(r.pages[i]);n+=1
    resources.append({'title':name.replace('_',' ').replace('.pdf',''),'local_pages':[start,n]})
   title=s['title'];session=s['id']
  else:
   path,sec,booster=daily_file(wk,slot-1,day,weekday);n+=chunk_add(writer,path,[sec],n);sections.append(sec);title='Weekly check' if slot==6 else w['title'];session=None
  path=WORK/f'Day_{day:03d}.pdf';writer.write(str(path))
  DAYS.append({'day':day,'week':wk,'weekday':weekday,'title':title,'session':session,'file':str(path.resolve()),'pages':n,'sections':sections,'resources':resources,'booster':booster,'booster_items':[it['id'] for sec in sections for it in sec['items'] if it.get('booster')],'source_keys':[]})

# Cover and week/day page map occupy two pages. Allocate stable absolute references first.
nextpage=3
for day in DAYS:
 day['workbook_page_start']=nextpage;day['workbook_page_end']=nextpage+day['pages']-1
 for sec in day['sections']:
  sec['student_pages']=[a+nextpage-1 for a in sec.pop('student_pages_local')]
  for it in sec['items']:it['student_page']=it.pop('local_page')+nextpage-1
  ANSWERS[day['week']-1]['sections'].append(sec)
 for r in day['resources']:r['student_pages']=[p+nextpage-1 for p in r.pop('local_pages')]
 nextpage+=day['pages']
front=WORK/'front.pdf';c=newpdf(front,'Daily math workbook')
text(c,'Double Advanced',48,710,510,30,'OldB');text(c,'Daily math workbook',48,667,510,24,'OldB')
y=text(c,'Ten weeks. One day at a time.',48,610,510,16)-35
for heading,body in [('Find your day','Each day has one continuous section. Saturdays and Sundays go with the slides. Monday through Friday are short practice sessions.'),('During a lesson','P labels the lesson problems. F is your turn after an example. D is a discussion. E is the exit ticket. Match the slide label to the same label on paper.'),('During the week','Built-in practice is already part of the day. It replaces other questions. It is not an extra assignment. Work for 15-20 minutes, then tell your tutor what remains.'),('Reference pages','Study guides and paper tools sit beside the days that use them. Read or use these pages when needed. They are not extra questions to finish.'),('Answers','The tutor has a separate guide for each week. Review the answers after you have tried the questions.')]:
 y=text(c,heading,48,y,510,15,'OldB')-6;y=text(c,body,48,y,510,13)-25
text(c,'Student workbook · 1',48,25,510,10);c.showPage()
text(c,'Find a day',42,748,528,23,'OldB');text(c,'Each cell gives the day number and the pages to print.',42,711,528,12)
cols=['Week','Sat','Sun','Mon','Tue','Wed','Thu','Fri'];cw=66
for i,h in enumerate(cols):text(c,h,42+i*cw,671,cw-4,11,'OldB')
for w in range(1,11):
 yy=631-(w-1)*53;text(c,str(w),42,yy,cw,12,'OldB')
 for slot,d in enumerate(DAYS[(w-1)*7:w*7],1):
  text(c,f'Day {d["day"]:03d}',42+slot*cw,yy,cw-3,10)
  text(c,f'p. {d["workbook_page_start"]}-{d["workbook_page_end"]}',42+slot*cw,yy-16,cw-3,9)
text(c,'Student workbook · 2',42,25,528,10);c.save()
full=PdfWriter();full.append(str(front));weekmarks={}
for d in DAYS:
 if d['week'] not in weekmarks:weekmarks[d['week']]=full.add_outline_item(f'Week {d["week"]}: {weeks[d["week"]-1]["title"]}',len(full.pages))
 parent=full.add_outline_item(f'Day {d["day"]:03d} · {d["weekday"]} · {d["title"]}',len(full.pages),parent=weekmarks[d['week']])
 rr=PdfReader(d['file'])
 for i,pg in enumerate(rr.pages):
  absolute=d['workbook_page_start']+i;buf=io.BytesIO();cv=canvas.Canvas(buf,pagesize=(612,792));cv.setFillColorRGB(1,1,1);cv.rect(0,10,612,28,fill=1,stroke=0)
  text(cv,f'Day {d["day"]:03d} · Week {d["week"]} · {d["weekday"]}',42,23,430,9)
  text(cv,f'Student p. {absolute}',485,23,95,9);cv.save();pg.merge_page(PdfReader(buf).pages[0]);full.add_page(pg)
OUT.mkdir(exist_ok=True);full.write(str(OUT/'Student_Day_by_Day.pdf'))
json.dump({'workbook':str((OUT/'Student_Day_by_Day.pdf').resolve()),'total_pages':len(full.pages),'days':DAYS},open('work/revised_student_manifest.json','w'),indent=2)
json.dump({'weeks':ANSWERS},open('work/revised_answers.json','w'),indent=2)
json.dump(bp.VERIFY,open('work/revised_math_checks.json','w'),indent=2)
print('Built student workbook:',len(full.pages),'pages;',len(DAYS),'days;',sum(len(s['items']) for w in ANSWERS for s in w['sections']),'answer items')
