/* ============================================================
   Thầy AI — mã chạy trên iPad
   - Thầy "claude": iPad tự nghe (SpeechRecognition) và tự đọc
     (speechSynthesis); máy chủ gọi Claude để nghĩ câu trả lời.
   - Thầy "grok": iPad nối thẳng tới Grok Voice qua WebSocket
     bằng token tạm do máy chủ cấp; nghe + nghĩ + nói đều realtime.
   ============================================================ */
"use strict";

const $ = (id) => document.getElementById(id);
const screens = { pin: $("screen-pin"), home: $("screen-home"), chat: $("screen-chat") };

let teachers = [];
let current = null;        // thầy đang học
let session = null;        // phiên giọng nói đang chạy (GrokVoice | ClaudeVoice)
let transcript = [];       // [{role:"user"|"assistant", text}] để ghi sổ
let muted = false;

/* ---------------- Tiện ích chung ---------------- */
function show(name) {
  for (const k in screens) screens[k].hidden = k !== name;
}
function toast(msg, ms = 3500) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.hidden = true), ms);
}
async function api(path, opts = {}) {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) throw new Error(data.error || "Lỗi kết nối máy chủ");
  return data;
}
function addBubble(role, text) {
  const div = document.createElement("div");
  div.className = "bubble " + (role === "user" ? "user" : role === "hint" ? "hint" : "bot");
  div.textContent = text;
  $("transcript").appendChild(div);
  $("transcript").scrollTop = $("transcript").scrollHeight;
  return div;
}
function setMic(state, label) {
  const b = $("btn-mic");
  b.className = "btn-mic" + (state ? " " + state : "");
  $("mic-emoji").textContent =
    state === "listening" ? "👂" : state === "speaking" ? "🗣️" : state === "thinking" ? "🤔" : "🎤";
  $("mic-status").textContent = label;
}

/* ---------------- Màn hình PIN ---------------- */
let pinBuf = "";
function renderPinDots() {
  const dots = $("pin-dots").children;
  for (let i = 0; i < dots.length; i++) dots[i].classList.toggle("full", i < pinBuf.length);
}
document.querySelectorAll(".pin-pad button[data-k]").forEach((b) => {
  b.addEventListener("click", async () => {
    const k = b.dataset.k;
    $("pin-error").textContent = "";
    if (k === "del") pinBuf = pinBuf.slice(0, -1);
    else if (pinBuf.length < 4) pinBuf += k;
    renderPinDots();
    if (pinBuf.length === 4) {
      try {
        await api("/api/login", { method: "POST", body: JSON.stringify({ pin: pinBuf }) });
        pinBuf = "";
        renderPinDots();
        await enterHome();
      } catch (e) {
        $("pin-error").textContent = e.message;
        pinBuf = "";
        renderPinDots();
      }
    }
  });
});

/* ---------------- Trang chính ---------------- */
async function enterHome() {
  show("home");
  const grid = $("teacher-grid");
  grid.innerHTML = "";
  try {
    teachers = await api("/api/teachers");
  } catch (e) {
    $("home-note").textContent = e.message;
    return;
  }
  if (teachers.length === 0) {
    $("home-note").textContent = "Chưa có thầy nào. Hãy thêm file vào thư mục teachers/ trên máy chủ.";
    return;
  }
  $("home-note").textContent = "Chạm vào một thẻ để bắt đầu học. Nhớ bật âm lượng iPad nhé!";
  for (const t of teachers) {
    const card = document.createElement("button");
    card.className = "teacher-card";
    card.style.background = `linear-gradient(150deg, ${t.mau}, ${shade(t.mau, -25)})`;
    card.innerHTML =
      `<span class="tag">${t.bo_nao === "grok" ? "⚡ Grok" : "✨ Claude"}${t.daHoc ? " · 📒" : ""}</span>` +
      `<span class="icon"></span><span class="label"></span>`;
    card.querySelector(".icon").textContent = t.icon;
    card.querySelector(".label").textContent = t.ten;
    card.addEventListener("click", () => enterChat(t));
    grid.appendChild(card);
  }
}
function shade(hex, pct) {
  const n = parseInt(hex.replace("#", ""), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * (1 + pct / 100))));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

