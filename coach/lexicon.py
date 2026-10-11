"""Read-only indexed dwyl vocabulary joined with verified CMU pronunciations."""
import csv
import json
import os
import re
import sqlite3
import threading
import uuid
from pathlib import Path

from .content import ROOT, load_content

BUILD_LOCK = threading.Lock()
SCHEMA_VERSION = 3
PHONES = {'AA':'ɑ','AE':'æ','AH':'ʌ','AO':'ɔ','AW':'aʊ','AY':'aɪ','B':'b','CH':'tʃ',
          'D':'d','DH':'ð','EH':'ɛ','ER':'ɝ','EY':'eɪ','F':'f','G':'ɡ','HH':'h','IH':'ɪ',
          'IY':'iː','JH':'dʒ','K':'k','L':'l','M':'m','N':'n','NG':'ŋ','OW':'oʊ','OY':'ɔɪ',
          'P':'p','R':'ɹ','S':'s','SH':'ʃ','T':'t','TH':'θ','UH':'ʊ','UW':'uː','V':'v','W':'w','Y':'j','Z':'z','ZH':'ʒ'}


def to_ipa(pronunciation):
    result = []
    for phone in pronunciation.split():
        base = re.sub('[012]', '', phone)
        symbol = 'ə' if phone == 'AH0' else 'ɚ' if phone == 'ER0' else PHONES.get(base, base)
        # Fallback only: omit stress rather than invent syllable boundaries.
        result.append(symbol)
    return ''.join(result)


def load_phonemes():
    with (ROOT / 'content/phonemes.tsv').open(encoding='utf-8') as source:
        return list(csv.DictReader(source, delimiter='\t'))


