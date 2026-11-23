# Cách thêm thầy mới / sửa thầy

Mỗi thầy là MỘT file `.md` trong thư mục này. Muốn thêm thầy mới:
sao chép một file có sẵn, đổi tên file (chữ thường, không dấu,
nối bằng gạch ngang, ví dụ `toan.md`), rồi sửa nội dung. Khởi động
lại app là thầy mới xuất hiện (chạy: `docker compose restart app`).

Cấu trúc file:

```
---
ten: Thầy Toán            ← tên hiện trên thẻ
icon: ➗                   ← biểu tượng (emoji)
mau: "#FFA726"            ← màu thẻ (mã màu)
thu_tu: 5                 ← vị trí trên trang chính (số nhỏ đứng trước)
bo_nao: claude            ← "claude" hoặc "grok"
giong: eve                ← giọng nói (chỉ dùng khi bo_nao là grok)
---
Phần dưới là lời dặn vai trò cho thầy (muốn viết gì cũng được)...
```

Hai loại "bộ não":

- `bo_nao: grok`  — trò chuyện giọng nói thời gian thực, phản hồi
  nhanh, giọng tự nhiên (cần khóa XAI_API_KEY).
- `bo_nao: claude` — dùng Claude trả lời (cần khóa ANTHROPIC_API_KEY);
  iPad tự nghe và tự đọc câu trả lời bằng giọng tiếng Việt của máy.

Sổ ghi nhớ của từng thầy nằm ở `data/memory/<tên-file>.md` — mở ra
đọc được, sửa được, xóa đi là thầy "quên" làm lại từ đầu.

File này (viết hoa, không phải .md thường) không bị tính là thầy.
