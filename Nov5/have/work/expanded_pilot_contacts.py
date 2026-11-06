from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json
m=json.load(open('work/expanded_deck_meta.json')); keys={q['number']:q for q in m}
f=sorted(Path('work/expanded_pilot_render').glob('slide-*.png'))
out=Path('work/expanded_pilot_contacts');out.mkdir(exist_ok=True)
for k in range(0,len(f),9):
 im=Image.new('RGB',(1440,900),'white');d=ImageDraw.Draw(im)
 for j,p in enumerate(f[k:k+9]):
  n=int(p.stem.split('-')[1]);x=j%3*480;y=j//3*300;a=Image.open(p).convert('RGB');a.thumbnail((480,270));im.paste(a,(x,y));d.text((x+8,y+275),str(n)+' '+keys.get(n,{}).get('type',''),fill='black')
 im.save(out/f'contact-{k//9+1:02}.png')
print(len(f))
