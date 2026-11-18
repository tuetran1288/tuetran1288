// Dựng video bằng FFmpeg: cắt khoảng lặng, hiệu ứng từng cảnh, ghép, nhạc/ghi âm, thẻ cuối, phụ đề (nếu có Whisper).
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOGO = path.join(__dirname, '..', 'public', 'logo.png');

function run(cmd, args, cwd) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; if (err.length > 400000) err = err.slice(-200000); });
    p.on('error', (e) => resolve({ code: -1, out, err: String(e) }));
    p.on('close', (code) => resolve({ code, out, err }));
  });
}
async function ff(args, cwd) {
  const r = await run('ffmpeg', ['-hide_banner', '-y', ...args], cwd);
  if (r.code !== 0) throw new Error('FFmpeg lỗi: ' + r.err.split('\n').slice(-6).join(' | '));
  return r;
}

const has = (cmd) => spawnSync('which', [cmd]).status === 0;
function findFont() {
  const c = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf', '/Library/Fonts/Arial Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'];
  for (const f of c) if (fs.existsSync(f)) return f;
  const r = spawnSync('fc-match', ['-f', '%{file}', 'sans:bold']);
  const f = r.status === 0 ? String(r.stdout).trim() : '';
  return f && fs.existsSync(f) ? f : null;
}
const FONT = findFont();

function capabilities() {
  return { ffmpeg: has('ffmpeg') && has('ffprobe'), whisper: has('whisper'), font: !!FONT };
}

async function probe(file) {
  const r = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file]);
  if (r.code !== 0) throw new Error('Không đọc được video: ' + path.basename(file));
  const j = JSON.parse(r.out);
  return { duration: parseFloat(j.format.duration) || 0, hasAudio: (j.streams || []).some((s) => s.codec_type === 'audio') };
}

// Cắt khoảng lặng và đoạn im lặng giữa các câu nói. Trả về số giây đã cắt.
async function trimSilence(inp, out, { d = 0.35, noise = '-32dB' } = {}) {
  const info = await probe(inp);
  if (!info.hasAudio) { fs.copyFileSync(inp, out); return 0; }
  const r = await run('ffmpeg', ['-hide_banner', '-i', inp, '-af', `silencedetect=noise=${noise}:d=${d}`, '-f', 'null', '-']);
  const sil = [];
  let cur = null;
  for (const line of r.err.split('\n')) {
    let m = line.match(/silence_start: ([\d.]+)/);
    if (m) cur = parseFloat(m[1]);
    m = line.match(/silence_end: ([\d.]+)/);
    if (m && cur !== null) { sil.push([cur, parseFloat(m[1])]); cur = null; }
  }
  if (cur !== null) sil.push([cur, info.duration]);
  const pad = 0.12;
  const cuts = sil.map(([s, e]) => [s + pad, e - pad]).filter(([s, e]) => e - s > 0.15);
  if (!cuts.length || cuts.length > 80) { fs.copyFileSync(inp, out); return 0; }
  const keep = [];
  let pos = 0;
  for (const [s, e] of cuts) { if (s - pos > 0.05) keep.push([pos, s]); pos = e; }
  if (info.duration - pos > 0.05) keep.push([pos, info.duration]);
  if (!keep.length) { fs.copyFileSync(inp, out); return 0; }
  const parts = keep.map(([a, b], k) => `[0:v]trim=start=${a.toFixed(3)}:end=${b.toFixed(3)},setpts=PTS-STARTPTS[v${k}];[0:a]atrim=start=${a.toFixed(3)}:end=${b.toFixed(3)},asetpts=PTS-STARTPTS[a${k}]`);
  const cat = keep.map((_, k) => `[v${k}][a${k}]`).join('') + `concat=n=${keep.length}:v=1:a=1[v][a]`;
  await ff(['-i', inp, '-filter_complex', parts.join(';') + ';' + cat, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', out]);
  return cuts.reduce((t, [s, e]) => t + (e - s), 0);
}

function wrapText(t, n = 18) {
  const words = String(t).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > n && line) { lines.push(line); line = w; } else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 3).join('\n');
}

