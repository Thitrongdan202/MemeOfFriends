from __future__ import annotations

import argparse
import json
import mimetypes
import os
from datetime import datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, unquote, urlparse


BASE_DIR = Path(__file__).resolve().parent
MEME_DIR = BASE_DIR / "memes"
STATIC_DIR = BASE_DIR / "static"
INDEX_FILE = STATIC_DIR / "index.html"

IMAGE_EXTENSIONS = {
    ".apng",
    ".avif",
    ".bmp",
    ".gif",
    ".heic",
    ".heif",
    ".jpeg",
    ".jpg",
    ".png",
    ".svg",
    ".webp",
}


def safe_relative_path(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def is_image(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS


def scan_memes() -> list[dict[str, object]]:
    MEME_DIR.mkdir(parents=True, exist_ok=True)
    files = [path for path in MEME_DIR.rglob("*") if is_image(path)]
    files.sort(key=lambda item: item.stat().st_mtime, reverse=True)

    memes: list[dict[str, object]] = []
    for index, path in enumerate(files, start=1):
        stat = path.stat()
        relative = safe_relative_path(path, MEME_DIR)
        folder = Path(relative).parent.as_posix()
        folder = "" if folder == "." else folder
        memes.append(
            {
                "id": index,
                "name": path.stem,
                "filename": path.name,
                "folder": folder or "memes",
                "relativePath": relative,
                "url": f"/memes/{quote(relative)}",
                "size": stat.st_size,
                "updatedAt": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "extension": path.suffix.lower().replace(".", ""),
            }
        )
    return memes


class MemeGalleryHandler(SimpleHTTPRequestHandler):
    server_version = "MemeGallery/1.0"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path == "/api/memes":
            self.send_json({"memes": scan_memes()})
            return

        if path == "/" or path == "/index.html":
            self.send_file(INDEX_FILE)
            return

        if path.startswith("/static/"):
            self.send_from_root(STATIC_DIR, path.removeprefix("/static/"))
            return

        if path.startswith("/memes/"):
            self.send_from_root(MEME_DIR, path.removeprefix("/memes/"))
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, payload: dict[str, object]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, file_path: Path) -> None:
        if not file_path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return

        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        body = file_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_from_root(self, root: Path, relative_url_path: str) -> None:
        root = root.resolve()
        requested = (root / relative_url_path).resolve()

        if root not in requested.parents and requested != root:
            self.send_error(HTTPStatus.FORBIDDEN, "Forbidden")
            return

        if not requested.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return

        self.send_file(requested)

    def log_message(self, format: str, *args: object) -> None:
        print(f"[meme-gallery] {self.address_string()} - {format % args}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the local meme gallery.")
    parser.add_argument("--host", default=os.getenv("HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", "8000")))
    return parser.parse_args()


def main() -> None:
    MEME_DIR.mkdir(parents=True, exist_ok=True)
    args = parse_args()
    server = ThreadingHTTPServer((args.host, args.port), MemeGalleryHandler)
    url_host = "127.0.0.1" if args.host in {"0.0.0.0", "::"} else args.host
    print(f"Meme Gallery is running at http://{url_host}:{args.port}")
    print(f"Drop images into: {MEME_DIR}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Meme Gallery...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
