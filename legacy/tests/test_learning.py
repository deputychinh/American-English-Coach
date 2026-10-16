import tempfile
import unittest
from pathlib import Path

from coach.grading import grade_dictation
from coach.store import Store


class DictationTests(unittest.TestCase):
    def test_punctuation_case_and_curly_apostrophes(self):
        self.assertEqual(grade_dictation("I'm ready.", "i’m READY!")["score"], 100)

    def test_negation_is_not_discarded(self):
        result = grade_dictation("I can't swim.", "I can swim.")
        self.assertFalse(result["correct"])
        self.assertEqual(result["errors"][0]["expected"], "can't")

    def test_omission_insertion_and_substitution(self):
        result = grade_dictation("Please take the blue train.", "Please take a train now.")
        self.assertLess(result["score"], 100)
        self.assertGreaterEqual(len(result["errors"]), 2)

    def test_explicit_accepted_answer(self):
        result = grade_dictation("It is ten dollars.", "It's $10.", ["It's $10."])
        self.assertTrue(result["correct"])

    def test_empty_answer_is_not_success(self):
        self.assertEqual(grade_dictation("Hello there.", "")["score"], 0)


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name)
        self.store = Store(self.path)

    def tearDown(self):
        self.directory.cleanup()

    def test_seed_and_dictionary_are_available(self):
        self.assertGreaterEqual(len(self.store.content["words"]), 100)
        self.assertGreaterEqual(len(self.store.content["sentences"]), 60)
        self.assertTrue(self.store.search("seat")["words"])

    def test_attempt_is_graded_on_server_and_survives_restart(self):
        sentence = self.store.content["sentences"][0]
        result = self.store.attempt({"request_id": "attempt-one", "item_id": sentence["id"],
                                     "kind": "dictation", "answer": sentence["text"], "listens": 1})
        self.assertEqual(result["score"], 100)
        self.assertEqual(Store(self.path).dashboard()["stats"]["attempts"], 1)

    def test_duplicate_submit_does_not_count_twice(self):
        sentence = self.store.content["sentences"][0]
        data = {"request_id": "same-request", "item_id": sentence["id"],
                "kind": "dictation", "answer": "wrong", "listens": 1}
        self.assertEqual(self.store.attempt(data), self.store.attempt(data))
        self.assertEqual(self.store.dashboard()["stats"]["attempts"], 1)

    def test_reveal_is_recorded_as_assisted(self):
        sentence = self.store.content["sentences"][0]
        self.store.attempt({"request_id": "assisted", "item_id": sentence["id"],
                            "kind": "dictation", "answer": sentence["text"], "revealed": True})
        self.assertIsNone(self.store.dashboard()["stats"]["first_listen_score"])

    def test_review_scheduling_is_persisted(self):
        word = self.store.content["words"][0]
        self.store.review({"request_id": "review-one", "item_id": word["id"], "rating": "again"})
        due = Store(self.path).reviews()
        self.assertIn(word["id"], [item["id"] for item in due])

    def test_invalid_item_or_rating_rejected(self):
        with self.assertRaises(ValueError):
            self.store.attempt({"request_id": "invalid", "item_id": "missing", "kind": "dictation", "answer": "hi"})
        with self.assertRaises(ValueError):
            self.store.review({"request_id": "invalid-rating", "item_id": "w001", "rating": "amazing"})

    def test_settings_and_export_import(self):
        self.store.settings({"name": "David", "minutes": 30, "level": "beginner"})
        exported = self.store.export()
        other = Store(self.path / "restored")
        other.restore(exported)
        self.assertEqual(other.settings()["name"], "David")
        self.assertEqual(other.settings()["minutes"], 30)

    def test_restore_rejects_bad_data_without_changes(self):
        before = self.store.export()
        with self.assertRaises(ValueError):
            self.store.restore({"version": 900, "settings": {"name": "bad"}})
        self.assertEqual(before, self.store.export())

    def test_lesson_day_bounds_and_curriculum(self):
        self.assertEqual(len(self.store.curriculum()), 12)
        self.assertTrue(self.store.lesson(1)["sentences"])
        self.assertTrue(self.store.lesson(90)["sentences"])
        with self.assertRaises(ValueError):
            self.store.lesson(0)


if __name__ == "__main__":
    unittest.main()
