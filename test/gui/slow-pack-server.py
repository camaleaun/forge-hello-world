#!/usr/bin/env python3
"""Serves one language pack slowly so a screenshot can catch the download in progress.

Usage: slow-pack-server.py <pack-file> <port-file> [pause-seconds]

It listens on 127.0.0.1 (a free port, written to <port-file>), answers every GET with the pack,
sends the first quarter of it, waits <pause-seconds> (default 12), then sends the rest.
Loopback http is the only plain-http address a forge app accepts for downloads.
"""
import http.server
import sys
import time

pack_file, port_file = sys.argv[1], sys.argv[2]
pause = float(sys.argv[3]) if len(sys.argv) > 3 else 12.0
body = open(pack_file, 'rb').read()


class Slow(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        cut = max(1, len(body) // 4)
        self.wfile.write(body[:cut])
        self.wfile.flush()
        time.sleep(pause)
        self.wfile.write(body[cut:])

    def log_message(self, *args):
        pass


server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Slow)
with open(port_file, 'w') as handle:
    handle.write(str(server.server_address[1]))
server.serve_forever()
