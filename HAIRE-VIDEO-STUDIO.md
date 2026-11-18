# HAI RÊ Video Studio — Bản mô tả dự án cho Claude Code

> File này tổng hợp toàn bộ yêu cầu đã chốt trong buổi làm việc ngày 18/11/2026.
> Dùng làm ngữ cảnh gốc khi chạy Claude Code trên MausBot cloud.
> Người ra yêu cầu: anh Trần Như Tuệ (Giám đốc Công ty Cổ phần Hai Rê, Huế). Anh không phải lập trình viên: mọi hướng dẫn cần đơn giản, từng bước, dễ làm.

## 1. Mục tiêu

Xây một **web app nội bộ cho nhân viên Hai Rê** để làm video ngắn (Facebook Reels, TikTok) theo 3 bước. Giao diện phía trước thật dễ thao tác. Phía sau là nhiều AI và công cụ nối vào để nghiên cứu, viết định hướng quay và dựng video. Mọi dữ liệu nối về **một base trong Lark Pro**.

Yêu cầu xuyên suốt:
- Nhân viên thao tác cực dễ: chữ to, nút lớn, dùng tốt trên điện thoại.
- Web chạy trên cloud (MausBot cloud), không phụ thuộc máy Mac của anh Tuệ.
- Toàn bộ nội dung giao diện bằng tiếng Việt.

## 2. Luồng 3 bước

### Bước 1 — Chọn xu hướng
1. Trước khi nghiên cứu, AI đọc **chiến lược Hai Rê** và **yêu cầu nghiên cứu** trong Lark Base.
2. AI quét xu hướng đang chạy tốt trên Facebook Reels và TikTok.
3. AI **đối chiếu lại với chiến lược** rồi đề xuất **6 xu hướng**. Mỗi xu hướng có: tên, nền tảng, mức độ đang lên, mô tả, gợi ý áp dụng cho Hai Rê, mức khớp chiến lược kèm lý do, video mẫu tham khảo.
4. Nhân viên đọc và **chọn đúng 3 xu hướng** hợp nhất. Chưa đủ 3 thì chưa sang được bước sau. Có nút "Nghiên cứu lại".
5. Lựa chọn (cái nào, ai chọn, lúc nào) được **lưu về Lark Base** để báo cáo.

### Bước 2 — Định hướng quay
- AI tạo tuyến nội dung cho từng xu hướng trong 3 cái đã chọn, viết theo chiến lược Hai Rê.
- **Trọng tâm là định hướng quay**, không phải kịch bản lời thoại. Mỗi cảnh gồm: số thứ tự, cỡ cảnh (cận, trung, toàn), thời lượng, quay gì, **cách quay**, và lời nói hoặc chữ trên màn hình (chỉ để tham khảo).
- Có phần "Ý chính" và "Chuẩn bị trước khi quay" cho mỗi tuyến.
- Nút "Nhờ AI viết lại" và nút "Đã quay xong: nộp video thô".
- Nhân viên quay theo định hướng này.

### Bước 3 — Nộp video thô và nhận video hoàn chỉnh
**Thẻ video**
- Mỗi cảnh trong storyboard có **sẵn một thẻ**. Nhân viên đẩy video thô vào thẻ.
- Trong mỗi thẻ, nhân viên **ghi mô tả** và **chọn hiệu ứng** riêng cho cảnh đó.
- Có nút **"Thêm thẻ video"** để đẩy thêm cảnh quay ngoài storyboard.
- Có thanh tiến độ "Đã nộp x/y thẻ". Đủ thẻ storyboard thì nút "Giao cho AI dựng video" mới bật.

**Âm thanh và hiệu ứng cho cả video**
- **Tải ghi âm lên** (lời đọc). Không có thì dùng tiếng trong video.
- **Trình tạo nhạc nền bằng AI**: chọn phong cách, ghi mô tả thêm, tạo và nghe thử.
- **Các lựa chọn hiệu ứng chung**: phụ đề tiếng Việt tự động, chữ nổi bật theo lời nói, chuyển cảnh theo nhạc, tiếng động minh họa, phóng to chi tiết, logo và địa chỉ Hai Rê ở cuối.

