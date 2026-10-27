#!/usr/bin/env python3
"""Preview the site locally:  python serve.py   (Windows, macOS and Linux)"""
import http.server
import socketserver
import subprocess
import sys
import threading
import webbrowser
from pathlib import Path

PORT = 8000
here = Path(__file__).resolve().parent

# Refresh the exercise menu first.
subprocess.run([sys.executable, str(here / "tools" / "build_manifest.py")], check=False)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(here), **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


Handler.extensions_map.update({".py": "text/plain", ".txt": "text/plain", ".js": "text/javascript"})
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), Handler) as httpd:
    url = f"http://localhost:{PORT}/"
    print(f"Serving {here}\nOpen {url}  (Ctrl+C to stop)")
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
