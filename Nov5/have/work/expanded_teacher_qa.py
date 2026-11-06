from pathlib import Path
import json,re,argparse
import pymupdf as fitz
from PIL import Image,ImageDraw
ap=argparse.ArgumentParser();ap.add_argument('--prototype',action='store_true');args=ap.parse_args()
root=Path('work/expanded_teacher');out=root/('prototype_render' if args.prototype else 'render');out.mkdir(exist_ok=True,parents=True)
files=sorted(root.glob('prototype_week_*.pdf')) if args.prototype else sorted(Path('outputs/DoubleAdvanced_Expanded/Teacher_Weeks').glob('*.pdf'))
rows=[];issues=[]
for p in files:
 w=int(re.search(r'(\d{2})',p.name).group(1));doc=fitz.open(p)
 for i,page in enumerate(doc):
  for b in page.get_text('dict')['blocks']:
   if 'lines' not in b:continue
   for l in b['lines']:
    for s in l['spans']:
     x0,y0,x1,y1=s['bbox']
     if x0<38 or x1>574 or y0<10 or y1>776:issues.append({'file':str(p),'page':i+1,'text':s['text'],'bbox':[x0,y0,x1,y1]})
  target=out/f'w{w:02d}_p{i+1:02d}.png';page.get_pixmap(matrix=fitz.Matrix(1,1),alpha=False).save(target);rows.append({'week':w,'page':i+1,'image':str(target)})
for i in range(0,len(rows),12):
 cs=Image.new('RGB',(1248,1290),'#ddd');d=ImageDraw.Draw(cs)
 for j,r in enumerate(rows[i:i+12]):
  im=Image.open(r['image']);im.thumbnail((302,400));x=j%4*312;y=j//4*430;d.text((x+4,y+4),f'W{r["week"]:02d} p{r["page"]}',fill='black');cs.paste(im,(x+4,y+25))
 cs.save(out/f'contact_{i//12:03d}.png')
report={'files':len(files),'pages':len(rows),'contacts':(len(rows)+11)//12,'issues':issues};(root/('prototype_qa.json' if args.prototype else 'final_qa.json')).write_text(json.dumps(report,indent=2));(root/'page_index.json').write_text(json.dumps(rows,indent=2));print(json.dumps(report))
