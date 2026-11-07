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
  const byN = (a, b) => a.n.localeCompare(b.n, 'en');
  const shortType = t => typeName(t).replace(/ \(.*\)/, '');
  const CUR = C.slice().sort(byN).map(c => [c.n, c.alias || '', c.city, c.state, shortType(c.type), c.s]);
  const schema = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Grand College Directory — Indian colleges and universities', url, description: desc, inLanguage: 'en-IN', dateModified: UPD, isPartOf: { '@type': 'WebSite', name: 'Student Toolkit', url: SITE + '/' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Colleges', item: SITE + '/colleges/' }, { '@type': 'ListItem', position: 3, name: 'Directory', item: url }] }
  ];
  const states = AI ? AI.stateSummary.slice().sort((a, b) => a[0].localeCompare(b[0], 'en')) : [];
  const totalDistricts = states.reduce((s, x) => s + x[6], 0);
  const body = `
<style>
.hub-search{background:var(--bg2);border:1px solid var(--border2);border-radius:18px;padding:18px;margin:6px 0 18px}
.hub-search .big{position:relative}.hub-search .big input{font-size:17px;padding:14px 16px 14px 44px;border-radius:12px}
.hub-search .big svg{position:absolute;left:15px;top:50%;transform:translateY(-50%);color:var(--ink3)}
.hub-search .row{margin-top:10px}
.res{margin-top:12px}.res h3{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3);font-family:'DM Sans',sans-serif;margin:14px 0 6px}
.ri{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;margin-bottom:6px;text-decoration:none;color:var(--ink2);background:var(--bg3)}
.ri:hover{border-color:var(--accent);color:var(--ink)}.ri b{color:var(--ink);font-weight:600;display:block;line-height:1.35}.ri small{font-size:12.5px;color:var(--ink3)}
.ri .pill{flex-shrink:0}
.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:0 0 8px}.stats-row div{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px 14px}.stats-row b{display:block;font-family:'Syne',sans-serif;font-size:22px;color:var(--ink)}.stats-row span{font-size:12.5px;color:var(--ink3)}
.dgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}.dgrid a{display:flex;justify-content:space-between;gap:8px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:10px 12px;text-decoration:none;color:var(--ink2);font-size:14px}.dgrid a:hover{border-color:var(--accent);color:var(--ink)}.dgrid a span{color:var(--ink3);font-variant-numeric:tabular-nums;white-space:nowrap}
details.grp{padding:0;overflow:hidden}details.grp summary{padding:14px 16px;display:flex;align-items:center;gap:10px}details.grp summary::after{margin-left:auto}details.grp .dgrid{padding:0 14px 14px}
.cnt{font:600 13px 'DM Sans',sans-serif;background:var(--abg);color:var(--a2);padding:3px 10px;border-radius:99px}
.src{font-size:12.5px;color:var(--ink3);margin-top:10px}
</style>
  <header class="hero" style="padding-bottom:14px">
    <div class="badge">🏛 Official AISHE data · Updated ${UPD_H}</div>
    <h1>The Grand <span>College Directory</span></h1>
    <p class="lead">Every university, college and institute in India — ${AI ? fmtN(AI.total) : C.length + '+'} of them — searchable by name, state and district, with detailed profiles of the institutions students ask about most.</p>
  </header>

  <section class="hub-search" aria-label="Search institutions">
    <div class="big"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><label for="q" class="sr">Search colleges</label><input id="q" type="search" placeholder="Search any college — e.g. IIT Madras, SRCC, government polytechnic Lucknow" autocomplete="off"></div>
    <div class="row">
      <div class="field" style="margin:0"><label for="st">State / UT</label><select id="st"><option value="">All of India</option>${states.map(s => `<option>${esc(s[0])}</option>`).join('')}</select></div>
      <div class="field" style="margin:0"><label for="kind">Show</label><select id="kind"><option value="">Everything</option><option value="P">Detailed profiles only</option><option value="U">Universities</option><option value="C">Colleges</option><option value="S">Standalone (polytechnic, nursing, B.Ed…)</option></select></div>
    </div>
    <div class="res" id="res" aria-live="polite"><p class="meta-line">Type at least 2 letters, or pick a state.</p></div>
  </section>

  ${AI ? `<div class="stats-row"><div><b>${fmtN(AI.total)}</b><span>institutions</span></div><div><b>${fmtN(AI.counts.u)}</b><span>universities</span></div><div><b>${fmtN(AI.counts.c)}</b><span>colleges</span></div><div><b>${fmtN(AI.counts.s)}</b><span>standalone institutions</span></div><div><b>${states.length}</b><span>states &amp; UTs</span></div><div><b>${fmtN(totalDistricts)}</b><span>districts</span></div></div>` : ''}

  ${AI ? `<section aria-labelledby="bs"><h2 id="bs">Browse by state (A–Z)</h2><div class="dgrid">${states.map(s => `<a href="/colleges/directory/${s[1]}/">${esc(s[0])}<span>${fmtN(s[2])}</span></a>`).join('')}</div></section>` : ''}

  <section aria-labelledby="bt"><h2 id="bt">Detailed profiles <span class="cnt">${C.length}</span></h2>
    <p>Admission route, entrance exams, fee guidance and honest strengths for the institutions students search most — grouped by type and sorted A–Z.</p>
    ${GROUPS.map(([id, name, types], i) => { const list = C.filter(c => types.includes(c.type)).sort(byN); return list.length ? `<details class="grp"${i < 1 ? ' open' : ''}><summary>${esc(name)} <span class="cnt">${list.length}</span></summary><div class="dgrid">${list.map(c => `<a href="/colleges/directory/${c.s}.html">${esc(c.n)}<span>${esc(c.city)}</span></a>`).join('')}</div></details>` : ''; }).join('')}
  </section>

  <section aria-labelledby="how"><h2 id="how">How this directory works</h2>
  <div class="grid g2">
    <div class="card"><h3>Every institution, from official data</h3><p>${AI ? `All ${fmtN(AI.total)} institutions in the Ministry of Education’s AISHE directory, organised into state and district pages and sorted A–Z.` : 'Institutions are added in batches from official sources.'}</p></div>
    <div class="card"><h3>Detailed profiles</h3><p>For ${C.length} leading institutions: type, recognition, entrance exams, admission route and fee guidance. A <span class="pill g">Full review</span> badge marks colleges with in-depth reviews.</p></div>
    <div class="card"><h3>No made-up numbers</h3><p>Fees, cutoffs and placements change every year, so we point you to the official fee page and the institution’s NIRF data instead of printing stale figures.</p></div>
    <div class="card"><h3>Corrections welcome</h3><p>Spotted something wrong? <a href="/contact.html">Send a correction with a source</a> or <a href="/contact.html">request a detailed profile</a>.</p></div>
  </div></section>

  <section aria-labelledby="faq"><h2 id="faq">FAQs</h2>${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
  <section><div class="answer"><p><strong>Before you pay any fee:</strong> run our <a href="/blog/how-to-check-college-is-genuine.html">21-point college check</a>, see which colleges your score can get with the <a href="/tools/college-predictor.html">College Predictor</a>, and read in-depth <a href="/colleges/">BBA &amp; MBA college reviews</a>.</p></div>
  ${AI ? `<p class="src">${AI.SRC}</p>` : ''}</section>
<script>
(function(){
  var CUR=${JSON.stringify(CUR).replace(/</g, '\\u003c')};
  var STATES=${JSON.stringify(states.map(s => [s[0], s[1], s[2]])).replace(/</g, '\\u003c')};
  var q=document.getElementById('q'),st=document.getElementById('st'),kind=document.getElementById('kind'),res=document.getElementById('res');
  var idx=null,loading=false,t,K=['University','College','Standalone'];
  function esc(s){return String(s).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];});}
  function rank(name,raw){var n=name.toLowerCase();return n.indexOf(raw)===0?0:(' '+n).indexOf(' '+raw)>-1?1:2;}
  function item(href,name,meta,pill,green){return '<a class="ri" href="'+href+'"><span><b>'+esc(name)+'</b><small>'+esc(meta)+'</small></span><span class="pill'+(green?' g':'')+'">'+esc(pill)+'</span></a>';}
  function load(){if(loading)return;loading=true;fetch('/colleges/directory/search-index.json?v=${AI ? AI.VER : ''}').then(function(r){return r.json();}).then(function(j){idx=j;idx.rows.forEach(function(r){r[6]=(r[0]+' '+(r[5]||'')).toLowerCase();});run();}).catch(function(){loading=false;res.innerHTML='<p class="note">Could not load the national list. Please try again.</p>';});}
  function run(){
    var raw=q.value.trim().toLowerCase(),w=raw.split(/\\s+/).filter(Boolean),sv=st.value,k=kind.value,html='';
    var p=new URLSearchParams();if(q.value)p.set('q',q.value);if(sv)p.set('state',sv);if(k)p.set('kind',k);history.replaceState(null,'',p.toString()?'?'+p:location.pathname);
    if(raw.length<2){
      if(sv){var s=STATES.find(function(x){return x[0]===sv;});res.innerHTML=s?item('/colleges/directory/'+s[1]+'/','Browse all '+s[2].toLocaleString('en-IN')+' institutions in '+s[0],'District-by-district lists, sorted A–Z','Open',true):'';}
      else res.innerHTML='<p class="meta-line">Type at least 2 letters, or pick a state.</p>';
      return;}
    var shown={};
    if(k===''||k==='P'){
      var pr=CUR.filter(function(c){var h=(c[0]+' '+c[1]+' '+c[2]).toLowerCase();return (!sv||c[3]===sv)&&w.every(function(x){return h.indexOf(x)>-1;});});
      pr.sort(function(a,b){return rank(a[0],raw)-rank(b[0],raw)||a[0].localeCompare(b[0]);});
      if(pr.length){html+='<h3>Detailed profiles ('+pr.length+')</h3>'+pr.slice(0,8).map(function(c){shown[c[5]]=1;return item('/colleges/directory/'+c[5]+'.html',c[0],c[2]+', '+c[3]+' · '+c[4],'Profile',true);}).join('');}
    }
    if(k!=='P'){
      if(raw.length<3){html+='<p class="meta-line" style="margin-top:8px">Type one more letter to search all ${AI ? fmtN(AI.total) : ''} institutions.</p>';}
      else if(!idx){load();html+='<p class="meta-line" style="margin-top:8px">Loading the national list…</p>';}
      else{
        var b=[[],[],[]],total=0,ki=k?'UCS'.indexOf(k):-1;
        for(var i=0;i<idx.rows.length;i++){var r=idx.rows[i];if(ki>-1&&r[1]!==ki)continue;var d=idx.districts[r[2]],s=idx.states[d[0]];if(sv&&s[0]!==sv)continue;if(r[4]&&shown[r[4]])continue;var hay=r[6]+' '+d[1].toLowerCase();if(!w.every(function(x){return hay.indexOf(x)>-1;}))continue;total++;var g=rank(r[0],raw);if(b[g].length<40)b[g].push(r);}
        var list=b[0].concat(b[1],b[2]).slice(0,40);
        if(!total&&html){}else html+='<h3>All institutions ('+total.toLocaleString('en-IN')+')</h3>'+(list.length?list.map(function(r){var d=idx.districts[r[2]],s=idx.states[d[0]];var href=r[4]?'/colleges/directory/'+r[4]+'.html':'/colleges/directory/'+s[1]+'/'+d[2]+'.html#'+r[3];return item(href,r[0],d[1]+', '+s[0],r[4]?'Profile':K[r[1]],!!r[4]);}).join('')+(total>40?'<p class="meta-line">Showing the 40 closest matches — add a word or pick a state to narrow down.</p>':''):'<p class="note">No institution found. Try fewer words, or browse by state below.</p>');
      }
    }
    res.innerHTML=html||'<p class="note">No detailed profile matches. Choose “Everything” to search all institutions.</p>';
  }
  q.addEventListener('input',function(){clearTimeout(t);t=setTimeout(run,160);});
  st.addEventListener('change',run);kind.addEventListener('change',run);
  var p=new URLSearchParams(location.search);q.value=p.get('q')||'';st.value=p.get('state')||'';kind.value=p.get('kind')||'';if(q.value||st.value)run();
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
  const similar = C.filter(x => x.s !== c.s && x.type === c.type).sort((a, b) => ((b.state === c.state) - (a.state === c.state)) || a.n.localeCompare(b.n, 'en')).slice(0, 6);
  const nearby = C.filter(x => x.s !== c.s && x.state === c.state && x.type !== c.type).sort((a, b) => a.n.localeCompare(b.n, 'en')).slice(0, 6);
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
