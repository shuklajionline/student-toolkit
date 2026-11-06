/* Student Toolkit — Study Abroad Finder app (runs fully in the browser, no API calls). */
(function () {
  'use strict';
  const D = window.SA_DATA;
  if (!D) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const BY = Object.fromEntries(D.COUNTRIES.map(c => [c.slug, c]));
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem('sa_' + k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('sa_' + k, JSON.stringify(v)); } catch {} }
  };
  const fx = Object.assign({}, D.FX, store.get('fx', {}));
  const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const track = (name, params) => { try { window.gtag && gtag('event', name, params || {}); } catch {} };

  // ── Money helpers ─────────────────────────────────────
  const toInr = (amt, cur) => amt * (fx[cur] || 1);
  function lakh(n) {
    if (!isFinite(n)) return '—';
    if (Math.abs(n) >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
    if (Math.abs(n) >= 1e5) return '₹' + (n / 1e5).toFixed(1) + ' lakh';
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const loc = (n, cur) => (D.SYM[cur] || cur + ' ') + Math.round(n).toLocaleString('en-US');
  const mid = a => (a[0] + a[1]) / 2;
  const lvlKey = l => (l === 'pg' ? 'pg' : 'ug');
  function yearly(c, level, pick = 'mid') {
    const f = pick === 'min' ? a => a[0] : pick === 'max' ? a => a[1] : mid;
    const t = f(c.tuition[lvlKey(level)]);
    const l = f(c.living) * 12;
    return toInr(t + l + (c.insurance.amount || 0), c.cur);
  }

  // ── Tabs (deep-linkable: #tab=calc&c=germany) ─────────
  const tabs = $$('.tab');
  function showTab(id, push) {
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
    $$('.panel').forEach(p => p.classList.toggle('on', p.id === 'p-' + id));
    if (push) history.replaceState(null, '', '#tab=' + id);
  }
  tabs.forEach(t => t.addEventListener('click', () => { showTab(t.dataset.tab, true); track('sa_tab', { tab: t.dataset.tab }); }));

  // Fill every country <select>
  function countryOptions(filter) {
    return D.COUNTRIES.filter(filter || (() => true)).map(c => `<option value="${c.slug}">${esc(c.short)}</option>`).join('');
  }
  $$('select[data-countries]').forEach(s => { s.innerHTML = (s.dataset.countries === 'blank' ? '<option value="">— choose —</option>' : '') + countryOptions(); });

  // ── 1. MATCHER ────────────────────────────────────────
  const mForm = $('#matchForm');
  const budgetEl = $('#mBudget'), budgetOut = $('#mBudgetOut');
  if (budgetEl) budgetEl.addEventListener('input', () => { budgetOut.textContent = budgetEl.value >= 80 ? '₹80 lakh+' : '₹' + budgetEl.value + ' lakh'; });

  function match() {
    const level = $('#mLevel').value, field = $('#mField').value;
    const budget = +budgetEl.value * 1e5, noLimit = +budgetEl.value >= 80;
    const ielts = $('#mIelts').value; // '', 'none', '5.5'…
    const pri = $$('input[name=pri]:checked').map(i => i.value);
    const w = k => (pri.includes(k) ? 2.2 : 1);
    const med = level === 'mbbs' || field === 'med';
    const pool = D.COUNTRIES.filter(c => (med ? (c.mbbs || c.strong.includes('med')) : !c.mbbs));
    const fit = [], over = [];
    pool.forEach(c => {
      const lowCost = yearly(c, level, 'min'), typCost = yearly(c, level, 'mid');
      const why = [], warn = [];
      let s = 0, max = 0;
      // Budget (25)
      max += 25 * w('cost');
      if (noLimit || typCost <= budget) { s += 25 * w('cost'); why.push(`Typical yearly cost ${lakh(typCost)} fits your budget`); }
      else if (lowCost <= budget) { s += 12 * w('cost'); why.push(`Fits only with a cheaper city/university (from ${lakh(lowCost)}/yr)`); }
      // Field strength (20)
      max += 20;
      if (field && c.strong.includes(field)) { s += 20; why.push(`Strong for ${D.FIELDS[field]}`); }
      else if (field) { s += 6; }
      else s += 12;
      // Post-study work (15)
      max += 15 * w('psw');
      s += Math.min(c.psw.months, 36) / 36 * 15 * w('psw');
      if (c.psw.months >= 24) why.push(`Post-study work up to ${c.psw.months} months`);
      else if (!med && c.psw.months === 0) warn.push('No post-study work visa');
      // PR (10)
      max += 10 * w('pr');
      s += (c.pr.level / 4) * 10 * w('pr');
      if (c.pr.level >= 4 && pri.includes('pr')) why.push('Clearer route to permanent residence');
      // Part-time work (10)
      max += 10 * w('work');
      s += Math.min(c.work.hours, 24) / 24 * 10 * w('work');
      if (pri.includes('work') && c.work.hours >= 20) why.push(`Part-time work: ${c.work.hours >= 40 ? 'no weekly cap for full-time students' : c.work.hours + ' hrs/week in term'}`);
      // English-only life (10)
      max += 10 * w('english');
      if (c.englishLife) { s += 10 * w('english'); if (pri.includes('english')) why.push('Daily life and jobs work in English'); }
      else if (pri.includes('english')) warn.push('Local language needed for most jobs');
      // Near India (5)
      max += 5 * w('near');
      s += Math.max(0, 1 - (c.flightInr[0] - 10000) / 60000) * 5 * w('near');
      if (pri.includes('near') && c.flightInr[0] <= 30000) why.push('Short, cheap flights from India');
      // Scholarships (5)
      max += 5 * w('schol');
      const big = c.scholarships.some(x => /full|fully|stipend|tuition \+/i.test(x[2]));
      if (big) { s += 5 * w('schol'); if (pri.includes('schol')) why.push('Fully funded scholarships exist (competitive)'); }
      // English test
      if (!med && ielts) {
        const need = c.english.ielts[0];
        if (ielts === 'none') { if (c.english.waiver) why.push('IELTS waiver possible at some universities'); else { s -= 8; warn.push(`Usually needs IELTS ${need}+`); } }
        else if (+ielts < need) { s -= 10; warn.push(`Most programs ask IELTS ${need}+`); }
      }
      const score = Math.max(5, Math.min(99, Math.round((s / max) * 100)));
      const row = { c, score, why: why.slice(0, 4), warn, lowCost, typCost };
      (noLimit || lowCost <= budget ? fit : over).push(row);
    });
    fit.sort((a, b) => b.score - a.score);
    over.sort((a, b) => a.lowCost - b.lowCost);
    renderMatches(fit, over, level);
    track('sa_match', { level, field, budget: budgetEl.value, priorities: pri.join(',') });
  }
  function renderMatches(fit, over, level) {
    const out = $('#matchOut');
    if (!fit.length) {
      out.innerHTML = `<div class="note warn">No country fits that budget at typical costs. Try raising the budget, choosing Germany/Italy/Poland-type low-tuition options, or count scholarships. Closest options:</div>` + over.slice(0, 5).map(r => item(r, level)).join('');
      return;
    }
    out.innerHTML = `<p class="meta-line">${fit.length} countries fit · ranked by how well they match your priorities · costs include tuition, living and insurance per year at today’s approximate rates</p>` +
      fit.map(r => item(r, level)).join('') +
      (over.length ? `<details><summary>Over your budget (${over.length})</summary><p>${over.map(r => `${esc(r.c.short)} from ${lakh(r.lowCost)}/yr`).join(' · ')}</p></details>` : '');
  }
  function item(r, level) {
    const c = r.c;
    return `<div class="ri"><div class="score" title="Match score">${r.score}</div><div>
      <h3><a href="/study-abroad/${c.page}">${esc(c.name)}</a></h3>
      <div><span class="pill o">${lakh(r.lowCost)} – ${lakh(yearly(c, level, 'max'))} / yr</span><span class="pill b">Work after study: ${c.psw.months ? c.psw.months + ' mo' : 'none'}</span><span class="pill">${esc(c.work.hours ? c.work.hours + ' hrs/wk' : 'limited work')}</span></div>
      <ul>${r.why.map(x => `<li>${esc(x)}</li>`).join('')}${r.warn.map(x => `<li style="color:var(--red)">${esc(x)}</li>`).join('')}</ul></div>
      <div class="cc-a" style="flex-direction:column"><button class="btn sm ghost" data-calc="${c.slug}">Cost</button><button class="btn sm ghost" data-cmp="${c.slug}">Compare</button></div></div>`;
  }
  if (mForm) mForm.addEventListener('submit', e => { e.preventDefault(); match(); $('#matchOut').scrollIntoView({ behavior: 'smooth', block: 'start' }); });

  // ── 2. COST + LOAN CALCULATOR ─────────────────────────
  const cc = { c: $('#cCountry'), lvl: $('#cLevel'), city: $('#cCity'), yrs: $('#cYears'), tui: $('#cTuition'), liv: $('#cLiving'), rate: $('#cRate'), sch: $('#cSchol'), own: $('#cOwn'), int: $('#cInt'), ten: $('#cTenure'), sal: $('#cSalary'), apps: $('#cApps') };
  function prefill() {
    const c = BY[cc.c.value]; if (!c) return;
    const lvl = cc.lvl.value, li = lvlKey(lvl);
    const pick = cc.city.value === 'budget' ? 0 : cc.city.value === 'expensive' ? 1 : null;
    cc.tui.value = Math.round(pick === null ? mid(c.tuition[li]) : c.tuition[li][pick]);
    cc.liv.value = Math.round(pick === null ? mid(c.living) : c.living[pick]);
    cc.yrs.value = c.years[lvl === 'pg' ? 1 : 0];
    cc.rate.value = fx[c.cur];
    $$('.curr').forEach(s => (s.textContent = c.cur));
    calc();
  }
  function calc() {
    const c = BY[cc.c.value]; if (!c) return;
    const rate = +cc.rate.value || fx[c.cur];
    if (rate !== D.FX[c.cur]) { fx[c.cur] = rate; store.set('fx', Object.fromEntries(Object.entries(fx).filter(([k, v]) => v !== D.FX[k]))); }
    const yrs = Math.max(0.5, +cc.yrs.value || 1);
    const tuiY = (+cc.tui.value || 0) * rate;
    const livY = (+cc.liv.value || 0) * 12 * rate;
    const insY = (c.insurance.amount || 0) * rate;
    const schY = (+cc.sch.value || 0) * 100000;
    const visa = (c.visa.fee || 0) * rate + (c.slug === 'usa' ? 350 * rate : 0);
    const flights = mid(c.flightInr) * 2;
    const tests = c.mbbs ? 0 : 18000;
    const apps = (+cc.apps.value || 0) * 8000;
    const setup = (+cc.liv.value || 0) * rate * 1.5; // deposit + first-month setup
    const oneTime = visa + flights + tests + apps + setup;
    const perYear = tuiY + livY + insY - schY;
    const total = perYear * yrs + oneTime;
    // Loan
    const own = (+cc.own.value || 0) * 100000;
    const P = Math.max(0, total - own);
    const r = (+cc.int.value || 0) / 100;
    const n = Math.max(1, +cc.ten.value || 10) * 12;
    const morat = yrs + 0.5; // course + 6 months, simple interest accrues
    const accrued = P * r * morat * 0.6; // loan is drawn in stages: average ~60% outstanding during study
    const P2 = P + accrued;
    const mr = r / 12;
    const emi = mr ? P2 * mr * Math.pow(1 + mr, n) / (Math.pow(1 + mr, n) - 1) : P2 / n;
    const totalPay = emi * n;
    const sal = (+cc.sal.value || 0) * rate;
    const emiShare = sal ? emi / sal * 100 : 0;
    // Proof of funds
    const pof = c.funds.amount ? c.funds.amount * rate + (c.slug === 'uk' || c.slug === 'canada' || c.slug === 'australia' || c.slug === 'ireland' ? tuiY : 0) : null;

    $('#calcOut').innerHTML = `
      <div class="out">
        <div class="card"><small>Total course cost</small><b>${lakh(total)}</b><div class="meta-line">${yrs} yr${yrs > 1 ? 's' : ''} incl. one-time costs</div></div>
        <div class="card"><small>Per year</small><b>${lakh(perYear)}</b><div class="meta-line">tuition + living + insurance${schY ? ' − scholarship' : ''}</div></div>
        <div class="card"><small>Monthly living</small><b>${inr(livY / 12)}</b><div class="meta-line">${loc(+cc.liv.value || 0, c.cur)} / month</div></div>
        <div class="card"><small>Show for visa</small><b>${pof ? lakh(pof) : 'Varies'}</b><div class="meta-line">${pof ? 'approx. proof of funds' : 'see official rule'}</div></div>
      </div>
      <div class="tbl-wrap" style="margin-top:12px"><table><tbody>
        <tr><td>Tuition × ${yrs} yrs</td><td class="num">${lakh(tuiY * yrs)}</td></tr>
        <tr><td>Living × ${yrs} yrs</td><td class="num">${lakh(livY * yrs)}</td></tr>
        <tr><td>Health insurance × ${yrs} yrs</td><td class="num">${lakh(insY * yrs)}</td></tr>
        ${schY ? `<tr><td>Scholarship × ${yrs} yrs</td><td class="num" style="color:var(--green)">−${lakh(schY * yrs)}</td></tr>` : ''}
        <tr><td>Visa fees${c.slug === 'usa' ? ' + SEVIS' : ''}</td><td class="num">${inr(visa)}</td></tr>
        <tr><td>Flights (return, approx.)</td><td class="num">${inr(flights)}</td></tr>
        <tr><td>English test + ${+cc.apps.value || 0} applications</td><td class="num">${inr(tests + apps)}</td></tr>
        <tr><td>Arrival setup (deposit, first month)</td><td class="num">${inr(setup)}</td></tr>
      </tbody></table></div>
      <h3 style="margin-top:20px">Education loan estimate</h3>
      <div class="out">
        <div class="card"><small>Loan needed</small><b>${lakh(P)}</b></div>
        <div class="card"><small>EMI after moratorium</small><b>${inr(emi)}</b><div class="meta-line">for ${n / 12} yrs at ${(r * 100).toFixed(1)}%</div></div>
        <div class="card"><small>Total interest</small><b>${lakh(totalPay - P)}</b><div class="meta-line">incl. ~${lakh(accrued)} accrued while studying</div></div>
        <div class="card"><small>EMI vs salary</small><b>${sal ? emiShare.toFixed(0) + '%' : '—'}</b><div class="bar"><i style="width:${Math.min(100, emiShare)}%;background:${emiShare > 40 ? 'var(--red)' : emiShare > 25 ? 'var(--gold)' : 'var(--green)'}"></i></div><div class="meta-line">${sal ? (emiShare > 40 ? 'Risky — over 40% of take-home' : emiShare > 25 ? 'Manageable but tight' : 'Comfortable') : 'enter expected salary'}</div></div>
      </div>
      <p class="note">Estimate only. Exchange rate used: 1 ${c.cur} = ₹${rate}. Moratorium assumed as course length + 6 months with simple interest accruing on money already disbursed. Interest paid is deductible under Section 80E. <a href="/study-abroad/${c.page}">Full ${esc(c.short)} guide →</a></p>`;
    store.set('calc', { c: cc.c.value, lvl: cc.lvl.value });
  }
  if (cc.c) {
    const saved = store.get('calc', null);
    if (saved && BY[saved.c]) { cc.c.value = saved.c; cc.lvl.value = saved.lvl; } else cc.c.value = 'germany';
    ['c', 'lvl', 'city'].forEach(k => cc[k].addEventListener('change', prefill));
    ['yrs', 'tui', 'liv', 'rate', 'sch', 'own', 'int', 'ten', 'sal', 'apps'].forEach(k => cc[k].addEventListener('input', calc));
    prefill();
  }

  // ── 3. COMPARE ────────────────────────────────────────
  let cmp = store.get('cmp', []).filter(s => BY[s]).slice(0, 3);
  const ROWS = [
    ['Yearly cost (bachelor’s)', c => `${lakh(yearly(c, 'ug', 'min'))} – ${lakh(yearly(c, 'ug', 'max'))}`],
    ['Yearly cost (master’s)', c => `${lakh(yearly(c, 'pg', 'min'))} – ${lakh(yearly(c, 'pg', 'max'))}`],
    ['Tuition / year', c => `${loc(c.tuition.pg[0], c.cur)} – ${loc(c.tuition.pg[1], c.cur)}`],
    ['Living / month', c => `${loc(c.living[0], c.cur)} – ${loc(c.living[1], c.cur)}`],
    ['Proof of funds', c => esc(c.funds.text)],
    ['Visa', c => esc(c.visa.name + ' — ' + c.visa.feeText)],
    ['Work while studying', c => esc(c.work.text)],
    ['Post-study work', c => esc(c.psw.text)],
    ['PR outlook', c => ['', 'Limited', 'Possible', 'Moderate', 'Strong'][c.pr.level] + ' — ' + esc(c.pr.text)],
    ['English requirement', c => esc(c.english.text)],
    ['Language for jobs', c => esc(c.lang)],
    ['Intakes', c => esc(c.intakes.join(' · '))],
    ['Safety', c => esc(c.safety)],
    ['Best for', c => c.strong.map(f => D.FIELDS[f].split(' / ')[0]).join(', ')],
    ['Full guide', c => `<a href="/study-abroad/${c.page}">${esc(c.short)} guide →</a>`]
  ];
  function renderCompare() {
    store.set('cmp', cmp);
    $$('[data-cmp]').forEach(b => b.setAttribute('aria-pressed', String(cmp.includes(b.dataset.cmp))));
    const bar = $('#cbar');
    if (bar) {
      bar.classList.toggle('on', cmp.length > 0);
      $('#cbarList').innerHTML = cmp.map(s => `<span class="pill o">${esc(BY[s].short)} <a href="#" data-uncmp="${s}" aria-label="Remove">✕</a></span>`).join('');
    }
    $$('#cmpSel select').forEach((s, i) => (s.value = cmp[i] || ''));
    const out = $('#cmpOut'); if (!out) return;
    if (!cmp.length) { out.innerHTML = '<p class="note">Pick up to 3 countries above, or press “Compare” on any country card.</p>'; return; }
    const cs = cmp.map(s => BY[s]);
    out.innerHTML = `<div class="tbl-wrap"><table><thead><tr><th>Factor</th>${cs.map(c => `<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>` +
      ROWS.map(([k, f]) => `<tr><td><b>${k}</b></td>${cs.map(c => `<td>${f(c)}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>' +
      `<p class="meta-line" style="margin-top:8px">Share this comparison: <a href="#tab=compare&c=${cmp.join(',')}">copy link</a></p>`;
  }
  function toggleCmp(s) {
    if (cmp.includes(s)) cmp = cmp.filter(x => x !== s);
    else { if (cmp.length >= 3) cmp.shift(); cmp.push(s); track('sa_compare_add', { country: s }); }
    renderCompare();
  }
  $$('#cmpSel select').forEach((s, i) => s.addEventListener('change', () => { cmp = $$('#cmpSel select').map(x => x.value).filter(Boolean); cmp = [...new Set(cmp)]; renderCompare(); }));
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-cmp],[data-uncmp],[data-calc],[data-star],#cbarGo');
    if (!b) return;
    if (b.dataset.cmp) toggleCmp(b.dataset.cmp);
    else if (b.dataset.uncmp) { e.preventDefault(); toggleCmp(b.dataset.uncmp); }
    else if (b.dataset.calc) { cc.c.value = b.dataset.calc; prefill(); showTab('calc', true); $('#tool').scrollIntoView({ behavior: 'smooth' }); }
    else if (b.dataset.star) toggleStar(b.dataset.star);
    else if (b.id === 'cbarGo') { showTab('compare', true); $('#tool').scrollIntoView({ behavior: 'smooth' }); }
  });

  // ── Shortlist (stars) ─────────────────────────────────
  let stars = store.get('stars', []);
  function toggleStar(s) { stars = stars.includes(s) ? stars.filter(x => x !== s) : [...stars, s]; store.set('stars', stars); paintStars(); track('sa_shortlist', { country: s }); }
  function paintStars() {
    $$('[data-star]').forEach(b => { const on = stars.includes(b.dataset.star); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? '★ Saved' : '☆ Save'; });
    const n = $('#starCount'); if (n) n.textContent = stars.length ? `(${stars.length})` : '';
  }

  // ── Country grid filters ──────────────────────────────
  const gf = { q: $('#gQ'), region: $('#gRegion'), max: $('#gMax'), field: $('#gField'), eng: $('#gEng'), psw: $('#gPsw'), saved: $('#gSaved') };
  function filterGrid() {
    const q = (gf.q.value || '').toLowerCase().trim();
    const max = +gf.max.value;
    let shown = 0;
    $$('.cc[data-slug]').forEach(card => {
      const c = BY[card.dataset.slug];
      const ok = (!q || (c.name + ' ' + c.unis.map(u => u[0]).join(' ') + ' ' + c.tagline).toLowerCase().includes(q)) &&
        (!gf.region.value || c.region === gf.region.value || (gf.region.value === 'mbbs' && c.mbbs)) &&
        (max >= 80 || yearly(c, 'pg', 'min') <= max * 1e5) &&
        (!gf.field.value || c.strong.includes(gf.field.value)) &&
        (!gf.eng.checked || c.englishLife) &&
        (!gf.psw.checked || c.psw.months >= 24) &&
        (!gf.saved.checked || stars.includes(c.slug));
      card.hidden = !ok; if (ok) shown++;
    });
    $('#gCount').textContent = shown + ' of ' + D.COUNTRIES.length + ' destinations';
    $('#gMaxOut').textContent = max >= 80 ? 'Any' : '₹' + max + ' lakh/yr';
  }
  if (gf.q) Object.values(gf).forEach(el => el.addEventListener('input', filterGrid));

  // ── 4. TIMELINE PLANNER ───────────────────────────────
  const tC = $('#tCountry'), tStart = $('#tStart');
  function addMonths(d, m) { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; }
  const fmtM = d => d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
  const EXTRA = {
    germany: [[-11, 'Apply for the APS certificate (APS India, New Delhi) — needed before the visa'], [-4, 'Open and fund the blocked account (€11,904 for 2026)'], [-4, 'Book your German visa appointment — slots fill fast']],
    uk: [[-6, 'Apply via UCAS (bachelor’s, deadline usually late January) or directly (master’s)'], [-3, 'Keep funds in your account for 28 consecutive days'], [-2, 'Receive CAS, pay IHS and apply for the Student visa']],
    usa: [[-10, 'Take GRE/GMAT/SAT if your programs need them'], [-4, 'Receive I-20, pay the $350 SEVIS fee'], [-4, 'Book the F-1 visa interview immediately']],
    canada: [[-5, 'Get your Provincial Attestation Letter (PAL) from the institution'], [-4, 'Arrange proof of funds (C$23,448 + tuition) and apply for the study permit']],
    australia: [[-4, 'Accept offer, pay deposit, receive CoE; buy OSHC'], [-3, 'Write your Genuine Student statement and lodge the subclass 500 visa']],
    france: [[-7, 'Create your Campus France “Études en France” file and attend the interview'], [-3, 'Apply for the VLS-TS visa at VFS']],
    italy: [[-6, 'Complete Universitaly pre-enrolment'], [-6, 'Apply for DSU regional scholarship (income documents from India)']],
    ireland: [[-3, 'Show €10,000 funds + fees; apply for the study visa'], [0, 'Book the IRP registration appointment after arrival']],
    netherlands: [[-8, 'Non-EU deadlines are early (often Jan–Apr)'], [-4, 'University files your MVV/residence permit']],
    japan: [[-13, 'Apply for MEXT through the Embassy of Japan (around Apr–May)'], [-4, 'University applies for your Certificate of Eligibility']],
    'south-korea': [[-12, 'Apply for the Global Korea Scholarship (GKS)']],
    singapore: [[-3, 'Apply for the Student’s Pass through SOLAR']]
  };
  function plan() {
    if (!tC || !tStart.value) return;
    const c = BY[tC.value];
    const start = new Date(tStart.value + '-01');
    const steps = [
      [-15, 'Shortlist countries & universities; check eligibility and budget (use the tabs above)'],
      [-13, 'Start English test prep (IELTS/TOEFL/PTE/Duolingo); check if your board allows a waiver'],
      [-11, 'Take the English test (and GRE/GMAT if needed). Collect transcripts, degree, CV'],
      [-10, 'Write your SOP, ask 2–3 referees for LORs, prepare a portfolio if needed'],
      [-9, 'Apply to universities (aim for 5–8: reach, match, safe). Apply for scholarships in parallel'],
      [-6, 'Compare offers; check total cost and loan options; accept and pay deposit'],
      [-5, 'Apply for education loan; get the sanction letter (needed for visa funds)'],
      [-3, 'Apply for the student visa with financial documents, offer letter, insurance'],
      [-2, 'Book accommodation, flights; buy forex card; get medical and vaccination records'],
      [-1, 'Pre-departure: register on MADAD, carry original documents, copies and some cash'],
      [0, `Arrive in ${c.name}, complete local registration and start classes`]
    ].concat(EXTRA[c.slug] || []).sort((a, b) => a[0] - b[0]);
    const now = new Date();
    $('#tOut').innerHTML = `<ol class="tl">${steps.map(([m, t]) => { const d = addMonths(start, m); return `<li class="${d < now ? 'past' : ''}"><time>${fmtM(d)}${d < now ? ' · do this now' : ''}</time>${esc(t)}</li>`; }).join('')}</ol>
      <p class="note">Intakes for ${esc(c.name)}: ${esc(c.intakes.join(' · '))}. Deadlines differ by university — always check the program page.</p>
      <button class="btn ghost sm noprint" onclick="window.print()">Print / save as PDF</button>`;
    track('sa_timeline', { country: c.slug });
  }
  if (tC) {
    const y = new Date().getFullYear() + 1;
    tStart.innerHTML = [[y, 1, 'January'], [y, 2, 'February'], [y, 4, 'April'], [y, 7, 'July'], [y, 9, 'September'], [y, 10, 'October'], [y + 1, 1, 'January'], [y + 1, 9, 'September']]
      .map(([yy, m, n]) => `<option value="${yy}-${String(m).padStart(2, '0')}">${n} ${yy}</option>`).join('');
    tStart.value = y + '-09';
    tC.value = 'germany';
    tC.addEventListener('change', plan); tStart.addEventListener('change', plan); plan();
  }

  // ── 5. SCHOLARSHIPS ───────────────────────────────────
  const sQ = $('#sQ'), sLvl = $('#sLvl');
  function schol() {
    if (!sQ) return;
    const q = sQ.value.toLowerCase(), lv = sLvl.value;
    const rows = [];
    D.COUNTRIES.forEach(c => c.scholarships.forEach(s => {
      if (/^rare$/i.test(s[0])) return;
      if (lv && !s[1].toUpperCase().includes(lv)) return;
      if (q && !(c.name + ' ' + s.join(' ')).toLowerCase().includes(q)) return;
      rows.push(`<tr><td><b>${esc(s[0])}</b></td><td>${esc(c.short)}</td><td>${esc(s[1])}</td><td>${esc(s[2])}</td></tr>`);
    }));
    $('#sOut').innerHTML = rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>Scholarship</th><th>Country</th><th>Level</th><th>What it covers</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>` : '<p class="note">No scholarships match.</p>';
  }
  if (sQ) { sQ.addEventListener('input', schol); sLvl.addEventListener('change', schol); schol(); }

  // ── 6. DOCUMENT CHECKLIST ─────────────────────────────
  const kC = $('#kCountry');
  const BASE_DOCS = ['Valid passport (6+ months beyond course end)', 'Class 10 & 12 mark sheets and certificates', 'Bachelor’s transcripts, degree/provisional certificate (for PG)', 'English test score report (or waiver letter / MOI)', 'Statement of Purpose (SOP)', '2–3 Letters of Recommendation', 'Updated CV/resume', 'Offer / admission letter', 'Proof of funds: bank statements, loan sanction letter, sponsor affidavit, ITRs', 'Passport photos (country-specific size)', 'Health insurance proof', 'Medical / TB test if required', 'Visa application form + fee receipt', 'Gap explanation letter (if any study gap)'];
  const XDOCS = {
    germany: ['APS certificate', 'Blocked account confirmation', 'Health insurance confirmation (public/private)', 'Motivation letter'],
    uk: ['CAS number', '28-day bank statement', 'TB test certificate (from approved clinic)', 'IHS payment reference'],
    usa: ['I-20 form', 'SEVIS I-901 fee receipt', 'DS-160 confirmation page', 'Visa interview appointment letter'],
    canada: ['Provincial Attestation Letter (PAL)', 'Proof of funds (C$23,448 + first-year tuition)', 'Medical exam (if required)', 'Biometrics receipt'],
    australia: ['Confirmation of Enrolment (CoE)', 'OSHC policy', 'Genuine Student statement', 'Financial capacity evidence (A$29,710 + tuition + travel)'],
    france: ['Campus France NOC / Études en France approval', 'Accommodation proof', 'Proof of €615/month (check current figure)'],
    italy: ['Universitaly pre-enrolment summary', 'Declaration of Value / CIMEA statement', 'Accommodation proof'],
    ireland: ['Fee payment receipt', '€10,000 funds evidence', 'Private medical insurance'],
    'mbbs-in-russia': ['NEET-UG scorecard', 'University invitation letter', 'HIV test report', 'NMC eligibility check of the university'],
    'mbbs-in-georgia': ['NEET-UG scorecard', 'Admission order', 'NMC compliance check'],
    'mbbs-in-kazakhstan': ['NEET-UG scorecard', 'Invitation letter', 'NMC compliance check'],
    'mbbs-in-uzbekistan': ['NEET-UG scorecard', 'Invitation letter', 'NMC compliance check']
  };
  function checklist() {
    if (!kC) return;
    const s = kC.value, done = store.get('ck_' + s, []);
    const docs = BASE_DOCS.concat(XDOCS[s] || []);
    $('#kOut').innerHTML = `<p class="meta-line">${done.length} of ${docs.length} ready · saved on this device</p><div class="bar" style="margin-bottom:10px"><i style="width:${done.length / docs.length * 100}%"></i></div><ul class="ck">${docs.map((d, i) => `<li><input type="checkbox" id="ck${i}" data-doc="${i}" ${done.includes(i) ? 'checked' : ''}><label for="ck${i}" style="text-transform:none;letter-spacing:0;font-size:14px;color:var(--ink2);font-weight:500;margin:0">${esc(d)}</label></li>`).join('')}</ul><button class="btn ghost sm noprint" onclick="window.print()">Print checklist</button>`;
  }
  if (kC) {
    kC.value = 'germany';
    kC.addEventListener('change', checklist);
    $('#kOut').addEventListener('change', e => {
      const i = +e.target.dataset.doc; if (isNaN(i)) return;
      const k = 'ck_' + kC.value; let d = store.get(k, []);
      d = e.target.checked ? [...new Set([...d, i])] : d.filter(x => x !== i); store.set(k, d); checklist();
    });
    checklist();
  }

  // ── Deep links: #tab=calc&c=germany | #tab=compare&c=uk,canada ──
  function route() {
    const h = new URLSearchParams(location.hash.slice(1));
    const tab = h.get('tab'), c = h.get('c');
    if (tab === 'compare' && c) { cmp = c.split(',').filter(s => BY[s]).slice(0, 3); }
    if (tab === 'calc' && c && BY[c]) { cc.c.value = c; prefill(); }
    if (tab === 'plan' && c && BY[c]) { tC.value = c; plan(); }
    if (tab) { showTab(tab); setTimeout(() => $('#tool').scrollIntoView(), 50); }
  }
  window.addEventListener('hashchange', route);
  route();
  renderCompare();
  paintStars();
  if (gf.q) filterGrid();
})();
