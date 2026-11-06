from pathlib import Path
import json,re
from decimal import Decimal
paths=['work/weeks_1_5.json','work/weeks_6_10.json','work/revised_session_extras.json','work/revised_booster_plan.json']
pat=re.compile(r'(?<![A-Za-z0-9])[-+]?\d+(?:\.\d+)?E[+-]\d+(?![A-Za-z0-9])')
for name in paths:
 p=Path(name);count=[0]
 def fix(o):
  if isinstance(o,dict):return {k:v if k=='check' else fix(v) for k,v in o.items()}
  if isinstance(o,list):return [fix(v) for v in o]
  if isinstance(o,str):
   def repl(m):
    count[0]+=1
    return format(Decimal(m.group()),'f')
   return pat.sub(repl,o)
  return o
 data=fix(json.loads(p.read_text()));p.write_text(json.dumps(data,indent=2))
 print(name,count[0])
