require('./lib/env');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('./lib/store');
const lark = require('./lib/lark');
const ai = require('./lib/ai');
const video = require('./lib/video');
const sample = require('./lib/sample');
const { TABLES } = require('./lib/schema');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA = store.DIR;
const RAW = path.join(DATA, 'raw');
const OUT = path.join(DATA, 'out');
const WORK = path.join(DATA, 'work');
[RAW, OUT, WORK].forEach((d) => fs.mkdirSync(d, { recursive: true }));
const PUBLIC_URL = () => (process.env.APP_PUBLIC_URL || 'http://localhost:' + PORT).replace(/\/$/, '');

// ---------- Đăng nhập đơn giản (tùy chọn) ----------
app.use((req, res, next) => {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return next();
  const h = req.headers.authorization || '';
  if (h.startsWith('Basic ')) {
    const p = Buffer.from(h.slice(6), 'base64').toString().split(':').slice(1).join(':');
    if (p === pw) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="HAI RE Video Studio"').status(401).send('Cần mật khẩu');
});
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/media/out', express.static(OUT));

const staff = (req) => decodeURIComponent(req.headers['x-staff'] || '') || 'Nhân viên';
const now = () => Date.now();
const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => { console.error(e); res.status(500).json({ error: e.message }); });
const S = () => store.get();

async function logAct(req, action, target, detail) {
  await lark.safe(() => lark.addRecord('log', { 'Hành động': action, 'Thời điểm': now(), 'Người làm': staff(req), 'Đối tượng liên quan': target || '', 'Chi tiết': detail || '' }));
}

// ---------- Trạng thái hệ thống ----------
const SUPPORTED = { p1: 1, p2: 1, p3: 1, c1: 'whisper', v1: 1, v3: 1, v4: 1 };
app.get('/api/status', (req, res) => {
  const caps = video.capabilities();
  res.json({ lark: lark.enabled(), larkErrors: S().larkErrors || [], ai: ai.enabled(), ffmpeg: caps.ffmpeg, whisper: caps.whisper, music: false,
    supported: Object.fromEntries(Object.entries(SUPPORTED).map(([k, v]) => [k, v === 'whisper' ? caps.whisper : true])) });
});

// ---------- Bước 1: xu hướng ----------
async function readStrategy() {
  const strat = await lark.safe(async () => (await lark.listRecords('strategy', 50)).map((r) => r.fields).filter((f) => f['Còn hiệu lực'] !== false));
  const reqs = await lark.safe(async () => (await lark.listRecords('research', 50)).map((r) => r.fields));
  const flat = (arr) => (arr || []).map((f) => Object.entries(f).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('; ')).join('\n');
  return { strategy: flat(strat), requirements: flat(reqs) };
}

const pubVideo = (v) => Object.assign({}, v, { file: !!v.file, voice: !!v.voice, music: !!v.music });
const pubVideos = () => Object.fromEntries(Object.entries(S().videos).map(([k, v]) => [k, pubVideo(v)]));
app.get('/api/batch', (req, res) => {
  const s = S();
  res.json({ batch: s.batch, templates: sample.BUILTIN_TEMPLATES.concat(s.customTemplates), lanes: s.lanes, videos: pubVideos() });
});

app.post('/api/research', wrap(async (req, res) => {
  const ctx = await readStrategy();
  let trends = null, demo = false, error = '';
  try { trends = await ai.researchTrends(ctx); } catch (e) { error = e.message; }
  if (!trends) { trends = sample.TRENDS; demo = true; }
  const id = 'D' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const s = S();
  s.batch = { id, createdAt: now(), trends, picked: [], template: 'auto', demo, error };
  s.lanes = []; s.cards = {}; s.videos = {};
  for (const t of trends) {
    const rid = await lark.safe(() => lark.addRecord('trends', { 'Tên xu hướng': t.name, 'Đợt nghiên cứu': id, 'Ngày': now(), 'Mã xu hướng': t.id, 'Nền tảng': t.where, 'Mức độ': t.heat,
      'Mô tả': t.what, 'Gợi ý cho Hai Rê': t.idea, 'Mức khớp chiến lược': t.fit, 'Lý do khớp': t.why || '', 'Link video mẫu': t.link || '', 'Được chọn': false }));
    if (rid) s.larkIds['trend:' + id + ':' + t.id] = rid;
  }
  store.save();
  await logAct(req, 'AI nghiên cứu xu hướng', id, demo ? 'Dữ liệu mẫu' : '6 xu hướng từ web');
  res.json({ batch: s.batch });
}));

