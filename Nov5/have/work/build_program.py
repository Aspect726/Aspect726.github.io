from pdf_engine import *
from supplements import *
from datetime import date,timedelta
import random,csv,shutil,zipfile
ALL=[];ARTIFACTS=[];VERIFY=[]
def verify(ps,context):
 for i,p in enumerate(ps):
  try: ok=bool(eval(p['check'],{'F':F,'D':D,'statistics':statistics,'math':math,'sorted':sorted,'sum':sum,'min':min,'max':max,'abs':abs,'len':len,'all':all,'any':any,'range':range,'set':set,'round':round,'zip':zip}))
  except Exception as e:raise ValueError((context,i,p.get('text'),p.get('check'),e))
  if not ok:raise ValueError((context,i,p))
  VERIFY.append({'context':context,'item':i+1,'check':p['check'],'passed':True})
def error_skill(s):
 return {11:'E-DIST',12:'E-MULT',13:'G-TRI',14:'G-SA',15:'N-ORDER',16:'E-INEQ',17:'S-MEDIAN',18:'S-MAD',19:'P-SCALE',20:'G-CIRCLE'}.get(s['id'],s['exit']['skill'])
def agenda(s):
 i=s['id'];w=(i+1)//2
 if i==1:return 'Diagnostic 35 + break 5; review 5; lesson 25 (launch 5, explore 8, discuss 10, synthesize 2); exit 5. Total 75 min.'
 if i==6:return 'Retrieval 4; launch 4; explore 12; discuss 10; synthesize 3; Mini Check A 15; exit 5; preview 5; slack 7. Total 65 min.'
 if i==16:return 'Coordinate plane 35 min; inequalities 25 min. Use retrieval 5, launch 5, explore 12, discuss 10, synthesis 3, mixed review 10, exit 5, preview 5, slack 5. Total 60 min.'
 if i==18:return 'Lesson: retrieval 3, launch 3, explore 12, discuss 10, synthesis 3, exit 5, preview 4. Total 40 min. Separate same-day cumulative check: 30 min.'
 if i==20:return 'Circles 35 (launch 5, explore 12, discuss 10, synthesis 3, exit 5); previews 15; final paper review 15. Total 65 min.'
 if w in [4,8,9]:
  return ('Retrieval 5; launch 5; explore 15; discuss 10; synthesis 5; exit 5; preview 5; slack 10. Total 60 min.' if i%2 else 'Retrieval 5; launch 5; explore 12; discuss 10; synthesis 3; mixed review 10; exit 5; preview 5; slack 5. Total 60 min.')
 return 'Retrieval 7; launch 8; explore 20; discuss 15; synthesis 7; exit 8; preview 5; slack 5. Total 75 min.' if i%2 else 'Retrieval 5; launch 5; explore 15; discuss 12; synthesis 5; mixed review 10; exit 8; preview 5. Total 65 min.'
def handout(path,s,wk):
 c=newpdf(path,s['title']);id=f'S{s["id"]:02d}'; y=header(c,s['title'],id,1,True,f'Week {wk}')
 y=text(c,'Use these tasks with the slides. Continue P4 onward in your notebook.',42,y,528,11)-20
 for n,p0 in enumerate(s['problems'][:3],1):
  pp=p0.copy(); pp.pop('diagram',None)
  yy=problem(c,pp,'P'+str(n),42,y,528,space=150)
  if p0.get('diagram') and not ('five-number' in p0['text'].lower() or 'quartile' in p0['text'].lower()):
   mm={k:v for k,v in p0['diagram'].items() if k!='caption'}
   if mm.get('kind')=='area':mm['shade_rows']=0;mm['shade_cols']=0
   if p0['text'].lower().startswith(('plot ','build ','draw ','place ')):mm['points']=[];mm['values']=[];mm['data']=[];mm['frequencies']=[]
   if mm.get('kind')=='doubleline':mm['blank_after']=1
   line_model(c,mm,310,yy+25,240,85)
  y=yy
 c.showPage();y=header(c,'Exit ticket',id,2,True,f'Week {wk}'); y=text(c,'Work on your own. Use a model or a reason to support your answer.',42,y,528,11)-35
 pp=s['exit'].copy();pp.pop('diagram',None);problem(c,pp,'E',42,y,528,space=130)
 if s['exit'].get('diagram'):line_model(c,s['exit']['diagram'],70,300,450,170)
 c.save()
