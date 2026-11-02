import unittest
import numpy as np
from apps.inference.long_audio import windowed_features


class LongAudioTests(unittest.TestCase):
    def test_short_audio_unchanged_and_long_audio_has_bounded_windows(self):
        calls = []
        def model(wave, rate):
            calls.append(len(wave))
            return wave[:, None]
        wrapped = windowed_features(model)
        short = np.arange(300)
        np.testing.assert_array_equal(wrapped(short, 10)[:, 0], short)
        self.assertEqual(calls, [300])
        calls.clear()
        long = np.arange(1200)
        np.testing.assert_array_equal(wrapped(long, 10)[:, 0], long)
        self.assertLessEqual(max(calls), 210)
        self.assertEqual(len(calls), 6)


class DurationLimitTests(unittest.TestCase):
    def test_paragraph_accepts_two_minutes_and_rejects_longer_audio(self):
        import io
        import wave
        import sys
        from types import SimpleNamespace
        from unittest.mock import patch
        from apps.inference.app import execute

        def wav(seconds):
            stream = io.BytesIO()
            with wave.open(stream, 'wb') as output:
                output.setnchannels(1)
                output.setsampwidth(2)
                output.setframerate(16000)
                output.writeframes((np.sin(np.arange(seconds * 16000) * 0.1) * 12000).astype('<i2').tobytes())
            return stream.getvalue()

        lengths = []
        def compare(sound, text, lang):
            lengths.append(len(sound))
            return {'score': 80, 'transcribe': text, 'differences': {}}
        fake = SimpleNamespace(audio=SimpleNamespace(), speech=SimpleNamespace(compare_audio_with_text=compare))
        with patch.dict(sys.modules, {'openpronounce': fake}):
            self.assertEqual(execute('reading', 'Guten Tag', wav(120))['score'], 80)
            self.assertEqual(lengths, [120 * 16000])
            with self.assertRaisesRegex(ValueError, 'exceeds 120 seconds'):
                execute('reading', 'Guten Tag', wav(121))
            with self.assertRaisesRegex(ValueError, 'exceeds 30 seconds'):
                execute('assess', 'Guten Tag', wav(31))


if __name__ == '__main__':
    unittest.main()
