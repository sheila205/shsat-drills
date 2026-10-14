// Products to Know practice app: serves the drill page and keeps one shared practice log.
// No dependencies. Data is a single JSON file; on Railway, put it on a volume so it survives redeploys.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'log.json');
const ACCESS_CODE = (process.env.ACCESS_CODE || '').trim();

fs.mkdirSync(DATA_DIR, { recursive: true });
let log = { sessions: {} };
try { log = JSON.parse(fs.readFileSync(FILE, 'utf8')); if (!log.sessions) log.sessions = {}; } catch { /* first run */ }

function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(log));
  fs.renameSync(tmp, FILE);
}

const PAGE = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function authorized(req) {
  if (!ACCESS_CODE) return true;
  const given = Buffer.from(String(req.headers['x-access-code'] || ''));
  const want = Buffer.from(ACCESS_CODE);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const num = v => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
function cleanSession(id, b) {
  const by = {};
  if (b.by && typeof b.by === 'object') {
    for (const [k, v] of Object.entries(b.by).slice(0, 30)) {
      if (v && typeof v === 'object') by[String(k).slice(0, 60)] = { n: num(v.n), c: num(v.c), ms: num(v.ms) };
    }
  }
  return {
    id, t: num(b.t) || Date.now(), n: num(b.n), c: num(b.c), ms: num(b.ms), done: b.done === true, by,
    missed: Array.isArray(b.missed) ? b.missed.slice(-30).map(m => String(m).slice(0, 120)) : [],
    savedAt: Date.now(),
  };
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return send(res, 200, PAGE, 'text/html; charset=utf-8');
    if (url.pathname === '/healthz') return send(res, 200, { ok: true });

    if (url.pathname.startsWith('/api/')) {
      if (!authorized(req)) return send(res, 401, { error: 'access code required' });

      if (req.method === 'GET' && url.pathname === '/api/log') return send(res, 200, log);

      const m = url.pathname.match(/^\/api\/sessions\/([A-Za-z0-9_-]{1,64})$/);
      if (m && req.method === 'PUT') {
        const body = JSON.parse(await readBody(req));
        if (!body || typeof body !== 'object') return send(res, 400, { error: 'bad body' });
        log.sessions[m[1]] = cleanSession(m[1], body);
        save();
        return send(res, 200, log);
      }
      if (m && req.method === 'DELETE') {
        delete log.sessions[m[1]]; save();
        return send(res, 200, log);
      }
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 400, { error: 'bad request' });
  }
}).listen(PORT, () => console.log(`Practice app on :${PORT} — log file ${FILE}${ACCESS_CODE ? ' — access code on' : ' — no access code set'}`));
