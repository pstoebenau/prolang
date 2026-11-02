"""Bound Wav2Vec model windows while preserving the existing full-text scoring.

Overlapping context avoids hard model boundaries; frame timings remain approximate.
Short flashcard recordings use the original model path unchanged.
"""
from functools import wraps
import numpy as np


def windowed_features(original):
    @wraps(original)
    def extract(waveform, sampling_rate=16000):
        if len(waveform) <= 30 * sampling_rate:
            return original(waveform, sampling_rate)
        window = 20 * sampling_rate
        context = sampling_rate // 2
        features = []
        for start in range(0, len(waveform), window):
            end = min(start + window, len(waveform))
            left, right = max(0, start - context), min(len(waveform), end + context)
            frames = original(waveform[left:right], sampling_rate)
            first = round((start - left) * len(frames) / (right - left))
            last = round((end - left) * len(frames) / (right - left))
            features.append(frames[first:last])
        return np.concatenate(features, axis=0)
    return extract


def install(speech, phones):
    speech.extract_embeddings = windowed_features(speech.extract_embeddings)
    phones.phone_log_posteriors = windowed_features(phones.phone_log_posteriors)
