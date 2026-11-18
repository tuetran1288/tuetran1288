// Chạy 1 lần: đổi tên base và tạo đủ 6 bảng. Cách chạy: npm run setup-lark
require('../lib/env');
const lark = require('../lib/lark');
const { TABLES } = require('../lib/schema');

(async () => {
  if (!lark.enabled()) { console.error('Thiếu LARK_APP_ID, LARK_APP_SECRET hoặc LARK_BASE_TOKEN trong file .env'); process.exit(1); }
  try { await lark.renameBase('HAI RÊ Video Studio'); console.log('Đã đổi tên base: HAI RÊ Video Studio'); }
  catch (e) { console.log('Chưa đổi được tên base (không sao, đổi tay cũng được):', e.message); }
  const items = await lark.listTables();
  const ids = {};
  for (const [key, def] of Object.entries(TABLES)) {
    const found = items.find((t) => t.name === def.name);
    if (found) { ids[key] = found.table_id; console.log('Đã có bảng:', def.name); continue; }
    ids[key] = await lark.createTable(def);
    console.log('Đã tạo bảng:', def.name);
  }
  lark.remember(ids);
  const ours = Object.values(TABLES).map((d) => d.name);
  const extra = items.filter((t) => !ours.includes(t.name));
  if (extra.length) console.log('Còn bảng mặc định cần xóa tay trong Lark:', extra.map((t) => t.name).join(', '));
  console.log('Xong. Mã bảng đã lưu vào data/lark-tables.json');
})().catch((e) => { console.error('Lỗi:', e.message); process.exit(1); });
