'use strict';
const $app = document.getElementById('app');
const S = {
  tab: 0, status: null, batch: null, templates: [], lanes: [], cards: {}, videos: {},
  picked: [], tpl: 'auto', prompt: 'Tạo tuyến video 45s giới thiệu khuyến mãi năng động',
  busy: '', uploads: {}, vid: null, cat: 'pace', prompts: {}, layerMsg: '', musicMsg: '', revise: '',
  staff: localStorage.getItem('hr-staff') || '', poll: null, jobs: {}
};

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICON = {
  check: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  up: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/></svg>',
  sc: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 8L20 19"/><path d="M8.5 16L20 5"/></svg>',
  wand: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20L16 8"/><path d="M15 5l4 4"/><path d="M19 2v3"/><path d="M20.5 3.5h-3"/></svg>',
  dl: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>',
  mic: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>',
  music: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  arrow: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
  plus: '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>'
};
const TAGS = ['Rung nhẹ', 'Tua nhanh', 'Quay chậm', 'Zoom dần', 'Chữ nổi bật'];
const CATS = [
  { id: 'pace', name: 'Nhịp độ và cắt cảnh', fn: 'AI thu hẹp các khoảng nghỉ giữa các câu nói để người xem ở lại đến hết video.', opts: [['p1', 'Cắt nhịp dồn dập'], ['p2', 'Triệt tiêu khoảng lặng 100%'], ['p3', 'Giữ nhịp kể chuyện chậm']] },
  { id: 'broll', name: 'Video trám (B-roll)', fn: 'AI chèn cảnh phụ lên các đoạn nói để video bớt nhàm.', opts: [['b1', 'Trám cận cảnh chi tiết'], ['b2', 'Timelapse'], ['b3', 'Meme minh họa'], ['b4', 'Stock footage']], pl: 'Nhờ AI tạo video trám', ph: 'Ví dụ: Tạo video AI 3 giây cảnh đường ướt sũng mưa' },
  { id: 'trans', name: 'Chuyển cảnh', fn: 'Chuyển cảnh tự động khớp với nhịp beat của nhạc nền.', opts: [['t1', 'Zoom vào, zoom ra mượt'], ['t2', 'Glitch giật lag'], ['t3', 'Whip Pan (quét ngang)']] },
  { id: 'cap', name: 'Phụ đề và chữ', fn: 'Tự nhận diện giọng nói tiếng Việt, hiện phụ đề trên màn hình.', opts: [['c1', 'Phụ đề tiếng Việt tự động'], ['c2', 'Chữ 3D bay lượn'], ['c3', 'Cảnh báo đỏ/vàng ở phần mở đầu']] },
  { id: 'audio', name: 'Âm thanh (nhạc, ghi âm)', fn: 'Tự giảm âm lượng nhạc nền khi có giọng đọc (ducking).', opts: [['a1', 'Nhạc beat mạnh'], ['a2', 'Âm thanh Whoosh (vút)'], ['a3', 'Âm thanh Pop (gõ)']], pl: 'Mô tả nhạc nền muốn có', ph: 'Ví dụ: Nhạc không bản quyền hợp với video lốp xe và sửa xe' },
  { id: 'vfx', name: 'Hiệu ứng và kêu gọi', fn: 'AI đánh màu cả video và chèn thẻ cuối kêu gọi.', opts: [['v1', 'Lọc màu Cinematic'], ['v2', 'Mũi tên chỉ nút nhắn tin'], ['v3', 'Kêu gọi theo dõi fanpage'], ['v4', 'Logo và địa chỉ Hai Rê ở cuối']] }
];
const DEFAULT_OPTS = { p1: 1, p2: 1, b1: 1, b2: 1, t1: 1, t2: 1, t3: 1, c1: 1, c3: 1, a1: 1, a2: 1, a3: 1, v1: 1, v2: 1, v3: 1, v4: 1 };

async function api(path, opts = {}) {
  const o = Object.assign({ headers: {} }, opts);
  o.headers['X-Staff'] = encodeURIComponent(S.staff || 'Nhân viên');
  if (o.body && !(o.body instanceof FormData)) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(o.body); }
  const r = await fetch(path, o);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Lỗi ' + r.status);
  return j;
}
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 4500); }
async function guard(fn) { try { await fn(); } catch (e) { S.busy = ''; render(); toast(e.message); } }

