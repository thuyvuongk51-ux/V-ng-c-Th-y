# Phi Vụ Hoàn Hảo · máy chủ chơi online

Máy chủ này chạy cả trận đấu (bot, tiền, trúng đạn) cho từng phòng. Trình duyệt của người chơi chỉ gửi thao tác và vẽ hình, nên không ai phải "gánh" trận như bản chơi qua mã phòng ngang hàng.

## Các tệp
- `server.js`: mở trang game và nhận kết nối của người chơi.
- `room.js`: mỗi phòng chạy trong một luồng riêng, dùng chính mã nguồn của game.
- `public/index.html`: trang game.
- `package.json`, `render.yaml`: thông tin để Render cài đặt và chạy.

## Đưa lên Render
1. Tạo kho mã trên GitHub (New repository), bấm "uploading an existing file", kéo tất cả tệp trong thư mục này vào (kể cả thư mục `public`), rồi bấm Commit.
2. Vào render.com, đăng nhập bằng GitHub, chọn New → Web Service, chọn kho vừa tạo.
3. Điền: Build Command `npm install`, Start Command `npm start`, Region Singapore, Instance Type Free. Bấm Deploy.
4. Khi thấy "Live", mở đường link dạng `https://ten-cua-thay.onrender.com` để chơi.

## Chạy thử trên máy
```
npm install
npm start
```
Mở http://localhost:10000

## Lưu ý
- Gói Free ngủ sau 15 phút không ai vào. Người đầu tiên vào sẽ phải chờ khoảng 1 phút để máy chủ thức dậy.
- Gói Free có ít sức xử lý, đủ cho khoảng 1–2 phòng. Nếu thấy giật khi nhiều lớp chơi cùng lúc, nâng lên gói Starter.
- Biến `MAX_ROOMS` (mặc định 6) giới hạn số phòng chạy cùng lúc.
