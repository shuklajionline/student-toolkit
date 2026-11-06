#!/usr/bin/env node
/* Builds long-form guides from scripts/blog-posts/*.js into blog/<slug>.html
 *   node scripts/build-blog.js
 * Each post module exports { slug, title, h1, dek, desc, kicker, section, keywords,
 *   published, modified, readMin, tldr[], body, faqs[[q,a]], sources[[name,url]], related[[href,cat,title]] }.
 * The table of contents is built from <h2 id="..."> tags in the body.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SRC = path.join(__dirname, 'blog-posts');
const SITE = 'https://studenttoolkit.online';

const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const strip = s => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const ld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const human = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

const SCRIPT = `<script>
(function(){
  var bar=document.getElementById('bar');
  var links=[].slice.call(document.querySelectorAll('.toc a'));
  var heads=links.map(function(a){return document.getElementById(a.getAttribute('href').slice(1));});
  function onScroll(){
    var h=document.documentElement,max=h.scrollHeight-h.clientHeight;bar.style.width=(max>0?h.scrollTop/max*100:0)+'%';
    var cur=0;heads.forEach(function(el,i){if(el&&el.getBoundingClientRect().top<120)cur=i;});
    links.forEach(function(a,i){a.classList.toggle('on',i===cur);});
  }
  document.addEventListener('scroll',onScroll,{passive:true});onScroll();
  document.querySelectorAll('pre.copy').forEach(function(pre){var b=document.createElement('button');b.className='copybtn';b.type='button';b.textContent='Copy';
    b.onclick=function(){var t=pre.innerText.replace(/^Copy\\n?/,'');navigator.clipboard&&navigator.clipboard.writeText(t).then(function(){b.textContent='Copied ✓';setTimeout(function(){b.textContent='Copy';},1500);});};pre.appendChild(b);});
  document.querySelectorAll('.check').forEach(function(box){
    var key='chk_'+location.pathname+'_'+(box.id||'');var inputs=[].slice.call(box.querySelectorAll('input[type=checkbox]'));
    var saved=[];try{saved=JSON.parse(localStorage.getItem(key))||[];}catch(e){}
    inputs.forEach(function(i,n){i.checked=saved.indexOf(n)>-1;});
    function paint(){var on=inputs.filter(function(i){return i.checked;}).length,pct=Math.round(on/inputs.length*100);
      var s=box.querySelector('.score b'),m=box.querySelector('.meter i'),v=box.querySelector('.verdict');
      if(s)s.textContent=pct+'%';if(m)m.style.width=pct+'%';
      if(v){var r=JSON.parse(box.dataset.verdicts||'[]');var msg='';r.forEach(function(x){if(pct>=x[0])msg=x[1];});v.textContent=msg;}
      try{localStorage.setItem(key,JSON.stringify(inputs.map(function(i,n){return i.checked?n:-1;}).filter(function(n){return n>-1;})));}catch(e){}}
    box.addEventListener('change',paint);paint();});
})();
</script>`;

function page(p) {
  const url = `${SITE}/blog/${p.slug}.html`;
  const toc = [...p.body.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)].map(m => [m[1], strip(m[2])]);
  const words = strip(p.body).split(' ').length;
  const readMin = Math.max(5, Math.round(words / 220));
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BlogPosting', '@id': url + '#post', headline: p.h1.replace(/<[^>]+>/g, ''), description: p.desc, image: SITE + '/og-image.png', datePublished: p.published, dateModified: p.modified, inLanguage: 'en-IN', wordCount: words, articleSection: p.section, keywords: p.keywords, mainEntityOfPage: url, author: { '@type': 'Organization', name: 'Student Toolkit Editorial Team', url: SITE + '/about.html' }, publisher: { '@type': 'Organization', name: 'Student Toolkit', logo: { '@type': 'ImageObject', url: SITE + '/logo-icon.png' } } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + '/blog/' }, { '@type': 'ListItem', position: 3, name: p.crumb || p.title, item: url }] },
      { '@type': 'FAQPage', mainEntity: p.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: strip(a) } })) }
    ]
  };
  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-J60HJ54DY0"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-J60HJ54DY0');</script>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}"/>
<meta name="keywords" content="${esc(p.keywords)}"/>
<meta name="author" content="Student Toolkit Editorial Team"/>
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"/>
<link rel="canonical" href="${url}"/>
<meta property="og:site_name" content="Student Toolkit"/>
<meta property="og:locale" content="en_IN"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${esc(p.title)}"/>
<meta property="og:description" content="${esc(p.desc)}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:image" content="${SITE}/og-image.png"/>
<meta property="article:published_time" content="${p.published}T09:00:00+05:30"/>
<meta property="article:modified_time" content="${p.modified}T09:00:00+05:30"/>
<meta property="article:section" content="${esc(p.section)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:site" content="@StudentToolkitIN"/>
<meta name="twitter:title" content="${esc(p.title)}"/>
<meta name="twitter:description" content="${esc(p.desc)}"/>
<meta name="twitter:image" content="${SITE}/og-image.png"/>
<meta name="theme-color" content="#fbfaf7"/>
<link rel="icon" href="/logo-icon.png"/>
${ld(graph)}
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1248976636881567');fbq('track','PageView');</script>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="/blog/post.css?v=${p.modified.replace(/-/g, '')}"/>
</head>
<body>
<div id="bar" aria-hidden="true"></div>
<nav class="top" aria-label="Main">
  <a class="logo" href="/">Student<span>Toolkit</span></a>
  <div class="nl"><a href="/tools/">Tools</a><a href="/colleges/">Colleges</a><a href="/study-abroad/">Study Abroad</a><a href="/blog/">Blog</a><a class="cta" href="${p.cta ? p.cta[0] : '/tools/'}">${esc(p.cta ? p.cta[1] : 'Free Tools →')}</a></div>
</nav>
<header class="hero"><div class="in">
  <div class="crumbs"><a href="/">Home</a> › <a href="/blog/">Blog</a> › ${esc(p.crumb || p.section)}</div>
  <span class="kicker">${esc(p.kicker)}</span>
  <h1>${p.h1}</h1>
  <p class="dek">${p.dek}</p>
  <div class="byline"><span>By <b>Student Toolkit Editorial Team</b></span><span>Updated <b>${human(p.modified)}</b></span><span><b>${readMin} min</b> read</span><span><a href="/editorial-policy.html">How we research</a></span></div>
</div></header>

<div class="layout">
  <nav class="toc" aria-label="Contents"><b>On this page</b>${toc.map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`).join('')}</nav>
  <article>
    <section class="tldr" aria-label="Key takeaways"><h2>The short version</h2><ul>${p.tldr.map(t => `<li>${t}</li>`).join('')}</ul></section>
${p.body}
    <h2 id="faq">Frequently asked questions</h2>
    ${p.faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join('\n    ')}
    ${p.sources && p.sources.length ? `<h2 id="sources">Sources</h2><ul class="sources">${p.sources.map(([n, u]) => `<li><a href="${esc(u)}" rel="noopener" target="_blank">${esc(n)}</a></li>`).join('')}</ul>` : ''}
    <div class="author"><div class="av">ST</div><p><b>Student Toolkit Editorial Team</b> — we build free tools and guides for Indian students. Rules, fees and dates change; we review this guide regularly and link official sources. Spotted an error? <a href="/contact.html">Tell us</a>.</p></div>
  </article>
</div>

<section class="related" aria-label="Related reading"><h2>Keep going</h2><div class="rgrid">
${p.related.map(([h, c, t]) => `  <a href="${h}"><small>${esc(c)}</small><b>${esc(t)}</b></a>`).join('\n')}
</div></section>

<footer class="site"><div class="fi">
  <div><h4>Student Toolkit</h4><p>Free tools and honest guides for Indian students. No sign-up.</p></div>
  <div><h4>Tools</h4><a href="/tools/attendance.html">Attendance Calculator</a><a href="/tools/cgpa.html">CGPA Calculator</a><a href="/tools/college-predictor.html">College Predictor</a><a href="/tools/salary-calculator.html">Salary Calculator</a><a href="/tools/career-path-finder.html">Career Path Finder</a><a href="/tools/study-abroad-finder.html">Study Abroad Finder</a><a href="/tools/letter-writer.html">Letter Writer</a></div>
  <div><h4>Guides</h4><a href="/blog/what-to-do-after-12th.html">What to do after 12th</a><a href="/blog/how-to-check-college-is-genuine.html">Is your college genuine?</a><a href="/blog/ats-resume-for-freshers-india.html">Fresher resume guide</a><a href="/blog/ctc-vs-in-hand-salary-freshers.html">CTC vs in-hand salary</a><a href="/blog/education-loan-for-study-abroad.html">Education loan abroad</a><a href="/blog/">All guides →</a></div>
  <div><h4>Explore</h4><a href="/colleges/">College Directory</a><a href="/study-abroad/">Study Abroad Guides</a><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/editorial-policy.html">Editorial Policy</a><a href="/privacy.html">Privacy</a></div>
</div><div class="bottom">© ${p.modified.slice(0, 4)} Student Toolkit · Made in India for students · Information only, not legal, tax or financial advice.</div></footer>
${SCRIPT}
</body>
</html>
`;
}

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js'));
const built = [];
for (const f of files) {
  const p = require(path.join(SRC, f));
  const html = page(p);
  fs.writeFileSync(path.join(ROOT, 'blog', p.slug + '.html'), html);
  built.push(p);
  console.log(`wrote blog/${p.slug}.html  ${(html.length / 1024).toFixed(0)} KB  ~${strip(p.body).split(' ').length} words  title ${p.title.length}c  desc ${p.desc.length}c`);
}
module.exports = built;