// ---------- Nạp dữ liệu ----------
async function load() {
  S.status = await api('/api/status');
  const d = await api('/api/batch');
  S.batch = d.batch; S.templates = d.templates; S.lanes = d.lanes; S.videos = d.videos;
  S.cards = await api('/api/cards');
  S.picked = d.batch ? d.batch.picked.slice() : [];
  if (d.batch && d.batch.template) S.tpl = d.batch.template;
  const running = Object.values(S.videos).find((v) => v.status === 'Đang dựng' && v.jobId);
  if (running) { S.tab = 2; S.vid = running.laneId; startPoll(running.jobId, running.laneId); }
  else if (S.lanes.length && Object.keys(S.videos).length) S.tab = 2;
  else if (S.lanes.length) S.tab = 1;
  if (!S.vid && S.lanes.length) S.vid = (Object.values(S.videos)[0] || {}).laneId || S.lanes[0].id;
  render();
}

// ---------- Hiển thị ----------
function head() {
  const st = S.status || {};
  const chip = (ok, good, bad) => ok ? `<span><b>${good}</b></span>` : `<span class="bad">${bad}</span>`;
  return `<header class="hdr"><img src="logo.png" alt="Hai Rê"><div class="t"><b>Video Studio</b><span>Nội bộ Hai Rê</span></div>
  <label class="who">Người làm: <input id="staff" type="text" placeholder="Gõ tên của anh chị" value="${esc(S.staff)}"></label></header>
  <div class="sys" role="status">
    ${chip(st.lark, 'Lark Base: đã nối', 'Lark Base: chưa nối (dữ liệu chỉ lưu trên máy chủ này)')}
    ${chip(st.ai, 'AI: đã nối', 'AI: chưa nối khóa (đang dùng dữ liệu mẫu)')}
    ${chip(st.ffmpeg, 'Dựng video: sẵn sàng', 'Dựng video: máy chủ chưa cài FFmpeg')}
    ${chip(st.whisper, 'Phụ đề tự động: có', 'Phụ đề tự động: chưa cài Whisper')}
    ${(st.larkErrors && st.larkErrors.length) ? `<span class="bad">Lark lỗi gần nhất: ${esc(st.larkErrors[0].msg)}</span>` : ''}
  </div>`;
}
function tabs() {
  const names = ['1. Chọn xu hướng', '2. Phân cảnh và quay', '3. Duyệt và xuất video'];
  return `<nav class="tabs" aria-label="Các bước làm video"><ol>${names.map((n, i) => `<li><button type="button" data-act="tab" data-i="${i}" class="${S.tab === i ? 'on' : ''}" ${S.tab === i ? 'aria-current="step"' : ''}>${i < S.tab ? ICON.check : ''}${n}</button></li>`).join('')}</ol></nav>`;
}

