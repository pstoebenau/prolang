import unittest
from types import SimpleNamespace
from apps.inference.phone_timing import install, capture_phone_timing, spans_in_seconds


class PhoneTimingTests(unittest.TestCase):
    def test_uses_model_frames_and_does_not_repeat_inference(self):
        recognition = SimpleNamespace(phones=['d', 'i'], spans=[(10, 20), (25, 40)], log_posteriors=[0] * 100)
        calls = []
        phones = SimpleNamespace(recognize_phones=lambda *args, **kwargs: calls.append(args) or recognition)
        install(phones)
        with capture_phone_timing() as spans:
            self.assertIs(phones.recognize_phones([0] * 32000, 16000), recognition)
        self.assertEqual(spans, [{'start': .2, 'end': .4}, {'start': .5, 'end': .8}])
        self.assertEqual(len(calls), 1)
        phones.recognize_phones([0] * 32000)
        self.assertEqual(len(spans), 2)  # No leaking into completed requests.

    def test_capture_is_cleared_after_failure(self):
        with self.assertRaises(ValueError):
            with capture_phone_timing() as old:
                raise ValueError('failed')
        with capture_phone_timing() as new:
            self.assertIsNot(old, new)
            self.assertEqual(new, [])

    def test_missing_or_inconsistent_frames_produce_no_timing(self):
        self.assertEqual(spans_in_seconds(SimpleNamespace(log_posteriors=[], phones=[], spans=[]), 1), [])
        self.assertEqual(spans_in_seconds(SimpleNamespace(log_posteriors=[0], phones=['a'], spans=[]), 1), [])
