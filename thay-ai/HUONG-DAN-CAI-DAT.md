# 🎓 Thầy AI — Hướng dẫn cài đặt lên VPS (từng bước)

App gia sư giọng nói tiếng Việt cho trẻ em, chạy trên VPS của bạn,
mở bằng iPad và thêm vào màn hình chính như một app thật.

> Bạn chỉ cần biết copy – dán. Mỗi bước là một (vài) câu lệnh,
> dán vào cửa sổ SSH của VPS rồi bấm Enter.

---

## Chuẩn bị (chỉ làm 1 lần)

Bạn cần:

1. **VPS** chạy Ubuntu hoặc Debian (đã có).
2. **Tên miền** trỏ về địa chỉ IP của VPS. Vào trang quản lý tên miền,
   tạo bản ghi **A** — ví dụ `thayai.ten-cua-ban.com` → `IP-của-VPS`.
   (Micro trên iPad bắt buộc cần HTTPS, mà HTTPS cần tên miền.)
3. **2 khóa API** (không đưa cho ai khác xem):
   - Claude: tạo tại <https://console.anthropic.com> → API Keys
   - Grok: tạo tại <https://console.x.ai> → API Keys

## Bước 1 — Cài Docker (nếu VPS chưa có)

Đăng nhập VPS bằng SSH, rồi dán:

```bash
curl -fsSL https://get.docker.com | sh
```

Kiểm tra: `docker --version` — hiện số phiên bản là được.

## Bước 2 — Tải code về VPS

```bash
git clone -b claude/thay-ai-pwa-app-qr57lr https://github.com/tuetran1288/tuetran1288.git
cd tuetran1288/thay-ai
```

## Bước 3 — Điền thông tin của bạn

```bash
cp .env.example .env
nano .env
```

Sửa 4 dòng (dùng phím mũi tên để di chuyển):

- `DOMAIN=` tên miền của bạn (ví dụ `thayai.ten-cua-ban.com`)
- `PIN=` mã PIN 4 số tùy bạn chọn
- `ANTHROPIC_API_KEY=` dán khóa Claude
- `XAI_API_KEY=` dán khóa Grok

Lưu và thoát: bấm `Ctrl+O`, `Enter`, rồi `Ctrl+X`.

## Bước 4 — Chạy app

```bash
docker compose up -d --build
```

Lần đầu mất vài phút. Xong rồi kiểm tra:

```bash
docker compose logs app | tail -5
```

Thấy dòng `Thầy AI đang chạy ở cổng 3000` và `Khóa Claude: có`,
`Khóa Grok: có` là ổn.

> Nếu VPS có tường lửa, mở cổng 80 và 443:
> `sudo ufw allow 80 && sudo ufw allow 443`

## Bước 5 — Thêm vào màn hình chính iPad

1. Mở **Safari** trên iPad, vào `https://tên-miền-của-bạn`.
2. Nhập mã PIN.
3. Bấm nút **Chia sẻ** (ô vuông có mũi tên lên) → **Thêm vào MH chính**
   (Add to Home Screen) → **Thêm**.
4. Từ nay mở app "Thầy AI" từ màn hình chính như app bình thường.
5. Lần đầu bấm nút micro, iPad hỏi quyền dùng micro → chọn **Cho phép**.

---

## Dùng hằng ngày

- Chạm thẻ thầy → nói chuyện tự nhiên. Thầy nghe, trả lời bằng giọng
  và hiện chữ.
- Học xong bấm **Tạm biệt 👋** để thầy ghi vào sổ ghi nhớ
  (buổi sau thầy sẽ dạy tiếp từ chỗ đó).
- Nút ⌨️ để gõ chữ thay vì nói; nút 🔊 để tắt/mở tiếng.

## Sửa thầy / thêm thầy mới

Xem file `teachers/HUONG-DAN-THEM-THAY.md`. Tóm tắt:

```bash
cd ~/tuetran1288/thay-ai
nano teachers/tieng-anh.md        # sửa lời dặn của một thầy
cp teachers/van.md teachers/toan.md   # thêm thầy mới từ thầy có sẵn
nano teachers/toan.md
docker compose restart app        # khởi động lại là xong
```

Sổ ghi nhớ của từng thầy: `data/memory/<tên-thầy>.md` — mở đọc được,
sửa được, xóa là thầy "quên".

## Các lệnh hay dùng

| Việc | Lệnh (chạy trong thư mục `thay-ai`) |
|---|---|
| Xem app có chạy không | `docker compose ps` |
| Xem nhật ký lỗi | `docker compose logs app --tail 50` |
| Khởi động lại | `docker compose restart` |
| Tắt app | `docker compose down` |
| Cập nhật code mới | `git pull && docker compose up -d --build` |
| Đổi PIN / đổi khóa | `nano .env` rồi `docker compose up -d` |

## Khi gặp trục trặc

- **Vào trang báo "không an toàn" / không vào được:** kiểm tra tên miền
  đã trỏ đúng IP chưa (`ping tên-miền`), và chờ 1-2 phút để Caddy xin
  chứng chỉ HTTPS lần đầu.
- **Micro không hoạt động:** phải vào bằng `https://` (có khóa 🔒),
  và cho phép micro khi iPad hỏi. Kiểm tra: Cài đặt iPad → Safari →
  Micro.
- **Thầy không trả lời:** `docker compose logs app --tail 50` để xem
  lỗi — thường là khóa API sai hoặc hết tiền trong tài khoản API.
- **Thầy Grok không nói:** kiểm tra `XAI_API_KEY` trong `.env`;
  thầy Claude vẫn chạy bình thường nếu chỉ khóa Grok trục trặc.