app.post('/api/templates', wrap(async (req, res) => {
  const prompt = String(req.body.prompt || '').slice(0, 300);
  let t = null;
  try { t = await ai.buildTemplate(prompt); } catch (e) { /* dùng mẫu */ }
  const scenes = t && t.scenes ? t.scenes : sample.PROMO_SCENES;
  const tpl = { id: 'c' + now().toString(36), tag: 'Khung của anh chị', name: (t && t.name) || 'Khuyến mãi năng động', size: (t && t.size) || '45 giây · 6 phân cảnh',
    what: 'Do AI tạo từ mô tả: ' + prompt, scenes: scenes.map((x) => x.name).join(' · '), sceneList: scenes, demo: !t };
  S().customTemplates.push(tpl);
  store.save();
  await logAct(req, 'Tạo khung phân cảnh mới', tpl.name, prompt);
  res.json({ template: tpl });
}));

// chọn 3 xu hướng + khung, rồi AI viết định hướng quay
app.post('/api/select', wrap(async (req, res) => {
  const s = S();
  if (!s.batch) return res.status(400).json({ error: 'Chưa có đợt nghiên cứu' });
  const ids = (req.body.ids || []).slice(0, 3);
  if (ids.length !== 3) return res.status(400).json({ error: 'Cần chọn đúng 3 xu hướng' });
  s.batch.picked = ids;
  s.batch.template = req.body.template || 'auto';
  const who = staff(req);
  for (const t of s.batch.trends) {
    const rid = s.larkIds['trend:' + s.batch.id + ':' + t.id];
    if (rid) await lark.safe(() => lark.updateRecord('trends', rid, { 'Được chọn': ids.includes(t.id), 'Người chọn': ids.includes(t.id) ? who : '', 'Thời điểm chọn': ids.includes(t.id) ? now() : null }));
  }
  const picked = s.batch.trends.filter((t) => ids.includes(t.id));
  const tpl = sample.BUILTIN_TEMPLATES.concat(s.customTemplates).find((x) => x.id === s.batch.template);
  const ctx = await readStrategy();
  let scripts = null, demo = false;
  try { scripts = await ai.writeScripts({ trends: picked, strategy: ctx.strategy, template: tpl && tpl.id !== 'auto' ? `${tpl.name}: ${tpl.scenes}` : '' }); } catch (e) { s.batch.error = e.message; }
  s.lanes = picked.map((t, i) => {
    const a = scripts && scripts.find((x) => x.trendId === t.id);
    const base = a && a.scenes && a.scenes.length ? a : Object.assign({}, sample.SCRIPTS[t.id] || sample.genericScript(t));
    if (!a) demo = true;
    return { id: 'L' + (i + 1), trendId: t.id, trend: t.name, title: base.title || t.name, length: base.length || '', goal: base.goal || t.idea, prep: base.prep || '', scenes: base.scenes, extra: 0 };
  });
  s.cards = {}; s.videos = {};
  s.batch.scriptsDemo = demo;
  for (const l of s.lanes) {
    const rid = await lark.safe(() => lark.addRecord('scripts', { 'Tiêu đề': l.title, 'Mã xu hướng': l.trendId, 'Đợt nghiên cứu': s.batch.id, 'Thời lượng': l.length, 'Ý chính': l.goal, 'Chuẩn bị': l.prep,
      'Danh sách cảnh': l.scenes.map((c, i) => `${i + 1}. ${c.role} (${c.shot}, ${c.time}): ${c.film} Cách quay: ${c.tip}`).join('\n'), 'Trạng thái': 'Chờ quay' }));
    if (rid) s.larkIds['script:' + s.batch.id + ':' + l.id] = rid;
  }
  store.save();
  await logAct(req, 'Chọn 3 xu hướng', s.batch.id, picked.map((t) => t.name).join(' | '));
  res.json({ lanes: s.lanes, demo });
}));

