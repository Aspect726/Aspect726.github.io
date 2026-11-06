from pathlib import Path
import json,zipfile,re,hashlib
from lxml import etree as ET
import pymupdf as fitz
root=Path('outputs/DoubleAdvanced_Expanded');files=sorted(f for f in root.rglob('*') if f.is_file())
assert len(files)==83,[(str(f),f.stat().st_size) for f in files]
assert len(list(root.rglob('*.pdf')))==82 and len(list(root.rglob('*.pptx')))==1
pdfs=[];bounds=[]
for f in root.rglob('*.pdf'):
 d=fitz.open(f);alltext=''
 for n,p in enumerate(d):
  alltext+=p.get_text()
  for b in p.get_text('dict')['blocks']:
   for l in b.get('lines',[]):
    for s in l['spans']:
     x0,y0,x1,y1=s['bbox']
     if x0<-.5 or y0<-.5 or x1>p.rect.width+.5 or y1>p.rect.height+.5:bounds.append((str(f),n+1,s['text']))
 assert 'On a 10-item check' not in alltext,f
 assert not re.findall(r'(?<!\w)\d(?:\.\d+)?E[+-]\d+',alltext),f
 pdfs.append({'file':f.name,'pages':len(d)})
assert not bounds,bounds
assert next(p['pages'] for p in pdfs if p['file']=='Student_Day_by_Day.pdf')==112
packets=sorted((root/'Daily_Packets').glob('*.pdf'))
assert len(packets)==70
packet_lengths=[len(fitz.open(f)) for f in packets]
assert packet_lengths.count(3)==20 and packet_lengths.count(1)==50,packet_lengths
ppt=root/'DoubleAdvanced_Weekend_Slides.pptx';meta=json.load(open('work/expanded_deck_meta.json'));meta=meta.get('slides',[]) if isinstance(meta,dict) else meta
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(ppt) as z:
 assert z.testzip() is None
 slides=sorted((n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml',n)),key=lambda n:int(re.search(r'(\d+)\.xml',n)[1]))
 notes=[n for n in z.namelist() if re.fullmatch(r'ppt/notesSlides/notesSlide\d+\.xml',n)]
 assert len(slides)==len(meta)==len(notes),(len(slides),len(meta),len(notes))
 hidden=sum(ET.fromstring(z.read(n)).get('show')=='0' for n in slides);assert hidden==20,hidden
 texts=[' '.join(ET.fromstring(z.read(n)).xpath('//a:t/text()',namespaces=ns)) for n in slides]
 bad=[(i+1,t) for i,t in enumerate(texts) if re.search(r'\b(?:\dE\+1|pending|TODO)\b|\{[^{}]+/[^{}]+\}',t)]
 assert not bad,bad
 assert len([n for n in z.namelist() if n.startswith('ppt/media/')])>=3
m=json.load(open('work/expanded_student_manifest.json'));assert sum(d['daily_question_count'] for d in m['days'])==1450
book=fitz.open(root/'Student_Day_by_Day.pdf')
for day in m['days']:
 packet=fitz.open(day['packet_file'])
 assert len(packet)==(3 if day['weekday'] in ('Sat','Sun') else 1)
 for i,p in enumerate(packet):
  global_page=day['workbook_page_start']+i
  assert p.get_text()==book[global_page-1].get_text(),(day['day'],i+1)
assert sum(len(s['items']) for w in json.load(open('work/expanded_answers.json'))['weeks'] for s in w['sections'])==1547
out=root.with_suffix('.zip')
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in files:z.write(f,f.relative_to(root.parent))
with zipfile.ZipFile(out) as z:assert z.testzip() is None and len(z.namelist())==83
report={'package':str(out.resolve()),'files':len(files),'slides':len(slides),'notes':len(notes),'hidden_teacher_slides':hidden,'pdfs':pdfs,'bounds_issues':bounds,'zip_bytes':out.stat().st_size,'pptx_sha256':hashlib.sha256(ppt.read_bytes()).hexdigest()}
Path('work/expanded_final_package_audit.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
