// Đọc file .env (không cần cài thêm thư viện)
const fs = require('fs');
const path = require('path');
try {
  const txt = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch (e) { /* không có .env thì dùng biến môi trường */ }
