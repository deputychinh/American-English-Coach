import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

from coach.server import create_server


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.server = create_server(Path(cls.temp.name), 0)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = 'http://127.0.0.1:%d' % cls.server.server_port

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.temp.cleanup()

    def request(self, path, payload=None, headers=None):
        request = urllib.request.Request(self.url + path,
            data=json.dumps(payload).encode() if payload is not None else None,
            headers=headers or {})
        return urllib.request.urlopen(request)

    def test_bootstrap_and_static_assets(self):
        with self.request('/api/bootstrap') as response:
            data = json.load(response)
        self.assertIn('token', data)
        self.assertEqual(data['dashboard']['content']['words'], 120)
        with self.request('/') as response:
            self.assertIn(b'<html', response.read())
            self.assertIn("default-src 'self'", response.headers['Content-Security-Policy'])

    def test_post_requires_local_token(self):
        with self.assertRaises(urllib.error.HTTPError) as context:
            self.request('/api/settings', {'name': 'attacker'})
        self.assertEqual(context.exception.code, 403)

    def test_dictionary_meaning_ipa_and_local_font(self):
        with self.request('/api/lexicon?q=geese') as response:
            result = json.load(response)
        word = next(w for w in result['items'] if w['word']=='geese')
        self.assertTrue(word['definitions'])
        self.assertTrue(word['pronunciations'])
        self.assertEqual(result['stats']['words'], 466550)
        with self.request('/NotoSans.ttf') as response:
            self.assertGreater(len(response.read()), 1000)

    def test_settings_validated_and_persisted(self):
        with self.request('/api/bootstrap') as response:
            token = json.load(response)['token']
        headers = {'X-Coach-Token': token, 'Content-Type': 'application/json'}
        with self.request('/api/settings', {'name': 'Test', 'minutes': 30}, headers) as response:
            self.assertEqual(json.load(response)['minutes'], 30)
        with self.assertRaises(urllib.error.HTTPError) as context:
            self.request('/api/settings', {'minutes': 999}, headers)
        self.assertEqual(context.exception.code, 400)

    def test_cross_origin_and_path_traversal_rejected(self):
        with self.assertRaises(urllib.error.HTTPError) as context:
            self.request('/api/bootstrap', headers={'Origin': 'https://example.com'})
        self.assertEqual(context.exception.code, 403)
        with self.assertRaises(urllib.error.HTTPError):
            self.request('/%2e%2e/coach/store.py')

    def test_oversized_body_and_missing_resource(self):
        with self.assertRaises(urllib.error.HTTPError) as context:
            self.request('/api/lesson?day=0')
        self.assertEqual(context.exception.code, 400)
        with self.assertRaises(urllib.error.HTTPError) as context:
            self.request('/api/not-real')
        self.assertEqual(context.exception.code, 404)


if __name__ == '__main__':
    unittest.main()
