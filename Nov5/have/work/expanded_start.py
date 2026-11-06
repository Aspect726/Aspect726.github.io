from pathlib import Path
from datetime import date,timedelta
import json,re
from expanded_pdf_engine import newpdf,text
OUT=Path('outputs/DoubleAdvanced_Expanded');OUT.mkdir(exist_ok=True)
W=[]
for f in ['work/weeks_1_5.json','work/weeks_6_10.json']:
 o=json.load(open(f));W+=o['weeks'] if isinstance(o,dict) else o
c=newpdf(OUT/'Start_Here.pdf','Start here');TEAL='#1F5A63'
def title(t,subtitle=''):
 text(c,t,42,746,528,23,'OldB',TEAL)
 return text(c,subtitle,42,713,528,11) -20 if subtitle else 704

y=title('Start here','A compact packet, fuller practice, and room to explain the math.')
for h,b in [('Open these three things','Daily_Packets has one PDF for each day: three pages on Saturday and Sunday, one page on weekdays. The combined student book contains the same packets. Open the PowerPoint and the matching weekly teacher guide for weekend lessons.'),('The daily target','Most days have 20 questions; Wednesday has 25. Two of those questions are multi-step challenges, C1 and C2. Routine questions build fluency and understanding. The challenges ask the student to connect ideas, plan a method and explain the result.'),('Print less','Print one three-page packet on each weekend day and one page on each weekday. Use either the individual packet or those pages in the combined book. Write on the packet or separate paper. Worked examples and assessment alternatives are inside the weekend packets.'),('Allow enough time','Plan for 30-45 minutes on ordinary weekdays and 40-55 minutes on Wednesday. Two shorter sittings are fine. Weekend lessons are planned for about 80 minutes, with up to 10 extra minutes for discussion. On a busy weekend, split the lesson into two sittings.'),('During a lesson','Follow the topic and Day/page/item labels on the slide. Pause before each reveal. Let the student attempt the problem, explain a model, compare methods, and then work on the challenges. A summary and independent exit ticket close the lesson.'),('Check the thinking','Use the key after an attempt. Ask “How did you decide?” and “Where does your method first differ?” Accept a different correct method. If the same idea causes repeated errors, revisit its model and try a fresh example later.'),('The Friday check','Use the 18 routine questions independently, followed by the two challenges. Record routine accuracy separately from challenge reasoning. Each challenge needs a plan, correct mathematics and an explanation; a correct number alone is incomplete.'),('Review together','Each week has an answer-review section in the PowerPoint. Use it after the corresponding work is finished. The teacher guide includes all answers and fuller worked solutions for the challenge questions.')]:
 y=text(c,h,42,y,528,12.5,'OldB')-3;y=text(c,b,42,y,528,11)-14
text(c,'Start here | 1',42,24,528,9);c.showPage()
y=title('Calendar | Nov 2026-Jan 2027','Days run Saturday through Friday. Shift the dates together if you begin later.')
start=date(2026,11,7)
for w in W:
 wk=w['week'];sat=start+timedelta(weeks=wk-1);sun=sat+timedelta(days=1);mon=sat+timedelta(days=2);fri=sat+timedelta(days=6)
 y=text(c,f'Week {wk:02d} | Days {(wk-1)*7+1:03d}-{wk*7:03d}',42,y,528,12,'OldB',TEAL)-3
 y=text(c,w['title'],42,y,528,11.2)-2
 y=text(c,f'Lessons: {sat:%b %d} and {sun:%b %d} | Daily practice: {mon:%b %d} to {fri:%b %d}',42,y,528,10.5)-12
text(c,'Holiday weeks: split a longer day into two sittings or shift its date. Keep the sequence so each new lesson builds on the earlier work.',42,72,528,10.5)
text(c,'Start here | 2',42,24,528,9);c.showPage()
y=title('Skills tracker','Write a date or short note. Recheck with a fresh example at least one week later.')
skills=set()
for w in W:
 for p in w['bank']:skills.add(p['skill'])
 for s in w['sessions']:
  for p in s['problems']+[s['exit']]:skills.add(p['skill'])
skills=sorted(skills);n=(len(skills)+1)//2
for x,items in [(42,skills[:n]),(316,skills[n:])]:
 text(c,'Skill',x,y,70,10,'OldB');text(c,'First check',x+76,y,75,10,'OldB');text(c,'Later check / note',x+155,y,100,10,'OldB')
 yy=y-20
 for skill in items:
  text(c,skill,x,yy,75,9.5);c.setStrokeColorRGB(.75,.75,.75);c.setLineWidth(.35);c.line(x+77,yy-2,x+144,yy-2);c.line(x+156,yy-2,x+254,yy-2);yy-=17
 if yy<48:raise ValueError(('Tracker too long',len(skills),yy))
text(c,'Start here | 3',42,24,528,9);c.save()
print('Built Start_Here.pdf: 3 pages;',len(skills),'skills')