def run_sheet(path,s,wk):
 c=newpdf(path,'Tutor run sheet');y=header(c,f'S{s["id"]:02d}  {s["title"]}',f'S{s["id"]:02d} Tutor',1)
 def block(label,body):
  nonlocal y
  y=text(c,label,42,y,528,10,'OldB')-2;y=text(c,body,42,y,528,9.4,leading=11.1)-7
 block('Goal and key idea',s['goal']+' '+s['key_idea'])
 block('Prerequisite and materials',s['prerequisite']+' Materials: '+', '.join(s['materials'])+'.')
 block('Timed agenda',agenda(s))
 block('Explore: response / meaning / tutor move','\n'.join(z['response']+' / '+z['why']+' / '+z['move'] for z in s['look_fors'][:3]))
 block('Misconceptions: response / reason / tutor move','\n'.join(z['response']+' / '+z['why']+' / '+z['move'] for z in s['misconceptions'][:2]))
 block('Discuss: agree or disagree, then partner compare',' '.join(s['discussion'][:2]))
 es=s['exit_sort'];block('Exit-ticket sort','Got it: '+es['got']+' Almost there: '+es['almost']+' Needs re-teaching: '+es['reteach'])
 block('Required coverage: case to numbered problem','; '.join('P'+str(j+1)+': '+p['case'] for j,p in enumerate(s['problems']))+'. E: '+s['exit']['case']+'. P1-P3 are on the handout. P4 onward are required slide tasks, answered in a notebook.')
 if y<45:OVERFLOWS.append((str(path),1,y))
 c.save()
def study(path,w):
 c=newpdf(path,w['title']);wk=w['week'];id=f'W{wk:02d} Study';s1,s2=w['sessions']
 y=header(c,w['title'],id,1); y=text(c,'The big idea',42,y,528,15,'OldB',TEAL)-7;y=text(c,w['big_idea'],42,y,528)-14
 y=text(c,'Words to know',42,y,528,15,'OldB',TEAL)-7
 for v in (s1['vocab']+s2['vocab']):y=text(c,v['term']+': '+v['meaning']+' Example: '+v['example'],42,y,528,12)-8
 c.showPage();y=header(c,'How it works',id,2)
 y-=15
 for s in [s1,s2]:
  # use a compact correct abstract diagram alongside explanatory caption
  model=s.get('model',{}); model=dict(model);caption=model.pop('caption','');
  if s['id']==19:model['connect']=True
  line_model(c,model,48,y-180,235,150);text(c,caption+' '+s['key_idea'],310,y-15,250,12);y-=235
 if y<35:OVERFLOWS.append((str(path),1,y))
 c.showPage();y=header(c,'Worked examples',id,3)
 for j,s in enumerate([s1,s2],1):
  ex=s['example'];y=text(c,f'{j}. '+ex['text'],42,y,528,13,'OldB')-10
  for step in ex['steps']:y=text(c,step,60,y,510,12)-5
  y=text(c,'Answer: '+ex['answer'],60,y,510,12)-22
 if wk==5:
  y=text(c,'3. Long division: 936 ÷ 24',42,y,528,13,'OldB')-8
  y=text(c,'24 fits into 93 three times. Write 3 above the tens place. Subtract 72 from 93 to leave 21. Bring down the 6 to make 216. 24 fits into 216 nine times. Write 9 above the ones place. Subtract 216 to leave 0. The quotient is 39. Check: 39 × 24 = 936.',42,y,528,11.5)-14
  verify([p('936 ÷ 24',39,'N-DIV','936//24==39 and 24*3==72 and 93-72==21 and 24*9==216')],'Guide long division')
 y=text(c,'Common mistakes',42,y,528,15,'OldB',BRICK)-8
 for m in (s1['misconceptions']+s2['misconceptions'])[:3]:
  y=text(c,m['response']+' Why: '+m['why']+' Fix: '+m['move'],42,y,528,11.5)-10
 if wk==8:
  y=text(c,'GCF and LCM',42,y,528,14,'OldB',TEAL)-5
  y=text(c,'The greatest common factor is the largest whole number dividing both numbers. GCF(12, 18) = 6. The least common multiple is the first shared positive multiple. LCM(4, 6) = 12. List factors or multiples to check.',42,y,528,11.5)-7
 if wk>=8:
  y=text(c,'Optional preview',42,y,528,14,'OldB',TEAL)-6
  preview={8:'Undo equal steps on both sides. For 2x + 3 = 11, subtract 3 to get 2x = 8. Divide by 2 to get x = 4. A number-line step right adds a positive number.',9:'A 25% discount leaves 75% of the starting price. For 3(x + 2) = 18, divide both sides by 3, then subtract 2. This gives x = 4.',10:'Signed multiplication follows equal-step patterns: (−3) × 4 = −12. A quotient asks for the missing factor. Since (−3) × 4 = −12, (−12) ÷ (−3) = 4.'}
  y=text(c,preview[wk],42,y,528,11.5)-8
 if y<35:OVERFLOWS.append((str(path),3,y))
 c.showPage();y=header(c,'Try it',id,4)
 tries=w['bank'][:2]+w['bank'][12:15]
 if len(tries)<5:tries=w['bank'][:5]
 for j,p0 in enumerate(tries,1):
  pp=p0.copy();pp.pop('diagram',None);y=problem(c,pp,j,42,y,528,space=70,answerline=False)
 y=text(c,'Answers',42,y-6,528,14,'OldB',TEAL)-6
 y=text(c,'  '.join(f'{i+1}. '+p['answer'] for i,p in enumerate(tries)),42,y,528,11.5)-18
 y=text(c,'Where this connects',42,y,528,14,'OldB',TEAL)-6;text(c,w['connections'],42,y,528,12)
 c.save()
