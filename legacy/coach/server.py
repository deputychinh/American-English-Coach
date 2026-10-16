"""Loopback-only HTTP API and static UI; standard library only."""
import hmac
import json
import logging
import mimetypes
import re
import secrets
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlsplit

from .audio import status, synthesize
from .content import ROOT
from .store import Store, now
from .lexicon import load_phonemes

LOGGER = logging.getLogger("coach")
STATIC = ROOT / "static"
MAX_JSON = 5 * 1024 * 1024
MAX_AUDIO = 12 * 1024 * 1024
CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"


class Handler(BaseHTTPRequestHandler):
    server_version = "EnglishCoach/1.0"

    def log_message(self, fmt, *args):
        LOGGER.info(fmt, *args)

    def local_request(self):
        allowed = {"127.0.0.1:%d" % self.server.server_port, "localhost:%d" % self.server.server_port}
        host = self.headers.get("Host", "")
        origin = self.headers.get("Origin")
        return (host in allowed and (not origin or origin in {"http://" + item for item in allowed})
                and self.headers.get("Sec-Fetch-Site") not in ("cross-site",))

    def send(self, payload, code=200, content_type="application/json; charset=utf-8", extra=None):
        body = json.dumps(payload, ensure_ascii=False).encode() if isinstance(payload, (dict, list)) else payload
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "microphone=(self)")
        self.send_header("Cache-Control", "no-store" if content_type.startswith("application/json") else "no-cache")
        for key, value in (extra or {}).items():
            self.send_header(key, value)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def error(self, message, code=400):
        self.send({"error": message}, code)

    def do_GET(self):
        if not self.local_request():
            return self.error("Chỉ cho phép truy cập từ ứng dụng trên máy này.", 403)
        try:
            self.get_route()
        except (ValueError, KeyError, TypeError) as error:
            self.error(str(error), 400)
        except RuntimeError as error:
            self.error(str(error), 503)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            LOGGER.exception("get_failed path=%s", urlsplit(self.path).path)
            self.error("Không đọc được dữ liệu local. Xem cửa sổ chạy ứng dụng.", 500)

    def get_route(self):
        parsed = urlsplit(self.path)
        query = parse_qs(parsed.query)
        path = unquote(parsed.path)
        store = self.server.store
        if path == "/api/bootstrap":
            return self.send({"token": self.server.token, "dashboard": store.dashboard(),
                              "audio": status(store.directory), "version": "1.0.0"})
        if path == "/api/dashboard":
            return self.send(store.dashboard())
        if path == "/api/lesson":
            return self.send(store.lesson(int(query.get("day", ["1"])[0])))
        if path == "/api/curriculum":
            return self.send(store.curriculum())
        if path == '/api/phonemes':
            counts = store.lexicon().counts()
            return self.send({'phonemes':[dict(p,count=counts.get(p['id'],0)) for p in load_phonemes()],
                              'progress':store.phoneme_progress(), 'stats':store.lexicon().stats()})
        if path == '/api/lexicon':
            return self.send(store.lexicon().search(query.get('q',[''])[0], query.get('phoneme',[''])[0],
                                                   int(query.get('page',['1'])[0])))
        if path == "/api/search":
            return self.send(store.search(query.get("q", [""])[0]))
        if path == "/api/reviews":
            return self.send(store.reviews())
        if path == "/api/export":
            return self.send(store.export(), extra={"Content-Disposition": 'attachment; filename="english-coach-backup.json"'})
        if path == "/api/audio":
            item_id = query.get("id", [""])[0]
            item = store.words.get(item_id) or store.sentences.get(item_id)
            text = (item.get("text", item.get("word")) if item else "")
            if item and query.get("example") == ["1"]:
                text = item.get("example", text)
            if not item:
                term = query.get("word", [""])[0].lower()
                if item_id.startswith('ipa-'):
                    phoneme = next((p for p in load_phonemes() if p['id']==item_id[4:]), None)
                    term = phoneme['example'] if phoneme else ''
                if len(term) > 80 or (term not in store.dictionary() and not store.lexicon().contains(term)):
                    raise ValueError("Không tìm thấy từ để phát âm.")
                text = term
            voice = query.get("voice", [store.settings()["voice"]])[0]
            audio = synthesize(store.directory, text, voice)
            return self.send(audio.read_bytes(), content_type="audio/wav")
        if path == "/api/recordings":
            with store.connect() as db:
                records = [dict(row) for row in db.execute("SELECT * FROM recordings ORDER BY created DESC LIMIT 100")]
            return self.send(records)
        if path.startswith("/recordings/"):
            recording_id = path.removeprefix("/recordings/")
            with store.connect() as db:
                record = db.execute("SELECT * FROM recordings WHERE id=?", (recording_id,)).fetchone()
            if not record:
                return self.error("Không tìm thấy bản ghi.", 404)
            file = store.directory / "recordings" / record["id"]
            if not file.is_file():
                return self.error("File ghi âm không còn trên máy.", 404)
            return self.send(file.read_bytes(), content_type=record["mime"])
        if path.startswith("/api/"):
            return self.error("Không tìm thấy chức năng.", 404)
        relative = "index.html" if path == "/" else path.lstrip("/")
        file = (STATIC / relative).resolve()
        if STATIC.resolve() not in file.parents or not file.is_file():
            return self.error("Không tìm thấy trang.", 404)
        content_type = mimetypes.guess_type(str(file))[0] or "application/octet-stream"
        self.send(file.read_bytes(), content_type=content_type)

    def do_POST(self):
        if not self.local_request() or not hmac.compare_digest(self.headers.get("X-Coach-Token", ""), self.server.token):
            return self.error("Phiên local không hợp lệ. Hãy tải lại trang.", 403)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            path = urlsplit(self.path).path
            limit = MAX_AUDIO if path == "/api/recordings" else MAX_JSON
            if length < 1 or length > limit:
                return self.error("Dữ liệu trống hoặc quá lớn.", 413)
            self.connection.settimeout(30)
            body = self.rfile.read(length)
            if len(body) != length:
                return self.error("Dữ liệu chưa tải đủ.")
            if path == "/api/recordings":
                return self.upload_recording(body)
            if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                return self.error("Yêu cầu dữ liệu JSON.", 415)
            data = json.loads(body)
            if not isinstance(data, dict):
                raise ValueError("Yêu cầu một đối tượng JSON.")
            store = self.server.store
            routes = {"/api/settings": store.settings, "/api/attempt": store.attempt,
                      "/api/review": store.review, "/api/restore": store.restore,
                      '/api/phoneme-progress': store.phoneme_progress}
            if path in routes:
                return self.send(routes[path](data))
            if path == "/api/complete":
                return self.send(store.complete(data.get("day")))
            if path == "/api/recordings/delete":
                recording_id = data.get("id", "")
                if not re.fullmatch(r"[a-f0-9]{32}", recording_id):
                    raise ValueError("Mã bản ghi không hợp lệ.")
                with store.connect() as db:
                    db.execute("DELETE FROM recordings WHERE id=?", (recording_id,))
                (store.directory / "recordings" / recording_id).unlink(missing_ok=True)
                return self.send({"deleted": True})
            self.error("Không tìm thấy chức năng.", 404)
        except (ValueError, KeyError, TypeError, UnicodeError) as error:
            self.error("Dữ liệu không hợp lệ: " + str(error), 400)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            LOGGER.exception("post_failed path=%s", urlsplit(self.path).path)
            self.error("Không lưu được dữ liệu. Hãy thử lại; xem cửa sổ chạy ứng dụng nếu lỗi tiếp tục.", 500)

    def upload_recording(self, body):
        store = self.server.store
        query = parse_qs(urlsplit(self.path).query)
        item_id = query.get("item", [""])[0]
        ipa_ids = {'ipa-'+p['id'] for p in load_phonemes()}
        lexicon_word = item_id[4:] if item_id.startswith('lex-') else ''
        if item_id not in store.sentences and item_id not in ipa_ids and not (lexicon_word and len(lexicon_word)<=80 and store.lexicon().contains(lexicon_word)):
            raise ValueError("Bản ghi cần gắn với một câu luyện.")
        mime = self.headers.get("Content-Type", "").split(";")[0]
        signatures = {"audio/webm": body.startswith(b"\x1aE\xdf\xa3"),
                      "audio/ogg": body.startswith(b"OggS"),
                      "audio/mp4": len(body) > 8 and body[4:8] == b"ftyp",
                      "audio/wav": body.startswith(b"RIFF")}
        if not signatures.get(mime, False):
            raise ValueError("Định dạng bản ghi không hỗ trợ hoặc file bị lỗi.")
        recording_id = uuid.uuid4().hex
        folder = store.directory / "recordings"
        folder.mkdir(exist_ok=True)
        file = folder / recording_id
        file.write_bytes(body)
        try:
            with store.connect() as db:
                db.execute("INSERT INTO recordings VALUES (?,?,?,?)", (recording_id, item_id, mime, now()))
        except Exception:
            file.unlink(missing_ok=True)
            raise
        self.send({"id": recording_id, "url": "/recordings/" + recording_id, "item_id": item_id})


def create_server(directory, port=8765):
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    server.store = Store(directory)
    server.token = secrets.token_urlsafe(32)
    server.daemon_threads = True
    return server
