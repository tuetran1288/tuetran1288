// Kết nối Lark Base qua Open API (tenant_access_token).
const fs = require('fs');
const path = require('path');
const { TABLES } = require('./schema');
const store = require('./store');

const API = () => process.env.LARK_API_BASE || 'https://open.larksuite.com';
const BASE = () => process.env.LARK_BASE_TOKEN || '';
const TABLE_FILE = path.join(store.DIR, 'lark-tables.json');
let tok = { v: null, exp: 0 };
let tableIds = {};
try { tableIds = JSON.parse(fs.readFileSync(TABLE_FILE, 'utf8')); } catch (e) { /* chưa có */ }

const enabled = () => !!(process.env.LARK_APP_ID && process.env.LARK_APP_SECRET && BASE());

async function token() {
  if (tok.v && Date.now() < tok.exp) return tok.v;
  const r = await fetch(API() + '/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: process.env.LARK_APP_ID, app_secret: process.env.LARK_APP_SECRET })
  });
  const j = await r.json();
  if (j.code !== 0) throw new Error('Lark từ chối đăng nhập: ' + (j.msg || j.code));
  tok = { v: j.tenant_access_token, exp: Date.now() + (j.expire - 120) * 1000 };
  return tok.v;
}

async function call(method, p, body) {
  const r = await fetch(API() + '/open-apis' + p, {
    method, headers: { Authorization: 'Bearer ' + (await token()), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (j.code !== 0) throw new Error('Lark lỗi ' + (j.code ?? r.status) + ': ' + (j.msg || 'không rõ'));
  return j.data;
}

const bt = () => '/bitable/v1/apps/' + BASE();

async function listTables() { return (await call('GET', bt() + '/tables?page_size=100')).items || []; }
async function createTable(def) {
  const fields = def.fields.map(([field_name, f]) => Object.assign({ field_name }, f));
  const d = await call('POST', bt() + '/tables', { table: { name: def.name, default_view_name: 'Tất cả', fields } });
  return d.table_id;
}
async function renameBase(name) { return call('PUT', '/bitable/v1/apps/' + BASE(), { name }); }

function remember(ids) { tableIds = ids; fs.writeFileSync(TABLE_FILE, JSON.stringify(ids, null, 2)); }

async function resolveTables() {
  if (Object.keys(tableIds).length === Object.keys(TABLES).length) return tableIds;
  const items = await listTables();
  const ids = {};
  for (const [key, def] of Object.entries(TABLES)) {
    const f = items.find((t) => t.name === def.name);
    if (f) ids[key] = f.table_id;
  }
  if (Object.keys(ids).length === Object.keys(TABLES).length) remember(ids);
  else throw new Error('Base chưa đủ 6 bảng. Chạy: npm run setup-lark');
  return ids;
}

async function addRecord(key, fields) {
  const ids = await resolveTables();
  const d = await call('POST', bt() + '/tables/' + ids[key] + '/records', { fields });
  return d.record.record_id;
}
async function updateRecord(key, recordId, fields) {
  const ids = await resolveTables();
  await call('PUT', bt() + '/tables/' + ids[key] + '/records/' + recordId, { fields });
}
async function listRecords(key, max = 200) {
  const ids = await resolveTables();
  const out = [];
  let pageToken = '';
  while (out.length < max) {
    const d = await call('GET', bt() + '/tables/' + ids[key] + '/records?page_size=100' + (pageToken ? '&page_token=' + pageToken : ''));
    out.push(...(d.items || []));
    if (!d.has_more) break;
    pageToken = d.page_token;
  }
  return out;
}

// Ghi nhật ký an toàn: Lark lỗi thì app vẫn chạy, lỗi được ghi lại để hiện trên giao diện.
async function safe(fn) {
  if (!enabled()) return null;
  try { return await fn(); } catch (e) {
    const s = store.get();
    s.larkErrors = [{ at: new Date().toISOString(), msg: e.message }].concat(s.larkErrors || []).slice(0, 5);
    store.save();
    console.error('[lark]', e.message);
    return null;
  }
}

module.exports = { enabled, call, listTables, createTable, renameBase, resolveTables, remember, addRecord, updateRecord, listRecords, safe, BASE };
