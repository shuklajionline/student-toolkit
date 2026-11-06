#!/usr/bin/env node
/* Builds the Study Abroad Finder + country guides from study-abroad/data.js.
 *   node scripts/build-study-abroad.js
 * Outputs:
 *   tools/study-abroad-finder.html        (interactive hub, fully crawlable)
 *   study-abroad/index.html               (country guide directory)
 *   study-abroad/<page>.html              (one guide per country)
 *   sitemap.xml                           (study-abroad URLs refreshed)
 * No dependencies, no API calls.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const D = require(path.join(ROOT, 'study-abroad', 'data.js'));
const SITE = 'https://studenttoolkit.online';
const YEAR = 2027; // intake year students are planning for
const REVIEWED = D.REVIEWED;
const REVIEWED_H = new Date(REVIEWED).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const C = D.COUNTRIES;
const MAIN = C.filter(c => !c.mbbs), MBBS = C.filter(c => c.mbbs);

// ── helpers ──────────────────────────────────────────────
const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const attr = esc;
const mid = a => (a[0] + a[1]) / 2;
const inr = (amt, cur) => amt * D.FX[cur];
const lakhN = n => n >= 1e7 ? (n / 1e7).toFixed(2) + ' crore' : (n / 1e5).toFixed(1) + ' lakh';
const lakh = n => '₹' + lakhN(n);
const loc = (n, cur) => (D.SYM[cur] || cur + ' ') + Math.round(n).toLocaleString('en-US');
const yr = (c, lvl, pick) => {
  const f = pick === 'min' ? a => a[0] : pick === 'max' ? a => a[1] : mid;
  return inr(f(c.tuition[lvl]) + f(c.living) * 12 + (c.insurance.amount || 0), c.cur);
};
const range = (c, lvl) => `${lakh(yr(c, lvl, 'min'))} – ${lakh(yr(c, lvl, 'max'))}`;
const rShort = (a, b) => { const f = n => (n / 1e5).toFixed(n >= 1e7 ? 0 : 1); return `₹${f(a)}–${f(b)} lakh`; };
const flag = (c, w = 34) => `<img class="flag" src="https://flagcdn.com/w80/${c.code}.png" alt="${attr(c.name)} flag" width="${w}" height="${Math.round(w * .7)}" loading="lazy" decoding="async">`;
const prWord = l => ['', 'Limited', 'Possible', 'Moderate', 'Strong'][l];
const pswShort = c => c.psw.months ? (c.psw.months % 12 === 0 ? c.psw.months / 12 + (c.psw.months === 12 ? ' year' : ' years') : c.psw.months + ' months') : 'None';
const fields = c => c.strong.map(f => D.FIELDS[f]).join(', ');
const jsonld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const write = (rel, html) => { const p = path.join(ROOT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, html); console.log('wrote', rel, (html.length / 1024).toFixed(0) + ' KB'); };

// ── shared chrome ────────────────────────────────────────
function head({ title, desc, url, keywords, schema = [], type = 'website', extra = '' }) {
  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-J60HJ54DY0"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-J60HJ54DY0');</script>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${esc(title)}</title>
<meta name="description" content="${attr(desc)}"/>
${keywords ? `<meta name="keywords" content="${attr(keywords)}"/>\n` : ''}<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"/>
<link rel="canonical" href="${url}"/>
<link rel="alternate" hreflang="en-IN" href="${url}"/>
<link rel="alternate" hreflang="x-default" href="${url}"/>
<meta property="og:title" content="${attr(title)}"/>
<meta property="og:description" content="${attr(desc)}"/>
<meta property="og:type" content="${type}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:site_name" content="Student Toolkit"/>
<meta property="og:locale" content="en_IN"/>
<meta property="og:image" content="${SITE}/og-image.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:site" content="@StudentToolkitIN"/>
<meta name="twitter:title" content="${attr(title)}"/>
<meta name="twitter:description" content="${attr(desc)}"/>
<meta name="twitter:image" content="${SITE}/og-image.png"/>
<meta name="theme-color" content="#09090b"/>
<link rel="icon" href="/logo-icon.png"/>
<link rel="manifest" href="/manifest.json"/>
${schema.map(jsonld).join('\n')}
<!-- Meta Pixel -->
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1248976636881567');fbq('track','PageView');</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1248976636881567&ev=PageView&noscript=1" alt=""/></noscript>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="/study-abroad/sa.css?v=${REVIEWED.replace(/-/g, '')}"/>
${extra}</head>
<body>
<nav class="top" aria-label="Main">
  <a href="/" class="nav-logo">Student<span>Toolkit</span></a>
  <div class="nav-links">
    <a href="/tools/">Tools</a>
    <a href="/study-abroad/">Country Guides</a>
    <a href="/colleges/">Colleges</a>
    <a href="/blog/">Blog</a>
    <a href="/tools/study-abroad-finder.html" class="nav-cta">Study Abroad Finder</a>
  </div>
</nav>`;
}
const footer = `
<footer class="site">
  <div class="flinks"><strong style="color:var(--ink2)">Study abroad guides:</strong>${MAIN.slice(0, 12).map(c => `<a href="/study-abroad/${c.page}">${esc(c.short)}</a>`).join('')}<a href="/study-abroad/">All countries →</a></div>
  <div class="flinks"><a href="/tools/">All Tools</a><a href="/tools/salary-calculator.html">Salary Calculator</a><a href="/tools/cgpa.html">CGPA Calculator</a><a href="/tools/college-predictor.html">College Predictor</a><a href="/tools/letter-writer.html">SOP &amp; Letter Writer</a><a href="/colleges/">Colleges</a><a href="/blog/">Blog</a></div>
  <div class="flinks"><a href="/blog/education-loan-for-study-abroad.html">Education loan guide</a><a href="/blog/what-to-do-after-12th.html">After 12th guide</a><a href="/blog/how-to-check-college-is-genuine.html">Check a college</a></div>
  <div class="flinks"><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/editorial-policy.html">Editorial Policy</a><a href="/privacy.html">Privacy</a></div>
  <p style="margin:8px 0 0">© ${new Date(REVIEWED).getFullYear()} Student Toolkit · Free tools for Indian students · Figures are estimates — always confirm with the official source before you pay or apply.</p>
</footer>`;
const breadcrumbLd = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })) });
const faqLd = qa => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) });
const faqHtml = qa => qa.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join('\n');

// ── Derived rankings (used in hub copy and FAQ) ─────────
const byCost = [...MAIN].sort((a, b) => yr(a, 'pg', 'min') - yr(b, 'pg', 'min'));
const cheapest = byCost.slice(0, 6);
const byPsw = [...MAIN].filter(c => c.psw.months >= 24).sort((a, b) => b.psw.months - a.psw.months);
const noIelts = MAIN.filter(c => c.english.waiver);
const prStrong = MAIN.filter(c => c.pr.level >= 4);

// ═══════════════════════════════════════════════════════
//  HUB: /tools/study-abroad-finder.html
// ═══════════════════════════════════════════════════════
function hub() {
  const url = `${SITE}/tools/study-abroad-finder.html`;
  const title = `Study Abroad Finder ${YEAR}: Compare Countries & Costs in ₹`;
  const desc = `Free tool for Indian students: match ${C.length} countries to your budget, see total cost in ₹, visa rules, post-study work, PR, IELTS waivers, scholarships & loan EMI.`;
  const faqs = [
    [`Which is the cheapest country to study abroad for Indian students?`, `Counting tuition, living costs and insurance, the cheapest options for a master’s are ${cheapest.slice(0, 4).map(c => `${c.name} (from about ${lakh(yr(c, 'pg', 'min'))} a year)`).join(', ')}. Germany’s public universities charge little or no tuition, but you must show ${loc(BYS('germany').funds.amount, 'EUR')} in a blocked account for living costs.`],
    [`How much does it cost to study abroad from India in total?`, `A 1–2 year master’s typically costs ₹8–25 lakh in low-tuition Europe (Germany, Italy, France, Poland, Austria), ₹25–50 lakh in the UK, Ireland, Canada or Australia, and ₹40–90 lakh+ in the USA, including living costs. Use the cost calculator above to get a figure for your exact course, city and scholarship.`],
    [`Which countries give the longest post-study work visa?`, `${byPsw.slice(0, 6).map(c => `${c.name} (${pswShort(c)})`).join(', ')}. From 1 January ${YEAR} the UK Graduate Route drops from 2 years to 18 months for new applications.`],
    [`Can I study abroad without IELTS?`, `Yes, in many cases. Universities in ${noIelts.slice(0, 8).map(c => c.short).join(', ')} and others can waive IELTS if your Class 12 English marks are high or you studied in English (MOI letter). Others accept Duolingo, PTE or TOEFL instead. Visa rules can still require a test (Australia, for example), so check each university and visa page.`],
    [`Which country is best for PR after studying?`, `${prStrong.map(c => c.name).join(' and ')} currently offer the clearest study-to-permanent-residence routes for Indian students, followed by Australia, New Zealand and Ireland. Rules tightened in 2024–2026 everywhere, so PR is never guaranteed.`],
    [`Can I work part-time while studying abroad?`, `Most countries allow about 20 hours a week during term: UK 20, USA 20 (on-campus), Canada 24, Australia 48 per fortnight, New Zealand 25, Germany 140 full days a year, France 964 hours a year, Spain 30 hours a week. Part-time income helps with living costs but rarely covers tuition.`],
    [`How much money do I need to show for a student visa?`, `Examples for ${YEAR} intakes: Germany ${loc(BYS('germany').funds.amount, 'EUR')} per year in a blocked account; Canada C$23,448 plus tuition; Australia A$29,710 plus tuition and travel; UK £1,483/month in London or £1,136/month elsewhere (up to 9 months) plus fees; Ireland €10,000 plus fees. Education loan sanction letters are accepted as proof in most countries.`],
    [`Is MBBS abroad valid in India?`, `Only if the course meets the National Medical Commission’s Foreign Medical Graduate Licentiate rules: at least 54 months of study in English, a 12-month internship at the same institution, and eligibility for a medical licence in that country. You must have qualified NEET-UG, and you must pass the screening/licensing exam (FMGE/NExT) back in India.`],
    [`Is this data accurate?`, `Every country is compiled from official visa and government pages (linked on each guide) and reviewed on ${REVIEWED_H}. Where official sources disagree or rules are changing, we say so. Rupee figures use approximate exchange rates that you can edit in the calculator. Always confirm on the official page before paying any fee.`],
    [`Do I need a consultant to study abroad?`, `No. Every step — university applications, scholarships, visa, blocked account, loans — can be done yourself using the official links on each country guide. If you do use an agent, check what commission they earn from universities and never pay for “guaranteed” admission or visas.`]
  ];
  function BYS(s) { return C.find(c => c.slug === s); }

  const cards = C.map(c => `
<article class="cc" data-slug="${c.slug}">
  <div class="cc-h">${flag(c)}<div><h3><a href="/study-abroad/${c.page}">${esc(c.mbbs ? c.short : c.name)}</a></h3><small>${esc(c.region)}${c.mbbs ? ' · Medicine' : ''}</small></div></div>
  <p>${esc(c.tagline)}</p>
  <div class="kv">
    <span>Master’s / yr</span><b>${c.mbbs ? range(c, 'ug') : range(c, 'pg')}</b>
    <span>Work after study</span><b>${pswShort(c)}</b>
    <span>Part-time</span><b>${c.work.hours ? (c.work.hours >= 40 ? 'No weekly cap' : c.work.hours + ' hrs/wk') : 'Very limited'}</b>
    <span>IELTS</span><b>${c.english.ielts[0] ? c.english.ielts[0] + '–' + c.english.ielts[1] + (c.english.waiver ? ' · waivers' : '') : 'NEET instead'}</b>
  </div>
  <div class="cc-a"><a class="btn sm" href="/study-abroad/${c.page}">Full guide</a><button class="btn sm ghost" data-calc="${c.slug}">Cost in ₹</button><button class="btn sm ghost" data-cmp="${c.slug}" aria-pressed="false">Compare</button><button class="btn sm ghost star" data-star="${c.slug}" aria-pressed="false">☆ Save</button></div>
</article>`).join('');

  const table = `<div class="tbl-wrap"><table>
<caption class="sr">Study abroad comparison for Indian students, ${YEAR}</caption>
<thead><tr><th>Country</th><th>Master’s cost / year (₹)</th><th>Bachelor’s cost / year (₹)</th><th>Post-study work</th><th>Part-time work</th><th>Visa fee</th><th>IELTS</th><th>PR outlook</th></tr></thead><tbody>
${MAIN.map(c => `<tr><td><a href="/study-abroad/${c.page}">${esc(c.name)}</a></td><td class="num">${range(c, 'pg')}</td><td class="num">${range(c, 'ug')}</td><td>${pswShort(c)}</td><td>${c.work.hours >= 40 ? 'No cap' : c.work.hours + ' hrs/wk'}</td><td>${c.visa.fee ? loc(c.visa.fee, c.cur) : 'Varies'}</td><td>${c.english.ielts[0]}–${c.english.ielts[1]}</td><td>${prWord(c.pr.level)}</td></tr>`).join('\n')}
</tbody></table></div>
<p class="meta-line" style="margin-top:8px">Cost per year = tuition + living + health insurance for one student, at approximate exchange rates (1 USD ≈ ₹${D.FX.USD}, 1 GBP ≈ ₹${D.FX.GBP}, 1 EUR ≈ ₹${D.FX.EUR}, 1 CAD ≈ ₹${D.FX.CAD}, 1 AUD ≈ ₹${D.FX.AUD}). Reviewed ${REVIEWED_H}.</p>`;

  const fieldOpts = Object.entries(D.FIELDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  const schema = [
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Study Abroad Finder for Indian Students', url, description: desc, applicationCategory: 'EducationalApplication', operatingSystem: 'Any (web browser)', inLanguage: 'en-IN', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' }, dateModified: REVIEWED, publisher: { '@type': 'Organization', name: 'Student Toolkit', url: SITE + '/', logo: SITE + '/logo-icon.png' }, featureList: ['Country matcher by budget, course and priorities', 'Total study abroad cost calculator in INR', 'Education loan EMI calculator with moratorium', 'Side-by-side country comparison', 'Application timeline planner', 'Scholarship finder', 'Visa document checklist', 'IELTS / TOEFL / PTE / Duolingo score converter'] },
    faqLd(faqs),
    breadcrumbLd([['Home', SITE + '/'], ['Tools', SITE + '/tools/'], ['Study Abroad Finder', url]]),
    { '@context': 'https://schema.org', '@type': 'ItemList', name: `Study abroad country guides for Indian students ${YEAR}`, itemListElement: C.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: guideTitle(c), url: `${SITE}/study-abroad/${c.page}` })) }
  ];

  return head({ title, desc, url, schema, keywords: 'study abroad finder, study abroad for indian students, cheapest country to study abroad for indian students, study abroad cost calculator in rupees, best country to study abroad, study abroad without ielts, post study work visa by country, education loan emi calculator study abroad, compare countries for masters abroad' }) + `
<main>
<div class="wrap">
  <div class="crumbs"><a href="/">Home</a> › <a href="/tools/">Tools</a> › Study Abroad Finder</div>
  <header class="hero">
    <div class="badge">🌍 Free · No sign-up · Built for Indian students · Reviewed ${REVIEWED_H}</div>
    <h1>Study Abroad Finder ${YEAR}: <span>Which Country Fits You?</span></h1>
    <p class="lead">Match ${C.length} destinations to your budget, course and goals. See the real cost in rupees, visa and proof-of-funds rules, part-time and post-study work rights, PR routes, IELTS waivers and scholarships — then plan your loan and deadlines.</p>
    <div class="stats"><span class="stat"><b>${MAIN.length}</b> study destinations</span><span class="stat"><b>${MBBS.length}</b> MBBS destinations</span><span class="stat"><b>₹</b> costs in rupees</span><span class="stat"><b>0</b> sign-ups or API calls</span></div>
  </header>

  <div class="answer"><p><strong>Quick answer:</strong> For the lowest total cost, look at ${cheapest.slice(0, 4).map(c => `<a href="/study-abroad/${c.page}">${esc(c.short)}</a>`).join(', ')} (public universities with low tuition). For the longest work rights after graduation, look at ${byPsw.slice(0, 4).map(c => `<a href="/study-abroad/${c.page}">${esc(c.short)}</a>`).join(', ')}. For a permanent-residence route, ${prStrong.map(c => `<a href="/study-abroad/${c.page}">${esc(c.short)}</a>`).join(' and ')} are the clearest today. Use the finder below to rank countries for <em>your</em> budget and course.</p></div>
</div>

<section id="tool" aria-label="Study abroad tools"><div class="wrap">
  <div class="tabs" role="tablist">
    <button class="tab" role="tab" data-tab="match" aria-selected="true">🎯 Find my country</button>
    <button class="tab" role="tab" data-tab="calc" aria-selected="false">₹ Cost &amp; loan</button>
    <button class="tab" role="tab" data-tab="compare" aria-selected="false">⚖️ Compare</button>
    <button class="tab" role="tab" data-tab="plan" aria-selected="false">🗓 Timeline</button>
    <button class="tab" role="tab" data-tab="schol" aria-selected="false">🎓 Scholarships</button>
    <button class="tab" role="tab" data-tab="docs" aria-selected="false">✅ Documents</button>
  </div>

  <div class="panel on card" id="p-match" role="tabpanel">
    <h2 style="font-size:22px">Find the best country for you</h2>
    <form id="matchForm">
      <div class="row">
        <div class="field"><label for="mLevel">I want to study</label><select id="mLevel"><option value="pg">Master’s / MS / MBA</option><option value="ug">Bachelor’s (after Class 12)</option><option value="mbbs">MBBS / Medicine</option></select></div>
        <div class="field"><label for="mField">Course / field</label><select id="mField"><option value="">Any field</option>${fieldOpts}</select></div>
        <div class="field"><label for="mIelts">English test</label><select id="mIelts"><option value="">Not decided</option><option value="none">No IELTS — want a waiver</option><option value="5.5">IELTS 5.5</option><option value="6">IELTS 6.0</option><option value="6.5">IELTS 6.5</option><option value="7">IELTS 7.0+</option></select></div>
      </div>
      <div class="field"><label for="mBudget">Budget per year (tuition + living): <span id="mBudgetOut" style="color:var(--a2)">₹25 lakh</span></label><input type="range" id="mBudget" min="3" max="80" step="1" value="25"></div>
      <div class="field"><label>What matters most? (pick any)</label><div class="chips">
        <label class="chip"><input type="checkbox" name="pri" value="cost"> Lowest cost</label>
        <label class="chip"><input type="checkbox" name="pri" value="psw" checked> Work visa after study</label>
        <label class="chip"><input type="checkbox" name="pri" value="pr"> PR / settle abroad</label>
        <label class="chip"><input type="checkbox" name="pri" value="work"> Part-time job while studying</label>
        <label class="chip"><input type="checkbox" name="pri" value="english"> English-speaking country</label>
        <label class="chip"><input type="checkbox" name="pri" value="near"> Close to India</label>
        <label class="chip"><input type="checkbox" name="pri" value="schol"> Scholarships</label>
      </div></div>
      <button class="btn" type="submit">Show my best countries →</button>
    </form>
    <div id="matchOut" class="res" style="margin-top:18px" aria-live="polite"></div>
  </div>

  <div class="panel card" id="p-calc" role="tabpanel">
    <h2 style="font-size:22px">Study abroad cost &amp; education loan calculator (₹)</h2>
    <div class="row">
      <div class="field"><label for="cCountry">Country</label><select id="cCountry" data-countries="all"></select></div>
      <div class="field"><label for="cLevel">Level</label><select id="cLevel"><option value="pg">Master’s</option><option value="ug">Bachelor’s / MBBS</option></select></div>
      <div class="field"><label for="cCity">City / university type</label><select id="cCity"><option value="budget">Budget (cheaper city, public uni)</option><option value="typical" selected>Typical</option><option value="expensive">Expensive (big city, top private uni)</option></select></div>
      <div class="field"><label for="cYears">Course length (years)</label><input id="cYears" type="number" min="0.5" max="7" step="0.5"></div>
    </div>
    <div class="row">
      <div class="field"><label for="cTuition">Tuition / year (<span class="curr"></span>)</label><input id="cTuition" type="number" min="0" step="100"></div>
      <div class="field"><label for="cLiving">Living / month (<span class="curr"></span>)</label><input id="cLiving" type="number" min="0" step="10"></div>
      <div class="field"><label for="cRate">₹ per 1 <span class="curr"></span></label><input id="cRate" type="number" min="0" step="0.01"></div>
      <div class="field"><label for="cSchol">Scholarship / year (₹ lakh)</label><input id="cSchol" type="number" min="0" step="0.5" value="0"></div>
    </div>
    <div class="row">
      <div class="field"><label for="cApps">No. of applications</label><input id="cApps" type="number" min="0" max="20" value="5"></div>
      <div class="field"><label for="cOwn">Own funds (₹ lakh)</label><input id="cOwn" type="number" min="0" step="1" value="5"></div>
      <div class="field"><label for="cInt">Loan interest (% p.a.)</label><input id="cInt" type="number" min="0" max="20" step="0.1" value="10.5"></div>
      <div class="field"><label for="cTenure">Repayment (years)</label><input id="cTenure" type="number" min="1" max="15" value="10"></div>
      <div class="field"><label for="cSalary">Expected take-home / month (<span class="curr"></span>)</label><input id="cSalary" type="number" min="0" step="100" placeholder="optional"></div>
    </div>
    <div id="calcOut" aria-live="polite"></div>
  </div>

  <div class="panel card" id="p-compare" role="tabpanel">
    <h2 style="font-size:22px">Compare countries side by side</h2>
    <div class="row" id="cmpSel">
      <div class="field"><label for="cmp1">Country 1</label><select id="cmp1" data-countries="blank"></select></div>
      <div class="field"><label for="cmp2">Country 2</label><select id="cmp2" data-countries="blank"></select></div>
      <div class="field"><label for="cmp3">Country 3</label><select id="cmp3" data-countries="blank"></select></div>
    </div>
    <div id="cmpOut"></div>
  </div>

  <div class="panel card" id="p-plan" role="tabpanel">
    <h2 style="font-size:22px">Application timeline planner</h2>
    <div class="row">
      <div class="field"><label for="tCountry">Country</label><select id="tCountry" data-countries="all"></select></div>
      <div class="field"><label for="tStart">Course starts</label><select id="tStart"></select></div>
    </div>
    <div id="tOut"></div>
  </div>

  <div class="panel card" id="p-schol" role="tabpanel">
    <h2 style="font-size:22px">Scholarships for Indian students</h2>
    <div class="row">
      <div class="field"><label for="sQ">Search</label><input id="sQ" placeholder="e.g. Germany, fully funded, DAAD"></div>
      <div class="field"><label for="sLvl">Level</label><select id="sLvl"><option value="">All levels</option><option value="UG">Bachelor’s</option><option value="PG">Master’s</option><option value="PHD">PhD</option></select></div>
    </div>
    <div id="sOut"></div>
  </div>

  <div class="panel card" id="p-docs" role="tabpanel">
    <h2 style="font-size:22px">Student visa document checklist</h2>
    <div class="field" style="max-width:320px"><label for="kCountry">Country</label><select id="kCountry" data-countries="all"></select></div>
    <div id="kOut"></div>
  </div>
</div></section>

<section aria-labelledby="all-h"><div class="wrap">
  <h2 id="all-h">All study abroad destinations</h2>
  <div class="card" style="margin-bottom:14px"><div class="row">
    <div class="field"><label for="gQ">Search country or university</label><input id="gQ" placeholder="e.g. Canada, TU Munich"></div>
    <div class="field"><label for="gRegion">Region</label><select id="gRegion"><option value="">All regions</option><option>Europe</option><option>North America</option><option>Asia</option><option>Oceania</option><option value="mbbs">MBBS abroad</option></select></div>
    <div class="field"><label for="gField">Strong in</label><select id="gField"><option value="">Any field</option>${fieldOpts}</select></div>
    <div class="field"><label for="gMax">Max cost: <span id="gMaxOut">Any</span></label><input id="gMax" type="range" min="5" max="80" value="80"></div>
  </div>
  <div class="chips"><label class="chip"><input type="checkbox" id="gEng"> English-speaking</label><label class="chip"><input type="checkbox" id="gPsw"> 2+ years post-study work</label><label class="chip"><input type="checkbox" id="gSaved"> My saved <span id="starCount"></span></label><span class="meta-line" id="gCount" style="align-self:center"></span></div></div>
  <div class="cgrid">${cards}</div>
</div></section>

<section aria-labelledby="tbl-h"><div class="wrap">
  <h2 id="tbl-h">Study abroad cost comparison for Indian students (${YEAR})</h2>
  <p>Yearly cost for one student, in rupees, for every destination — tuition, living and health insurance included. Click a country for the full guide with visa steps, universities and scholarships.</p>
  ${table}
</div></section>

<section aria-labelledby="guide-h"><div class="wrap">
  <h2 id="guide-h">How to choose a country to study abroad</h2>
  <div class="grid g2">
    <div class="card"><h3>1. Start with total cost, not tuition</h3><p>Tuition is only part of the bill. Living costs, health insurance, visa fees and flights often equal or exceed tuition — in Germany tuition can be near zero but you still need ${loc(C.find(c => c.slug === 'germany').funds.amount, 'EUR')} a year for living. Compare the yearly totals in rupees above.</p></div>
    <div class="card"><h3>2. Check work rights after graduation</h3><p>A post-study work visa is how most students repay loans and gain international experience. ${byPsw.slice(0, 5).map(c => `${c.short}: ${pswShort(c)}`).join('; ')}. Singapore and Malaysia have no dedicated post-study work visa.</p></div>
    <div class="card"><h3>3. Be honest about language</h3><p>English-taught degrees are common across Europe and Asia, but part-time and graduate jobs in Germany, France, Italy, Japan or Korea usually need the local language. Start learning (A2–B1) before you fly if you want to work there.</p></div>
    <div class="card"><h3>4. Match the country to your course</h3><p>Engineering and research → Germany, Netherlands, Sweden, Switzerland. Business and finance → UK, USA, France, Singapore, Hong Kong. Health and nursing → Canada, Australia, UK, Ireland. Design → Italy, UK, Netherlands. Use the “Strong in” filter.</p></div>
    <div class="card"><h3>5. Plan money rules from India</h3>${D.INDIA_NOTES.map(([h, t]) => `<p><strong>${esc(h)}.</strong> ${esc(t)}</p>`).join('')}<p><a href="/blog/education-loan-for-study-abroad.html">Full education loan guide: banks vs NBFCs, rates, EMI →</a></p></div>
    <div class="card"><h3>6. Avoid common traps</h3><ul><li>Never pay for “guaranteed” admission or visas.</li><li>Check the university is recognised (and NMC-compliant for MBBS).</li><li>Older blogs say Norway is free — it isn’t for non-EU students since 2023.</li><li>Rules change every year; confirm on the official links in each guide.</li></ul></div>
  </div>
</div></section>

<section aria-labelledby="cheap-h"><div class="wrap grid g2">
  <div class="card"><h2 id="cheap-h" style="font-size:21px">Cheapest countries to study abroad for Indian students</h2><ol>${cheapest.map(c => `<li><a href="/study-abroad/${c.page}">${esc(c.name)}</a> — from ${lakh(yr(c, 'pg', 'min'))}/year for a master’s</li>`).join('')}</ol></div>
  <div class="card"><h2 style="font-size:21px">Countries with the longest post-study work visas</h2><ol>${byPsw.slice(0, 8).map(c => `<li><a href="/study-abroad/${c.page}">${esc(c.name)}</a> — ${esc(pswShort(c))}</li>`).join('')}</ol></div>
  <div class="card"><h2 style="font-size:21px">Study abroad without IELTS</h2><p>Universities in these countries often accept a waiver (high Class 12 English or MOI) or an alternative test: ${noIelts.map(c => `<a href="/study-abroad/${c.page}">${esc(c.short)}</a>`).join(', ')}.</p><p class="meta-line">Waivers are decided by each university and some visas still need a test score.</p></div>
  <div class="card"><h2 style="font-size:21px">MBBS abroad for Indian students</h2><p>${MBBS.map(c => `<a href="/study-abroad/${c.page}">${esc(c.name)}</a> (${range(c, 'ug')}/yr)`).join(', ')}. Only choose programs that meet NMC’s rules: 54+ months in English, 12-month internship at the same university, licence-eligible in that country, and NEET-UG qualified.</p></div>
</div></section>

<section aria-labelledby="eng-h"><div class="wrap">
  <h2 id="eng-h">IELTS vs TOEFL vs PTE vs Duolingo score converter</h2>
  <div class="tbl-wrap"><table><thead><tr><th>IELTS</th><th>TOEFL iBT</th><th>PTE Academic</th><th>Duolingo English Test</th></tr></thead><tbody>${D.ENGLISH_TABLE.map(r => `<tr>${r.map(v => `<td class="num">${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <p class="meta-line" style="margin-top:8px">Approximate equivalences based on published test-maker concordance tables. Each university sets its own accepted scores — check the program page.</p>
</div></section>

<section aria-labelledby="faq-h"><div class="wrap" style="max-width:900px">
  <h2 id="faq-h">Study abroad FAQs for Indian students</h2>
  ${faqHtml(faqs)}
</div></section>

<section aria-labelledby="src-h"><div class="wrap" style="max-width:900px">
  <h2 id="src-h">Sources &amp; how we keep this accurate</h2>
  <p>Each country guide lists its official sources — immigration departments (GOV.UK, IRCC, Home Affairs, USCIS/State Department, German Federal Foreign Office, Immigration New Zealand, Irish Immigration Service and others) and official study portals (DAAD, Campus France, EduCanada, Study Australia). Tuition ranges come from university fee pages. Rupee amounts are estimates using editable exchange rates. Where sources disagree or rules are changing, the guide says so. Read our <a href="/editorial-policy.html">editorial policy</a>, and <a href="/contact.html">tell us</a> if you spot an outdated figure.</p>
  <p class="meta-line">Last reviewed: ${REVIEWED_H}. This tool does not provide immigration or financial advice.</p>
</div></section>
</main>

<div class="cbar" id="cbar" role="region" aria-label="Compare tray"><span style="font-size:13px;color:var(--ink3)">Compare:</span><span id="cbarList"></span><button class="btn sm" id="cbarGo">Compare now</button></div>
${footer}
<script src="/study-abroad/data.js?v=${REVIEWED.replace(/-/g, '')}" defer></script>
<script src="/study-abroad/finder.js?v=${REVIEWED.replace(/-/g, '')}" defer></script>
</body></html>`;
}

// ═══════════════════════════════════════════════════════
//  COUNTRY GUIDE: /study-abroad/<page>.html
// ═══════════════════════════════════════════════════════
function guideTitle(c) {
  return c.mbbs ? `MBBS in ${c.name} for Indian Students ${YEAR}: Fees & NMC` : `Study in ${c.short} for Indian Students ${YEAR}: Cost & Visa`;
}
function related(c) {
  const pool = C.filter(x => x.slug !== c.slug && !!x.mbbs === !!c.mbbs);
  const target = yr(c, 'pg', 'mid');
  return pool.map(x => ({ x, d: Math.abs(yr(x, 'pg', 'mid') - target) + (x.region === c.region ? 0 : 3e5) })).sort((a, b) => a.d - b.d).slice(0, 4).map(o => o.x);
}
function guide(c) {
  const url = `${SITE}/study-abroad/${c.page}`;
  const title = guideTitle(c);
  const lvl = c.mbbs ? 'ug' : 'pg';
  const [ugY, pgY] = c.years;
  const totUg = [yr(c, 'ug', 'min') * ugY, yr(c, 'ug', 'max') * ugY];
  const totPg = [yr(c, 'pg', 'min') * pgY, yr(c, 'pg', 'max') * pgY];
  const desc = c.mbbs
    ? `MBBS in ${c.name} for Indian students: ${rShort(yr(c, 'ug', 'min'), yr(c, 'ug', 'max'))}/yr, ${rShort(totUg[0], totUg[1])} for ${ugY} years. NMC rules, NEET, universities, visa & living costs.`
    : `Study in ${c.short} from India: ${rShort(yr(c, 'pg', 'min'), yr(c, 'pg', 'max'))}/yr for a master’s. Visa fee, proof of funds, part-time work, post-study visa, PR & scholarships.`;
  const tUg = c.tuition.ug, tPg = c.tuition.pg;
  const costRows = [
    [`Tuition (${c.mbbs ? 'per year' : 'bachelor’s, per year'})`, `${loc(tUg[0], c.cur)} – ${loc(tUg[1], c.cur)}`, `${lakh(inr(tUg[0], c.cur))} – ${lakh(inr(tUg[1], c.cur))}`],
    ...(c.mbbs ? [] : [['Tuition (master’s, per year)', `${loc(tPg[0], c.cur)} – ${loc(tPg[1], c.cur)}`, `${lakh(inr(tPg[0], c.cur))} – ${lakh(inr(tPg[1], c.cur))}`]]),
    ['Living costs (per month)', `${loc(c.living[0], c.cur)} – ${loc(c.living[1], c.cur)}`, `₹${Math.round(inr(c.living[0], c.cur)).toLocaleString('en-IN')} – ₹${Math.round(inr(c.living[1], c.cur)).toLocaleString('en-IN')}`],
    ['Health insurance (per year)', c.insurance.amount ? loc(c.insurance.amount, c.cur) : 'Included / public', c.insurance.amount ? '₹' + Math.round(inr(c.insurance.amount, c.cur)).toLocaleString('en-IN') : '—'],
    ['Visa fee', esc(c.visa.feeText), '—'],
    ['Flight from India (one way, approx.)', '—', `₹${c.flightInr[0].toLocaleString('en-IN')} – ₹${c.flightInr[1].toLocaleString('en-IN')}`]
  ];
  const faqs = c.mbbs ? [
    [`What is the total cost of MBBS in ${c.name} for Indian students?`, `Tuition is about ${loc(tUg[0], c.cur)}–${loc(tUg[1], c.cur)} a year and living about ${loc(c.living[0], c.cur)}–${loc(c.living[1], c.cur)} a month, so the full ${ugY}-year program costs roughly ${lakh(totUg[0])}–${lakh(totUg[1])} including living and insurance, before flights and hostel deposits.`],
    [`Is MBBS from ${c.name} valid in India?`, `Only if the specific university and program meet the NMC Foreign Medical Graduate Licentiate Regulations, 2021: at least 54 months of study, English medium, a 12-month internship at the same institution, and eligibility for a licence to practise in ${c.name}. You must then pass FMGE/NExT in India. Check the university’s compliance before paying any fee.`],
    [`Is NEET required for MBBS in ${c.name}?`, `Yes. Indian students must qualify NEET-UG to study medicine abroad and later practise in India.`],
    [`Do I need IELTS for MBBS in ${c.name}?`, esc(c.english.text)],
    [`Which are the best medical universities in ${c.name} for Indian students?`, `Well-known options include ${c.unis.slice(0, 4).map(u => u[0]).join(', ')}. Compare clinical exposure, FMGE pass rates of past Indian graduates, and NMC compliance before deciding.`]
  ] : [
    [`How much does it cost to study in ${c.short} for Indian students?`, `A master’s in ${c.short} costs about ${range(c, 'pg')} a year including tuition, living and insurance (${pgY} year${pgY > 1 ? 's' : ''} total: ${lakh(totPg[0])}–${lakh(totPg[1])}). A bachelor’s costs about ${range(c, 'ug')} a year. ${esc(c.tuition.note)}`],
    [`How much money do I need to show for a ${c.short} student visa?`, esc(c.funds.text)],
    [`Can Indian students work part-time in ${c.short}?`, esc(c.work.text)],
    [`How long can I stay in ${c.short} after graduation?`, esc(c.psw.text)],
    [`Can I get PR in ${c.short} after studying?`, `${prWord(c.pr.level)} outlook. ${esc(c.pr.text)}`],
    [`Do I need IELTS to study in ${c.short}?`, esc(c.english.text)],
    [`What are the intakes in ${c.short}?`, esc(c.intakes.join('. ')) + '.'],
    [`Which scholarships can Indian students get in ${c.short}?`, c.scholarships.map(s => `${s[0]} (${s[1]}): ${s[2]}`).join('. ') + '.']
  ];
  const rel = related(c);
  const schema = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: title, description: desc, mainEntityOfPage: url, inLanguage: 'en-IN', datePublished: REVIEWED, dateModified: REVIEWED, image: SITE + '/og-image.png', author: { '@type': 'Organization', name: 'Student Toolkit Editorial Team', url: SITE + '/about.html' }, publisher: { '@type': 'Organization', name: 'Student Toolkit', logo: { '@type': 'ImageObject', url: SITE + '/logo-icon.png' } }, about: { '@type': 'Country', name: c.name } },
    faqLd(faqs),
    breadcrumbLd([['Home', SITE + '/'], ['Study Abroad', SITE + '/study-abroad/'], [c.mbbs ? `MBBS in ${c.name}` : `Study in ${c.short}`, url]])
  ];
  const kw = c.mbbs
    ? `mbbs in ${c.name.toLowerCase()} for indian students, mbbs in ${c.name.toLowerCase()} fees, mbbs in ${c.name.toLowerCase()} total cost in rupees, nmc approved universities ${c.name.toLowerCase()}, mbbs abroad ${YEAR}`
    : `study in ${c.short.toLowerCase()} for indian students, cost of studying in ${c.short.toLowerCase()} for indian students, ${c.short.toLowerCase()} student visa ${YEAR}, masters in ${c.short.toLowerCase()} cost in rupees, ${c.short.toLowerCase()} post study work visa, scholarships in ${c.short.toLowerCase()} for indian students`;

  return head({ title, desc, url, schema, type: 'article', keywords: kw }) + `
<main><div class="wrap" style="max-width:980px">
  <div class="crumbs"><a href="/">Home</a> › <a href="/study-abroad/">Study Abroad</a> › ${esc(c.mbbs ? 'MBBS in ' + c.name : 'Study in ' + c.short)}</div>
  <header class="hero" style="text-align:left;margin:0">
    <div class="badge">${flag(c, 22)} ${esc(c.region)} · Reviewed ${REVIEWED_H}</div>
    <h1>${c.mbbs ? `MBBS in <span>${esc(c.name)}</span> for Indian Students ${YEAR}` : `Study in <span>${esc(c.short)}</span> for Indian Students ${YEAR}`}</h1>
    <p class="lead" style="margin:0 0 6px">${esc(c.tagline)}.</p>
    <p class="meta-line">By the Student Toolkit editorial team · Sources linked below · <a href="/editorial-policy.html">Editorial policy</a></p>
  </header>

  <div class="answer"><p><strong>Quick answer:</strong> ${c.mbbs
    ? `MBBS in ${esc(c.name)} costs an Indian student about <strong>${range(c, 'ug')} per year</strong> (tuition + living), or <strong>${lakh(totUg[0])}–${lakh(totUg[1])}</strong> for the full ${ugY}-year program. You need NEET-UG, and the program must meet NMC’s foreign medical graduate rules to practise in India.`
    : `Studying in ${esc(c.short)} costs an Indian student about <strong>${range(c, 'pg')} per year</strong> for a master’s and <strong>${range(c, 'ug')} per year</strong> for a bachelor’s, including living costs. You can work ${esc(c.work.hours >= 40 ? 'without a weekly cap as a full-time student' : c.work.hours + ' hours a week')} while studying and stay <strong>${esc(pswShort(c).toLowerCase())}</strong> after graduation to work.`}</p></div>

  <div class="row noprint" style="margin:14px 0 4px"><a class="btn" href="/tools/study-abroad-finder.html#tab=calc&c=${c.slug}">Calculate my exact cost in ₹ →</a><a class="btn ghost" href="/tools/study-abroad-finder.html#tab=compare&c=${[c.slug, ...rel.slice(0, 2).map(x => x.slug)].join(',')}">Compare with ${esc(rel[0].short)} &amp; ${esc(rel[1].short)}</a><a class="btn ghost" href="/tools/study-abroad-finder.html#tab=plan&c=${c.slug}">Plan my deadlines</a></div>

  <section aria-labelledby="facts"><h2 id="facts">${esc(c.short)} at a glance</h2>
  <div class="tbl-wrap"><table class="fit"><tbody>
    <tr><td><b>Cost per year (₹)</b></td><td>${c.mbbs ? range(c, 'ug') : `Master’s ${range(c, 'pg')} · Bachelor’s ${range(c, 'ug')}`}</td></tr>
    <tr><td><b>Typical course length</b></td><td>${c.mbbs ? ugY + ' years' : `Bachelor’s ${ugY} years · Master’s ${pgY} year${pgY > 1 ? 's' : ''}`}</td></tr>
    <tr><td><b>Student visa</b></td><td>${esc(c.visa.name)}</td></tr>
    <tr><td><b>Proof of funds</b></td><td>${esc(c.funds.text)}</td></tr>
    <tr><td><b>Part-time work</b></td><td>${esc(c.work.text)}</td></tr>
    <tr><td><b>Post-study work</b></td><td>${esc(c.psw.text)}</td></tr>
    <tr><td><b>PR outlook</b></td><td><span class="pill ${c.pr.level >= 4 ? 'g' : c.pr.level >= 3 ? 'b' : c.pr.level >= 2 ? 'o' : 'r'}">${prWord(c.pr.level)}</span> ${esc(c.pr.text)}</td></tr>
    <tr><td><b>English test</b></td><td>${esc(c.english.text)}</td></tr>
    <tr><td><b>Language</b></td><td>${esc(c.lang)}</td></tr>
    <tr><td><b>Intakes</b></td><td>${esc(c.intakes.join(' · '))}</td></tr>
    <tr><td><b>Strong subjects</b></td><td>${esc(fields(c))}</td></tr>
    <tr><td><b>Safety · Climate</b></td><td>${esc(c.safety)} · ${esc(c.climate)}</td></tr>
  </tbody></table></div></section>

  <section aria-labelledby="cost"><h2 id="cost">Cost of ${c.mbbs ? 'MBBS in ' + esc(c.name) : 'studying in ' + esc(c.short)} in rupees</h2>
  <div class="tbl-wrap"><table><thead><tr><th>Expense</th><th>${esc(c.cur)}</th><th>INR (approx.)</th></tr></thead><tbody>
  ${costRows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td></tr>`).join('\n  ')}
  <tr><td><b>Total, full ${c.mbbs ? 'MBBS program' : 'master’s'} (${c.mbbs ? ugY : pgY} yr${(c.mbbs ? ugY : pgY) > 1 ? 's' : ''})</b></td><td>—</td><td class="num"><b>${c.mbbs ? `${lakh(totUg[0])} – ${lakh(totUg[1])}` : `${lakh(totPg[0])} – ${lakh(totPg[1])}`}</b></td></tr>
  ${c.mbbs ? '' : `<tr><td><b>Total, full bachelor’s (${ugY} yrs)</b></td><td>—</td><td class="num"><b>${lakh(totUg[0])} – ${lakh(totUg[1])}</b></td></tr>`}
  </tbody></table></div>
  <p class="note">${esc(c.tuition.note)} ${esc(c.livingNote)} Rupee figures use 1 ${c.cur} ≈ ₹${D.FX[c.cur]}; change the rate in the <a href="/tools/study-abroad-finder.html#tab=calc&c=${c.slug}">cost calculator</a>.</p></section>

  <section aria-labelledby="unis"><h2 id="unis">${c.mbbs ? 'Medical universities' : 'Top universities'} in ${esc(c.name)} for Indian students</h2>
  <div class="tbl-wrap"><table class="fit"><thead><tr><th>University</th><th>City</th></tr></thead><tbody>${c.unis.map(u => `<tr><td>${esc(u[0])}</td><td>${esc(u[1])}</td></tr>`).join('')}</tbody></table></div>
  <p class="meta-line" style="margin-top:8px">Listed for reputation and popularity with Indian students, not as a ranking. Check each program’s fees and entry requirements on the university website.</p></section>

  ${c.mbbs ? `<section aria-labelledby="nmc"><h2 id="nmc">NMC checklist before you pay any fee</h2><div class="card"><ul class="ck">
    <li>✅ You have qualified <b>NEET-UG</b> (mandatory for MBBS abroad).</li>
    <li>✅ Course duration is at least <b>54 months</b> (4.5 years) of study.</li>
    <li>✅ Entire course is taught in <b>English</b>.</li>
    <li>✅ <b>12-month internship</b> is done at the same foreign university/hospital.</li>
    <li>✅ Graduates are eligible for a <b>licence to practise</b> medicine in ${esc(c.name)}.</li>
    <li>✅ You plan for <b>FMGE/NExT</b> and the Indian internship after returning.</li>
  </ul></div></section>` : ''}

  <section aria-labelledby="visa"><h2 id="visa">${esc(c.short)} student visa for Indian students</h2>
  <div class="grid g2">
    <div class="card"><h3>Visa &amp; fees</h3><p><b>${esc(c.visa.name)}.</b> ${esc(c.visa.feeText)}</p><p>${esc(c.visa.time)}</p></div>
    <div class="card"><h3>Money you must show</h3><p>${esc(c.funds.text)}</p><p>Education loan sanction letters are usually accepted as proof of funds. Compare lenders in our <a href="/blog/education-loan-for-study-abroad.html">education loan guide</a>.</p></div>
  </div>
  <h3 style="margin-top:16px">Steps</h3>
  <ol>
    <li>Get an offer from a recognised ${c.mbbs ? 'medical ' : ''}university${c.slug === 'germany' ? ' and your APS certificate' : c.slug === 'france' ? ' through Campus France India' : c.slug === 'italy' ? ' and complete Universitaly pre-enrolment' : ''}.</li>
    <li>Pay the deposit and receive your ${c.slug === 'uk' ? 'CAS' : c.slug === 'usa' ? 'I-20 (then pay the SEVIS fee)' : c.slug === 'australia' ? 'CoE' : c.slug === 'canada' ? 'letter of acceptance and PAL' : 'admission/invitation letter'}.</li>
    <li>Arrange ${c.slug === 'germany' ? 'the blocked account and health insurance' : 'proof of funds and health insurance'}.</li>
    <li>Apply for the visa online or at VFS/embassy and give biometrics${c.slug === 'usa' ? '; attend the interview' : ''}.</li>
    <li>Book accommodation and flights; complete registration after arrival.</li>
  </ol></section>

  <section aria-labelledby="work"><h2 id="work">Work during and after studies</h2>
  <div class="grid g2">
    <div class="card"><h3>Part-time work while studying</h3><p>${esc(c.work.text)}</p></div>
    <div class="card"><h3>Post-study work</h3><p>${esc(c.psw.text)}</p></div>
    <div class="card"><h3>Permanent residence</h3><p><span class="pill ${c.pr.level >= 4 ? 'g' : c.pr.level >= 3 ? 'b' : c.pr.level >= 2 ? 'o' : 'r'}">${prWord(c.pr.level)}</span> ${esc(c.pr.text)}</p></div>
    <div class="card"><h3>Language for jobs</h3><p>${esc(c.lang)}.</p></div>
  </div></section>

  <section aria-labelledby="sch"><h2 id="sch">Scholarships for Indian students in ${esc(c.name)}</h2>
  <div class="tbl-wrap"><table><thead><tr><th>Scholarship</th><th>Level</th><th>What it covers</th></tr></thead><tbody>${c.scholarships.map(s => `<tr><td><b>${esc(s[0])}</b></td><td>${esc(s[1])}</td><td>${esc(s[2])}</td></tr>`).join('')}</tbody></table></div></section>

  <section aria-labelledby="know"><h2 id="know">Things Indian students must know</h2>
  <ul>${c.special.map(s => `<li>${esc(s)}</li>`).join('')}<li>Intakes: ${esc(c.intakes.join('; '))}.</li></ul>
  <div class="grid g2" style="margin-top:14px">
    <div class="card"><h3 style="color:var(--green)">Pros</h3><ul>${c.pros.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
    <div class="card"><h3 style="color:var(--red)">Cons</h3><ul>${c.cons.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
  </div></section>

  <section aria-labelledby="faq"><h2 id="faq">FAQs: ${c.mbbs ? 'MBBS in ' + esc(c.name) : 'studying in ' + esc(c.short)}</h2>${faqHtml(faqs)}</section>

  <section aria-labelledby="src"><h2 id="src">Official sources</h2>
  <ul>${c.links.map(([n, u]) => `<li><a href="${attr(u)}" rel="noopener" target="_blank">${esc(n)}</a></li>`).join('')}</ul>
  <p class="meta-line">Reviewed ${REVIEWED_H}. Fees, visa rules and exchange rates change — confirm on the official page before paying. Spotted something outdated? <a href="/contact.html">Tell us</a>.</p></section>

  <section aria-labelledby="rel"><h2 id="rel">Compare with similar destinations</h2>
  <div class="cgrid">${rel.map(x => `<a class="cc" href="/study-abroad/${x.page}" style="text-decoration:none"><div class="cc-h">${flag(x)}<div><h3>${esc(x.mbbs ? x.short : x.name)}</h3><small>${x.mbbs ? range(x, 'ug') : range(x, 'pg')} / yr</small></div></div><p>${esc(x.tagline)}</p></a>`).join('')}</div>
  <p style="margin-top:14px"><a href="/study-abroad/">All ${C.length} country guides →</a> · <a href="/tools/study-abroad-finder.html">Find my best country →</a></p></section>
</div></main>
${footer}
</body></html>`;
}

// ═══════════════════════════════════════════════════════
//  INDEX: /study-abroad/
// ═══════════════════════════════════════════════════════
function index() {
  const url = `${SITE}/study-abroad/`;
  const title = `Study Abroad Country Guides for Indian Students ${YEAR}`;
  const desc = `Study abroad guides for Indian students: cost in ₹, student visa, proof of funds, work rights, post-study visa, PR & scholarships for ${MAIN.length} countries + MBBS abroad.`;
  const block = (list, h) => `<h2>${h}</h2><div class="cgrid" style="margin-bottom:26px">${list.map(c => `<a class="cc" href="/study-abroad/${c.page}" style="text-decoration:none"><div class="cc-h">${flag(c)}<div><h3>${esc(c.mbbs ? 'MBBS in ' + c.name : 'Study in ' + c.short)}</h3><small>${c.mbbs ? range(c, 'ug') : range(c, 'pg')} / year</small></div></div><p>${esc(c.tagline)}</p></a>`).join('')}</div>`;
  const regions = ['North America', 'Europe', 'Oceania', 'Asia'];
  return head({ title, desc, url, schema: [breadcrumbLd([['Home', SITE + '/'], ['Study Abroad', url]]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description: desc, url, dateModified: REVIEWED, hasPart: C.map(c => ({ '@type': 'Article', name: guideTitle(c), url: `${SITE}/study-abroad/${c.page}` })) }] }) + `
<main><div class="wrap">
  <div class="crumbs"><a href="/">Home</a> › Study Abroad</div>
  <header class="hero"><div class="badge">Reviewed ${REVIEWED_H}</div><h1>Study Abroad <span>Country Guides</span></h1><p class="lead">Honest, sourced guides for Indian students — what it really costs in rupees, visa and money rules, work rights and scholarships.</p>
  <p><a class="btn" href="/tools/study-abroad-finder.html">Not sure where to go? Use the Study Abroad Finder →</a></p></header>
  ${regions.map(r => block(MAIN.filter(c => c.region === r), r === 'Asia' ? 'Asia &amp; Middle East' : r)).join('')}
  ${block(MBBS, 'MBBS abroad')}
</div></main>
${footer}
</body></html>`;
}

// ═══════════════════════════════════════════════════════
//  SITEMAP
// ═══════════════════════════════════════════════════════
function sitemap() {
  const p = path.join(ROOT, 'sitemap.xml');
  let xml = fs.readFileSync(p, 'utf8');
  xml = xml.replace(/\s*<url><loc>https:\/\/studenttoolkit\.online\/(study-abroad\/[^<]*|tools\/study-abroad-finder\.html)<\/loc>.*?<\/url>/g, '');
  const urls = [`${SITE}/tools/study-abroad-finder.html`, `${SITE}/study-abroad/`, ...C.map(c => `${SITE}/study-abroad/${c.page}`)];
  const add = urls.map(u => `  <url><loc>${u}</loc><lastmod>${REVIEWED}</lastmod></url>`).join('\n');
  xml = xml.replace('</urlset>', add + '\n</urlset>');
  fs.writeFileSync(p, xml);
  console.log('updated sitemap.xml (+' + urls.length + ' URLs)');
}

write('tools/study-abroad-finder.html', hub());
write('study-abroad/index.html', index());
C.forEach(c => write('study-abroad/' + c.page, guide(c)));
sitemap();
