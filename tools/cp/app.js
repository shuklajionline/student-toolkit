/* College Predictor UI. Needs cp/engine.js and cp/finance.js loaded first. No framework, no build step. */
(function () {
  'use strict';
  const E = window.CPEngine, F = window.CPFinance;
  const CFG = Object.assign({ dataBase: 'cp/data/', groqKey: '', cycle: 2027 }, window.CP_CONFIG || {});
  const $ = id => document.getElementById(id);
  const qsa = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const safeUrl = u => (typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : '');
  const reduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const track = (name, params) => { try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) {} };
  const say = msg => { const el = $('liveStatus'); if (el) { el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 30); } };
  const scrollTo = el => { if (el && el.scrollIntoView) el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); };

  /* ───────── Exams ───────── */
  const EXAMS = {
    cuet:   { data: 'cuet', label: 'CUET UG', def: { type: 'score', max: null }, official: 'https://ugadmission.uod.ac.in', info: '<strong>CUET UG</strong>: Delhi University colleges admit through CSAS using normalised CUET scores, round by round, not percentiles. Sourced scores are shown where we have them; older percentile figures are unsourced estimates.' },
    jee:    { data: 'jee-main', label: 'JEE Main', def: { type: 'rank', max: null }, official: 'https://josaa.admissions.nic.in', info: '<strong>JEE Main</strong>: NIT, IIIT and GFTI seats are allotted by JoSAA on rank, with home-state and other-state quotas. Rank data is not loaded yet; the percentile figures are unsourced estimates from the earlier version.' },
    jeeadv: { data: 'jee-adv', label: 'JEE Advanced', def: { type: 'rank', max: null }, official: 'https://josaa.admissions.nic.in', info: '<strong>JEE Advanced</strong>: IIT seats are allotted by JoSAA using JEE Advanced rank. No cutoff data is loaded yet.' },
    cat:    { data: 'cat', label: 'CAT', def: { type: 'percentile', max: 100 }, info: '<strong>CAT</strong>: IIMs shortlist in stages using CAT percentile, sectional cutoffs, academics and more, so one percentile is only a rough guide. Figures here are unsourced estimates.' },
    ipmat:  { data: 'ipmat', label: 'IPMAT', def: { type: 'score', max: null }, info: '<strong>IPMAT</strong>: the IIM Indore and Rohtak five-year programmes. Merit uses scores, not percentiles. Figures here are unsourced estimates.' },
    jipmat: { data: 'jipmat', label: 'JIPMAT', def: { type: 'score', max: null }, info: '<strong>JIPMAT</strong>: the NTA test used for the IIM Jammu and Bodh Gaya five-year programmes. No data is loaded yet.' },
    xat:    { data: 'xat', label: 'XAT', def: { type: 'percentile', max: 100 }, info: '<strong>XAT</strong>: conducted for XLRI and member schools. Figures here are unsourced estimates.' },
    nmat:   { data: 'nmat', label: 'NMAT', def: { type: 'score', max: 360 }, info: '<strong>NMAT by GMAC</strong>: a total score, not a percentile. The 360 maximum is carried over from the earlier version and is not yet confirmed. Figures are unsourced estimates.' },
    mhcet:  { data: 'mah-mba-cet', label: 'MAH-MBA CET', def: { type: 'percentile', max: 100 }, info: '<strong>MAH-MBA/MMS CET</strong>: Maharashtra MBA seats are filled through CAP rounds. Figures here are unsourced estimates.' },
    mhtcet: { data: 'mht-cet', label: 'MHT-CET', def: { type: 'percentile', max: 100 }, info: '<strong>MHT-CET</strong>: Maharashtra engineering and pharmacy admissions through CAP rounds. No data is loaded yet.' },
    clat:   { data: 'clat', label: 'CLAT', def: { type: 'rank', max: null }, official: 'https://consortiumofnlus.ac.in', info: '<strong>CLAT UG</strong>: the Consortium NLUs allot seats by CLAT rank over five rounds. A lower rank is better. NLU Delhi is not in the consortium; it uses AILET.' },
    ailet:  { data: 'ailet', label: 'AILET', def: { type: 'rank', max: null }, info: '<strong>AILET</strong>: NLU Delhi\'s own entrance test. Figures here are unsourced estimates.' },
    nift:   { data: 'nift', label: 'NIFT', def: { type: 'rank', max: null }, info: '<strong>NIFT</strong>: admission is rank-based. Figures here are unsourced estimates.' }
  };
  const RANK_MAX = { jee: 1500000, jeeadv: 60000, clat: 70000, ailet: 15000, nift: 20000 };
  const TIERS = {
    safe:     { label: '✅ Safe',     cls: 'safe',     group: '✅ Safe: likely admission' },
    target:   { label: '🎯 Target',   cls: 'target',   group: '🎯 Target: realistic, apply' },
    reach:    { label: '🚀 Reach',    cls: 'reach',    group: '🚀 Reach: worth a try' },
    unlikely: { label: 'Unlikely',    cls: 'unlikely', group: 'Unlikely on current data' }
  };
  const STATUS_LABEL = { official: 'Official', cited: 'Cited', estimated: 'Estimated' };
  const STATUS_CLS = { official: 'tag-official', cited: 'tag-cited', estimated: 'tag-est' };
  const TYPE_LABEL = { govt: 'Govt', pvt: 'Private', iim: 'IIM', iit: 'IIT', nit: 'NIT', iiit: 'IIIT', gfti: 'GFTI', nlu: 'NLU', deemed: 'Deemed' };
  const CAT_OPTS = { general: 'UR', obc: 'OBC', sc: 'SC', st: 'ST', ews: 'EWS' };

  /* ───────── State ───────── */
  const S = { exam: 'cuet', mode: EXAMS.cuet.def, modes: [], data: {}, colleges: [], byId: new Map(), results: [], view: 'list', compare: [], saved: [], savedMeta: {},
    loadSeq: 0, aliases: null, dialog: null, ranOnce: false, lastFilterNote: '' };

  /* ───────── Storage (cp_saved keeps working; entries may be old names or new ids) ───────── */
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function loadSaved() {
    const a = store.get('cp_saved', []); S.saved = Array.isArray(a) ? a.filter(x => typeof x === 'string') : [];
    const m = store.get('cp_saved_meta', {}); S.savedMeta = m && typeof m === 'object' && !Array.isArray(m) ? m : {};
  }
  const persistSaved = () => { store.set('cp_saved', S.saved); store.set('cp_saved_meta', S.savedMeta); };
  const isSaved = c => S.saved.includes(c.id) || S.saved.includes(c.name);

  /* ───────── Data loading ───────── */
  async function fetchJSON(url) {
    const r = await fetch(url);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  async function getAliases() {
    if (S.aliases) return S.aliases;
    try { const a = await fetchJSON(CFG.dataBase + 'aliases.json'); S.aliases = (a && a.supersededBy) || {}; } catch (e) { S.aliases = {}; }
    return S.aliases;
  }
  function claimsOf(c) {
    const lc = c.legacyClaims || {};
    let fees = null, pkg = null;
    if (c.fees && c.fees.basis === 'total') fees = c.fees.amount / 100000;
    else if (typeof lc.feesLakh === 'number') fees = lc.feesLakh;
    if (c.avgPackage && typeof c.avgPackage.value === 'number') pkg = c.avgPackage.value; else if (typeof lc.avgPackageLpa === 'number') pkg = lc.avgPackageLpa;
    const verified = !!(c.fees && c.fees.source_url);
    return { fees, pkg, verified, perYear: c.fees && c.fees.basis === 'per_year' ? c.fees : null };
  }
  function summariseModes(colleges) {
    const m = new Map();
    colleges.forEach(c => (c.cutoffHistory || []).forEach(h => {
      if (!h.scale) return; const k = h.scale.type + '|' + (h.scale.max == null ? '' : h.scale.max);
      const e = m.get(k) || { type: h.scale.type, max: h.scale.max == null ? null : h.scale.max, sourced: 0, est: 0 };
      if (h.status === 'estimated') e.est++; else e.sourced++; m.set(k, e);
    }));
    return [...m.values()].sort((a, b) => (b.sourced - a.sourced) || (b.est - a.est));
  }
  async function loadExam(key) {
    const hit = S.data[key]; if (hit && hit.state !== 'error') return hit;
    const d = EXAMS[key].data;
    try {
      const [real, legacy, aliases] = await Promise.all([fetchJSON(CFG.dataBase + d + '.json'), fetchJSON(CFG.dataBase + 'legacy/' + d + '.json'), getAliases()]);
      const realList = (real && real.colleges) || [];
      const realIds = new Set(realList.map(c => c.id));
      const legacyList = ((legacy && legacy.colleges) || []).filter(c => !(aliases[c.id] && realIds.has(aliases[c.id])));
      const seen = new Set();
      const colleges = realList.concat(legacyList).filter(c => c && c.id && !seen.has(c.id) && seen.add(c.id));   // first record wins if an id repeats
      const rec = { state: colleges.length ? 'ok' : 'empty', colleges, modes: summariseModes(colleges), sourced: realList.length, estimated: legacyList.length,
        years: [...new Set(realList.flatMap(c => (c.cutoffHistory || []).map(h => h.year)))].sort() };
      S.data[key] = rec; migrateSavedNames(colleges); return rec;
    } catch (e) { const rec = { state: 'error', colleges: [], modes: [], error: e.message }; S.data[key] = rec; return rec; }
  }
  function migrateSavedNames(colleges) { // old cp_saved held names; swap in ids once we can resolve them
    let changed = false;
    S.saved = S.saved.map(entry => {
      if (S.savedMeta[entry]) return entry;
      const c = colleges.find(x => x.name === entry); if (!c) return entry;
      S.savedMeta[c.id] = { name: c.name, course: c.course, exam: c.exam, city: c.city || '' }; changed = true; return c.id;
    });
    S.saved = S.saved.filter((x, i) => S.saved.indexOf(x) === i);
    if (changed) { persistSaved(); renderSaved(); }
  }

  /* ───────── Score input ───────── */
  function rangeFor(mode) {
    if (mode.type === 'percentile') return { min: 50, max: 100, step: 0.1, def: 90, log: false, label: 'Your percentile', unit: '%ile', help: 'Between 0 and 100. You can type below 50 as well.' };
    if (mode.type === 'rank') { const mx = RANK_MAX[S.exam] || 100000; return { min: 1, max: mx, step: 1, def: Math.round(Math.sqrt(mx)), log: true, label: 'Your rank (lower is better)', unit: 'rank', help: 'A whole number, 1 or more. The slider is stretched so small ranks are easy to set.' }; }
    const mx = mode.max || 1000; return { min: 0, max: mx, step: mx > 400 ? 1 : 0.5, def: Math.round(mx * 0.7), log: false, label: mode.max ? 'Your score (out of ' + mode.max + ')' : 'Your score', unit: mode.max ? '/' + mode.max : 'score', help: mode.max ? 'Between 0 and ' + mode.max + '.' : 'Use the same score scale the college publishes.' };
  }
  let R = rangeFor(EXAMS.cuet.def);
  const fmtVal = v => R.unit === 'rank' ? String(Math.round(v)) : (Math.round(v * 100) / 100).toString();
  function sliderToValue(t) {
    if (R.log) { const a = Math.log(R.min), b = Math.log(R.max); return Math.round(Math.exp(a + (t / 1000) * (b - a))); }
    return Number(t);
  }
  function valueToSlider(v) {
    if (R.log) { const a = Math.log(R.min), b = Math.log(R.max); const x = Math.min(Math.max(v, R.min), R.max); return Math.round(((Math.log(x) - a) / (b - a)) * 1000); }
    return Math.min(Math.max(v, R.min), R.max);
  }
  function configureInputs(keepValue) {
    R = rangeFor(S.mode);
    const sl = $('percentileSlider');
    if (R.log) { sl.min = 0; sl.max = 1000; sl.step = 1; } else { sl.min = R.min; sl.max = R.max; sl.step = R.step; }
    const input = $('scoreInput'); input.step = R.unit === 'rank' ? '1' : 'any';
    if (!keepValue) { input.value = fmtVal(R.def); sl.value = valueToSlider(R.def); }
    $('scoreLabel').textContent = R.label; $('scoreUnit').textContent = R.unit; $('scoreHelp').textContent = R.help;
    $('sliderVal').textContent = fmtVal(Number(input.value) || R.def);
    const hints = R.log ? [1, 10, 100, 1000, 10000, 100000].filter(x => x <= R.max).concat([R.max]) : R.unit === '%ile' ? [50, 65, 75, 85, 95, 100] : [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(R.max * f));
    $('rangeHints').innerHTML = [...new Set(hints)].map(h => '<span>' + esc(h >= 1000 && R.log ? (h / 1000) + 'k' : h) + '</span>').join('');
  }
  function onSlider() { const v = sliderToValue($('percentileSlider').value); $('scoreInput').value = fmtVal(v); $('sliderVal').textContent = fmtVal(v); whatIf(); }
  function onNumber() { const raw = $('scoreInput').value; const v = Number(raw); if (raw !== '' && isFinite(v)) { $('percentileSlider').value = valueToSlider(v); $('sliderVal').textContent = fmtVal(v); } whatIf(); }
  let whatIfTimer = null;
  function whatIf() { if (!S.ranOnce || $('resultsWrap').classList.contains('show') === false) return; clearTimeout(whatIfTimer); whatIfTimer = setTimeout(() => predict({ silent: true }), 160); }

  /* ───────── Exam switching ───────── */
  function setFormError(msg) { const el = $('formError'); el.textContent = msg || ''; $('scoreInput').setAttribute('aria-invalid', msg ? 'true' : 'false'); }
  async function switchExam(key, opts) {
    opts = opts || {};
    if (!EXAMS[key]) return;
    const seq = ++S.loadSeq; S.exam = key;
    qsa('.exam-tab').forEach(t => { const on = t.dataset.exam === key; t.classList.toggle('active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
    $('predictorPanel').setAttribute('aria-labelledby', 'tab-' + key);
    $('examInfo').innerHTML = EXAMS[key].info;
    $('resultsWrap').classList.remove('show'); $('shareRow').classList.remove('show'); S.results = []; S.ranOnce = false; S.compare = []; updateCompareBar(); setFormError('');
    $('dataStatus').innerHTML = '<span class="pill pill-none">Loading data…</span>';
    S.mode = EXAMS[key].def; configureInputs(false);
    if (!opts.initial) track('exam_switch', { exam: key });
    const rec = await loadExam(key);
    if (seq !== S.loadSeq) return;                       // user switched again while loading
    S.colleges = rec.colleges; S.byId = new Map(rec.colleges.map(c => [c.id, c]));
    S.modes = rec.modes;
    if (rec.modes.length) { S.mode = { type: rec.modes[0].type, max: rec.modes[0].max }; }
    renderModeSelect(); configureInputs(false); renderDataStatus(rec);
    return rec;
  }
  function renderModeSelect() {
    const row = $('scoreModeRow'), sel = $('scoreMode');
    if (S.modes.length < 2) { row.hidden = true; sel.innerHTML = ''; return; }
    const name = m => (m.type === 'percentile' ? 'Percentile' : m.type === 'rank' ? 'Rank' : m.type === 'marks' ? 'Marks' : 'Score') + (m.max ? ' (out of ' + m.max + ')' : '');
    sel.innerHTML = S.modes.map((m, i) => '<option value="' + i + '">' + esc(name(m)) + (m.sourced ? '' : ' (estimated data only)') + '</option>').join('');
    sel.value = '0'; row.hidden = false;
  }
  function renderDataStatus(rec) {
    const ex = EXAMS[S.exam], el = $('dataStatus'); const link = safeUrl(ex.official) ? ' <a href="' + esc(safeUrl(ex.official)) + '" target="_blank" rel="noopener">Official source ↗</a>' : '';
    if (rec.state === 'error') { el.innerHTML = '<span class="pill pill-est">Could not load data</span> ' + esc(rec.error || '') + ' <button type="button" class="cc-action-btn" data-action="retry">Try again</button>'; return; }
    if (rec.state === 'empty') { el.innerHTML = '<span class="pill pill-none">No cutoff data yet</span> We only show numbers we can source.' + link; return; }
    const parts = [];
    if (rec.sourced) parts.push('<span class="pill pill-cited">' + rec.sourced + ' with cited cutoffs' + (rec.years.length ? ' (' + rec.years.join(', ') + ')' : '') + '</span>');
    if (rec.estimated) parts.push('<span class="pill pill-est">' + rec.estimated + ' estimated</span>');
    el.innerHTML = parts.join(' ') + link;
  }

  /* ───────── Filters + profile ───────── */
  function readProfile() {
    const raw = $('scoreInput').value.trim(), home = $('homeState').value;
    return { scores: [{ type: S.mode.type, value: raw === '' ? NaN : Number(raw), max: S.mode.max }], category: CAT_OPTS[$('category').value] || 'UR',
      gender: $('gender').value === 'female' ? 'female' : 'male', pwd: $('pwd').checked, homeState: (home === 'any' || home === 'other') ? null : home, targetYear: CFG.cycle };
  }
  function applyFilters(list) {
    const cf = $('courseFilter').value, tf = $('typeFilter').value, ff = $('feesFilter').value, pf = parseFloat($('pkgFilter').value) || 0;
    let unknownFee = 0;
    const out = list.filter(c => {
      const cl = String(c.course || '').toLowerCase();
      if (cf === 'bba' && !/bba|bms/.test(cl)) return false;
      if (cf === 'bcom' && !/b\.com|bcom/.test(cl)) return false;
      if (cf === 'mba' && !/mba|pgdm|pgpm|mms/.test(cl)) return false;
      if (cf === 'btech' && !/b\.tech|\bbe\b|engineering|computer|civil|mechanical|electrical|technology/.test(cl)) return false;
      if (cf === 'ipm' && !/ipm|5-year|five-year/.test(cl)) return false;
      if (cf === 'law' && !/llb|law/.test(cl)) return false;
      if (cf === 'design' && !/des|design|ftech/.test(cl)) return false;
      if (tf !== 'all' && c.type !== tf) return false;
      const cl2 = claimsOf(c);
      if (ff !== 'any') { if (cl2.fees == null) unknownFee++; else if (cl2.fees > parseFloat(ff)) return false; }
      if (pf > 0 && cl2.pkg != null && cl2.pkg < pf) return false;
      return true;
    });
    S.lastFilterNote = unknownFee ? unknownFee + ' college' + (unknownFee > 1 ? 's have' : ' has') + ' no fee data and ' + (unknownFee > 1 ? 'were' : 'was') + ' kept.' : '';
    return out;
  }

  /* ───────── Predict ───────── */
  const pctText = r => { if (r.low >= 0.95) return '>95% chance'; if (r.high <= 0.05) return '<5% chance'; const a = Math.round(r.low * 20) * 5, b = Math.round(r.high * 20) * 5; return a === b ? 'about ' + a + '% chance' : a + '–' + b + '% chance'; };
  const cutoffText = r => r.scoreType === 'rank' ? 'Rank ~' + r.expectedCutoff : r.scoreType === 'percentile' ? r.expectedCutoff + ' %ile' : String(r.expectedCutoff);
  const unitWord = r => r.scoreType === 'rank' ? 'rank' : r.scoreType === 'percentile' ? 'percentile' : 'score';
  function needText(r) {
    const n = r.marksNeeded; if (!n) return '';
    if (!n.reachable) return 'An 80% chance is not reachable on this scale for this college.';
    if (r.scoreType === 'rank') return n.gap <= 0 ? 'You are already past the 80%-chance mark (rank ' + n.value + ').' : 'For an 80% chance you would need rank ' + n.value + ' or better.';
    return n.gap <= 0 ? 'You are already past the 80%-chance mark (' + n.value + ').' : 'For an 80% chance you would need about ' + n.value + ' (' + n.gap + ' more than now).';
  }
  function showSkeleton() { $('resultsWrap').classList.add('show'); $('collegeList').setAttribute('aria-busy', 'true'); $('collegeList').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>'; }
  async function predict(opts) {
    opts = opts || {};
    const profile = readProfile(), errs = E.validateProfile(profile);
    if (errs.length) { setFormError(isNaN(profile.scores[0].value) ? 'Enter your score to continue.' : errs[0]); if (!opts.silent) $('scoreInput').focus(); return; }
    setFormError('');
    const btn = $('predictBtn');
    if (!opts.silent) { btn.setAttribute('aria-busy', 'true'); $('predictBtnText').textContent = 'Searching…'; }
    let rec = S.data[S.exam];
    if (!rec || rec.state === 'error') { if (!opts.silent) showSkeleton(); rec = await loadExam(S.exam); S.colleges = rec.colleges; S.byId = new Map(rec.colleges.map(c => [c.id, c])); renderDataStatus(rec); }
    btn.removeAttribute('aria-busy'); $('predictBtnText').textContent = 'Predict my colleges';
    $('collegeList').removeAttribute('aria-busy');
    S.ranOnce = true;
    if (rec.state !== 'ok') { S.results = []; renderResults(profile, rec); showResultsArea(opts); return; }
    const res = E.predictAll(applyFilters(S.colleges), profile);
    if (res.errors.length) { setFormError(res.errors[0]); return; }
    S.results = res.results.map(r => Object.assign({}, r, { college: S.byId.get(r.id) }));
    renderResults(profile, rec); showResultsArea(opts);
    syncUrl();
    if (!opts.silent) {
      const c = t => S.results.filter(r => r.tier === t).length;
      track('predict_run', { exam: S.exam, mode: S.mode.type, safe: c('safe'), target: c('target'), reach: c('reach') });
      say('Found ' + (c('safe') + c('target') + c('reach')) + ' colleges: ' + c('safe') + ' safe, ' + c('target') + ' target, ' + c('reach') + ' reach.');
    }
  }
  function showResultsArea(opts) {
    $('resultsWrap').classList.add('show'); $('shareRow').classList.add('show');
    if (!opts.silent && !opts.noScroll) { scrollTo($('resultsWrap')); $('resultsWrap').focus({ preventScroll: true }); }
  }

  /* ───────── Rendering results ───────── */
  const claimsLine = c => { const k = claimsOf(c); const parts = [];
    if (k.fees != null) parts.push('Fees ~₹' + k.fees + 'L' + (k.verified ? '' : ' (unverified)'));
    if (k.pkg != null) parts.push('Avg ~₹' + k.pkg + 'L' + (c.avgPackage && c.avgPackage.source_url ? '' : ' (unverified)'));
    return parts.join(' · '); };
  function sortResults(list) {
    const by = $('sortSelect').value, rank = r => r.scoreType === 'rank', cl = r => claimsOf(r.college || {});
    const n = (v, d) => (v == null ? d : v), arr = list.slice();
    const tierIdx = { safe: 0, target: 1, reach: 2, unlikely: 3 };
    if (by === 'chance') arr.sort((a, b) => tierIdx[a.tier] - tierIdx[b.tier] || b.central - a.central);
    else if (by === 'cutoff') arr.sort((a, b) => (rank(a) ? a.expectedCutoff - b.expectedCutoff : b.expectedCutoff - a.expectedCutoff));
    else if (by === 'pkg') arr.sort((a, b) => n(cl(b).pkg, -1) - n(cl(a).pkg, -1));
    else if (by === 'fees') arr.sort((a, b) => n(cl(a).fees, 1e9) - n(cl(b).fees, 1e9));
    else if (by === 'roi') arr.sort((a, b) => { const f = x => (cl(x).pkg != null && cl(x).fees ? cl(x).pkg / Math.max(cl(x).fees, 0.1) : -1); return f(b) - f(a); });
    else arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }
  function badge(r) { return '<span class="cc-tag ' + STATUS_CLS[r.dataQuality] + '" title="' + (r.dataQuality === 'estimated' ? 'No source: treat as a rough guide' : 'Source linked in the details') + '">' + STATUS_LABEL[r.dataQuality] + '</span>'; }
  function cardHTML(r, i) {
    const c = r.college || {}, t = TIERS[r.tier], saved = isSaved(c), inCmp = S.compare.includes(r.id), cid = 'card-' + r.id;
    const typeTag = c.type && TYPE_LABEL[c.type] ? '<span class="cc-tag tag-' + (['govt', 'pvt', 'iim', 'nit', 'nlu', 'iit'].includes(c.type) ? c.type : 'pvt') + '">' + TYPE_LABEL[c.type] + '</span>' : '';
    const claims = claimsLine(c);
    return '<article class="college-card chance-' + t.cls + '-card' + (saved ? ' saved-card' : '') + (inCmp ? ' selected' : '') + '" id="' + esc(cid) + '" aria-label="' + esc(r.name) + '">' +
      '<div class="cc-main"><div class="cc-rank" aria-hidden="true">' + i + '</div>' +
      '<div class="cc-body"><div class="cc-name">' + esc(r.name) + typeTag + badge(r) + '</div>' +
      '<div class="cc-sub"><span>' + esc(r.course) + '</span>' + (c.city ? '<span>📍 ' + esc(c.city) + '</span>' : '') + (claims ? '<span>' + esc(claims) + '</span>' : '') + '</div>' +
      '<p class="cc-why">' + esc(r.explanation) + '</p><p class="cc-need">' + esc(needText(r)) + '</p></div>' +
      '<div class="cc-right"><div><div class="cc-cutoff">' + esc(cutoffText(r)) + '</div><div class="cc-cutoff-lbl">Expected cutoff</div></div>' +
      '<div><span class="cc-chance chance-' + t.cls + '">' + t.label + '</span><div class="cc-prob">' + pctText(r) + '</div></div></div></div>' +
      '<div class="cc-card-actions"><button type="button" class="cc-action-btn" data-action="details" data-id="' + esc(r.id) + '">📈 Details &amp; history</button>' +
      '<button type="button" class="cc-action-btn" data-action="save" data-id="' + esc(r.id) + '" aria-pressed="' + saved + '">' + (saved ? '★ Saved' : '☆ Save') + '<span class="sr-only"> ' + esc(r.name) + '</span></button>' +
      '<button type="button" class="cc-action-btn compare-add" data-action="compare" data-id="' + esc(r.id) + '" aria-pressed="' + inCmp + '">' + (inCmp ? '✓ In compare' : '⚖️ Compare') + '<span class="sr-only"> ' + esc(r.name) + '</span></button></div></article>';
  }
  function compactHTML(r, i) {
    const t = TIERS[r.tier];
    return '<div class="college-card chance-' + t.cls + '-card" style="padding:10px 14px;display:grid;grid-template-columns:28px 1fr auto;gap:8px;align-items:center;margin-bottom:5px">' +
      '<span class="cc-rank" aria-hidden="true">' + i + '</span><div><div style="font-size:13.5px;font-weight:700">' + esc(r.name) + ' ' + badge(r) + '</div><div class="cc-sub">' + esc(r.course) + ' · ' + esc(cutoffText(r)) + ' · ' + pctText(r) + '</div></div>' +
      '<button type="button" class="cc-action-btn" data-action="details" data-id="' + esc(r.id) + '">Details</button></div>';
  }
  function renderResults(profile, rec) {
    const list = $('collegeList'), exam = EXAMS[S.exam], s0 = profile.scores[0];
    $('resultsTitle').textContent = exam.label + ' ' + fmtVal(s0.value) + (R.unit === 'rank' ? ' (rank)' : R.unit === '%ile' ? ' %ile' : ' ' + R.unit) + ': your college matches';
    if (rec.state === 'error') { $('resultsMeta').textContent = ''; $('resultsChips').innerHTML = '';
      list.innerHTML = '<div class="no-results"><span class="icon" aria-hidden="true">⚠️</span><strong>We could not load the data</strong><span>Check your connection and try again.</span><br/><button type="button" class="cc-action-btn" data-action="retry">Try again</button></div>'; return; }
    if (rec.state === 'empty') { $('resultsMeta').textContent = ''; $('resultsChips').innerHTML = '';
      const link = exam.official ? ' Official source: <a href="' + esc(exam.official) + '" target="_blank" rel="noopener">' + esc(exam.official.replace('https://', '')) + '</a>.' : '';
      list.innerHTML = '<div class="no-results"><span class="icon" aria-hidden="true">🗂️</span><strong>No cutoff data for ' + esc(exam.label) + ' yet</strong><span>We only show numbers we can source, so there is nothing to predict from.' + link + '</span></div>'; return; }
    const cat = $('category').options[$('category').selectedIndex].text;
    const ok = S.results.filter(r => r.status === 'ok'), inc = S.results.filter(r => r.status === 'incomparable'), nod = S.results.filter(r => r.status === 'nodata').length;
    const cnt = t => ok.filter(r => r.tier === t).length;
    $('resultsMeta').textContent = cat + (profile.pwd ? ' + PwD' : '') + ' · ' + (profile.gender === 'female' ? 'female' : 'male/other') + ' · ' + ok.length + ' colleges predicted' + (S.lastFilterNote ? ' · ' + S.lastFilterNote : '') + (nod ? ' · ' + nod + ' without data' : '');
    $('resultsChips').innerHTML = ['safe', 'target', 'reach', 'unlikely'].filter(t => cnt(t)).map(t => '<span class="results-chip chip-' + (t === 'target' ? 'target' : t === 'unlikely' ? 'unlikely' : t) + '">' + TIERS[t].label + ' ' + cnt(t) + '</span>').join('');
    if (!ok.length && !inc.length) { list.innerHTML = '<div class="no-results"><span class="icon" aria-hidden="true">🔎</span><strong>No colleges match these filters</strong><span>Loosen the course, type or fee filters.</span></div>'; return; }
    const sorted = sortResults(ok); let html = '';
    if (S.view === 'compact') html += sorted.map((r, i) => compactHTML(r, i + 1)).join('');
    else ['safe', 'target', 'reach'].forEach(t => { const g = sorted.filter(r => r.tier === t); if (g.length) html += '<section class="tier-group" aria-label="' + esc(TIERS[t].group) + '"><h3 class="tier-label">' + esc(TIERS[t].group) + ' · ' + g.length + '</h3>' + g.map((r, i) => cardHTML(r, i + 1)).join('') + '</section>'; });
    const un = sorted.filter(r => r.tier === 'unlikely');
    if (S.view !== 'compact' && un.length) html += '<details class="tier-details"><summary>Unlikely on current data · ' + un.length + '</summary>' + un.map((r, i) => cardHTML(r, i + 1)).join('') + '</details>';
    if (!sorted.some(r => r.tier !== 'unlikely') && un.length) html = '<p class="whatif-note">None of these are Safe, Target or Reach for your score. Raise the score slider to see what changes, or open the group below.</p>' + html;
    if (inc.length) html += '<details class="tier-details"><summary>Different score scale · ' + inc.length + '</summary><p class="whatif-note">These colleges publish cutoffs on a scale other than the one you selected, and no documented conversion exists. Pick another score type above to include them.</p>' + inc.map(r => '<p class="cc-sub">' + esc(r.name) + ' · ' + esc(r.course) + '</p>').join('') + '</details>';
    list.innerHTML = html;
  }
  function rerender() { if (S.ranOnce && S.data[S.exam] && S.data[S.exam].state === 'ok') renderResults(readProfile(), S.data[S.exam]); }

  /* ───────── Save / shortlist ───────── */
  function toggleSave(id) {
    const c = S.byId.get(id); if (!c) return;
    const had = isSaved(c);
    if (had) { S.saved = S.saved.filter(x => x !== c.id && x !== c.name); delete S.savedMeta[c.id]; }
    else { S.saved.push(c.id); S.savedMeta[c.id] = { name: c.name, course: c.course, exam: S.exam, city: c.city || '' }; }
    persistSaved(); track('save', { action: had ? 'remove' : 'add', exam: S.exam }); rerender(); renderSaved();
    const btn = document.querySelector('[data-action="save"][data-id="' + CSS.escape(id) + '"]'); if (btn) btn.focus();
    say((had ? 'Removed ' : 'Saved ') + c.name);
  }
  function savedEntry(entry) { const m = S.savedMeta[entry]; const r = S.results.find(x => x.id === entry || (x.college && x.college.name === entry));
    return { key: entry, name: m ? m.name : entry, sub: m ? [m.course, EXAMS[m.exam] ? EXAMS[m.exam].label : m.exam, m.city].filter(Boolean).join(' · ') : '', res: r }; }
  let dragFrom = -1;
  function renderSaved(focusSel) {
    const panel = $('savedPanel'), list = $('savedList');
    if (!S.saved.length) { panel.classList.remove('show'); list.innerHTML = ''; return; }
    panel.classList.add('show'); $('savedCount').textContent = '(' + S.saved.length + ')';
    list.innerHTML = S.saved.map((e, i) => { const d = savedEntry(e);
      return '<li class="saved-item" draggable="true" data-index="' + i + '"><span class="drag-handle" aria-hidden="true">⠿</span><span class="saved-n" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="saved-name">' + esc(d.name) + (d.sub ? '<small>' + esc(d.sub) + '</small>' : '') + '</span><span class="saved-btns">' +
        '<button type="button" data-move="up" data-index="' + i + '" aria-label="Move ' + esc(d.name) + ' up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" data-move="down" data-index="' + i + '" aria-label="Move ' + esc(d.name) + ' down"' + (i === S.saved.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button type="button" data-move="remove" data-index="' + i + '" aria-label="Remove ' + esc(d.name) + ' from shortlist">×</button></span></li>'; }).join('');
    if (focusSel) { const el = list.querySelector(focusSel); if (el) el.focus(); }
  }
  function moveSaved(from, to) { if (from === to || from < 0 || to < 0 || from >= S.saved.length || to >= S.saved.length) return; const [x] = S.saved.splice(from, 1); S.saved.splice(to, 0, x); persistSaved(); }
  function shortlistText() { return S.saved.map((e, i) => { const d = savedEntry(e); return (i + 1) + '. ' + d.name + (d.sub ? ' (' + d.sub + ')' : '') + (d.res ? ' - ' + TIERS[d.res.tier].label.replace(/^\S+\s/, '') + ', ' + pctText(d.res) : ''); }).join('\n'); }
  function printShortlist() {
    const rows = S.saved.map((e, i) => { const d = savedEntry(e), r = d.res; const src = r && r.series && r.series.length ? r.series[r.series.length - 1].source_url : '';
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(d.name) + '</td><td>' + esc(d.sub) + '</td><td>' + (r ? esc(TIERS[r.tier].label.replace(/^\S+\s/, '') + ' · ' + pctText(r)) : 'Run a prediction') + '</td><td>' + (r ? esc(cutoffText(r) + ' (' + STATUS_LABEL[r.dataQuality] + ')') : '') + '</td><td>' + esc(src || '') + '</td></tr>'; }).join('');
    $('printArea').innerHTML = '<h1>My college shortlist</h1><p>Prepared with the Student Toolkit College Predictor for the ' + CFG.cycle + ' cycle. Predictions are estimates, not guarantees. Verify every cutoff on the official site.</p><table><thead><tr><th>#</th><th>College</th><th>Course · exam · city</th><th>Your chance</th><th>Expected cutoff</th><th>Source</th></tr></thead><tbody>' + rows + '</tbody></table>';
    track('share', { method: 'pdf' }); window.print();
  }

  /* ───────── Dialogs (focus trap, Esc, restore focus) ───────── */
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const BACKGROUND = ['nav', '.hero', '.predictor-wrap', '.legacy-notice', '.seo-section', 'footer'];
  function setBackground(inert) { BACKGROUND.forEach(sel => qsa(sel).forEach(n => { if (inert) { n.setAttribute('inert', ''); n.setAttribute('aria-hidden', 'true'); } else { n.removeAttribute('inert'); n.removeAttribute('aria-hidden'); } })); }
  function openDialog(el, backdrop, opener) {
    if (S.dialog) closeDialog();
    S.dialog = { el, backdrop, opener };
    el.hidden = false; if (backdrop) backdrop.hidden = false; document.body.style.overflow = 'hidden'; setBackground(true);
    const f = qsa(FOCUSABLE, el); (f[0] || el).focus();
  }
  function closeDialog() {
    const d = S.dialog; if (!d) return;
    d.el.hidden = true; if (d.backdrop) d.backdrop.hidden = true; document.body.style.overflow = ''; setBackground(false); S.dialog = null;
    if (d.opener && document.contains(d.opener)) d.opener.focus();
  }
  function trapKeys(e) {
    if (!S.dialog) return;
    if (e.key === 'Escape') { e.preventDefault(); closeDialog(); return; }
    if (e.key !== 'Tab') return;
    const f = qsa(FOCUSABLE, S.dialog.el).filter(n => !n.closest('[hidden]')); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ───────── Compare (up to 4) ───────── */
  const nameOf = id => { const r = S.results.find(x => x.id === id); return r ? r.name : id; };
  function compareHint(msg) { const el = $('compareNames'); el.textContent = msg; say(msg); setTimeout(updateCompareBar, 2500); }
  function updateCompareBar() { const bar = $('compareBar'); bar.classList.toggle('show', S.compare.length > 0); $('compareNames').textContent = S.compare.map(nameOf).join(' vs '); }
  function toggleCompare(id) {
    const i = S.compare.indexOf(id);
    if (i >= 0) S.compare.splice(i, 1);
    else if (S.compare.length >= 4) { compareHint('You can compare up to 4 colleges. Remove one first.'); return; }
    else S.compare.push(id);
    updateCompareBar(); rerender(); track('compare', { n: S.compare.length });
    const btn = document.querySelector('[data-action="compare"][data-id="' + CSS.escape(id) + '"]'); if (btn) btn.focus();
  }
  function openCompare(opener) {
    if (S.compare.length < 2) { compareHint('Pick at least 2 colleges to compare.'); return; }
    const cols = S.compare.map(id => S.results.find(r => r.id === id)).filter(Boolean); if (cols.length < 2) return;
    const best = Math.max(...cols.map(c => c.central));
    const rows = [
      ['Course', c => c.course], ['City', c => (c.college && c.college.city) || '—'], ['Type', c => (c.college && TYPE_LABEL[c.college.type]) || '—'],
      ['Expected cutoff', c => cutoffText(c)], ['Your chance', c => TIERS[c.tier].label.replace(/^\S+\s/, '') + ', ' + pctText(c), c => (c.central === best ? 'best-val' : '')],
      ['80%-chance mark', c => needText(c).replace(/^For an 80% chance you would need /, '')], ['Data quality', c => STATUS_LABEL[c.dataQuality]],
      ['Years of data', c => c.dataQuality === 'estimated' ? 'none (estimate only)' : c.series.map(s => s.year).join(', ')],
      ['Fees (unverified unless sourced)', c => { const k = claimsOf(c.college || {}); return k.fees != null ? '₹' + k.fees + 'L' : '—'; }],
      ['Avg package (unverified unless sourced)', c => { const k = claimsOf(c.college || {}); return k.pkg != null ? '₹' + k.pkg + 'L' : '—'; }]
    ];
    $('compareTable').innerHTML = '<thead><tr><th scope="col">Metric</th>' + cols.map(c => '<th scope="col">' + esc(c.name) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(rw => '<tr><th scope="row" class="row-label">' + esc(rw[0]) + '</th>' + cols.map(c => '<td class="' + (rw[2] ? rw[2](c) : '') + '">' + esc(rw[1](c)) + '</td>').join('') + '</tr>').join('') + '</tbody>';
    openDialog($('compareModal'), null, opener);
  }

  /* ───────── Drawer: details + cutoff history chart ───────── */
  const fmtAxis = (v, type) => type === 'rank' ? String(Math.round(v)) : (Math.round(v * 100) / 100).toString();
  function chartHTML(r) {
    const pts = r.series.filter(p => p.status !== 'estimated'); if (!pts.length) return '<p>Only an unsourced estimate exists for this college, so there is no history to chart.</p>';
    const type = r.scoreType, sg = type === 'rank' ? -1 : 1, W = 320, H = 180, L = 46, Rr = 14, T = 14, B = 30;
    const ax = v => sg * E.toAxis(v, type);
    const years = pts.map(p => p.year).concat([CFG.cycle]); let x0 = Math.min(...years), x1 = Math.max(...years); if (x0 === x1) { x0 -= 1; x1 += 1; }
    const vals = pts.map(p => ax(p.value)).concat([ax(r.expectedCutoff), ax(r.userValue)]); let y0 = Math.min(...vals), y1 = Math.max(...vals); const pad = (y1 - y0) * 0.15 || 0.2; y0 -= pad; y1 += pad;
    const X = x => L + ((x - x0) / (x1 - x0)) * (W - L - Rr), Y = a => T + (1 - (a - y0) / (y1 - y0)) * (H - T - B);
    const back = a => E.fromAxis(sg * a, type);
    const line = pts.length > 1 ? '<polyline class="chart-line" points="' + pts.map(p => X(p.year).toFixed(1) + ',' + Y(ax(p.value)).toFixed(1)).join(' ') + '"/>' : '';
    const dots = pts.map(p => '<circle class="chart-dot" cx="' + X(p.year).toFixed(1) + '" cy="' + Y(ax(p.value)).toFixed(1) + '" r="4"/><text class="chart-txt" x="' + X(p.year).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' + p.year + '</text>').join('');
    const fx = X(CFG.cycle).toFixed(1), fy = Y(ax(r.expectedCutoff)).toFixed(1), uy = Y(ax(r.userValue)).toFixed(1);
    const desc = 'Closing cutoffs: ' + pts.map(p => p.year + ': ' + fmtAxis(p.value, type)).join(', ') + '. Expected ' + CFG.cycle + ': ' + fmtAxis(r.expectedCutoff, type) + '. Your ' + unitWord(r) + ': ' + fmtAxis(r.userValue, type) + '. ' + (type === 'rank' ? 'Higher on the chart means a better (lower) rank.' : 'Higher on the chart means a higher score.');
    return '<div class="chart-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-labelledby="chTitle chDesc"><title id="chTitle">Cutoff history</title><desc id="chDesc">' + esc(desc) + '</desc>' +
      '<line class="chart-axis" x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (H - B) + '"/><line class="chart-axis" x1="' + L + '" y1="' + (H - B) + '" x2="' + (W - Rr) + '" y2="' + (H - B) + '"/>' +
      '<text class="chart-txt" x="' + (L - 6) + '" y="' + (T + 8) + '" text-anchor="end">' + esc(fmtAxis(back(y1), type)) + '</text><text class="chart-txt" x="' + (L - 6) + '" y="' + (H - B) + '" text-anchor="end">' + esc(fmtAxis(back(y0), type)) + '</text>' +
      '<line class="chart-you" x1="' + L + '" y1="' + uy + '" x2="' + (W - Rr) + '" y2="' + uy + '"/><text class="chart-txt" x="' + (W - Rr) + '" y="' + (Number(uy) - 4) + '" text-anchor="end">You: ' + esc(fmtAxis(r.userValue, type)) + '</text>' +
      line + dots + '<circle class="chart-fc" cx="' + fx + '" cy="' + fy + '" r="5"/><text class="chart-txt" x="' + fx + '" y="' + (H - 12) + '" text-anchor="middle">' + CFG.cycle + '</text></svg>' +
      '<div class="chart-legend"><span>● sourced cutoff</span><span>○ expected ' + CFG.cycle + '</span><span>- - your ' + unitWord(r) + '</span></div></div>' + (pts.length === 1 ? '<p class="field-help">Only one year of data, so the range is wide.</p>' : '');
  }
  function drawerHTML(r) {
    const c = r.college || {}, t = TIERS[r.tier], k = claimsOf(c);
    const rows = r.series.map(p => '<tr><td>' + (p.status === 'estimated' ? 'unknown' : p.year) + '</td><td>' + esc(p.round) + '</td><td>' + esc(fmtAxis(p.value, r.scoreType)) + '</td><td><span class="cc-tag ' + STATUS_CLS[p.status] + '">' + STATUS_LABEL[p.status] + '</span>' + (p.verified ? ' verified' : '') + '</td><td>' +
      (safeUrl(p.source_url) ? '<a href="' + esc(safeUrl(p.source_url)) + '" target="_blank" rel="noopener noreferrer">source ↗</a>' : 'no source') + '</td></tr>').join('');
    const other = (c.cutoffHistory || []).length - r.series.length;
    return '<p><span class="cc-chance chance-' + t.cls + '">' + t.label + '</span> <strong>' + pctText(r) + '</strong> ' + badge(r) + '</p><p>' + esc(r.explanation) + '</p><p>' + esc(needText(r)) + '</p>' +
      '<h3>Cutoff history (' + (r.flags && r.flags.categoryFallback ? esc(r.flags.categoryFallback) + ' used, your category has no row' : 'your category') + ')</h3>' + chartHTML(r) +
      '<table class="hist-table"><thead><tr><th>Year</th><th>Round</th><th>' + (r.scoreType === 'rank' ? 'Closing rank' : 'Cutoff') + '</th><th>Data</th><th>Source</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      (other > 0 ? '<p class="field-help">' + other + ' other cutoff row' + (other > 1 ? 's' : '') + ' (other categories, rounds or quotas) exist for this college.</p>' : '') +
      '<h3>Fees and placements</h3><p>' + (k.fees != null || k.pkg != null ? esc(claimsLine(c)) + (k.verified ? '' : '. These figures come from the earlier version of this tool, are not sourced, and may be per year or in total. Check the college website.') : 'No fee or placement data yet.') + '</p>' +
      (c.notes ? '<h3>Notes</h3><p>' + esc(c.notes) + '</p>' : '') +
      '<p class="field-help">Last checked: ' + esc(c.lastChecked || 'unknown') + (safeUrl(c.officialUrl) ? ' · <a href="' + esc(safeUrl(c.officialUrl)) + '" target="_blank" rel="noopener noreferrer">Official site ↗</a>' : '') + '</p>' +
      '<div class="drawer-actions"><button type="button" class="cc-action-btn" data-action="save" data-id="' + esc(r.id) + '" aria-pressed="' + isSaved(c) + '">' + (isSaved(c) ? '★ Saved' : '☆ Save') + '</button>' +
      '<button type="button" class="cc-action-btn" data-action="calc" data-id="' + esc(r.id) + '">💰 Use in calculator</button></div>';
  }
  function openDrawer(id, opener) { const r = S.results.find(x => x.id === id); if (!r) return; $('drawerTitle').textContent = r.name; $('drawerBody').innerHTML = drawerHTML(r); openDialog($('drawer'), $('drawerBackdrop'), opener); }

  /* ───────── ROI + EMI calculator ───────── */
  function useInCalc(id) {
    const r = S.results.find(x => x.id === id); if (!r) return; const k = claimsOf(r.college || {});
    if (k.fees != null) $('calcCost').value = Math.round(k.fees * 100000); if (k.pkg != null) $('calcPkg').value = k.pkg;
    $('calcSource').textContent = 'Prefilled from ' + r.name + '. ' + (k.verified ? '' : 'Fees and package are unverified (they may be per year or total), so check the college site and edit them.');
    closeDialog(); const d = $('toolCalc'); d.open = true; scrollTo(d); setTimeout(() => $('calcLoan').focus(), 50);
  }
  function runCalc() {
    const n = id => { const v = $(id).value.trim(); return v === '' ? NaN : Number(v); };
    const err = $('calcError'), out = $('calcOut'); err.textContent = ''; out.innerHTML = '';
    if (isNaN(n('calcCost'))) { err.textContent = 'Enter the total cost of the course.'; return; }
    if (isNaN(n('calcLoan'))) { err.textContent = 'Enter the loan amount (0 if none).'; return; }
    const p = F.loanPlan({ cost: n('calcCost'), loan: n('calcLoan'), ratePct: n('calcRate'), tenureYears: n('calcTenure'), studyYears: isNaN(n('calcStudy')) ? 0 : n('calcStudy'), packageLpa: n('calcPkg') });
    if (p.error) { err.textContent = p.error; return; }
    const row = (a, b) => '<dt>' + a + '</dt><dd>' + b + '</dd>';
    out.innerHTML = row('Monthly EMI', F.inr(p.monthlyEmi)) + row('Interest during study years', F.inr(p.accruedStudyInterest)) + row('Total interest paid', F.inr(p.totalInterest)) + row('Total repaid to the bank', F.inr(p.totalRepayment)) + row('Your total outlay (cost not borrowed + repayments)', F.inr(p.totalOutlay)) +
      (p.emiShareOfGrossPay != null ? row('EMI as a share of gross monthly pay', (p.emiShareOfGrossPay * 100).toFixed(0) + '%') + row('Years of gross pay to cover the outlay', p.yearsOfPayToCoverOutlay.toFixed(1)) : '') +
      '<dd class="calc-note">' + esc(p.assumption) + (p.payAssumption ? ' ' + esc(p.payAssumption) : '') + ' Banks differ; confirm the terms with your lender.</dd>';
  }

  /* ───────── Counselling reminders (ICS) ───────── */
  const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function downloadICS(r) {
    const ex = EXAMS[r.exam] || {};
    const text = F.buildICS({ date: r.date, title: r.title, note: 'Added from the Student Toolkit College Predictor. Confirm the date on the official site.', url: ex.official || '', daysBefore: r.days, uid: r.id });
    if (!text) return false;
    try { const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'counselling-reminder.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
    catch (e) { window.open('data:text/calendar;charset=utf-8,' + encodeURIComponent(text)); }
    return true;
  }
  function renderReminders() {
    const list = store.get('cp_reminders', []); const ul = $('remList');
    ul.innerHTML = list.map((r, i) => '<li><span>' + esc(r.date) + ': ' + esc(r.title) + '</span><span><button type="button" class="cc-action-btn" data-rem="dl" data-index="' + i + '">Download again</button> <button type="button" class="cc-action-btn" data-rem="rm" data-index="' + i + '" aria-label="Remove reminder ' + esc(r.title) + '">Remove</button></span></li>').join('');
  }
  function addReminder() {
    const err = $('remError'); err.textContent = '';
    const date = $('remDate').value, title = $('remTitle').value.trim() || (EXAMS[S.exam].label + ' counselling');
    if (!date) { err.textContent = 'Choose the date from the official notice.'; $('remDate').focus(); return; }
    if (date < todayStr()) { err.textContent = 'That date has already passed.'; return; }
    const rec = { id: 'r' + Date.now().toString(36), title, date, days: Number($('remDays').value), exam: S.exam };
    if (!downloadICS(rec)) { err.textContent = 'That is not a valid date.'; return; }
    const list = store.get('cp_reminders', []); list.push(rec); store.set('cp_reminders', list.slice(-20)); renderReminders(); say('Reminder added and downloaded.');
  }
  function updateRemOfficial() { const ex = EXAMS[S.exam]; $('remOfficial').innerHTML = ex.official ? 'Official dates for ' + esc(ex.label) + ': <a href="' + esc(ex.official) + '" target="_blank" rel="noopener noreferrer">' + esc(ex.official.replace('https://', '')) + ' ↗</a>' : 'Check the official exam or institute website for ' + esc(ex.label) + ' dates.'; }

  /* ───────── Optional AI explainer (Groq) ───────── */
  const aiReady = () => !!CFG.groqKey && CFG.groqKey !== 'YOUR_GROQ_KEY_HERE';
  async function askAI() {
    const out = $('aiOut');
    if (!aiReady()) { out.textContent = 'The AI explainer is not set up on this site yet.'; return; }
    const top = S.results.filter(r => r.status === 'ok').slice(0, 10); if (!top.length) { out.textContent = 'Run a prediction first.'; return; }
    const profile = readProfile(), q = $('aiQ').value.trim().slice(0, 300);
    const lines = top.map(r => r.name + ' | ' + r.course + ' | ' + r.tier + ' | ' + pctText(r) + ' | expected cutoff ' + cutoffText(r) + ' | data: ' + r.dataQuality).join('\n');
    const body = { model: 'llama-3.3-70b-versatile', temperature: 0.3, max_tokens: 400, messages: [
      { role: 'system', content: 'You explain college admission prediction results to Indian students in plain, kind language. Use ONLY the figures supplied. Never invent cutoffs, fees, dates or placements. If data is labelled estimated, call it a rough guide. Remind the student to verify on the official site. Keep it under 180 words.' },
      { role: 'user', content: 'Exam: ' + EXAMS[S.exam].label + '. Score: ' + fmtVal(profile.scores[0].value) + ' (' + S.mode.type + '). Category: ' + profile.category + (profile.pwd ? ' PwD' : '') + '.\nResults:\n' + lines + '\n' + (q ? 'Student question: ' + q : 'Explain which options to prioritise and why.') }] };
    const btn = $('aiBtn'); btn.disabled = true; out.textContent = 'Thinking…';
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + CFG.groqKey }, body: JSON.stringify(body), signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); out.textContent = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || 'No answer came back.';
    } catch (e) { out.textContent = e.name === 'AbortError' ? 'That took too long. Please try again.' : 'The AI explainer could not be reached. Your results above are unaffected.'; }
    finally { clearTimeout(timer); btn.disabled = false; }
  }

  /* ───────── Share link (URL parameters) ───────── */
  function currentParams() {
    const p = new URLSearchParams();
    p.set('e', S.exam); p.set('m', S.mode.type); if (S.mode.max != null) p.set('mx', S.mode.max); p.set('v', $('scoreInput').value);
    p.set('c', $('category').value); if ($('pwd').checked) p.set('pw', '1'); p.set('g', $('gender').value === 'female' ? 'f' : 'm');
    [['s', 'homeState', 'any'], ['cf', 'courseFilter', 'all'], ['tf', 'typeFilter', 'all'], ['ff', 'feesFilter', 'any'], ['pf', 'pkgFilter', '0'], ['so', 'sortSelect', 'chance']].forEach(([k, id, d]) => { const v = $(id).value; if (v !== d) p.set(k, v); });
    return p;
  }
  const shareURL = () => location.origin + location.pathname + '?' + currentParams().toString();
  function syncUrl() { try { history.replaceState(null, '', location.pathname + '?' + currentParams().toString()); } catch (e) {} }
  function setSelect(id, v) { const el = $(id); if (v != null && qsa('option', el).some(o => o.value === v)) { el.value = v; return true; } return false; }
  async function applyParams(p) {
    let bad = false;
    const m = p.get('m'), mx = p.has('mx') ? Number(p.get('mx')) : null;
    const idx = S.modes.findIndex(x => x.type === m && (x.max == null ? mx == null : x.max === mx));
    if (idx >= 0) { S.mode = { type: S.modes[idx].type, max: S.modes[idx].max }; $('scoreMode').value = String(idx); configureInputs(false); }
    else if (!(m === S.mode.type && (S.mode.max == null ? mx == null : S.mode.max === mx))) bad = true;
    const v = p.get('v'), vNum = v == null || v.trim() === '' ? NaN : Number(v);
    const hasScore = isFinite(vNum);
    if (hasScore) { $('scoreInput').value = String(vNum); onNumberQuiet(); } else bad = true;
    if (!setSelect('category', p.get('c') || 'general')) bad = true;
    $('pwd').checked = p.get('pw') === '1'; $('gender').value = p.get('g') === 'f' ? 'female' : 'other';
    [['s', 'homeState'], ['cf', 'courseFilter'], ['tf', 'typeFilter'], ['ff', 'feesFilter'], ['pf', 'pkgFilter'], ['so', 'sortSelect']].forEach(([k, id]) => { if (p.has(k) && !setSelect(id, p.get(k))) bad = true; });
    if (hasScore) await predict({ noScroll: true });
    if (bad) setFormError('Some values in that link were not valid, so they were ignored.');
  }
  function onNumberQuiet() { const v = Number($('scoreInput').value); if ($('scoreInput').value !== '' && isFinite(v)) { $('percentileSlider').value = valueToSlider(v); $('sliderVal').textContent = fmtVal(v); } }
  function copyText(text, btn, okLabel) {
    const done = ok => { say(ok ? 'Copied to clipboard.' : 'Could not copy. Select the text and copy it yourself.'); if (btn && ok) { const old = btn.textContent; btn.textContent = okLabel || '✓ Copied'; setTimeout(() => { btn.textContent = old; }, 1600); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
    else { try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); done(ok); } catch (e) { done(false); } }
  }
  function resultSummary() {
    const ok = S.results.filter(r => r.status === 'ok'), c = t => ok.filter(r => r.tier === t).length;
    return 'My ' + EXAMS[S.exam].label + ' college prediction: ' + c('safe') + ' safe, ' + c('target') + ' target, ' + c('reach') + ' reach.\nEstimates only, check the official sites.';
  }

  /* ───────── Wire up ───────── */
  function bind() {
    const tabs = $('examTabs');
    tabs.addEventListener('click', e => { const t = e.target.closest('.exam-tab'); if (t) switchExam(t.dataset.exam); });
    tabs.addEventListener('keydown', e => {
      const list = qsa('.exam-tab', tabs); const i = list.indexOf(document.activeElement); if (i < 0) return;
      let n = -1; if (e.key === 'ArrowRight') n = (i + 1) % list.length; else if (e.key === 'ArrowLeft') n = (i - 1 + list.length) % list.length; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = list.length - 1;
      if (n >= 0) { e.preventDefault(); list[n].focus(); switchExam(list[n].dataset.exam); }
    });
    $('percentileSlider').addEventListener('input', onSlider); $('scoreInput').addEventListener('input', onNumber);
    $('scoreInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); predict(); } });
    $('scoreMode').addEventListener('change', () => { const m = S.modes[Number($('scoreMode').value)]; if (m) { S.mode = { type: m.type, max: m.max }; configureInputs(false); setFormError(''); } });
    $('predictBtn').addEventListener('click', () => predict());
    $('advToggle').addEventListener('click', () => { const open = $('advFilters').classList.toggle('open'); $('advToggle').classList.toggle('open', open); $('advToggle').setAttribute('aria-expanded', String(open)); });
    ['category', 'gender', 'pwd', 'homeState', 'courseFilter', 'typeFilter', 'feesFilter', 'pkgFilter'].forEach(id => $(id).addEventListener('change', () => { if (S.ranOnce) predict({ silent: true }); }));
    $('sortSelect').addEventListener('change', () => { rerender(); syncUrl(); });
    $('viewList').addEventListener('click', () => setView('list')); $('viewCompact').addEventListener('click', () => setView('compact'));
    $('compareNow').addEventListener('click', e => openCompare(e.currentTarget)); $('compareClear').addEventListener('click', () => { S.compare = []; updateCompareBar(); rerender(); });
    $('compareClose').addEventListener('click', closeDialog); $('drawerClose').addEventListener('click', closeDialog); $('drawerBackdrop').addEventListener('click', closeDialog);
    $('compareModal').addEventListener('click', e => { if (e.target === $('compareModal')) closeDialog(); });
    document.addEventListener('keydown', trapKeys);
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-action]');
      if (b) { const id = b.dataset.id, a = b.dataset.action;
        if (a === 'details') openDrawer(id, b); else if (a === 'save') { toggleSave(id); if (S.dialog && S.dialog.el === $('drawer')) { const r = S.results.find(x => x.id === id); if (r) { $('drawerBody').innerHTML = drawerHTML(r); const nb = $('drawerBody').querySelector('[data-action="save"]'); if (nb) nb.focus(); } } }
        else if (a === 'compare') toggleCompare(id); else if (a === 'calc') useInCalc(id); else if (a === 'retry') { delete S.data[S.exam]; switchExam(S.exam).then(() => { if (S.ranOnce) predict(); }); } }
      const a = e.target.closest('a[href^="http"]'); if (a) { try { if (new URL(a.href).hostname !== location.hostname) track('outbound_click', { url: a.href }); } catch (x) {} }
    });
    const sl = $('savedList');
    sl.addEventListener('click', e => { const b = e.target.closest('[data-move]'); if (!b) return; const i = Number(b.dataset.index), mv = b.dataset.move;
      if (mv === 'up') { moveSaved(i, i - 1); renderSaved('[data-move="up"][data-index="' + (i - 1) + '"]:not([disabled]),[data-move="down"][data-index="' + (i - 1) + '"]'); }
      else if (mv === 'down') { moveSaved(i, i + 1); renderSaved('[data-move="down"][data-index="' + (i + 1) + '"]:not([disabled]),[data-move="up"][data-index="' + (i + 1) + '"]'); }
      else { const entry = S.saved[i]; S.saved.splice(i, 1); delete S.savedMeta[entry]; persistSaved(); renderSaved('[data-move="remove"]'); rerender(); track('save', { action: 'remove', exam: S.exam }); } });
    sl.addEventListener('dragstart', e => { const li = e.target.closest('.saved-item'); if (!li) return; dragFrom = Number(li.dataset.index); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragFrom)); } catch (x) {} });
    sl.addEventListener('dragover', e => { const li = e.target.closest('.saved-item'); if (!li || dragFrom < 0) return; e.preventDefault(); qsa('.drag-over', sl).forEach(n => n.classList.remove('drag-over')); li.classList.add('drag-over'); });
    sl.addEventListener('drop', e => { const li = e.target.closest('.saved-item'); if (!li || dragFrom < 0) return; e.preventDefault(); const to = Number(li.dataset.index); moveSaved(dragFrom, to); dragFrom = -1; renderSaved(); });
    sl.addEventListener('dragend', () => { dragFrom = -1; qsa('.drag-over', sl).forEach(n => n.classList.remove('drag-over')); });
    $('shortlistPrint').addEventListener('click', printShortlist);
    $('shortlistCopy').addEventListener('click', e => { copyText(shortlistText(), e.currentTarget); track('share', { method: 'copy_shortlist' }); });
    $('shortlistClear').addEventListener('click', () => { S.saved = []; S.savedMeta = {}; persistSaved(); renderSaved(); rerender(); });
    $('calcRun').addEventListener('click', runCalc); $('remAdd').addEventListener('click', addReminder); $('aiBtn').addEventListener('click', askAI);
    $('remList').addEventListener('click', e => { const b = e.target.closest('[data-rem]'); if (!b) return; const list = store.get('cp_reminders', []), i = Number(b.dataset.index); if (b.dataset.rem === 'dl') downloadICS(list[i]); else { list.splice(i, 1); store.set('cp_reminders', list); renderReminders(); } });
    $('shareWA').addEventListener('click', () => { if (!S.ranOnce) return; track('share', { method: 'whatsapp' }); window.open('https://wa.me/?text=' + encodeURIComponent(resultSummary() + '\n' + shareURL()), '_blank', 'noopener'); });
    $('copyLinkBtn').addEventListener('click', e => { if (!S.ranOnce) return; copyText(shareURL(), e.currentTarget, '✓ Link copied'); track('share', { method: 'link' }); });
    $('copyBtn').addEventListener('click', e => { if (!S.ranOnce) return; const ok = S.results.filter(r => r.status === 'ok'); copyText(resultSummary() + '\n\n' + ok.map(r => TIERS[r.tier].label.replace(/^\S+\s/, '').toUpperCase() + ': ' + r.name + ' (' + r.course + '), ' + pctText(r)).join('\n') + '\n\n' + shareURL(), e.currentTarget, '✓ Copied'); track('share', { method: 'copy_list' }); });
    $('recalcBtn').addEventListener('click', () => { $('resultsWrap').classList.remove('show'); $('shareRow').classList.remove('show'); S.ranOnce = false; S.compare = []; updateCompareBar(); scrollTo(document.querySelector('.pred-card')); $('scoreInput').focus({ preventScroll: true }); });
    qsa('.faq-q-seo').forEach(q => { const toggle = () => { const item = q.parentElement, open = item.classList.contains('open'); qsa('.faq-item-seo.open').forEach(i => { i.classList.remove('open'); i.querySelector('.faq-q-seo').setAttribute('aria-expanded', 'false'); }); if (!open) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); } };
      q.addEventListener('click', toggle); q.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }); });
    window.addEventListener('scroll', () => { const n = document.querySelector('nav'); if (n) n.style.background = window.scrollY > 20 ? 'rgba(9,9,11,.98)' : 'rgba(9,9,11,.92)'; }, { passive: true });
    if (!aiReady()) { $('aiBtn').setAttribute('aria-describedby', 'aiNote'); $('aiNote').textContent += ' (Not switched on for this site yet.)'; }
  }
  function setView(v) { S.view = v; $('viewList').classList.toggle('active', v === 'list'); $('viewCompact').classList.toggle('active', v === 'compact'); $('viewList').setAttribute('aria-pressed', String(v === 'list')); $('viewCompact').setAttribute('aria-pressed', String(v === 'compact')); rerender(); }

  async function init() {
    loadSaved(); renderSaved(); renderReminders(); bind(); configureInputs(false);
    qsa('.exam-tab').forEach(t => { if (!EXAMS[t.dataset.exam]) console.warn('Tab without config:', t.dataset.exam); });
    const p = new URLSearchParams(location.search), start = p.has('e') && EXAMS[p.get('e')] ? p.get('e') : 'cuet';
    await switchExam(start, { initial: true }); updateRemOfficial();
    if (p.has('e')) await applyParams(p);
    const origSwitch = switchExam; // keep reminder help text in sync with the tab
    qsa('.exam-tab').forEach(t => t.addEventListener('click', () => setTimeout(updateRemOfficial, 0)));
  }
  window.__cp = { S, predict, switchExam, toggleSave, toggleCompare, openCompare, openDrawer, closeDialog, runCalc, shareURL, applyParams, chartHTML };
  window.runPredictor = () => predict(); window.switchExam = k => switchExam(k);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
