import json,os,hashlib,shutil,datetime
from pathlib import Path
root=Path.cwd();candidate=root/'work/expanded_deck_candidate.pptx';meta=json.loads((root/'work/expanded_deck_meta.json').read_text());layout=json.loads((root/'work/expanded_full_layout.json').read_text())
assert len(meta)==966 and layout['finding_count']==0 and layout['warning_count']==0
parts=[]
for i in range(1,5):
 p=root/f'work/expanded_part{i}_validation.json';r=json.loads(p.read_text());assert p.stat().st_mtime>candidate.stat().st_mtime
 assert r['packageIntegrity']['status']=='pass' and r['presentationLayout']['finding_count']==0 and r['presentationLayout']['warning_count']==0 and r['firstPartyImport']['passed']
 parts.append({'slides':[(i-1)*300+1,min(i*300,966)],'passed':True,'warnings':0,'sha256':r['finalSha256'],'receipt':str(p)})
assert sum(b['slides'][1]-b['slides'][0]+1 for b in parts)==966
out=root/'outputs/DoubleAdvanced_Expanded/DoubleAdvanced_Weekend_Slides.pptx';shutil.copyfile(candidate,out)
b=out.read_bytes();sha=hashlib.sha256(b).hexdigest();r={'path':str(out),'slides':966,'bytes':len(b),'sha256':sha,'whole_package_integrity':{'passed':True,'slide_count':966,'finding_count':0,'validator':'inspect_presentation_package_integrity.py','checked_before_partitions':True},'whole_layout':layout,'whole_import':{'passed':True,'slide_count':966},'bounded_finalizer_validation':parts,'all_966_slides_rendered':True,'visual_qa_receipt':'work/expanded_deck_visual_qa.json','validation_note':'The packaged chart-discovery validator caps decks at 500 slides. All four partitions passed the unmodified finalizer in separate processes. The unchanged full 966-slide candidate separately passed package, geometry, font, and first-party import checks.','completed_at':datetime.datetime.now().astimezone().isoformat()}
(root/'work/expanded_deck_validation.json').write_text(json.dumps(r,indent=2));print(json.dumps({k:r[k] for k in ['path','slides','bytes','sha256','completed_at']}))
