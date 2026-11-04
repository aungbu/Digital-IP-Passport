# TRUE IP → DPP AI

> ## Your patents, in your hand.
>
> Most companies don't actually know how many patents they hold, or when
> each one expires — and 10 or 20 years later, that knowledge is gone.
> TRUE IP puts every registered patent in the owner's hand as a verifiable
> QR passport, so nothing gets forgotten.
>
> *"Twenty years from now, who at your company will remember every patent
> you filed? With TRUE IP, you don't have to remember — it's in your hand."*

**Live demo:** https://passport.truel1.com
**Video:** https://www.youtube.com/watch?v=lmfs2cFIIUw
**Track:** Startup — Theme: Build for Your World
**Event:** Meta Global AI Developer Hackathon, Oct 26 – Nov 4, 2026

## What this is

A Digital Product Passport (DPP) demo. A product gets a passport — what it is,
what it is made of, how to care for it — in English and Japanese. Only the
passport's SHA-256 digest is anchored on TRUE Layer 1. A QR scan re-computes
the hash in the browser and shows MATCH or MISMATCH.

**Chain proof is integrity + time only. It does NOT prove ownership, a licence,
or patent validity.**

## Try it in 2 minutes

1. Open https://passport.truel1.com — 10 DEMO passports.
2. Open **TRUE-SJ-001** — TRUE Smart Jacket 001. Note the DEMO label and
   "Referenced technology — no licence verified".
3. Scan its QR (phone, mobile data) or open https://passport.truel1.com/p/TRUE-SJ-001
   — it should show **MATCH**.
4. Click the **Blockscout anchor tx** link — block **1133287**, chain **77777**.
5. Click **Tamper demo** — **MISMATCH**. Click **Restore** — **MATCH** again.
6. Go to https://passport.truel1.com/search — search **US12050123** in default
   mode. You should get 1 result: "SCALE WITH LABEL PRINTER", Bizerba.
7. Click **Add to Passport** on that card — it opens a new passport page in
   **this browser only**, labelled **USER-ADDED — NOT ANCHORED, NOT VERIFIED**.
   Its Patent Expire On shows **07/12/2041 (estimated)** — filing + 20 years,
   estimated only, not a legal expiry. You can Update the date, or Re-register
   to a local v2. Neither is a legal renewal, and neither re-anchors on chain.

## What is DEMO, what is real

- **DEMO (samples, clearly labelled):** The 10 TRUE Smart Jacket passports
  (TRUE-SJ-001 to TRUE-SJ-010) are sample products, not real products and not
  real USPTO patents. Their sample patent numbers are DEMO-PAT-001 to DEMO-PAT-010.
- **Real (on chain):** The 10 digests really are anchored on TRUE Layer 1.
  Contract `0xDa1544bff2ffFD82e17b91FB494e190aC82B360e`, chain 77777,
  issuer `0x72c802A1343F04FbBf71e291A3000d2534Bc59C2`,
  deploy block 1133283, anchor blocks 1133287–1133306 (SJ-001 to SJ-010).
  Contract source is not yet verified on Blockscout, so a transaction shows
  only its method selector — that is cosmetic, the tx itself is Success.
- **Real (live data):** The search page is live against USPTO ODP through a
  server-side proxy. No API key is in the page or in this repo.
- **Browser-only (video version):** Add to Passport and Patent Expire On, as
  shown in the video, save only in the browser that created them (localStorage).
  They are not visible on another phone/computer, they are not anchored by
  clicking, and a user-added passport has no server QR PNG — only the 10 DEMO
  QRs exist in `web/qr/`. See `JUDGES.md` and the "What comes next" section.

## Repo map

- `web/` — static site: `index.html`, `app.js`, `styles.css`, `search.html`,
  `search.js`, `search.css`, `data/samples.json`, `data/digests.json`,
  `data/anchors.json`, `qr/*.png` (10 DEMO QRs only)
- `search-proxy/server.js` — USPTO ODP proxy, Node, no dependencies,
  binds 127.0.0.1:4010. Routes `/health`, `/search`, `/patent`, `/owner`,
  `/owner.csv`. Metadata-only fields, limit ≤100, halve on ODP 413,
  auto-detect US patent numbers in keyword mode, ODP 404 = no results.
- `passport-api/` — **real, server-side version, built in parallel, NOT yet
  deployed or switched on.** Node, no dependencies, 127.0.0.1:4011,
  JSON storage, edit-token auth (hash only), REAL- ids, estimated expiry,
  re-register to v+1. Anchoring is NOT via this API — it will be a separate
  server-only script after Nov 4, for the same safety reason as the DEMO anchors.
- `contracts/` — `PassportAnchor.sol` (Berlin EVM, Solidity 0.8.24,
  OpenZeppelin 5.0.2, EIP-712, legacy gas-0 tx). The anchor scripts live here
  in the original build; see `deploy/ANCHOR-README.md` in the working tree
  where applicable.

## Run it locally (static site only)

```bash
cd web
python3 -m http.server 8000
# open http://127.0.0.1:8000/ — search needs the proxy, see search-proxy README
```

The search proxy needs a USPTO ODP key in a server-side file only
(`/etc/truel1/uspto.env`, 640 root:www-data). **Never put a key, token, or
private key in chat, in this repo, or in a browser file.** The same rule
applies to the DPP issuer/relayer keys (`/etc/truel1/dpp.env`).

## Built during the event vs pre-existing — disclosure

**Built Oct 26 – Nov 4, 2026, during the event:**
DPP site and 10 DEMO passports, QR verify (MATCH/MISMATCH), PassportAnchor
contract + 10 anchors, USPTO live search page + proxy, browser Add to Passport
+ Patent Expire On, and the parallel real Passport API (code only, not yet live).

**Pre-existing infrastructure (not claimed as hackathon work):**
TRUE Layer 1 (Hyperledger Besu + Blockscout), the FME server and nginx,
and USPTO ODP as an external data source.

**NOT in the live build — do not claim them:**
The original spec's Meta Muse Spark draft → Wonder audit → SAM → Muse Image
pipeline, and full independent browser `getAnchor` verification via a read-only
RPC proxy, are not in this live build. The live build was made with Muse
(Muse Spark 1.3) as the coding/build assistant during the event, and the DPP
samples shown are DEMO samples, not live Spark-generated drafts.

## Known limits

- Keyword search is ODP keyword search, not AI vector "by meaning".
- Abstract/claim text appears only when ODP returns it; otherwise the card
  links to Patent Center and Google Patents.
- Owner CSV is capped at 500 records. Search cards show 25 per page.
- Search/proxy cache: search/owner 24h, patent 7d. A repeated search may show
  the same `fetchedAt` — that is cache, not stale live data.
- Expiry is never a legal expiry in this demo: owner-entered, or filing + 20
  years estimated, with a disclaimer, subject to maintenance fees, adjustments,
  and terminal disclaimers.
- A user-added passport's QR, in the browser version, does not exist as a
  server PNG and would not open on another device. The real server version
  (after Nov 4) will generate a real QR PNG for REAL passports.

## What comes next (after Nov 4)

1. Deploy `passport-api/` (systemd + nginx `/api/passports/`), test it on the
   server, then switch the search button from localStorage to the API.
2. Build the server-only anchor script for REAL passports (one id at a time,
   verify `getAnchor` before marking anchored).
3. Generate server QR PNGs for REAL passports.
4. Add a root `.gitignore` (`.env`, `*.env`, `node_modules/`).
