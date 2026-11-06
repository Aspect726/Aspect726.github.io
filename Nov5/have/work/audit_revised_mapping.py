"""Independent cross-file audit; reads generated outputs without mutating them."""
import json,re
from pathlib import Path
from collections import Counter
from pypdf import PdfReader
root=Path('work')
manifest=json.loads((root/'revised_student_manifest.json').read_text())
answers=json.loads((root/'revised_answers.json').read_text())
plan=json.loads((root/'revised_booster_plan.json').read_text())
issues=[];checks=[]
def check(ok,desc):
 checks.append(desc)
 if not ok:issues.append(desc)
days=manifest['days'];book=PdfReader(manifest['workbook']);total=len(book.pages)
check(len(days)==70,'Exactly 70 day sections')
check(total==manifest['total_pages'],'Workbook page count matches manifest')
expected_day=1;page=3
student={};session_items={}
for d in days:
 check(d['day']==expected_day,f'Day sequence {expected_day}')
 check(d['workbook_page_start']==page,f'Day {d["day"]} starts at the next page')
 check(d['workbook_page_end']-d['workbook_page_start']+1==d['pages'],f'Day {d["day"]} extent matches page count')
 check(d['week']==(d['day']-1)//7+1,f'Day {d["day"]} has correct week')
 check(d['weekday']==['Sat','Sun','Mon','Tue','Wed','Thu','Fri'][(d['day']-1)%7],f'Day {d["day"]} has correct weekday')
 page=d['workbook_page_end']+1;expected_day+=1
 for sec in d['sections']:
  lo,hi=sec['student_pages']
  check(d['workbook_page_start']<=lo<=hi<=d['workbook_page_end'],f'Day {d["day"]} section {sec["id"]} is inside day bounds')
  ids=[]
  for item in sec['items']:
   key=(d['week'],sec['id'],str(item['id']))
   check(key not in student,f'Unique answer address {key}')
   student[key]=item;ids.append(str(item['id']))
   check(lo<=item['student_page']<=hi,f'Item {key} page lies within section')
  check(len(ids)==len(set(ids)),f'Unique item labels in {sec["id"]}')
  if sec['id'].startswith('S') and sec['id'][1:].isdigit():session_items[int(sec['id'][1:])]=sec
 # Reinforcement should be embedded once and not duplicate a kept practice item.
 if d['weekday'] in ['Mon','Tue','Thu']:
  target=next(p for p in plan['placements'] if p['week']==d['week'] and p['weekday']==d['weekday'])
  pool=[p for sec in d['sections'] for p in sec['items']]
  for selected in target['problems']:
   check(sum(p['text']==selected['text'] for p in pool)==1,f'Day {d["day"]} has exactly one selected Booster: {selected["text"]}')
  check(sum(bool(p.get('booster')) for p in pool)==4,f'Day {d["day"]} has exactly four marked embedded Booster items')
 if d['weekday']=='Wed':
  q=next(p for p in plan['placements'] if p['week']==d['week'] and p['weekday']=='Wed')['problems'][0]
  check(sum(p['text']==q['text'] for sec in d['sections'] for p in sec['items'])==1,f'Day {d["day"]} has its weekly puzzle once')
 if d['weekday']=='Fri':
  check(sum(len(sec['items']) for sec in d['sections'])==10,f'Day {d["day"]} Friday has ten items')
check(page-1==total,'Day extents cover the entire workbook after front matter')
key_items={}
for week in answers['weeks']:
 for sec in week['sections']:
  for item in sec['items']:key_items[(week['week'],sec['id'],str(item['id']))]=item
check(set(student)==set(key_items),'Every student answer address has exactly one answer record')
for key,item in student.items():
 check(not re.search(r'\b\d(?:\.\d+)?E[+-]\d+',str(item.get('answer',''))),f'Answer {key} uses ordinary decimal notation')
 twin=key_items.get(key,{})
 check(item.get('text')==twin.get('text') and item.get('answer')==twin.get('answer') and item.get('student_page')==twin.get('student_page'),f'Answer text and page match {key}')
meta_file=root/'revised_deck_meta.json'
if meta_file.exists():
 meta=json.loads(meta_file.read_text())
 for slide in meta:
  if slide.get('session') not in session_items:continue
  nums=slide.get('problem_numbers',[])
  available={str(p['id']):p for p in session_items[slide['session']]['items']}
  for n in nums:check(n in available,f'Slide {slide["number"]} problem {n} exists on its day sheet')
  ref=slide.get('follow_along','')
  if nums:check('pending' not in ref.lower(),f'Slide {slide["number"]} has a final workbook reference')
# Each student answer must appear once in the weekly review sections of the deck.
if meta_file.exists():
 review_counts=Counter()
 for slide in meta:
  if not slide.get('review_section') or not slide.get('answer_ids'):continue
  expected_pages=[]
  for address in slide['answer_ids']:
   secid,itemid=address.rsplit(':',1);key=(slide['week'],secid,itemid)
   review_counts[key]+=1
   check(key in student,f'Review slide {slide["number"]} references existing answer {key}')
   if key in student:
    item=student[key];expected_pages.append(item['student_page'])
    check(f'{itemid}. {item["answer"]}' in slide.get('notes',{}).get('expect',''),f'Review slide {slide["number"]} exact answer matches {key}')
  ref=slide.get('follow_along','')
  page_match=re.search(r'Workbook p(?:p)?\. ([0-9, \-–]+)',ref)
  listed=set()
  if page_match:
   for token in page_match.group(1).strip().split(','):
    token=token.strip().replace('–','-')
    if '-' in token:
     a,b=map(int,token.split('-'));listed.update(range(a,b+1))
    elif token:listed.add(int(token))
  check(set(expected_pages)<=listed,f'Review slide {slide["number"]} lists all correct workbook pages')
 check(set(review_counts)==set(student),'Weekly deck answer sections cover every student answer address')
 check(all(review_counts[k]==1 for k in student),'Every student answer occurs once in weekly deck answer sections')

extras_file=root/'revised_session_extras.json'
if extras_file.exists():
 for extra in json.loads(extras_file.read_text())['sessions']:
  ss=extra['session'];available={str(p['id']) for p in session_items.get(ss,{}).get('items',[])}
  for group in ['recall','mixed']:
   for p in extra[group]:check(str(p['id']) in available,f'S{ss} {group} item {p["id"]} has paper follow-along')
  check('S' in available,f'S{ss} summary has a paper writing space')
result={'checks':len(checks),'issues':issues,'days':len(days),'student_items':len(student),'answer_items':len(key_items),'pages':total}
(root/'revised_mapping_audit.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
