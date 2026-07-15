from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import unicodedata
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
VIDEO_EXTENSIONS = {
    ".m4v",
    ".mov",
    ".mp4",
    ".ogv",
    ".webm",
}
MEDIA_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS

STORY_CHAPTERS = (
    ("DANH NHẬP VAI", "giữa một buổi chụp hoàn toàn không có ngân sách"),
    ("ĐẠI ÁN MÀU XANH", "khi màu xanh bắt đầu chiếm quyền điều khiển khung hình"),
    ("CA LÀM KHÔNG LƯƠNG", "trong ca trực mà Danh không hề đăng ký"),
    ("THẦN THÁI THẤT LẠC", "ngay lúc thần thái rời khỏi hiện trường vài phút"),
    ("NHIỆM VỤ BẤT KHẢ THI", "trước một nhiệm vụ chỉ Duy biết kịch bản"),
    ("HẬU TRƯỜNG BẤT ỔN", "ở hậu trường nơi mọi quyết định đều đáng ngờ"),
    ("DANH LƯU LẠC", "trên hành trình không bản đồ và cũng không stylist"),
    ("HỒ SƠ TUYỆT MẬT", "trong hồ sơ Duy vừa kịp lưu trước khi Danh phát hiện"),
)

STORY_ACTIONS = (
    "bước vào khung hình với sự tự tin chưa được kiểm chứng",
    "cố cứu vãn tình hình bằng một ánh nhìn mang tính chiến lược",
    "đứng yên nhưng vẫn khiến cốt truyện rẽ sang hướng khác",
    "nhận vai chính trước khi kịp đọc điều khoản tham gia",
    "kích hoạt tuyệt chiêu giữ form trong mọi hoàn cảnh",
    "biến một khoảnh khắc bình thường thành tư liệu cấp quốc gia",
    "đối diện ống kính như thể đây là buổi casting cuối cùng",
    "thực hiện kế hoạch không ai duyệt nhưng Duy vẫn bấm máy",
)

STORY_TWISTS = (
    "Kế hoạch không thành công, nhưng bức meme thì có.",
    "Không ai bị thương, ngoại trừ hình tượng của nhân vật chính.",
    "Danh tưởng mọi chuyện đã kết thúc; Duy thì vừa nhấn lưu.",
    "Bằng chứng này lập tức được niêm phong vào Danh lưu phiêu ký.",
    "Kết quả vượt ngoài dự báo và thấp hơn kỳ vọng của Danh.",
    "Đây là lúc lịch sử thời trang quyết định quay mặt đi.",
    "Duy là nhân chứng duy nhất và cũng là người dựng nên toàn bộ vụ án.",
    "Từ đây, biệt danh Danh Ngu có thêm một tư liệu tham khảo.",
)

SPECIAL_STORY_SCENES = (
    (("alien",), "DANH NGOÀI HÀNH TINH", "giữa tín hiệu báo động từ một con tàu ngoài không gian"),
    (("gojo", "luffy", "anime"), "DANH BƯỚC VÀO ANIME", "khi Danh vô tình đi nhầm vào một vũ trụ anime"),
    (("phuquoc", "phu quoc"), "CHUYẾN ĐI PHÚ QUỐC", "trong chuyến du lịch mà camera của Duy không hề nghỉ phép"),
    (("yamaha", "freego", "xe"), "DANH VÀ TỐC ĐỘ", "bên cỗ máy được quảng cáo nhanh hơn tốc độ Danh hiểu tình hình"),
    (("gemini", "chatgpt", "generated", "tao video", "bien hinh"), "DANH TRONG VŨ TRỤ AI", "sau khi Duy giao hình tượng của Danh cho trí tuệ nhân tạo"),
)


