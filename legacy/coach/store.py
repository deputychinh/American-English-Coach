"""Transactional local learning history and a small, transparent review scheduler."""
import hashlib
import json
import re
import sqlite3
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from .content import ROOT, load_content
from .grading import grade_dictation
from .lexicon import Lexicon, load_phonemes


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def checked_text(value, name, maximum=2000):
    if not isinstance(value, str) or len(value) > maximum:
        raise ValueError("Trường %s không hợp lệ." % name)
    return value


def checked_int(value, name, low, high):
    if type(value) is not int or not low <= value <= high:
        raise ValueError("Trường %s không hợp lệ." % name)
    return value


class Store:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.database = self.directory / "coach.sqlite3"
        self.content = load_content()
        self.words = {item["id"]: item for item in self.content["words"]}
        self.sentences = {item["id"]: item for item in self.content["sentences"]}
        with self.connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS attempts (
                    request_id TEXT PRIMARY KEY, item_id TEXT NOT NULL, kind TEXT NOT NULL,
                    day INTEGER NOT NULL, answer TEXT NOT NULL, score INTEGER NOT NULL,
                    assisted INTEGER NOT NULL, listens INTEGER NOT NULL, created TEXT NOT NULL,
                    result TEXT NOT NULL, fingerprint TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS reviews (
                    item_id TEXT PRIMARY KEY, interval INTEGER NOT NULL, due TEXT NOT NULL,
                    repetitions INTEGER NOT NULL, last_rating TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS review_events (
                    request_id TEXT PRIMARY KEY, item_id TEXT NOT NULL, rating TEXT NOT NULL, created TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS completed (day INTEGER PRIMARY KEY, created TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS recordings (
                    id TEXT PRIMARY KEY, item_id TEXT NOT NULL, mime TEXT NOT NULL, created TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS phoneme_progress (
                    id TEXT PRIMARY KEY, comfort TEXT NOT NULL, updated TEXT NOT NULL);
            """)
            defaults = {"name": "", "minutes": 60, "level": "beginner", "voice": "Samantha",
                        "start_date": date.today().isoformat(), "onboarded": False}
            db.execute("INSERT OR IGNORE INTO settings VALUES (1, ?)", (json.dumps(defaults),))
        self._dictionary = None
        self._lexicon = None

    def lexicon(self):
        if self._lexicon is None:
            self._lexicon = Lexicon((ROOT / 'vendor/lexicon.sqlite3').resolve())
        return self._lexicon

    def phoneme_progress(self, data=None):
        with self.connect() as db:
            if data is not None:
                valid = {p['id'] for p in load_phonemes()}
                if not isinstance(data, dict) or data.get('id') not in valid or data.get('comfort') not in ('new','practicing','comfortable'):
                    raise ValueError('Âm hoặc mức tự đánh giá không hợp lệ.')
                db.execute('INSERT OR REPLACE INTO phoneme_progress VALUES (?,?,?)', (data['id'],data['comfort'],now()))
            return {row['id']:dict(row) for row in db.execute('SELECT * FROM phoneme_progress')}

    def connect(self):
        db = sqlite3.connect(str(self.database), timeout=20)
        db.row_factory = sqlite3.Row
        return db

    def settings(self, changes=None):
        with self.connect() as db:
            settings = json.loads(db.execute("SELECT data FROM settings WHERE id=1").fetchone()[0])
            if changes is not None:
                if not isinstance(changes, dict) or set(changes) - {"name", "minutes", "level", "voice", "onboarded"}:
                    raise ValueError("Cài đặt không hợp lệ.")
                updated = dict(settings, **changes)
                checked_text(updated["name"], "tên", 60)
                if updated["minutes"] not in (30, 60, 90) or type(updated["minutes"]) is not int:
                    raise ValueError("Chọn 30, 60 hoặc 90 phút.")
                if updated["level"] not in ("beginner", "basic", "intermediate"):
                    raise ValueError("Mức học không hợp lệ.")
                if updated["voice"] not in ("Samantha", "Eddy (English (US))"):
                    raise ValueError("Giọng đọc không hợp lệ.")
                if type(updated["onboarded"]) is not bool:
                    raise ValueError("Cài đặt không hợp lệ.")
                db.execute("UPDATE settings SET data=? WHERE id=1", (json.dumps(updated),))
                return updated
            return settings

    def curriculum(self):
        with self.connect() as db:
            completed = {row[0] for row in db.execute("SELECT day FROM completed")}
        return [dict(unit, days=list(range((unit["id"] - 1) * 7 + 1, unit["id"] * 7 + 1)),
                     completed=sum(day in completed for day in range((unit["id"] - 1) * 7 + 1, unit["id"] * 7 + 1)))
                for unit in self.content["units"]]

    def lesson(self, day):
        checked_int(day, "ngày", 1, 90)
        unit_id = min(12, (day - 1) // 7 + 1)
        unit = self.content["units"][unit_id - 1]
        sentences = [item for item in self.sentences.values() if item["unit"] == unit_id]
        offset = (day - 1) % 7
        selected = [sentences[(offset + i) % len(sentences)] for i in range(3)]
        with self.connect() as db:
            attempted = [row[0] for row in db.execute("SELECT DISTINCT item_id FROM attempts WHERE day=? AND kind='dictation'", (day,))]
            complete = db.execute("SELECT 1 FROM completed WHERE day=?", (day,)).fetchone() is not None
        return {"day": day, "unit": unit, "sentences": selected,
                "words": [item for item in self.words.values() if item["unit"] == unit_id],
                "attempted": attempted, "completed": complete,
                "note": "Gói khởi đầu: câu được luân phiên và ôn lại trong tuần. Ngày 85–90 ôn tổng hợp."}

    def attempt(self, data):
        if not isinstance(data, dict):
            raise ValueError("Bài làm không hợp lệ.")
        request_id = checked_text(data.get("request_id"), "request_id", 80)
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", request_id):
            raise ValueError("Mã bài làm không hợp lệ.")
        kind = data.get("kind")
        if kind not in ("dictation", "meaning", "discrimination"):
            raise ValueError("Loại bài không hợp lệ.")
        item = (self.sentences if kind == "dictation" else self.words).get(data.get("item_id"))
        if not item:
            raise ValueError("Không tìm thấy bài học.")
        answer = checked_text(data.get("answer", ""), "đáp án")
        day = checked_int(data.get("day", 1), "ngày", 1, 90)
        listens = checked_int(data.get("listens", 0), "lần nghe", 0, 1000)
        revealed = data.get("revealed", False)
        if type(revealed) is not bool:
            raise ValueError("Trạng thái gợi ý không hợp lệ.")
        result = grade_dictation(item["text"], answer, item.get("alternatives")) if kind == "dictation" else {
            "score": 100 if answer == (item["meaning"] if kind == "meaning" else item["id"]) else 0,
            "correct": answer == (item["meaning"] if kind == "meaning" else item["id"]), "errors": []}
        result.update({"reference": item.get("text", item.get("word")), "meaning": item["meaning"],
                       "assisted": revealed, "request_id": request_id, "item_id": item["id"], "kind": kind})
        fingerprint = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            previous = db.execute("SELECT result, fingerprint FROM attempts WHERE request_id=?", (request_id,)).fetchone()
            if previous:
                if previous["fingerprint"] != fingerprint:
                    raise ValueError("Mã bài làm đã được dùng cho nội dung khác.")
                return json.loads(previous["result"])
            db.execute("INSERT INTO attempts VALUES (?,?,?,?,?,?,?,?,?,?,?)", (
                request_id, item["id"], kind, day, answer, result["score"], int(revealed), listens,
                now(), json.dumps(result), fingerprint))
        return result

    def complete(self, day):
        lesson = self.lesson(day)
        if not set(item["id"] for item in lesson["sentences"]).issubset(lesson["attempted"]):
            raise ValueError("Hãy hoàn thành ba câu nghe–chép của ngày trước khi đánh dấu xong.")
        with self.connect() as db:
            db.execute("INSERT OR IGNORE INTO completed VALUES (?,?)", (day, now()))
        return {"completed": True, "day": day}

    def review(self, data):
        if not isinstance(data, dict) or data.get("item_id") not in self.words or data.get("rating") not in ("again", "hard", "good", "easy"):
            raise ValueError("Mục ôn hoặc mức nhớ không hợp lệ.")
        request_id = checked_text(data.get("request_id"), "request_id", 80)
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", request_id):
            raise ValueError("Mã lượt ôn không hợp lệ.")
        item_id, rating = data["item_id"], data["rating"]
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            previous = db.execute("SELECT * FROM review_events WHERE request_id=?", (request_id,)).fetchone()
            if previous:
                if previous["item_id"] != item_id or previous["rating"] != rating:
                    raise ValueError("Mã lượt ôn đã được dùng.")
                return {"saved": True}
            old = db.execute("SELECT * FROM reviews WHERE item_id=?", (item_id,)).fetchone()
            interval = old["interval"] if old else 0
            interval = {"again": 0, "hard": max(1, round(interval * 1.2)),
                        "good": max(1, round(interval * 2.2)), "easy": max(4, round(interval * 3))}[rating]
            interval = min(interval, 180)
            due = (date.today() + timedelta(days=interval)).isoformat()
            db.execute("INSERT OR REPLACE INTO reviews VALUES (?,?,?,?,?)", (
                item_id, interval, due, (old["repetitions"] if old else 0) + 1, rating))
            db.execute("INSERT INTO review_events VALUES (?,?,?,?)", (request_id, item_id, rating, now()))
        return {"saved": True, "due": due}

    def reviews(self):
        with self.connect() as db:
            rows = db.execute("SELECT * FROM reviews WHERE due<=? ORDER BY due, item_id LIMIT 20", (date.today().isoformat(),)).fetchall()
        return [dict(self.words[row["item_id"]], review=dict(row)) for row in rows if row["item_id"] in self.words]

    def dictionary(self):
        if self._dictionary is None:
            self._dictionary = {}
            path = ROOT / "vendor/cmudict.dict"
            if path.exists():
                for line in path.read_text(encoding="utf-8").splitlines():
                    if not line or line.startswith(";;; "):
                        continue
                    term, _, phones = line.partition(" ")
                    term = re.sub(r"\(\d+\)$", "", term)
                    self._dictionary.setdefault(term, []).append(phones.split(" #")[0])
        return self._dictionary

    def search(self, query):
        query = checked_text(query, "từ tìm kiếm", 80).strip().lower()
        words = [item for item in self.words.values() if not query or query in item["word"].lower() or query in item["meaning"].lower()]
        exact = []
        suggestions = []
        if query:
            dictionary = self.dictionary()
            exact = dictionary.get(query, [])
            suggestions = [term for term in dictionary if term.startswith(query)][:15]
        return {"words": words[:120], "pronunciations": exact, "suggestions": suggestions,
                "query": query, "alphabet": "ARPAbet", "dictionary_count": len(self.dictionary())}

    def dashboard(self):
        settings = self.settings()
        with self.connect() as db:
            count = db.execute("SELECT COUNT(*) FROM attempts").fetchone()[0]
            first = db.execute("""SELECT AVG(a.score) FROM attempts a WHERE kind='dictation'
                AND assisted=0 AND listens=1 AND NOT EXISTS
                (SELECT 1 FROM attempts b WHERE b.item_id=a.item_id AND b.kind=a.kind AND b.rowid<a.rowid)""").fetchone()[0]
            days = [row[0] for row in db.execute("SELECT day FROM completed ORDER BY day")]
            learned = db.execute("SELECT COUNT(*) FROM reviews WHERE last_rating IN ('good','easy')").fetchone()[0]
            history = [dict(row) for row in db.execute("SELECT item_id, kind, score, assisted, created, result FROM attempts ORDER BY rowid DESC LIMIT 20")]
            activity = [dict(row) for row in db.execute("SELECT substr(created,1,10) AS date, COUNT(*) AS count FROM attempts GROUP BY substr(created,1,10) ORDER BY date DESC LIMIT 14")]
        for row in history:
            row["result"] = json.loads(row["result"])
        day = next((value for value in range(1, 91) if value not in days), 90)
        return {"settings": settings, "day": day, "completed_days": days, "history": history, "activity": activity,
                "stats": {"attempts": count, "first_listen_score": round(first) if first is not None else None,
                          "learned": learned, "completed": len(days), "due": len(self.reviews())},
                "content": {"words": len(self.words), "sentences": len(self.sentences), "units": 12}}

    def export(self):
        with self.connect() as db:
            return {"version": 1, "settings": self.settings(),
                    "attempts": [dict(row) for row in db.execute("SELECT * FROM attempts ORDER BY rowid")],
                    "reviews": [dict(row) for row in db.execute("SELECT * FROM reviews ORDER BY item_id")],
                    "review_events": [dict(row) for row in db.execute("SELECT * FROM review_events ORDER BY rowid")],
                    "completed": [dict(row) for row in db.execute("SELECT * FROM completed ORDER BY day")],
                    "phoneme_progress": [dict(row) for row in db.execute("SELECT * FROM phoneme_progress ORDER BY id")]}

    def restore(self, data):
        if not isinstance(data, dict) or data.get("version") != 1:
            raise ValueError("Bản sao lưu không đúng định dạng phiên bản 1.")
        required = {"settings", "attempts", "reviews", "review_events", "completed"}
        if not required.issubset(data) or any(not isinstance(data[key], list) for key in required - {"settings"}):
            raise ValueError("Bản sao lưu thiếu dữ liệu.")
        # Validate in an isolated temporary store, then atomically replace only learning data.
        import tempfile
        with tempfile.TemporaryDirectory() as temp:
            staging = Store(Path(temp))
            settings = data["settings"]
            if not isinstance(settings, dict):
                raise ValueError("Cài đặt trong bản sao lưu không hợp lệ.")
            staging.settings({k: v for k, v in settings.items() if k != "start_date"})
            date.fromisoformat(settings.get("start_date", ""))
            for row in data["attempts"]:
                checked_int(row["score"], "điểm", 0, 100)
                if row["item_id"] not in self.sentences and row["item_id"] not in self.words:
                    raise ValueError("Bản sao lưu chứa bài học không có trong gói này.")
                checked_int(row["day"], "ngày", 1, 90)
                checked_text(row["answer"], "đáp án")
                parsed = json.loads(row["result"])
                if not isinstance(parsed, dict):
                    raise ValueError("Kết quả bài làm không hợp lệ.")
            for row in data["reviews"]:
                if row["item_id"] not in self.words or row["last_rating"] not in ("again", "hard", "good", "easy"):
                    raise ValueError("Mục ôn không hợp lệ.")
                date.fromisoformat(row["due"])
                checked_int(row["interval"], "khoảng ôn", 0, 180)
            for row in data["review_events"]:
                if row["item_id"] not in self.words or row["rating"] not in ("again", "hard", "good", "easy"):
                    raise ValueError("Lịch sử ôn không hợp lệ.")
            for row in data["completed"]:
                checked_int(row["day"], "ngày", 1, 90)
            phoneme_rows = data.get('phoneme_progress', [])
            if not isinstance(phoneme_rows, list):
                raise ValueError('Tiến độ IPA không hợp lệ.')
            for row in phoneme_rows:
                staging.phoneme_progress(row)
            try:
                with self.connect() as db:
                    for table in ("attempts", "reviews", "review_events", "completed"):
                        columns = [row[1] for row in db.execute("PRAGMA table_info(" + table + ")")]
                        db.execute("DELETE FROM " + table)
                        sql = "INSERT INTO " + table + " VALUES (" + ",".join("?" for _ in columns) + ")"
                        db.executemany(sql, [[row[column] for column in columns] for row in data[table]])
                    db.execute("UPDATE settings SET data=? WHERE id=1", (json.dumps(settings),))
                    db.execute('DELETE FROM phoneme_progress')
                    db.executemany('INSERT INTO phoneme_progress VALUES (?,?,?)',
                                   [(row['id'],row['comfort'],row['updated']) for row in phoneme_rows])
            except (sqlite3.Error, KeyError, TypeError) as error:
                raise ValueError("Bản sao lưu chứa dữ liệu không hợp lệ.") from error
        return {"restored": True}
