"""Qwen word recognition; phoneme recognition remains OpenPronounce's job."""
import os

MODEL = 'Qwen/Qwen3-ASR-1.7B'


def install(speech, model_path, model_factory=None):
    import torch
    if model_factory is None:
        from qwen_asr import Qwen3ASRModel
        model_factory = Qwen3ASRModel.from_pretrained
    device = os.getenv('QWEN_ASR_DEVICE', os.getenv('OPENPRONOUNCE_DEVICE', 'cpu'))
    model = model_factory(
        model_path,
        dtype=torch.float32 if device == 'cpu' else torch.bfloat16,
        device_map=device,
        max_inference_batch_size=1,
        max_new_tokens=256,
    )

    def transcribe(waveform, lang='de'):
        if lang != 'de':
            raise ValueError('Prolang transcription currently supports German only.')
        # Never pass the answer, vocabulary, or a spelling-correction prompt.
        results = model.transcribe(audio=(waveform, 16000), language='German')
        return results[0].text.strip() if results else ''

    speech.transcribe = transcribe
    return model