def safe_relative_path(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def is_media(path: Path) -> bool:
    return path.is_file() and path.stat().st_size > 0 and path.suffix.lower() in MEDIA_EXTENSIONS


def normalize_story_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(character for character in normalized if not unicodedata.combining(character)).casefold()


def build_story(relative_path: str, media_type: str, episode: int) -> dict[str, str]:
    digest = hashlib.sha256(relative_path.casefold().encode("utf-8")).digest()
    story_key = normalize_story_key(relative_path)
    chapter, scene = STORY_CHAPTERS[digest[0] % len(STORY_CHAPTERS)]

    for keywords, special_chapter, special_scene in SPECIAL_STORY_SCENES:
        if any(keyword in story_key for keyword in keywords):
            chapter, scene = special_chapter, special_scene
            break
    else:
        if media_type == "video":
            chapter = "THƯỚC PHIM THẤT LẠC"
            scene = "trong đoạn phim chuyển động mà Danh từng hy vọng sẽ không được phát lại"

    action = STORY_ACTIONS[digest[1] % len(STORY_ACTIONS)]
    twist = STORY_TWISTS[digest[2] % len(STORY_TWISTS)]
    format_note = "Đoạn phim" if media_type == "video" else "Bức ảnh"

    return {
        "chapter": chapter,
        "storyTitle": f"HỒI {episode:03d} · {chapter}",
        "story": f"Duy mở hồ sơ {episode:03d}: {scene}, Danh {action}. {twist} {format_note} này là bản ghi độc quyền của Duy.",
    }


def scan_memes() -> list[dict[str, object]]:
    MEME_DIR.mkdir(parents=True, exist_ok=True)
    files = [path for path in MEME_DIR.rglob("*") if is_media(path)]
    files.sort(key=lambda item: item.stat().st_mtime, reverse=True)

    memes: list[dict[str, object]] = []
    for index, path in enumerate(files, start=1):
        stat = path.stat()
        relative = safe_relative_path(path, MEME_DIR)
        folder = Path(relative).parent.as_posix()
        folder = "" if folder == "." else folder
        extension = path.suffix.lower()
        media_type = "video" if extension in VIDEO_EXTENSIONS else "image"
        mime_type = mimetypes.guess_type(path.name)[0]
        if not mime_type:
            mime_type = "video/mp4" if extension == ".mp4" else "application/octet-stream"
        story = build_story(relative, media_type, index)
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
                "extension": extension.replace(".", ""),
                "mediaType": media_type,
                "mimeType": mime_type,
                "author": "Duy",
                **story,
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
        if content_type.startswith("text/") or content_type in {
            "application/javascript",
            "application/xml",
            "image/svg+xml",
        }:
            content_type = f"{content_type}; charset=utf-8"
        file_size = file_path.stat().st_size
        range_header = self.headers.get("Range") if content_type.startswith("video/") else None
        start = 0
        end = file_size - 1
        status = HTTPStatus.OK

        if range_header:
            try:
                unit, value = range_header.split("=", 1)
                if unit.strip().lower() != "bytes" or "," in value:
                    raise ValueError
                start_text, end_text = value.strip().split("-", 1)
                if start_text:
                    start = int(start_text)
                    end = int(end_text) if end_text else file_size - 1
                else:
                    suffix_length = int(end_text)
                    if suffix_length <= 0:
                        raise ValueError
                    start = max(file_size - suffix_length, 0)
                    end = file_size - 1
                if start < 0 or start >= file_size or end < start:
                    raise ValueError
                end = min(end, file_size - 1)
                status = HTTPStatus.PARTIAL_CONTENT
            except (TypeError, ValueError):
                self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                self.send_header("Content-Range", f"bytes */{file_size}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return

        content_length = end - start + 1
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(content_length))
        if content_type.startswith("video/"):
            self.send_header("Accept-Ranges", "bytes")
        if status == HTTPStatus.PARTIAL_CONTENT:
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
        self.end_headers()

        try:
            with file_path.open("rb") as file_handle:
                file_handle.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk = file_handle.read(min(64 * 1024, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass

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
    print(f"Drop images and videos into: {MEME_DIR}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Meme Gallery...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
