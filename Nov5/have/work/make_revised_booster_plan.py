import sys,json,copy
sys.path.insert(0,'work')
from supplements import booster_sets,p
from build_program import loadweeks
from fractions import Fraction as F
from decimal import Decimal as D
import statistics,math
weeks=loadweeks();old=json.load(open('work/booster_catalog_for_qa.json'));basic=booster_sets();catalog=copy.deepcopy(old)
# Keep familiar item IDs except where the original curation omitted needed structures.
bank=lambda w:weeks[w-1]['bank']
ndiv=[q for w in weeks for q in w['bank'] if q['skill']=='N-DIV']
def exact(text, pool):return next(copy.deepcopy(q) for q in pool if q['text']==text)
combined=ndiv+basic['04_Multi_Digit']
front=['Find 312 ÷ 24.','117 × 12','Find 1,344 ÷ 32. Verify by multiplication.','143 × 14','Find 336 ÷ 24.','169 × 16','52 ÷ 4','195 × 18','252 ÷ 12','90 ÷ 6']
items=[exact(t,combined) for t in front]
for q in combined:
 if q['text'] not in {z['text'] for z in items}:items.append(copy.deepcopy(q))
catalog['04_Multi_Digit']=items[:20]
pairs=[(6,8),(7,9),(8,11),(12,7),(9,6),(4,12),(3,9),(11,6),(8,7),(12,9)]
facts=[]
for a,b in pairs:
 facts.append(p(f'{a} × {b}',a*b,'N-FACT',f'{a}*{b}=={a*b}'))
 facts.append(p(f'{a*b} ÷ {a}',b,'N-FACT',f'{a*b}//{a}=={b}'))
catalog['05_Facts']=facts
catalog['06_Ratios']=copy.deepcopy(bank(2)[:8]+bank(2)[12:20]+bank(3)[:4])
catalog['07_Percent']=copy.deepcopy(bank(3)[12:24]+basic['07_Percent'][:8])
catalog['08_Negatives']=copy.deepcopy(bank(8)[:20])
catalog['09_Equations']=copy.deepcopy(bank(6)[:10]+bank(6)[14:24])
geo_ids=[0,2,3,4,6,7,9,10,12,13,16,17,19,20,22,23]
vols=[q for q in bank(4) if q['skill']=='G-VOL']
catalog['10_Area_Volume']=copy.deepcopy([bank(7)[i] for i in geo_ids]+vols[:2]+[basic['10_Area_Volume'][1],basic['10_Area_Volume'][3]])
catalog['13_Scale_and_Circles']=copy.deepcopy(bank(10)[:12]+[bank(10)[i] for i in [12,15,18,21,13,16,19,22]])
labels={'01_Fractions':'Fractions: compare and combine','02_Fraction_Operations':'Fraction operations','03_Decimals':'Decimal practice','04_Multi_Digit':'Multiplication and long division','05_Facts':'Multiplication and division facts','06_Ratios':'Ratios and rates','07_Percent':'Percent practice','08_Negatives':'Number lines and coordinates','09_Equations':'Expressions and equations','10_Area_Volume':'Area, surface area and volume','11_Puzzles':'Weekly puzzle','12_Statistics':'Data and statistics','13_Scale_and_Circles':'Scale, proportion and circles'}
# Here indices are one-based for human review, converted below for the build.
rows=[
(1,'Mon','01_Fractions',[6,1,2,7]),(1,'Tue','02_Fraction_Operations',[5,16,3,6]),(1,'Thu','05_Facts',[1,2,3,4]),
(2,'Mon','06_Ratios',[1,2,3,4]),(2,'Tue','06_Ratios',[9,10,11,12]),(2,'Thu','01_Fractions',[5,8,11,17]),
(3,'Mon','06_Ratios',[17,18,19,20]),(3,'Tue','07_Percent',[1,2,6,7]),(3,'Thu','03_Decimals',[11,12,13,14]),
(4,'Mon','02_Fraction_Operations',[4,11,17,19]),(4,'Tue','02_Fraction_Operations',[1,7,13,18]),(4,'Thu','07_Percent',[3,9,10,11]),
(5,'Mon','03_Decimals',[3,4,5,7]),(5,'Tue','04_Multi_Digit',[1,2,3,7]),(5,'Thu','02_Fraction_Operations',[9,10,16,20]),
(6,'Mon','09_Equations',[1,4,7,10]),(6,'Tue','09_Equations',[11,12,15,17]),(6,'Thu','03_Decimals',[1,8,9,10]),
(7,'Mon','10_Area_Volume',[2,3,5,7]),(7,'Tue','10_Area_Volume',[9,11,13,15]),(7,'Thu','09_Equations',[2,5,13,19]),
(8,'Mon','08_Negatives',[2,5,8,9]),(8,'Tue','08_Negatives',[13,16,19,20]),(8,'Thu','10_Area_Volume',[1,8,10,17]),
(9,'Mon','12_Statistics',[1,4,5,7]),(9,'Tue','12_Statistics',[11,14,17,20]),(9,'Thu','08_Negatives',[3,6,14,18]),
(10,'Mon','13_Scale_and_Circles',[3,4,9,11]),(10,'Tue','13_Scale_and_Circles',[13,14,15,16]),(10,'Thu','12_Statistics',[2,6,13,18])]
placements=[]
for week,weekday,setid,ids in rows:
 indices=[i-1 for i in ids]
 placements.append(dict(week=week,weekday=weekday,set_id=setid,label=labels[setid],indices=indices,problems=[copy.deepcopy(catalog[setid][i]) for i in indices],replace='Four Part B items',target_minutes=6 if setid in ['10_Area_Volume','12_Statistics','04_Multi_Digit'] else 5))