// Chuẩn hóa một cảnh về 1080x1920, 30 khung hình/giây, kèm hiệu ứng riêng của cảnh.
async function renderClip(inp, out, { tags = [], text = '', cinematic = false, workDir }) {
  const info = await probe(inp);
  const vf = ['scale=1080:1920:force_original_aspect_ratio=increase', 'crop=1080:1920', 'setsar=1', 'fps=30'];
  if (tags.includes('Zoom dần')) vf.push("zoompan=z='min(1+0.0007*on,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30");
  if (tags.includes('Rung nhẹ')) vf.push("crop=1004:1786:x='38+sin(t*37)*14':y='67+cos(t*31)*12'", 'scale=1080:1920');
  let af = 'aresample=44100,aformat=channel_layouts=stereo';
  if (tags.includes('Tua nhanh')) { vf.push('setpts=0.5*PTS'); af += ',atempo=2'; }
  if (tags.includes('Quay chậm')) { vf.push('setpts=2*PTS'); af += ',atempo=0.5'; }
  if (cinematic) vf.push('eq=contrast=1.08:saturation=1.15:gamma=0.97');
  if (tags.includes('Chữ nổi bật') && text && FONT) {
    const tf = path.join(workDir, 'txt_' + path.basename(out) + '.txt');
    fs.writeFileSync(tf, wrapText(text));
    vf.push(`drawtext=fontfile='${FONT}':textfile='${path.basename(tf)}':fontsize=70:fontcolor=white:borderw=7:bordercolor=black:x=(w-text_w)/2:y=h-480:line_spacing=12:expansion=none`);
  }
  const args = ['-i', inp];
  let aSrc = '[0:a]';
  if (!info.hasAudio) { args.push('-f', 'lavfi', '-t', String(Math.max(info.duration, 0.5)), '-i', 'anullsrc=r=44100:cl=stereo'); aSrc = '[1:a]'; }
  args.push('-filter_complex', `[0:v]${vf.join(',')}[v];${aSrc}${af}[a]`, '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-ar', '44100', '-ac', '2', out);
  await ff(args, workDir);
}

