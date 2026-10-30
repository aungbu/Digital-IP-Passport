let DATA=null, DIGESTS={};
function canon(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canon).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}';}
async function sha256hex(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function route(){const pathParts=location.pathname.replace(/^\/+/,'').split('/');if(pathParts[0]==='p'&&pathParts[1])return showDetail(pathParts[1]);const h=location.hash.replace(/^#\//,'');const parts=h.split('/');if(parts[0]==='p'&&parts[1])return showDetail(parts[1]);return showList();}
async function load(){if(!DATA){DATA=await (await fetch('/data/samples.json')).json();DIGESTS=await (await fetch('/data/digests.json')).json();}route();}
function showList(){const el=document.getElementById('app');el.innerHTML='<h2>10 sample passports — scan a QR to open one</h2><p>Each QR opens its passport page at passport.truel1.com. All 10 are DEMO samples.</p><div class="grid">'+DATA.passports.map(p=>`<article class="card"><h3>${esc(p.product.name.en)}</h3><p><b>${p.id}</b> · ${esc(p.product.serial)}</p><p>${esc(p.technology.summary.en)}</p><p>Sample patent: <b>${esc(p.ipReference.number)}</b><br>${esc(p.ipReference.title)}</p><img src="/qr/${p.id}.png" alt="QR for ${p.id}"><p><a href="#/p/${p.id}">Open passport →</a><br><a href="/qr/${p.id}.png" download>Download QR PNG</a></p></article>`).join('')+'</div>';}
async function showDetail(id){const el=document.getElementById('app');let p=DATA.passports.find(x=>x.id===id);if(!p){el.innerHTML='<p>Not found. <a href="#/">Back to all 10</a></p>';return;}
let current=JSON.parse(JSON.stringify(p));
async function render(tampered){const digestNow=await sha256hex(canon(current));const stored=DIGESTS[id];const match=!tampered&&digestNow===stored;const cls=tampered?'bad':(match?'ok':'bad');const label=tampered?'MISMATCH — content changed after the sample hash was recorded':(match?'MATCH':'MISMATCH');
el.innerHTML=`<div class="detail"><p><a href="#/">← All 10 passports</a></p><h2>${esc(current.product.name.en)}</h2><p>${esc(current.product.name.ja)}</p><p><span class="badge ${cls}">${label}</span></p><img src="/qr/${id}.png" alt="QR for ${id}"><p>Scan this QR, or open: <code>https://passport.truel1.com/p/${id}</code></p><table>
<tr><td>Passport ID</td><td>${esc(current.id)} · v${current.version} · DEMO</td></tr>
<tr><td>Serial / Batch</td><td>${esc(current.product.serial)} / ${esc(current.product.batch)}</td></tr>
<tr><td>Materials EN</td><td>${esc(current.product.materials.en)}</td></tr>
<tr><td>Materials JA</td><td>${esc(current.product.materials.ja)}</td></tr>
<tr><td>Care EN</td><td>${esc(current.product.care.en)}</td></tr>
<tr><td>Care JA</td><td>${esc(current.product.care.ja)}</td></tr>
<tr><td>Manufacturer</td><td>${esc(current.product.manufacturer.name)} (${esc(current.product.manufacturer.country)}) — DEMO</td></tr>
<tr><td>Sample patent</td><td><b>${esc(current.ipReference.number)}</b> — ${esc(current.ipReference.title)}<br>${esc(current.ipReference.relationNote.en)}</td></tr>
<tr><td>Technology EN</td><td>${esc(current.technology.summary.en)}</td></tr>
<tr><td>Technology JA</td><td>${esc(current.technology.summary.ja)}</td></tr>
<tr><td>How it appears</td><td>${esc(current.technology.howItAppears.en)} / ${esc(current.technology.howItAppears.ja)}</td></tr>
<tr><td>Hash now</td><td><code>${digestNow}</code></td></tr>
<tr><td>Hash recorded</td><td><code>${stored}</code></td></tr>
<tr><td>TRUE L1</td><td>Chain 77777 · Blockscout: https://explorer.truel1.com (real anchor is the next step — this sample uses a local hash check only)</td></tr></table>
<p><button id="tamper">Tamper demo: change one field</button> <button id="restore" class="secondary">Restore original</button></p><p><small>Demo tamper changes only the in-browser copy, without re-anchoring — that is exactly why verification fails. It does not change the stored sample file.</small></p></div>`;
document.getElementById('tamper').onclick=()=>{current=JSON.parse(JSON.stringify(p));current.product.materials.en='100% (tampered demo value)';render(true);};
document.getElementById('restore').onclick=()=>{current=JSON.parse(JSON.stringify(p));render(false);};}render(false);}
window.addEventListener('hashchange',route);load();
