let DATA=null, DIGESTS={}, ANCHORS=null, ANCHOR_MAP={};
function canon(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canon).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}';}
async function sha256hex(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}
function route(){const pathParts=location.pathname.replace(/^\/+/,'').split('/');if(pathParts[0]==='p'&&pathParts[1])return showDetail(pathParts[1]);const h=location.hash.replace(/^#\//,'');const parts=h.split('/');if(parts[0]==='p'&&parts[1])return showDetail(parts[1]);return showList();}
async function load(){if(!DATA){DATA=await (await fetch('/data/samples.json')).json();DIGESTS=await (await fetch('/data/digests.json')).json();try{ANCHORS=await (await fetch('/data/anchors.json')).json();(ANCHORS.results||[]).forEach(r=>ANCHOR_MAP[r.id]=r);}catch(e){ANCHORS=null;}}route();}
// --- User-added passports: browser-only, localStorage, no server, no anchor on click ---
function getUserPassports(){try{const v=JSON.parse(localStorage.getItem('trueip-my-passports')||'[]');return Array.isArray(v)?v:[];}catch(e){return [];}}
function saveUserPassports(list){localStorage.setItem('trueip-my-passports',JSON.stringify(list));}
function getExpiryMap(){try{const v=JSON.parse(localStorage.getItem('trueip-expiry')||'{}');return v&&typeof v==='object'?v:{};}catch(e){return {};}}
function setExpiry(id,ymd){const m=getExpiryMap();if(ymd)m[id]=ymd;else delete m[id];localStorage.setItem('trueip-expiry',JSON.stringify(m));}
function getVersions(){try{const v=JSON.parse(localStorage.getItem('trueip-versions')||'{}');return v&&typeof v==='object'?v:{};}catch(e){return {};}}
function setVersion(id,v){const m=getVersions();m[id]=v;localStorage.setItem('trueip-versions',JSON.stringify(m));}
function fmtDate(ymd){if(!ymd)return '';const p=ymd.split('-');if(p.length!==3)return ymd;return p[1]+'/'+p[2]+'/'+p[0];}
function estimatedExpiry(filing){if(!filing||!/^\d{4}-\d{2}-\d{2}$/.test(filing))return '';const dt=new Date(filing+'T00:00:00Z');dt.setUTCFullYear(dt.getUTCFullYear()+20);return dt.toISOString().slice(0,10);}
function expiryFor(p){
  const stored=getExpiryMap()[p.id];
  if(stored)return {date:stored,kind:'owner'};
  if(p._userAdded&&p.type==='grant'&&p.filingDate){const est=estimatedExpiry(p.filingDate);if(est)return {date:est,kind:'estimated'};}
  return {date:'',kind:'none'};
}
function expireBoxHTML(p){
  const ex=expiryFor(p);
  const ver=getVersions()[p.id]||p.version||1;
  let line='';
  if(ex.kind==='owner')line='<b>Patent Expire On: '+esc(fmtDate(ex.date))+'</b><br><small>Owner-entered date, saved in this browser only. Not a legal expiry.</small>';
  else if(ex.kind==='estimated')line='<b>Patent Expire On: '+esc(fmtDate(ex.date))+' (estimated)</b><br><small>Estimated only — filing date + 20 years. Not a legal expiry. Subject to maintenance fees, adjustments, and terminal disclaimers.</small>';
  else if(p._userAdded&&p.type==='application')line='<b>Patent Expire On: Not granted yet</b><br><small>No expiry date until a patent is granted. Owner can add a date below.</small>';
  else line='<b>Patent Expire On: Not set</b><br><small>Owner can add a date below. Saved in this browser only.</small>';
  return '<div class="expire-box"><h3>Patent Expire On</h3><p>'+line+'</p><p>Version: v'+ver+'</p><label>Update expire date <input type="date" id="expiry-input" value="'+(ex.kind==='owner'?ex.date:'')+'"></label> <button id="expiry-save">Update</button> <button id="expiry-clear" class="secondary">Clear</button><p><button id="reregister" class="secondary">Re-register (save as v'+(ver+1)+', local only)</button></p><p><small>Update changes only the date shown in this browser. Re-register saves a new local version for owner review — it is NOT a legal patent renewal, and it does NOT re-anchor on chain automatically.</small></p></div>';
}
function attachExpire(p){
  const s=document.getElementById('expiry-save');if(s)s.onclick=()=>{const v=document.getElementById('expiry-input').value;setExpiry(p.id,v||'');route();};
  const c=document.getElementById('expiry-clear');if(c)c.onclick=()=>{setExpiry(p.id,'');route();};
  const r=document.getElementById('reregister');if(r)r.onclick=()=>{const cur=getVersions()[p.id]||p.version||1;setVersion(p.id,cur+1);alert('Re-registered locally as v'+(cur+1)+'. Not a legal renewal, and not re-anchored on chain.');route();};
}
function showList(){
  const el=document.getElementById('app');
  const mine=getUserPassports();
  const mySection=mine.length?'<h2>My Passports — added from search (this browser only)</h2><p>User-added passports are NOT anchored and NOT verified, unless separately anchored on the server later.</p><div class="grid">'+mine.map(p=>`<article class="card"><h3>${esc(p.product.name.en)}</h3><p><b>${esc(p.id)}</b> · Patent ${esc(p.patentNumber||'—')} · Application ${esc(p.applicationNumber||'—')}</p><p>${esc(p.ipReference.title)}</p><p>Assignee: ${esc(p.assignee||'—')} · Filed ${esc(p.filingDate||'—')} · Granted ${esc(p.grantDate||'—')}</p><p><a href="#/p/${esc(p.id)}">Open passport →</a></p></article>`).join('')+'</div>':'<h2>My Passports</h2><p>No user-added passports in this browser yet. Use “Add to Passport” on the <a href="/search">search page</a>.</p>';
  el.innerHTML='<h2>10 sample passports — scan a QR to open one</h2><p>Each QR opens its passport page at passport.truel1.com. All 10 are DEMO samples.</p><div class="grid">'+DATA.passports.map(p=>`<article class="card"><h3>${esc(p.product.name.en)}</h3><p><b>${p.id}</b> · ${esc(p.product.serial)}</p><p>${esc(p.technology.summary.en)}</p><p>Sample patent: <b>${esc(p.ipReference.number)}</b><br>${esc(p.ipReference.title)}</p><img src="/qr/${p.id}.png" alt="QR for ${p.id}"><p><a href="#/p/${p.id}">Open passport →</a><br><a href="/qr/${p.id}.png" download>Download QR PNG</a>${ANCHOR_MAP[p.id]?`<br><a href="${ANCHOR_MAP[p.id].explorerTx}" target="_blank" rel="noopener">Blockscout anchor tx ↗ (block ${ANCHOR_MAP[p.id].blockNumber})</a>`:''}</p></article>`).join('')+'</div>'+mySection;
}
function showUserDetail(p){
  const el=document.getElementById('app');
  const ver=getVersions()[p.id]||p.version||1;
  el.innerHTML=`<div class="detail"><p><a href="#/">← All 10 passports</a></p><h2>${esc(p.product.name.en)}</h2><p>${esc(p.product.name.ja)}</p><p><span class="badge grey">USER-ADDED — NOT ANCHORED, NOT VERIFIED</span></p><div class="qr-row"><div><p><b>QR image:</b> Not generated on the server for user-added passports.</p><p>Open by link: <code>https://passport.truel1.com/p/${esc(p.id)}</code></p><p><a href="#/p/${esc(p.id)}">Open this passport</a></p></div>${expireBoxHTML(p)}</div><table>
<tr><td>Passport ID</td><td>${esc(p.id)} · v${ver} · USER-ADDED (this browser only)</td></tr>
<tr><td>Patent</td><td>${esc(p.patentNumber||'—')} · Application ${esc(p.applicationNumber||'—')}</td></tr>
<tr><td>Title</td><td>${esc(p.ipReference.title)}</td></tr>
<tr><td>Assignee / applicant</td><td>${esc(p.assignee||'—')}</td></tr>
<tr><td>Inventors</td><td>${esc((p.inventors||[]).join(', '))}</td></tr>
<tr><td>Filed / Granted</td><td>${esc(p.filingDate||'—')} / ${esc(p.grantDate||'—')}</td></tr>
<tr><td>Status / Rights / Type</td><td>${esc(p.status||'—')} / ${esc(p.rights||'—')} / ${esc(p.type||'—')}</td></tr>
<tr><td>CPC</td><td>${esc((p.cpc||[]).join(', '))}</td></tr>
<tr><td>USPTO Patent Center</td><td><a href="${esc(p.sourceUrls.patentCenter||'#')}" target="_blank" rel="noopener">USPTO Patent Center ↗</a></td></tr>
<tr><td>Google Patents</td><td><a href="${esc(p.sourceUrls.googlePatents||'#')}" target="_blank" rel="noopener">Google Patents ↗</a></td></tr>
<tr><td>TRUE L1 anchor tx</td><td>Not anchored yet — user-added passports are not anchored by the search-page button. Anchoring is a separate server step.</td></tr>
<tr><td>About these links</td><td>Chain proof is integrity + time only, not ownership, licence or patent validity. This user-added record has not been chain-verified.</td></tr></table>
<p><button id="remove-user" class="secondary">Remove from My Passports (this browser)</button></p></div>`;
  attachExpire(p);
  const rm=document.getElementById('remove-user');if(rm)rm.onclick=()=>{saveUserPassports(getUserPassports().filter(x=>x.id!==p.id));location.hash='#/';route();};
}
async function showDetail(id){
  const el=document.getElementById('app');
  const user=getUserPassports().find(x=>x.id===id);
  if(user){showUserDetail(user);return;}
  let p=DATA.passports.find(x=>x.id===id);if(!p){el.innerHTML='<p>Not found. <a href="#/">Back to all 10</a></p>';return;}
  let current=JSON.parse(JSON.stringify(p));
  async function render(tampered){const digestNow=await sha256hex(canon(current));const stored=DIGESTS[id];const match=!tampered&&digestNow===stored;const cls=tampered?'bad':(match?'ok':'bad');const label=tampered?'MISMATCH — content changed after the sample hash was recorded':(match?'MATCH':'MISMATCH');
  el.innerHTML=`<div class="detail"><p><a href="#/">← All 10 passports</a></p><h2>${esc(current.product.name.en)}</h2><p>${esc(current.product.name.ja)}</p><p><span class="badge ${cls}">${label}</span></p><div class="qr-row"><div><img src="/qr/${id}.png" alt="QR for ${id}"><p>Scan this QR, or open: <code>https://passport.truel1.com/p/${id}</code></p></div>${expireBoxHTML(current)}</div><table>
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
<tr><td>Hash now</td><td>${(() => { const a = ANCHOR_MAP[id]; const code = `<code>${digestNow}</code>`; if (!a || tampered) return code; return `<a href="${a.explorerTx}" target="_blank" rel="noopener">${code} ↗ Blockscout anchor tx</a>`; })()}</td></tr>
<tr><td>Hash recorded</td><td>${(() => { const a = ANCHOR_MAP[id]; const code = `<code>${stored}</code>`; if (!a) return code; return `<a href="${a.explorerTx}" target="_blank" rel="noopener">${code} ↗ Blockscout anchor tx</a>`; })()}</td></tr>
<tr><td>TRUE L1 anchor tx</td><td>${ANCHOR_MAP[id] ? `<a href="${ANCHOR_MAP[id].explorerTx}" target="_blank" rel="noopener"><code>${ANCHOR_MAP[id].txHash}</code> ↗</a> · block ${ANCHOR_MAP[id].blockNumber}` : 'Not anchored yet'}</td></tr>
<tr><td>TRUE L1 contract</td><td>${ANCHORS ? `<a href="${ANCHORS.explorerContract}" target="_blank" rel="noopener"><code>${ANCHORS.contract}</code> ↗ Blockscout</a> · Chain 77777 · issuer <code>${ANCHORS.issuer}</code>` : 'Chain 77777 · Blockscout: https://explorer.truel1.com'}</td></tr>
<tr><td>About these links</td><td>A digest by itself is not a Blockscout transaction, so clicking a hash opens its anchor transaction — the on-chain record of that digest. Tampered hashes are not linked, because they were never anchored. Chain proof is integrity + time only, not ownership, licence or patent validity.</td></tr></table>
<p><button id="tamper">Tamper demo: change one field</button> <button id="restore" class="secondary">Restore original</button></p><p><small>Demo tamper changes only the in-browser copy, without re-anchoring — that is exactly why verification fails. It does not change the stored sample file.</small></p></div>`;
  attachExpire(current);
  document.getElementById('tamper').onclick=()=>{current=JSON.parse(JSON.stringify(p));current.product.materials.en='100% (tampered demo value)';render(true);};
  document.getElementById('restore').onclick=()=>{current=JSON.parse(JSON.stringify(p));render(false);};}render(false);}
window.addEventListener('hashchange',route);load();