function viewTrends() {
  const b = S.batch;
  if (!b) {
    return `<section class="card"><h1>Bắt đầu một đợt video mới</h1>
      <p class="mut">AI sẽ đọc chiến lược Hai Rê trong Lark Base, quét Facebook Reels và TikTok, đối chiếu lại rồi đề xuất 5 xu hướng. Việc này mất khoảng 1 đến 2 phút.</p>
      <button class="btn red" data-act="research" style="align-self:flex-start" ${S.busy ? 'disabled' : ''}>${S.busy === 'research' ? '<span class="spin"></span>AI đang nghiên cứu…' : ICON.wand + 'AI nghiên cứu xu hướng'}</button></section>`;
  }
  const full = S.picked.length >= 3;
  const trends = b.trends.map((t, i) => {
    const on = S.picked.includes(t.id), locked = !on && full;
    return `<article class="item ${on ? 'on' : ''}"><div style="display:flex;gap:12px;align-items:center"><span class="rank">${i + 1}</span><div><div class="kick">${esc(t.where)}</div><div class="nm">${esc(t.name)}</div></div></div>
      <p>${esc(t.what)}</p><p class="mut"><strong style="color:#1a1a1a">Áp dụng cho Hai Rê:</strong> ${esc(t.idea)}</p>
      <div class="chips"><span class="chip">${esc(t.heat)}</span><span class="chip fit">Đối chiếu chiến lược: ${esc(t.fit)}</span></div>
      ${t.why ? `<p class="small mut">${esc(t.why)}</p>` : ''}${t.link ? `<a class="small" href="${esc(t.link)}" target="_blank" rel="noopener">Xem video mẫu</a>` : ''}
      <button class="btn ${on ? 'red' : (locked ? 'off' : '')}" data-act="toggle" data-id="${t.id}" aria-pressed="${on}">${on ? 'Đã chọn · bấm để bỏ' : (locked ? 'Đã đủ 3 · bỏ bớt một cái để đổi' : 'Chọn xu hướng này')}</button></article>`;
  }).join('');
  const tpls = S.templates.map((p) => `<article class="item ${S.tpl === p.id ? 'on' : ''}"><div class="kick">${esc(p.tag)}</div><div class="nm">${esc(p.name)}</div><div class="red" style="font-weight:600">${esc(p.size)}</div>
    <p>${esc(p.what)}</p><p class="mut small">${esc(p.scenes)}</p><button class="btn ${S.tpl === p.id ? 'red' : ''}" data-act="tpl" data-id="${p.id}" aria-pressed="${S.tpl === p.id}">${S.tpl === p.id ? 'Đang dùng khung này' : 'Dùng khung này'}</button></article>`).join('');
  const last = S.templates[S.templates.length - 1];
  const built = last && last.sceneList ? `<div class="box"><b>${esc(last.name)} · ${esc(last.size)}. Đã lưu thành khung mới ở mục 1B.</b>${last.demo ? '<span class="small mut">Khung mẫu, chưa nối AI.</span>' : ''}
    <ol class="scenes6">${last.sceneList.map((n) => `<li><span class="small mut" style="font-weight:700">${esc(n.time)}</span><b>Cảnh ${esc(n.num)}: ${esc(n.name)}</b></li>`).join('')}</ol></div>` : '';
  const names = b.trends.filter((t) => S.picked.includes(t.id)).map((t) => t.name);
  return `<section class="card"><h1>Chọn 3 xu hướng cho đợt video này</h1>
    <p class="mut">AI đã đọc chiến lược Hai Rê, quét Facebook Reels và TikTok, rồi đối chiếu lại với chiến lược trước khi đề xuất. Anh chị chọn đúng 3 xu hướng hợp nhất. Sau đó chọn khung phân cảnh có sẵn, hoặc nhờ AI tạo khung mới.</p>
    ${b.demo ? `<div class="warn">Đang hiển thị <b>dữ liệu mẫu</b> vì chưa nối AI${b.error ? ' (' + esc(b.error) + ')' : ''}. Khi nối khóa AI, bấm “Nghiên cứu lại” để lấy xu hướng thật.</div>` : ''}
    <div class="prog"><b>Đã chọn ${S.picked.length}/3 xu hướng</b><div class="bar"><i style="width:${Math.round(S.picked.length / 3 * 100)}%"></i></div>
      <button class="btn sm" data-act="research" ${S.busy ? 'disabled' : ''}>${S.busy === 'research' ? '<span class="spin"></span>Đang nghiên cứu…' : 'Nghiên cứu lại'}</button></div></section>
    <section><h2 style="margin-bottom:12px">Bước 1A. 6 xu hướng AI đề xuất</h2><div class="grid3">${trends}</div></section>
    <section><h2>Bước 1B. Thư viện tuyến nội dung</h2><p class="mut" style="margin:4px 0 12px">Tuyến nội dung quyết định cách chia phân cảnh. Không chọn thì AI tự chọn tuyến hợp với 3 xu hướng ở trên.</p><div class="grid4">${tpls}</div></section>
    <section class="card"><h2>Tạo tuyến mới bằng mô tả</h2><p class="mut">Gõ mô tả tuyến video anh chị muốn. AI sinh ra cấu trúc phân cảnh riêng và lưu lại thành khung dùng lại được.</p>
      <label class="f"><span>Mô tả tuyến video</span><input type="text" id="prompt" value="${esc(S.prompt)}"></label>
      <button class="btn" style="align-self:flex-start" data-act="buildTpl" ${S.busy ? 'disabled' : ''}>${S.busy === 'tpl' ? '<span class="spin"></span>AI đang tạo…' : ICON.wand + 'AI tạo tuyến và lưu lại'}</button>${built}</section>
    <section class="card row"><span style="flex:999 1 260px;font-weight:600">${names.length ? 'Đã chọn: ' + esc(names.join(' · ')) : 'Chưa chọn xu hướng nào'}</span>
      <button class="btn ${full ? 'red' : 'off'}" style="flex:1 1 260px" data-act="goStep2" ${full && !S.busy ? '' : 'disabled'}>${S.busy === 'select' ? '<span class="spin"></span>AI đang viết định hướng quay…' : (full ? 'Sang bước 2: Phân cảnh và quay' + ICON.arrow : 'Chọn đủ 3 xu hướng để đi tiếp')}</button></section>
    <p class="small mut">Lựa chọn của anh chị được lưu vào Lark Base để làm báo cáo hoạt động.</p>`;
}

