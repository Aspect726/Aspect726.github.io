from pathlib import Path
import csv,json,shutil,zipfile,hashlib
from pypdf import PdfReader
from lxml import etree
root=Path('outputs/DoubleAdvanced_Math_Program');src=root/'05_Curriculum_Data';src.mkdir(exist_ok=True)
for name in ['weeks_1_5.json','weeks_6_10.json','math_verification.json']:
 shutil.copyfile(Path('work')/name,src/name)
(src/'About_This_Folder.txt').write_text('These structured lesson records support future corrections and adaptation. Student materials are in 02_Weeks. This folder is optional for the tutor. The verification log records exact-arithmetic checks used during this build. Qualitative explanations still require human judgment.\n')
# Confirm final assembled keys really contain all separate key text.
for folder in sorted(root.glob('02_Weeks/Week_*/4_Tutor_Only')):
 master=next(folder.glob('*_All_Answers.pdf'))
 text='\n'.join(p.extract_text() or '' for p in PdfReader(master).pages)
 for f in folder.glob('*_Key.pdf'):
  for pg in PdfReader(f).pages:assert (pg.extract_text() or '') in text,(folder,f)
pptx=list(root.rglob('*.pptx'));assert len(pptx)==1
with zipfile.ZipFile(pptx[0]) as z:
 slides=[n for n in z.namelist() if __import__('re').match(r'ppt/slides/slide\d+\.xml$',n)]
 notes=[n for n in z.namelist() if __import__('re').match(r'ppt/notesSlides/notesSlide\d+\.xml$',n)]
 assert len(slides)==370 and len(notes)==370
 assert sum(etree.fromstring(z.read(n)).get('show')=='0' for n in slides)==20
 assert z.testzip() is None
assert len(list(root.glob('02_Weeks/*/2_Daily_Packets/*.pdf')))==50
assert len(list(root.glob('02_Weeks/*/4_Tutor_Only/*_Run_Sheet.pdf')))==20
assert len(list(root.glob('02_Weeks/*/1_Weekend_Handouts/*_Session.pdf')))==20
assert len(list(root.glob('02_Weeks/*/3_Study_Guide/*.pdf')))==10
rows=[]
for f in sorted(root.rglob('*')):
 if not f.is_file() or f.name=='Manifest.csv':continue
 count=len(PdfReader(f).pages) if f.suffix=='.pdf' else 370 if f.suffix=='.pptx' else 0
 rows.append([str(f.relative_to(root)),f.suffix[1:],count])
rows.append(['Manifest.csv','csv',0])
with open(root/'Manifest.csv','w',newline='') as f:
 wr=csv.writer(f);wr.writerow(['path','type','page_or_slide_count']);wr.writerows(rows)
archive=Path('outputs/DoubleAdvanced_Math_Program.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for f in sorted(root.rglob('*')):
  if f.is_file():z.write(f,str(f.relative_to(root.parent)))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 assert len(z.namelist())==len(rows)
summary={'files':len(rows),'pdfs':sum(r[1]=='pdf' for r in rows),'pdf_pages':sum(r[2] for r in rows if r[1]=='pdf'),'slides':370,'zip_bytes':archive.stat().st_size,'math_checks':len(json.load(open('work/math_verification.json'))),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}
json.dump(summary,open('work/package_audit.json','w'),indent=2);print(json.dumps(summary,indent=2))
