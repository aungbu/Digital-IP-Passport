// USPTO live search proxy for passport.truel1.com/search
// Node 22, no dependencies. Binds 127.0.0.1 only. The USPTO key is read
// from /etc/truel1/uspto.env (server only, never in the repo, never in
// the browser, never in a response or log line). Mode A only: live ODP
// search, no Meili/Qdrant index, no Ollama AI summary in this version.
// Spec: ip-truel1-us-search-live-page-spec-20261031.md, sections 4-5.
// Run: USPTO_ENV=/etc/truel1/uspto.env PORT=4010 node server.js
// Or via systemd (see deploy/SEARCH-README.md).
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";

const PORT = Number(process.env.PORT || 4010);
const HOST = "127.0.0.1";
const ODP_BASE = "https://api.uspto.gov";

function loadKey() {
  const file = process.env.USPTO_ENV || "/etc/truel1/uspto.env";
  if (!existsSync(file)) return null;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*USPTO_API_KEY\s*=\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  return null;
}
const API_KEY = loadKey();

// Token bucket: start at 10 req/s, burst 20, per spec section 4.2.
let tokens = 20, lastRefill = Date.now();
function allow() {
  const now = Date.now();
  tokens = Math.min(20, tokens + ((now - lastRefill) / 1000) * 10);
  lastRefill = now;
  if (tokens < 1) return false;
  tokens -= 1; return true;
}

// Simple in-memory cache: search/owner 24h, patent 7d (spec section 4.2).
const cache = new Map();
function cacheGet(key, ttlMs) {
  const v = cache.get(key);
  if (!v || Date.now() - v.at > ttlMs) { cache.delete(key); return null; }
  return v.data;
}
function cacheSet(key, data) { if (cache.size > 500) cache.clear(); cache.set(key, { at: Date.now(), data }); }

