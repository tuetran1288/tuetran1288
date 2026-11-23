// ============================================================
// Thầy AI — máy chủ
// Khóa API chỉ nằm ở đây (file .env), không bao giờ gửi xuống iPad.
// ============================================================
import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const here = path.dirname(fileURLToPath(import.meta.url));
const TEACHERS_DIR = path.join(here, "teachers");
const DATA_DIR = path.join(here, "data");
const MEMORY_DIR = path.join(DATA_DIR, "memory");

// ---------- Cấu hình từ biến môi trường (.env) ----------
const PORT = process.env.PORT || 3000;
const PIN = (process.env.PIN || "1234").trim();
const ANTHROPIC_API_KEY = (process.env.ANTHROPIC_API_KEY || "").trim();
const XAI_API_KEY = (process.env.XAI_API_KEY || "").trim();
// Mô hình dùng để cập nhật "sổ ghi nhớ" sau mỗi buổi học (rẻ + nhanh)
const MEMORY_MODEL = process.env.MEMORY_MODEL || "claude-haiku-5-5";
// Mô hình Claude mặc định cho các thầy (có thể ghi đè trong file thầy)
const DEFAULT_CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const GROK_VOICE_MODEL = process.env.GROK_VOICE_MODEL || "grok-voice-latest";

fs.mkdirSync(MEMORY_DIR, { recursive: true });

// Khóa bí mật để ký cookie đăng nhập — tạo 1 lần và lưu lại
const SECRET_FILE = path.join(DATA_DIR, ".session-secret");
let SECRET;
try {
  SECRET = fs.readFileSync(SECRET_FILE, "utf8").trim();
  if (!SECRET) throw new Error("empty");
} catch {
  SECRET = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(SECRET_FILE, SECRET, { mode: 0o600 });
}
const AUTH_TOKEN = crypto.createHmac("sha256", SECRET).update("thay-ai-v1").digest("hex");

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

// ---------- Đọc file thầy (teachers/*.md) ----------
// Mỗi file: phần đầu giữa hai dòng "---" là thông tin (tên, icon, ...),
// phần sau là lời dặn vai trò (system prompt).
function parseTeacherFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  let body = raw;
  if (m) {
    body = m[2].trim();
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) {
        const key = line.slice(0, i).trim();
        let val = line.slice(i + 1).trim();
        val = val.replace(/^["']|["']$/g, "");
        if (key && val && !key.startsWith("#")) meta[key] = val;
      }
    }
  }
  const id = path.basename(filePath, ".md");
  return {
    id,
    ten: meta.ten || id,
    icon: meta.icon || "🧑‍🏫",
    mau: meta.mau || "#4A90D9",
    bo_nao: (meta.bo_nao || "claude").toLowerCase() === "grok" ? "grok" : "claude",
    giong: meta.giong || "eve",
    model: meta.model || DEFAULT_CLAUDE_MODEL,
    thu_tu: Number(meta.thu_tu) || 99,
    prompt: body,
  };
}

