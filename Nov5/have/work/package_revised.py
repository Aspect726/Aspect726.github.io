from pathlib import Path
import json,zipfile,re
from lxml import etree as ET
import fitz
root=Path('outputs/DoubleAdvanced_Revised')
files=sorted(x for x in root.rglob('*') if x.is_file())
assert len(files)==13,[(str(f),f.stat().st_size) for f in files]
assert len(list(root.rglob('*.pdf')))==12
assert len(list(root.rglob('*.pptx')))==1
assert len([f for f in root.iterdir() if f.is_dir()])==1
pdfs=[];bounds=[]
for f in root.rglob('*.pdf'):
 d=fitz.open(f)
 for n,p in enumerate(d):
  for b in p.get_text('dict')['blocks']:
   for l in b.get('lines',[]):
    for s in l['spans']:
     x0,y0,x1,y1=s['bbox']
     if x0<-.5 or y0<-.5 or x1>p.rect.width+.5 or y1>p.rect.height+.5:bounds.append((str(f),n+1,s['text']))
 pdfs.append({'file':f.name,'pages':len(d)})
assert not bounds,bounds
assert next(p['pages'] for p in pdfs if p['file']=='Student_Day_by_Day.pdf')==277
ppt=root/'DoubleAdvanced_Weekend_Slides.pptx'
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(ppt) as z:
 assert z.testzip() is None
 slides=sorted((n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml',n)),key=lambda n:int(re.search(r'(\d+)\.xml',n)[1]))
 notes=[n for n in z.namelist() if re.fullmatch(r'ppt/notesSlides/notesSlide\d+\.xml',n)]
 assert len(slides)==630,len(slides)
 assert len(notes)==630,len(notes)
 hidden=sum(ET.fromstring(z.read(n)).get('show')=='0' for n in slides)
 assert hidden==20,hidden
 texts=[' '.join(ET.fromstring(z.read(n)).xpath('//a:t/text()',namespaces=ns)) for n in slides]
 assert not [(i+1,t) for i,t in enumerate(texts) if re.search(r'\b(?:2E\+1|3E\+1|4E\+1|pending|TODO)\b',t)]
assert sum(len(s['items']) for w in json.load(open('work/revised_answers.json'))['weeks'] for s in w['sections'])==1092
out=root.with_suffix('.zip')
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in files:z.write(f,f.relative_to(root.parent))
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 assert len(z.namelist())==13
report={'package':str(out.resolve()),'files':len(files),'slides':len(slides),'notes':len(notes),'hidden_teacher_slides':hidden,'pdfs':pdfs,'bounds_issues':bounds,'zip_bytes':out.stat().st_size}
Path('work/revised_final_package_audit.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
