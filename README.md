# Meme Vault

Gallery meme chạy local bằng Python, UI web hiện đại có hiệu ứng 3D card tilt. Bạn chỉ cần thêm ảnh vào thư mục `memes/`, app sẽ tự quét và hiển thị.

## Cách chạy bằng PyCharm

1. Mở thư mục `meme-gallery` bằng PyCharm.
2. Thêm ảnh vào thư mục `memes/`. Có thể tạo folder con, app sẽ đọc đệ quy.
3. Chạy file `app.py`.
4. Mở `http://127.0.0.1:8000` trong trình duyệt.

Không cần cài thêm thư viện Python.

## Cách thêm ảnh

- Copy ảnh vào `memes/`.
- Hỗ trợ: `jpg`, `jpeg`, `png`, `gif`, `webp`, `svg`, `bmp`, `avif`, `heic`, `heif`, `apng`.
- Nếu app đang mở, bấm nút refresh ở góc phải trên để quét lại.

## Chạy bằng terminal

```bash
python app.py
```

Đổi port nếu cần:

```bash
python app.py --port 8080
```

## Deploy web

App đọc biến môi trường `HOST` và `PORT`, nên có thể deploy lên các host Python cơ bản:

```bash
HOST=0.0.0.0 PORT=8000 python app.py
```

Nếu dùng Windows PowerShell:

```powershell
$env:HOST="0.0.0.0"
$env:PORT="8000"
python app.py
```

Lưu ý: khi deploy online, thư mục `memes/` cần được upload cùng code hoặc mount thành persistent storage nếu bạn muốn thêm ảnh sau khi deploy.

Project cũng có sẵn:

- `Dockerfile` để deploy dạng container.
- `Procfile` cho host kiểu Render/Railway/Heroku-compatible.
- `requirements.txt` trống vì app không cần thư viện ngoài.