for week in range(1,11):
 placements.append(dict(week=week,weekday='Wed',set_id='11_Puzzles',label='Weekly puzzle',indices=[week-1],problems=[copy.deepcopy(catalog['11_Puzzles'][week-1])],replace='Part C Think',target_minutes=4))
placements.sort(key=lambda r:(r['week'],['Mon','Tue','Wed','Thu','Fri'].index(r['weekday'])))
notes=[
 'Each Mon/Tue/Thu block replaces four Part B items. It does not add four more items. Keep the other four practice items, the short warm-up, and the thinking item.',
 'Wednesday uses one weekly puzzle in place of the existing Think item. Do not assign four puzzles. Friday stays a clean ten-item check with no extra Booster block.',
 'All thirteen Booster sets appear in the sequence. The remaining library problems are alternatives for future re-teaching, not additional mandatory homework.',
 'After a difficult exit ticket, swap the next block for four items targeting the observed error. Record the actual replacement IDs and adjust its key.',
 'Week 1 avoids reciprocal/general fraction division. Those wait until Week 4. Week 2 avoids rate-per-hour problems. Those wait until Week 3. Inequalities first appear in Week 8.',
 'Week 7 surface area and Week 9 variability blocks are slower. Pair them with four short mixed items and use the stop rule. Never add a separate extra practice page.',
 'Week 10 is cumulative: the four selected bridge/circle items replace four capstone items; the remaining six items must cover distinct earlier units. Wednesday and Friday should cover the broadest mix.',
 'Print the source ID in tutor material, not a directive telling the child to find another file. All selected problems are embedded directly on the day page.'
]
checks=0
for setid,ps in catalog.items():
 assert len(ps)==20,(setid,len(ps))
 for item in ps:
  assert eval(item['check'],dict(F=F,D=D,math=math,statistics=statistics)),(setid,item)
  checks+=1
assert len(placements)==40
assert len({p['set_id'] for p in placements})==13
for a in placements:
 assert len(a['problems'])==(1 if a['weekday']=='Wed' else 4)
 for i,p0 in zip(a['indices'],a['problems']):assert p0==catalog[a['set_id']][i]
result={'catalog':catalog,'labels':labels,'placements':placements,'notes':notes,'validation':{'exact_math_checks':checks,'catalog_sets':13,'problems_per_set':20,'placements':40,'uses_all_sets':True,'indexing':'zero-based'}}
open('work/revised_booster_plan.json','w').write(json.dumps(result,indent=2,ensure_ascii=False))
print('Created revised_booster_plan.json:13sets,260checked problems,40placements,all13used.')
for a in placements:
 if a['weekday']!='Wed':print(a['week'],a['weekday'],a['set_id'],[i+1 for i in a['indices']])
