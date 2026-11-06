from pathlib import Path
import json,re,pymupdf as fitz
from PIL import Image,ImageDraw
root=Path('outputs/DoubleAdvanced_Revised/Teacher_Weeks');out=Path('work/revised_teacher/render');out.mkdir(exist_ok=True)
report=[];page_images=[]
for f in sorted(root.glob('*.pdf')):
 d=fitz.open(f);row={'file':str(f),'pages':len(d),'issues':[],'bookmarks':len(d.get_toc())};wk=int(f.name[5:7])
 for i,p in enumerate(d):
  for b in p.get_text('dict')['blocks']:
   for ln in b.get('lines',[]):
    for sp in ln['spans']:
     x0,y0,x1,y1=sp['bbox']
     if x0<35 or x1>578 or y0<10 or y1>780:row['issues'].append({'page':i+1,'text':sp['text'],'bbox':sp['bbox']})
  pix=p.get_pixmap(matrix=fitz.Matrix(1,1),alpha=False);image=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
  path=out/f'w{wk:02d}_p{i+1:02d}.png';image.save(path);page_images.append((path,f'Week {wk:02d} / page {i+1}'))
 report.append(row)
for start in range(0,len(page_images),12):
 sheet=Image.new('RGB',(1248,1290),'#d6d6d6');dr=ImageDraw.Draw(sheet)
 for j,(path,label) in enumerate(page_images[start:start+12]):
  im=Image.open(path);im.thumbnail((302,395));x=j%4*312+5;y=j//4*430+25;sheet.paste(im,(x,y));dr.text((x,y-20),label,fill='black')
 sheet.save(out/f'contact_{start//12:03d}.png')
Path('work/revised_teacher/final_qa.json').write_text(json.dumps(report,indent=2))
Path('work/revised_teacher/page_index.json').write_text(json.dumps([{'image':str(p),'label':label} for p,label in page_images],indent=2))
print(json.dumps({'files':len(report),'pages':len(page_images),'contacts':(len(page_images)+11)//12,'issues':[r for r in report if r['issues']]}))
