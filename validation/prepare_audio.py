"""Synthetic phrase corpus plus independently recorded human speech; never label TTS human."""
import json, subprocess, hashlib, re
from pathlib import Path
import pyarrow.parquet as pq
A=Path('.cache/audio'); A.mkdir(parents=True,exist_ok=True)
manifest=[]
def enc(src,dst):
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-ar','48000','-ac','1','-c:a','libopus',str(dst)],check=True)
for cat, texts in json.loads(Path('validation/phrases.json').read_text()).items():
 for i,text in enumerate(texts):
  key=f'{cat}-{i+1}'; src=A/f'{key}.aiff'; wav=A/f'{key}.wav'; webm=A/f'{key}.webm'
  subprocess.run(['say','-v','Anna (German (Germany))','-o',str(src),text],check=True)
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-ar','16000','-ac','1',str(wav)],check=True); enc(wav,webm)
  manifest.append(dict(id=key,category=cat,text=text,path=str(webm),kind='synthetic',source='macOS say Anna (German (Germany)); local evaluation only; not redistributed'))
rows=pq.read_table('.cache/thorsten.parquet').to_pylist()
# Select short, relevant natural sentences; preserve their real transcript verbatim.
keywords={'family':r'\b(mutter|vater|bruder|schwester|familie|kinder|eltern|sohn|tochter)\b','daily':r'\b(arbeit|schlafen|morgen|abend|aufstehen|buch|lesen)\b','food':r'\b(essen|brot|wasser|kaffee|suppe|frühstück|kochen)\b','shopping':r'\b(kaufen|kostet|bezahlen|euro|geld|geschäft|preis)\b','travel':r'\b(zug|bahnhof|reisen|flughafen|hotel|bus|fahrkarte|fahren)\b'}
for cat,pattern in keywords.items():
 candidates=[r for r in rows if re.search(pattern,r['text'],re.I) and 3<=len(r['text'].split())<=16]
 for i,r in enumerate(sorted(candidates,key=lambda x:len(x['text']))[:3]):
  key=f'human-{cat}-{i+1}'; src=A/f'{key}.wav'; src.write_bytes(r['audio']['bytes']); webm=A/f'{key}.webm'; enc(src,webm)
  manifest.append(dict(id=key,category=cat,text=r['text'],path=str(webm),kind='human',source='Thorsten-Voice/TV-24kHz-Neutral',row_id=r['id'],speaker=r['speaker'],license='CC-BY-4.0 per HF dataset card',shard='data/train-00000-of-00008.parquet'))
for m in manifest: m['sha256']=hashlib.sha256(Path(m['path']).read_bytes()).hexdigest()
Path('validation/audio-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('Prepared',len(manifest),'clips')
