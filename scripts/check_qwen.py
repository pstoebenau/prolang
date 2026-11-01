"""Exercise real Qwen transcription plus the unchanged phoneme pipeline locally."""
import json
import time
from pathlib import Path
from apps.inference.app import initialize, execute

if __name__ == '__main__':
    started = time.monotonic()
    initialize()
    print(f'Models loaded in {time.monotonic() - started:.1f}s', flush=True)
    reference = execute('reference', 'die Großmutter', None)
    started = time.monotonic()
    result = execute('assess', 'die Großmutter', Path(reference).read_bytes())
    evidence = {
        'source': 'synthetic gTTS reference; not learner accuracy evidence',
        'transcription_model': result['transcription_model'],
        'transcribe': result['transcribe'],
        'expected_phones': result['differences'].get('expected_phones'),
        'heard_phones': result['differences'].get('heard_phones'),
        'seconds': round(time.monotonic() - started, 2),
    }
    print(json.dumps(evidence, ensure_ascii=False, indent=2), flush=True)
    assert result['transcribe'].strip(' .!').casefold() == 'die großmutter'.casefold()
    assert evidence['expected_phones'] and evidence['heard_phones']
    Path('.cache/qwen-smoke.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2))
