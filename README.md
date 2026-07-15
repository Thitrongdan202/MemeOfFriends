# Danh Ngu

Website lookbook meme chạy local bằng Python, thiết kế như một campaign thời trang cao cấp dành riêng cho Vũ Hoàng Danh, biệt danh Danh Ngu. Toàn bộ giao diện tự đọc ảnh và video từ thư mục `memes/`, rồi tạo một chương truyện do Duy kể cho từng file.

## Giao diện

- Hero toàn màn hình tự chuyển ảnh như campaign thời trang.
- Ticker chuyển động, hiệu ứng parallax và các section xuất hiện khi cuộn.
- Manifesto, thống kê và caption lookbook hài hước.
- Font sans và serif hỗ trợ đầy đủ tiếng Việt lẫn tiếng Anh, chạy offline không cần tải font ngoài.
- Lookbook bất đối xứng, tìm kiếm, lọc folder và sắp xếp ảnh lẫn video.
- Mỗi ảnh hoặc video có một hồi truyện riêng trong “Danh lưu phiêu ký”, ghi credit cho Duy.
- Runway View 3D hỗ trợ nút điều hướng, phím mũi tên, con lăn, kéo chuột và vuốt điện thoại.
- Responsive cho desktop và mobile.

## Chạy bằng PyCharm

1. Mở thư mục `meme-gallery` bằng PyCharm.
2. Chạy file `app.py`.
3. Mở `http://127.0.0.1:8000` trong trình duyệt.

Ứng dụng không cần cài thêm thư viện Python.

## Thêm ảnh hoặc video

1. Thêm ảnh hoặc video vào thư mục `memes/`. Có thể tạo nhiều folder con.
2. Nếu website đang mở, bấm nút quét lại ở góc phải trên.
3. Thống kê, bộ lọc, lookbook và cốt truyện sẽ tự cập nhật. Hero ưu tiên dùng ảnh để luôn hiển thị ổn định.

Định dạng ảnh: `jpg`, `jpeg`, `png`, `gif`, `webp`, `svg`, `bmp`, `avif`, `heic`, `heif`, `apng`.

Định dạng video: `mp4`, `webm`, `ogv`, `m4v`, `mov`. Khả năng phát phụ thuộc codec mà trình duyệt hỗ trợ; video lỗi sẽ được đánh dấu và không làm hỏng gallery.

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
