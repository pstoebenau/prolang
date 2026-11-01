"""Exercise unmodified upstream through FastAPI multipart ingestion (in-process, real models)."""
import os,sys,json,time,traceback,platform,subprocess,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; os.chdir(ROOT)
os.environ.update(HF_HOME=str(ROOT/'.cache/huggingface'),OPENPRONOUNCE_DEVICE=os.getenv('OPENPRONOUNCE_DEVICE','cpu'),OPENPRONOUNCE_CACHE_DIR=str(ROOT/'.cache/references'),HF_HUB_DISABLE_XET='1')
sys.path.insert(0,str(ROOT/'.cache/OpenPronounce'))
import torch, numpy as np, soundfile as sf
from openpronounce import speech,phones,audio
from fastapi.testclient import TestClient
from server import app
# Resolve model names to pinned local snapshots, without editing upstream.
pins=json.loads(Path('validation/results/models.json').read_text())
orig_s=speech._load_models; orig_p=phones._load_model
from functools import lru_cache
@lru_cache(None)
def load_s(name=speech.MODEL_NAME): return orig_s(pins[name]['path'])
speech._load_models=load_s
phones.PHONE_MODEL_NAME=pins[phones.PHONE_MODEL_NAME]['path']
torch.set_num_threads(4)
client=TestClient(app,raise_server_exceptions=False)
R=Path('validation/results'); R.mkdir(exist_ok=True)
manifest=json.loads(Path('validation/audio-manifest.json').read_text())
# Separate true silence and sentence mismatch, using same expected family sentence.
sil=Path('.cache/audio/silence.wav'); sf.write(sil,np.zeros(48000,dtype=np.float32),16000)
cases=manifest+[dict(manifest[0],id='chrome-mediarecorder',path='.cache/audio/chrome-family-1.webm')]+[dict(id='silence',kind='negative',path=str(sil),text=manifest[0]['text']),dict(id='wrong-sentence',kind='negative',path=manifest[20]['path'],text=manifest[0]['text'])]
rows=[]
meta=dict(platform=platform.platform(),python=sys.version,torch=torch.__version__,cuda_available=torch.cuda.is_available(),torch_cuda=torch.version.cuda,device=str(speech.get_device()),threads=torch.get_num_threads())
Path(R/'environment.json').write_text(json.dumps(meta,indent=2))
for endpoint in ['/health','/languages']:
 response=client.get(endpoint); Path(R/(endpoint[1:]+'.json')).write_text(response.text)
# Cold first request includes model loading, JIT, TTS; repeats and later cases are warm.
for c in cases+[dict(manifest[0],id='warm-repeat')]:
 t=time.perf_counter()
 try:
  with open(c['path'],'rb') as f:
   response=client.post('/pronunciation',data={'expected_text':c['text'],'lang':'de'},files={'file':(Path(c['path']).name,f,'audio/webm' if c['path'].endswith('webm') else 'audio/wav')})
  elapsed=time.perf_counter()-t; result=response.json()
  Path(R/(c['id']+'.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2,allow_nan=False))
  d=result.get('differences',{}); errors=d.get('errors',[])
  row=dict(id=c['id'],kind=c['kind'],text=c['text'],seconds=round(elapsed,3),status=response.status_code,score=result.get('score'),transcript=result.get('transcribe'),wer=d.get('word_error_rate'),per=d.get('phoneme_error_rate'),flagged_words=d.get('words_with_errors'),phone_count=len(d.get('heard_phones',[])),structured=all(k in result for k in ['score','prosody','differences']) and all(all(k in e for k in ['word','expected','actual','confidence','phones']) for e in errors))
 except Exception: row=dict(id=c['id'],seconds=time.perf_counter()-t,error=traceback.format_exc())
 rows.append(row); Path(R/'runs.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)); print(json.dumps(row,ensure_ascii=False),flush=True)