// ---------- Bước 2: phân cảnh và quay ----------
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { const d = path.join(RAW, S().batch ? S().batch.id : 'misc'); fs.mkdirSync(d, { recursive: true }); cb(null, d); },
    filename: (req, file, cb) => cb(null, crypto.randomBytes(4).toString('hex') + '-' + file.originalname.replace(/[^\w.\-]+/g, '_'))
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }
});

app.post('/api/upload', upload.single('file'), wrap(async (req, res) => {
  const key = String(req.query.key || '');
  if (!key || !req.file) return res.status(400).json({ error: 'Thiếu thẻ hoặc file' });
  const s = S();
  const c = s.cards[key] || (s.cards[key] = { tags: [], desc: '' });
  c.file = req.file.path; c.name = req.file.originalname; c.size = req.file.size; c.cut = null; c.at = now();
  store.save();
  await logAct(req, 'Nộp video thô', key, req.file.originalname);
  res.json({ card: pub(c) });
}));

const pub = (c) => ({ name: c.name, size: c.size, cut: c.cut, tags: c.tags || [], desc: c.desc || '', has: !!c.file });
app.get('/api/cards', (req, res) => res.json(Object.fromEntries(Object.entries(S().cards).map(([k, c]) => [k, pub(c)]))));

app.post('/api/card', wrap(async (req, res) => {
  const { key, desc, tags } = req.body;
  const c = S().cards[key] || (S().cards[key] = { tags: [], desc: '' });
  if (desc !== undefined) c.desc = String(desc).slice(0, 1000);
  if (Array.isArray(tags)) c.tags = tags.slice(0, 6);
  store.save();
  res.json({ card: pub(c) });
}));

app.post('/api/trim', wrap(async (req, res) => {
  const c = S().cards[req.body.key];
  if (!c || !c.file) return res.status(400).json({ error: 'Thẻ chưa có video thô' });
  const out = c.file.replace(/(\.[^.]+)?$/, '.trim.mp4');
  const cut = await video.trimSilence(c.file, out, { d: 0.3, noise: '-32dB' });
  fs.unlinkSync(c.file);
  c.file = out; c.cut = Math.round(cut * 10) / 10;
  store.save();
  await logAct(req, 'AI Auto-Trim', req.body.key, 'Bớt ' + c.cut + ' giây');
  res.json({ card: pub(c) });
}));

app.post('/api/lane/extra', wrap(async (req, res) => {
  const l = S().lanes.find((x) => x.id === req.body.laneId);
  if (!l) return res.status(404).json({ error: 'Không thấy hàng này' });
  l.extra = (l.extra || 0) + 1; store.save();
  res.json({ extra: l.extra });
}));

app.post('/api/rewrite-note', wrap(async (req, res) => {
  const l = S().lanes.find((x) => x.id === req.body.laneId);
  const sc = l && l.scenes[req.body.index];
  if (!sc) return res.status(404).json({ error: 'Không thấy cảnh' });
  if (!ai.enabled()) return res.json({ error: 'Chưa nối khóa AI (ANTHROPIC_API_KEY) nên chưa viết lại được.' });
  const r = await ai.rewriteNote({ scene: sc, trend: l.trend });
  if (r && r.film) { sc.film = r.film; sc.tip = r.tip || sc.tip; store.save(); }
  res.json({ scene: sc });
}));

// ---------- Bước 3: dựng video ----------
const jobs = {};
const extraRoles = { role: 'Cảnh quay thêm' };

function laneClips(l) {
  const s = S();
  const list = [];
  l.scenes.forEach((sc, i) => {
    const c = s.cards[l.id + ':' + i];
    if (c && c.file) {
      const m = /Chữ to:\s*[“"]?(.+?)[”"]?\s*$/.exec(sc.say || '');
      list.push({ file: c.file, tags: c.tags || [], text: m ? m[1] : sc.role });
    }
  });
  for (let k = 0; k < (l.extra || 0); k++) {
    const c = s.cards[l.id + ':x' + k];
    if (c && c.file) list.push({ file: c.file, tags: c.tags || [], text: extraRoles.role });
  }
  return list;
}

