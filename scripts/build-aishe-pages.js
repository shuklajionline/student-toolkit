/* Generates all-India listing pages from the official AISHE institutional directory.
 * Called by scripts/build-directory.js. Input: scripts/data/aishe-institutions.json
 * Output:
 *   colleges/directory/<state>/index.html        — state overview (36 pages)
 *   colleges/directory/<state>/<district>.html   — every institution in the district (765 pages)
 *   colleges/directory/search-index.json         — compact index for all-India name search
 * District pages with fewer than MIN_INDEX institutions are noindex (too thin to rank on their own).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const MIN_INDEX = 10;
const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/['’.()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'na';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const fmt = n => n.toLocaleString('en-IN');
const safeUrl = u => {
  if (!u) return '';
  u = String(u).trim().replace(/^https?\.(?=www\.)/i, 'http://').replace(/^(https?):\/(?!\/)/i, '$1://');
  if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
  try { const x = new URL(u); return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(x.hostname) ? x.href : ''; } catch { return ''; }
};
const host = u => { try { return new URL(safeUrl(u)).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const norm = s => String(s).toLowerCase().replace(/\bthe\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const KIND = { U: 'University', C: 'College', S: 'Standalone institution' };

module.exports = function buildAishe({ ROOT, OUT, SITE, UPD, UPD_H, shell, curated }) {
  const file = path.join(ROOT, 'scripts', 'data', 'aishe-institutions.json');
  if (!fs.existsSync(file)) return null;
  const { meta, rows } = JSON.parse(fs.readFileSync(file, 'utf8'));
  rows.forEach(r => { r[5] = safeUrl(r[5]); });
  const SRC = `Source: <a href="https://aishe.gov.in/" rel="noopener" target="_blank">All India Survey on Higher Education (AISHE)</a>, Ministry of Education, Government of India — institutional directory as published on <a href="https://aikosh.indiaai.gov.in/" rel="noopener" target="_blank">AIKosh</a> under the Open Government License – India. Retrieved ${UPD_H}. Details are as reported to AISHE by institutions; confirm with the institution before applying.`;

  // Link AISHE rows to our curated profiles by website domain (strong) or exact normalized name in the same state.
  const byHost = new Map(), byName = new Map();
  curated.forEach(c => { if (c.web) byHost.set(c.web.replace(/^www\./, '').toLowerCase(), c.s); byName.set(c.state + '|' + norm(c.n), c.s); });
  const profileFor = r => { const h = host(r[5]); return (h && byHost.get(h)) || byName.get(r[3] + '|' + norm(r[1])) || null; };

  // Group by state → district
  const states = new Map();
  rows.forEach(r => {
    if (!states.has(r[3])) states.set(r[3], new Map());
    const d = states.get(r[3]);
    if (!d.has(r[4])) d.set(r[4], []);
    d.get(r[4]).push(r);
  });
  const stateList = [...states.keys()].sort();
  const sSlug = new Map(stateList.map(s => [s, slug(s)]));
  const dSlug = (st, d) => slug(d);

  const typeLabel = r => r[2] === 'U' ? 'University' : (r[8] || KIND[r[2]]);
  const govt = r => /government|local body|university/i.test(r[9]) && !/private/i.test(r[9]);
  const isPrivate = r => /private/i.test(r[9]);

  function rowHTML(r) {
    const prof = profileFor(r);
    const w = r[5] ? `<a href="${esc(r[5])}" rel="noopener nofollow" target="_blank">${esc(host(r[5]) || 'website')}</a>` : '—';
    return `<tr id="${esc(r[0])}" data-k="${r[2]}" data-m="${isPrivate(r) ? 'p' : govt(r) ? 'g' : 'o'}" data-n="${esc(r[1].toLowerCase())}"><td><b>${prof ? `<a href="/colleges/directory/${prof}.html">${esc(r[1])}</a>` : esc(r[1])}</b><br><small class="meta-line">${esc(r[0])}${r[7] ? ' · ' + esc(r[7]) : ''}</small></td><td>${esc(typeLabel(r))}</td><td>${esc(r[2] === 'U' ? (r[11] || '') : r[9] || '')}</td><td class="num">${r[6] || '—'}</td><td>${esc(r[10] || (r[2] === 'U' ? '—' : ''))}</td><td>${w}</td></tr>`;
  }
  const FILTER_JS = `<script>(function(){var q=document.getElementById('fq'),k=document.getElementById('fk'),m=document.getElementById('fm'),rows=[].slice.call(document.querySelectorAll('#lt tbody tr')),c=document.getElementById('fc');function a(){var w=q.value.toLowerCase().trim(),n=0;rows.forEach(function(r){var ok=(!w||r.dataset.n.indexOf(w)>-1)&&(!k.value||r.dataset.k===k.value)&&(!m.value||r.dataset.m===m.value);r.hidden=!ok;if(ok)n++;});c.textContent=n+' of '+rows.length+' shown';}[q,k,m].forEach(function(e){e.addEventListener('input',a);e.addEventListener('change',a);});if(location.hash){var t=document.getElementById(location.hash.slice(1));if(t){t.style.outline='2px solid #f97316';}}a();})();</script>`;
  const filters = `<div class="card" style="margin:14px 0"><div class="row"><div class="field"><label for="fq">Search in this list</label><input id="fq" type="search" placeholder="Name of college…" autocomplete="off"></div><div class="field"><label for="fk">Kind</label><select id="fk"><option value="">All</option><option value="U">Universities</option><option value="C">Colleges</option><option value="S">Standalone (polytechnic, nursing, B.Ed…)</option></select></div><div class="field"><label for="fm">Management</label><select id="fm"><option value="">All</option><option value="g">Government / aided / university</option><option value="p">Private</option></select></div></div><p class="meta-line" id="fc"></p></div>`;
  const table = list => `<div class="tbl-wrap"><table id="lt"><thead><tr><th>Institution</th><th>Type</th><th>Management</th><th>Est.</th><th>Affiliated to</th><th>Website</th></tr></thead><tbody>${list.map(rowHTML).join('')}</tbody></table></div>`;
  const counts = list => ({ u: list.filter(r => r[2] === 'U').length, c: list.filter(r => r[2] === 'C').length, s: list.filter(r => r[2] === 'S').length, p: list.filter(isPrivate).length });

  const written = { states: 0, districts: 0, indexable: [] };

  // ── District pages ──
  stateList.forEach(st => {
    const dmap = states.get(st), ss = sSlug.get(st);
    const dir = path.join(OUT, ss);
    fs.mkdirSync(dir, { recursive: true });
    const keep = new Set(['index.html']);
    const dists = [...dmap.keys()].sort();
    dists.forEach(d => {
      const list = dmap.get(d).slice().sort((a, b) => ('UCS'.indexOf(a[2]) - 'UCS'.indexOf(b[2])) || a[1].localeCompare(b[1]));
      const ds = dSlug(st, d); keep.add(ds + '.html');
      const k = counts(list);
      const url = `${SITE}/colleges/directory/${ss}/${ds}.html`;
      const indexable = list.length >= MIN_INDEX && d !== 'Not specified';
      if (indexable) written.indexable.push(url);
      const title = `Colleges in ${d}, ${st}: List of ${fmt(list.length)}`.slice(0, 70);
      const desc = `Full list of ${fmt(list.length)} colleges, universities and institutes in ${d} district, ${st} — type, management, year, affiliating university and official website (AISHE data).`;
      const others = dists.filter(x => x !== d).slice(0, 40);
      const body = `
  <header class="hero" style="text-align:left;margin:0;max-width:none">
    <div class="badge">${esc(st)} · AISHE directory</div>
    <h1>Colleges in <span>${esc(d)}</span>, ${esc(st)}</h1>
    <p class="lead" style="margin:0">${fmt(list.length)} higher-education institutions: ${fmt(k.u)} universit${k.u === 1 ? 'y' : 'ies'}, ${fmt(k.c)} college${k.c === 1 ? '' : 's'} and ${fmt(k.s)} standalone institution${k.s === 1 ? '' : 's'} (polytechnics, nursing, teacher training, PGDM and others). ${fmt(k.p)} are privately managed.</p>
  </header>
  ${filters}
  ${table(list)}
  <p class="meta-line" style="margin-top:10px">${SRC}</p>
  <section aria-labelledby="chk"><h2 id="chk">Before you take admission</h2><p>Being listed in AISHE means an institution reports data to the Ministry of Education — it is not, by itself, an approval of every course. Check the course on its regulator’s list (AICTE, NMC, BCI, PCI, INC, NCTE, COA) and the university on UGC’s lists. Our <a href="/blog/how-to-check-college-is-genuine.html">21-point college check</a> shows how, and the <a href="/tools/college-predictor.html">College Predictor</a> shows which colleges your score can get.</p></section>
  ${others.length ? `<section aria-labelledby="od"><h2 id="od">Other districts in ${esc(st)}</h2><p>${others.map(x => `<a href="/colleges/directory/${ss}/${dSlug(st, x)}.html">${esc(x)}</a>`).join(' · ')}${dists.length - 1 > others.length ? ` · <a href="/colleges/directory/${ss}/">all districts →</a>` : ''}</p></section>` : ''}
  ${FILTER_JS}`;
      const schema = [
        { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `Colleges in ${d}, ${st}`, url, description: desc, inLanguage: 'en-IN', dateModified: UPD, isBasedOn: 'https://aishe.gov.in/', license: 'https://www.data.gov.in/Godl' },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'College Directory', item: SITE + '/colleges/directory/' }, { '@type': 'ListItem', position: 2, name: st, item: `${SITE}/colleges/directory/${ss}/` }, { '@type': 'ListItem', position: 3, name: d, item: url }] }
      ];
      fs.writeFileSync(path.join(dir, ds + '.html'), shell({ title, desc, url, robots: indexable ? 'index,follow' : 'noindex,follow', schema, body, crumbs: `<a href="/">Home</a> › <a href="/colleges/directory/">College Directory</a> › <a href="/colleges/directory/${ss}/">${esc(st)}</a> › ${esc(d)}` }));
      written.districts++;
    });

    // ── State page ──
    const all = [].concat(...dists.map(d => dmap.get(d)));
    const k = counts(all);
    const unis = all.filter(r => r[2] === 'U').sort((a, b) => a[1].localeCompare(b[1]));
    const url = `${SITE}/colleges/directory/${ss}/`;
    written.indexable.push(url);
    const title = `Colleges in ${st}: All ${fmt(all.length)} Institutions (AISHE)`;
    const desc = `All ${fmt(all.length)} universities, colleges and institutes in ${st}, district by district — ${fmt(k.u)} universities, ${fmt(k.c)} colleges, ${fmt(k.s)} standalone institutions. Official AISHE data.`;
    const curatedHere = curated.filter(c => c.state === st);
    const body = `
  <header class="hero" style="text-align:left;margin:0;max-width:none">
    <div class="badge">State directory · AISHE data</div>
    <h1>Colleges in <span>${esc(st)}</span></h1>
    <p class="lead" style="margin:0">${fmt(all.length)} higher-education institutions across ${dists.length} district${dists.length > 1 ? 's' : ''}: ${fmt(k.u)} universities, ${fmt(k.c)} colleges and ${fmt(k.s)} standalone institutions. ${Math.round(k.p / Math.max(1, all.length) * 100)}% are privately managed.</p>
  </header>
  <section aria-labelledby="dl"><h2 id="dl">Districts</h2>
  <div class="tbl-wrap"><table class="fit"><thead><tr><th>District</th><th>Universities</th><th>Colleges</th><th>Standalone</th><th>Total</th></tr></thead><tbody>${dists.map(d => { const c2 = counts(dmap.get(d)); return `<tr><td><a href="/colleges/directory/${ss}/${dSlug(st, d)}.html">${esc(d)}</a></td><td class="num">${c2.u}</td><td class="num">${c2.c}</td><td class="num">${c2.s}</td><td class="num"><b>${dmap.get(d).length}</b></td></tr>`; }).join('')}</tbody></table></div></section>
  ${curatedHere.length ? `<section aria-labelledby="cp"><h2 id="cp">Detailed profiles in ${esc(st)}</h2><div class="dir-res">${curatedHere.map(c => `<a class="dc" href="/colleges/directory/${c.s}.html"><b>${esc(c.n)}</b><small>${esc(c.city)}</small></a>`).join('')}</div></section>` : ''}
  <section aria-labelledby="ul"><h2 id="ul">Universities in ${esc(st)} (${unis.length})</h2>
  <div class="tbl-wrap"><table><thead><tr><th>University</th><th>District</th><th>Est.</th><th>Website</th></tr></thead><tbody>${unis.map(r => { const prof = profileFor(r); return `<tr><td>${prof ? `<a href="/colleges/directory/${prof}.html">${esc(r[1])}</a>` : esc(r[1])}</td><td><a href="/colleges/directory/${ss}/${dSlug(st, r[4])}.html#${esc(r[0])}">${esc(r[4])}</a></td><td class="num">${r[6] || '—'}</td><td>${r[5] ? `<a href="${esc(r[5])}" rel="noopener nofollow" target="_blank">${esc(host(r[5]))}</a>` : '—'}</td></tr>`; }).join('')}</tbody></table></div></section>
  <p class="meta-line" style="margin-top:10px">${SRC}</p>
  <section><p><a href="/colleges/directory/">← All states</a> · <a href="/blog/how-to-check-college-is-genuine.html">How to check a college is genuine</a> · <a href="/tools/college-predictor.html">College Predictor</a></p></section>`;
    const schema = [
      { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `Colleges in ${st}`, url, description: desc, inLanguage: 'en-IN', dateModified: UPD, isBasedOn: 'https://aishe.gov.in/' },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'College Directory', item: SITE + '/colleges/directory/' }, { '@type': 'ListItem', position: 2, name: st, item: url }] }
    ];
    fs.writeFileSync(path.join(dir, 'index.html'), shell({ title, desc, url, robots: 'index,follow', schema, body, crumbs: `<a href="/">Home</a> › <a href="/colleges/directory/">College Directory</a> › ${esc(st)}` }));
    written.states++;
    // remove stale district files
    fs.readdirSync(dir).filter(f => f.endsWith('.html') && !keep.has(f)).forEach(f => fs.unlinkSync(path.join(dir, f)));
  });

  // ── Search index (loaded only when a visitor searches) ──
  const dKeys = [];
  const dIdx = new Map();
  stateList.forEach((st, si) => [...states.get(st).keys()].sort().forEach(d => { dIdx.set(st + '|' + d, dKeys.length); dKeys.push([si, d, dSlug(st, d)]); }));
  const ABBR = [[/indian institute of technology/, 'iit'], [/national institute of technology/, 'nit'], [/indian institute of management/, 'iim'], [/all india institute of medical sciences/, 'aiims'], [/national law (school|university|institute)/, 'nlu'], [/indian institute of information technology/, 'iiit'], [/indian institute of science education and research/, 'iiser'], [/birla institute of technology/, 'bits bit'], [/jawaharlal nehru technological university/, 'jntu'], [/national institute of fashion technology/, 'nift'], [/university/, 'univ']];
  const curBySlug = new Map(curated.map(c => [c.s, c]));
  const alias = r => {
    const n = r[1].toLowerCase(), out = [];
    ABBR.forEach(([re, ab]) => { if (re.test(n)) out.push(ab); });
    const p = profileFor(r); if (p) { const c = curBySlug.get(p); out.push(c.n.toLowerCase(), (c.alias || '').toLowerCase()); }
    return out.join(' ').trim();
  };
  const idx = { v: UPD, states: stateList.map(s => [s, sSlug.get(s)]), districts: dKeys, rows: rows.map(r => { const a = alias(r); const x = [r[1], 'UCS'.indexOf(r[2]), dIdx.get(r[3] + '|' + r[4]), r[0], profileFor(r) || 0]; if (a) x.push(a); return x; }) };
  const idxJson = JSON.stringify(idx);
  fs.writeFileSync(path.join(OUT, 'search-index.json'), idxJson);
  const VER = require('crypto').createHash('md5').update(idxJson).digest('hex').slice(0, 10);

  // ── Hub section ──
  const tot = counts(rows);
  const hubSection = `
  <section aria-labelledby="ai"><h2 id="ai">Every institution in India — ${fmt(rows.length)} listed</h2>
    <p>The full official list from the Ministry of Education’s AISHE survey: <b>${fmt(tot.u)}</b> universities, <b>${fmt(tot.c)}</b> colleges and <b>${fmt(tot.s)}</b> standalone institutions (polytechnics, nursing, teacher training, PGDM, paramedical). Search by name, or browse by state and district.</p>
    <div class="card"><div class="field" style="margin:0"><label for="aq">Search all ${fmt(rows.length)} institutions</label><input id="aq" type="search" placeholder="Type at least 3 letters — e.g. “government polytechnic”, “St. Joseph”, “nursing Kochi”" autocomplete="off"></div>
    <div id="ares" style="margin-top:10px"></div></div>
    <h3 style="margin-top:18px">Browse by state</h3>
    <div class="statelist">${stateList.map(s => `<a href="/colleges/directory/${sSlug.get(s)}/">${esc(s)} (${fmt([].concat(...[...states.get(s).values()]).length)})</a>`).join('')}</div>
    <p class="meta-line" style="margin-top:10px">${SRC}</p>
  </section>
<script>
(function(){
  var q=document.getElementById('aq'),out=document.getElementById('ares'),idx=null,loading=false,t;
  function esc(s){return String(s).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];});}
  var K=['University','College','Standalone'];
  function run(){var w=q.value.toLowerCase().trim();if(w.length<3){out.innerHTML='';return;}
    if(!idx){if(!loading){loading=true;out.innerHTML='<p class="meta-line">Loading the national list…</p>';fetch('/colleges/directory/search-index.json?v=${VER}').then(function(r){return r.json();}).then(function(j){idx=j;idx.rows.forEach(function(r){r[6]=(r[0]+' '+(r[5]||'')).toLowerCase();});run();}).catch(function(){out.innerHTML='<p class="note">Could not load the list. Please try again.</p>';});}return;}
    var words=w.split(/\\s+/),res=[];
    for(var i=0;i<idx.rows.length&&res.length<60;i++){var r=idx.rows[i],d=idx.districts[r[2]],st=idx.states[d[0]],hay=r[6]+' '+d[1].toLowerCase()+' '+st[0].toLowerCase();if(words.every(function(x){return hay.indexOf(x)>-1;}))res.push(r);}
    out.innerHTML=res.length?'<div class="dir-res">'+res.map(function(r){var d=idx.districts[r[2]],st=idx.states[d[0]];var href=r[4]?'/colleges/directory/'+r[4]+'.html':'/colleges/directory/'+st[1]+'/'+d[2]+'.html#'+r[3];return '<a class="dc" href="'+href+'"><b>'+esc(r[0])+'</b><small>'+esc(d[1])+', '+esc(st[0])+'</small><span class="pill">'+K[r[1]]+'</span>'+(r[4]?'<span class="pill g">Profile</span>':'')+'</a>';}).join('')+'</div>'+(res.length>=60?'<p class="meta-line">Showing first 60 — add more words to narrow down.</p>':''):'<p class="note">No institution found. Try a shorter name or the district.</p>';}
  q.addEventListener('input',function(){clearTimeout(t);t=setTimeout(run,180);});
})();
</script>`;

  return { hubSection, total: rows.length, counts: tot, states: written.states, districts: written.districts, indexable: written.indexable, stateList: stateList.map(s => [s, sSlug.get(s)]) };
};
