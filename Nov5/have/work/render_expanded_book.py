from pathlib import Path
import pymupdf as fitz
from PIL import Image,ImageDraw
import json
meta=json.load(open('work/expanded_student_manifest.json'));d=fitz.open(meta['workbook']);out=Path('work/expanded_student_render');out.mkdir(exist_ok=True)
issues=[]
for i,p in enumerate(d):
 p.get_pixmap(matrix=fitz.Matrix(1.3,1.3)).save(str(out/f'page-{i+1:03d}.png'))
 for b in p.get_text('dict')['blocks']:
  for l in b.get('lines',[]):
   for s in l['spans']:
    a,b,c,e=s['bbox']
    if a<0 or b<0 or c>612.5 or e>792.5:issues.append({'page':i+1,'text':s['text'],'bounds':s['bbox']})
for start in range(0,len(d),12):
 sheet=Image.new('RGB',(4*306,3*416),'#ddd');dr=ImageDraw.Draw(sheet)
 for j,i in enumerate(range(start,min(start+12,len(d)))):
  im=Image.open(out/f'page-{i+1:03d}.png');im.thumbnail((294,382));x=(j%4)*306+6;y=(j//4)*416+22;sheet.paste(im,(x,y));dr.text((x,y-17),f'Page {i+1}',fill='#111')
 sheet.save(out/f'contact-{start//12:02d}.png')
Path('work/expanded_student_layout_audit.json').write_text(json.dumps({'pages':len(d),'issues':issues},indent=2));print(len(d),'pages;',issues)