**Video hoàn chỉnh**
- AI và các công cụ dựng ra video hoàn chỉnh, khung dọc 9:16.
- Nhân viên xem thử, tải về để đăng, hoặc gõ yêu cầu để AI sửa lại.
- Có danh sách theo dõi 3 video của đợt (xong, chưa quay).
- Mỗi video làm xong được ghi về Lark Base để tính số video trên dashboard.

## 3. Lark Base (nguồn kiến thức và nơi lưu)

- Tổ chức Lark: **Lark Pro** của anh Tuệ.
- Thư mục để tạo base: https://biglkvxkw2.sg.larksuite.com/drive/folder/QTMnfxMRhlQg68dLIpRj99kspEd (folder token `QTMnfxMRhlQg68dLIpRj99kspEd`).
- Claude Code của anh Tuệ đã nối Lark qua CLI. Mọi thao tác Lark dùng kết nối CLI đó.
- **Trạng thái (19/11/2026): base đã được tạo nhưng còn TRỐNG**, tên mặc định "Untitled base", nằm trong Drive > Hai Rê AI Data > 4. Marketing > Bot studio.
  - Link: https://hjpe8pd2ulfy.jp.larksuite.com/base/T6Zsbsa8famZ6jsWjWjjmtsFpad (token `T6Zsbsa8famZ6jsWjWjjmtsFpad`).
  - Việc còn lại: đổi tên và tạo 6 bảng. Chạy `npm run setup-lark` trong gói mã nguồn (cần LARK_APP_ID, LARK_APP_SECRET).

Cấu trúc 6 bảng dưới đây **anh Tuệ đã chốt (18/11/2026)** và đã được viết thành mã trong `lib/schema.js`. Cứ tạo đúng như vậy trong folder Lark đã cho, không cần hỏi lại.

| # | Bảng | Ai ghi | Cột gợi ý |
|---|------|--------|-----------|
| 1 | Chiến lược Hai Rê | Anh Tuệ | Mục tiêu, sản phẩm ưu tiên, khách hàng mục tiêu, thông điệp chính, điều không được làm, kênh ưu tiên, còn hiệu lực (có/không) |
| 2 | Yêu cầu nghiên cứu | Anh Tuệ | Kênh cần quét, chủ đề, từ khóa, kênh tham khảo, ghi chú |
| 3 | Xu hướng | AI + web | Đợt nghiên cứu, ngày, tên xu hướng, nền tảng, mức độ, mô tả, gợi ý cho Hai Rê, mức khớp chiến lược, lý do khớp, link video mẫu, được chọn (có/không), người chọn, thời điểm chọn |
| 4 | Kịch bản (định hướng quay) | AI | Liên kết xu hướng, tiêu đề, thời lượng, ý chính, chuẩn bị, danh sách cảnh (quay gì, cách quay, lời tham khảo), trạng thái (chờ quay, đã quay) |
| 5 | Video | Web | Liên kết kịch bản, người quay, cửa hàng, các thẻ video thô (file, mô tả, hiệu ứng), ghi âm, nhạc nền, hiệu ứng chung, video hoàn chỉnh, trạng thái, yêu cầu sửa, ngày xong, link đã đăng |
| 6 | Nhật ký hoạt động | Web | Thời điểm, người làm, hành động, đối tượng liên quan |

**Dashboard trong Lark** (lấy từ bảng 5 và 6): số video theo tuần và tháng, theo nhân viên, theo cửa hàng, theo xu hướng; hoạt động của nhân viên.

