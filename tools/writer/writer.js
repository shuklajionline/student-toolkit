/* Student Toolkit — Letter & Email Writer app. Runs entirely in the browser: no AI, no API calls. */
(function () {
  'use strict';
  const L = window.LW; if (!L) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const BY = Object.fromEntries(L.TEMPLATES.map(t => [t.id, t]));
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem('lw_' + k)); return v == null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('lw_' + k, JSON.stringify(v)); } catch {} }
  };
  const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const track = (n, p) => { try { window.gtag && gtag('event', n, p || {}); } catch {} };
  const PROFILE_KEYS = ['name', 'roll', 'course', 'college', 'city', 'phone', 'email', 'link'];

  let cur = null;          // current template
  let cat = 'all';
  let edited = false;
  let last = { subject: '', text: '', format: 'letter' };
  const profile = store.get('profile', {});
  const vals = store.get('vals', {});
  const style = Object.assign({ tone: 'formal', length: 'standard', format: 'auto', salute: 'Sir/Madam', closing: 'auto' }, store.get('style', {}));

  // ── Toast ──
  const toastEl = $('#toast');
  let tt; function toast(m) { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), 1800); }

  // ── Picker ──
  const grid = $('#tgrid'), q = $('#q');
  function renderGrid() {
    const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    const list = L.TEMPLATES.filter(t => (cat === 'all' || t.cat === cat) && words.every(w => (t.title + ' ' + t.desc + ' ' + t.id).toLowerCase().includes(w)));
    grid.innerHTML = list.length ? list.map(t => `<button class="tcard" data-id="${t.id}" aria-pressed="${cur && cur.id === t.id}"><span class="ic">${t.icon}</span><span><b>${esc(t.title)}</b><small>${esc(t.desc)}</small></span></button>`).join('')
      : `<p class="empty">No template matches “${esc(q.value)}”. Try “leave”, “fee”, “internship”, “hindi”…</p>`;
  }
  q.addEventListener('input', renderGrid);
  $$('.cat').forEach(b => b.addEventListener('click', () => { cat = b.dataset.cat; $$('.cat').forEach(x => x.setAttribute('aria-pressed', String(x === b))); renderGrid(); }));
  grid.addEventListener('click', e => { const b = e.target.closest('.tcard'); if (b) { select(b.dataset.id, true); if (innerWidth < 960) $('#workspace').scrollIntoView({ behavior: 'smooth' }); } });
  document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { e.preventDefault(); q.focus(); } });

  // ── Panel tabs ──
  $$('.ptab').forEach(t => t.addEventListener('click', () => { $$('.ptab').forEach(x => x.setAttribute('aria-selected', String(x === t))); $$('.ppanel').forEach(p => p.classList.toggle('on', p.id === 'p-' + t.dataset.p)); }));

  // ── Template fields ──
  function fieldHTML(f, v) {
    const id = 'f-' + f.k, val = v[f.k] ?? '';
    const lab = `<label class="l" for="${id}">${esc(f.label)}${f.req ? ' <em>*</em>' : ''}</label>`;
    if (f.type === 'textarea') return `<div class="field">${lab}<textarea class="i" id="${id}" data-k="${f.k}" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea></div>`;
    if (f.type === 'select') return `<div class="field">${lab}<select class="i" id="${id}" data-k="${f.k}">${f.opts.map(o => `<option${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
    if (f.type === 'date') return `<div class="field">${lab}<input class="i" type="date" id="${id}" data-k="${f.k}" value="${esc(val)}"></div>`;
    return `<div class="field">${lab}<input class="i" id="${id}" data-k="${f.k}" value="${esc(val)}" placeholder="${esc(f.ph ? 'e.g. ' + f.ph : '')}" autocomplete="off"></div>`;
  }
  function select(id, push) {
    const t = BY[id]; if (!t) return;
    cur = t; edited = false;
    const v = vals[id] || {};
    // default selects to their first option so the letter reads well
    t.fields.forEach(f => { if (f.type === 'select' && !v[f.k]) v[f.k] = f.opts[0]; });
    vals[id] = v;
    $('#tplHead').innerHTML = `<span class="ic">${t.icon}</span><span><b>${esc(t.title)}</b><small>${t.kind === 'email' ? 'Email' : 'Formal letter'}${t.lang === 'hi' ? ' · हिंदी' : ''} · ${esc(t.desc)}</small></span>`;
    $('#fields').innerHTML = t.fields.map(f => fieldHTML(f, v)).join('');
    $('#tips').innerHTML = t.tips && t.tips.length ? `<b>Tips</b><ul>${t.tips.map(x => `<li>${linkify(x)}</li>`).join('')}</ul>` : '';
    // recipient presets
    const toSel = $('#to');
    const presets = t.toPresets || (t.to ? [t.to] : []);
    toSel.innerHTML = presets.map(p => `<option value="${esc(p)}">${esc(p.replace(/\n/g, ' '))}</option>`).join('') + '<option value="__custom">Custom…</option>';
    const savedTo = (store.get('to', {}))[id];
    if (savedTo && presets.includes(savedTo)) toSel.value = savedTo;
    else if (savedTo) { toSel.value = '__custom'; $('#toCustom').value = savedTo; }
    $('#toWrap').style.display = presets.length ? '' : 'none';
    $('#toCustom').style.display = toSel.value === '__custom' ? '' : 'none';
    $('#saluteWrap').style.display = t.lang === 'hi' ? 'none' : '';
    renderGrid();
    if (push) { history.replaceState(null, '', '#' + id); track('lw_template', { template: id }); }
    store.set('last', id);
    generate();
  }
  function linkify(s) {
    return esc(s)
      .replace('Bunk Meter', '<a href="/tools/attendance.html">Bunk Meter</a>')
      .replace('salary calculator', '<a href="/tools/salary-calculator.html">salary calculator</a>')
      .replace('CTC vs in-hand salary', '<a href="/blog/ctc-vs-in-hand-salary-freshers.html">CTC vs in-hand salary</a>')
      .replace('fresher resume guide', '<a href="/blog/ats-resume-for-freshers-india.html">fresher resume guide</a>')
      .replace('Study Abroad Finder', '<a href="/tools/study-abroad-finder.html">Study Abroad Finder</a>')
      .replace('education loan guide', '<a href="/blog/education-loan-for-study-abroad.html">education loan guide</a>')
      .replace('whether a college is genuine', '<a href="/blog/how-to-check-college-is-genuine.html">whether a college is genuine</a>');
  }
  $('#fields').addEventListener('input', e => {
    const k = e.target.dataset.k; if (!k || !cur) return;
    vals[cur.id][k] = e.target.value; store.set('vals', vals);
    e.target.classList.remove('miss');
    if (!edited) generate(); else showStale();
  });
  $('#fillEx').addEventListener('click', () => {
    if (!cur) return;
    vals[cur.id] = Object.assign({}, cur.sample); store.set('vals', vals);
    const needProfile = !profile.name;
    if (needProfile) Object.assign(profile, L.PROFILE_SAMPLE);
    select(cur.id); fillProfileInputs();
    toast(needProfile ? 'Example filled — replace with your details' : 'Example filled');
  });
  $('#clearF').addEventListener('click', () => { if (!cur) return; vals[cur.id] = {}; store.set('vals', vals); select(cur.id); });

  // ── Profile ──
  function fillProfileInputs() { PROFILE_KEYS.forEach(k => { const el = $('#pf-' + k); if (el) el.value = profile[k] || ''; }); }
  PROFILE_KEYS.forEach(k => { const el = $('#pf-' + k); if (el) el.addEventListener('input', () => { profile[k] = el.value.trim(); store.set('profile', profile); if (!edited) generate(); else showStale(); }); });
  $('#clearProfile').addEventListener('click', () => { PROFILE_KEYS.forEach(k => delete profile[k]); store.set('profile', profile); fillProfileInputs(); generate(); toast('Profile cleared from this device'); });

  // ── Style ──
  function seg(id, key) {
    $$(`#${id} button`).forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.v === style[key]));
      b.addEventListener('click', () => { style[key] = b.dataset.v; store.set('style', style); $$(`#${id} button`).forEach(x => x.setAttribute('aria-pressed', String(x === b))); edited = false; generate(); });
    });
  }
  seg('fmt', 'format'); seg('tone', 'tone'); seg('len', 'length');
  ['salute', 'closing'].forEach(k => { const el = $('#' + k); el.value = style[k]; el.addEventListener('change', () => { style[k] = el.value; store.set('style', style); edited = false; generate(); }); });
  $('#to').addEventListener('change', () => { $('#toCustom').style.display = $('#to').value === '__custom' ? '' : 'none'; saveTo(); edited = false; generate(); });
  $('#toCustom').addEventListener('input', () => { saveTo(); if (!edited) generate(); });
  $('#toName').addEventListener('input', () => { if (!edited) generate(); });
  $('#ldate').addEventListener('input', () => { if (!edited) generate(); });
  function saveTo() { const m = store.get('to', {}); m[cur.id] = $('#to').value === '__custom' ? $('#toCustom').value : $('#to').value; store.set('to', m); }
  const today = new Date(); $('#ldate').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // ── Generate ──
  const paper = $('#paper'), subjLine = $('#subjLine');
  function opts() {
    const toV = $('#to').value === '__custom' ? $('#toCustom').value.trim() : $('#to').value;
    return {
      tone: style.tone, length: style.length,
      format: style.format === 'auto' ? cur.kind : style.format,
      salute: style.salute, closing: style.closing === 'auto' ? undefined : style.closing,
      to: toV || cur.to, toName: $('#toName').value.trim(), date: $('#ldate').value
    };
  }
  function generate() {
    if (!cur) return;
    const v = Object.assign({}, profile, vals[cur.id] || {});
    last = L.compose(cur, v, opts());
    paper.textContent = last.text;
    paper.classList.toggle('mail', last.format === 'email');
    paper.classList.toggle('hi', cur.lang === 'hi');
    subjLine.classList.toggle('on', last.format === 'email');
    $('#subjText').textContent = last.subject;
    edited = false; $('#edited').classList.remove('on'); $('#stale').style.display = 'none';
    quality();
  }
  function showStale() { $('#stale').style.display = ''; }
  paper.addEventListener('input', () => { edited = true; $('#edited').classList.add('on'); quality(); });
  $('#regen').addEventListener('click', () => { edited = false; generate(); toast('Letter regenerated from your details'); });

  function currentText() { return paper.innerText.replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim(); }
  function quality() {
    const text = currentText();
    const words = text.split(/\s+/).filter(Boolean).length;
    const ph = (text.match(/\[[^\]\n]{1,40}\]/g) || []).length;
    const missing = cur ? cur.fields.filter(f => f.req && !(vals[cur.id] || {})[f.k]).map(f => f.label) : [];
    const noProfile = !profile.name;
    $$('#fields [data-k]').forEach(el => { const f = cur.fields.find(x => x.k === el.dataset.k); el.classList.toggle('miss', !!(f && f.req && !el.value)); });
    const bits = [`<span><b>${words}</b> words</span>`, `<span><b>${Math.max(1, Math.round(words / 200))}</b> min read</span>`];
    if (noProfile) bits.push(`<span class="warn">Add your name in “My profile”</span>`);
    if (missing.length) bits.push(`<span class="warn">Missing: ${esc(missing.slice(0, 3).join(', '))}${missing.length > 3 ? '…' : ''}</span>`);
    if (ph) bits.push(`<span class="warn">${ph} placeholder${ph > 1 ? 's' : ''} like [this] left</span>`);
    if (!noProfile && !missing.length && !ph) bits.push('<span class="ok">✓ Ready to send</span>');
    if (cur && cur.kind === 'email' && words > 220) bits.push('<span class="warn">Long for an email — try “Short”</span>');
    $('#quality').innerHTML = bits.join('');
  }

  // ── Export ──
  function bodyOnly() { return currentText(); }
  function forClipboard() { return last.format === 'email' ? `Subject: ${$('#subjText').textContent}\n\n${bodyOnly()}` : bodyOnly(); }
  function copy(text, msg) {
    const done = () => { toast(msg); saveHistory(); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => fallback());
    else fallback();
    function fallback() { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch { toast('Select the text and copy manually'); } ta.remove(); }
  }
  $('#copyAll').addEventListener('click', () => { copy(forClipboard(), 'Copied ✓'); track('lw_export', { how: 'copy', template: cur.id }); });
  $('#copySubj').addEventListener('click', () => copy($('#subjText').textContent, 'Subject copied ✓'));
  const enc = encodeURIComponent;
  $('#gmail').addEventListener('click', () => { open(`https://mail.google.com/mail/?view=cm&fs=1&su=${enc(last.subject)}&body=${enc(bodyOnly())}`, '_blank', 'noopener'); saveHistory(); track('lw_export', { how: 'gmail', template: cur.id }); });
  $('#outlook').addEventListener('click', () => { open(`https://outlook.live.com/mail/0/deeplink/compose?subject=${enc(last.subject)}&body=${enc(bodyOnly())}`, '_blank', 'noopener'); saveHistory(); track('lw_export', { how: 'outlook', template: cur.id }); });
  $('#mailto').addEventListener('click', () => { location.href = `mailto:?subject=${enc(last.subject)}&body=${enc(bodyOnly())}`; saveHistory(); });
  function fileName(ext) { return `${(cur.id || 'letter')}-${(profile.name || 'student').replace(/\s+/g, '-').toLowerCase()}.${ext}`; }
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); saveHistory(); }
  $('#dlTxt').addEventListener('click', () => { download(new Blob([forClipboard()], { type: 'text/plain;charset=utf-8' }), fileName('txt')); track('lw_export', { how: 'txt', template: cur.id }); });
  $('#dlDoc').addEventListener('click', () => {
    const font = cur.lang === 'hi' ? "'Nirmala UI','Mangal',sans-serif" : last.format === 'email' ? 'Calibri,Arial,sans-serif' : "'Times New Roman',serif";
    const paras = forClipboard().split('\n').map(l => l.trim() ? `<p style="margin:0">${esc(l)}</p>` : '<p style="margin:0">&nbsp;</p>').join('');
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(last.subject)}</title></head><body style="font-family:${font};font-size:12pt;line-height:1.5">${paras}</body></html>`;
    download(new Blob(['﻿' + html], { type: 'application/msword' }), fileName('doc'));
    track('lw_export', { how: 'doc', template: cur.id });
  });
  $('#print').addEventListener('click', () => { saveHistory(); track('lw_export', { how: 'print', template: cur.id }); window.print(); });

  // ── History (last 10, this device only) ──
  function saveHistory() {
    const h = store.get('hist', []);
    const item = { id: cur.id, title: cur.title, subject: last.subject, text: forClipboard(), at: Date.now() };
    const next = [item].concat(h.filter(x => !(x.id === item.id && x.text === item.text))).slice(0, 10);
    store.set('hist', next); renderHist();
  }
  function renderHist() {
    const h = store.get('hist', []);
    $('#histCount').textContent = h.length ? `(${h.length})` : '';
    $('#histList').innerHTML = h.length ? h.map((x, i) => `<li><span title="${esc(x.subject)}">${esc(x.title)} — ${new Date(x.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span><span><button class="btn g sm" data-h="${i}">Open</button></span></li>`).join('') + '<li><span></span><button class="btn g sm" id="histClear">Clear history</button></li>'
      : '<li><span>Letters you copy, download or print appear here (saved only on this device).</span></li>';
  }
  $('#histList').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'histClear') { store.set('hist', []); renderHist(); return; }
    const x = store.get('hist', [])[+b.dataset.h]; if (!x) return;
    if (BY[x.id]) select(x.id);
    paper.textContent = x.text.replace(/^Subject: .*\n\n/, ''); edited = true; $('#edited').classList.add('on'); quality();
    toast('Opened from history');
  });

  // ── Boot ──
  fillProfileInputs();
  renderHist();
  const fromHash = decodeURIComponent(location.hash.replace(/^#(t=)?/, ''));
  select(BY[fromHash] ? fromHash : (store.get('last', '') && BY[store.get('last', '')] ? store.get('last', '') : 'sick-leave'), false);
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (BY[h] && (!cur || cur.id !== h)) { select(h); $('#workspace').scrollIntoView({ behavior: 'smooth' }); } });
  $$('[data-use]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); select(a.dataset.use, true); $('#workspace').scrollIntoView({ behavior: 'smooth' }); }));
})();
