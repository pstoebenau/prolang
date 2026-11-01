import json
import unittest
from pathlib import Path
from types import SimpleNamespace
from apps.inference.orthography import build_lexicon, restore, install

class OrthographyTests(unittest.TestCase):
    def setUp(self):
        self.cards = json.loads(Path('packages/deck/cards.json').read_text())
        self.lexicon = build_lexicon(self.cards)

    def test_real_deck(self):
        self.assertEqual(restore('die grossmutter', self.lexicon), 'die Großmutter')
        self.assertEqual(restore('die mutter', self.lexicon), 'die Mutter')
        self.assertEqual(restore('das omer', self.lexicon), 'das omer')

    def test_ambiguous_words_stay_unchanged(self):
        lexicon = build_lexicon([{'german': 'Maße'}, {'german': 'Masse'}])
        self.assertEqual(restore('masse', lexicon), 'masse')

    def test_before_comparison_and_raw_preserved(self):
        calls = []
        def compare(transcription, target, lang):
            calls.append((transcription, target, lang))
            return {'transcribe': transcription}
        speech = SimpleNamespace(compare_transcriptions=compare)
        install(speech, self.cards)
        result = speech.compare_transcriptions('die grossmutter', 'der Vater', 'de')
        self.assertEqual(calls[0], ('die Großmutter', 'der Vater', 'de'))
        self.assertEqual(result['transcribe_raw'], 'die grossmutter')
        self.assertEqual(result['transcribe'], 'die Großmutter')
        self.assertEqual(speech.compare_transcriptions('grossmutter', '', 'en')['transcribe'], 'grossmutter')

if __name__ == '__main__':
    unittest.main()