function cardHtml(l, key, num, sc, extra) {
  const c = S.cards[key] || {};
  const has = !!c.has;
  const up = S.uploads[key];
  const tr = !has ? 'Chọn video thô trước khi cắt' : (c.cut != null ? (c.cut > 0 ? `Đã cắt khoảng lặng, bớt ${c.cut} giây` : 'Không có khoảng lặng để cắt') : 'AI Auto-Trim: cắt khoảng lặng, đoạn nói vấp');
  const tags = c.tags || [];
  return `<article class="sc ${has ? 'has' : ''}"><div class="hd"><span class="badge">${num}</span><div><b>${esc(sc.role)}</b><small>${esc(sc.shot)} · ${esc(sc.time)}</small></div></div>
    <div class="note"><span class="kick red">Ghi chú quay</span><b style="font-weight:600">${esc(sc.film)}</b><span><b>Cách quay:</b> ${esc(sc.tip)}</span><span class="small mut">Lời hoặc chữ (tham khảo): ${esc(sc.say)}</span>
      ${extra ? '' : `<button class="btn sm" style="align-self:flex-start" data-act="rewrite" data-lane="${l.id}" data-i="${num - 1}">${ICON.wand}Nhờ AI viết lại</button>`}</div>
    <label class="dz ${has ? 'has' : ''}" data-drop="${key}"><input type="file" accept="video/*" data-up="card" data-key="${key}">${ICON.up}
      <span class="dz-label" style="overflow-wrap:anywhere">${up != null ? 'Đang tải lên… ' + up + '%' : (has ? esc(c.name) : 'Bấm để chọn video thô')}</span><small>${has ? 'Bấm để đổi video khác' : 'hoặc kéo thả video vào đây'}</small></label>
    <label class="f"><span>Mô tả video này</span><textarea rows="2" data-desc="${key}" placeholder="Ví dụ: quay ở 170 Lê Duẩn, đoạn đẹp nhất ở giây 5">${esc(c.desc || '')}</textarea></label>
    <div><b style="font-size:14px">Hiệu ứng cho cảnh này</b><div class="tags" style="margin-top:6px">${TAGS.map((t) => `<button type="button" class="tag ${tags.includes(t) ? 'on' : ''}" data-act="tag" data-key="${key}" data-tag="${t}" aria-pressed="${tags.includes(t)}">${t}</button>`).join('')}</div></div>
    <button class="btn sm ${has ? '' : 'off'}" style="margin-top:auto;${has && c.cut != null ? 'border-color:#C41919;color:#9E1212' : ''}" data-act="trim" data-key="${key}" ${has && S.busy !== 'trim:' + key ? '' : 'disabled'}>${S.busy === 'trim:' + key ? '<span class="spin"></span>Đang cắt…' : ICON.sc + tr}</button></article>`;
}
function viewBoard() {
  if (!S.lanes.length) return `<section class="card"><h1>Chưa có phân cảnh</h1><p class="mut">Hãy chọn 3 xu hướng ở bước 1 trước.</p><button class="btn red" style="align-self:flex-start" data-act="tab" data-i="0">Về bước 1</button></section>`;
  const lanes = S.lanes.map((l, li) => {
    const done = l.scenes.filter((_, i) => (S.cards[l.id + ':' + i] || {}).has).length, total = l.scenes.length, ready = done === total;
    let cards = l.scenes.map((sc, i) => cardHtml(l, l.id + ':' + i, i + 1, sc, false)).join('');
    for (let k = 0; k < (l.extra || 0); k++) cards += cardHtml(l, l.id + ':x' + k, total + k + 1, { role: 'Cảnh quay thêm', shot: 'Tùy chọn', time: 'AI tự xếp chỗ', film: 'Cảnh quay thêm ngoài storyboard.', say: 'Ghi rõ trong phần mô tả để AI biết đặt vào đâu.', tip: 'Quay dọc, giữ máy chắc tay.' }, true);
    const v = S.videos[l.id];
    return `<section class="card"><div class="lane-h"><div><span class="kick">Xu hướng ${li + 1} · ${esc(l.trend)} · ${esc(l.length)}</span><h2>${esc(l.title)}</h2><span class="mut">${esc(l.goal)}</span></div>
      <div><b class="red">Đã nộp ${done}/${total} cảnh</b><div class="bar" style="flex:none"><i style="width:${Math.round(done / total * 100)}%"></i></div></div></div>
      <p class="box" style="display:block"><strong>Chuẩn bị trước khi quay:</strong> ${esc(l.prep)}</p>
      <div class="track" role="region" aria-label="Các phân cảnh, cuộn ngang" tabindex="0">${cards}
        <button type="button" class="add" data-act="addExtra" data-lane="${l.id}">${ICON.plus}Thêm phân cảnh<small>Cho cảnh quay thêm ngoài storyboard</small></button></div>
      <div class="card row" style="border:0;padding:0"><span style="flex:999 1 260px;font-weight:600">${ready ? 'Đủ các cảnh trong storyboard. Có thể tạo bản nháp.' : 'Còn ' + (total - done) + ' cảnh chưa có video thô.'}</span>
        <button class="btn ${ready ? 'red' : 'off'}" style="flex:1 1 300px" data-act="generate" data-lane="${l.id}" ${ready && !S.busy ? '' : 'disabled'}>${S.busy === 'gen:' + l.id ? '<span class="spin"></span>Đang gửi…' : (ready ? (v && v.file ? 'Dựng lại bản nháp' : 'Tạo bản nháp (Generate Draft)') + ICON.arrow : 'Nộp đủ các cảnh để tạo bản nháp')}</button></div></section>`;
  }).join('');
  return `<section class="card"><h1>Phân cảnh và quay</h1><p class="mut">Mỗi xu hướng đã chọn là một hàng, các phân cảnh xếp từ trái sang phải. Đọc ghi chú quay, quay xong thì đẩy video thô vào đúng thẻ, ghi mô tả và chọn hiệu ứng. Cần quay thêm thì bấm “Thêm phân cảnh” ở cuối hàng.</p>
    <p class="small mut">Dùng con lăn chuột (giữ Shift) hoặc thanh cuộn ngang để xem hết các thẻ trong hàng.${S.batch && S.batch.scriptsDemo ? ' <b>Định hướng quay đang là bản mẫu</b> vì chưa nối AI.' : ''}</p></section>${lanes}
    <aside class="card"><h2>Khi bấm “Tạo bản nháp”, AI làm gì</h2><ul style="list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:6px 16px">
    ${['Cắt khoảng trống và đoạn nói vấp', 'Chuẩn hóa 9:16, áp hiệu ứng từng cảnh', 'Đánh màu, ghép nhạc/ghi âm, thẻ cuối logo và địa chỉ', 'Ghi video vào Lark Base để lên báo cáo'].map((t) => `<li style="display:flex;gap:10px;color:#C41919">${ICON.check}<span style="color:#1a1a1a">${t}</span></li>`).join('')}</ul></aside>`;
}

