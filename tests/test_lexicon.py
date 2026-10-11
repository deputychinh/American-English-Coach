import tempfile
import subprocess
import sys
import unittest
from pathlib import Path

from coach.lexicon import Lexicon, load_phonemes, to_ipa


class LexiconTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.lexicon = Lexicon(Path(cls.temp.name) / 'lexicon.sqlite3')

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_full_word_list_imported(self):
        stats = self.lexicon.stats()
        self.assertEqual(stats['source_lines'], 466550)
        self.assertGreater(stats['words'], 460000)
        self.assertEqual(stats['with_pronunciation'], 72072)

    def test_44_chart_entries_and_us_mappings(self):
        phonemes = load_phonemes()
        self.assertEqual(len(phonemes), 44)
        self.assertEqual(len({p['id'] for p in phonemes}), 44)
        self.assertEqual(sum(p['group']=='consonant' for p in phonemes), 24)
        self.assertTrue(all(p['us'] and p['tip'] and p['example'] for p in phonemes))

    def test_filter_word_examples_by_sound(self):
        result = self.lexicon.search('seat', phoneme='v01')
        self.assertIn('seat', [row['word'].lower() for row in result['items']])
        self.assertNotIn('seat', [row['word'] for row in self.lexicon.search('seat', phoneme='v02')['items']])

    def test_pagination_and_literal_query(self):
        first = self.lexicon.search('a', page=1)
        second = self.lexicon.search('a', page=2)
        self.assertFalse(set(w['word'] for w in first['items']) & set(w['word'] for w in second['items']))
        self.assertEqual(self.lexicon.search("%' OR 1=1 --")['total'], 0)

    def test_ipa_retains_multiple_pronunciations_and_unknown_status(self):
        result = self.lexicon.search('record')
        record = next(w for w in result['items'] if w['word']=='record')
        self.assertGreaterEqual(len(record['pronunciations']), 2)
        self.assertTrue(all(p['ipa'] for p in record['pronunciations']))
        self.assertIn('ʃ', to_ipa('SH IY1 P'))

    def test_invalid_filter_rejected(self):
        with self.assertRaises(ValueError):
            self.lexicon.search('', phoneme='missing')
        with self.assertRaises(ValueError):
            self.lexicon.search('', page=0)

    def test_local_vietnamese_meaning_and_inflected_word(self):
        apple = next(w for w in self.lexicon.search('apple')['items'] if w['word'].lower()=='apple')
        self.assertTrue(any('táo' in sense for d in apple['definitions'] for sense in d['senses']))
        geese = next(w for w in self.lexicon.search('geese')['items'] if w['word']=='geese')
        self.assertTrue(any(d['headword']=='goose' and d['inflected'] for d in geese['definitions']))
        self.assertTrue(any(d['source']=='thichhoc' and not d['reviewed'] for d in geese['definitions']))
        self.assertGreater(self.lexicon.stats()['with_meaning'], 100000)

    def test_readable_ipa_uses_source_stress_and_preserves_variants(self):
        about = next(w for w in self.lexicon.search('about')['items'] if w['word']=='about')
        self.assertIn('əˈbaʊt', [p['ipa'] for p in about['pronunciations']])
        self.assertTrue(all(' ' not in p['ipa'] for p in about['pronunciations']))
        self.assertTrue(all(p['source']=='ipa-dict' for p in about['pronunciations']))
        record = next(w for w in self.lexicon.search('record')['items'] if w['word']=='record')
        self.assertGreaterEqual(len(record['pronunciations']), 2)

    def test_unknown_meaning_is_explicit_not_invented(self):
        item = self.lexicon.search('2')['items'][0]
        self.assertEqual(item['definitions'], [])

    def test_invalid_page_size_rejected(self):
        for limit in (0, -1, 101, '30', True):
            with self.assertRaises(ValueError):
                self.lexicon.search(limit=limit)

    def test_concurrent_processes_build_complete_indexes(self):
        target = str(Path(self.temp.name) / 'concurrent.sqlite3')
        script = 'from coach.lexicon import Lexicon; import sys; print(Lexicon(sys.argv[1]).stats()["words"])'
        processes = [subprocess.Popen([sys.executable, '-c', script, target],
                                     stdout=subprocess.PIPE, stderr=subprocess.PIPE) for _ in range(2)]
        for process in processes:
            output, error = process.communicate(timeout=60)
            self.assertEqual(process.returncode, 0, error.decode())
            self.assertIn(b'466550', output)
        lexicon = Lexicon(target)
        self.assertEqual(lexicon.stats()['words'], 466550)
        self.assertTrue(lexicon.search(phoneme='v01')['items'])


if __name__ == '__main__':
    unittest.main()