### Dữ liệu chạy thế nào
- Bước 1: AI đọc bảng 1 và 2 → quét mạng xã hội → đối chiếu lại bảng 1 → ghi 6 đề xuất vào bảng 3. Nhân viên chọn 3 → web ghi lựa chọn vào bảng 3 và bảng 6.
- Bước 2: AI viết định hướng quay theo bảng 1 → ghi bảng 4.
- Bước 3: video thô, ghi âm, nhạc, hiệu ứng, video hoàn chỉnh → ghi bảng 5. Mọi thao tác → bảng 6.

## 4. Giao diện: theme Hai Rê

Làm giống theme của trang kiểm kê nội bộ **kiemke.haireoto.com**. Thông số đo trực tiếp từ trang đó:

| Thành phần | Giá trị |
|---|---|
| Đỏ thương hiệu | `#C41919` |
| Đỏ đậm (tiêu đề) | `#9E1212` |
| Chữ chính | `#1a1a1a` |
| Chữ phụ | `#555555` |
| Đường kẻ | `#e3e3e3` |
| Nền trang | `#f5f5f5` |
| Font | Font hệ thống: `-apple-system, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`, cỡ chữ gốc 18px |
| Đầu trang | Nền trắng, padding 8px 14px, viền dưới 4px đỏ, logo 114×40px, tên app đậm + dòng "Nội bộ Hai Rê" |
| Thanh tab | Nền trắng, viền dưới 1px `#e3e3e3`; tab 16px, padding 13px 15px; tab đang chọn chữ đỏ đậm 700, gạch dưới 4px đỏ |
| Cột nội dung | Rộng tối đa 780px, canh giữa |
| Thẻ | Nền trắng, bo góc 12px, viền 1px `#e3e3e3`, padding 16px. Thẻ cần chú ý: viền 2px đỏ |
| Tiêu đề mục | 22px, đậm 700, màu `#9E1212` |
| Nút chính | Nền đỏ `#C41919`, chữ trắng 18px/600, bo 10px, padding 13px 18px, cao 52px |
| Nút phụ | Nền trắng, viền 2px `#888888`, chữ `#1a1a1a`, bo 10px |
| Ô nhập | Viền 2px `#999999`, bo 10px |

- Logo: `https://kiemke.haireoto.com/logo.png` (480×169px, xe hơi và bánh xe, chữ HAI RÊ đỏ).
- Thanh 3 bước làm kiểu tab: "1. Chọn xu hướng", "2. Kịch bản và quay", "3. Nộp video, nhận thành phẩm". Bước đã xong có dấu tích đỏ.

### Bản thiết kế tham khảo
- Giao diện mẫu (bản cũ): https://claude.ai/artifact/RFeB63tPndnZfJuu65hQse
  - Lưu ý: bản trên link này **chưa có** các thay đổi mới nhất (bước 2 thành "Định hướng quay", bước 3 dạng thẻ, phần ghi âm, nhạc nền, hiệu ứng). Lấy mô tả ở mục 2 của file này làm chuẩn.
- Sơ đồ luồng dữ liệu (Whiteboard): https://claude.ai/artifact/4keVKtRtQjUW8rEVrekCL7

## 5. Phần AI và công cụ phía sau

Đã nêu trong các buổi trước:
- Bộ công cụ dựng video: **HyperFrames, FFmpeg, Whisper, yt-dlp**.
- Quy trình dựng học theo kiểu "AI Video Editor" / OmniReel Studio: giao diện từng bước, ra video hoàn chỉnh.
- Anh Tuệ ra lệnh qua **MausBot**, MausBot điều khiển Claude Code trên cloud.

Các khối cần có:
1. **AI nghiên cứu xu hướng**: đọc Lark Base, quét Facebook Reels và TikTok, đối chiếu chiến lược, trả 6 đề xuất.
2. **AI viết định hướng quay**: từ xu hướng đã chọn và chiến lược.
3. **AI dựng video**: ghép các thẻ video theo storyboard, mô tả và hiệu ứng; phụ đề tiếng Việt (Whisper); nhạc nền; logo và địa chỉ cuối video; xuất 9:16.
4. **Trình tạo nhạc nền**.
5. **Kết nối Lark Base**: đọc và ghi 6 bảng.