function listTeachers() {
  if (!fs.existsSync(TEACHERS_DIR)) return [];
  return fs
    .readdirSync(TEACHERS_DIR)
    .filter((f) => f.endsWith(".md") && /^[a-z0-9]/.test(f)) // file viết HOA là hướng dẫn, không phải thầy
    .sort()
    .map((f) => {
      try {
        return parseTeacherFile(path.join(TEACHERS_DIR, f));
      } catch (e) {
        console.error("Không đọc được file thầy:", f, e.message);
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.thu_tu - b.thu_tu || a.ten.localeCompare(b.ten, "vi"));
}

function getTeacher(id) {
  if (!/^[a-z0-9-_]+$/i.test(id)) return null;
  const p = path.join(TEACHERS_DIR, id + ".md");
  if (!fs.existsSync(p)) return null;
  return parseTeacherFile(p);
}

// ---------- Sổ ghi nhớ của từng thầy ----------
function memoryPath(id) {
  return path.join(MEMORY_DIR, id + ".md");
}
function readMemory(id) {
  try {
    return fs.readFileSync(memoryPath(id), "utf8").trim();
  } catch {
    return "";
  }
}

function todayVN() {
  return new Date().toLocaleDateString("vi-VN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

// Ghép lời dặn đầy đủ gửi cho mô hình: vai trò + sổ ghi nhớ + ngày hôm nay
function buildSystemPrompt(teacher) {
  const memory = readMemory(teacher.id);
  let s = teacher.prompt;
  s += `\n\n## Hôm nay\nHôm nay là ${todayVN()}.`;
  if (memory) {
    s += `\n\n## Sổ ghi nhớ (các buổi học trước)\n${memory}\n\nHãy dựa vào sổ ghi nhớ để dạy tiếp: ôn lại chỗ còn yếu, khen sự tiến bộ, đừng dạy lại từ đầu.`;
  } else {
    s += `\n\n## Sổ ghi nhớ\nĐây là buổi học đầu tiên. Hãy làm quen, hỏi tên và trình độ của học trò.`;
  }
  return s;
}

// ---------- Ứng dụng web ----------
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

// Đọc cookie đơn giản (không cần thư viện ngoài)
function getCookie(req, name) {
  const h = req.headers.cookie || "";
  for (const part of h.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
function isLoggedIn(req) {
  const tok = getCookie(req, "thayai");
  if (!tok || tok.length !== AUTH_TOKEN.length) return false;
  return crypto.timingSafeEqual(Buffer.from(tok), Buffer.from(AUTH_TOKEN));
}

// Chặn đoán mò mã PIN: sai 10 lần thì phải chờ 5 phút
const pinFails = new Map(); // ip -> {count, until}
function pinLimiter(req, res, next) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "?";
  const rec = pinFails.get(ip);
  if (rec && rec.count >= 10 && Date.now() < rec.until) {
    return res.status(429).json({ error: "Nhập sai quá nhiều lần. Hãy chờ 5 phút rồi thử lại." });
  }
  req._pinIp = ip;
  next();
}

app.post("/api/login", pinLimiter, (req, res) => {
  const pin = String(req.body?.pin || "").trim();
  if (pin && pin === PIN) {
    pinFails.delete(req._pinIp);
    res.setHeader(
      "Set-Cookie",
      `thayai=${AUTH_TOKEN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${180 * 24 * 3600}`
    );
    return res.json({ ok: true });
  }
  const rec = pinFails.get(req._pinIp) || { count: 0, until: 0 };
  rec.count += 1;
  rec.until = Date.now() + 5 * 60 * 1000;
  pinFails.set(req._pinIp, rec);
  res.status(401).json({ error: "Mã PIN chưa đúng, thử lại nhé." });
});

app.get("/api/me", (req, res) => {
  res.json({ loggedIn: isLoggedIn(req) });
});

// Từ đây trở xuống: mọi API đều cần đăng nhập
app.use("/api", (req, res, next) => {
  if (isLoggedIn(req)) return next();
  res.status(401).json({ error: "Cần đăng nhập bằng mã PIN." });
});

// Danh sách thầy (không gửi prompt đầy đủ xuống — chỉ thông tin hiển thị)
app.get("/api/teachers", (_req, res) => {
  res.json(
    listTeachers().map((t) => ({
      id: t.id, ten: t.ten, icon: t.icon, mau: t.mau, bo_nao: t.bo_nao,
      daHoc: !!readMemory(t.id),
    }))
  );
});

// ---------- Trò chuyện qua Claude ----------
app.post("/api/chat", async (req, res) => {
  const { teacherId, messages } = req.body || {};
  const teacher = teacherId && getTeacher(teacherId);
  if (!teacher) return res.status(404).json({ error: "Không tìm thấy thầy này." });
  if (!anthropic) {
    return res.status(503).json({ error: "Chưa cài khóa Claude (ANTHROPIC_API_KEY) trên máy chủ." });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Thiếu nội dung trò chuyện." });
  }
  // Chỉ nhận các lượt hợp lệ, cắt bớt cho gọn (giữ 40 lượt gần nhất)
  const clean = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-40)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (clean.length === 0 || clean[0].role !== "user") {
    return res.status(400).json({ error: "Nội dung trò chuyện không hợp lệ." });
  }
  try {
    const response = await anthropic.messages.create({
      model: teacher.model,
      max_tokens: 1024,
      // Trẻ em trò chuyện bằng giọng nói → cần trả lời nhanh, ngắn gọn
      output_config: { effort: "low" },
      system: [
        { type: "text", text: buildSystemPrompt(teacher), cache_control: { type: "ephemeral" } },
      ],
      messages: clean,
    });
    if (response.stop_reason === "refusal") {
      return res.json({ text: "Thầy xin lỗi, câu này thầy không trả lời được. Mình học tiếp bài khác nhé!" });
    }
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    res.json({ text: text || "Thầy chưa nghĩ ra câu trả lời, con hỏi lại nhé!" });
  } catch (e) {
    console.error("Lỗi gọi Claude:", e.status || "", e.message);
    const msg =
      e.status === 401
        ? "Khóa Claude trên máy chủ không đúng."
        : e.status === 429
          ? "Hệ thống đang bận, chờ một chút rồi thử lại nhé."
          : "Có lỗi khi kết nối tới thầy. Thử lại nhé.";
    res.status(502).json({ error: msg });
  }
});

// ---------- Phiên trò chuyện giọng nói qua Grok ----------
// Tạo "token tạm" (hết hạn sau 5 phút) để iPad tự kết nối thẳng tới Grok,
// còn khóa API thật thì chỉ nằm trên máy chủ này.
app.get("/api/grok-session", async (req, res) => {
  const teacher = getTeacher(String(req.query.teacher || ""));
  if (!teacher) return res.status(404).json({ error: "Không tìm thấy thầy này." });
  if (!XAI_API_KEY) {
    return res.status(503).json({ error: "Chưa cài khóa Grok (XAI_API_KEY) trên máy chủ." });
  }
  try {
    const r = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expires_after: { seconds: 300 } }),
    });
    if (!r.ok) {
      const body = await r.text();
      console.error("Lỗi tạo token Grok:", r.status, body.slice(0, 300));
      return res.status(502).json({
        error: r.status === 401 ? "Khóa Grok trên máy chủ không đúng." : "Không tạo được phiên Grok. Thử lại nhé.",
      });
    }
    const data = await r.json();
    const token =
      data.value || data.client_secret?.value || data.client_secret || data.token;
    if (!token) {
      console.error("Không thấy token trong phản hồi:", JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ error: "Phản hồi từ Grok không như mong đợi." });
    }
    res.json({
      token,
      model: GROK_VOICE_MODEL,
      voice: teacher.giong,
      instructions: buildSystemPrompt(teacher),
    });
  } catch (e) {
    console.error("Lỗi gọi Grok:", e.message);
    res.status(502).json({ error: "Không kết nối được tới Grok. Thử lại nhé." });
  }
});

