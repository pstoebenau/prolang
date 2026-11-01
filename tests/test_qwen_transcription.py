import unittest
from types import SimpleNamespace
from unittest.mock import patch
from apps.inference.qwen_transcription import install

class QwenTranscriptionTests(unittest.TestCase):
    def test_unprompted_german_audio_and_verbatim_output(self):
        calls = []
        model = SimpleNamespace(transcribe=lambda **kw: calls.append(kw) or [SimpleNamespace(text='die Großmutter')])
        factory_calls = []
        def factory(*args, **kwargs):
            factory_calls.append((args, kwargs))
            return model
        speech = SimpleNamespace()
        with patch.dict('os.environ', {'QWEN_ASR_DEVICE': 'cpu'}):
            install(speech, '/pinned/model', factory)
        audio = object()
        self.assertEqual(speech.transcribe(audio, 'de'), 'die Großmutter')
        self.assertEqual(calls, [{'audio': (audio, 16000), 'language': 'German'}])
        self.assertEqual(factory_calls[0][1]['max_inference_batch_size'], 1)
        with self.assertRaises(ValueError):
            speech.transcribe(audio, 'en')

    def test_does_not_correct_a_wrong_word(self):
        model = SimpleNamespace(transcribe=lambda **kw: [SimpleNamespace(text='das Auto')])
        speech = SimpleNamespace()
        install(speech, '/model', lambda *a, **k: model)
        self.assertEqual(speech.transcribe(object()), 'das Auto')

if __name__ == '__main__': unittest.main()
