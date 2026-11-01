import json,statistics,csv
from pathlib import Path
R=Path('validation/results'); rows=json.loads((R/'runs.json').read_text()); out={}
for kind in ['synthetic','human','negative']:
 group=[r for r in rows if r.get('kind')==kind and r.get('id') not in ['warm-repeat','chrome-mediarecorder']]
 ok=[r for r in group if r.get('status')==200]
 out[kind]={'attempted':len(group),'http200':len(ok),'structured':sum(r.get('structured',False) for r in ok)}
 for field in ['score','wer','per','seconds']:
  a=sorted(r[field] for r in ok if r.get(field) is not None)
  if a: out[kind][field]={'min':min(a),'median':statistics.median(a),'p95_nearest_rank':a[min(len(a)-1,__import__('math').ceil(.95*len(a))-1)],'max':max(a)}
 out[kind]['mean_flagged_words']=statistics.mean(len(r.get('flagged_words') or []) for r in ok) if ok else None
out['controls']=[r for r in rows if r.get('kind')=='negative' or r.get('id') in ['warm-repeat','chrome-mediarecorder']]
(R/'summary.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
with (R/'runs.csv').open('w') as f:
 fields=['id','kind','status','seconds','score','wer','per','structured','text','transcript','flagged_words'];w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(rows)
print(json.dumps(out,ensure_ascii=False,indent=2))