def choose(bank,n,seed):
 rr=random.Random(seed);return rr.sample(bank,min(n,len(bank)))
def make_week(w,weeks):
 wk=w['week'];base=ROOT/'02_Weeks'/f'Week_{wk:02d}';hand=base/'1_Weekend_Handouts';daily=base/'2_Daily_Packets';tutor=base/'4_Tutor_Only'
 allkeys=[]
 for s in w['sessions']:
  day='Sat' if s['id']%2 else 'Sun';sid=f'W{wk:02d}_{day}'
  handout(hand/(sid+'_Session.pdf'),s,wk);run_sheet(tutor/(sid+'_Run_Sheet.pdf'),s,wk)
  ps=s['problems']+[s['exit'],s['fade'] if isinstance(s['fade'],dict) and 'skill' in s['fade'] else p(s['fade']['text'],s['fade']['answer'],{11:'E-DIST',12:'E-MULT',13:'G-TRI',14:'G-SA',15:'N-ABS',16:'N-REFLECT',17:'S-MEDIAN',18:'S-MAD',19:'P-PROP',20:'G-CIRCLE'}.get(s['id'],s['exit']['skill']),s['fade'].get('check',s['problems'][0]['check']))]
  key_pdf(tutor/(sid+'_Key.pdf'),sid+' answers',sid,ps);allkeys+=ps
 study(base/'3_Study_Guide'/f'W{wk:02d}_Study_Guide.pdf',w)
 for d,name in enumerate(['Mon','Tue','Wed','Thu','Fri_Weekly_Check'],1):
  id=f'W{wk:02d}_D{d}_{name}';current=w['bank'];recent=[p for q in weeks[max(0,wk-3):wk-1] for p in q['bank']];older=[p for q in weeks[:max(0,wk-3)] for p in q['bank']];found=foundations(wk+d)
  recent=recent or foundations(wk+d+5);older=older or foundations(wk+d+11)
  if wk==10:
   practice=[choose(q['bank'],1,d*50+j)[0] for j,q in enumerate(weeks)]
  elif d in [1,2]:
   subset=current[:12] if d==1 else current[12:];subset=subset or current
   practice=choose(subset,5,wk*10+d)+choose(recent,1,wk+d)+choose(older,1,wk*20+d)+choose(found,1,d)
  elif d==3:practice=choose(current,2,wk)+choose(recent,2,wk+d)+choose(older,2,wk*20)+choose(found,2,d)
  elif d==4:practice=choose(current,3,wk)+choose(recent,2,wk+d)+choose(older,2,wk*20)+choose(found,1,d)
  else:practice=choose(current,4,wk)+choose(recent,3,wk+d)+choose(older,2,wk*20)
  if wk==8 and d in [3,4]:
   extra=w['bank'][24:]
   if extra:practice[-2:]=extra[:2] if d==3 else extra[2:4]
  seen=set(); unique=[]
  for it in practice:
   if it['text'] in seen:
    it=next(q for seed in range(wk+d+21,wk+d+50) for q in foundations(seed) if q['text'] not in seen)
   seen.add(it['text']);unique.append(it)
  practice=unique
  if d==5:
   ex=p(w['sessions'][0]['error']['text'],w['sessions'][0]['error']['correction'],error_skill(w['sessions'][0]),w['sessions'][0]['error'].get('check',w['sessions'][0]['problems'][0]['check']),w['sessions'][0]['error']['correction'],w['sessions'][0]['error']['wrong'],w['sessions'][0]['error']['why'])
   ps=practice[:9]+[ex];check_pdf(daily/(id+'.pdf'),'Weekly Check',id,ps,wk,20)
  else:
   wa=warmup(wk,d)
   if d==3:think=[w['teaser']]
   elif d==4:
    si=w['sessions'][1];think=[choose([p for p in current if len(p['text'])>55] or current,1,999+wk)[0],p(si['error']['text'],si['error']['correction'],error_skill(si),si['error'].get('check',si['problems'][0]['check']),si['error']['correction'],si['error']['wrong'],si['error']['why'])]
   else:
    si=w['sessions'][d-1];think=[p(si['error']['text'],si['error']['correction'],error_skill(si),si['error'].get('check',si['problems'][0]['check']),si['error']['correction'],si['error']['wrong'],si['error']['why'])]
   parts=[('Part A. Warm-up',wa),('Part B. Practice',practice),('Part C. Think',think)]
   if d==4 and wk>=8:
    stretch=[p('Start at −3. Move 5 units right. Where do you land?',2,'N-SIGNED','-3+5==2'),p('A price rises from $20 to $25. Find the percent increase.','25%','R-PERCENT','F(5,20)*100==25')]
    if wk==8:stretch=[p('Start at −3. Move 5 units right. Where do you land?',2,'N-SIGNED','-3+5==2'),p('Solve 2x + 3 = 11.','x = 4','E-EQ','2*4+3==11','Subtract 3 from both sides, then divide both sides by 2.')]
    elif wk==9:stretch=[p('A $40 item is 25% off. Find the sale price.','$30','R-PERCENT','40*(1-F(25,100))==30'),p('Solve 3(x + 2) = 18.','x = 4','E-EQ','3*(4+2)==18','Divide both sides by 3, then subtract 2.')]
    else:stretch=[p('Compute (−3) × 4 and (−12) ÷ (−3).','−12; 4','N-SIGNED','-3*4==-12 and F(-12,-3)==4'),p('A price rises from $20 to $25. Find the percent increase.','25%','R-PERCENT','F(5,20)*100==25')]
    # Optional stretch on same two-page sheet, compact; no new required content.
    parts.append(('Stretch (optional)',stretch))
   ps=[p for label,arr in parts for p in arr];packet(daily/(id+'.pdf'),'Daily practice',id,wk,d,parts)
  verify(ps,id);key_pdf(tutor/(id+'_Key.pdf'),id+' answers',id,ps);allkeys+=ps
 # Consolidated weekly key mirrors separate keys, aids lookup.
 from pypdf import PdfWriter
 writer=PdfWriter()
 for kp in sorted(tutor.glob(f'W{wk:02d}*_Key.pdf')):writer.append(str(kp))
 writer.write(str(tutor/f'W{wk:02d}_All_Answers.pdf'))