// Thẻ cuối: logo và địa chỉ Hai Rê.
async function endCard(out, { cta, workDir }) {
  const lines = ['170 Lê Duẩn', '15A An Dương Vương', '4A Lê Quý Đôn · Huế'];
  if (cta) lines.push('', cta);
  const tf = path.join(workDir, 'endcard.txt');
  fs.writeFileSync(tf, lines.join('\n'));
  const logoOk = fs.existsSync(LOGO);
  const args = ['-f', 'lavfi', '-i', 'color=c=white:s=1080x1920:d=2.5:r=30'];
  let g;
  if (logoOk) { args.push('-loop', '1', '-t', '2.5', '-i', LOGO); g = '[1:v]scale=800:-1[lg];[0:v][lg]overlay=(W-w)/2:520[bg]'; } else g = '[0:v]null[bg]';
  args.push('-f', 'lavfi', '-t', '2.5', '-i', 'anullsrc=r=44100:cl=stereo');
  const aIdx = logoOk ? 2 : 1;
  const draw = FONT ? `;[bg]drawtext=fontfile='${FONT}':textfile='endcard.txt':fontsize=54:fontcolor=0x9E1212:x=(w-text_w)/2:y=1000:line_spacing=18:expansion=none[v]` : ';[bg]null[v]';
  args.push('-filter_complex', g + draw, '-map', '[v]', '-map', `${aIdx}:a`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-t', '2.5', out);
  await ff(args, workDir);
}

async function transcribe(audioFile, workDir) {
  const model = process.env.WHISPER_MODEL || 'small';
  const r = await run('whisper', [audioFile, '--language', 'vi', '--model', model, '--output_format', 'srt', '--output_dir', workDir]);
  if (r.code !== 0) return null;
  const srt = path.join(workDir, path.basename(audioFile).replace(/\.[^.]+$/, '') + '.srt');
  return fs.existsSync(srt) ? srt : null;
}

// clips: [{ file, tags, text }]
// opts: { trim: {d,noise}|null, cinematic, endCard, cta, captions, music, voice }
async function buildVideo({ clips, opts, outFile, workDir, onStep }) {
  const step = onStep || (() => {});
  const notes = [];
  fs.mkdirSync(workDir, { recursive: true });
  const parts = [];
  let i = 0;
  for (const c of clips) {
    i++;
    let src = c.file;
    if (opts.trim) {
      step(`Cảnh ${i}/${clips.length}: cắt khoảng lặng`, i / (clips.length + 3));
      const t = path.join(workDir, `trim${i}.mp4`);
      await trimSilence(src, t, opts.trim);
      src = t;
    }
    step(`Cảnh ${i}/${clips.length}: chuẩn hóa 9:16 và hiệu ứng`, i / (clips.length + 3));
    const o = path.join(workDir, `clip${i}.mp4`);
    await renderClip(src, o, { tags: c.tags || [], text: c.text || '', cinematic: !!opts.cinematic, workDir });
    parts.push(o);
  }
  if (opts.endCard) {
    step('Làm thẻ cuối: logo và địa chỉ Hai Rê', (clips.length + 1) / (clips.length + 3));
    const e = path.join(workDir, 'endcard.mp4');
    await endCard(e, { cta: opts.cta, workDir });
    parts.push(e);
  }
  step('Ghép các cảnh', (clips.length + 2) / (clips.length + 3));
  const list = path.join(workDir, 'list.txt');
  fs.writeFileSync(list, parts.map((p) => `file '${path.basename(p)}'`).join('\n'));
  const joined = path.join(workDir, 'joined.mp4');
  await ff(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', '30', '-fps_mode', 'cfr', '-c:a', 'aac', '-ar', '44100', '-ac', '2', joined], workDir);
  const total = (await probe(joined)).duration;

  step('Ghép nhạc, ghi âm và phụ đề', (clips.length + 2.5) / (clips.length + 3));
  let srt = null;
  if (opts.captions) {
    if (!has('whisper')) notes.push('Bỏ qua phụ đề: máy chưa cài Whisper.');
    else {
      srt = await transcribe(opts.voice || joined, workDir);
      if (!srt) notes.push('Phụ đề: Whisper không nhận ra lời nói.');
    }
  }
  const args = ['-i', joined];
  let n = 1;
  const vIdx = opts.voice ? n++ : -1;
  if (opts.voice) args.push('-i', opts.voice);
  const mIdx = opts.music ? n++ : -1;
  if (opts.music) args.push('-stream_loop', '-1', '-i', opts.music);
  const g = [];
  if (opts.voice) g.push('[0:a]volume=0.15[o]', `[${vIdx}:a]aresample=44100,aformat=channel_layouts=stereo[vo]`, '[o][vo]amix=inputs=2:duration=first:normalize=0[main]');
  else g.push('[0:a]anull[main]');
  let aLabel = '[main]';
  if (opts.music) {
    g.push(`[${mIdx}:a]aresample=44100,aformat=channel_layouts=stereo,volume=0.35[mu]`, '[main]asplit=2[m1][m2]',
      '[mu][m1]sidechaincompress=threshold=0.03:ratio=10:attack=20:release=400[duck]', '[m2][duck]amix=inputs=2:duration=first:normalize=0[aout]');
    aLabel = '[aout]';
  }
  let vMap = '0:v';
  let vCodec = ['-c:v', 'copy'];
  if (srt) {
    g.push(`[0:v]subtitles='${path.basename(srt)}':force_style='Fontname=DejaVu Sans,Bold=1,FontSize=16,PrimaryColour=&H003BD4FF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Alignment=2,MarginV=170'[vs]`);
    vMap = '[vs]';
    vCodec = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p'];
  }
  args.push('-filter_complex', g.join(';'), '-map', vMap, '-map', aLabel, ...vCodec, '-c:a', 'aac', '-b:a', '160k', '-t', total.toFixed(2), '-movflags', '+faststart', outFile);
  await ff(args, workDir);
  step('Xong', 1);
  return { duration: total, notes };
}

module.exports = { capabilities, probe, trimSilence, buildVideo };
