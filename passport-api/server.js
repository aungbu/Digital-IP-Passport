// TRUE IP Passport API — REAL version (Option 1, built in parallel, NOT yet live)
// Node, no dependencies. Binds 127.0.0.1 only; nginx proxies /api/passports/ to it.
// Storage: JSON file, default /opt/truel1-passports/data.json (override with PASSPORT_DATA_FILE).
// Auth: edit token. On creation the server returns a random token ONCE.
// Only the token hash is stored. Expiry update and re-register require X-Edit-Token.
// Anchoring is NOT done by this API — that is a separate server-only script
// (see README), because the issuer key must never be reachable from a browser.
// Expiry: owner-entered date wins; otherwise a grant with a filing date gets an
// ESTIMATED filing+20y date, clearly marked estimated, never presented as legal expiry.
// Digest: canonical sorted-key JSON (RFC 8785 style) SHA-256 of core fields + version.
// Expiry is metadata, not part of the digest, so an expiry update does not break
// the core digest. A re-register bumps version, recomputes the digest, and resets
// anchor status to "not anchored" — the new version needs a new anchor tx.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PASSPORT_API_PORT || 4011);
const DATA_FILE = process.env.PASSPORT_DATA_FILE || '/opt/truel1-passports/data.json';

function canon(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}
function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z')); }
function estimatedExpiry(filing) {
  if (!isDate(filing)) return '';
  const d = new Date(filing + 'T00:00:00Z');
  d.setUTCFullYear(d.getUTCFullYear() + 20);
  return d.toISOString().slice(0, 10);
}
function load() {
  try { const v = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); return v && Array.isArray(v.passports) ? v : { version: 1, passports: [] }; }
  catch (e) { return { version: 1, passports: [] }; }
}
function save(db) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}
function publicPassport(p) {
  const { editTokenHash, ...rest } = p;
  return rest;
}
function tokenMatches(p, token) {
  if (!token || !p.editTokenHash) return false;
  const a = Buffer.from(sha256(token));
  const b = Buffer.from(p.editTokenHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function digestFor(p) {
  return sha256(canon({
    id: p.id, version: p.version, title: p.title,
    patentNumber: p.patentNumber, applicationNumber: p.applicationNumber,
    assignee: p.assignee, inventors: p.inventors,
    filingDate: p.filingDate, grantDate: p.grantDate,
    status: p.status, rights: p.rights, type: p.type, cpc: p.cpc,
  }));
}
function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
function readBody(req, cb) {
  let size = 0; const chunks = [];
  req.on('data', c => { size += c.length; if (size > 256 * 1024) { req.destroy(); } else chunks.push(c); });
  req.on('end', () => { try { cb(null, chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}); } catch (e) { cb(e); } });
  req.on('error', cb);
}
// Simple per-IP rate limit: 120 requests / 60s, same style as the search proxy.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now(); const e = hits.get(ip) || { t: now, n: 0 };
  if (now - e.t > 60000) { e.t = now; e.n = 0; }
  e.n++; hits.set(ip, e);
  return e.n > 120;
}

