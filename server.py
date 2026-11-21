"""Local, read-only course server. No code execution endpoints."""
import json
from functools import lru_cache
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import markdown

ROOT = Path(__file__).resolve().parent


@lru_cache(maxsize=1)
def course():
    manifest = json.loads((ROOT / 'course/manifest.json').read_text(encoding='utf-8'))
    for lesson in manifest['lessons']:
        source = (ROOT / 'course' / lesson['file']).read_text(encoding='utf-8')
        lesson['html'] = markdown.markdown(source, extensions=['fenced_code', 'tables', 'toc'])
    return json.dumps(manifest, ensure_ascii=False).encode('utf-8')


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'web'), **kwargs)

    def do_GET(self):
        if urlparse(self.path).path == '/api/course':
            body = course()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()


if __name__ == '__main__':
    course()  # Fail early on missing or invalid course content.
    print('Курс: http://localhost:8080', flush=True)
    ThreadingHTTPServer(('0.0.0.0', 8080), Handler).serve_forever()
