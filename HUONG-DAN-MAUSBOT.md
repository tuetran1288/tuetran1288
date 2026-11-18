# Đưa HAI RÊ Video Studio lên MausBot cloud

Gửi nguyên khối chữ dưới đây cho Claude Code trên MausBot (kèm file `haire-video-studio.zip`). Claude Code sẽ tự làm, chỗ nào cần anh thì nó hỏi.

---
Đọc file HAIRE-VIDEO-STUDIO.md và HUONG-DAN-MAUSBOT.md trong gói haire-video-studio.zip rồi làm theo thứ tự, mỗi bước xong báo anh bằng lời đơn giản:

1. Giải nén gói vào /opt/haire-video-studio (hoặc thư mục anh chỉ). Chạy `npm install`. Cài FFmpeg nếu máy chưa có (`ffmpeg -version` để kiểm tra).
2. Chạy `npm test`. Phải ra "Tất cả đạt" thì mới đi tiếp.
3. Copy `.env.example` thành `.env`. Điền:
   - APP_PUBLIC_URL: địa chỉ web sẽ dùng.
   - APP_PASSWORD: một mật khẩu cho nhân viên (hỏi anh).
   - LARK_APP_ID và LARK_APP_SECRET: hỏi anh. Nếu `lark-cli` trên VPS (/opt/lark-cli) đã có app và đủ quyền GHI Base (bitable) thì dùng lại, không thì hướng dẫn anh tạo app ở open.larksuite.com, cấp quyền bitable, rồi thêm app vào base bằng nút "..." > "Add document app".
   - ANTHROPIC_API_KEY: hỏi anh (không có thì web vẫn chạy bằng dữ liệu mẫu).
   - LARK_BASE_TOKEN đã điền sẵn: T6Zsbsa8famZ6jsWjWjjmtsFpad (base trống tên "Untitled base" trong thư mục Bot studio).
4. Chạy `npm run setup-lark`: đổi tên base thành "HAI RÊ Video Studio" và tạo đủ 6 bảng. Xong thì gửi anh link base để kiểm tra.
5. Chạy web bằng pm2: `pm2 start server.js --name haire-video-studio && pm2 save`. Mở cổng cho nhân viên vào (hoặc gắn tên miền, hỏi anh).
6. Nhờ anh mở web, thử 1 đợt từ đầu đến cuối với 1 video thật. Báo kết quả. Chưa có tên miền hay dịch vụ tạo nhạc thì báo anh, không tự chọn.
---

## Việc anh phải tự làm (Claude Code không làm thay được)
- Tạo App Lark và đưa App ID, App Secret (mục 3). Cần quyền ghi bitable.
- Điền nội dung 2 bảng "Chiến lược Hai Rê" và "Yêu cầu nghiên cứu" trong Lark. AI đọc 2 bảng này trước khi đề xuất xu hướng.
- Tự tạo dashboard trong Lark từ bảng "Video" và "Nhật ký hoạt động" (Lark không cho tạo dashboard bằng mã).
- Chọn dịch vụ tạo nhạc nền AI (web đang báo rõ là chưa nối, vẫn tải file nhạc lên được).

## Web đã làm được thật và chưa làm được
**Làm được (đã chạy thử bằng video giả):** chọn 3 trong 6 xu hướng; AI viết định hướng quay (cần khóa AI, không có thì dùng mẫu); nộp video thô vào từng thẻ, thêm thẻ; AI Auto-Trim cắt khoảng lặng; hiệu ứng từng cảnh (Rung nhẹ, Tua nhanh, Quay chậm, Zoom dần, Chữ nổi bật); ghép 9:16, lọc màu, thẻ cuối logo và địa chỉ; ghép ghi âm và nhạc tải lên (nhạc tự nhỏ khi có người nói); xem thử, tải về, duyệt, gửi yêu cầu sửa; ghi mọi thứ vào Lark Base.

**Chưa tự động (giao diện ghi "chưa tự động"):** phụ đề tự động (cần cài Whisper trên máy chủ: `pip install openai-whisper`); chuyển cảnh Glitch/Whip Pan; video trám B-roll; chữ 3D; mũi tên chỉ nút nhắn tin; tiếng Whoosh/Pop; tạo nhạc bằng AI. "Gửi yêu cầu sửa" mới ghi lại và đánh dấu "Cần sửa", chưa tự dựng lại theo lời nhắn.

**Chưa thử với dịch vụ thật:** Lark Open API và AI (máy chạy thử không ra được mạng ngoài). Mã đã viết theo tài liệu, bước 4 và 6 ở trên là lần chạy thật đầu tiên.

## Giới hạn hiện tại
- Một đợt làm việc dùng chung cho cả web (chưa tách theo từng nhân viên). Hai người làm cùng lúc sẽ đè lên nhau.
- Video thô lưu trên ổ đĩa máy chủ (thư mục data/). Chưa đẩy lên Lark Drive.
