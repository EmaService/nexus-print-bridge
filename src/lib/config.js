const fs   = require('fs');
const os   = require('os');
const path = require('path');

const CONFIG_DIR  = path.join(process.env.APPDATA || os.homedir(), 'NexusPrintBridge');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function read() {
  ensureDir();
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
  catch { return {}; }
}

function write(data) {
  ensureDir();
  const current = read();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...data }, null, 2), 'utf8');
}

module.exports = { read, write, CONFIG_FILE };
