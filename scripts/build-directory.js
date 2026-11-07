#!/usr/bin/env node
/* Builds the Grand College Directory from colleges/directory/data.js
 *   node scripts/build-directory.js
 * Outputs:
 *   colleges/directory/index.html     — searchable hub (indexable)
 *   colleges/directory/<slug>.html    — one profile per institution
 *                                       (noindex until listed in REVIEWED, per our editorial policy)
 *   sitemap.xml                       — hub + reviewed profiles
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const D = require(path.join(ROOT, 'colleges', 'directory', 'data.js'));
const SITE = 'https://studenttoolkit.online';
const OUT = path.join(ROOT, 'colleges', 'directory');
const UPD = D.UPDATED;
const UPD_H = new Date(UPD).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const V = UPD.replace(/-/g, '');
const C = D.COLLEGES;
const REVIEWED = new Set(D.REVIEWED);
const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const ld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

// Filter groups shown to students
const GROUPS = [
  ['iit', 'IITs', ['IIT']], ['nit', 'NITs', ['NIT']], ['iiit', 'IIITs', ['IIIT', 'IIITH']], ['iim', 'IIMs', ['IIM']],
  ['med', 'AIIMS & medical', ['AIIMS', 'MEDINI', 'MED']], ['law', 'NLUs', ['NLU', 'NLUD']], ['cu', 'Central universities', ['CU']],
  ['du', 'Delhi University colleges', ['DU_COL']], ['state', 'State universities & govt colleges', ['SU', 'STECH', 'GCOL']],
  ['pvt', 'Private, deemed & autonomous', ['DEEMED', 'PVT', 'PCOL', 'ACOL']], ['bsch', 'Business schools', ['BSCH']],
  ['sci', 'Science & research (IISc, IISERs)', ['SCI', 'IISER', 'INI']], ['design', 'Design & architecture', ['DESIGN', 'SPA']]
];
const groupOf = t => (GROUPS.find(g => g[2].includes(t)) || ['other'])[0];

// Type-level guidance — honest, general, and labelled as such on every profile.
const INFO = {
  IIT: { fees: 'B.Tech tuition at IITs is about ₹2 lakh a year (plus hostel and mess). Under Ministry of Education rules, SC/ST/PwD students and students with family income below ₹1 lakh get a full tuition waiver, and those with family income between ₹1–5 lakh get a two-thirds waiver.', adm: 'B.Tech/B.S./Dual degree: qualify JEE Main, then rank in JEE Advanced and choose seats through JoSAA counselling. M.Tech: GATE (COAP). M.Sc: IIT JAM. MBA (where offered): CAT.', pros: ['Strong national brand and alumni network', 'Research facilities and faculty quality among the best in India', 'Fee waivers make it affordable for lower-income families', 'Good placement and higher-studies outcomes in most popular branches'], cons: ['Extremely competitive entry through JEE Advanced', 'Newer IITs (set up after 2008) have smaller alumni networks and placements that vary a lot by branch', 'Heavy academic workload and relative grading', 'Some campuses are far from big cities'] },
  NIT: { fees: 'B.Tech tuition at NITs is about ₹1.25 lakh a year (plus hostel and mess), with fee waivers for SC/ST/PwD students and income-based remission similar to IITs.', adm: 'B.Tech: JEE Main rank through JoSAA/CSAB counselling, with 50% Home State and 50% Other State quota. M.Tech: GATE via CCMT. MCA: NIMCET.', pros: ['Government-funded, affordable fees', 'Home-state quota helps local students', 'Strong placements at older NITs (Trichy, Surathkal, Warangal, Calicut, Rourkela and others)', 'Diverse student body from across India'], cons: ['Outcomes vary widely between older and newer NITs', 'Branch matters a lot for placements', 'Infrastructure at some newer NITs is still developing'] },
  IIIT: { fees: 'B.Tech fees at central and PPP-model IIITs typically range from about ₹1.5–3.5 lakh a year; check the official fee page for your year.', adm: 'B.Tech: JEE Main rank through JoSAA counselling. M.Tech: GATE.', pros: ['Focused on computer science, IT and electronics', 'Generally good tech placements for CSE/ECE', 'Smaller batches'], cons: ['Fewer branches beyond CS/ECE', 'Newer IIITs may operate from temporary campuses', 'PPP-model IIITs can have higher fees than NITs'] },
  IIITH: { fees: 'Fees vary by institute and programme; check the official fee page.', adm: 'Admissions through JEE Main and the institute’s own channels (for example special entrance tests, Olympiad or lateral routes).', pros: ['Strong computer science research culture', 'Excellent tech industry links'], cons: ['Highly competitive admission', 'Narrower range of programmes than a full university'] },
  IIM: { fees: 'Two-year MBA/PGP total fees range roughly from ₹12 lakh at newer IIMs to ₹25 lakh+ at the oldest IIMs. Most IIMs offer need-based financial aid.', adm: 'MBA/PGP: CAT score, then the IIM’s own shortlist (academics, work experience, diversity) and a written ability test / personal interview. 5-year IPM (some IIMs): IPMAT or JIPMAT.', pros: ['Strong brand with recruiters', 'Rigorous curriculum and peer group', 'Financial aid available'], cons: ['Very high CAT percentiles needed at older IIMs', 'Newer IIMs’ placements and campuses vary', 'High fees relative to some government B-schools'] },
  AIIMS: { fees: 'MBBS fees at AIIMS institutes are very low — typically a few thousand rupees a year — plus hostel charges.', adm: 'MBBS: NEET-UG, with seats allotted through MCC counselling. PG: INI-CET.', pros: ['Among the lowest-cost, highest-quality medical education in India', 'Huge patient load and clinical exposure (especially older AIIMS)', 'Strong research culture'], cons: ['Extremely high NEET-UG ranks needed', 'Newer AIIMS institutes are still building hospitals and faculty strength'] },
  MEDINI: { fees: 'Fees are very low by Indian medical-college standards; check the official prospectus.', adm: 'MBBS (where offered): NEET-UG via MCC. PG: INI-CET.', pros: ['Government institute of national importance', 'High clinical exposure'], cons: ['Extremely competitive entry'] },
  MED: { fees: 'Government medical colleges charge low fees (often under ₹1 lakh a year in many states); private and deemed medical colleges can charge ₹10–25 lakh a year or more. Check the official fee structure.', adm: 'MBBS: NEET-UG through MCC (All India Quota, deemed universities) or state counselling. PG: NEET-PG.', pros: ['NMC-recognised MBBS', 'Clinical exposure through attached hospitals'], cons: ['Private-college fees can be very high', 'Always verify NMC recognition and seat approval for your year'] },
  IISER: { fees: 'Fees are modest by Indian standards; many students qualify for the DST INSPIRE scholarship. Check the official fee page.', adm: 'BS-MS: IISER Aptitude Test (IAT). PhD: JAM / GATE / NET and interviews.', pros: ['Research-first undergraduate science education', 'Excellent preparation for PhDs in India and abroad'], cons: ['Fewer direct corporate placements than engineering institutes', 'Best suited to students who want research careers'] },
  NLU: { fees: 'Five-year law programmes at NLUs typically cost about ₹2–3.5 lakh a year including hostel; check the official fee page for exact figures.', adm: '5-year integrated LLB and LLM: CLAT, with seats allotted through the Consortium of NLUs counselling. Many NLUs have a state domicile quota.', pros: ['BCI-approved, well-regarded law degrees', 'Strong moot court and placement culture at top NLUs', 'Residential campuses'], cons: ['Fees are high compared with other government universities', 'Outcomes vary a lot between older and newer NLUs'] },
  NLUD: { fees: 'Check the official fee page; fees are in the range of other NLUs.', adm: 'Admissions through AILET (not CLAT).', pros: ['Top-ranked law school', 'Located in Delhi with strong court and firm access'], cons: ['Separate entrance exam (AILET) — plan for both CLAT and AILET'] },
  CU: { fees: 'Central universities charge low fees for most undergraduate and postgraduate programmes; professional courses cost more.', adm: 'UG: CUET-UG. PG: CUET-PG (most programmes). PhD: university or national tests.', pros: ['Low fees and government recognition', 'Students from across India', 'Wide range of subjects'], cons: ['Placements depend heavily on the course and department', 'Some newer central universities have limited infrastructure'] },
  SU: { fees: 'State universities usually charge low fees for regular programmes; self-financing courses cost more.', adm: 'CUET (for universities that use it), state entrance tests, or merit in Class 12, depending on the state and course.', pros: ['Affordable', 'Strong local reputation and alumni networks'], cons: ['Admin and exam processes can be slow', 'Quality varies by department and affiliated college'] },
  STECH: { fees: 'Government technical universities and institutes generally charge moderate fees, lower than private engineering colleges; check the official fee page.', adm: 'JEE Main and/or state CET counselling, depending on the institute.', pros: ['Affordable engineering education with established reputations', 'Strong local industry links'], cons: ['Affiliated colleges under technical universities vary hugely in quality', 'Check the specific college, not just the university name'] },
  GCOL: { fees: 'Government colleges usually charge low fees; check the state fee notification.', adm: 'State entrance tests, JEE Main or merit, depending on the course.', pros: ['Low cost', 'Government recognition'], cons: ['Facilities and placements vary'] },
  DU_COL: { fees: 'Most DU college programmes cost roughly ₹10,000–60,000 a year; some self-financed courses cost more.', adm: 'UG: CUET-UG scores, then allocation through DU’s CSAS portal.', pros: ['Delhi University degree and campus life', 'Low fees', 'Strong peer group at top colleges'], cons: ['Very high CUET scores needed for top colleges', 'Hostel seats are limited — Delhi rents are high'] },
  DEEMED: { fees: 'Private deemed universities usually charge ₹2–5 lakh a year for B.Tech and more for medicine and management. Check the official fee page and ask about yearly fee increases.', adm: 'Own entrance tests (for example BITSAT, VITEEE, SRMJEEE, MET), JEE Main or merit, depending on the university.', pros: ['Modern infrastructure and flexible curricula at good institutions', 'Many offer strong industry links'], cons: ['High fees', 'Quality and placements vary widely — check NIRF data and verified placement reports', 'Beware “management quota” and agent fees'] },
  PVT: { fees: 'Private university fees vary widely; check the official fee page and refund policy before paying.', adm: 'Own tests, national exams or merit, depending on the university.', pros: ['Flexible admissions and new-age programmes', 'Modern campuses'], cons: ['Fees are high', 'Placement claims need independent verification', 'Check UGC recognition and approvals for your specific course'] },
  PCOL: { fees: 'Private engineering college fees depend on the seat type (government/CET quota vs management/COMEDK). Check the official fee notification.', adm: 'State CET, COMEDK UGET or JEE Main, depending on the seat type.', pros: ['Well-known autonomous colleges with strong industry links', 'CET-quota seats are much cheaper than management seats'], cons: ['Management-quota fees can be several times higher', 'Degree is awarded by the affiliating university'] },
  ACOL: { fees: 'Autonomous aided colleges usually charge low fees for aided courses and higher fees for self-financed courses.', adm: 'Merit and/or the college’s own entrance tests and interviews.', pros: ['Strong reputations in arts, science and commerce', 'Autonomy over curriculum and exams'], cons: ['Self-financed courses cost more than aided ones', 'Limited hostel seats at many colleges'] },
  BSCH: { fees: 'Two-year PGDM/MBA programmes at leading business schools typically cost ₹10–28 lakh in total. Check the official fee page and placement report.', adm: 'CAT, XAT, GMAT, CMAT or the school’s own test, followed by GD/WAT/PI.', pros: ['Strong corporate networks at established schools', 'Industry-focused curriculum'], cons: ['High fees — compare total cost with median (not highest) salary', 'For PGDMs, check AICTE approval and AIU equivalence if you need it'] },
  DESIGN: { fees: 'Design programmes at NID and NIFT typically cost about ₹2.5–4 lakh a year; check the official fee page.', adm: 'NID: NID DAT (prelims + mains). NIFT: NIFT entrance exam and situation test/interview.', pros: ['Leading design brands in India', 'Studio-based learning and industry projects'], cons: ['Portfolio and creative aptitude matter more than marks', 'Fees are higher than most government programmes'] },
  SPA: { fees: 'Fees are moderate for a government institute; check the official fee page.', adm: 'B.Arch / B.Plan: JEE Main Paper 2 through JoSAA. M.Arch / M.Plan: GATE / institute process.', pros: ['Leading government schools of architecture and planning'], cons: ['Long programme (B.Arch is 5 years)'] },
  SCI: { fees: 'Fees and stipends vary by programme; many research programmes pay stipends.', adm: 'Institute tests, JAM, GATE, NET or national-level exams depending on the programme.', pros: ['Strong research environment', 'Stipends for research programmes'], cons: ['Mostly postgraduate/research-focused'] },
  INI: { fees: 'Check the official fee page for the programme.', adm: 'Varies by programme — see the official admissions page.', pros: ['Institute of national importance with strong reputation'], cons: ['Highly competitive admissions'] }
};

const STATES = [...new Set(C.map(c => c.state))].sort();
const typeName = t => D.TYPES[t].name;
const streams = c => c.streams.map(s => D.STREAMS[s]).filter(Boolean);

function shell({ title, desc, url, robots, schema, body, crumbs }) {
  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-J60HJ54DY0"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-J60HJ54DY0');</script>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<meta name="robots" content="${robots}"/>
<link rel="canonical" href="${url}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:type" content="website"/>
<meta property="og:url" content="${url}"/>
<meta property="og:site_name" content="Student Toolkit"/>
<meta property="og:locale" content="en_IN"/>
<meta property="og:image" content="${SITE}/og-image.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:site" content="@StudentToolkitIN"/>
<meta name="theme-color" content="#09090b"/>
<link rel="icon" href="/logo-icon.png"/>
${schema.map(ld).join('\n')}
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="/study-abroad/sa.css?v=${V}"/>
<style>
.dir-res{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
.dc{display:block;background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:13px 14px;text-decoration:none;color:var(--ink2);transition:border-color .15s}
.dc:hover{border-color:var(--accent);color:var(--ink2)}.dc b{display:block;color:var(--ink);font-size:15px;line-height:1.3;margin-bottom:3px}
.dc small{display:block;font-size:12.5px;color:var(--ink3)}.dc .pill{margin-top:6px}
.banner{background:var(--ybg);border:1px solid rgba(250,204,21,.3);border-radius:12px;padding:12px 16px;font-size:14px;color:var(--ink2);margin:14px 0}
.banner b{color:var(--gold)}
.statelist{columns:3 200px;font-size:14px}.statelist a{display:block;padding:3px 0;text-decoration:none}
</style>
</head>
<body>
<nav class="top" aria-label="Main">
  <a href="/" class="nav-logo">Student<span>Toolkit</span></a>
  <div class="nav-links"><a href="/tools/">Tools</a><a href="/colleges/directory/">College Directory</a><a href="/study-abroad/">Study Abroad</a><a href="/blog/">Blog</a><a href="/tools/college-predictor.html" class="nav-cta">College Predictor →</a></div>
</nav>
<main><div class="wrap">
  <div class="crumbs">${crumbs}</div>
${body}
</div></main>
<footer class="site">
  <div class="flinks"><a href="/colleges/directory/">Grand College Directory</a><a href="/colleges/">BBA &amp; MBA college reviews</a><a href="/tools/college-predictor.html">College Predictor</a><a href="/blog/how-to-check-college-is-genuine.html">Is your college genuine?</a><a href="/blog/what-to-do-after-12th.html">What to do after 12th</a></div>
  <div class="flinks"><a href="/tools/">All Tools</a><a href="/study-abroad/">Study Abroad</a><a href="/blog/">Blog</a><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/editorial-policy.html">Editorial Policy</a><a href="/privacy.html">Privacy</a></div>
  <p>© 2026 Student Toolkit · Facts are compiled from official and public sources; fees, cutoffs and rules change every year — always confirm on the institution’s official website.</p>
</footer>
</body></html>
`;
}

// ═══════════ HUB ═══════════
let AI = null; // all-India AISHE section, built in WRITE below
const fmtN = n => n.toLocaleString('en-IN');
function hub() {
  const url = `${SITE}/colleges/directory/`;
  const title = AI ? `Indian College Directory: All ${fmtN(AI.total)} Institutions` : `Indian College Directory 2027: Search ${C.length}+ Colleges`;
  const desc = AI ? `Search all ${fmtN(AI.total)} Indian universities, colleges and institutes by state and district (official AISHE data), plus detailed profiles of IITs, NITs, IIMs, AIIMS and NLUs.` : `Search ${C.length}+ Indian colleges — IITs, NITs, IIMs, AIIMS, NLUs, central universities and top private colleges — by state, stream and exam, with honest guidance.`;
  const faqs = [
    ['What is the Grand College Directory?', `A free, searchable directory of Indian colleges and universities — currently ${C.length}+ institutions including all IITs, NITs, IIMs, operational AIIMS, NLUs and central universities, plus leading state, private and autonomous colleges. Each profile shows the type of institution, recognition, entrance exams, courses and how to verify fees and placements.`],
    ['Will every college in India be listed?', AI ? `Yes. The directory lists all ${fmtN(AI.total)} institutions in the official AISHE directory of the Ministry of Education — ${fmtN(AI.counts.u)} universities, ${fmtN(AI.counts.c)} colleges and ${fmtN(AI.counts.s)} standalone institutions — searchable by name, state and district. Detailed profiles are being added in batches, starting with the most-searched institutions.` : 'That is the goal. India has more than 45,000 colleges and over 1,100 universities. We are adding institutions in batches using official data, starting with the most-searched institutions.'],
    ['Where does the data come from?', 'Institution facts (location, type, year of establishment, recognition) come from official and public sources such as the institutions’ own websites and government lists. Fees, cutoffs and placements change every year, so profiles point you to the official fee page and the institution’s NIRF data instead of printing numbers that go out of date.'],
    ['Are these profiles reviews?', 'Profiles give type-level strengths and weaknesses (for example, what is common to IITs or NLUs). In-depth, college-specific reviews are marked with a “Full review” link. Profiles are reviewed by our editors before they are shown in search engines.'],
    ['How do I check if a college is genuine?', 'Check the university on UGC’s lists, the course on its regulator’s approved list (AICTE, NMC, BCI and others), and the NAAC grade on the NAAC website. Our 21-point checklist walks you through it.']
  ];
  const groupCounts = GROUPS.map(([id, name, types]) => [id, name, C.filter(c => types.includes(c.type)).length]);
  const cards = C.slice().sort((a, b) => a.n.localeCompare(b.n)).map(c => `<a class="dc" href="/colleges/directory/${c.s}.html" data-n="${esc((c.n + ' ' + c.alias + ' ' + c.city).toLowerCase())}" data-st="${esc(c.state)}" data-g="${groupOf(c.type)}" data-sm="${c.streams.join(' ')}"><b>${esc(c.n)}</b><small>${esc(c.city)}, ${esc(c.state)}${c.est ? ' · Est. ' + c.est : ''}</small><span class="pill">${esc(typeName(c.type).replace(/ \(.*\)/, ''))}</span>${c.review ? '<span class="pill g">Full review</span>' : ''}</a>`).join('\n');
  const schema = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Grand College Directory — Indian colleges and universities', url, description: desc, inLanguage: 'en-IN', dateModified: UPD, isPartOf: { '@type': 'WebSite', name: 'Student Toolkit', url: SITE + '/' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Colleges', item: SITE + '/colleges/' }, { '@type': 'ListItem', position: 3, name: 'Directory', item: url }] }
  ];
  const body = `
  <header class="hero">
    <div class="badge">🏛 ${AI ? fmtN(AI.total) + ' institutions (AISHE)' : C.length + '+ institutions'} · ${AI ? AI.states : STATES.length} states & UTs · Updated ${UPD_H}</div>
    <h1>The Grand <span>College Directory</span></h1>
    <p class="lead">Search Indian colleges and universities by name, city, state, stream or type. Every profile tells you how admission works, what the institution is recognised as, and how to verify fees and placements — honestly.</p>
  </header>
  <div class="card" style="margin-bottom:14px">
    <div class="row">
      <div class="field"><label for="dq">Search</label><input id="dq" type="search" placeholder="e.g. IIT, NIT Trichy, SRCC, Pune, law…" autocomplete="off"></div>
      <div class="field"><label for="dst">State / UT</label><select id="dst"><option value="">All states</option>${STATES.map(s => `<option>${esc(s)}</option>`).join('')}</select></div>
      <div class="field"><label for="dg">Type</label><select id="dg"><option value="">All types</option>${groupCounts.map(([id, n, k]) => `<option value="${id}">${esc(n)} (${k})</option>`).join('')}</select></div>
      <div class="field"><label for="dsm">Stream</label><select id="dsm"><option value="">All streams</option>${Object.entries(D.STREAMS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></div>
    </div>
    <p class="meta-line" id="dcount" aria-live="polite">${C.length} institutions</p>
  </div>
  <div class="dir-res" id="dres">
${cards}
  </div>
  <p class="note" id="dnone" style="display:none">No institution matches. We are adding colleges every week — <a href="/contact.html">request your college</a>.</p>

  ${AI ? AI.hubSection : ''}
  <section aria-labelledby="bt"><h2 id="bt">Browse detailed profiles by type</h2><div class="grid g3">${groupCounts.map(([id, n, k]) => `<a class="card" href="#" data-group="${id}" style="text-decoration:none"><b style="color:var(--ink)">${esc(n)}</b><p style="margin:4px 0 0">${k} institutions</p></a>`).join('')}</div></section>
  <section aria-labelledby="bs"><h2 id="bs">Detailed profiles by state</h2><div class="statelist">${STATES.map(s => `<a href="#" data-state="${esc(s)}">${esc(s)} (${C.filter(c => c.state === s).length})</a>`).join('')}</div></section>

  <section aria-labelledby="how"><h2 id="how">How this directory works</h2>
  <div class="grid g2">
    <div class="card"><h3>Facts that don’t go out of date</h3><p>Each profile lists stable facts — location, type, recognition, year established, streams and the entrance exams used for admission — and links to the official website.</p></div>
    <div class="card"><h3>No made-up numbers</h3><p>Fees, cutoffs and placements change every year. Instead of printing stale figures, every profile tells you exactly where to find the official fee page and the institution’s NIRF data (median salary, students placed).</p></div>
    <div class="card"><h3>Honest strengths and weaknesses</h3><p>Profiles explain what’s generally true for that kind of institution. Colleges with a <span class="pill g">Full review</span> badge have in-depth, sourced reviews written by our editors.</p></div>
    <div class="card"><h3>Every college, from official data</h3><p>${AI ? `All ${fmtN(AI.total)} institutions in the Ministry of Education’s AISHE directory are listed by state and district, and detailed profiles are added in batches.` : 'India has 45,000+ colleges. We add institutions in batches from official sources.'} <a href="/contact.html">Request your college</a> or <a href="/contact.html">send a correction</a> with a source.</p></div>
  </div></section>

  <section aria-labelledby="faq"><h2 id="faq">FAQs</h2>${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
  <section><div class="answer"><p><strong>Before you pay any fee:</strong> run our <a href="/blog/how-to-check-college-is-genuine.html">21-point college check</a>, see which colleges your score can get with the <a href="/tools/college-predictor.html">College Predictor</a>, and read in-depth <a href="/colleges/">BBA &amp; MBA college reviews</a>.</p></div></section>
<script>
(function(){
  var q=document.getElementById('dq'),st=document.getElementById('dst'),g=document.getElementById('dg'),sm=document.getElementById('dsm'),cards=[].slice.call(document.querySelectorAll('#dres .dc')),cnt=document.getElementById('dcount'),none=document.getElementById('dnone');
  function apply(){var w=q.value.toLowerCase().trim().split(/\\s+/).filter(Boolean),n=0;
    cards.forEach(function(c){var ok=(!st.value||c.dataset.st===st.value)&&(!g.value||c.dataset.g===g.value)&&(!sm.value||(' '+c.dataset.sm+' ').indexOf(' '+sm.value+' ')>-1)&&w.every(function(x){return c.dataset.n.indexOf(x)>-1;});c.hidden=!ok;if(ok)n++;});
    cnt.textContent=n+' of '+cards.length+' institutions';none.style.display=n?'none':'block';
    var p=new URLSearchParams();if(q.value)p.set('q',q.value);if(st.value)p.set('state',st.value);if(g.value)p.set('type',g.value);if(sm.value)p.set('stream',sm.value);history.replaceState(null,'',p.toString()?'?'+p:location.pathname);}
  [q,st,g,sm].forEach(function(el){el.addEventListener('input',apply);el.addEventListener('change',apply);});
  document.querySelectorAll('[data-group]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();g.value=a.dataset.group;apply();q.scrollIntoView({behavior:'smooth'});});});
  document.querySelectorAll('[data-state]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();st.value=a.dataset.state;apply();q.scrollIntoView({behavior:'smooth'});});});
  var p=new URLSearchParams(location.search);q.value=p.get('q')||'';st.value=p.get('state')||'';g.value=p.get('type')||'';sm.value=p.get('stream')||'';apply();
})();
</script>`;
  return shell({ title, desc, url, robots: 'index,follow,max-snippet:-1', schema, body, crumbs: '<a href="/">Home</a> › <a href="/colleges/">Colleges</a> › Directory' });
}

// ═══════════ PROFILE ═══════════
function profile(c) {
  const url = `${SITE}/colleges/directory/${c.s}.html`;
  const T = D.TYPES[c.type], I = INFO[c.type] || INFO.INI;
  const reviewed = REVIEWED.has(c.s);
  const title = `${c.n} — Admission & Fees`;
  const desc = `${c.n} (${c.city}, ${c.state}) — ${typeName(c.type)}. How admission works, entrance exams, courses, fee guidance and how to verify placements.`;
  const similar = C.filter(x => x.s !== c.s && x.type === c.type).sort((a, b) => (a.state === c.state ? -1 : 0) - (b.state === c.state ? -1 : 0)).slice(0, 6);
  const nearby = C.filter(x => x.s !== c.s && x.state === c.state && x.type !== c.type).slice(0, 6);
  const schema = [
    { '@context': 'https://schema.org', '@type': 'CollegeOrUniversity', name: c.n, alternateName: c.alias || undefined, foundingDate: c.est ? String(c.est) : undefined, url: c.web ? `https://${c.web}` : undefined, address: { '@type': 'PostalAddress', addressLocality: c.city, addressRegion: c.state, addressCountry: 'IN' } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'College Directory', item: SITE + '/colleges/directory/' }, { '@type': 'ListItem', position: 3, name: c.n, item: url }] }
  ];
  const link = x => `<a class="dc" href="/colleges/directory/${x.s}.html"><b>${esc(x.n)}</b><small>${esc(x.city)}, ${esc(x.state)}</small></a>`;
  const body = `
  <header class="hero" style="text-align:left;margin:0;max-width:none">
    <div class="badge">${esc(typeName(c.type))}</div>
    <h1>${esc(c.n)}</h1>
    <p class="lead" style="margin:0">${esc(c.city)}, ${esc(c.state)}${c.est ? ` · Established ${c.est}` : ''}${c.alias ? ` · Also known as ${esc(c.alias)}` : ''}</p>
  </header>
  ${reviewed ? '' : `<div class="banner"><b>Profile under editorial review.</b> This page shows verified basics and general guidance for this type of institution. College-specific fees, cutoffs and placements must be confirmed on the official website. <a href="/editorial-policy.html">Our editorial policy</a></div>`}
  ${c.review ? `<div class="answer"><p><strong>Full review available:</strong> read our in-depth, sourced review of ${esc(c.n)} — fees, placements, positives, negatives and verdict. <a href="${c.review}">Read the full review →</a></p></div>` : ''}

  <section aria-labelledby="facts"><h2 id="facts">Quick facts</h2>
  <div class="tbl-wrap"><table class="fit"><tbody>
    <tr><td><b>Type</b></td><td>${esc(typeName(c.type))}</td></tr>
    <tr><td><b>Ownership</b></td><td>${esc(T.own)}</td></tr>
    <tr><td><b>Recognition</b></td><td>${esc(T.reg)}</td></tr>
    <tr><td><b>Location</b></td><td>${esc(c.city)}, ${esc(c.state)}</td></tr>
    ${c.est ? `<tr><td><b>Established</b></td><td>${c.est}</td></tr>` : ''}
    <tr><td><b>Streams</b></td><td>${streams(c).map(s => `<span class="pill">${esc(s)}</span>`).join(' ')}</td></tr>
    <tr><td><b>Entrance exams</b></td><td>${T.exams.map(esc).join('<br>')}</td></tr>
    ${c.web ? `<tr><td><b>Official website</b></td><td><a href="https://${esc(c.web)}" rel="noopener nofollow" target="_blank">${esc(c.web)}</a></td></tr>` : ''}
  </tbody></table></div></section>

  <section aria-labelledby="adm"><h2 id="adm">How admission works</h2><p>${esc(I.adm)}</p>
  <a class="btn" href="/tools/college-predictor.html">Check your chances with the College Predictor →</a></section>

  <section aria-labelledby="fees"><h2 id="fees">Fees: what to expect</h2><p>${esc(I.fees)}</p>
  <p class="note">Fees change every year. Use the official fee notice${c.web ? ` on <a href="https://${esc(c.web)}" rel="noopener nofollow" target="_blank">${esc(c.web)}</a>` : ''}, and compare the total cost with the median salary in the institution’s <a href="https://www.nirfindia.org/" rel="noopener" target="_blank">NIRF data</a>. Education loan? Read our <a href="/blog/education-loan-for-study-abroad.html">loan guide</a> and convert salaries with the <a href="/tools/salary-calculator.html">salary calculator</a>.</p></section>

  <section aria-labelledby="pc"><h2 id="pc">Strengths and things to check</h2>
  <p class="meta-line">General points for ${esc(typeName(c.type))}s — not a college-specific review.</p>
  <div class="grid g2"><div class="card"><h3 style="color:var(--green)">Common strengths</h3><ul>${I.pros.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div><div class="card"><h3 style="color:var(--red)">Things to check</h3><ul>${I.cons.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div></div></section>

  <section aria-labelledby="verify"><h2 id="verify">Verify before you apply</h2>
  <ol>
    <li>Confirm the institution and your course on the right regulator’s list (UGC, AICTE, NMC, BCI, COA, PCI) for this year.</li>
    <li>Read the institution’s latest NIRF data file for median salary and number of students placed.</li>
    <li>Check the NAAC grade and its validity on the NAAC website (if applicable).</li>
    <li>Talk to current students and check where recent graduates work on LinkedIn.</li>
  </ol>
  <p>Full method: <a href="/blog/how-to-check-college-is-genuine.html">Is your college genuine? 21-point checklist</a>.</p></section>

  ${similar.length ? `<section aria-labelledby="sim"><h2 id="sim">Similar institutions</h2><div class="dir-res">${similar.map(link).join('')}</div></section>` : ''}
  ${nearby.length ? `<section aria-labelledby="near"><h2 id="near">Other institutions in ${esc(c.state)}</h2><div class="dir-res">${nearby.map(link).join('')}</div></section>` : ''}
  <section><p class="meta-line">Know something we should add or fix about ${esc(c.n)}? <a href="/contact.html">Send us a correction with a source</a>. Updated ${UPD_H}. <a href="/colleges/directory/">← Back to the directory</a></p></section>`;
  return shell({ title, desc, url, robots: reviewed ? 'index,follow' : 'noindex,follow', schema, body, crumbs: `<a href="/">Home</a> › <a href="/colleges/directory/">College Directory</a> › ${esc(c.n)}` });
}

// ═══════════ WRITE ═══════════
fs.mkdirSync(OUT, { recursive: true });
// remove profiles for institutions no longer in the dataset
const keep = new Set(C.map(c => c.s + '.html').concat(['index.html']));
fs.readdirSync(OUT).filter(f => f.endsWith('.html') && !keep.has(f)).forEach(f => fs.unlinkSync(path.join(OUT, f)));
AI = require('./build-aishe-pages.js')({ ROOT, OUT, SITE, UPD, UPD_H, shell, curated: C });
if (AI) console.log(`AISHE: ${AI.total} institutions → ${AI.states} state pages, ${AI.districts} district pages (${AI.indexable.length} indexable)`);
fs.writeFileSync(path.join(OUT, 'index.html'), hub());
C.forEach(c => fs.writeFileSync(path.join(OUT, c.s + '.html'), profile(c)));
console.log(`wrote colleges/directory/index.html + ${C.length} profiles (${REVIEWED.size} indexable)`);

// sitemap: hub + reviewed profiles
const sp = path.join(ROOT, 'sitemap.xml');
let xml = fs.readFileSync(sp, 'utf8');
xml = xml.replace(/\s*<url><loc>https:\/\/studenttoolkit\.online\/colleges\/directory\/[^<]*<\/loc>.*?<\/url>/g, '');
const urls = [`${SITE}/colleges/directory/`, ...C.filter(c => REVIEWED.has(c.s)).map(c => `${SITE}/colleges/directory/${c.s}.html`), ...(AI ? AI.indexable : [])];
xml = xml.replace('</urlset>', urls.map(u => `  <url><loc>${u}</loc><lastmod>${UPD}</lastmod></url>`).join('\n') + '\n</urlset>');
fs.writeFileSync(sp, xml);
console.log('sitemap: +' + urls.length + ' directory URLs');
