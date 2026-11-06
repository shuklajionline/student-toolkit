#!/usr/bin/env node
/* Checks every internal link and asset reference in the site's HTML files.
 *   node scripts/check-links.js            → list broken internal links
 *   node scripts/check-links.js ai-resume  → also list links containing a pattern
 * Exits with code 1 if any internal link is broken.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const pattern = process.argv[2] ? new RegExp(process.argv[2]) : null;
const SKIP = new Set(['.git', 'node_modules', 'workers', '.claude']);

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    if (SKIP.has(f)) continue;
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) files.push(p);
  }
})(ROOT);

const broken = new Map();
const matches = new Map();
const add = (map, k, v) => { if (!map.has(k)) map.set(k, new Set()); map.get(k).add(v); };

for (const f of files) {
  const html = fs.readFileSync(f, 'utf8')
    .replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, ''); // ignore JS-built URLs
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  for (const m of html.matchAll(/(?:href|src)\s*=\s*["']([^"'#?]*)/gi)) {
    let u = m[1].trim();
    if (!u) continue;
    if (/^(https?:)?\/\//i.test(u)) {
      if (/^(https?:)?\/\/(www\.)?studenttoolkit\.online/i.test(u)) u = u.replace(/^(https?:)?\/\/(www\.)?studenttoolkit\.online/i, '') || '/';
      else continue;
    }
    if (/^(mailto|tel|data|javascript):/i.test(u)) continue;
    if (pattern && pattern.test(u)) add(matches, rel, u);
    let target = u.startsWith('/') ? path.join(ROOT, u) : path.join(path.dirname(f), u);
    if (u.endsWith('/') || (fs.existsSync(target) && fs.statSync(target).isDirectory())) target = path.join(target, 'index.html');
    if (!fs.existsSync(target)) add(broken, u, rel);
  }
}

console.log(`Checked ${files.length} HTML files.`);
if (broken.size) {
  console.log(`\nBROKEN internal links (${broken.size}):`);
  for (const [u, from] of broken) console.log(`  ${u}  ←  ${[...from].join(', ')}`);
} else console.log('No broken internal links.');
if (pattern) {
  console.log(`\nLinks matching ${pattern} (${matches.size} files):`);
  for (const [f, us] of matches) console.log(`  ${f}: ${[...us].join(' ')}`);
}
process.exitCode = broken.size ? 1 : 0;
