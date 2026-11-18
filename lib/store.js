// Kho lưu trạng thái đơn giản bằng 1 file JSON (data/state.json)
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DIR, 'state.json');
fs.mkdirSync(DIR, { recursive: true });

const empty = () => ({ batch: null, lanes: [], cards: {}, videos: {}, customTemplates: [], larkIds: {}, larkErrors: [] });
let state;
try { state = Object.assign(empty(), JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) { state = empty(); }

function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, FILE);
}
module.exports = { get: () => state, save, reset: () => { state = empty(); save(); return state; }, DIR };
