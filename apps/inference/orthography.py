"""Restore spellings lost by the lowercase, sharp-s-free German CTC alphabet.

Only exact, unambiguous vocabulary matches are restored. Never use the current
assessment target or fuzzy matching to steer recognized words toward an answer.
"""
import re
import unicodedata

WORD = re.compile(r"[^\W\d_]+(?:['’][^\W\d_]+)*", re.UNICODE)


def key(word):
    return unicodedata.normalize('NFC', word).lower().replace('ß', 'ss')


def build_lexicon(cards):
    candidates = {}
    for card in cards:
        # Canonical entries only: sentence-initial capitalization is ambiguous.
        for field in ('german', 'plural'):
            for word in WORD.findall(card.get(field) or ''):
                candidates.setdefault(key(word), set()).add(word)
    return {k: next(iter(v)) for k, v in candidates.items() if len(v) == 1}


def restore(text, lexicon):
    return WORD.sub(lambda match: lexicon.get(key(match.group()), match.group()), text)


def install(speech, cards):
    lexicon = build_lexicon(cards)
    original = speech.compare_transcriptions

    def compare(transcription, text_reference, lang='en'):
        restored = restore(transcription, lexicon) if lang == 'de' else transcription
        result = original(restored, text_reference, lang)
        result['transcribe_raw'] = transcription
        return result

    speech.compare_transcriptions = compare
