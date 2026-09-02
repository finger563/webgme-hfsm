#!/usr/bin/env python3
"""Serve the built playground, with caching off.

`python3 -m http.server` sends no cache headers at all, so a browser
applies its own heuristics and goes on serving a module it fetched
before the last build. The page then does not change when the code
does -- which reads as a bug in the page, and costs an afternoon
before anyone suspects the server.

Usage: scripts/serve-web.py [dir] [port]
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


def main():
    directory = sys.argv[1] if len(sys.argv) > 1 else 'dist/web'
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8080
    print('serving %s at http://localhost:%d (caching off)' % (directory, port))
    handler = lambda *a, **kw: NoCache(*a, directory=directory, **kw)
    ThreadingHTTPServer(('', port), handler).serve_forever()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        pass
