# TRUE IP Passport API — REAL version (Option 1)

**Status: BUILT IN WORKSPACE, NOT YET DEPLOYED. Do NOT deploy before Nov 4 submission.**
The live site for the Nov 3 video stays on the browser-only version (localStorage, My Passports).
This API is the parallel real version, to switch over AFTER the Nov 4 submission, once tested.

## What it is
- Node, no dependencies, binds `127.0.0.1:4011` only (search proxy is 4010, Besu 8545).
- Storage: JSON file, default `/opt/truel1-passports/data.json`.
- No login system. Owner proof = edit token (see below). This was the recommended
  owner method; if George later wants wallet or login instead, only the auth part changes.

## Endpoints (mounted at `/`, nginx strips `/api/passports/`)
- `GET /health` → `{ok, mode, count}`
- `GET /` → list, no edit-token hashes ever returned
- `GET /<id>` → one passport, e.g. `REAL-12050123`
- `POST /` → create from a USPTO record. Body: title, patentNumber, applicationNumber,
  assignee/applicant, inventors[], filingDate, grantDate, status, rights, type, cpc[],
  sourceUrls, source, fetchedAt. Requires patentNumber or applicationNumber.
  Returns `201 {passport, editToken}` — **token shown only once, save it now.**
  Duplicate id → `409 {error: 'already exists', id}` (open the existing one, do not re-create).
- `PUT /<id>/expiry` with header `X-Edit-Token: <token>` → body `{date: "YYYY-MM-DD"}`
  or `{date: null}` to clear (reverts to estimated/none). Wrong/missing token → 403.
  Expiry update does NOT bump version.
- `POST /<id>/reregister` with header `X-Edit-Token` → version+1, new digest,
  previous digest kept in `previousDigests`, anchorStatus reset to "not anchored".

## Expiry honesty (same in real version)
- Owner-entered date wins, source `owner`.
- Otherwise a `grant` with a filing date → filing+20y, source `estimated`,
  UI must show "Estimated only — not a legal expiry."
- Otherwise source `none` (applications: "Not granted yet").
- Expiry is metadata, not part of the digest.

## Anchoring — NOT in this API, on purpose
A public API endpoint that anchors would let anyone spend the issuer authority.
Anchoring a REAL passport is a separate server-only script, to be built after
submission, adapted from `contracts/scripts/anchor-all.js`:
1. Server operator runs it by hand for one id, e.g. `node anchor-real.js REAL-12050123`
2. It reads `/etc/truel1/dpp.env` (issuer/relayer, server-side only), signs EIP-712,
   sends a legacy gas-0 tx, waits for receipt, re-reads `getAnchor`, and only then
   writes `anchorStatus: 'anchored', anchorTx, anchorBlock` into data.json.
3. Until that script runs, a REAL passport honestly shows "Not anchored".

## Deploy AFTER Nov 4 (one site, one service — full block will be given then)
1. Copy this folder to `/opt/truel1-passports/` (server.js + package.json + README).
   Create data dir, `chmod -R a+rX /opt/truel1-passports` if the www-data service
   cannot read it (same permission pattern as the search proxy).
2. Install systemd unit `deploy/truel1-passport-api.service` (User=www-data,
   WorkingDirectory=/opt/truel1-passports, PASSPORT_DATA_FILE set), `systemctl daemon-reload`,
   `systemctl enable --now truel1-passport-api`, check `curl 127.0.0.1:4011/health`.
3. Add ONLY to `/etc/nginx/sites-available/passport.truel1.com`, before `location /`:
   `location /api/passports/ { proxy_pass http://127.0.0.1:4011/; ... }`
   (same proxy headers as the search locations), `nginx -t`, reload, test through nginx.
4. Switch the client (separate step, after API is live and tested):
   - search.js "Add to Passport" → `POST /api/passports/`, show edit token once,
     then open `/#/p/REAL-...`; on 409 open the existing id.
   - app.js → fetch `/api/passports/` for a "Real passports" list, and detail pages
     for REAL-* ids; expire Update → `PUT` with the token saved in that browser,
     Re-register → `POST .../reregister` with the token.
   - Keep the browser-only My Passports list working until the switch is verified,
     then remove it — do not delete user data silently. Rollback = restore the
     previous app.js/search.js from backup; the API data file stays untouched.
5. Backup: copy `/opt/truel1-passports/data.json` before any switch or anchor run.

## Security notes
- Never put the issuer/relayer key, the USPTO key, or any edit token in chat, repo, or browser code.
- Edit tokens are stored only as SHA-256 hashes. Losing a token means that passport
  cannot be edited via the API until an operator procedure is added — do not add a
  "reset token by email" feature without a separate decision.
- Rate limit in server.js: 120 requests / 60s per IP. No CORS: same-origin via nginx only.
