# USPTO live search — passport.truel1.com/search

Scope: **passport.truel1.com only.** No other nginx site, no Besu/BlockScout
restart, no ip.truel1.com site (that site is absent on this machine per the
spec; this page lives on passport.truel1.com as requested, and can move to
ip.truel1.com/aius later by changing the nginx locations only).

What this is: Mode A live search from the spec
(ip-truel1-us-search-live-page-spec-20261031.md). Every search goes to
USPTO ODP through a server-side proxy on 127.0.0.1:4010. The browser
never sees the key or api.uspto.gov. No Meili/Qdrant index, no Ollama AI
summary, no listings/notary in this first version — those are later steps
in the spec. "By meaning" in this version is keyword search over ODP
fields, not vector similarity; the page labels results "USPTO live".

## 0. Check port 4010 is free (read-only)

```bash
ss -ltnp | grep ':4010 ' || echo "4010 free"
```

## 1. The USPTO key — server terminal only, never in chat, never in the repo

```bash
mkdir -p /etc/truel1
# Edit this file on the server terminal only (nano, or your editor).
# Type/paste the key there — do NOT paste the file contents back here.
nano /etc/truel1/uspto.env
# File must contain exactly one line (no placeholders, no <...> text):
# USPTO_API_KEY=<your key from data.uspto.gov/apikey>
chmod 640 /etc/truel1/uspto.env
chown root:www-data /etc/truel1/uspto.env
ls -l /etc/truel1/uspto.env
# Safe check to paste back: only the file permissions, not its contents.
```

## 2. Install the proxy (server only)

```bash
# From your repo folder, after pushing/pulling these files:
mkdir -p /opt/truel1-search-proxy
cp -r /tmp/Digital-IP-Passport/search-proxy/* /opt/truel1-search-proxy/
cp /tmp/Digital-IP-Passport/deploy/truel1-search-proxy.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now truel1-search-proxy
systemctl status truel1-search-proxy --no-pager | head -20
curl -s http://127.0.0.1:4010/health
# expect: {"ok":true,"mode":"live","odp":true,...}
# If odp:false, the key file was not found or the USPTO_API_KEY line is wrong.
```

## 3. Static page + nginx locations (passport site file ONLY)

```bash
cp /tmp/Digital-IP-Passport/web/search.html /var/www/passport.truel1.com/search.html
cp /tmp/Digital-IP-Passport/web/search.js /var/www/passport.truel1.com/search.js
cp /tmp/Digital-IP-Passport/web/search.css /var/www/passport.truel1.com/search.css
cp /tmp/Digital-IP-Passport/web/index.html /var/www/passport.truel1.com/index.html
chmod -R a+rX /var/www/passport.truel1.com
```

Then, in `/etc/nginx/sites-available/passport.truel1.com` ONLY, add these
two locations BEFORE the existing `location /` block (do not edit any
other site file):

```nginx
location = /search {
    try_files /search.html =404;
}
location /search/api/ {
    proxy_pass http://127.0.0.1:4010/;
    proxy_read_timeout 60s;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    add_header Cache-Control no-store;
}
```

Then:

```bash
nginx -t
# STOP if nginx -t shows an error. Only reload when it says test is successful.
systemctl reload nginx
curl -sI https://passport.truel1.com/search | head -5
curl -s "https://passport.truel1.com/search/api/health"
curl -s "https://passport.truel1.com/search/api/search?mode=number&q=US12050123&limit=3" | head -c 500
```

## 4. Acceptance checks

- `/search` loads, health shows Proxy OK.
- Number search `US12050123` (or any real number you know) → one card with
  Patent Center + Google Patents links.
- Owner search (owner name, empty query) → totals + year breakdown.
- Keyword search with year/type filters → results labelled "USPTO live".
- Second identical search → fast (proxy cache).
- No key in page source: `grep -r api.uspto.gov /var/www/passport.truel1.com` finds nothing, and no key appears in any response.
- ODP 429 → page shows "USPTO rate limit — retrying", not an empty list.

## What is NOT in this version (honest scope)

- Abstract/claim 1: shown only when ODP returns them. ODP metadata does
  not reliably hand you full text, so the card links to Patent Center /
  Google Patents for full text (spec section 4.3, option a). PatentsView
  (option b) and Mode B index (option c) are later steps.
- AI summary (`/ask`): not included yet — it needs Ollama on the server.
  The page does not claim AI summarisation.
- Owner CSV/totals: first version aggregates up to 500 records (spec
  allows 5,000 later, after pagination/rate-limit tuning).
- `/us` listings / notary: not included — separate spec step 5.