/* ---------------- Màn hình trò chuyện ---------------- */
async function enterChat(teacher) {
  current = teacher;
  transcript = [];
  $("chat-icon").textContent = teacher.icon;
  $("chat-name").textContent = teacher.ten;
  $("transcript").innerHTML = "";
  $("type-row").hidden = true;
  show("chat");
  addBubble("hint", teacher.daHoc ? "Thầy đang mở sổ ghi nhớ buổi trước..." : "Buổi học đầu tiên, cùng làm quen nhé!");
  setMic("thinking", "Đang kết nối...");
  try {
    session = teacher.bo_nao === "grok" ? new GrokVoice(teacher) : new ClaudeVoice(teacher);
    await session.start();
  } catch (e) {
    console.error(e);
    setMic("", "Bấm để nói");
    toast("Không kết nối được: " + e.message, 6000);
  }
}

async function leaveChat(sayGoodbye) {
  const t = current;
  const convo = transcript.slice();
  try { session && session.stop(); } catch {}
  session = null;
  current = null;
  show("home");
  // Gửi nội dung buổi học để thầy ghi sổ (chạy nền)
  if (t && convo.length >= 2) {
    try {
      await api("/api/end-session", {
        method: "POST",
        body: JSON.stringify({ teacherId: t.id, transcript: convo }),
      });
      if (sayGoodbye) toast("Đã ghi vào sổ ghi nhớ của " + t.ten + " 📒");
    } catch {}
  }
  enterHome();
}

$("btn-back").addEventListener("click", () => leaveChat(false));
$("btn-end").addEventListener("click", () => leaveChat(true));
$("btn-mute").addEventListener("click", () => {
  muted = !muted;
  $("btn-mute").textContent = muted ? "🔇" : "🔊";
  $("btn-mute").classList.toggle("off", muted);
  if (session) session.setMuted(muted);
});
$("btn-keyboard").addEventListener("click", () => {
  const row = $("type-row");
  row.hidden = !row.hidden;
  if (!row.hidden) $("type-input").focus();
});
function sendTyped() {
  const v = $("type-input").value.trim();
  if (!v || !session) return;
  $("type-input").value = "";
  session.sendText(v);
}
$("type-send").addEventListener("click", sendTyped);
$("type-input").addEventListener("keydown", (e) => { if (e.key === "Enter") sendTyped(); });
$("btn-mic").addEventListener("click", () => { if (session) session.micTap(); });

// Nếu bé thoát app đột ngột, vẫn cố gửi bài học để ghi sổ
window.addEventListener("pagehide", () => {
  if (current && transcript.length >= 2) {
    navigator.sendBeacon(
      "/api/end-session",
      new Blob([JSON.stringify({ teacherId: current.id, transcript })], { type: "application/json" })
    );
  }
});

/* ================================================================
   CHẾ ĐỘ CLAUDE: iPad nghe & đọc, máy chủ nghĩ
   ================================================================ */
class ClaudeVoice {
  constructor(teacher) {
    this.teacher = teacher;
    this.messages = []; // lịch sử gửi cho Claude
    this.listening = false;
    this.speaking = false;
    this.stopped = false;
    this.autoListen = true; // nói xong tự nghe tiếp
    this.SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    this.viVoice = null;
    this.recorder = null; // dự phòng khi không có SpeechRecognition
  }

