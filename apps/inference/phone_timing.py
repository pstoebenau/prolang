"""Retain timing from the existing phone inference, without running another model."""
from contextlib import contextmanager
from contextvars import ContextVar
from functools import wraps

_capture = ContextVar('phone_timing', default=None)


def spans_in_seconds(recognition, duration):
    frames = len(recognition.log_posteriors)
    if not frames or len(recognition.spans) != len(recognition.phones):
        return []
    scale = duration / frames
    return [
        {'start': round(start * scale, 6), 'end': round(end * scale, 6)}
        for start, end in recognition.spans
    ]


def install(phones):
    original = phones.recognize_phones

    @wraps(original)
    def recognize(waveform, sampling_rate=16000, *args, **kwargs):
        result = original(waveform, sampling_rate, *args, **kwargs)
        capture = _capture.get()
        if capture is not None:
            capture.extend(spans_in_seconds(result, len(waveform) / sampling_rate))
        return result

    phones.recognize_phones = recognize


@contextmanager
def capture_phone_timing():
    spans = []
    token = _capture.set(spans)
    try:
        yield spans
    finally:
        _capture.reset(token)
