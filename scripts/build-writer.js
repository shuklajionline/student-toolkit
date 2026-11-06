#!/usr/bin/env node
/* Builds tools/letter-writer.html from tools/writer/templates.js.
 *   node scripts/build-writer.js
 * Every template's sample letter is rendered into the page as crawlable HTML.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const L = require(path.join(ROOT, 'tools', 'writer', 'templates.js'));
const SITE = 'https://studenttoolkit.online';
const URL = `${SITE}/tools/letter-writer.html`;
const UPDATED = '2026-11-07';
const V = UPDATED.replace(/-/g, '');
const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const ld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const N = L.TEMPLATES.length;
const EN = L.TEMPLATES.filter(t => t.lang !== 'hi').length;
const HI = N - EN;

const title = `Student Application & Letter Writer: ${N} Free Formats`;
const desc = 'Write leave applications, bonafide & TC requests, fee letters, professor emails, internship and job emails in English or Hindi. Free, no sign-up.';

const faqs = [
  ['How do I write a leave application for college?', 'Address it to the Principal or HOD with “To,” and the college name, add the date and a clear subject line (for example “Application for sick leave from 10 to 12 November”), greet with “Respected Sir/Madam,”, state who you are (name, course, roll number), the reason and exact dates, mention any medical certificate, request leave, and close with “Thanking you, Yours obediently,” followed by your name, roll number and course. The sick leave template above fills all of this for you.'],
  ['What is the format of a formal letter to a principal in India?', 'To, → The Principal, → College name, → City. Then Date, Subject, salutation (Respected Sir/Madam), body paragraphs, “Thanking you,”, “Yours obediently,” (or “Yours sincerely,”), your name, roll number, course and phone, and Place.'],
  ['How should I write an email to a professor?', 'Use a specific subject line, greet them by title and name (Dear Dr. Iyer), introduce yourself in one line with your course and roll number, make one clear request with dates, keep it under 150–200 words, and close politely with your full name and course.'],
  ['Can I write applications in Hindi?', `Yes. The writer includes ${HI} Hindi formats — sick leave, family function leave, fee concession, transfer certificate and bonafide certificate — with the standard “सेवा में” layout.`],
  ['Is my information saved or sent anywhere?', 'No. Everything runs in your browser. Your profile, drafts and history are saved only on your own device (local storage), and nothing is sent to our servers or to any AI service.'],
  ['Can I download the letter as Word or PDF?', 'Yes. Use “Word (.doc)” to download an editable Word file, “Print / PDF” to print or save as PDF from your browser, or open it directly in Gmail or Outlook with the subject and body filled in.']
];

const cats = L.CATS.map(([id, ic, name]) => [id, ic, name, L.TEMPLATES.filter(t => t.cat === id).length]);

const samples = L.TEMPLATES.map(t => {
  const r = L.compose(t, Object.assign({}, L.PROFILE_SAMPLE, t.sample), {});
  const text = r.format === 'email' ? `Subject: ${r.subject}\n\n${r.text}` : r.text;
  return `<article class="sample" id="s-${t.id}"${t.lang === 'hi' ? ' lang="hi"' : ''}>
  <h3>${t.icon} ${esc(t.title)}</h3><p class="d">${esc(t.desc)}</p>
  <pre>${esc(text)}</pre>
  <div class="a"><a class="btn sm" href="#${t.id}" data-use="${t.id}">Use this format →</a></div>
</article>`;
}).join('\n');

const schema = [
  { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Student Application & Letter Writer', url: URL, description: desc, applicationCategory: 'EducationalApplication', operatingSystem: 'Any (web browser)', inLanguage: ['en-IN', 'hi-IN'], isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' }, dateModified: UPDATED, publisher: { '@type': 'Organization', name: 'Student Toolkit', url: SITE + '/' }, featureList: [`${N} templates (${HI} in Hindi)`, 'Formal letter and email formats', 'Tone and length control', 'Saved student profile', 'Editable live preview', 'Copy, Gmail, Outlook, Word, PDF and TXT export', 'Letter history on your device', 'No AI, no sign-up'] },
  { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Tools', item: SITE + '/tools/' }, { '@type': 'ListItem', position: 3, name: 'Letter Writer', item: URL }] },
  { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Student application and email formats', itemListElement: L.TEMPLATES.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.title, url: `${URL}#s-${t.id}` })) }
];

const html = `<!DOCTYPE html>
<html lang="en-IN">
<head>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-J60HJ54DY0"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-J60HJ54DY0');</script>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<meta name="keywords" content="letter writer for students, leave application for college, sick leave application, application for bonafide certificate, transfer certificate application, fee concession application, email to professor, internship email format, leave application in hindi, formal letter format india"/>
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"/>
<link rel="canonical" href="${URL}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:type" content="website"/>
<meta property="og:url" content="${URL}"/>
<meta property="og:site_name" content="Student Toolkit"/>
<meta property="og:locale" content="en_IN"/>
<meta property="og:image" content="${SITE}/og-image.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:site" content="@StudentToolkitIN"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${SITE}/og-image.png"/>
<meta name="theme-color" content="#09090b"/>
<link rel="icon" href="/logo-icon.png"/>
<link rel="manifest" href="/manifest.json"/>
${schema.map(ld).join('\n')}
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1248976636881567');fbq('track','PageView');</script>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="/tools/writer/writer.css?v=${V}"/>
</head>
<body>
<nav class="top" aria-label="Main">
  <a href="/" class="nav-logo">Student<span>Toolkit</span></a>
  <div class="nav-links"><a href="/tools/">Tools</a><a href="/colleges/">Colleges</a><a href="/study-abroad/">Study Abroad</a><a href="/blog/">Blog</a><a href="#workspace" class="nav-cta">Write a letter →</a></div>
</nav>
<main>
<div class="wrap">
  <div class="crumbs"><a href="/">Home</a> › <a href="/tools/">Tools</a> › Letter Writer</div>
  <header class="hero">
    <div class="badge">✍️ ${N} formats · English &amp; हिंदी · No AI · No sign-up</div>
    <h1>Student <span>Application &amp; Letter</span> Writer</h1>
    <p>Leave applications, certificate requests, fee and hostel letters, professor emails, internship and job emails — in the exact format Indian colleges and recruiters expect. Edit live, then copy, email, or download as Word/PDF.</p>
    <div class="stats"><span><b>${EN}</b> English formats</span><span><b>${HI}</b> Hindi formats</span><span><b>3</b> tones × <b>3</b> lengths</span><span><b>0</b> data sent anywhere</span></div>
  </header>

  <section class="picker" aria-label="Choose a template">
    <div class="pk-top">
      <div class="search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><label for="q" class="sr">Search templates</label><input id="q" type="search" placeholder="Search: leave, bonafide, fee, internship, hindi… (press /)" autocomplete="off"></div>
    </div>
    <div class="cats" role="toolbar" aria-label="Categories"><button class="cat" data-cat="all" aria-pressed="true">All ${N}</button>${cats.map(([id, ic, name, n]) => `<button class="cat" data-cat="${id}" aria-pressed="false">${ic} ${esc(name)} <span style="opacity:.6">${n}</span></button>`).join('')}</div>
    <div class="tgrid" id="tgrid" style="margin-top:10px"><noscript><p class="empty">Turn on JavaScript to use the writer, or copy a sample format below.</p></noscript></div>
  </section>

  <div class="ws" id="workspace">
    <section class="panel" aria-label="Letter details">
      <div class="ptabs" role="tablist"><button class="ptab" role="tab" data-p="details" aria-selected="true">1 · Details</button><button class="ptab" role="tab" data-p="profile" aria-selected="false">2 · My profile</button><button class="ptab" role="tab" data-p="style" aria-selected="false">3 · Style</button></div>
      <div class="pbody">
        <div class="ppanel on" id="p-details">
          <div class="tpl-head" id="tplHead"></div>
          <div id="fields"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 10px"><button class="btn g sm" id="fillEx" type="button">Fill example</button><button class="btn g sm" id="clearF" type="button">Clear fields</button></div>
          <div class="tips" id="tips"></div>
        </div>
        <div class="ppanel" id="p-profile">
          <p class="hint" style="margin:0 0 12px">Saved on this device and used in every letter. Nothing is uploaded.</p>
          <div class="field"><label class="l" for="pf-name">Full name <em>*</em></label><input class="i" id="pf-name" placeholder="e.g. Ananya Sharma" autocomplete="name"></div>
          <div class="row2"><div class="field"><label class="l" for="pf-roll">Roll / enrolment no.</label><input class="i" id="pf-roll" placeholder="e.g. 22CS1047"></div><div class="field"><label class="l" for="pf-phone">Phone</label><input class="i" id="pf-phone" placeholder="+91 …" autocomplete="tel"></div></div>
          <div class="field"><label class="l" for="pf-course">Course &amp; year</label><input class="i" id="pf-course" placeholder="e.g. B.Tech Computer Science, 3rd Year"></div>
          <div class="field"><label class="l" for="pf-college">College / university</label><input class="i" id="pf-college" placeholder="e.g. Ramaiah Institute of Technology"></div>
          <div class="row2"><div class="field"><label class="l" for="pf-city">City</label><input class="i" id="pf-city" placeholder="e.g. Bengaluru"></div><div class="field"><label class="l" for="pf-email">Email</label><input class="i" id="pf-email" placeholder="you@example.com" autocomplete="email"></div></div>
          <div class="field"><label class="l" for="pf-link">Portfolio / LinkedIn / GitHub (for job emails)</label><input class="i" id="pf-link" placeholder="linkedin.com/in/…"></div>
          <button class="btn g sm" id="clearProfile" type="button">Clear my profile</button>
        </div>
        <div class="ppanel" id="p-style">
          <div class="field"><label class="l">Format</label><div class="seg" id="fmt"><button data-v="auto" type="button">Auto</button><button data-v="letter" type="button">Letter</button><button data-v="email" type="button">Email</button></div></div>
          <div class="field"><label class="l">Tone</label><div class="seg" id="tone"><button data-v="formal" type="button">Formal</button><button data-v="polite" type="button">Polite</button><button data-v="confident" type="button">Confident</button></div></div>
          <div class="field"><label class="l">Length</label><div class="seg" id="len"><button data-v="short" type="button">Short</button><button data-v="standard" type="button">Standard</button><button data-v="detailed" type="button">Detailed</button></div></div>
          <div class="field" id="toWrap"><label class="l" for="to">Addressed to (letters)</label><select class="i" id="to"></select><input class="i" id="toCustom" placeholder="e.g. The Dean of Student Welfare" style="margin-top:6px;display:none"></div>
          <div class="field"><label class="l" for="toName">Recipient name (optional)</label><input class="i" id="toName" placeholder="e.g. Dr. R. K. Sharma"></div>
          <div class="row2">
            <div class="field" id="saluteWrap"><label class="l" for="salute">Salutation</label><select class="i" id="salute"><option value="Sir/Madam">Respected Sir/Madam</option><option value="Sir">Respected Sir</option><option value="Madam">Respected Madam</option><option value="Dear">Dear Sir/Madam</option></select></div>
            <div class="field"><label class="l" for="closing">Closing</label><select class="i" id="closing"><option value="auto">Auto</option><option value="traditional">Traditional (Yours obediently)</option><option value="modern">Modern (Yours sincerely)</option></select></div>
          </div>
          <div class="field"><label class="l" for="ldate">Letter date</label><input class="i" type="date" id="ldate"></div>
        </div>
      </div>
    </section>

    <section class="out" aria-label="Your letter">
      <div class="bar">
        <button class="btn" id="copyAll" type="button">📋 Copy</button>
        <button class="btn g" id="gmail" type="button">Gmail</button>
        <button class="btn g" id="outlook" type="button">Outlook</button>
        <button class="btn g" id="mailto" type="button">Mail app</button>
        <button class="btn g" id="dlDoc" type="button">Word (.doc)</button>
        <button class="btn g" id="print" type="button">Print / PDF</button>
        <button class="btn g" id="dlTxt" type="button">.txt</button>
        <span class="sp"></span><span class="edited" id="edited">✎ edited</span>
      </div>
      <div class="quality" id="quality" aria-live="polite"></div>
      <div class="paper-wrap">
        <div class="tips" id="stale" style="display:none;margin:0 0 10px">You’ve edited the letter by hand, so field changes aren’t applied. <button class="btn sm" id="regen" type="button">Regenerate from details</button></div>
        <div class="subj" id="subjLine"><span>Subject:</span> <b id="subjText"></b> <button class="btn g sm" id="copySubj" type="button" style="float:right;padding:2px 8px">Copy</button></div>
        <div class="paper" id="paper" contenteditable="true" spellcheck="true" aria-label="Letter preview — click to edit"></div>
      </div>
      <details class="hist"><summary>🕘 Recent letters <span id="histCount"></span></summary><ul id="histList"></ul></details>
    </section>
  </div>
</div>

<section class="c" id="formats" aria-labelledby="fh"><div class="wrap">
  <h2 id="fh">All ${N} application &amp; email formats (with samples)</h2>
  <p>Every format below follows the layout Indian colleges, universities, banks and recruiters expect. Click “Use this format” to fill it with your own details, or copy the sample and edit it.</p>
  <div class="samples">
${samples}
  </div>
</div></section>

<section class="c" aria-labelledby="gh"><div class="wrap">
  <h2 id="gh">How to write a formal application (Indian format)</h2>
  <div class="guide">
    <div><h3>1. Address block</h3><p>Start with “To,” then the designation (“The Principal,”), institution and city, each on its own line. In Hindi, start with “सेवा में,”.</p></div>
    <div><h3>2. Date &amp; subject</h3><p>Write the date in full (7 November 2026). The subject should say exactly what you want: “Application for sick leave from 10 to 12 November 2026”.</p></div>
    <div><h3>3. Salutation</h3><p>“Respected Sir/Madam,” for principals and HODs. “Dear Dr. Iyer,” for emails to professors. “Dear Hiring Team,” when you don’t know the recruiter’s name.</p></div>
    <div><h3>4. Body</h3><p>Who you are (name, course, roll number) → the situation and dates → your request → what you’ll do (submit certificate, cover syllabus). Three short paragraphs is ideal.</p></div>
    <div><h3>5. Closing</h3><p>“Thanking you,” then “Yours obediently,” (traditional, for college authorities) or “Yours sincerely,” (modern, for offices and companies). Sign with name, roll number, course and phone.</p></div>
    <div><h3>6. Email etiquette</h3><ul><li>Specific subject line</li><li>Under 150–200 words</li><li>One clear request with a date</li><li>Send from a professional email ID</li><li>Follow up once after 5–7 days</li></ul></div>
  </div>
  <p style="margin-top:16px">Applying for internships or jobs? Make your resume ATS-friendly with our <a href="/blog/ats-resume-for-freshers-india.html">fresher resume guide</a>, read <a href="/blog/ctc-vs-in-hand-salary-freshers.html">how to read a job offer</a>, and check attendance before asking for leave with the <a href="/tools/attendance.html">Bunk Meter</a>.</p>
</div></section>

<section class="c" aria-labelledby="qh"><div class="wrap">
  <h2 id="qh">Frequently asked questions</h2>
  ${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n  ')}
</div></section>
</main>

<section data-related-guides style="max-width:900px;margin:32px auto;padding:0 16px"><h2 style="font-size:20px;margin-bottom:8px">Related guides</h2><ul style="line-height:1.9;padding-left:18px"><li><a href="/blog/ats-resume-for-freshers-india.html">ATS-friendly resume for freshers: format, examples, checklist</a></li><li><a href="/blog/ctc-vs-in-hand-salary-freshers.html">CTC vs in-hand salary: how to read your first job offer</a></li><li><a href="/blog/how-to-check-college-is-genuine.html">Is your college genuine? 21-point check before paying fees</a></li></ul></section>
<footer class="site">
  <div class="flinks"><a href="/tools/attendance.html">Attendance Calculator</a><a href="/tools/cgpa.html">CGPA Calculator</a><a href="/tools/college-predictor.html">College Predictor</a><a href="/tools/salary-calculator.html">Salary Calculator</a><a href="/tools/career-path-finder.html">Career Path Finder</a><a href="/tools/study-abroad-finder.html">Study Abroad Finder</a><a href="/tools/letter-writer.html">Letter Writer</a></div>
  <div class="flinks"><a href="/tools/">All Tools</a><a href="/colleges/">Colleges</a><a href="/study-abroad/">Study Abroad</a><a href="/blog/">Blog</a><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/editorial-policy.html">Editorial Policy</a><a href="/privacy.html">Privacy</a></div>
  <p>© 2026 Student Toolkit · Free tools for Indian students · Templates are starting points — check your institution’s own format if it has one.</p>
</footer>
<div class="toast" id="toast" role="status"></div>
<script src="/tools/writer/templates.js?v=${V}"></script>
<script src="/tools/writer/writer.js?v=${V}"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'tools', 'letter-writer.html'), html);
console.log(`wrote tools/letter-writer.html ${(html.length / 1024).toFixed(0)} KB · ${N} templates · title ${title.length}c · desc ${desc.length}c`);