function curOpts(v) { return Object.assign({}, DEFAULT_OPTS, v && v.options ? Object.fromEntries(Object.entries(v.options).map(([k, x]) => [k, x ? 1 : 0])) : {}, S.localOpts || {}); }
function viewReview() {
  if (!S.lanes.length) return `<section class="card"><h1>Chưa có video</h1><p class="mut">Hãy hoàn thành bước 1 và 2 trước.</p><button class="btn red" style="align-self:flex-start" data-act="tab" data-i="0">Về bước 1</button></section>`;
  const lane = S.lanes.find((l) => l.id === S.vid) || S.lanes[0];
  const v = S.videos[lane.id];
  const vt = S.lanes.map((l, i) => { const x = S.videos[l.id]; return `<button type="button" class="btn ${l.id === lane.id ? 'on' : ''}" data-act="lane" data-lane="${l.id}" aria-pressed="${l.id === lane.id}">Video ${i + 1}: ${esc(l.title)}${x && x.approved ? ' · đã duyệt' : (x && x.file ? ' · chờ duyệt' : '')}</button>`; }).join('');
  if (!v) return `<section class="card"><h1>Duyệt bản nháp và xuất video</h1><div class="vtabs">${vt}</div><p class="mut">Video này chưa được dựng. Nộp đủ các cảnh ở bước 2 rồi bấm “Tạo bản nháp”.</p><button class="btn red" style="align-self:flex-start" data-act="tab" data-i="1">Về bước 2</button></section>`;
  const o = curOpts(v);
  const cat = CATS.find((c) => c.id === S.cat);
  const sup = (S.status && S.status.supported) || {};
  const building = v.status === 'Đang dựng';
  const menu = CATS.map((c) => `<button type="button" data-act="cat" data-id="${c.id}" class="${c.id === S.cat ? 'on' : ''}" aria-pressed="${c.id === S.cat}">${c.name}<small>${c.opts.filter((x) => o[x[0]]).length} lựa chọn đang bật</small></button>`).join('');
  const opts = cat.opts.map(([id, label]) => `<label class="opt"><input type="checkbox" data-opt="${id}" ${o[id] ? 'checked' : ''}><span>${label}</span>${sup[id] ? '' : '<em>chưa tự động</em>'}</label>`).join('');
  const sound = cat.id === 'audio' ? `<div class="box"><b>Ghi âm lời đọc (nếu có)</b><div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
      <label class="btn" style="position:relative"><input type="file" accept="audio/*" data-up="voice" data-lane="${lane.id}" style="position:absolute;width:1px;height:1px;opacity:0">${ICON.mic}Tải ghi âm lên</label>
      <span class="mut" style="overflow-wrap:anywhere">${v.voiceName ? 'Đã nhận: ' + esc(v.voiceName) + '. AI dùng làm lời đọc.' : 'Chưa có ghi âm. AI dùng tiếng trong video.'}</span></div>
      <b>Nhạc nền</b><div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
      <label class="btn" style="position:relative"><input type="file" accept="audio/*" data-up="music" data-lane="${lane.id}" style="position:absolute;width:1px;height:1px;opacity:0">${ICON.music}Tải file nhạc lên</label>
      <button type="button" class="btn" data-act="music">${ICON.wand}Tạo nhạc nền bằng AI</button></div>
      <span class="mut">${v.musicName ? 'Đã nhận nhạc: ' + esc(v.musicName) + '. Nhạc tự nhỏ lại khi có người nói.' : 'Chưa có nhạc nền.'}${S.musicMsg ? ' ' + esc(S.musicMsg) : ''}</span></div>` : '';
  const prompt = cat.pl ? `<label class="f"><span>${cat.pl}</span><textarea rows="2" data-prompt="${cat.id}" placeholder="${esc(cat.ph)}">${esc(S.prompts[cat.id] || (v.prompts || {})[cat.id] || '')}</textarea></label>${cat.id === 'broll' ? '<span class="small mut">Ghi nhận yêu cầu vào Lark Base. Dịch vụ tạo video AI chưa được nối ở bản này.</span>' : ''}` : '';
  const job = S.jobs[v.jobId] || {};
  const preview = v.localUrl ? `<video controls playsinline src="${esc(v.localUrl)}?t=${v.doneAt || 0}"></video>` : (building ? `<div><span class="spin"></span>Đang dựng…</div>` : 'Chưa có video xem thử');
  return `<section class="card"><h1>Duyệt bản nháp và xuất video</h1><p class="mut">AI đã dựng xong bản nháp. Anh chị xem bên giữa, chọn từng hạng mục bên trái, chỉnh bên phải. Bấm “Áp dụng lớp này” để dựng lại với lựa chọn mới.</p><div class="vtabs" role="group" aria-label="Chọn video">${vt}</div></section>
  <div class="cols"><nav class="card menu" aria-label="Hạng mục chỉnh sửa"><h2 style="font-size:16px">Hạng mục chỉnh sửa</h2>${menu}</nav>
  <section class="card prev" aria-label="Xem trước video"><h2 style="font-size:16px;align-self:flex-start">Xem trước 9:16</h2><div class="phone">${preview}</div>
    ${building ? `<div style="width:100%"><div class="bar" style="width:100%"><i id="jbar" style="width:${Math.round((job.progress || 0) * 100)}%"></i></div><div class="small mut" id="jstep" style="margin-top:4px">${esc(job.step || 'Đang chuẩn bị')}</div></div>` : ''}
    ${v.status === 'Lỗi' ? `<div class="err">${esc(v.error)}</div>` : ''}
    ${(v.notes && v.notes.length) ? `<div class="warn small">${v.notes.map(esc).join('<br>')}</div>` : ''}
    <span class="small mut">Trạng thái: <b>${esc(v.status)}</b>${v.duration ? ' · ' + v.duration.toFixed(1) + ' giây' : ''}</span></section>
  <section class="card panel" aria-label="Bảng điều khiển hạng mục"><div><span class="kick">Đang chỉnh lớp</span><h2>${cat.name}</h2></div>
    <fieldset><legend>Chọn các hiệu ứng</legend>${opts}</fieldset>${prompt}${sound}
    <p class="fn"><b>Công năng:</b> ${cat.fn}</p>
    <button type="button" class="btn red" style="align-self:flex-start" data-act="apply" ${building ? 'disabled' : ''}>${ICON.check}Áp dụng lớp này</button>
    <span style="font-weight:600;color:#9E1212">${esc(S.layerMsg)}</span></section></div>
  <section class="card"><h2>Duyệt và xuất bản</h2><label class="f"><span>Muốn sửa gì thêm? Gõ yêu cầu cho AI</span><textarea rows="2" id="revise" placeholder="Ví dụ: cảnh 3 chạy nhanh hơn một chút, bỏ chữ ở cảnh 4">${esc(S.revise)}</textarea></label>
    <div class="actions"><button class="btn" data-act="revise" ${v.file ? '' : 'disabled'}>${ICON.wand}Gửi yêu cầu sửa</button>
      <button class="btn ${v.approved ? '' : ''}" style="${v.approved ? 'background:#fbeaea;color:#9E1212;border-color:#C41919' : ''}" data-act="approve" ${v.file ? '' : 'disabled'}>${ICON.check}${v.approved ? 'Đã duyệt · bấm để bỏ duyệt' : 'Duyệt video này'}</button>
      ${v.file ? `<a class="btn red" href="${esc(v.localUrl)}" download="HAI-RE-${esc(v.id)}.mp4">${ICON.dl}Tải video về (9:16)</a>` : `<button class="btn off" disabled>${ICON.dl}Tải video về (9:16)</button>`}</div>
    <p class="small mut">“Gửi yêu cầu sửa” ghi yêu cầu vào Lark Base và đánh dấu “Cần sửa” để người phụ trách xử lý. Video đã duyệt được ghi vào Lark Base để tính số video trên dashboard.</p></section>`;
}