// ---------- Chuyển giọng nói thành chữ (dự phòng cho thầy chạy Claude) ----------
// Dùng khi iPad không hỗ trợ nhận dạng giọng nói sẵn có.
app.post(
  "/api/stt",
  express.raw({ type: ["audio/*", "application/octet-stream"], limit: "15mb" }),
  async (req, res) => {
    if (!XAI_API_KEY) {
      return res.status(503).json({ error: "Máy chủ chưa có khóa Grok để chuyển giọng nói thành chữ." });
    }
    if (!req.body || req.body.length < 100) {
      return res.status(400).json({ error: "Chưa nhận được âm thanh." });
    }
    try {
      const form = new FormData();
      form.append("model", "grok-voice-transcribe-2.0");
      form.append("language", "vi");
      const mime = req.headers["content-type"] || "audio/webm";
      form.append("file", new Blob([req.body], { type: mime }), "audio.webm");
      const r = await fetch("https://api.x.ai/v1/stt", {
        method: "POST",
        headers: { Authorization: `Bearer ${XAI_API_KEY}` },
        body: form,
      });
      if (!r.ok) {
        console.error("Lỗi STT:", r.status, (await r.text()).slice(0, 300));
        return res.status(502).json({ error: "Không nghe rõ, con nói lại nhé." });
      }
      const data = await r.json();
      res.json({ text: (data.text || "").trim() });
    } catch (e) {
      console.error("Lỗi STT:", e.message);
      res.status(502).json({ error: "Không nghe rõ, con nói lại nhé." });
    }
  }
);

