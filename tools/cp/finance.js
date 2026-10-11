/* Finance + calendar helpers. Pure functions, no DOM. Window.CPFinance in the browser, module.exports in Node. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.CPFinance = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const num = v => (typeof v === 'number' && isFinite(v) ? v : NaN);

  /* Standard reducing-balance EMI. rate is % per year, years may be fractional. */
  function emi(principal, ratePct, years) {
    const P = num(principal), r = num(ratePct), y = num(years);
    if (!(P >= 0) || !(r >= 0) || !(y > 0)) return NaN;
    const n = Math.round(y * 12); if (n < 1) return NaN;
    const i = r / 100 / 12;
    if (i === 0) return P / n;
    const f = Math.pow(1 + i, n);
    return P * i * f / (f - 1);
  }

  /* Education-loan summary. Simple interest accrues on the loan during the study period (moratorium); this is a common
     arrangement but banks differ, so the assumption is returned for display. */
  function loanPlan(o) {
    const cost = num(o.cost), loan = num(o.loan), rate = num(o.ratePct), tenure = num(o.tenureYears), study = num(o.studyYears || 0), pkg = num(o.packageLpa);
    if (!(cost >= 0) || !(loan >= 0) || loan > cost + 1e-9) return { error: 'Loan cannot be more than the total cost.' };
    if (!(rate >= 0) || !(tenure > 0) || !(study >= 0)) return { error: 'Check the interest rate, tenure and study years.' };
    const accrued = loan * (rate / 100) * study;
    const principalAtStart = loan + accrued;
    const monthly = emi(principalAtStart, rate, tenure);
    const totalRepay = monthly * Math.round(tenure * 12);
    const totalInterest = totalRepay - loan;
    const out = { monthlyEmi: monthly, principalAtRepaymentStart: principalAtStart, accruedStudyInterest: accrued, totalRepayment: totalRepay, totalInterest,
      totalOutlay: cost - loan + totalRepay, assumption: 'Simple interest on the loan during the study years, then reducing-balance EMIs.' };
    if (pkg > 0) {
      const monthlyGross = pkg * 100000 / 12;
      out.emiShareOfGrossPay = monthly / monthlyGross;
      out.yearsOfPayToCoverOutlay = out.totalOutlay / (pkg * 100000);
      out.payAssumption = 'Uses gross pay (package / 12) with no tax, no raises and no living costs.';
    }
    return out;
  }

  const inr = v => { if (!isFinite(v)) return '—'; const a = Math.abs(v);
    if (a >= 1e7) return '₹' + (v / 1e7).toFixed(2) + ' Cr'; if (a >= 1e5) return '₹' + (v / 1e5).toFixed(2) + ' L'; return '₹' + Math.round(v).toLocaleString('en-IN'); };

  /* iCalendar (.ics) for an all-day reminder with an alarm. */
  function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) { const out = []; let cur = '', bytes = 0;
    for (const ch of line) { const cp = ch.codePointAt(0), b = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4; if (bytes + b > 74) { out.push(cur); cur = ' ' + ch; bytes = 1 + b; } else { cur += ch; bytes += b; } }
    out.push(cur); return out.join('\r\n'); }
  const ymd = d => d.replace(/-/g, '');
  function buildICS(r) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date || '')) return null;
    const t = new Date(r.date + 'T00:00:00Z'); if (isNaN(t)) return null;
    if (t.toISOString().slice(0, 10) !== r.date) return null;           // rejects 2026-02-31 style dates
    const end = new Date(t.getTime() + 86400000).toISOString().slice(0, 10);
    const stamp = (r.stamp || new Date().toISOString()).replace(/[-:]/g, '').replace(/\.\d+/, '');
    const days = Number.isInteger(r.daysBefore) && r.daysBefore >= 0 ? r.daysBefore : 1;
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Student Toolkit//College Predictor//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + (r.uid || (stamp + '-' + Math.random().toString(36).slice(2, 10))) + '@studenttoolkit.online', 'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + ymd(r.date), 'DTEND;VALUE=DATE:' + ymd(end), 'SUMMARY:' + icsEscape(r.title || 'Counselling date'),
      'DESCRIPTION:' + icsEscape((r.note || '') + (r.url ? '\nCheck the official notice: ' + r.url : '')),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(r.title || 'Counselling date'), 'TRIGGER:-P' + days + 'D', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  return { emi, loanPlan, inr, buildICS };
});
