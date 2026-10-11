/* College Predictor engine. Pure functions, no DOM, no network. Works in the browser (window.CPEngine) and in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.CPEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---- Every tunable number lives here so it can be reviewed and tested. ---- */
  const CFG = {
    tiers: { safeCentral: 0.80, safeLow: 0.55, targetCentral: 0.35, reachCentral: 0.08 },
    clamp: [0.01, 0.99],
    sigmaFloor: { rank: 0.06, percentile: 0.08, relative: 0.015 }, // rank/percentile in axis units, score/marks as share of the scale
    singleYearMult: 1.5,      // only one year of data
    estimatedMult: 2,         // unsourced numbers get double uncertainty
    approxExtra: 0.10,        // extra axis uncertainty when the user's value was converted between scales
    slopeDamping: 0.5,        // trend extrapolation is halved: three years is a weak basis
    pctEps: 0.05,             // percentile axis = -log10(100 + eps - p), so 99.9 and 99.0 are far apart, 80 and 81 are close
    stages: ['closing', 'shortlist'],
    categories: ['UR', 'GEN', 'EWS', 'OBC', 'SC', 'ST']
  };
  const TIER_ORDER = { safe: 0, target: 1, reach: 2, unlikely: 3 };

  /* ---- Maths ---- */
  function erf(x) { // Abramowitz-Stegun 7.1.26, |error| < 1.5e-7
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
  function PhiInv(p) { let lo = -8, hi = 8; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
  const clampP = p => Math.min(CFG.clamp[1], Math.max(CFG.clamp[0], p));

  /* ---- Scale handling. Every scale is mapped to an "axis" where a fixed gap means a similar real-world gap. ---- */
  const LOWER_IS_BETTER = { rank: true, percentile: false, score: false, marks: false };
  function toAxis(v, type) {
    if (type === 'rank') return Math.log10(v);
    if (type === 'percentile') return -Math.log10(100 + CFG.pctEps - v);
    return v;
  }
  function fromAxis(a, type) {
    if (type === 'rank') return Math.pow(10, a);
    if (type === 'percentile') return 100 + CFG.pctEps - Math.pow(10, -a);
    return a;
  }
  const sign = type => (LOWER_IS_BETTER[type] ? -1 : 1);

  /* The only conversion implemented: NTA's documented percentile definition (share of candidates with an equal or lower score).
     rank ~ (1 - p/100) * N. Ties and session normalisation make this approximate, so the result is flagged and widened. */
  function approxRankFromPercentile(p, N) {
    if (!(p >= 0 && p <= 100) || !(N > 0)) return null;
    return Math.max(1, Math.round((1 - p / 100) * N));
  }

  /* ---- Input validation. Returns a list of problems; never throws. ---- */
  function validateProfile(profile) {
    const errs = [];
    if (!profile || typeof profile !== 'object') return ['No profile given.'];
    if (!Array.isArray(profile.scores) || !profile.scores.length) errs.push('Enter at least one score.');
    (profile.scores || []).forEach(s => {
      const v = s && s.value;
      if (typeof v !== 'number' || !isFinite(v)) { errs.push('Score is not a number.'); return; }
      if (s.type === 'rank') { if (!Number.isInteger(v) || v < 1) errs.push('Rank must be a whole number, 1 or more.'); }
      else if (s.type === 'percentile') { if (v < 0 || v > 100) errs.push('Percentile must be between 0 and 100.'); }
      else if (s.type === 'score' || s.type === 'marks') { if (v < 0) errs.push('Score cannot be negative.'); if (typeof s.max === 'number' && v > s.max) errs.push('Score is above the maximum of ' + s.max + '.'); }
      else errs.push('Unknown score type: ' + s.type);
    });
    const cat = norm(profile.category || 'UR');
    if (!CFG.categories.includes(cat)) errs.push('Unknown category: ' + profile.category);
    return errs;
  }
  const norm = c => { c = String(c || 'UR').toUpperCase(); return c === 'GEN' ? 'UR' : c; };
  const baseCat = c => norm(String(c).replace(/-PWD$/i, ''));
  const isPwdCat = c => /-PWD$/i.test(c) || /^GEN-PWD$/i.test(c);

  /* ---- Row selection: category, quota, gender, stage. No relaxation is invented; fallbacks are documented and flagged. ---- */
  function categoryRows(rows, profile) {
    const want = norm(profile.category);
    const chain = [];
    if (profile.pwd) chain.push(want === 'UR' ? 'GEN-PWD' : want + '-PWD', want + '-PWD');
    chain.push(want);
    if (want !== 'UR') chain.push('UR'); // a reserved-category candidate can also compete for open seats, so the open cutoff is a valid (conservative) bound
    for (const c of chain) {
      const hit = rows.filter(r => (c === 'GEN-PWD' ? isPwdCat(r.category) && baseCat(r.category) === 'UR' : norm(r.category) === c));
      if (hit.length) return { rows: hit, used: c, fallback: c !== (profile.pwd ? (want === 'UR' ? 'GEN-PWD' : want + '-PWD') : want) };
    }
    return { rows: [], used: null, fallback: false };
  }
  function quotaPick(rows, college, profile) { // returns rows allowed for this student + whether we had to assume
    let assumed = false;
    const hasHSOS = rows.some(r => r.quota === 'HS' || r.quota === 'OS');
    if (!hasHSOS) return { rows, assumed };
    const home = profile.homeState, cs = college.state;
    if (home && cs) { const q = home === cs ? 'HS' : 'OS'; return { rows: rows.filter(r => r.quota === q || (r.quota !== 'HS' && r.quota !== 'OS')), assumed }; }
    assumed = true; return { rows, assumed };   // ambiguous: caller keeps the harder of HS/OS
  }
  function genderPool(r, profile) { return !(r.gender === 'female_only' && profile.gender !== 'female'); }

  function buildSeries(college, profile, scoreType, scoreMax, roundMode) {
    const all = (college.cutoffHistory || []).filter(r => CFG.stages.includes(r.stage) && r.scale && r.scale.type === scoreType);
    const flags = { categoryFallback: null, quotaAssumed: false, scaleMaxMismatch: false };
    if (!all.length) return { series: [], flags, reason: 'nodata' };
    const maxOK = all.filter(r => !(typeof r.scale.max === 'number' && typeof scoreMax === 'number' && r.scale.max !== scoreMax));
    if (!maxOK.length) { flags.scaleMaxMismatch = true; return { series: [], flags, reason: 'incomparable' }; }
    const cat = categoryRows(maxOK, profile);
    if (!cat.rows.length) return { series: [], flags, reason: 'nodata' };
    if (cat.fallback) flags.categoryFallback = cat.used;
    const q = quotaPick(cat.rows, college, profile); flags.quotaAssumed = q.assumed;
    const rows = q.rows.filter(r => genderPool(r, profile));
    // group by year+round; within a group the harder row wins when quota is ambiguous, the easier wins when a woman has a female-only pool
    const groups = new Map();
    rows.forEach(r => { const k = r.year + '|' + r.round; (groups.get(k) || groups.set(k, []).get(k)).push(r); });
    const harder = (a, b) => (LOWER_IS_BETTER[scoreType] ? (a.value < b.value ? a : b) : (a.value > b.value ? a : b));
    const easier = (a, b) => (harder(a, b) === a ? b : a);
    const perRound = [];
    groups.forEach(g => {
      const byQuota = new Map(); g.forEach(r => { const k = r.quota + '|' + (r.gender === 'female_only' ? 'F' : 'N'); const cur = byQuota.get(k); byQuota.set(k, cur ? harder(cur, r) : r); });
      const neutral = [...byQuota.entries()].filter(([k]) => k.endsWith('|N')).map(([, r]) => r);
      const female = [...byQuota.entries()].filter(([k]) => k.endsWith('|F')).map(([, r]) => r);
      let pick = neutral.length ? neutral.reduce(harder) : null;                // ambiguous quota -> keep the harder
      if (profile.gender === 'female' && female.length) { const f = female.reduce(harder); pick = pick ? easier(pick, f) : f; }
      if (pick) perRound.push(pick);
    });
    const rn = r => { const m = /\d+/.exec(String(r.round)); return m ? +m[0] : 0; };
    const byYear = new Map();
    perRound.forEach(r => { const cur = byYear.get(r.year); if (!cur) byYear.set(r.year, r); else {
      const better = roundMode === 'first' ? rn(r) < rn(cur) : rn(r) > rn(cur); if (better) byYear.set(r.year, r); } });
    const series = [...byYear.values()].sort((a, b) => a.year - b.year).map(r => ({ year: r.year, value: r.value, round: r.round, status: r.status, verified: !!r.verified, source_url: r.source_url || null }));
    return { series, flags, reason: null };
  }

  /* ---- Forecast of next cycle's cutoff on the axis. ---- */
  function forecast(series, scoreType, scoreMax, targetYear) {
    const ys = series.map(s => toAxis(s.value, scoreType)), xs = series.map(s => s.year), n = ys.length;
    const lastYear = xs[n - 1];
    const floorSigma = (scoreType === 'rank' || scoreType === 'percentile') ? CFG.sigmaFloor[scoreType] : CFG.sigmaFloor.relative * (scoreMax || Math.max(...ys));
    let mu, sigma, method;
    if (n === 1) { mu = ys[0]; sigma = floorSigma * CFG.singleYearMult; method = 'one year'; }
    else if (n === 2) { mu = ys[1]; sigma = Math.max(floorSigma, Math.abs(ys[1] - ys[0])); method = 'two years'; }
    else {
      const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
      const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0), sxy = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
      const slope = sxx ? sxy / sxx : 0, icpt = my - slope * mx;
      const resid = xs.map((x, i) => ys[i] - (icpt + slope * x));
      const sd = Math.sqrt(resid.reduce((a, r) => a + r * r, 0) / (n - 2));
      const gap = Math.max(1, (targetYear || lastYear + 1) - lastYear);
      mu = ys[n - 1] + CFG.slopeDamping * slope * gap; sigma = Math.max(floorSigma, sd); method = 'trend over ' + n + ' years';
    }
    const gap = Math.max(1, (targetYear || lastYear + 1) - lastYear);
    sigma *= Math.sqrt(gap);
    return { mu, sigma, method, lastYear };
  }

  /* ---- One college ---- */
  function predictCollege(college, profile, opts) {
    opts = opts || {};
    const roundMode = opts.roundMode || 'final';
    const out = { id: college.id, name: college.name, course: college.course, status: 'ok' };
    const candidates = profile.scores.slice();
    let best = null;
    for (const s of candidates) {
      const b = buildSeries(college, profile, s.type, s.max, roundMode);
      if (b.series.length) { best = { s, b }; break; }
      if (!best) best = { s, b, empty: true };
    }
    if (!best || best.empty) {
      const r = best && best.b.reason;
      out.status = r === 'incomparable' ? 'incomparable' : (college.cutoffHistory || []).length ? 'incomparable' : 'nodata';
      out.explanation = out.status === 'nodata' ? 'No cutoff data is available for this college yet.' : 'The available cutoffs use a different scale than the score you entered, and no documented conversion exists.';
      return out;
    }
    const { s, b } = best;
    const f = forecast(b.series, s.type, s.max, profile.targetYear);
    let mu = f.mu;
    if (s.type === 'rank' && college.seats > 0 && college.seatsPrev > 0) mu += Math.log10(college.seats / college.seatsPrev);   // more seats -> closing rank moves out
    const estimated = b.series.some(r => r.status === 'estimated');
    const allOfficial = b.series.every(r => r.status === 'official' && r.verified);
    let sigma = f.sigma * (estimated ? CFG.estimatedMult : 1);
    if (s.approx) sigma += CFG.approxExtra;
    const u = toAxis(s.value, s.type);
    const d = sign(s.type) * (u - mu);
    const z = d / sigma;
    const central = clampP(Phi(z)), low = clampP(Phi(z - 1)), high = clampP(Phi(z + 1));
    let tier = central >= CFG.tiers.safeCentral && low >= CFG.tiers.safeLow ? 'safe' : central >= CFG.tiers.targetCentral ? 'target' : central >= CFG.tiers.reachCentral ? 'reach' : 'unlikely';
    let capped = false;
    if (estimated && tier === 'safe') { tier = 'target'; capped = true; }
    const zNeed = PhiInv(0.80);
    const needAxis = s.type === 'rank' ? mu - zNeed * sigma : mu + zNeed * sigma;
    let need = fromAxis(needAxis, s.type), reachable = true;
    if (s.type === 'rank') need = Math.max(1, Math.floor(need));
    if (s.type === 'percentile' && need > 100) { reachable = false; need = 100; }
    if (typeof s.max === 'number' && (s.type === 'score' || s.type === 'marks') && need > s.max) { reachable = false; need = s.max; }
    const cutoffNow = fromAxis(mu, s.type);
    Object.assign(out, {
      tier, central, low, high, capped,
      dataQuality: allOfficial ? 'official' : estimated ? 'estimated' : 'cited',
      scoreType: s.type, userValue: s.value, expectedCutoff: s.type === 'rank' ? Math.round(cutoffNow) : +cutoffNow.toFixed(2),
      series: b.series, method: f.method, flags: b.flags, approxInput: !!s.approx,
      marksNeeded: { value: s.type === 'rank' ? need : +need.toFixed(2), forChance: 0.80, reachable, gap: s.type === 'rank' ? Math.max(0, s.value - need) : +Math.max(0, need - s.value).toFixed(2) }
    });
    out.explanation = explain(out, s);
    return out;
  }

  function explain(o, s) {
    const lead = { safe: 'Likely', target: 'A realistic target', reach: 'A stretch', unlikely: 'Unlikely' }[o.tier];
    const unit = s.type === 'rank' ? 'rank' : s.type === 'percentile' ? 'percentile' : 'score';
    const cmp = s.type === 'rank'
      ? (s.value <= o.expectedCutoff ? 'is better than' : 'is behind') + ' the expected closing rank of about ' + o.expectedCutoff
      : (s.value >= o.expectedCutoff ? 'is above' : 'is below') + ' the expected cutoff of about ' + o.expectedCutoff;
    const why = [];
    if (o.dataQuality === 'estimated') why.push('this number is an unsourced estimate' + (o.capped ? ', so it is never shown as Safe' : ''));
    else if (o.method === 'one year') why.push('it rests on a single year of data');
    if (o.flags.categoryFallback) why.push('no ' + 'category-specific row exists, so the ' + o.flags.categoryFallback + ' cutoff was used');
    if (o.flags.quotaAssumed) why.push('the college state is unknown, so the harder of home-state and other-state seats was used');
    if (o.approxInput) why.push('your ' + unit + ' was converted approximately');
    return lead + ': your ' + unit + ' ' + s.value + ' ' + cmp + (why.length ? ' (' + why.join('; ') + ')' : '') + '.';
  }

  /* ---- Many colleges ---- */
  function predictAll(colleges, profile, opts) {
    const errors = validateProfile(profile);
    if (errors.length) return { errors, results: [] };
    const results = colleges.map(c => predictCollege(c, profile, opts));
    results.sort((a, b) => (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9) || (b.central || 0) - (a.central || 0));
    return { errors: [], results };
  }

  /* What-if: how the tier counts change as one score moves. */
  function sweep(colleges, profile, scoreType, from, to, step, opts) {
    const rows = [];
    for (let v = from; (step > 0 ? v <= to + 1e-9 : v >= to - 1e-9); v += step) {
      const p = Object.assign({}, profile, { scores: [{ type: scoreType, value: scoreType === 'rank' ? Math.round(v) : +v.toFixed(4), max: (profile.scores.find(x => x.type === scoreType) || {}).max }] });
      const r = predictAll(colleges, p, opts).results;
      const c = t => r.filter(x => x.tier === t).length;
      rows.push({ value: p.scores[0].value, safe: c('safe'), target: c('target'), reach: c('reach'), unlikely: c('unlikely') });
    }
    return rows;
  }

  return { CFG, Phi, PhiInv, toAxis, fromAxis, approxRankFromPercentile, validateProfile, buildSeries, forecast, predictCollege, predictAll, sweep };
});
