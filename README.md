# Danh Ngu 

Website lookbook meme chạy local bằng Python, thiết kế như một campaign thời trang cao cấp nhưng nội dung dành riêng để trêu người bạn trong ảnh. Toàn bộ giao diện tự đọc ảnh từ thư mục `memes/`.

## Giao diện

- Hero toàn màn hình tự chuyển ảnh như campaign thời trang.
- Ticker chuyển động, hiệu ứng parallax và các section xuất hiện khi cuộn.
- Manifesto, thống kê và caption lookbook hài hước.
- Lookbook bất đối xứng, tìm kiếm, lọc folder và sắp xếp ảnh.
- Runway View 3D hỗ trợ nút điều hướng, phím mũi tên, con lăn, kéo chuột và vuốt điện thoại.
- Responsive cho desktop và mobile.

## Chạy bằng PyCharm

1. Mở thư mục `meme-gallery` bằng PyCharm.
2. Chạy file `app.py`.
3. Mở `http://127.0.0.1:8000` trong trình duyệt.

Ứng dụng không cần cài thêm thư viện Python.

## Thêm ảnh

1. Copy ảnh vào thư mục `memes/`. Có thể tạo nhiều folder con.
2. Nếu website đang mở, bấm nút quét lại ở góc phải trên.
3. Hero, thống kê, bộ lọc và lookbook sẽ tự cập nhật.

Định dạng hỗ trợ: `jpg`, `jpeg`, `png`, `gif`, `webp`, `svg`, `bmp`, `avif`, `heic`, `heif`, `apng`.

## Chạy bằng terminal

```bash
python app.py
```

Đổi port nếu cần:

```bash
python app.py --port 8080
```

## Deploy web

Ứng dụng đọc biến môi trường `HOST` và `PORT`:

```bash
HOST=0.0.0.0 PORT=8000 python app.py
```

Windows PowerShell:

```powershell
$env:HOST="0.0.0.0"
$env:PORT="8000"
python app.py
```

Khi deploy online, upload thư mục `memes/` cùng source hoặc mount thành persistent storage. Project có sẵn `Dockerfile`, `Procfile` và `requirements.txt`.