function render() {
  const y = window.scrollY;
  $app.innerHTML = head() + tabs() + `<main>${[viewTrends, viewBoard, viewReview][S.tab]()}</main>`;
  window.scrollTo(0, y);
}

// ---------- Hành động ----------
const act = {
  tab: (d) => { S.tab = +d.i; render(); window.scrollTo(0, 0); },
  research: () => guard(async () => { S.busy = 'research'; render(); const r = await api('/api/research', { method: 'POST' }); S.batch = r.batch; S.picked = []; S.lanes = []; S.cards = {}; S.videos = {}; S.busy = ''; render(); }),
  toggle: (d) => { const i = S.picked.indexOf(d.id); if (i >= 0) S.picked.splice(i, 1); else if (S.picked.length < 3) S.picked.push(d.id); render(); },
  tpl: (d) => { S.tpl = d.id; render(); },
  buildTpl: () => guard(async () => { S.busy = 'tpl'; render(); const r = await api('/api/templates', { method: 'POST', body: { prompt: S.prompt } }); S.templates.push(r.template); S.tpl = r.template.id; S.busy = ''; render(); }),
  goStep2: () => guard(async () => { S.busy = 'select'; render(); const r = await api('/api/select', { method: 'POST', body: { ids: S.picked, template: S.tpl } }); S.lanes = r.lanes; S.cards = {}; S.videos = {}; S.batch.picked = S.picked.slice(); S.batch.scriptsDemo = r.demo; S.busy = ''; S.tab = 1; S.vid = S.lanes[0].id; render(); window.scrollTo(0, 0); }),
  addExtra: (d) => guard(async () => { const r = await api('/api/lane/extra', { method: 'POST', body: { laneId: d.lane } }); S.lanes.find((l) => l.id === d.lane).extra = r.extra; render(); }),
  tag: (d) => guard(async () => { const c = S.cards[d.key] || (S.cards[d.key] = { tags: [] }); const t = c.tags || []; c.tags = t.includes(d.tag) ? t.filter((x) => x !== d.tag) : t.concat([d.tag]); render(); await api('/api/card', { method: 'POST', body: { key: d.key, tags: c.tags } }); }),
  trim: (d) => guard(async () => { S.busy = 'trim:' + d.key; render(); const r = await api('/api/trim', { method: 'POST', body: { key: d.key } }); S.cards[d.key] = r.card; S.busy = ''; render(); }),
  rewrite: (d) => guard(async () => { const r = await api('/api/rewrite-note', { method: 'POST', body: { laneId: d.lane, index: +d.i } }); if (r.error) { toast(r.error); return; } const l = S.lanes.find((x) => x.id === d.lane); l.scenes[+d.i] = r.scene; render(); }),
  generate: (d) => guard(async () => { S.busy = 'gen:' + d.lane; render(); const r = await api('/api/draft', { method: 'POST', body: { laneId: d.lane } }); S.videos = await api('/api/videos'); S.busy = ''; S.vid = d.lane; S.tab = 2; S.layerMsg = ''; startPoll(r.jobId, d.lane); render(); window.scrollTo(0, 0); }),
  lane: (d) => { S.vid = d.lane; S.localOpts = null; S.layerMsg = ''; render(); },
  cat: (d) => { S.cat = d.id; S.layerMsg = ''; render(); },
  apply: () => guard(async () => { const v = S.videos[S.vid]; const r = await api('/api/draft', { method: 'POST', body: { laneId: S.vid, options: curOptsBool(v), prompts: S.prompts } }); S.videos = await api('/api/videos'); S.layerMsg = 'Đang dựng lại với lựa chọn mới…'; startPoll(r.jobId, S.vid); render(); }),
  music: () => guard(async () => { try { await api('/api/music-gen', { method: 'POST', body: {} }); } catch (e) { S.musicMsg = e.message; render(); } }),
  approve: () => guard(async () => { const v = S.videos[S.vid]; const r = await api('/api/videos/' + v.id + '/approve', { method: 'POST' }); v.approved = r.approved; v.status = r.status; render(); toast(r.approved ? 'Đã duyệt video' : 'Đã bỏ duyệt'); }),
  revise: () => guard(async () => { const v = S.videos[S.vid]; if (!S.revise.trim()) { toast('Anh chị gõ yêu cầu sửa trước nhé'); return; } await api('/api/videos/' + v.id + '/revise', { method: 'POST', body: { text: S.revise } }); v.status = 'Cần sửa'; v.approved = false; S.revise = ''; render(); toast('Đã gửi yêu cầu sửa'); })
};
function curOptsBool(v) { const o = curOpts(v); return Object.fromEntries(Object.keys(o).map((k) => [k, !!o[k]])); }

