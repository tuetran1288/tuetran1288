#!/usr/bin/env bash
# Cài Thầy AI lên VPS Ubuntu/Debian chỉ với một lệnh. Chạy lại được nhiều lần (để cập nhật).
set -euo pipefail

REPO="https://github.com/tuetran1288/tuetran1288.git"
BRANCH="claude/thay-ai-pwa-app-qr57lr"
DIR="$HOME/tuetran1288"

say() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
ask() { # ask "Câu hỏi" BIẾN [ẩn]
  local prompt="$1" var="$2" hidden="${3:-}" val
  if [ -n "$hidden" ]; then read -r -s -p "$prompt: " val </dev/tty; echo; else read -r -p "$prompt: " val </dev/tty; fi
  printf -v "$var" '%s' "$val"
}

if [ "$(id -u)" -ne 0 ]; then
  echo "Hãy chạy bằng quyền root (thêm 'sudo' phía trước, hoặc đăng nhập root)."; exit 1
fi

say "1/4 Kiểm tra Docker và git"
command -v git >/dev/null || { apt-get update -y && apt-get install -y git; }
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
docker compose version >/dev/null

say "2/4 Tải code Thầy AI"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch origin "$BRANCH" && git -C "$DIR" checkout "$BRANCH" && git -C "$DIR" pull --ff-only origin "$BRANCH"
else
  git clone -b "$BRANCH" "$REPO" "$DIR"
fi
cd "$DIR/thay-ai"

say "3/4 Điền thông tin (khóa chỉ lưu trong file .env trên máy này)"
if [ -f .env ]; then
  echo "Đã có file .env — giữ nguyên. (Muốn đổi: nano $DIR/thay-ai/.env)"
else
  ask "Tên miền đã trỏ về VPS này (ví dụ thayai.example.com)" DOMAIN
  ask "Mã PIN 4 số để vào app" PIN
  ask "Khóa Claude (sk-ant-..., để trống nếu chưa có)" ANTHROPIC_API_KEY hidden
  ask "Khóa Grok (xai-..., để trống nếu chưa có)" XAI_API_KEY hidden
  [[ "$PIN" =~ ^[0-9]{4}$ ]] || { echo "PIN phải đúng 4 chữ số."; exit 1; }
  [ -n "$DOMAIN" ] || { echo "Cần nhập tên miền (micro trên iPad bắt buộc cần HTTPS)."; exit 1; }
  umask 077
  cat > .env <<EOF
DOMAIN=$DOMAIN
PIN=$PIN
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
XAI_API_KEY=$XAI_API_KEY
CLAUDE_MODEL=claude-opus-5-5
MEMORY_MODEL=claude-haiku-5-5
GROK_VOICE_MODEL=grok-voice-latest
EOF
fi

command -v ufw >/dev/null && ufw status | grep -q "Status: active" && { ufw allow 80/tcp; ufw allow 443/tcp; } || true

say "4/4 Chạy app"
docker compose up -d --build
sleep 5
docker compose logs app --tail 6

DOMAIN_SHOWN=$(grep '^DOMAIN=' .env | cut -d= -f2)
say "Xong! Trên iPad mở Safari vào: https://$DOMAIN_SHOWN"
echo "Nhập PIN, rồi bấm Chia sẻ -> Thêm vào MH chính."
echo "(Lần đầu Caddy cần 1-2 phút để xin chứng chỉ HTTPS; tên miền phải đã trỏ về IP VPS.)"
