# TRUE IP → DPP AI — Sample Demo for passport.truel1.com

**DEMO ONLY — 10 sample passports, NOT real USPTO patents, NOT verified licences, NOT real products.**

This is the first, safe, static demo step for the Meta Global AI Developer Hackathon 2026 (Startup Track, Build for Your World). It shows the product-passport idea with 10 samples, each with its own QR code, a passport page, and a MATCH / MISMATCH hash check.

Live target (after nginx + certbot): https://passport.truel1.com
QR for a passport: https://passport.truel1.com/p/TRUE-SJ-001 … /p/TRUE-SJ-010

## What is in here

- `web/index.html`, `web/app.js`, `web/styles.css` — static SPA, no build step
- `web/data/samples.json` — 10 DEMO passports (TRUE-SJ-001 to TRUE-SJ-010)
- `web/data/digests.json` — SHA-256 of the canonical (sorted-key) JSON for each passport
- `web/qr/TRUE-SJ-*.png` — QR PNGs, each encoding its passport URL
- `data/` — source copies of samples.json and digests.json
- `deploy/passport.truel1.com.conf` — NEW nginx site file only
- `deploy/README-DEPLOY.md` — step-by-step SSH + certbot commands

## How verify works in this sample

1. Browser fetches the passport JSON as stored.
2. Browser recomputes SHA-256 over the canonical JSON (sorted keys).
3. It compares that to `digests.json`.
4. MATCH = unchanged. Tamper demo changes one field in the browser copy only (not the stored file) → MISMATCH.

This sample uses a **local hash check only**. It is NOT yet the real TRUE L1 anchor.
Next steps (spec §6–§10): Node API on 127.0.0.1:3078, Meta Muse Spark 1.3 draft + Wonder audit, SAM 3.1, Muse Image, PassportAnchor.sol on TRUE L1 chain 77777, and browser verification via a read-only RPC proxy + Blockscout link.

## Truthfulness rules

- Sample patent numbers are `DEMO-PAT-001` … `DEMO-PAT-010` on purpose — never present them as real USPTO numbers.
- Relation is always `REFERENCED_TECHNOLOGY` with the note: sample reference only, no licence or ownership verified.
- Chain verification, when added, proves integrity only — not ownership, licence, or patent validity.
- No secrets in this repo. Meta API key, USPTO key, issuer/relayer keys go only in `/etc/truel1/dpp.env` on the server (see `.env.example`).

## Run locally

```bash
cd web
python3 -m http.server 8901
# open http://127.0.0.1:8901/
# or open http://127.0.0.1:8901/p/TRUE-SJ-001
```