class Lexicon:
    def __init__(self, path):
        self.path = Path(path).resolve()
        self.phonemes = {p['id']: p for p in load_phonemes()}
        with BUILD_LOCK:
            outdated = not self.path.exists()
            if not outdated:
                try:
                    with self.connect() as db:
                        outdated = (db.execute('PRAGMA user_version').fetchone()[0] != SCHEMA_VERSION
                                    or db.execute("SELECT COUNT(*) FROM meta WHERE key IN ('words','with_meaning','with_ipa')").fetchone()[0] != 3
                                    or db.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('words','ipa','definitions','forms','frequencies')").fetchone()[0] != 5)
                except sqlite3.DatabaseError:
                    outdated = True
            if outdated:
                self.build()

    def connect(self):
        db = sqlite3.connect(self.path.as_uri() + '?mode=ro', uri=True)
        db.row_factory = sqlite3.Row
        return db

    def build(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        # Separate processes may start simultaneously; each builds its own complete file.
        temporary = self.path.with_name(self.path.name + '.' + uuid.uuid4().hex + '.building')
        words_file = ROOT / 'vendor/words.txt'
        cmu_file = ROOT / 'vendor/cmudict.dict'
        if not words_file.exists() or not cmu_file.exists():
            raise RuntimeError('Thiếu dữ liệu từ điển trong vendor. Xem README để khôi phục dữ liệu.')
        words = [line.strip() for line in words_file.read_text(encoding='utf-8').splitlines() if line.strip()]
        pronunciations = {}
        for line in cmu_file.read_text(encoding='utf-8').splitlines():
            term, _, phones = line.partition(' ')
            if not phones or term.startswith(';;;'):
                continue
            term = re.sub(r'\(\d+\)$', '', term).lower()
            phones = phones.split(' #')[0]
            pronunciations.setdefault(term, []).append(phones)
        try:
            with sqlite3.connect(str(temporary)) as db:
                db.executescript('''
                    CREATE TABLE words (id INTEGER PRIMARY KEY, word TEXT UNIQUE, key TEXT NOT NULL, pronunciations TEXT NOT NULL);
                    CREATE TABLE sounds (word_id INTEGER NOT NULL, phoneme TEXT NOT NULL, PRIMARY KEY(phoneme,word_id));
                    CREATE TABLE meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
                ''')
                db.executemany('INSERT OR IGNORE INTO words(word,key,pronunciations) VALUES (?,?,?)',
                               ((word, word.lower(), json.dumps(pronunciations.get(word.lower(), []))) for word in words))
                sound_rows = []
                for word_id, raw in db.execute("SELECT id,pronunciations FROM words WHERE pronunciations!='[]'"):
                    originals = [' ' + p + ' ' for p in json.loads(raw)]
                    plain = [re.sub('[012]', '', p) for p in originals]
                    for phoneme in self.phonemes.values():
                        patterns = phoneme['pattern'].split(',')
                        if any(any(' ' + pattern + ' ' in p for p in (originals if re.search('[012]',pattern) else plain)) for pattern in patterns):
                            sound_rows.append((word_id, phoneme['id']))
                db.executemany('INSERT INTO sounds VALUES (?,?)', sound_rows)
                db.execute('CREATE INDEX words_key ON words(key,word)')
                db.executemany('INSERT INTO meta VALUES (?,?)', [
                    ('source_lines', len(words)), ('words', db.execute('SELECT COUNT(*) FROM words').fetchone()[0]),
                    ('with_pronunciation', db.execute("SELECT COUNT(*) FROM words WHERE pronunciations!='[]'").fetchone()[0])])
                self.enrich(db)
                db.execute('PRAGMA user_version = 3')
            os.replace(temporary, self.path)
        finally:
            temporary.unlink(missing_ok=True)

    def enrich(self, db):
        """Index licensed source data locally; never call a translation service."""
        db.executescript('''
            CREATE TABLE ipa (key TEXT PRIMARY KEY, pronunciations TEXT NOT NULL);
            CREATE TABLE definitions (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
            CREATE TABLE forms (key TEXT NOT NULL, definition_id TEXT NOT NULL,
                                PRIMARY KEY(key, definition_id));
            CREATE TABLE frequencies (key TEXT PRIMARY KEY, frequency REAL NOT NULL);
        ''')
        ipa_path = ROOT / 'vendor/ipa-en_US.txt'
        entries_path = ROOT / 'vendor/thichhoc/entries'
        shards = sorted(entries_path.glob('*.jsonl'))
        if not ipa_path.exists() or not shards:
            raise RuntimeError('Thiếu nguồn IPA hoặc nghĩa Việt trong vendor. Xem README để khôi phục.')
        with ipa_path.open(encoding='utf-8') as source:
            for line in source:
                key, _, value = line.strip().partition('\t')
                variants = [v.strip().strip('/') for v in value.split(',') if v.strip()]
                if variants:
                    db.execute('INSERT OR REPLACE INTO ipa VALUES (?,?)',
                               (key.lower(), json.dumps(variants, ensure_ascii=False)))
        for shard in shards:
            with shard.open(encoding='utf-8') as source:
                for line in source:
                    entry = json.loads(line)
                    if not entry.get('senses_vi'):
                        continue
                    payload = {'headword':entry['headword'], 'pos':entry['pos'],
                               'senses':entry['senses_vi'], 'source':'thichhoc',
                               'reviewed':bool(entry.get('reviewed', False))}
                    db.execute('INSERT INTO definitions VALUES (?,?)',
                               (entry['id'], json.dumps(payload, ensure_ascii=False)))
                    forms = {entry['headword'].lower()}
                    forms.update(f.lower() for f in entry.get('inflections', []))
                    forms.update(f.lower() for f in entry.get('variants', []))
                    db.executemany('INSERT INTO forms VALUES (?,?)',
                                   ((form, entry['id']) for form in forms))
                    db.executemany('INSERT INTO frequencies VALUES (?,?) ON CONFLICT(key) DO UPDATE SET frequency=MAX(frequency,excluded.frequency)',
                                   ((form, float(entry.get('freq', 0))) for form in forms))
        for word in load_content()['words']:
            payload = {'headword':word['word'], 'pos':'', 'senses':[word['meaning']],
                       'source':'lesson', 'reviewed':False}
            db.execute('INSERT INTO definitions VALUES (?,?)',
                       (word['id'], json.dumps(payload, ensure_ascii=False)))
            db.execute('INSERT INTO forms VALUES (?,?)', (word['word'].lower(), word['id']))
        db.executemany('INSERT INTO meta VALUES (?,?)', [
            ('with_meaning', db.execute('SELECT COUNT(*) FROM words w WHERE EXISTS (SELECT 1 FROM forms f WHERE f.key=w.key)').fetchone()[0]),
            ('with_ipa', db.execute("SELECT COUNT(*) FROM words w WHERE w.pronunciations!='[]' OR EXISTS (SELECT 1 FROM ipa i WHERE i.key=w.key)").fetchone()[0]),
            ('definition_entries', db.execute('SELECT COUNT(*) FROM definitions').fetchone()[0])])

    def entry(self, db, row):
        key = row['word'].lower()
        ipa = db.execute('SELECT pronunciations FROM ipa WHERE key=?', (key,)).fetchone()
        if ipa:
            pronunciations = [{'ipa':p, 'source':'ipa-dict'} for p in json.loads(ipa[0])]
        else:
            pronunciations = [{'arpabet':p, 'ipa':to_ipa(p), 'source':'cmu-converted'}
                              for p in json.loads(row['pronunciations'])]
        definitions = []
        for definition in db.execute('SELECT d.payload FROM forms f JOIN definitions d ON d.id=f.definition_id WHERE f.key=? ORDER BY d.id', (key,)):
            item = json.loads(definition[0])
            item['inflected'] = item['headword'].lower() != key
            definitions.append(item)
        definitions.sort(key=lambda d: (d['source']!='lesson', d['inflected']))
        return {'word':row['word'], 'pronunciations':pronunciations, 'definitions':definitions}

    def stats(self):
        with self.connect() as db:
            return {row['key']: row['value'] for row in db.execute('SELECT * FROM meta')}

    def counts(self):
        with self.connect() as db:
            return {row['phoneme']:row['count'] for row in db.execute('SELECT phoneme,COUNT(*) AS count FROM sounds GROUP BY phoneme')}

    def contains(self, word):
        with self.connect() as db:
            return db.execute('SELECT 1 FROM words WHERE key=? LIMIT 1', (word.lower(),)).fetchone() is not None

    def search(self, query='', phoneme='', page=1, limit=30):
        if not isinstance(query,str) or len(query)>80 or type(page) is not int or not 1<=page<=20000:
            raise ValueError('Từ tìm kiếm hoặc số trang không hợp lệ.')
        if type(limit) is not int or not 1 <= limit <= 100:
            raise ValueError('Số mục mỗi trang không hợp lệ.')
        if phoneme and phoneme not in self.phonemes:
            raise ValueError('Không tìm thấy âm này.')
        query=query.strip().lower()
        conditions, parameters = [], []
        if query:
            # Prefix range uses the index; wildcard characters remain literal.
            conditions.append('w.key>=? AND w.key<?')
            parameters += [query, query+'\U0010ffff']
        if phoneme:
            conditions.append('s.phoneme=?')
            parameters.append(phoneme)
        base = 'FROM words w' + (' JOIN sounds s ON s.word_id=w.id' if phoneme else '')
        ranked = bool(phoneme and not query)
        if ranked:
            base += ' LEFT JOIN frequencies rank ON rank.key=w.key'
        if conditions:
            base += ' WHERE ' + ' AND '.join(conditions)
        with self.connect() as db:
            total=db.execute('SELECT COUNT(*) '+base, parameters).fetchone()[0]
            order = 'COALESCE(rank.frequency,0) DESC,w.key,w.word' if ranked else 'w.key,w.word'
            rows=db.execute('SELECT w.word,w.pronunciations '+base+' ORDER BY '+order+' LIMIT ? OFFSET ?',
                            parameters+[limit,(page-1)*limit]).fetchall()
            items = [self.entry(db, row) for row in rows]
        return {'items':items,'total':total,'page':page,'limit':limit,'query':query,'phoneme':phoneme,
                'stats':self.stats(),'ipa_note':'IPA Mỹ từ ipa-dict. Mục chỉ có CMU được chuyển âm và chưa có dấu nhấn; nghĩa Việt nguồn thichhoc là bản dịch máy chưa kiểm duyệt.'}
