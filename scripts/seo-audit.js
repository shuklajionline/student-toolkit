#!/usr/bin/env node
/* SEO audit + auto-fix. Usage: node scripts/seo-audit.js [--fix]
 * Checks every HTML page (canonical, robots, title/description, h1) and keeps sitemap.xml in sync:
 *   indexable pages missing from the sitemap are added; sitemap URLs with no file or marked noindex are removed.
 * Exit code 1 when problems remain that need a human/Claude decision. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), SITE = 'https://studenttoolkit.online/', FIX = process.argv.includes('--fix');
const SKIP = new Set(['.git', 'node_modules', 'scripts', 'workers', 'docs']);
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (SKIP.has(e.name)) continue; const p = path.join(d, e.name); e.isDirectory() ? walk(p) : e.name.endsWith('.html') && files.push(path.relative(ROOT, p).split(path.sep).join('/')); } })(ROOT);
const urlOf = f => SITE + f.replace(/index\.html$/, '');
const today = new Date().toISOString().slice(0, 10);
let sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const inMap = new Set([...sm.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]));
const issues = [], pages = new Map();
for (const f of files) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8'), u = urlOf(f);
  const noindex = /<meta[^>]*name="robots"[^>]*noindex/i.test(h);
  const canon = (h.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i) || [])[1];
  const title = (h.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
  const desc = (h.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i) || [])[1] || '';
  const redirect = /http-equiv="refresh"/i.test(h);
  pages.set(u, { noindex, redirect });
  if (noindex || redirect || f === 'offline.html') continue;
  if (!canon) issues.push(`${f}: no canonical`); else if (canon !== u) issues.push(`${f}: canonical points to ${canon}`);
  if (title.length < 15 || title.length > 80) issues.push(`${f}: title length ${title.length}`);
  if (desc.length < 60 || desc.length > 200) issues.push(`${f}: description length ${desc.length}`);
  if ((h.match(/<h1[\s>]/g) || []).length !== 1) issues.push(`${f}: needs exactly one h1`);
}
let added = 0, removed = 0;
for (const [u, p] of pages) if (!p.noindex && !p.redirect && !inMap.has(u) && !u.endsWith('offline.html')) { if (FIX) { sm = sm.replace('</urlset>', `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>\n</urlset>`); added++; } else issues.push(`not in sitemap: ${u}`); }
for (const u of inMap) { const p = pages.get(u); if (!p || p.noindex || p.redirect) { if (FIX) { sm = sm.split(String.fromCharCode(10)).filter(l => !l.includes('<loc>' + u + '</loc>')).join(String.fromCharCode(10)); removed++; } else issues.push(`sitemap lists non-indexable/missing: ${u}`); } }
if (FIX && (added || removed)) fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sm);
console.log(`${files.length} pages, sitemap +${added} -${removed}, ${issues.length} issues`);
issues.slice(0, 60).forEach(i => console.log(' - ' + i));
process.exit(issues.length ? 1 : 0);
