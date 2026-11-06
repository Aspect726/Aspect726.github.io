from pathlib import Path
from fractions import Fraction as F
from decimal import Decimal as D
import json,re,math,statistics,sys
from collections import Counter
from pypdf import PdfReader
m=json.load(open('work/expanded_student_manifest.json'));a=json.load(open('work/expanded_answers.json'));checks=0;issues=[]
def ck(ok,label):
 global checks
 checks+=1
 if not ok:issues.append(label)
days=m['days'];book=PdfReader(m['workbook']);ck(len(days)==70,'70days');ck(len(book.pages)==m['total_pages'],'bookpagecount')
student={};main_total=0;challenge_texts=[];math_count=0;page=3
for d in days:
 n=d['day'];ck(d['pages']==(3 if d['weekday'] in ['Sat','Sun'] else 1),f'exactpacketlength{n}');ck(n==len([x for x in days if x['day']<=n]),f'daysequence{n}')
 ck(d['workbook_page_start']==page,f'daystart{n}');page=d['workbook_page_end']+1
 primary=[s for s in d['sections'] if s.get('assigned')];ck(len(primary)==1,f'oneassignedsection{n}')
 ps=primary[0]['items'];expected=25 if d['weekday']=='Wed' else 20
 ck(len({re.sub(r'\s+',' ',p['text']).lower().strip() for p in ps})==len(ps),f'noidenticaldailyquestions{n}')
 ck(len(ps)==expected,f'questioncount{n}');main_total+=len(ps)
 ch=[p for p in ps if p.get('challenge')];ck(len(ch)==2,f'twochallenges{n}');ck([p['id'] for p in ch]==['C1','C2'],f'challengeIDs{n}')
 for p in ch:
  challenge_texts.append(p['text']);ck(len(p.get('worked',''))>=35,f'workedchallenge{n}:{p["id"]}')
 for s in d['sections']:
  lo,hi=s['student_pages'];ck(d['workbook_page_start']<=lo<=hi<=d['workbook_page_end'],f'sectionpages{n}:{s["id"]}')
  for p in s['items']:
   key=(d['week'],s['id'],str(p['id']));ck(key not in student,f'unique{key}');student[key]=p
   ck(lo<=p['student_page']<=hi,f'itempage{key}');ck(not re.search(r'\b\dE[+-]\d',p['answer']),f'ordinarydecimal{key}')
   if p.get('check'):
    try:ok=bool(eval(p['check'],{'F':F,'D':D,'math':math,'statistics':statistics}))
    except Exception as e:ok=False;issues.append(f'{key}exception{e}')
    ck(ok,f'math{key}');math_count+=1
ck(page-1==len(book.pages),'pagescoverbook');ck(main_total==1450,'1450assignedquestions');ck(len(challenge_texts)==len(set(challenge_texts))==140,'140distinctchallenges')
keys={(w['week'],s['id'],str(p['id'])):p for w in a['weeks'] for s in w['sections'] for p in s['items']}
ck(set(keys)==set(student),'answercoverage')
for k,p in student.items():ck(p['answer']==keys[k]['answer'] and p['student_page']==keys[k]['student_page'],f'answermatch{k}')
meta_path=Path('work/expanded_deck_meta.json')
include_deck=meta_path.exists() and '--book-only' not in sys.argv
if include_deck:
 meta=json.loads(meta_path.read_text());meta=meta.get('slides',[]) if isinstance(meta,dict) else meta
 counts=Counter();session={int(s['id'][1:]):s for w in a['weeks'] for s in w['sections'] if s['id'].startswith('S') and s['id'][1:].isdigit()}
 for sl in meta:
  if sl.get('review_section') and sl.get('answer_ids'):
   for address in sl['answer_ids']:
    sid,pid=address.rsplit(':',1);k=(sl['week'],sid,pid);counts[k]+=1;ck(k in student,f'reviewexisting{sl["number"]}:{k}')
    if k in student:
     ck(f'{pid}. {student[k]["answer"]}' in sl.get('notes',{}).get('expect',''),f'reviewexactanswer{sl["number"]}:{k}')
  elif sl.get('session') in session:
   ids={p['id'] for p in session[sl['session']]['items']}
   for p in sl.get('problem_numbers',[]):ck(p in ids,f'slideitem{sl["number"]}:{p}')
   if sl.get('problem_numbers'):ck('pending' not in sl.get('follow_along','').lower() and 'Workbook p' in sl.get('follow_along',''),f'slidefollowalong{sl["number"]}')
 ck(set(counts)==set(student),'allanswersinweeklyreviews');ck(all(counts[k]==1 for k in student),'eachreviewansweronce')
report={'checks':checks,'issues':issues,'pages':len(book.pages),'days':len(days),'assigned_questions':main_total,'challenges':len(challenge_texts),'all_answer_items':len(student),'math_checks':math_count,'slides':len(meta) if include_deck else None}
Path('work/expanded_audit.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));assert not issues
