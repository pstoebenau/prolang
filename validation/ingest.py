import os,json,time,sys,hashlib,subprocess
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path('.cache/OpenPronounce').resolve()))
from openpronounce import audio
from fastapi import UploadFile
from server import _save_upload_as_wav
clips=json.loads(Path('validation/audio-manifest.json').read_text())+[dict(id='chrome-mediarecorder',path='.cache/audio/chrome-family-1.webm')]
rows=[]
for c in clips:
 p=c['path']; t=time.perf_counter()
 with open(p,'rb') as f: converted=_save_upload_as_wav(UploadFile(file=f,filename=Path(p).name))
 y=audio.load(converted); os.remove(converted)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',p]))['streams'][0]
 rows.append(dict(id=c['id'],codec=probe['codec_name'],container_rate=probe['sample_rate'],samples=len(y),output_sr=16000,duration=len(y)/16000,dtype=str(y.dtype),finite=bool(np.isfinite(y).all()),rms=float(np.sqrt(np.mean(y*y))),seconds=time.perf_counter()-t,sha256=hashlib.sha256(Path(p).read_bytes()).hexdigest()))
Path('validation/results/ingestion.json').write_text(json.dumps(rows,indent=2))
print('decoded',len(rows),'WebM/Opus uploads')