const DEFAULT_OPTS = { p1: true, p2: true, p3: false, b1: true, b2: true, b3: false, b4: false, t1: true, t2: true, t3: true, c1: true, c2: false, c3: true,
  a1: true, a2: true, a3: true, v1: true, v2: true, v3: true, v4: true };

app.post('/api/draft', wrap(async (req, res) => {
  const s = S();
  const l = s.lanes.find((x) => x.id === req.body.laneId);
  if (!l) return res.status(404).json({ error: 'Không thấy hàng này' });
  const clips = laneClips(l);
  const need = l.scenes.length;
  const have = l.scenes.filter((_, i) => s.cards[l.id + ':' + i] && s.cards[l.id + ':' + i].file).length;
  if (have < need) return res.status(400).json({ error: `Mới nộp ${have}/${need} cảnh` });
  const v = s.videos[l.id] || (s.videos[l.id] = { id: s.batch.id + '-' + l.id, laneId: l.id, status: 'Đang nộp', prompts: {}, approved: false });
  if (v.status === 'Đang dựng') return res.status(409).json({ error: 'Video này đang được dựng' });
  v.options = Object.assign({}, DEFAULT_OPTS, v.options || {}, req.body.options || {});
  if (req.body.prompts) v.prompts = req.body.prompts;
  v.status = 'Đang dựng'; v.error = ''; v.notes = [];
  const jobId = crypto.randomBytes(4).toString('hex');
  jobs[jobId] = { id: jobId, laneId: l.id, step: 'Bắt đầu', progress: 0, done: false, error: '' };
  v.jobId = jobId;
  store.save();
  res.json({ jobId, videoId: v.id });

  const o = v.options;
  const outFile = path.join(OUT, v.id + '-' + Date.now() + '.mp4');
  const opts = {
    trim: o.p3 && !o.p1 && !o.p2 ? null : (o.p2 ? { d: 0.15, noise: '-30dB' } : (o.p1 ? { d: 0.25, noise: '-30dB' } : null)),
    cinematic: !!o.v1, endCard: !!o.v4, cta: o.v3 ? 'Theo dõi fanpage HAI RÊ' : '', captions: !!o.c1, voice: v.voice || null, music: v.music || null
  };
  try {
    const r = await video.buildVideo({ clips, opts, outFile, workDir: path.join(WORK, v.id), onStep: (t, p) => { jobs[jobId].step = t; jobs[jobId].progress = Math.min(p, 0.99); } });
    v.file = outFile; v.url = PUBLIC_URL() + '/media/out/' + path.basename(outFile); v.localUrl = '/media/out/' + path.basename(outFile);
    v.status = 'Chờ duyệt'; v.duration = r.duration; v.notes = r.notes; v.doneAt = now();
    jobs[jobId].done = true; jobs[jobId].progress = 1; jobs[jobId].step = 'Xong';
    const fields = { 'Mã video': v.id, 'Tiêu đề kịch bản': l.title, 'Đợt nghiên cứu': s.batch.id, 'Người quay': staff(req), 'Thẻ video thô': l.scenes.map((c, i) => { const cd = s.cards[l.id + ':' + i]; return `${i + 1}. ${cd ? cd.name : '-'}${cd && cd.desc ? ' (' + cd.desc + ')' : ''}`; }).join('\n'),
      'Ghi âm': v.voiceName || '', 'Nhạc nền': v.musicName || '', 'Hiệu ứng chung': Object.keys(o).filter((k) => o[k]).join(', '), 'Link video hoàn chỉnh': v.url, 'Trạng thái': 'Chờ duyệt', 'Ngày xong': now() };
    if (s.larkIds['video:' + v.id]) await lark.safe(() => lark.updateRecord('videos', s.larkIds['video:' + v.id], fields));
    else { const rid = await lark.safe(() => lark.addRecord('videos', fields)); if (rid) s.larkIds['video:' + v.id] = rid; }
    await logAct(req, 'AI dựng xong video', v.id, (r.notes || []).join(' '));
  } catch (e) {
    v.status = 'Lỗi'; v.error = e.message; jobs[jobId].done = true; jobs[jobId].error = e.message;
    await logAct(req, 'Dựng video lỗi', v.id, e.message.slice(0, 300));
  }
  store.save();
}));

