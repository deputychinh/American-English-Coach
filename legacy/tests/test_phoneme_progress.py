import tempfile
import unittest
from pathlib import Path
from coach.store import Store


class PhonemeProgressTests(unittest.TestCase):
    def test_progress_persists_and_exports(self):
        with tempfile.TemporaryDirectory() as directory:
            store = Store(Path(directory))
            store.phoneme_progress({'id':'v01','comfort':'practicing'})
            self.assertEqual(Store(Path(directory)).phoneme_progress()['v01']['comfort'],'practicing')
            backup=store.export()
            other=Store(Path(directory)/'restore')
            other.restore(backup)
            self.assertEqual(other.phoneme_progress()['v01']['comfort'],'practicing')

    def test_unknown_sound_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                Store(Path(directory)).phoneme_progress({'id':'missing','comfort':'good'})
