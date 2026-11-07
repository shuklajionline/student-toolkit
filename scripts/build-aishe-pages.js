/* Generates all-India listing pages from the official AISHE institutional directory.
 * Called by scripts/build-directory.js. Input: scripts/data/aishe-institutions.json
 * Output:
 *   colleges/directory/<state>/index.html        — state overview (36 pages)
 *   colleges/directory/<state>/<district>.html   — every institution in the district, grouped and sorted A–Z
 *   colleges/directory/search-index.json         — compact index for the hub search
 * District pages with fewer than MIN_INDEX institutions are noindex (too thin to rank on their own).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
const host = u => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const norm = s => String(s).toLowerCase().replace(/\bthe\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// ── Readable names: official ALL-CAPS names are shown in proper case; mixed-case names are kept as reported ──
const ACRONYMS = new Set('IIT NIT IIM IIIT IISER IISC AIIMS ITI DIET ICMR ICAR ISRO DRDO NCC NSS MBA BBA BCA MCA PGDM BBM BMS BHM CSE ECE EEE IT KV YMCA YWCA SRM VIT NMIMS JSS SDM KLE RNS PES SJCE NIE MVJ RV CMR DAV SSN PSG KPR KSR SNS JNTU GITAM KIIT NIMS LPU UPES BITS NSIT DTU ICT UCEK UCE CET GEC GCE GPT SKN BMIT TKM MES CBIT VNR MGM DY DYP MIT NBN AISSMS COEP VJTI IGNOU NIOS SNDT RTM SRTM BAMU SPPU KSOU ANM GNM BPT DMLT BSC MSC BCOM MCOM LLB LLM MBBS BDS BAMS BHMS BUMS BNYS BPED MPED DPED DED DELED BED MED PG UG HSC SSC NAAC NBA AICTE UGC PCI INC NCTE BCI COA ICFAI IFIM XLRI XIM NMIT BIT BBD AKS SGT RIMT CGC GNA SD GGS GRD SBS DBS KCC MLR JBIET CVR MRCET SR BVRIT IIMT'.split(' '));
const SMALL = new Set(['of', 'and', 'the', 'for', 'in', 'at', 'on', 'by', 'to', 'a', 'an', 'with', 'under']);
function nice(name) {
  const s = String(name).replace(/\s+/g, ' ').replace(/\s+([,.)])/g, '$1').replace(/\(\s+/g, '(').trim();
  if (/[a-z]/.test(s)) return s; // already mixed case — keep as reported
  let first = true;
  return s.split(' ').map(tok => {
    const out = tok.replace(/[A-Z0-9'’.&]+/g, (w, off, str) => {
      const core = w.replace(/[^A-Z0-9]/g, '');
      if (!core) return w;
      if (str[off - 1] === '(' && str[off + w.length] === ')' && core.length <= 6) return w;
      if (w.includes('.') && /[A-Z]/.test(w)) return w.split('.').map(p => p.length <= 1 ? p : p[0] + p.slice(1).toLowerCase()).join('.');
      if (ACRONYMS.has(core) || (/^[IVX]+$/.test(core) && core.length <= 4) || (core.length <= 3 && !/[AEIOU]/.test(core)) || /\d/.test(core)) return w;
      const lw = w.toLowerCase();
      if (!first && SMALL.has(lw)) return lw;
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    }).replace(/([-/(])([a-z])/g, (m, a, b) => a + b.toUpperCase());
    first = false;
    return out;
  }).join(' ');
}
const sortKey = n => nice(n).toLowerCase().replace(/^the\s+/, '').replace(/^[^a-z0-9]+/, '');
const byName = (a, b) => sortKey(a[1]).localeCompare(sortKey(b[1]), 'en');
const byText = (a, b) => String(a).localeCompare(String(b), 'en');

module.exports = function buildAishe({ ROOT, OUT, SITE, UPD, UPD_H, shell, curated }) {
  const file = path.join(ROOT, 'scripts', 'data', 'aishe-institutions.json');
  if (!fs.existsSync(file)) return null;
  const { rows } = JSON.parse(fs.readFileSync(file, 'utf8'));
  rows.forEach(r => { r[5] = safeUrl(r[5]); r.disp = nice(r[1]); });
  const SRC = `Source: <a href="https://aishe.gov.in/" rel="noopener" target="_blank">All India Survey on Higher Education (AISHE)</a>, Ministry of Education, Government of India — institutional directory as published on <a href="https://aikosh.indiaai.gov.in/" rel="noopener" target="_blank">AIKosh</a> under the Open Government License – India. Retrieved ${UPD_H}. Names and details are as reported to AISHE; confirm with the institution before applying.`;

  // Match AISHE rows to our detailed profiles by website domain or exact name in the same state.
  const hostMap = new Map(), nameMap = new Map();
  curated.forEach(c => { if (c.web) hostMap.set(c.web.replace(/^www\./, '').toLowerCase(), c.s); nameMap.set(c.state + '|' + norm(c.n), c.s); });
  const profileFor = r => { const h = host(r[5]); return (h && hostMap.get(h)) || nameMap.get(r[3] + '|' + norm(r[1])) || null; };
  rows.forEach(r => { r.prof = profileFor(r); });

  // state → district → rows
  const states = new Map();
  rows.forEach(r => {
    if (!states.has(r[3])) states.set(r[3], new Map());
    const d = states.get(r[3]);
    if (!d.has(r[4])) d.set(r[4], []);
    d.get(r[4]).push(r);
  });
  const stateList = [...states.keys()].sort(byText);
  const sSlug = new Map(stateList.map(s => [s, slug(s)]));
  const districtsOf = st => [...states.get(st).keys()].sort((a, b) => (a === 'Not specified') - (b === 'Not specified') || byText(a, b));

  const isPrivate = r => /private/i.test(r[9]);
  const isGovt = r => !isPrivate(r) && /government|local body|university/i.test(r[9]);
  const mgmtShort = r => !r[9] ? '' : isPrivate(r) ? (/aided/i.test(r[9]) ? 'Private (aided)' : 'Private') : r[9].replace(/ Government$/, ' Govt.');
  const counts = list => ({ u: list.filter(r => r[2] === 'U').length, c: list.filter(r => r[2] === 'C').length, s: list.filter(r => r[2] === 'S').length, p: list.filter(isPrivate).length, n: list.length });
  const nameCell = r => `<b>${r.prof ? `<a href="/colleges/directory/${r.prof}.html">${esc(r.disp)}</a> <span class="pill g">Profile</span>` : esc(r.disp)}</b><small class="meta-line" style="display:block">${esc(r[0])}${r[7] ? ' · ' + esc(r[7]) : ''}</small>`;
  const webCell = r => r[5] ? `<a href="${esc(r[5])}" rel="noopener nofollow" target="_blank">${esc(host(r[5]))}</a>` : '<span class="meta-line">—</span>';
  const attrs = r => `id="${esc(r[0])}" data-m="${isPrivate(r) ? 'p' : isGovt(r) ? 'g' : 'o'}" data-n="${esc((r.disp + ' ' + r[1]).toLowerCase())}"`;

  const SECTIONS = [
    ['U', 'Universities', 'universities', ['University', 'Established', 'Website'], r => [nameCell(r), `<span class="num">${r[6] || '—'}</span>`, webCell(r)]],
    ['C', 'Colleges', 'colleges', ['College', 'Type', 'Management', 'Est.', 'Affiliated to', 'Website'], r => [nameCell(r), esc(r[8] || ''), esc(mgmtShort(r)), `<span class="num">${r[6] || '—'}</span>`, esc(nice(r[10] || '')), webCell(r)]],
    ['S', 'Standalone institutions', 'standalone', ['Institution', 'Category', 'Management', 'Est.'], r => [nameCell(r), esc(r[8] || ''), esc(mgmtShort(r)), `<span class="num">${r[6] || '—'}</span>`]]
  ];
  const sectionHTML = list => SECTIONS.map(([k, title, id, heads, cells]) => {
    const rs = list.filter(r => r[2] === k).sort(byName);
    if (!rs.length) return '';
    return `<section class="lsec" aria-labelledby="h-${id}"><h2 id="h-${id}">${title} <span class="cnt">${fmt(rs.length)}</span></h2>
<div class="tbl-wrap"><table class="lt"><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rs.map(r => `<tr ${attrs(r)}>${cells(r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
  }).join('\n');

  const FILTER = `<div class="card filt"><div class="row"><div class="field"><label for="fq">Find in this list</label><input id="fq" type="search" placeholder="Type a name…" autocomplete="off"></div><div class="field"><label for="fm">Management</label><select id="fm"><option value="">All</option><option value="g">Government / aided / university</option><option value="p">Private</option></select></div></div><p class="meta-line" id="fc" aria-live="polite"></p></div>`;
  const FILTER_JS = `<script>(function(){var q=document.getElementById('fq'),m=document.getElementById('fm'),c=document.getElementById('fc'),secs=[].slice.call(document.querySelectorAll('.lsec'));function a(){var w=q.value.toLowerCase().trim(),tot=0,all=0;secs.forEach(function(s){var n=0,rows=s.querySelectorAll('tbody tr');rows.forEach(function(r){var ok=(!w||r.dataset.n.indexOf(w)>-1)&&(!m.value||r.dataset.m===m.value);r.hidden=!ok;if(ok)n++;});all+=rows.length;tot+=n;s.hidden=!n;var k=s.querySelector('.cnt');if(k)k.textContent=n===rows.length?rows.length.toLocaleString('en-IN'):n+' of '+rows.length;});c.textContent=(w||m.value)?tot+' of '+all+' institutions match':'';}[q,m].forEach(function(e){e.addEventListener('input',a);e.addEventListener('change',a);});if(location.hash){var t=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(t){t.classList.add('hl');setTimeout(function(){t.scrollIntoView({block:'center'});},50);}}a();})();</script>`;
  const STYLE = `<style>.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:16px 0}.stats-row div{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px 14px}.stats-row b{display:block;font-family:'Syne',sans-serif;font-size:22px;color:var(--ink)}.stats-row span{font-size:12.5px;color:var(--ink3)}
.jump{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 4px}.jump a{background:var(--bg2);border:1px solid var(--border2);border-radius:99px;padding:6px 12px;font-size:13px;text-decoration:none;color:var(--ink2)}.jump a:hover{border-color:var(--accent);color:var(--ink)}
.filt{margin:14px 0}.lsec h2{display:flex;align-items:center;gap:10px}.cnt{font:600 13px 'DM Sans',sans-serif;background:var(--abg);color:var(--a2);padding:3px 10px;border-radius:99px}
table.lt td small{font-size:11.5px}table.lt td:first-child{min-width:240px}tr.hl td{background:rgba(249,115,22,.14)}
.dgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}.dgrid a{display:flex;justify-content:space-between;gap:8px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:9px 12px;text-decoration:none;color:var(--ink2);font-size:14px}.dgrid a:hover{border-color:var(--accent);color:var(--ink)}.dgrid a span{color:var(--ink3);font-variant-numeric:tabular-nums}</style>`;
  const stats = (k, extra) => `<div class="stats-row"><div><b>${fmt(k.n)}</b><span>institutions</span></div><div><b>${fmt(k.u)}</b><span>universities</span></div><div><b>${fmt(k.c)}</b><span>colleges</span></div><div><b>${fmt(k.s)}</b><span>standalone institutions</span></div><div><b>${k.n ? Math.round(k.p / k.n * 100) : 0}%</b><span>privately managed</span></div>${extra || ''}</div>`;
  const jump = k => `<nav class="jump" aria-label="Jump to section">${k.u ? `<a href="#h-universities">Universities (${fmt(k.u)})</a>` : ''}${k.c ? `<a href="#h-colleges">Colleges (${fmt(k.c)})</a>` : ''}${k.s ? `<a href="#h-standalone">Standalone (${fmt(k.s)})</a>` : ''}</nav>`;

  const written = { states: 0, districts: 0, indexable: [] };
  const stateSummary = [];

  stateList.forEach(st => {
    const dmap = states.get(st), ss = sSlug.get(st), dists = districtsOf(st);
    const dir = path.join(OUT, ss);
    fs.mkdirSync(dir, { recursive: true });
    const keep = new Set(['index.html']);
    const dgrid = exclude => `<div class="dgrid">${dists.filter(d => d !== exclude).map(d => `<a href="/colleges/directory/${ss}/${slug(d)}.html">${esc(d)}<span>${fmt(dmap.get(d).length)}</span></a>`).join('')}</div>`;

    // ── District pages ──
    dists.forEach(d => {
      const list = dmap.get(d), ds = slug(d), k = counts(list);
      keep.add(ds + '.html');
      const url = `${SITE}/colleges/directory/${ss}/${ds}.html`;
      const indexable = list.length >= MIN_INDEX && d !== 'Not specified';
      if (indexable) written.indexable.push(url);
      const title = `Colleges in ${d}, ${st}: List of ${fmt(list.length)}`;
      const desc = `All ${fmt(list.length)} colleges, universities and institutes in ${d} district, ${st}, sorted A–Z — type, management, year, affiliating university and website (AISHE data).`;
      const body = `${STYLE}
  <header class="hero" style="text-align:left;margin:0;max-width:none;padding-bottom:6px">
    <div class="badge">${esc(st)} · District directory</div>
    <h1>Colleges in <span>${esc(d)}</span>, ${esc(st)}</h1>
    <p class="lead" style="margin:0">Every higher-education institution in ${esc(d)} district from the Ministry of Education’s AISHE directory, grouped by kind and sorted A–Z.</p>
  </header>
  ${stats(k)}
  ${jump(k)}
  ${FILTER}
  ${sectionHTML(list)}
  <p class="meta-line" style="margin-top:12px">${SRC}</p>
  <section aria-labelledby="chk"><h2 id="chk">Before you take admission</h2><p>An AISHE listing means the institution reports data to the Ministry of Education — it is not, by itself, approval of every course. Check the course on its regulator’s list (AICTE, NMC, BCI, PCI, INC, NCTE, COA) and the university on UGC’s lists. Use our <a href="/blog/how-to-check-college-is-genuine.html">21-point college check</a> and the <a href="/tools/college-predictor.html">College Predictor</a>.</p></section>
  ${dists.length > 1 ? `<section aria-labelledby="od"><h2 id="od">Other districts in ${esc(st)}</h2>${dgrid(d)}</section>` : ''}
  <p><a href="/colleges/directory/${ss}/">← ${esc(st)} overview</a> · <a href="/colleges/directory/">All states</a></p>
  ${FILTER_JS}`;
      const schema = [
        { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `Colleges in ${d}, ${st}`, url, description: desc, inLanguage: 'en-IN', dateModified: UPD, isBasedOn: 'https://aishe.gov.in/' },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'College Directory', item: SITE + '/colleges/directory/' }, { '@type': 'ListItem', position: 2, name: st, item: `${SITE}/colleges/directory/${ss}/` }, { '@type': 'ListItem', position: 3, name: d, item: url }] }
      ];
      fs.writeFileSync(path.join(dir, ds + '.html'), shell({ title, desc, url, robots: indexable ? 'index,follow' : 'noindex,follow', schema, body, crumbs: `<a href="/">Home</a> › <a href="/colleges/directory/">College Directory</a> › <a href="/colleges/directory/${ss}/">${esc(st)}</a> › ${esc(d)}` }));
      written.districts++;
    });

    // ── State page ──
    const all = [].concat(...dists.map(d => dmap.get(d)));
    const k = counts(all);
    stateSummary.push([st, ss, k.n, k.u, k.c, k.s, dists.length]);
    const unis = all.filter(r => r[2] === 'U').sort(byName);
    const top = dists.slice().sort((a, b) => dmap.get(b).length - dmap.get(a).length || byText(a, b)).slice(0, 5);
    const url = `${SITE}/colleges/directory/${ss}/`;
    written.indexable.push(url);
    const title = `Colleges in ${st}: All ${fmt(all.length)} Institutions`;
    const desc = `All ${fmt(all.length)} universities, colleges and institutes in ${st}, by district: ${fmt(k.u)} universities, ${fmt(k.c)} colleges, ${fmt(k.s)} standalone institutions (AISHE data).`;
    const curatedHere = curated.filter(c => c.state === st).sort((a, b) => byText(a.n, b.n));
    const body = `${STYLE}
  <header class="hero" style="text-align:left;margin:0;max-width:none;padding-bottom:6px">
    <div class="badge">State directory · AISHE data</div>
    <h1>Colleges in <span>${esc(st)}</span></h1>
    <p class="lead" style="margin:0">Every higher-education institution in ${esc(st)}, organised by district. Largest districts: ${top.map(d => `${esc(d)} (${fmt(dmap.get(d).length)})`).join(', ')}.</p>
  </header>
  ${stats(k, `<div><b>${dists.length}</b><span>districts</span></div>`)}
  <section aria-labelledby="dl"><h2 id="dl">Districts (A–Z)</h2>${dgrid(null)}</section>
  ${curatedHere.length ? `<section aria-labelledby="cp"><h2 id="cp">Detailed profiles in ${esc(st)} <span class="cnt">${curatedHere.length}</span></h2><div class="dgrid">${curatedHere.map(c => `<a href="/colleges/directory/${c.s}.html">${esc(c.n)}<span>${esc(c.city)}</span></a>`).join('')}</div></section>` : ''}
  <section aria-labelledby="h-universities" class="lsec"><h2 id="h-universities">Universities in ${esc(st)} <span class="cnt">${unis.length}</span></h2>
  <div class="tbl-wrap"><table class="lt"><thead><tr><th>University</th><th>District</th><th>Established</th><th>Website</th></tr></thead><tbody>${unis.map(r => `<tr><td>${nameCell(r)}</td><td><a href="/colleges/directory/${ss}/${slug(r[4])}.html#${esc(r[0])}">${esc(r[4])}</a></td><td class="num">${r[6] || '—'}</td><td>${webCell(r)}</td></tr>`).join('')}</tbody></table></div></section>
  <p class="meta-line" style="margin-top:12px">${SRC}</p>
  <p><a href="/colleges/directory/">← All states</a> · <a href="/blog/how-to-check-college-is-genuine.html">How to check a college is genuine</a> · <a href="/tools/college-predictor.html">College Predictor</a></p>`;
    const schema = [
      { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `Colleges in ${st}`, url, description: desc, inLanguage: 'en-IN', dateModified: UPD, isBasedOn: 'https://aishe.gov.in/' },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'College Directory', item: SITE + '/colleges/directory/' }, { '@type': 'ListItem', position: 2, name: st, item: url }] }
    ];
    fs.writeFileSync(path.join(dir, 'index.html'), shell({ title, desc, url, robots: 'index,follow', schema, body, crumbs: `<a href="/">Home</a> › <a href="/colleges/directory/">College Directory</a> › ${esc(st)}` }));
    written.states++;
    fs.readdirSync(dir).filter(f => f.endsWith('.html') && !keep.has(f)).forEach(f => fs.unlinkSync(path.join(dir, f)));
  });

  // ── Search index: rows pre-sorted A–Z by display name ──
  const dKeys = [], dIdx = new Map();
  stateList.forEach((st, si) => districtsOf(st).forEach(d => { dIdx.set(st + '|' + d, dKeys.length); dKeys.push([si, d, slug(d)]); }));
  const ABBR = [[/indian institute of technology/, 'iit'], [/national institute of technology/, 'nit'], [/indian institute of management/, 'iim'], [/all india institute of medical sciences/, 'aiims'], [/national law (school|university|institute)/, 'nlu'], [/indian institute of information technology/, 'iiit'], [/indian institute of science education and research/, 'iiser'], [/birla institute of technology/, 'bits bit'], [/jawaharlal nehru technological university/, 'jntu'], [/national institute of fashion technology/, 'nift']];
  const curBySlug = new Map(curated.map(c => [c.s, c]));
  const alias = r => { const n = r[1].toLowerCase(), out = []; ABBR.forEach(([re, ab]) => { if (re.test(n)) out.push(ab); }); if (r.prof) { const c = curBySlug.get(r.prof); out.push(c.n.toLowerCase(), (c.alias || '').toLowerCase()); } return out.join(' ').trim(); };
  const sorted = rows.slice().sort(byName);
  const idx = { v: UPD, states: stateList.map(s => [s, sSlug.get(s)]), districts: dKeys, rows: sorted.map(r => { const x = [r.disp, 'UCS'.indexOf(r[2]), dIdx.get(r[3] + '|' + r[4]), r[0], r.prof || 0]; const a = alias(r); if (a) x.push(a); return x; }) };
  const idxJson = JSON.stringify(idx);
  fs.writeFileSync(path.join(OUT, 'search-index.json'), idxJson);
  const VER = crypto.createHash('md5').update(idxJson).digest('hex').slice(0, 10);

  return { total: rows.length, counts: counts(rows), states: written.states, districts: written.districts, indexable: written.indexable, stateSummary, VER, SRC, nice };
};