const server = http.createServer((req, res) => {
  if (rateLimited(req.socket.remoteAddress || 'unknown')) return send(res, 429, { error: 'rate limited' });
  const u = new URL(req.url, 'http://127.0.0.1');
  const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  // Routes are mounted at / (nginx strips /api/passports/) and also accept /passports prefix.
  if (parts[0] === 'passports') parts.shift();

  if (req.method === 'GET' && parts.length === 0) {
    const db = load();
    return send(res, 200, { ok: true, count: db.passports.length, passports: db.passports.map(publicPassport) });
  }
  if (req.method === 'GET' && parts[0] === 'health') {
    const db = load();
    return send(res, 200, { ok: true, mode: 'live', count: db.passports.length });
  }
  // Health is also served at /health when mounted at root (parts = ['health'] above is handled here too)
  if (req.method === 'GET' && parts.length === 1) {
    const db = load();
    const p = db.passports.find(x => x.id === decodeURIComponent(parts[0]));
    if (!p) return send(res, 404, { error: 'not found' });
    return send(res, 200, { ok: true, passport: publicPassport(p) });
  }
  if (req.method === 'POST' && parts.length === 0) {
    return readBody(req, (err, b) => {
      if (err) return send(res, 400, { error: 'invalid JSON' });
      const patentNumber = String(b.patentNumber || '').trim();
      const applicationNumber = String(b.applicationNumber || '').trim();
      if (!patentNumber && !applicationNumber) return send(res, 400, { error: 'patentNumber or applicationNumber required' });
      const id = 'REAL-' + (patentNumber || applicationNumber);
      const db = load();
      if (db.passports.find(x => x.id === id)) return send(res, 409, { error: 'already exists', id });
      const token = crypto.randomBytes(32).toString('hex');
      const type = String(b.type || '');
      const filingDate = String(b.filingDate || '');
      let expiry = { date: '', source: 'none' };
      if (type === 'grant' && isDate(filingDate)) expiry = { date: estimatedExpiry(filingDate), source: 'estimated' };
      const p = {
        id, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        title: String(b.title || 'Untitled'),
        patentNumber, applicationNumber,
        assignee: String(b.assignee || b.applicant || ''),
        inventors: Array.isArray(b.inventors) ? b.inventors.map(String) : [],
        filingDate, grantDate: String(b.grantDate || ''),
        status: String(b.status || ''), rights: String(b.rights || ''), type,
        cpc: Array.isArray(b.cpc) ? b.cpc.map(String) : [],
        sourceUrls: b.sourceUrls && typeof b.sourceUrls === 'object' ? b.sourceUrls : {},
        source: String(b.source || 'USPTO ODP live'), fetchedAt: String(b.fetchedAt || ''),
        expiry, anchorStatus: 'not anchored', anchorTx: null, anchorBlock: null,
        previousDigests: [], editTokenHash: sha256(token),
      };
      p.digest = digestFor(p);
      db.passports.push(p); save(db);
      return send(res, 201, {
        ok: true, passport: publicPassport(p), editToken: token,
        warning: 'Save this edit token now. It is shown only once. Without it, expiry cannot be updated and the passport cannot be re-registered.',
      });
    });
  }
  if ((req.method === 'PUT' && parts.length === 2 && parts[1] === 'expiry') ||
      (req.method === 'POST' && parts.length === 2 && parts[1] === 'reregister')) {
    const isExpiry = req.method === 'PUT';
    return readBody(req, (err, b) => {
      if (err) return send(res, 400, { error: 'invalid JSON' });
      const db = load();
      const p = db.passports.find(x => x.id === decodeURIComponent(parts[0]));
      if (!p) return send(res, 404, { error: 'not found' });
      if (!tokenMatches(p, req.headers['x-edit-token'])) return send(res, 403, { error: 'edit token required' });
      if (isExpiry) {
        const date = b.date === null || b.date === '' ? '' : String(b.date || '');
        if (date && !isDate(date)) return send(res, 400, { error: 'date must be YYYY-MM-DD or null to clear' });
        if (date) p.expiry = { date, source: 'owner' };
        else if (p.type === 'grant' && isDate(p.filingDate)) p.expiry = { date: estimatedExpiry(p.filingDate), source: 'estimated' };
        else p.expiry = { date: '', source: 'none' };
      } else {
        p.previousDigests.push(p.digest);
        p.version += 1;
        p.digest = digestFor(p);
        p.anchorStatus = 'not anchored'; p.anchorTx = null; p.anchorBlock = null;
      }
      p.updatedAt = new Date().toISOString();
      save(db);
      return send(res, 200, { ok: true, passport: publicPassport(p) });
    });
  }
  return send(res, 404, { error: 'not found' });
});

server.listen(PORT, HOST, () => console.log(`passport-api listening ${HOST}:${PORT} data=${DATA_FILE}`));