function startPoll(jobId, laneId) {
  clearInterval(S.poll);
  S.poll = setInterval(async () => {
    try {
      const j = await api('/api/jobs/' + jobId);
      S.jobs[jobId] = j;
      const bar = document.getElementById('jbar'), step = document.getElementById('jstep');
      if (bar) bar.style.width = Math.round((j.progress || 0) * 100) + '%';
      if (step) step.textContent = j.step || '';
      if (j.done) { clearInterval(S.poll); S.videos = await api('/api/videos'); S.layerMsg = j.error ? '' : 'Đã dựng xong. Xem lại ở khung giữa.'; render(); if (j.error) toast('Dựng lỗi: ' + j.error); }
    } catch (e) { clearInterval(S.poll); }
  }, 1500);
}

document.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && !b.disabled && act[b.dataset.act]) { e.preventDefault(); act[b.dataset.act](b.dataset); } });
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'staff') { S.staff = t.value; localStorage.setItem('hr-staff', t.value); }
  else if (t.id === 'prompt') S.prompt = t.value;
  else if (t.id === 'revise') S.revise = t.value;
  else if (t.dataset.prompt) S.prompts[t.dataset.prompt] = t.value;
  else if (t.dataset.desc) {
    const k = t.dataset.desc; (S.cards[k] || (S.cards[k] = { tags: [] })).desc = t.value;
    clearTimeout(act._d); act._d = setTimeout(() => api('/api/card', { method: 'POST', body: { key: k, desc: t.value } }).catch(() => {}), 600);
  }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.opt) { const v = S.videos[S.vid]; S.localOpts = Object.assign({}, curOpts(v), { [t.dataset.opt]: t.checked ? 1 : 0 }); render(); }
  else if (t.dataset.up && t.files && t.files[0]) sendFile(t.dataset, t.files[0]);
});
['dragover', 'dragleave', 'drop'].forEach((ev) => document.addEventListener(ev, (e) => {
  const z = e.target.closest && e.target.closest('.dz'); if (!z) return;
  e.preventDefault();
  if (ev === 'dragover') z.classList.add('drag'); else z.classList.remove('drag');
  if (ev === 'drop' && e.dataTransfer.files[0]) sendFile({ up: 'card', key: z.dataset.drop }, e.dataTransfer.files[0]);
}));

