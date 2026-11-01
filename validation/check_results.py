"""Evidence completeness checks; does not turn model output into a human-quality claim."""
import json
from pathlib import Path
R=Path('validation/results'); rows=json.loads((R/'runs.json').read_text()); manifest=json.loads(Path('validation/audio-manifest.json').read_text())
assert len(manifest)==40 and sum(r['kind']=='synthetic' for r in manifest)==25
assert len(rows)==44, f'Expected 40 corpus + Chrome + 2 negatives + repeat, found {len(rows)}'
assert all(r.get('status')==200 and r.get('structured') for r in rows)
assert all(r.get('phone_count',0)>=0 and 0<=r['score']<=100 for r in rows)
by={r['id']:r for r in rows}
assert by['silence']['score']<by['family-1']['score']
assert by['wrong-sentence']['score']<by['family-1']['score']
ingest=json.loads((R/'ingestion.json').read_text())
assert len(ingest)==41 and all(r['codec']=='opus' and r['finite'] and r['output_sr']==16000 for r in ingest)
assert json.loads((R/'environment.json').read_text())['device']=='cpu'
print('PASS: 44 complete real-model responses, 41 Opus uploads; controls lower than matched speech. CPU only. Human quality/calibration and CUDA remain separate gates.')
