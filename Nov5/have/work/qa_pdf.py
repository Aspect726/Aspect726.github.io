from pathlib import Path
import fitz,json
from PIL import Image,ImageDraw
import sys
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path('outputs/DoubleAdvanced_Math_Program')
out=Path('work/pdf_qa');out.mkdir(exist_ok=True)
files=sorted(root.rglob('*.pdf'));report=[];pages=[]
for fi,f in enumerate(files):
 doc=fitz.open(f);r={'file':str(f),'pages':len(doc),'issues':[]}
 for i,pg in enumerate(doc):
  for b in pg.get_text('dict')['blocks']:
   if 'lines' not in b:continue
   for line in b['lines']:
    for sp in line['spans']:
     a=sp['bbox']
     if a[0]<18 or a[2]>594 or a[1]<12 or a[3]>778:r['issues'].append([i+1,sp['text'],a])
  pix=pg.get_pixmap(matrix=fitz.Matrix(.7,.7),alpha=False);im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
  path=out/f'p{fi:03d}_{i+1:03d}.png';im.save(path);pages.append((path,f'{f.parent.name}/{f.name} p{i+1}'))
 report.append(r)
for start in range(0,len(pages),12):
 sheet=Image.new('RGB',(4*312,3*430),'#d6d6d6');dr=ImageDraw.Draw(sheet)
 for j,(path,label) in enumerate(pages[start:start+12]):
  im=Image.open(path);im.thumbnail((302,395));x=(j%4)*312+5;y=(j//4)*430+25;sheet.paste(im,(x,y));dr.text((x,y-20),label[:46],fill='black')
 sheet.save(out/f'contact_{start//12:03d}.png')
json.dump(report,open(out/'report.json','w'),indent=2)
print(json.dumps({'files':len(files),'pages':len(pages),'contacts':(len(pages)+11)//12,'issues':[r for r in report if r['issues']]}))