function sendFile(d, file) {
  const fd = new FormData(); fd.append('file', file);
  const url = d.up === 'card' ? '/api/upload?key=' + encodeURIComponent(d.key) : '/api/audio?kind=' + d.up + '&laneId=' + encodeURIComponent(d.lane);
  const xhr = new XMLHttpRequest();
  xhr.open('POST', url); xhr.setRequestHeader('X-Staff', encodeURIComponent(S.staff || 'Nhân viên'));
  const key = d.key;
  if (d.up === 'card') { S.uploads[key] = 0; render(); }
  xhr.upload.onprogress = (e) => { if (d.up === 'card' && e.lengthComputable) { S.uploads[key] = Math.round(e.loaded / e.total * 100); const el = document.querySelector(`[data-drop="${key}"] .dz-label`); if (el) el.textContent = 'Đang tải lên… ' + S.uploads[key] + '%'; } };
  xhr.onload = () => {
    let j = {}; try { j = JSON.parse(xhr.responseText); } catch (e) { /* bỏ qua */ }
    if (d.up === 'card') delete S.uploads[key];
    if (xhr.status >= 200 && xhr.status < 300) {
      if (d.up === 'card') S.cards[key] = j.card;
      else { const v = S.videos[d.lane] || (S.videos[d.lane] = { laneId: d.lane, status: 'Đang nộp' }); v[d.up + 'Name'] = j.name; }
    } else toast(j.error || 'Tải lên lỗi');
    render();
  };
  xhr.onerror = () => { delete S.uploads[key]; render(); toast('Mất kết nối khi tải lên'); };
  xhr.send(fd);
}

load().catch((e) => { $app.innerHTML = '<main><div class="err">Không tải được dữ liệu: ' + esc(e.message) + '</div></main>'; });