## 6. Thông tin Hai Rê cần dùng

- Tên pháp lý: Công ty Cổ phần Hai Rê. Thương hiệu: HAI RÊ.
- Ngành: lốp ô tô, dầu nhớt, bình điện, bảo dưỡng; phụ tùng xe máy.
- Cửa hàng tại Huế: 170 Lê Duẩn (phường Phú Xuân), 15A An Dương Vương, 4A Lê Quý Đôn.
- Fanpage: "HAI RÊ - Lốp Ô Tô, Dầu Nhớt, Bình Điện" và "HAI RÊ - Tổng kho lốp và phụ tùng xe máy miền trung".
- TikTok: @haire_lopotohue.
- Màu thương hiệu: đỏ `#C41919`. Chưa có font thương hiệu chính thức.

## 7. Việc chưa rõ, cần hỏi anh Tuệ trước khi làm

1. (Đã chốt) 6 bảng Lark ở mục 3, tạo luôn.
2. Nội dung bảng "Chiến lược Hai Rê" và "Yêu cầu nghiên cứu" do anh điền. Hiện chưa có dữ liệu.
3. Đăng nhập: ai được vào web, có cần duyệt tài khoản như app kiểm kê không.
4. Nguồn lấy dữ liệu xu hướng Facebook và TikTok (công cụ nào, có tốn phí không).
5. Dùng dịch vụ nào để tạo nhạc nền.
6. Tên miền cho web (ví dụ dạng video.haireoto.com).
7. Video thô lưu ở đâu (cloud của MausBot hay Lark Drive), giới hạn dung lượng.
8. Có theo dõi kết quả video sau khi đăng (lượt xem) để AI học lại không. Chưa yêu cầu.

## 8. Thứ tự làm đề xuất

1. Tạo base Lark 6 bảng trong thư mục ở mục 3, gửi link cho anh Tuệ kiểm tra.
2. Dựng khung web 3 bước với theme ở mục 4, dữ liệu mẫu, đọc ghi được Lark Base.
3. Nối AI nghiên cứu xu hướng (bước 1).
4. Nối AI viết định hướng quay (bước 2).
5. Làm phần nộp thẻ video, ghi âm, nhạc nền, hiệu ứng và dựng video (bước 3).
6. Làm dashboard trong Lark.
7. Cho 1 đến 2 nhân viên chạy thử một đợt, sửa theo góp ý.

Làm xong mỗi bước thì dừng lại, báo anh Tuệ bằng lời đơn giản và chờ anh duyệt rồi mới làm bước tiếp.

## 9. Cập nhật 19/11/2026: đã có mã nguồn web app

- Gói `haire-video-studio.zip` là web app chạy được (Node.js + FFmpeg), giao diện desktop theo bản thiết kế mới nhất. Cách triển khai: xem `HUONG-DAN-MAUSBOT.md` trong gói.
- **Bước 1 giờ là 6 xu hướng, chọn 3** (lưới 3 cột × 2 hàng).
- Bố cục theo đề xuất giao diện AI Agent: thư viện tuyến nội dung + tạo khung bằng mô tả; phân cảnh nằm ngang với ghi chú quay, ô thả video thô, AI Auto-Trim; duyệt 3 cột (menu, xem thử 9:16, bảng chỉnh theo lớp).
- Đã chạy thử đủ luồng bằng video giả (npm test: tất cả đạt). Lark và AI **chưa chạy thử thật**.
- Bản giao diện thiết kế trên Claude (public) vẫn là bản cũ, chưa cập nhật.
- Câu hỏi mục 7: câu 1 đã chốt; câu 2 (nội dung bảng chiến lược) và 3 (mật khẩu: tạm dùng APP_PASSWORD chung), 4 (nguồn xu hướng: tạm dùng AI tìm web), 5 (nhạc AI), 6 (tên miền), 7 (video thô: tạm lưu ổ đĩa máy chủ) còn chờ anh Tuệ.
