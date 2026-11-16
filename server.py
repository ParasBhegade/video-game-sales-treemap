#!/usr/bin/env python3
"""Serve the Play / Field treemap and its local dataset."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8000"))


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path.rstrip("/") == "/api/data":
            self.serve_data()
            return
        super().do_GET()

    def serve_data(self):
        data_path = ROOT / "data.json"
        try:
            with data_path.open("r", encoding="utf-8") as data_file:
                payload = json.load(data_file)
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        except (OSError, json.JSONDecodeError) as error:
            self.send_error(500, f"Could not load the game sales dataset: {error}")
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), AppHandler)
    print(f"Play / Field is available at http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
    finally:
        server.server_close()
