// Chạy thử toàn bộ luồng bằng video giả: npm test
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const PORT = 3999;
const base = 'http://localhost:' + PORT;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-test-'));
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ĐẠT   ' : 'LỖI   ') + m); if (!c) fails++; };
const j = async (p, o = {}) => { const r = await fetch(base + p, Object.assign({ headers: { 'Content-Type': 'application/json', 'X-Staff': encodeURIComponent('Kiểm thử') } }, o, o.body && typeof o.body !== 'string' && !(o.body instanceof FormData) ? { body: JSON.stringify(o.body) } : {})); return { s: r.status, b: await r.json().catch(() => ({})) }; };

(async () => {
  const dataDir = path.join(tmp, 'data');
  const srv = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..'), env: Object.assign({}, process.env, { PORT, LARK_APP_ID: '', ANTHROPIC_API_KEY: '' }) });
  srv.stdout.on('data', () => {}); srv.stderr.on('data', (d) => process.stderr.write(d));
  await new Promise((r) => setTimeout(r, 1500));
  try {
    await j('/api/reset', { method: 'POST' });
    const st = await j('/api/status'); ok(st.b.ffmpeg, 'FFmpeg có trên máy');
    const rs = await j('/api/research', { method: 'POST' }); ok(rs.b.batch && rs.b.batch.trends.length === 6, 'AI/mẫu trả về 6 xu hướng');
    const bad = await j('/api/select', { method: 'POST', body: { ids: ['t1', 't3'] } }); ok(bad.s === 400, 'Chọn thiếu 3 xu hướng bị từ chối');
    const sel = await j('/api/select', { method: 'POST', body: { ids: ['t1', 't3', 't5'], template: 'auto' } }); ok(sel.b.lanes && sel.b.lanes.length === 3, 'Có 3 hàng phân cảnh');
    const lane = sel.b.lanes[0];
    const early = await j('/api/draft', { method: 'POST', body: { laneId: lane.id } }); ok(early.s === 400, 'Chưa nộp đủ cảnh thì không dựng được');
    // làm clip giả: có tiếng, im lặng 2 giây giữa, rồi có tiếng
    const clip = path.join(tmp, 'c.mp4');
    const r = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30:duration=5', '-f', 'lavfi', '-i', "aevalsrc='if(lt(t,1.2)+gt(t,3.2),0.4*sin(2*PI*440*t),0)':s=44100:d=5", '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', clip]);
    ok(r.status === 0, 'Tạo video giả để thử');
    const send = async (key, file) => { const fd = new FormData(); fd.append('file', new Blob([fs.readFileSync(file)]), 'canh.mp4'); const x = await fetch(base + '/api/upload?key=' + encodeURIComponent(key), { method: 'POST', body: fd, headers: { 'X-Staff': encodeURIComponent('Kiểm thử') } }); return x.json(); };
    for (let i = 0; i < lane.scenes.length; i++) { const u = await send(lane.id + ':' + i, clip); if (i === 0) ok(u.card && u.card.has, 'Nộp video thô vào thẻ'); }
    await j('/api/card', { method: 'POST', body: { key: lane.id + ':0', tags: ['Zoom dần', 'Chữ nổi bật'], desc: 'thử' } });
    await j('/api/card', { method: 'POST', body: { key: lane.id + ':1', tags: ['Rung nhẹ'] } });
    await j('/api/card', { method: 'POST', body: { key: lane.id + ':2', tags: ['Tua nhanh'] } });
    const tr = await j('/api/trim', { method: 'POST', body: { key: lane.id + ':0' } }); ok(tr.b.card && tr.b.card.cut > 1, 'Auto-Trim cắt được khoảng lặng (bớt ' + (tr.b.card && tr.b.card.cut) + ' giây)');
    const ex = await j('/api/lane/extra', { method: 'POST', body: { laneId: lane.id } }); ok(ex.b.extra === 1, 'Thêm thẻ quay thêm');
    await send(lane.id + ':x0', clip);
    const dr = await j('/api/draft', { method: 'POST', body: { laneId: lane.id } }); ok(dr.b.jobId, 'Bắt đầu dựng video');
    let job; for (let i = 0; i < 180; i++) { job = (await j('/api/jobs/' + dr.b.jobId)).b; if (job.done) break; await new Promise((r) => setTimeout(r, 1000)); }
    ok(job && job.done && !job.error, 'Dựng xong' + (job && job.error ? ': ' + job.error : ''));
    const vids = (await j('/api/videos')).b; const v = vids[lane.id];
    ok(v && v.status === 'Chờ duyệt' && v.localUrl, 'Video ở trạng thái Chờ duyệt');
    if (v && v.localUrl) {
      const out = path.join(tmp, 'out.mp4'); fs.writeFileSync(out, Buffer.from(await (await fetch(base + v.localUrl)).arrayBuffer()));
      const p = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'csv=p=0', out]);
      ok(String(p.stdout).trim().startsWith('1080,1920,30'), 'Video xuất 1080x1920 (9:16), 30 khung hình: ' + String(p.stdout).trim());
      const d = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]); const dur = parseFloat(String(d.stdout));
      ok(dur > 8 && dur < 40, 'Độ dài hợp lý: ' + dur.toFixed(1) + ' giây');
      const a = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', out]); ok(String(a.stdout).trim() === 'aac', 'Có âm thanh');
      fs.copyFileSync(out, path.join(__dirname, '..', 'data', 'selftest-output.mp4'));
      // nhạc + ghi âm
      const mus = path.join(tmp, 'm.mp3'); spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=f=220:d=4', mus]);
      for (const kind of ['voice', 'music']) { const fd = new FormData(); fd.append('file', new Blob([fs.readFileSync(mus)]), kind + '.mp3'); await fetch(base + '/api/audio?kind=' + kind + '&laneId=' + lane.id, { method: 'POST', body: fd }); }
      const dr2 = await j('/api/draft', { method: 'POST', body: { laneId: lane.id, options: { p1: false, p2: false, p3: true, v4: false } } });
      for (let i = 0; i < 180; i++) { job = (await j('/api/jobs/' + dr2.b.jobId)).b; if (job.done) break; await new Promise((r) => setTimeout(r, 1000)); }
      ok(job.done && !job.error, 'Dựng lại có nhạc + ghi âm, bỏ thẻ cuối' + (job.error ? ': ' + job.error : ''));
    }
    const ap = await j('/api/videos/' + (v && v.id) + '/approve', { method: 'POST' }); ok(ap.b.approved === true, 'Duyệt video');
    const mg = await j('/api/music-gen', { method: 'POST', body: {} }); ok(mg.s === 501, 'Tạo nhạc AI báo rõ là chưa nối');
    const st2 = (await j('/api/status')).b; ok(st2.lark === false, 'Chưa nối Lark thì app vẫn chạy bình thường');
  } catch (e) { console.error(e); fails++; }
  srv.kill();
  await j('/api/reset', { method: 'POST' }).catch(() => {});
  console.log(fails ? `\n${fails} mục lỗi` : '\nTất cả đạt');
  process.exit(fails ? 1 : 0);
})();
