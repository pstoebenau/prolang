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


if __name__ == '__main__':
    unittest.main()