// --- ODP query building (spec section 4.1). Field names for title/CPC
// are checked defensively at normalisation time; do not invent new fields.
export function cleanNumber(raw) {
  return String(raw || "").replace(/^US/i, "").replace(/[, ]/g, "").replace(/[A-Z]\d*$/, (m) => m && /^\d/.test(raw) ? "" : m).replace(/[^0-9]/g, "");
}
export function buildOdpQuery({ mode, q, owner, fromYear, toYear, type, cpc }) {
  const parts = [];
  if (mode === "number") {
    const n = cleanNumber(q);
    if (!n) throw new Error("Enter a patent number, e.g. US12050123");
    parts.push(`applicationMetaData.patentNumber:${n}`);
  } else if (mode === "owner") {
    const name = owner || q;
    if (!name) throw new Error("Enter an owner name");
    parts.push(`applicationMetaData.firstApplicantName:${name}*`);
  } else {
    if (!q) throw new Error("Enter keywords");
    parts.push(q);
  }
  const yField = type === "application" ? "applicationMetaData.filingDate" : "applicationMetaData.grantDate";
  if (fromYear || toYear) {
    const from = fromYear ? `${fromYear}-01-01` : "1800-01-01";
    const to = toYear ? `${toYear}-12-31` : "2100-12-31";
    parts.push(`${yField}:[${from} TO ${to}]`);
  }
  if (type === "grant") parts.push("applicationMetaData.patentNumber:*");
  if (type === "application") parts.push("NOT applicationMetaData.patentNumber:*");
  if (cpc) parts.push(`cpcClassificationBag:${cpc}*`);
  return parts.join(" AND ");
}
export function mapRights(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("patented")) return "active";
  if (s.includes("expired") && s.includes("nonpayment")) return "term_expired";
  if (s.includes("expired")) return "expired";
  if (s.includes("abandoned")) return "expired";
  if (s.includes("reinstated")) return "reinstated";
  return "pending";
}
export function normalizeRecord(item) {
  const md = item.applicationMetaData || item || {};
  const patentNumber = String(md.patentNumber || "").replace(/[^0-9]/g, "");
  const appNo = md.applicationNumberText || md.applicationNumber || "";
  const appDigits = String(appNo).replace(/[^0-9]/g, "");
  const title = md.inventionTitle || md.title || "";
  const assignee = md.firstApplicantName || md.assignee || "";
  const inventors = (md.inventorBag || []).map((i) => i.inventorNameText).filter(Boolean);
  const cpc = (md.cpcClassificationBag || []).map((c) => c.cpcClassificationSymbolText || c).filter(Boolean);
  return {
    patentNumber, applicationNumber: appNo, title,
    abstract: item.abstract || null, claim1: item.claim1 || null,
    assignee, applicant: assignee, inventors,
    filingDate: md.filingDate || null, grantDate: md.grantDate || null,
    status: md.applicationStatusDescriptionText || md.status || "",
    rights: mapRights(md.applicationStatusDescriptionText || md.status),
    type: patentNumber ? "grant" : "application", cpc,
    sourceUrls: {
      patentCenter: appDigits ? `https://patentcenter.uspto.gov/applications/${appDigits}` : "https://patentcenter.uspto.gov/",
      googlePatents: patentNumber ? `https://patents.google.com/patent/US${patentNumber}` : "https://patents.google.com/"
    },
    fetchedAt: new Date().toISOString(), source: "USPTO ODP live"
  };
}
async function odpSearch(q, offset, limit) {
  const url = `${ODP_BASE}/api/v1/patent/applications/search`;
  let attempt = 0;
  while (true) {
    const res = await fetch(url, { method: "POST", headers: { "X-API-KEY": API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ q, offset, limit }) });
    if (res.status === 429 && attempt < 3) { await new Promise((r) => setTimeout(r, 500 * (2 ** attempt))); attempt++; continue; }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(res.status === 429 ? "USPTO rate limit — retrying" : `USPTO error ${res.status}`);
      err.status = res.status === 429 ? 429 : 502; err.detail = text.slice(0, 200);
      throw err;
    }
    return res.json();
  }
}
function odpItems(data) {
  // ODP search returns results under a few possible keys; accept them all.
  return data.results || data.items || data.data || [];
}
function odpTotal(data) { return data.total || data.count || odpItems(data).length; }

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}
function sendCsv(res, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = "patentNumber,applicationNumber,title,assignee,filingDate,grantDate,status,rights,type,patentCenter,googlePatents";
  const lines = rows.map((p) => [p.patentNumber, p.applicationNumber, p.title, p.assignee, p.filingDate, p.grantDate, p.status, p.rights, p.type, p.sourceUrls.patentCenter, p.sourceUrls.googlePatents].map(esc).join(","));
  res.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=uspto-owner.csv" });
  res.end([head, ...lines].join("\n"));
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${HOST}:${PORT}`);
    const path = u.pathname.replace(/\/$/, "") || "/";
    if (path === "/health") return send(res, 200, { ok: true, mode: "live", odp: !!API_KEY, cache: cache.size });
    if (!API_KEY) return send(res, 503, { error: "USPTO key not configured on the server. Put USPTO_API_KEY in /etc/truel1/uspto.env (server only) and restart the proxy." });
    if (!allow()) return send(res, 429, { error: "USPTO rate limit — retrying" });

    if (path === "/search") {
      const params = { mode: u.searchParams.get("mode") || "keyword", q: u.searchParams.get("q") || "", owner: u.searchParams.get("owner") || "", fromYear: u.searchParams.get("fromYear") || "", toYear: u.searchParams.get("toYear") || "", type: u.searchParams.get("type") || "", cpc: u.searchParams.get("cpc") || "" };
      const offset = Number(u.searchParams.get("offset") || 0), limit = Math.min(100, Number(u.searchParams.get("limit") || 25));
      const q = buildOdpQuery(params);
      const key = `search:${q}:${offset}:${limit}`;
      const cached = cacheGet(key, 24 * 3600 * 1000);
      if (cached) return send(res, 200, cached);
      const data = await odpSearch(q, offset, limit);
      const out = { total: odpTotal(data), items: odpItems(data).map(normalizeRecord), source: "USPTO ODP live" };
      cacheSet(key, out); return send(res, 200, out);
    }
    if (path === "/patent") {
      const number = cleanNumber(u.searchParams.get("number") || u.searchParams.get("q") || "");
      if (!number) return send(res, 400, { error: "number required" });
      const key = `patent:${number}`;
      const cached = cacheGet(key, 7 * 24 * 3600 * 1000);
      if (cached) return send(res, 200, cached);
      const data = await odpSearch(`applicationMetaData.patentNumber:${number}`, 0, 1);
      const items = odpItems(data).map(normalizeRecord);
      if (!items.length) return send(res, 404, { error: "Patent not found in USPTO live search" });
      cacheSet(key, items[0]); return send(res, 200, items[0]);
    }
    if (path === "/owner" || path === "/owner.csv") {
      const name = u.searchParams.get("name") || u.searchParams.get("owner") || u.searchParams.get("q") || "";
      if (!name) return send(res, 400, { error: "name required" });
      const isCsv = path === "/owner.csv";
      const key = `owner:${name}`;
      let out = cacheGet(key, 24 * 3600 * 1000);
      if (!out) {
        const q = `applicationMetaData.firstApplicantName:${name}*`;
        let items = [], total = 0, offset = 0;
        while (offset < 500) {
          const data = await odpSearch(q, offset, 100);
          total = odpTotal(data);
          const batch = odpItems(data).map(normalizeRecord);
          items.push(...batch);
          if (batch.length < 100) break;
          offset += 100;
        }
        const byYear = {};
        for (const p of items) { const y = (p.grantDate || p.filingDate || "").slice(0, 4); if (y) byYear[y] = (byYear[y] || 0) + 1; }
        out = { total, items: items.slice(0, 500), byYear, active: items.filter((p) => p.rights === "active").length, expired: items.filter((p) => p.rights === "expired" || p.rights === "term_expired").length, source: "USPTO ODP live" };
        cacheSet(key, out);
      }
      if (isCsv) return sendCsv(res, out.items);
      return send(res, 200, out);
    }
    return send(res, 404, { error: "Not found" });
  } catch (err) {
    console.error("proxy error:", err.message);
    return send(res, err.status || 500, { error: err.message || "Proxy error" });
  }
});

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, HOST, () => console.log(`USPTO live proxy listening on ${HOST}:${PORT} (mode: live, key configured: ${!!API_KEY})`));
}