app.get('/api/jobs/:id', (req, res) => res.json(jobs[req.params.id] || { done: true, error: 'Không thấy tiến trình' }));
app.get('/api/videos', (req, res) => res.json(pubVideos()));

const audio = multer({ storage: multer.diskStorage({ destination: (r, f, cb) => cb(null, RAW), filename: (r, f, cb) => cb(null, crypto.randomBytes(4).toString('hex') + '-' + f.originalname.replace(/[^\w.\-]+/g, '_')) }), limits: { fileSize: 200 * 1024 * 1024 } });
app.post('/api/audio', audio.single('file'), wrap(async (req, res) => {
  const l = S().lanes.find((x) => x.id === req.query.laneId);
  if (!l || !req.file) return res.status(400).json({ error: 'Thiếu dữ liệu' });
  const kind = req.query.kind === 'music' ? 'music' : 'voice';
  const v = S().videos[l.id] || (S().videos[l.id] = { id: S().batch.id + '-' + l.id, laneId: l.id, status: 'Đang nộp', prompts: {}, approved: false });
  v[kind] = req.file.path; v[kind + 'Name'] = req.file.originalname;
  store.save();
  await logAct(req, kind === 'music' ? 'Tải nhạc nền' : 'Tải ghi âm', v.id, req.file.originalname);
  res.json({ name: req.file.originalname, kind });
}));

app.post('/api/music-gen', (req, res) => res.status(501).json({ error: 'Chưa nối dịch vụ tạo nhạc bằng AI (câu hỏi 5 trong file bàn giao). Tạm thời tải một file nhạc lên ở nút bên cạnh.' }));

app.post('/api/videos/:id/approve', wrap(async (req, res) => {
  const v = Object.values(S().videos).find((x) => x.id === req.params.id);
  if (!v || !v.file) return res.status(404).json({ error: 'Chưa có video' });
  v.approved = !v.approved; v.status = v.approved ? 'Đã duyệt' : 'Chờ duyệt';
  store.save();
  const rid = S().larkIds['video:' + v.id];
  if (rid) await lark.safe(() => lark.updateRecord('videos', rid, { 'Trạng thái': v.status }));
  await logAct(req, v.approved ? 'Duyệt video' : 'Bỏ duyệt video', v.id, '');
  res.json({ approved: v.approved, status: v.status });
}));

app.post('/api/videos/:id/revise', wrap(async (req, res) => {
  const v = Object.values(S().videos).find((x) => x.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'Chưa có video' });
  v.revise = String(req.body.text || '').slice(0, 1000); v.status = 'Cần sửa'; v.approved = false;
  store.save();
  const rid = S().larkIds['video:' + v.id];
  if (rid) await lark.safe(() => lark.updateRecord('videos', rid, { 'Trạng thái': 'Cần sửa', 'Yêu cầu sửa': v.revise }));
  await logAct(req, 'Yêu cầu sửa video', v.id, v.revise);
  res.json({ status: v.status });
}));

app.post('/api/reset', wrap(async (req, res) => { store.reset(); res.json({ ok: true }); }));

// Máy chủ khởi động lại giữa lúc đang dựng thì đánh dấu lỗi để nhân viên bấm dựng lại
for (const v of Object.values(S().videos)) { if (v.status === 'Đang dựng') { v.status = 'Lỗi'; v.error = 'Máy chủ khởi động lại khi đang dựng. Bấm “Áp dụng lớp này” để dựng lại.'; } }
store.save();

app.listen(PORT, () => console.log(`HAI RÊ Video Studio chạy ở http://localhost:${PORT}  (Lark: ${lark.enabled() ? 'đã nối' : 'chưa nối'}, AI: ${ai.enabled() ? 'đã nối' : 'chưa nối'})`));