// ---------- Kết thúc buổi học → cập nhật sổ ghi nhớ ----------
const memoryBusy = new Set();
app.post("/api/end-session", async (req, res) => {
  const { teacherId, transcript } = req.body || {};
  const teacher = teacherId && getTeacher(teacherId);
  if (!teacher) return res.status(404).json({ error: "Không tìm thấy thầy này." });
  if (!Array.isArray(transcript) || transcript.length < 2) {
    return res.json({ ok: true, note: "Buổi học quá ngắn, không cần ghi nhớ." });
  }
  if (memoryBusy.has(teacher.id)) return res.json({ ok: true, note: "Đang ghi nhớ..." });
  memoryBusy.add(teacher.id);
  // Trả lời ngay để iPad không phải chờ; việc ghi nhớ chạy nền
  res.json({ ok: true });

  try {
    const oldMemory = readMemory(teacher.id);
    const convo = transcript
      .slice(-80)
      .map((m) => `${m.role === "user" ? "Học trò" : "Thầy"}: ${String(m.text || "").slice(0, 800)}`)
      .join("\n");
    const ask = `Bạn là trợ lý ghi chép cho một gia sư dạy trẻ tiểu học người Việt.

SỔ GHI NHỚ CŨ (có thể trống):
<so_ghi_nho>
${oldMemory || "(trống)"}
</so_ghi_nho>

NỘI DUNG BUỔI HỌC HÔM NAY (${todayVN()}):
<buoi_hoc>
${convo}
</buoi_hoc>

Hãy viết lại TOÀN BỘ sổ ghi nhớ mới bằng tiếng Việt, gộp thông tin cũ và mới, theo mẫu:
## Về học trò
(tên, tuổi/lớp nếu biết, sở thích)
## Đã học
(gạch đầu dòng ngắn: chủ đề đã học, kèm ngày)
## Làm tốt
(điểm mạnh, tiến bộ)
## Còn yếu / cần ôn
(lỗi hay gặp, chỗ chưa vững)
## Buổi sau nên dạy
(1-3 gợi ý cụ thể)

Giữ sổ ngắn gọn dưới 60 dòng, bỏ chi tiết vụn vặt cũ nếu sổ quá dài. Chỉ trả về nội dung sổ, không giải thích gì thêm.`;

    let newMemory = "";
    if (anthropic) {
      const r = await anthropic.messages.create({
        model: MEMORY_MODEL,
        max_tokens: 2000,
        messages: [{ role: "user", content: ask }],
      });
      newMemory = r.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    } else if (XAI_API_KEY) {
      // Không có khóa Claude thì nhờ Grok (bản chữ) ghi chép
      const r = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${XAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.GROK_TEXT_MODEL || "grok-4-fast",
          messages: [{ role: "user", content: ask }],
        }),
      });
      if (r.ok) {
        const data = await r.json();
        newMemory = (data.choices?.[0]?.message?.content || "").trim();
      }
    }
    if (newMemory) {
      fs.writeFileSync(memoryPath(teacher.id), newMemory + "\n");
      console.log(`Đã cập nhật sổ ghi nhớ cho ${teacher.ten}.`);
    }
  } catch (e) {
    console.error("Lỗi cập nhật sổ ghi nhớ:", e.message);
  } finally {
    memoryBusy.delete(teacher.id);
  }
});

// Xem sổ ghi nhớ (cho phụ huynh)
app.get("/api/memory/:id", (req, res) => {
  const teacher = getTeacher(req.params.id);
  if (!teacher) return res.status(404).json({ error: "Không tìm thấy thầy này." });
  res.json({ memory: readMemory(teacher.id) });
});

// ---------- Giao diện ----------
app.use(express.static(path.join(here, "public"), { index: "index.html" }));

app.listen(PORT, () => {
  console.log(`Thầy AI đang chạy ở cổng ${PORT}`);
  console.log(`- Khóa Claude: ${ANTHROPIC_API_KEY ? "có" : "CHƯA CÓ"}`);
  console.log(`- Khóa Grok:   ${XAI_API_KEY ? "có" : "CHƯA CÓ"}`);
  console.log(`- Số thầy:     ${listTeachers().length}`);
});
