"""Fetch exact immutable model/dataset/browser revisions recorded in the validation."""
import os,json,urllib.request,hashlib,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]; os.chdir(root)
os.environ['HF_HOME']=str(root/'.cache/huggingface'); os.environ['HF_HUB_DISABLE_XET']='1'
from huggingface_hub import snapshot_download,hf_hub_download
pins=json.loads(Path('validation/models.lock.json').read_text()); result={}
for name,rev in pins.items():
 path=snapshot_download(name,revision=rev,allow_patterns=['*.json','*.safetensors','pytorch_model.bin','*.txt'],max_workers=3)
 result[name]={'revision':rev,'path':path}
Path('validation/results/models.json').write_text(json.dumps(result,indent=2))
d=json.loads(Path('validation/dataset.lock.json').read_text())
p=Path(hf_hub_download(d['repo'],d['file'],repo_type='dataset',revision=d['revision']))
assert hashlib.sha256(p.read_bytes()).hexdigest()==d['sha256']
import shutil
shutil.copyfile(p,'.cache/thorsten.parquet')
c=json.loads(Path('validation/results/chrome-version.json').read_text())
if not Path('.cache/chrome').exists():
 urllib.request.urlretrieve(c['url'],'.cache/chrome.zip')
 subprocess.run(['unzip','-q','.cache/chrome.zip','-d','.cache/chrome'],check=True)
