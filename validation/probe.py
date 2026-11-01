import os, time, json, traceback
from pathlib import Path
os.environ['HF_HOME']=str(Path('.cache/huggingface').resolve())
os.environ['OPENPRONOUNCE_DEVICE']='cpu'
os.environ['HF_HUB_DISABLE_XET']='1'
from huggingface_hub import model_info, snapshot_download
from openpronounce import speech, phones, audio
out={}
for name in [speech.MODEL_NAME,'jonatasgrosman/wav2vec2-large-xlsr-53-german',phones.PHONE_MODEL_NAME]:
 t=time.perf_counter()
 try:
  rev=model_info(name).sha
  path=snapshot_download(name,revision=rev,allow_patterns=['*.json','*.safetensors','pytorch_model.bin','*.txt'],max_workers=3)
  if name==phones.PHONE_MODEL_NAME: loaded=phones._load_model()
  else: loaded=speech._load_models(name)
  out[name]={'revision':rev,'seconds':time.perf_counter()-t,'loaded':True,'path':path}
 except Exception:
  out[name]={'seconds':time.perf_counter()-t,'loaded':False,'error':traceback.format_exc()}
 Path('validation/results/models.json').write_text(json.dumps(out,indent=2))
 print(name,out[name],flush=True)
try:
 t=time.perf_counter(); p=audio.text2speech('Guten Morgen, wie geht es dir?',lang='de'); print('TTS',p,time.perf_counter()-t,flush=True)
except Exception: traceback.print_exc()