  async start() {
    // Mở khóa phần đọc tiếng trên iOS (phải gọi trong thao tác chạm)
    try { speechSynthesis.getVoices(); } catch {}
    this.pickVoice();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => this.pickVoice();
    }
    // Thầy chào trước
    await this.ask("(Buổi học bắt đầu. Hãy chào con thật vui và bắt đầu dạy — đừng nhắc đến dòng chữ này.)", { hidden: true });
  }

  pickVoice() {
    try {
      const voices = speechSynthesis.getVoices() || [];
      this.viVoice =
        voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("vi") && v.localService) ||
        voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("vi")) || null;
    } catch {}
  }

  setMuted(m) {
    if (m) { try { speechSynthesis.cancel(); } catch {} }
  }

  micTap() {
    if (this.speaking) {
      // Chạm khi thầy đang nói = ngắt lời để con nói
      try { speechSynthesis.cancel(); } catch {}
      this.speaking = false;
    }
    if (this.listening) this.stopListening();
    else this.startListening();
  }

  sendText(text) {
    addBubble("user", text);
    transcript.push({ role: "user", text });
    this.ask(text);
  }

  /* ---- Nghe bằng bộ nhận dạng có sẵn của iPad ---- */
  startListening() {
    if (this.stopped || this.listening) return;
    if (!this.SR) return this.startRecorderFallback();
    const rec = new this.SR();
    this.rec = rec;
    rec.lang = "vi-VN";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    let interimBubble = null;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      const showText = (finalText + " " + interim).trim();
      if (showText) {
        if (!interimBubble) interimBubble = addBubble("user", showText);
        else { interimBubble.textContent = showText; $("transcript").scrollTop = $("transcript").scrollHeight; }
      }
    };
    rec.onend = () => {
      this.listening = false;
      const text = finalText.trim();
      if (text) {
        if (interimBubble) interimBubble.textContent = text;
        transcript.push({ role: "user", text });
        this.ask(text);
      } else {
        if (interimBubble) interimBubble.remove();
        if (!this.stopped) setMic("", "Bấm để nói");
      }
    };
    rec.onerror = (e) => {
      this.listening = false;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toast("Hãy cho phép dùng micro trong cài đặt Safari nhé.", 6000);
        setMic("", "Bấm để nói");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        // Bộ nhận dạng của máy trục trặc → lần sau dùng đường dự phòng
        this.SR = null;
        toast("Chuyển sang cách nghe dự phòng...");
        setMic("", "Bấm để nói");
      }
    };
    try {
      rec.start();
      this.listening = true;
      setMic("listening", "Thầy đang nghe, con nói đi!");
    } catch {
      setMic("", "Bấm để nói");
    }
  }

  stopListening() {
    try { this.rec && this.rec.stop(); } catch {}
    if (this.recorder) this.stopRecorderFallback();
  }

  /* ---- Dự phòng: ghi âm rồi nhờ máy chủ chuyển thành chữ ---- */
  async startRecorderFallback() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast("iPad này không hỗ trợ nghe giọng nói. Hãy dùng nút ⌨️ để gõ chữ nhé.", 6000);
      $("type-row").hidden = false;
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        this.recorder = null;
        this.listening = false;
        const blob = new Blob(chunks, { type: mime || "audio/webm" });
        if (blob.size < 2000) { setMic("", "Bấm để nói"); return; }
        setMic("thinking", "Đang nghe lại...");
        try {
          const r = await fetch("/api/stt", { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error || "Không nghe rõ");
          const text = (data.text || "").trim();
          if (text) {
            addBubble("user", text);
            transcript.push({ role: "user", text });
            this.ask(text);
          } else {
            setMic("", "Bấm để nói");
            toast("Thầy chưa nghe rõ, con nói lại nhé.");
          }
        } catch (e) {
          setMic("", "Bấm để nói");
          toast(e.message, 5000);
        }
      };
      mr.start();
      this.recorder = mr;
      this.listening = true;
      setMic("listening", "Đang ghi âm... bấm lần nữa khi nói xong");
    } catch {
      toast("Không mở được micro. Hãy cho phép dùng micro nhé.", 6000);
    }
  }
  stopRecorderFallback() {
    try { this.recorder && this.recorder.stop(); } catch {}
  }

  /* ---- Hỏi Claude qua máy chủ ---- */
  async ask(text, opts = {}) {
    this.messages.push({ role: "user", content: text });
    setMic("thinking", "Thầy đang nghĩ...");
    let reply;
    try {
      const data = await api("/api/chat", {
        method: "POST",
        body: JSON.stringify({ teacherId: this.teacher.id, messages: this.messages }),
      });
      reply = data.text;
    } catch (e) {
      this.messages.pop();
      setMic("", "Bấm để nói");
      toast(e.message, 6000);
      return;
    }
    if (this.stopped) return;
    this.messages.push({ role: "assistant", content: reply });
    transcript.push({ role: "assistant", text: reply });
    addBubble("assistant", reply);
    this.speak(reply);
  }

  /* ---- Đọc câu trả lời bằng giọng tiếng Việt của iPad ---- */
  speak(text) {
    if (muted) { setMic("", "Bấm để nói"); return; }
    try { speechSynthesis.cancel(); } catch {}
    // Bỏ emoji/ký hiệu để nghe tự nhiên hơn
    const clean = text.replace(/[*_#>`~]|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
    if (!clean) { this.afterSpeak(); return; }
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "vi-VN";
    if (this.viVoice) u.voice = this.viVoice;
    u.rate = 0.95;
    u.onend = () => this.afterSpeak();
    u.onerror = () => this.afterSpeak();
    this.speaking = true;
    setMic("speaking", "Thầy đang nói... (chạm để ngắt)");
    speechSynthesis.speak(u);
    // iOS đôi khi "ngủ quên" khi đọc đoạn dài → đánh thức định kỳ
    this._wake = setInterval(() => {
      if (!speechSynthesis.speaking) { clearInterval(this._wake); }
      else { speechSynthesis.pause(); speechSynthesis.resume(); }
    }, 10000);
  }
  afterSpeak() {
    clearInterval(this._wake);
    this.speaking = false;
    if (this.stopped) return;
    if (this.autoListen && this.SR) this.startListening();
    else setMic("", "Bấm để nói");
  }

  stop() {
    this.stopped = true;
    try { speechSynthesis.cancel(); } catch {}
    this.stopListening();
    clearInterval(this._wake);
  }
}

/* ================================================================
   CHẾ ĐỘ GROK: nối thẳng tới Grok Voice (realtime)
   ================================================================ */
class GrokVoice {
  constructor(teacher) {
    this.teacher = teacher;
    this.ws = null;
    this.ctx = null;        // AudioContext
    this.stream = null;     // micro
    this.playTime = 0;      // lịch phát âm thanh
    this.playingNodes = [];
    this.userBubble = null; // bong bóng chữ của con (cập nhật dần)
    this.botBubble = null;  // bong bóng chữ của thầy (cập nhật dần)
    this.botText = "";
    this.stopped = false;
    this.micOn = true;
  }

  async start() {
    // 1) Xin token tạm từ máy chủ (khóa thật không bao giờ xuống iPad)
    const info = await api("/api/grok-session?teacher=" + encodeURIComponent(this.teacher.id));

    // 2) Mở micro + bộ xử lý âm thanh (trong thao tác chạm để iOS cho phép)
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await this.ctx.resume();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });

    // 3) Nối WebSocket tới Grok bằng token tạm
    const ws = new WebSocket(
      "wss://api.x.ai/v1/realtime?model=" + encodeURIComponent(info.model),
      ["xai-client-secret." + info.token]
    );
    this.ws = ws;

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Kết nối Grok quá lâu")), 15000);
      ws.onopen = () => { clearTimeout(timer); resolve(); };
      ws.onerror = () => { clearTimeout(timer); reject(new Error("Không nối được tới Grok")); };
    });

    ws.onmessage = (e) => this.onEvent(e);
    ws.onclose = () => {
      if (!this.stopped) {
        setMic("", "Mất kết nối");
        toast("Mất kết nối với thầy. Bấm ← rồi vào lại nhé.", 6000);
      }
    };

    // 4) Cài đặt buổi học: vai trò + giọng + tự nhận ra khi con nói xong
    ws.send(JSON.stringify({
      type: "session.update",
      session: {
        voice: info.voice,
        instructions: info.instructions,
        turn_detection: { type: "server_vad" },
        audio: {
          input: {
            format: { type: "audio/pcm", rate: 24000 },
            transcription: { model: "grok-transcribe", language_hint: "vi" },
          },
          output: { format: { type: "audio/pcm", rate: 24000 } },
        },
      },
    }));
    // Thầy chào trước
    ws.send(JSON.stringify({ type: "response.create" }));

    await this.startMicPump();
    setMic("listening", "Cứ nói chuyện với thầy nhé!");
  }

  /* ---- Đưa tiếng micro lên Grok (PCM16 24kHz, gói ~100ms) ---- */
  async startMicPump() {
    const ctx = this.ctx;
    const source = ctx.createMediaStreamSource(this.stream);
    const inRate = ctx.sampleRate;
    let buf = [];
    let bufLen = 0;
    const flushEvery = Math.round(inRate / 10); // ~100ms

    const onChunk = (f32) => {
      if (!this.micOn || this.stopped) return;
      buf.push(f32);
      bufLen += f32.length;
      if (bufLen >= flushEvery) {
        const all = new Float32Array(bufLen);
        let o = 0;
        for (const c of buf) { all.set(c, o); o += c.length; }
        buf = []; bufLen = 0;
        this.sendAudio(this.downsampleTo24k(all, inRate));
      }
    };

    if (ctx.audioWorklet) {
      const code = `class Cap extends AudioWorkletProcessor {
        process(inputs) {
          const ch = inputs[0] && inputs[0][0];
          if (ch) this.port.postMessage(ch.slice(0));
          return true;
        }
      }
      registerProcessor("cap", Cap);`;
      const url = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
      await ctx.audioWorklet.addModule(url);
      const node = new AudioWorkletNode(ctx, "cap");
      node.port.onmessage = (e) => onChunk(e.data);
      source.connect(node);
      this.workletNode = node;
    } else {
      // iPad đời cũ: dùng cách cũ hơn
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      proc.onaudioprocess = (e) => onChunk(new Float32Array(e.inputBuffer.getChannelData(0)));
      source.connect(proc);
      proc.connect(ctx.destination);
      this.workletNode = proc;
    }
  }

  downsampleTo24k(f32, inRate) {
    const outRate = 24000;
    if (inRate === outRate) return f32;
    const outLen = Math.floor((f32.length * outRate) / inRate);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const pos = (i * inRate) / outRate;
      const i0 = Math.floor(pos);
      const i1 = Math.min(i0 + 1, f32.length - 1);
      out[i] = f32[i0] + (f32[i1] - f32[i0]) * (pos - i0);
    }
    return out;
  }

  sendAudio(f32) {
    if (!this.ws || this.ws.readyState !== 1) return;
    const pcm = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(pcm.buffer);
    let bin = "";
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    }
    this.ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: btoa(bin) }));
  }

  /* ---- Nhận sự kiện từ Grok ---- */
  onEvent(e) {
    let ev;
    try { ev = JSON.parse(e.data); } catch { return; }
    const t = ev.type || "";

    // Tiếng của thầy (base64 PCM16 24kHz)
    if (t === "response.output_audio.delta" || t === "response.audio.delta") {
      if (!muted) this.playDelta(ev.delta || ev.audio);
      return;
    }
    // Chữ của thầy (hiện dần)
    if (t === "response.output_audio_transcript.delta" || t === "response.audio_transcript.delta" || t === "response.output_text.delta" || t === "response.text.delta") {
      this.botText += ev.delta || "";
      if (!this.botBubble) this.botBubble = addBubble("assistant", "");
      this.botBubble.textContent = this.botText;
      $("transcript").scrollTop = $("transcript").scrollHeight;
      setMic("speaking", "Thầy đang nói...");
      return;
    }
    if (t === "response.done") {
      if (this.botText.trim()) transcript.push({ role: "assistant", text: this.botText.trim() });
      this.botBubble = null;
      this.botText = "";
      if (!this.stopped) setMic("listening", "Cứ nói chuyện với thầy nhé!");
      return;
    }
    // Chữ của con (bản cập nhật tích lũy)
    if (t === "conversation.item.input_audio_transcription.updated" || t === "conversation.item.input_audio_transcription.completed") {
      const text = (ev.transcript || ev.delta || "").trim();
      if (text) {
        if (!this.userBubble) this.userBubble = addBubble("user", text);
        else this.userBubble.textContent = text;
        $("transcript").scrollTop = $("transcript").scrollHeight;
        if (t.endsWith("completed")) {
          transcript.push({ role: "user", text });
          this.userBubble = null;
        } else {
          this.userLatest = text;
        }
      }
      return;
    }
    // Con bắt đầu nói → ngắt tiếng thầy (barge-in)
    if (t === "input_audio_buffer.speech_started") {
      this.stopPlayback();
      // chốt câu trước đó của con nếu chưa chốt
      if (this.userBubble && this.userLatest) {
        transcript.push({ role: "user", text: this.userLatest });
        this.userBubble = null;
        this.userLatest = "";
      }
      setMic("listening", "Thầy đang nghe, con nói đi!");
      return;
    }
    if (t === "input_audio_buffer.speech_stopped") {
      setMic("thinking", "Thầy đang nghĩ...");
      return;
    }
    if (t === "error") {
      console.error("Grok báo lỗi:", ev);
      const msg = ev.error?.message || "Có lỗi từ Grok";
      toast(msg, 5000);
    }
  }

  /* ---- Phát tiếng của thầy ---- */
  playDelta(b64) {
    if (!b64 || !this.ctx) return;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const pcm = new Int16Array(bytes.buffer);
    const buf = this.ctx.createBuffer(1, pcm.length, 24000);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;
    const node = this.ctx.createBufferSource();
    node.buffer = buf;
    node.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    if (this.playTime < now + 0.05) this.playTime = now + 0.05;
    node.start(this.playTime);
    this.playTime += buf.duration;
    this.playingNodes.push(node);
    node.onended = () => {
      this.playingNodes = this.playingNodes.filter((n) => n !== node);
    };
  }
  stopPlayback() {
    for (const n of this.playingNodes) { try { n.stop(); } catch {} }
    this.playingNodes = [];
    this.playTime = 0;
  }

  setMuted(m) { if (m) this.stopPlayback(); }

  micTap() {
    // Bật / tắt micro
    this.micOn = !this.micOn;
    if (this.micOn) setMic("listening", "Cứ nói chuyện với thầy nhé!");
    else setMic("", "Micro đang tắt — bấm để bật");
  }

  sendText(text) {
    if (!this.ws || this.ws.readyState !== 1) return;
    addBubble("user", text);
    transcript.push({ role: "user", text });
    this.ws.send(JSON.stringify({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
    }));
    this.ws.send(JSON.stringify({ type: "response.create" }));
  }

  stop() {
    this.stopped = true;
    this.stopPlayback();
    try { this.ws && this.ws.close(); } catch {}
    try { this.workletNode && this.workletNode.disconnect(); } catch {}
    try { this.stream && this.stream.getTracks().forEach((t) => t.stop()); } catch {}
    try { this.ctx && this.ctx.close(); } catch {}
  }
}

/* ---------------- Khởi động ---------------- */
(async function init() {
  if ("serviceWorker" in navigator) {
    try { navigator.serviceWorker.register("/sw.js"); } catch {}
  }
  try {
    const me = await api("/api/me");
    if (me.loggedIn) await enterHome();
    else show("pin");
  } catch {
    show("pin");
  }
})();
