const $ = (id) => document.getElementById(id);
function esc(s){return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
async function checkHealth(){
  try{
    const r = await fetch('/search/api/health');
    const j = await r.json();
    $('health').textContent = j.ok ? 'Proxy OK — mode: ' + j.mode + (j.odp ? ' · USPTO key configured on server' : ' · USPTO key NOT configured yet') : 'Proxy unavailable';
  }catch(e){ $('health').textContent = 'Proxy unavailable — is the search proxy running on the server?'; }
}
function card(p){
  return `<article class="result"><h3>${esc(p.title || 'Untitled')}</h3>
<p class="meta">Patent <b>${esc(p.patentNumber || '—')}</b> · Application ${esc(p.applicationNumber || '—')} · Filed ${esc(p.filingDate || '—')} · Granted ${esc(p.grantDate || '—')} · Status: ${esc(p.status || '—')} · Rights: ${esc(p.rights || '—')} · Type: ${esc(p.type || '—')}</p>
<p>Assignee/applicant: ${esc(p.assignee || p.applicant || '—')} · Inventors: ${esc((p.inventors || []).join(', '))} · CPC: ${esc((p.cpc || []).join(', '))}</p>
${p.abstract ? `<p><b>Abstract:</b> ${esc(p.abstract)}</p>` : `<p><i>Abstract not returned by USPTO for this record — see full text links below.</i></p>`}
${p.claim1 ? `<p><b>Claim 1:</b> ${esc(p.claim1)}</p>` : ''}
<p><a href="${esc(p.sourceUrls.patentCenter)}" target="_blank" rel="noopener">USPTO Patent Center ↗</a> · <a href="${esc(p.sourceUrls.googlePatents)}" target="_blank" rel="noopener">Google Patents ↗</a> · <button type="button" class="add-passport" data-add="${encodeURIComponent(JSON.stringify(p))}">Add to Passport</button></p>
<p class="meta">Source: ${esc(p.source)} · Fetched: ${esc(p.fetchedAt || '')}</p></article>`;
}
function render(data, isOwner){
  $('status').textContent = `Found ${data.total} total · showing ${data.items.length} · source: ${data.source || 'USPTO ODP live'}`;
  if(isOwner && data.byYear){
    const years = Object.entries(data.byYear).sort();
    $('totals').hidden = false;
    $('totals').innerHTML = `<h2>Owner totals</h2><p>Total: <b>${data.total}</b> · Active: ${data.active} · Expired: ${data.expired}</p><p>By year (from returned records): ${years.map(([y,c]) => `${y}: ${c}`).join(', ') || '—'}</p>`;
  } else { $('totals').hidden = true; }
  $('results').innerHTML = data.items.length ? data.items.map(card).join('') : '<p>No results. Try a different number, owner spelling, or broader keywords.</p>';
  document.querySelectorAll('.add-passport').forEach(btn => { btn.onclick = () => { try { addToPassport(JSON.parse(decodeURIComponent(btn.dataset.add)), btn); } catch(e) { alert('Could not add this record.'); } }; });
}
function addToPassport(p, btn){
  const id = 'USER-' + (p.patentNumber || p.applicationNumber || 'UNKNOWN');
  let list = [];
  try { list = JSON.parse(localStorage.getItem('trueip-my-passports') || '[]'); } catch(e) { list = []; }
  if (!Array.isArray(list)) list = [];
  if (list.find(x => x.id === id)) { window.location.href = '/#/p/' + encodeURIComponent(id); return; }
  const up = {
    id, version: 1, _userAdded: true,
    product: { name: { en: p.title || 'Untitled', ja: p.title || 'Untitled' }, serial: p.applicationNumber || p.patentNumber || '', batch: 'USER-ADDED', materials: { en: 'Not set — user-added from USPTO', ja: 'Not set — user-added from USPTO' }, care: { en: 'Not set — user-added from USPTO', ja: 'Not set — user-added from USPTO' }, manufacturer: { name: p.assignee || p.applicant || '', country: '' } },
    ipReference: { number: p.patentNumber ? ('US' + p.patentNumber) : (p.applicationNumber || ''), title: p.title || '', relationNote: { en: 'User-added from USPTO live search. Not anchored, not verified. No licence or ownership has been verified.', ja: 'User-added from USPTO live search.' } },
    technology: { summary: { en: 'USPTO record — ' + (p.status || '') + '. Filed ' + (p.filingDate || '—') + ', granted ' + (p.grantDate || '—') + '.', ja: 'USPTO record.' }, howItAppears: { en: 'Inventors: ' + (p.inventors || []).join(', '), ja: '' } },
    patentNumber: p.patentNumber || '', applicationNumber: p.applicationNumber || '', filingDate: p.filingDate || '', grantDate: p.grantDate || '', status: p.status || '', rights: p.rights || '', type: p.type || '', cpc: p.cpc || [], assignee: p.assignee || p.applicant || '', inventors: p.inventors || [], sourceUrls: p.sourceUrls || {}, source: p.source || 'USPTO ODP live', fetchedAt: p.fetchedAt || ''
  };
  list.push(up);
  localStorage.setItem('trueip-my-passports', JSON.stringify(list));
  if (btn) btn.textContent = 'Added ✓ — Opening passport…';
  window.location.href = '/#/p/' + encodeURIComponent(id);
}
$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const mode = $('mode').value, q = $('q').value.trim(), owner = $('owner').value.trim();
  $('status').textContent = 'Searching USPTO live…'; $('results').innerHTML = '';
  const params = new URLSearchParams({mode, q, owner, fromYear: $('fromYear').value, toYear: $('toYear').value, type: $('type').value, cpc: $('cpc').value, limit: '25'});
  try{
    const endpoint = mode === 'owner' ? '/search/api/owner' : '/search/api/search';
    const r = await fetch(endpoint + '?' + params.toString());
    const j = await r.json();
    if(!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
    render(j, mode === 'owner');
  }catch(err){
    $('status').textContent = '';
    $('results').innerHTML = `<p class="error">Search failed: ${esc(err.message)}. If it says USPTO rate limit, wait a moment and retry — do not resubmit repeatedly.</p>`;
  }
});
$('csv').addEventListener('click', () => {
  const owner = $('owner').value.trim() || $('q').value.trim();
  if(!owner){ alert('Enter an owner name first for CSV.'); return; }
  window.location = '/search/api/owner.csv?name=' + encodeURIComponent(owner);
});
checkHealth();