def build_diagnostic():
 base=ROOT/'02_Weeks/Week_01';ps,facts=diagnostic();verify(ps+facts,'Diagnostic');c=newpdf(base/'1_Weekend_Handouts/W01_Diagnostic.pdf','Starting line diagnostic')
 y=header(c,'Starting line', 'W01 Diagnostic',1,True,'Week 1');y=text(c,'This shows what to practice next. Skip anything you have not learned.',42,y,528,12)-30
 y=text(c,'Fact snapshot (up to 2 minutes)',42,y,528,14,'OldB')-25
 for i,item in enumerate(facts):problem(c,item,i+1,42+i%3*180,y-(i//3)*40,160,space=35,size=12,answerline=False)
 text(c,'Stop when the tutor calls time. Accuracy matters. Compare only with your own future work.',42,140,528,12);c.showPage()
 for start in range(0,len(ps),6):
  pg=start//6+2;y=header(c,'Part A. Computation' if start<13 else 'Part B. Reasoning','W01 Diagnostic',pg,True,'Week 1')
  if start==12:y=text(c,'After item 13, take a 5-minute break. Part B starts with item 14.',42,y,528,11)-20
  for j,p0 in enumerate(ps[start:start+6]):problem(c,p0,start+j+1,42+(j%2)*270,y-(j//2)*195,250,space=180,size=12)
  c.showPage()
 c.save();key_pdf(base/'4_Tutor_Only/W01_Diagnostic_Key.pdf','Diagnostic answers','Diagnostic',ps);key_pdf(base/'4_Tutor_Only/W01_Fact_Snapshot_Key.pdf','Fact snapshot answers','Facts',facts)
 sections=[('How to score','Use 15 minutes for computation, including the fact snapshot, and 20 for reasoning. Mark blank unfamiliar skills as not yet taught. Keep the fact snapshot separate from reasoning scores. Do not infer placement readiness from this sample.'),('Item-to-skill map',[f'{i+1}: {p["skill"]}' for i,p in enumerate(ps)]),('Status by skill','At least 80% of available points: secure. 50-79%: developing. Below 50%: priority. A skill sampled once is provisional. Recheck it with a Booster and a fresh explanation before deciding mastery.'),('Results to plan',['F-COMP or F-ADD priority: replace 5 minutes of week 1 practice with Booster 01. F-MULT or F-DIV priority: use Booster 02 with strips. Do not lengthen the packet.','D-OPS or N-DIV priority: use Booster 03 or 04. Weak facts: swap warm-up for five accurate facts from Booster 05.','Slow week 2 when fraction comparison or basic operations remain below 50% after feedback. Use its first 20 minutes to reteach, keeping the ratio launch. Finish uncompleted required cases before a new topic.','Give unknown ratio, percent, algebra and negative-number skills initial instruction. A low diagnostic score on untaught content is not a failure.','Use two different pieces of evidence, at least one week apart, before checking mastered on the tracker.'])]
 document(base/'4_Tutor_Only/W01_Diagnostic_Scoring_Map.pdf','Diagnostic: results to plan',sections,11)
 return ps

def checks(weeks):
 for wk,label,n,mins in [(3,'Mini_Check_A',8,15),(9,'Grade_6_Cumulative_Check',24,30),(10,'Final_Mixed_Review',10,15)]:
  if wk==3:ps=weeks[0]['bank'][:2]+weeks[1]['bank'][:2]+weeks[2]['bank'][:2]+weeks[2]['bank'][12:14]
  elif wk==9:
   selections={2:[0,12],3:[0,12,17],4:[0,12,15],5:[0,12,14],6:[0,12,20],7:[3,6,16],8:[0,12,18],9:[0,3,15,18]}
   ps=[weeks[k-1]['bank'][j] for k,indices in selections.items() for j in indices]
  else:ps=[choose(q['bank'],1,200+q['week'])[0] for q in weeks]
  verify(ps,label);base=ROOT/'02_Weeks'/f'Week_{wk:02d}';check_pdf(base/'1_Weekend_Handouts'/f'W{wk:02d}_{label}.pdf',label.replace('_',' '),label,ps,wk,mins);key_pdf(base/'4_Tutor_Only'/f'W{wk:02d}_{label}_Key.pdf',label.replace('_',' ')+' key',label,ps)
  document(base/'4_Tutor_Only'/f'W{wk:02d}_{label}_Scoring.pdf','Check: skill scoring grid',[('Skill by item',[f'{i+1}. {p["skill"]}: ______ / 1' for i,p in enumerate(ps)]),('Interpretation','Score one point for a correct answer and required supporting reasoning. Report each skill separately. Secure: at least 80%; developing: 50-79%; priority: below 50%. One-item skill scores are provisional. Use the matching Booster, then a fresh item one week later. This is a tutoring check, not a district placement test.')],11)

def boosters(weeks):
 sets=booster_sets()
 # Use varied lesson cases as well as short computation. Review, not new instruction.
 allbank=[p for w in weeks for p in w['bank']]
 selectors={'01_Fractions':lambda p:any(t in p['skill'].upper() for t in ['COMP','ADD','ORDER']) and 'F' in p['skill'].upper(),'02_Fraction_Operations':lambda p:'F-' in p['skill'] and any(t in p['skill'] for t in ['MULT','DIV']),'03_Decimals':lambda p:p['skill'].startswith('D-'),'04_Multi_Digit':lambda p:'DIV' in p['skill'] and 'F-' not in p['skill'],'06_Ratios':lambda p:p['skill'].startswith('R-'),'07_Percent':lambda p:p['skill'] in ['R-PERCENT','P-PART','P-WHOLE','P-PERCENT','P-CHANGE'],'08_Negatives':lambda p:any(t in p['skill'] for t in ['NEG','SIGN','ABS']),'09_Equations':lambda p:p['skill'].startswith('E-'),'10_Area_Volume':lambda p:any(t in p['skill'] for t in ['AREA','VOL','SURF'])}
 for k,fn in selectors.items():
  matching=[p for p in allbank if fn(p)];sets[k]=(choose(matching,10,99)+sets[k])[:20]
 sets['11_Puzzles']=[w['teaser'] for w in weeks]+sets['11_Puzzles'][:10]
 sets['12_Statistics']=weeks[8]['bank'][:10]+weeks[8]['bank'][12:22]
 sets['13_Scale_and_Circles']=weeks[9]['bank'][:8]+weeks[9]['bank'][12:24]
 for name,ps in sets.items():
  verify(ps,name);path=ROOT/'03_Booster_Library'/(name+'.pdf');c=newpdf(path,name.replace('_',' '))
  for start in [0,10]:
   y=header(c,name.replace('_',' '),name,1+start//10,True,'Booster')
   for j,p0 in enumerate(ps[start:start+10]):
    pp=p0.copy();pp.pop('diagram',None);problem(c,pp,start+j+1,42+j%2*270,y-j//2*122,250,space=110,size=12,answerline=False)
   c.showPage()
  c.save();key_pdf(ROOT/'03_Booster_Library/Tutor_Only'/(name+'_Key.pdf'),name.replace('_',' ')+' key',name,ps)
 document(ROOT/'03_Booster_Library/Tutor_Only/Booster_Map.pdf','Choosing a Booster',[('Use five items at a time','A Booster is a bank, not a 20-item timed assignment. Select five items that target the observed error. Ask for one drawing or explanation. Replace practice time instead of adding workload.'),('Skill mapping',['01 Fractions: fraction comparison, ordering, equivalence, addition and subtraction.','02 Fraction operations: multiplication, division, scaling.','03 Decimals: place value and decimal operations. 04 Multi-digit: multiplication and long division. 05 Facts: multiplication and division fact recall.','06 Ratios: equivalent ratios, tables, double number lines, unit rates. 07 Percent: part, whole, percent and later percent change.','08 Negatives: order, opposites and absolute value. 09 Equations: expressions, equivalence, solving equations.','10 Area and volume: area, surface area and volume. 11 Puzzles: explain a strategy and check that every condition holds.','12 Statistics: center, displays and variability. 13 Scale and circles: proportional relationships, scale factors and circle measures. Revisit the matching guide example first.'])],11)
def printables():
 folder=ROOT/'04_Printables'
 c=newpdf(folder/'Fraction_Strips.pdf','Fraction strips');header(c,'Fraction strips: equal wholes','Strips',1)
 for n in range(2,13):
  yy=690-(n-2)*55
  for k in range(n):c.rect(54+k*504/n,yy,504/n,30);text(c,'{1/'+str(n)+'}',54+k*504/n+504/n/2-8,yy+15,40,10)
 c.save()
 c=newpdf(folder/'Number_Lines.pdf','Number lines')
 for page,(lo,hi,title) in enumerate([(0,1,'0 to 1'),(0,2,'0 to 2'),(-10,10,'−10 to 10'),(0,1,'Blank number lines')],1):
  header(c,title,'Number lines',page)
  for j in range(4):
   yy=650-j*150;c.line(55,yy,557,yy)
   for i in range(21):
    xx=55+i*502/20;c.line(xx,yy-5,xx,yy+5)
    if page!=4 and (i%5==0 or page==3 and i%2==0):text(c,str(round(lo+(hi-lo)*i/20,2)),xx-10,yy-22,50,10)
  c.showPage()
 c.save()
 for name,step in [('Half_Inch_Grid',36),('One_Centimeter_Grid',72/2.54)]:
  c=newpdf(folder/(name+'.pdf'),name);header(c,name.replace('_',' '),name,1);c.setLineWidth(.35)
  for i in range(int(504/step)+1):c.line(54+i*step,72,54+i*step,72+int(612/step)*step)
  for i in range(int(612/step)+1):c.line(54,72+i*step,54+int(504/step)*step,72+i*step)
  c.save()
 c=newpdf(folder/'Coordinate_Planes.pdf','Coordinate planes');header(c,'Coordinate planes','Coordinates',1)
 for j in range(2):line_model(c,{'kind':'coordinate','limit':5},100,100+j*295,400,280)
 c.save()
 for name,kind in [('Tape_Diagram_Template','tape'),('Double_Number_Line_Template','doubleline')]:
  c=newpdf(folder/(name+'.pdf'),name);header(c,name.replace('_',' '),name,1)
  for j in range(3):line_model(c,{'kind':kind,'parts':5,'ticks':5},65,120+j*185,480,125)
  c.save()
 c=newpdf(folder/'Ratio_Table_Template.pdf','Ratio table');header(c,'Ratio tables','Ratio table',1)
 for j in range(2):
  yy=420-j*300
  for row in range(7):
   for col in range(2):c.rect(110+col*195,yy+row*32,195,32)
  text(c,'Quantity A: __________',120,yy+205,180,11);text(c,'Quantity B: __________',315,yy+205,180,11)
 c.save()
 # True nets with consistent shared edges. Fold lines dotted, cut outline solid.
 c=newpdf(folder/'Cut_Out_Nets.pdf','Cut-out nets');header(c,'Rectangular prism net','Nets',1);text(c,'Cut the outside boundary. Fold the internal edges. Tape the faces.',42,710,528,12)
 u=38;x=78;y=330
 faces=[(0,0,2,4),(2,0,3,4),(5,0,2,4),(7,0,3,4),(2,4,3,2),(2,-2,3,2)]
 for a,b,w,h in faces:c.rect(x+a*u,y+b*u,w*u,h*u)
 text(c,'Edges are 2, 3 and 4 units. Shared edges have matching lengths.',42,190,528,12);c.showPage()
 header(c,'Triangular prism net','Nets',2);u=35;x=90;y=330
 for a,w in [(0,3),(3,4),(7,5)]:c.rect(x+a*u,y,w*u,4*u)
 for above in [True,False]:
  yy=y+4*u if above else y;sgn=1 if above else -1;p0=c.beginPath();p0.moveTo(x,yy);p0.lineTo(x+3*u,yy);p0.lineTo(x,yy+sgn*4*u);p0.close();c.drawPath(p0)
 text(c,'Triangles: side lengths 3, 4, 5. Prism length: 4 units.',42,150,528,12);c.showPage()
 header(c,'Square pyramid net','Nets',3);u=42;x=220;y=350;a=4*u;hh=3*u;c.rect(x,y,a,a)
 triangles=[[(x,y),(x+a,y),(x+a/2,y-hh)],[(x,y+a),(x+a,y+a),(x+a/2,y+a+hh)],[(x,y),(x,y+a),(x-hh,y+a/2)],[(x+a,y),(x+a,y+a),(x+a+hh,y+a/2)]]
 for pts in triangles:
  pp=c.beginPath();pp.moveTo(*pts[0]);pp.lineTo(*pts[1]);pp.lineTo(*pts[2]);pp.close();c.drawPath(pp)
 text(c,'Square side: 4 units. Each triangular face has height 3 units.',42,150,528,12);c.save()

def start_here(weeks):
 folder=ROOT/'00_Start_Here'
 dates=[]
 for i,w in enumerate(weeks):
  sat=date(2026,11,7)+timedelta(weeks=i);sun=sat+timedelta(days=1);mon=sat+timedelta(days=2);fri=sat+timedelta(days=6)
  dates.append(f'Week {i+1}: {sat.strftime("%b %d")} / {sun.strftime("%b %d")}; packets {mon.strftime("%b %d")} to {fri.strftime("%b %d")}. {w["title"]}.')
 document(folder/'Master_Calendar.pdf','Master calendar',[('November 2026 to January 2027',dates),('Holiday options','Thanksgiving Nov 26: Thursday packet optional. Christmas Dec 25 and New Year Jan 1: Friday checks may move to Thursday. Keep weekends 4, 8 and 9 at 60 minutes or less per sitting. Week 9 Sunday has a separate 30-minute check. Week 10 packets Jan 11-15 are cumulative review.')],11)
 document(folder/'Parent_Guide.pdf','A parent\'s guide',[('Keep the work calm','Set out a pencil, paper and the day\'s packet. Offer a quiet 15-20 minutes. On holiday weeks use 15 minutes, then stop. Keep answer keys out of sight until the child has tried.'),('Use “tell me why”','Ask: “How did you decide?” Then ask him to show a picture, an estimate or a check. Wait before offering help. If he can explain a different correct method, accept it.'),('Use the key after an attempt','Check the answer and the reasoning. Ask him to locate the first step that needs changing. Have him correct one item, then try a fresh similar item. Avoid reading the procedure aloud before he thinks.'),('Know when to slow down','Repeated guessing, tears, fatigue or three errors on one skill mean the work needs adjusting. Replace five minutes of practice with a matching Booster. Tell the sibling tutor what you noticed.'),('Praise a specific action','Say “Your drawing shows equal parts,” or “You checked the units.” Praise the decision to try another method. Avoid ranking speed or comparing him with other children.'),('Keep a small record','Record one useful observation and a skill ID. The tracker records learning over time. This program does not predict or guarantee a school placement decision.')],12)
 decisions=[('Purpose and limits','This is a tutoring sequence based on the supplied build brief. It is not a district placement test, an IM course replacement or a guarantee of acceleration. District policy statements in the source were not independently reverified and are not repeated as current facts.'),('Timing decisions','Keep all 20 sessions and all ten weeks. S18 uses a 40-minute lesson and a separate 30-minute check the same day. S1 follows its special diagnostic schedule. S6 integrates the 15-minute check into review time. Holiday packets have a 15-minute stop rule; unfinished required practice resumes in the next practice window.'),('Writing space and required cases','Weekend sheets hold launch P1 and explore P2-P3, with an exit on its own page. The remaining numbered cases are required slide tasks answered in a notebook. Daily packets use two columns for short calculations and larger spaces for reasoning. Optional scratch paper preserves the two-page limit.'),('Daily practice and keys','Warm-ups are short mental tasks. Standard practice uses eight items to protect the 15-20 minute window; capstone practice uses ten. Parts B contain 8-10 items, with rounding of spiral percentages. Early weeks substitute Grade 5 foundations for unavailable history. Week 10 samples all weeks. Keys are grouped into compact sections, plus separate keys for each artifact, rather than wasting a page per short answer. Short equivalent-form answers are accepted.'),('Notation and assessment','Fractions use stacked type. Exact fraction or decimal calculations check generated answers. Qualitative explanations also require tutor judgment. For quartiles, use median of each half and exclude an odd set\'s central value. Mastery requires a fresh check at least one week later.'),('Print and slides','Worksheets use embedded Times New Roman, the available serif fallback. Slides use the brief\'s quiet teal and brick style. Slide dates appear only on the map; files sort by week and day. The single local PowerPoint replaces the unavailable live presentation connection.'),('Coverage left for later',[f'Week {w["week"]}: '+w['omissions'] if isinstance(w['omissions'],str) else f'Week {w["week"]}: '+ '; '.join(w['omissions']) for w in weeks])]
 document(folder/'Design_Decisions.pdf','Design decisions',decisions,11.5)
 document(folder/'README_Tutor_Guide.pdf','Start here: tutor guide',[('Before Saturday','Open the single PowerPoint in 01_Slides. Print the diagnostic, Saturday session sheet and run sheet from Week_01. Keep 4_Tutor_Only private. Gather pencils, blank paper and fraction strips. Read the run sheet and the notes on the first slides.'),('During a session','Let him attempt the launch before demonstrating. Ask for a picture or object model. Compare methods during Discuss. Use the numbered slides for required cases P4 onward, written in a notebook. Collect the fresh exit ticket separately.'),('After the exit','Got it: an accurate result with a matching reason or model. Almost there: sound setup with a small error. Needs re-teaching: the target misconception remains. Use the session-specific criteria in the run sheet. Record the skill, the observation and the next check.'),('Weekdays','Give the matching day packet. Monday and Tuesday reinforce the weekend. Wednesday mixes topics and adds a puzzle. Thursday emphasizes reasoning. Friday is a check. Stop at 20 minutes, or 15 on holiday weeks. Resume unfinished required practice before adding extra work. Optional Stretch never blocks progress.'),('Using keys and Boosters','Use the separate key with the matching file ID. The consolidated weekly key is an additional reference. If three misses share a skill, consult Booster_Map and assign five matching problems instead of extra workload. For 10-item checks: 9-10 strong, 7-8 on track, 5-6 repeat with a Booster, 0-4 spend 20 minutes of the next session reteaching.'),('If he is ahead or behind','Ahead: request a second method or a changed example, then use the puzzle. Behind: keep the model, reduce repetition and defer optional previews. Preserve every required case, finishing it in the next practice window. Do not race through the calendar to protect a label.'),('Tracking','Mark introduced, first check, one week later, four weeks later and mastered. A correct answer once is insufficient evidence. Use a fresh item and an explanation. Late-program four-week checks naturally fall after the ten-week calendar.'),('Calendar',dates),('Holidays and final review','Thanksgiving, Christmas and New Year packets are optional on the holiday itself. Move a Friday check to Thursday when useful. Week 9 Sunday check is a separate sitting. January 11-15 is cumulative review. A later placement date can justify further review, but no second ten-week program is included.')],12)
 skills=sorted(set(p['skill'] for w in weeks for p in w['bank']+sum([s['problems']+[s['exit']] for s in w['sessions']],[])))
 c=newpdf(folder/'Skills_Tracker.pdf','Skills tracker')
 for start in range(0,len(skills),23):
  y=header(c,'Skills tracker','Tracker',start//23+1);text(c,'Write a date and brief evidence. Use fresh items for follow-up checks.',42,y,528,11);y-=45
  cols=[42,152,233,314,395,482,570];heads=['Skill ID','Introduced','First check','1 week later','4 weeks later','Mastered']
  for i,h in enumerate(heads):text(c,h,cols[i]+3,y,cols[i+1]-cols[i]-4,9,'OldB')
  y-=18
  for skill in skills[start:start+23]:
   for i in range(6):c.rect(cols[i],y-23,cols[i+1]-cols[i],25)
   text(c,skill,cols[0]+3,y-14,105,9);y-=25
  c.showPage()
 c.save()
 sections=[]
 for w in weeks:
  for s in w['sessions']:
   sections.append((f'S{s["id"]:02d}: {s["title"]}',[s['goal'],'Standards: '+', '.join(s['standards']),agenda(s),'Required cases: '+'; '.join(f'P{i+1} '+p['case'] for i,p in enumerate(s['problems'])),'Exit: '+s['exit']['text']+' Answer: '+s['exit']['answer'],'Misconception: '+s['error']['why'],'Model: '+s['model']['kind']+'. Slides: title, goals, retrieval, launch, explore cases, model, example, your turn, discuss/error, synthesis, exit, preview, hidden tutor.','Packets: Mon Saturday practice; Tue Sunday practice; Wed spiral+puzzle; Thu word reasoning; Fri mixed check. Week 10 all cumulative.']))
 document(folder/'Master_Blueprint.pdf','Master blueprint',sections,10.5)

def loadweeks():
 weeks=[]
 for file in ['work/weeks_1_5.json','work/weeks_6_10.json']:
  obj=json.load(open(file));weeks+=obj['weeks'] if isinstance(obj,dict) else obj
 return sorted(weeks,key=lambda w:w['week'])
def audit(weeks):
 assert len(weeks)==10
 for w in weeks:
  assert len(w['sessions'])==2 and len(w['bank'])>=24
  verify(w['bank']+[w['teaser']],f'W{w["week"]} bank')
  for s in w['sessions']:
   assert len(s['problems'])>=5 and all(p.get('case') for p in s['problems'])
   verify(s['problems']+[s['exit']],f'S{s["id"]} cases')
   for key in ['error','example','fade']:
    if s[key].get('check'):verify([dict(s[key],text=s[key].get('text',''),skill='model')],f'S{s["id"]} {key}')
   assert s['exit']['text'] not in [p['text'] for p in s['problems']]
 json.dump({'passed':True,'sessions':20,'weeks':10,'math_checks':len(VERIFY)},open('work/blueprint_audit.json','w'),indent=2)
if __name__=='__main__':
 import sys
 weeks=loadweeks();audit(weeks)
 if '--audit' in sys.argv:print('Blueprint and math audit passed',len(VERIFY));sys.exit()
 targets=[int(z) for z in sys.argv[1:] if z.isdigit()] or list(range(1,11))
 for w in weeks:
  if w['week'] in targets:make_week(w,weeks);print('Built week',w['week'])
 if '--all' in sys.argv:
  build_diagnostic();checks(weeks);boosters(weeks);printables();start_here(weeks)
  from pypdf import PdfWriter
  for q in weeks:
   tutor=ROOT/'02_Weeks'/f'Week_{q["week"]:02d}'/'4_Tutor_Only';writer=PdfWriter()
   for kp in sorted(tutor.glob('*_Key.pdf')):writer.append(str(kp))
   writer.write(str(tutor/f'W{q["week"]:02d}_All_Answers.pdf'))
 json.dump(VERIFY,open('work/math_verification.json','w'),indent=2)
 json.dump(OVERFLOWS,open('work/pdf_overflows.json','w'),indent=2)
 print('Overflows',OVERFLOWS)
