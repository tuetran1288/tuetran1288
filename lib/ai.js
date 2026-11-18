// AI viết nội dung: gọi Claude (Anthropic API). Không có khóa thì trả về null để app dùng dữ liệu mẫu.
const HAS = () => !!process.env.ANTHROPIC_API_KEY;
const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

async function claude({ system, user, tools, maxTokens = 4000 }) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL(), max_tokens: maxTokens, system, tools, messages: [{ role: 'user', content: user }] })
  });
  const j = await r.json();
  if (!r.ok) throw new Error('AI lỗi: ' + (j.error && j.error.message ? j.error.message : r.status));
  return (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

function pickJson(text, open, close) {
  const a = text.indexOf(open), b = text.lastIndexOf(close);
  if (a < 0 || b < a) throw new Error('AI không trả về đúng định dạng');
  return JSON.parse(text.slice(a, b + 1));
}

const SYS = 'Bạn là chuyên viên nội dung video ngắn cho Công ty Cổ phần Hai Rê (Huế): lốp ô tô, dầu nhớt, bình điện, bảo dưỡng; phụ tùng xe máy. Cửa hàng: 170 Lê Duẩn, 15A An Dương Vương, 4A Lê Quý Đôn. Viết tiếng Việt đơn giản, dễ làm cho nhân viên cửa hàng. Chỉ trả về JSON hợp lệ, không giải thích thêm.';

async function researchTrends({ strategy, requirements }) {
  if (!HAS()) return null;
  const user = `Tìm trên web các FORMAT video ngắn đang chạy tốt trên Facebook Reels và TikTok hiện nay (ưu tiên 30 ngày gần nhất, thị trường Việt Nam), phù hợp ngành lốp xe, dầu nhớt, bình điện, phụ tùng.
CHIẾN LƯỢC HAI RÊ (đọc từ Lark Base):
${strategy || '(chưa có dữ liệu, dùng định hướng chung: bán lốp xe chính hãng, tư vấn đúng, thay nhanh gọn, tin cậy)'}
YÊU CẦU NGHIÊN CỨU:
${requirements || '(chưa có yêu cầu riêng)'}
Sau khi quét, ĐỐI CHIẾU từng xu hướng với chiến lược rồi chọn đúng 6 xu hướng. Trả về mảng JSON 6 phần tử, mỗi phần tử có: name, where, heat ("Đang tăng mạnh"|"Đang tăng"|"Ổn định"), what (mô tả format), idea (áp dụng cho Hai Rê, 1 câu), fit ("Khớp cao"|"Khớp vừa"|"Khớp thấp"), why (lý do khớp/không khớp chiến lược), link (link video mẫu nếu có, không có thì chuỗi rỗng).`;
  const text = await claude({ system: SYS, user, tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }], maxTokens: 5000 });
  const arr = pickJson(text, '[', ']');
  return arr.slice(0, 6).map((t, i) => ({ id: 't' + (i + 1), name: String(t.name), where: String(t.where || ''), heat: String(t.heat || ''), fit: String(t.fit || 'Khớp vừa'),
    what: String(t.what || ''), idea: String(t.idea || ''), why: String(t.why || ''), link: String(t.link || '') }));
}

async function writeScripts({ trends, strategy, template }) {
  if (!HAS()) return null;
  const user = `Viết ĐỊNH HƯỚNG QUAY cho từng xu hướng dưới đây (nhân viên sẽ quay theo, trọng tâm là cách quay, không phải kịch bản lời thoại).
CHIẾN LƯỢC HAI RÊ:\n${strategy || '(dùng định hướng chung)'}
KHUNG PHÂN CẢNH YÊU CẦU: ${template || 'AI tự chọn cho mỗi xu hướng'}
XU HƯỚNG: ${JSON.stringify(trends.map((t) => ({ id: t.id, name: t.name, what: t.what, idea: t.idea })))}
Trả về mảng JSON, mỗi xu hướng một phần tử: { trendId, title, length, goal, prep, scenes:[{ role, shot, time, film, say, tip }] }.
shot là cỡ cảnh (Cận cảnh, Trung cảnh, Toàn cảnh, Cận tay thợ). 4 đến 6 cảnh, cảnh cuối luôn là "Chốt cửa hàng". film = quay gì, tip = cách quay, say = lời hoặc chữ trên màn hình (chỉ để tham khảo; chữ trên màn hình bắt đầu bằng "Chữ to: “...”").`;
  const text = await claude({ system: SYS, user, maxTokens: 6000 });
  return pickJson(text, '[', ']');
}

async function buildTemplate(prompt) {
  if (!HAS()) return null;
  const text = await claude({ system: SYS, user: `Tạo khung phân cảnh cho yêu cầu: "${prompt}". Trả về JSON: { name, size, scenes:[{ num, time, name }] } (time dạng 0:00 – 0:03).`, maxTokens: 1500 });
  return pickJson(text, '{', '}');
}

async function rewriteNote({ scene, trend }) {
  if (!HAS()) return null;
  const text = await claude({ system: SYS, user: `Viết lại ghi chú quay cho cảnh sau, ngắn gọn, dễ làm hơn, khác cách diễn đạt cũ. Xu hướng: ${trend}. Cảnh: ${JSON.stringify(scene)}. Trả về JSON: { film, tip }.`, maxTokens: 800 });
  return pickJson(text, '{', '}');
}

module.exports = { enabled: HAS, researchTrends, writeScripts, buildTemplate, rewriteNote };
