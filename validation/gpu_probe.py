"""Run only on target NVIDIA host; raises if any purported CUDA support is false."""
import json,torch,time
from pathlib import Path
assert torch.cuda.is_available(), 'CUDA unavailable: no GPU validation performed'
from openpronounce import speech, phones
from huggingface_hub import snapshot_download
pins=json.loads(Path("validation/models.lock.json").read_text())
paths={name:snapshot_download(name,revision=rev,allow_patterns=["*.json","*.safetensors","pytorch_model.bin","*.txt"]) for name,rev in pins.items()}
phones.PHONE_MODEL_NAME=paths[phones.PHONE_MODEL_NAME]
from openpronounce.device import get_device
assert get_device().type=='cuda', 'Set OPENPRONOUNCE_DEVICE=cuda'
p=torch.cuda.get_device_properties(0)
x=torch.randn(256,256,device='cuda'); y=x@x; torch.cuda.synchronize()
models=[speech._load_models(paths[speech.MODEL_NAME])[1],speech._load_models(paths['jonatasgrosman/wav2vec2-large-xlsr-53-german'])[1],phones._load_model()[1]]
for m in models:
 assert next(m.parameters()).device.type=='cuda'
 with torch.no_grad(): m(torch.zeros(1,48000,device='cuda'))
torch.cuda.synchronize()
print(json.dumps(dict(torch=torch.__version__,cuda=torch.version.cuda,name=p.name,capability=torch.cuda.get_device_capability(),arches=torch.cuda.get_arch_list(),vram=p.total_memory,peak_bytes=torch.cuda.max_memory_allocated()),indent=2))
