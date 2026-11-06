from pathlib import Path
import fitz,re,json
checks=[]
for p in Path('outputs/DoubleAdvanced_Revised').rglob('*.pdf'):
 d=fitz.open(p)
 t='\n'.join(x.get_text() for x in d)
 bad=re.findall(r'(?<![A-Za-z0-9])\d(?:\.\d+)?E[+-]\d+',t)
 checks.append({'file':p.name,'pages':len(d),'scientific_notation':bad})
 assert not bad,(p,bad)
print(json.dumps(checks,indent=2))
