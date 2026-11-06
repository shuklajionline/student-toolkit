/* Student Toolkit — Letter & Email Writer template library (no AI, no API).
 * Used by the browser app (tools/writer/writer.js) and the page builder (scripts/build-writer.js).
 *
 * Each template:
 *   id, cat, icon, title, desc, kind: 'letter' | 'email', lang: 'en' | 'hi',
 *   to: default recipient line(s) for letters, toPresets: quick choices,
 *   fields: [{k, label, ph, type:'text'|'date'|'textarea'|'select', opts, req}],
 *   sample: example values (Indian context), tips: [..],
 *   render(v, x) → { subject, paras: [..] }   (x = helpers: tone, length, dates, etc.)
 */
(function (root) {
  'use strict';

  const CATS = [
    ['leave', '🏥', 'Leave & attendance'],
    ['docs', '📜', 'Certificates & documents'],
    ['fees', '💳', 'Fees, hostel & admin'],
    ['academic', '🎓', 'Professors & academics'],
    ['career', '💼', 'Internships & jobs'],
    ['abroad', '🌍', 'Admissions & study abroad'],
    ['hindi', '🇮🇳', 'हिंदी पत्र (Hindi)']
  ];

  // Recipient presets for college letters.
  const COLLEGE_TO = ['The Principal', 'The Head of Department', 'The Class Teacher / Class Coordinator', 'The Dean (Academics)', 'The Registrar', 'The Hostel Warden', 'The Director'];

  const T = [];
  const add = t => T.push(t);

  /* ═══════════ LEAVE & ATTENDANCE ═══════════ */
  add({
    id: 'sick-leave', cat: 'leave', icon: '🤒', kind: 'letter', title: 'Sick leave application',
    desc: 'Medical leave for fever, illness or injury — with dates and medical certificate.',
    to: 'The Principal', toPresets: COLLEGE_TO,
    fields: [
      { k: 'from', label: 'Leave from', type: 'date', req: 1 },
      { k: 'till', label: 'Leave till', type: 'date', req: 1 },
      { k: 'illness', label: 'Illness / reason', ph: 'viral fever and throat infection', req: 1 },
      { k: 'cert', label: 'Medical certificate?', type: 'select', opts: ['I have attached a medical certificate', 'I will submit a medical certificate on rejoining', 'No certificate'] }
    ],
    sample: { from: '2026-11-10', till: '2026-11-12', illness: 'viral fever and throat infection', cert: 'I have attached a medical certificate' },
    tips: ['Submit on the first day of absence or as soon as possible — many colleges only count leave applied within 3 days.', 'Attach a doctor’s certificate for leave longer than 2 days.', 'Check your attendance after the leave with the Bunk Meter.'],
    render(v, x) {
      const span = x.span(v.from, v.till);
      return {
        subject: `Application for sick leave ${span.range}`,
        paras: [
          `${x.t('With due respect, I', 'I', 'I')} ${x.intro()}. ${x.t('I beg to state', 'I would like to inform you', 'I am writing to inform you')} that I am suffering from ${v.illness || '[illness]'} and have been advised complete rest by the doctor. Therefore, I will not be able to attend college ${span.range}${span.days ? ` (${span.days})` : ''}.`,
          v.cert && v.cert !== 'No certificate' ? `${v.cert}.` : '',
          x.long(`I will make sure to cover the syllabus and complete any assignments and practicals I miss, and will contact my classmates and faculty for the notes.`),
          `${x.t('I kindly request you to', 'I would be grateful if you could', 'Please')} grant me leave for the above-mentioned days${x.t('.', '.', ' and mark my attendance accordingly.')}`
        ]
      };
    }
  });
  add({
    id: 'urgent-leave', cat: 'leave', icon: '🏠', kind: 'letter', title: 'Leave for family function / urgent work',
    desc: 'Wedding in the family, family emergency, or urgent personal work at home.',
    to: 'The Principal', toPresets: COLLEGE_TO,
    fields: [
      { k: 'reason', label: 'Reason', type: 'select', opts: ['my sister’s wedding', 'my brother’s wedding', 'a family function', 'a medical emergency in my family', 'urgent personal work at home', 'the death of a close relative'], req: 1 },
      { k: 'place', label: 'Where you need to travel (optional)', ph: 'Lucknow' },
      { k: 'from', label: 'Leave from', type: 'date', req: 1 },
      { k: 'till', label: 'Leave till', type: 'date', req: 1 }
    ],
    sample: { reason: 'my sister’s wedding', place: 'Lucknow', from: '2026-12-04', till: '2026-12-08' },
    tips: ['Apply at least a week before for planned events like weddings.', 'Mention that you will catch up on missed work — it improves approval chances.'],
    render(v, x) {
      const span = x.span(v.from, v.till);
      return {
        subject: `Application for leave ${span.range} due to ${v.reason}`,
        paras: [
          `${x.t('With due respect, I', 'I', 'I')} ${x.intro()}. ${x.t('I beg to state', 'I would like to inform you', 'I am writing to inform you')} that I need to be present for ${v.reason || '[reason]'}${v.place ? ` in ${v.place}` : ''}. Hence, I will be unable to attend classes ${span.range}${span.days ? ` (${span.days})` : ''}.`,
          x.long(`I assure you that I will complete all pending assignments and cover the topics taught during my absence.`),
          `${x.t('Kindly grant me leave for the said period.', 'I would be grateful if you could grant me leave for these days.', 'Please grant me leave for these days.')}`
        ]
      };
    }
  });
  add({
    id: 'event-leave', cat: 'leave', icon: '🏆', kind: 'letter', title: 'Duty leave for event / competition',
    desc: 'On-duty (OD) leave for hackathons, sports, NCC/NSS camps, fests or conferences.',
    to: 'The Head of Department', toPresets: COLLEGE_TO,
    fields: [
      { k: 'event', label: 'Event name', ph: 'Smart India Hackathon 2026 Grand Finale', req: 1 },
      { k: 'org', label: 'Organised by / venue', ph: 'AICTE, at IIT Gandhinagar' },
      { k: 'from', label: 'From', type: 'date', req: 1 },
      { k: 'till', label: 'Till', type: 'date', req: 1 },
      { k: 'role', label: 'Your role', ph: 'team leader of a 6-member team' }
    ],
    sample: { event: 'Smart India Hackathon 2026 Grand Finale', org: 'AICTE, at IIT Gandhinagar', from: '2026-12-08', till: '2026-12-10', role: 'team leader of a 6-member team' },
    tips: ['Attach the selection email or invitation letter.', 'Ask the HOD to mark it as On Duty (OD) so it doesn’t reduce your attendance.'],
    render(v, x) {
      const span = x.span(v.from, v.till);
      return {
        subject: `Request for duty leave (OD) to participate in ${v.event}`,
        paras: [
          `${x.t('With due respect, I', 'I', 'I')} ${x.intro()}. ${x.t('I am pleased to inform you', 'I am happy to share', 'I am writing to inform you')} that I have been selected to participate in ${v.event || '[event]'}${v.org ? `, organised by ${v.org}` : ''}${v.role ? `, as ${v.role}` : ''}. The event is scheduled ${span.range}.`,
          `I request you to kindly grant me duty leave (On Duty) for ${span.days || 'these days'} and to mark my attendance accordingly. A copy of the selection/invitation letter is attached.`,
          x.long(`Participating will help me apply what I have learnt in class and represent our college. I will cover all classes and assignments missed during this period.`)
        ]
      };
    }
  });
  add({
    id: 'attendance-condonation', cat: 'leave', icon: '📊', kind: 'letter', title: 'Attendance shortage condonation',
    desc: 'Request to allow you to sit for exams despite attendance below 75%.',
    to: 'The Principal', toPresets: COLLEGE_TO,
    fields: [
      { k: 'pct', label: 'Your current attendance (%)', ph: '68', req: 1 },
      { k: 'subj', label: 'Subject(s) affected (optional)', ph: 'Engineering Mathematics III and Data Structures' },
      { k: 'reason', label: 'Genuine reason for shortage', type: 'textarea', ph: 'I was hospitalised for dengue from 3 to 18 September and could not attend classes.', req: 1 },
      { k: 'docs', label: 'Supporting documents', ph: 'discharge summary and medical certificate' },
      { k: 'exam', label: 'Upcoming exam', ph: 'end-semester examinations starting 1 December 2026' }
    ],
    sample: { pct: '68', subj: 'Engineering Mathematics III and Data Structures', reason: 'I was hospitalised for dengue from 3 to 18 September 2026 and was on bed rest for another week after discharge.', docs: 'discharge summary and medical certificate', exam: 'end-semester examinations starting 1 December 2026' },
    tips: ['Only genuine, documented reasons (medical, family emergency, college duty) are usually condoned.', 'Most universities allow condonation only down to a limit (often 65%) — check your rules.', 'Promise to attend every class until the exam — and do it.'],
    render(v, x) {
      return {
        subject: `Request for condonation of attendance shortage${v.exam ? ` for ${v.exam}` : ''}`,
        paras: [
          `${x.t('With due respect, I', 'I', 'I')} ${x.intro()}. ${x.t('I beg to state', 'I would like to bring to your notice', 'I am writing to inform you')} that my attendance is currently ${v.pct || '[__]'}%${v.subj ? ` in ${v.subj}` : ''}, which is below the required 75%.`,
          `This shortage is due to a genuine reason: ${x.sentence(v.reason || '[reason]')}${v.docs ? ` I have attached the ${v.docs} as proof.` : ''}`,
          x.long(`I understand the importance of regular attendance and the rules of the institution. I have been studying regularly to cover the syllabus and have completed all assignments and lab work.`),
          `I humbly request you to condone the shortage and allow me to appear in the ${v.exam || 'upcoming examinations'}. I assure you that I will attend all classes regularly from now on.`
        ]
      };
    }
  });

  /* ═══════════ CERTIFICATES & DOCUMENTS ═══════════ */
  add({
    id: 'bonafide', cat: 'docs', icon: '📜', kind: 'letter', title: 'Bonafide certificate request',
    desc: 'For scholarships, bank accounts, education loans, passports, concessions or internships.',
    to: 'The Principal', toPresets: COLLEGE_TO,
    fields: [
      { k: 'purpose', label: 'Purpose', type: 'select', opts: ['applying for a scholarship', 'applying for an education loan', 'opening a bank account', 'applying for a passport', 'applying for a railway/bus concession', 'applying for an internship', 'applying for a visa'], req: 1 },
      { k: 'org', label: 'For which organisation (optional)', ph: 'State Bank of India, Rajajinagar branch' },
      { k: 'year', label: 'Academic year', ph: '2026–27' }
    ],
    sample: { purpose: 'applying for an education loan', org: 'State Bank of India, Rajajinagar branch', year: '2026–27' },
    tips: ['Mention the exact purpose — some offices need it printed on the certificate.', 'Ask whether they need a copy of your ID card and fee receipt.'],
    render(v, x) {
      return {
        subject: `Request for bonafide certificate for ${v.purpose}`,
        paras: [
          `${x.t('With due respect, I', 'I', 'I')} ${x.intro()}${v.year ? ` for the academic year ${v.year}` : ''}. I require a bonafide certificate for ${v.purpose || '[purpose]'}${v.org ? ` with ${v.org}` : ''}.`,
          `${x.t('I kindly request you to', 'I would be grateful if you could', 'Please')} issue the certificate at the earliest. I have attached a copy of my college ID card${x.len === 'detailed' ? ' and latest fee receipt' : ''} for reference.`
        ]
      };
    }
  });
  add({
    id: 'tc', cat: 'docs', icon: '🎒', kind: 'letter', title: 'Transfer / migration certificate (TC)',
    desc: 'Leaving the college or university — request TC, migration certificate and original documents.',
    to: 'The Principal', toPresets: COLLEGE_TO,
    fields: [
      { k: 'docType', label: 'Certificate needed', type: 'select', opts: ['Transfer Certificate (TC)', 'Migration Certificate', 'Transfer Certificate and Migration Certificate'], req: 1 },
      { k: 'reason', label: 'Reason for leaving', ph: 'I have secured admission at NIT Trichy through JoSAA counselling', req: 1 },
      { k: 'originals', label: 'Also return original documents?', type: 'select', opts: ['Yes — also return my original mark sheets and certificates', 'No'] },
      { k: 'dues', label: 'Dues status', type: 'select', opts: ['I have cleared all dues and returned library books', 'I will clear any pending dues'] }
    ],
    sample: { docType: 'Transfer Certificate and Migration Certificate', reason: 'I have secured admission at NIT Tiruchirappalli through JoSAA counselling', originals: 'Yes — also return my original mark sheets and certificates', dues: 'I have cleared all dues and returned library books' },
    tips: ['Get a “No Dues” form signed by the library, hostel, accounts and department first.', 'Colleges should not hold your original documents — ask politely and escalate if needed.'],
    render(v, x) {
      return {
        subject: `Application for ${v.docType}`,
        paras: [
          `${x.t('With due respect, I', 'I', 'I')} ${x.intro()}. ${x.sentence(v.reason || '[reason]')} Therefore, I wish to discontinue my studies at this institution.`,
          `${x.t('I kindly request you to', 'I would be grateful if you could', 'Please')} issue my ${v.docType}${v.originals && v.originals.startsWith('Yes') ? ' and return my original mark sheets and certificates submitted at the time of admission' : ''}. ${v.dues || ''}.`.replace(/\.\./g, '.'),
          x.long(`I am thankful to the faculty and staff for their guidance and support during my time here.`)
        ]
      };
    }
  });
  add({
    id: 'character-cert', cat: 'docs', icon: '✅', kind: 'letter', title: 'Character certificate request',
    desc: 'For jobs, government applications, higher studies or police verification.',
    to: 'The Principal', toPresets: COLLEGE_TO,
    fields: [
      { k: 'purpose', label: 'Purpose', ph: 'my application for an MBA programme at IIM Indore', req: 1 },
      { k: 'years', label: 'Years at the college', ph: '2023–2027' }
    ],
    sample: { purpose: 'my job application at Infosys', years: '2023–2027' },
    tips: ['Ask if they also need a no-objection certificate (NOC) for the same purpose.'],
    render(v, x) {
      return {
        subject: 'Request for character certificate',
        paras: [
          `${x.t('With due respect, I', 'I', 'I')} ${x.intro()}${v.years ? ` (batch ${v.years})` : ''}. I require a character certificate for ${v.purpose || '[purpose]'}.`,
          `${x.t('I kindly request you to', 'I would be grateful if you could', 'Please')} issue the certificate at your earliest convenience.`
        ]
      };
    }
  });
  add({
    id: 'duplicate-id', cat: 'docs', icon: '🪪', kind: 'letter', title: 'Duplicate ID card / lost document',
    desc: 'Lost or damaged college ID card, library card or hall ticket.',
    to: 'The Principal', toPresets: COLLEGE_TO,
    fields: [
      { k: 'item', label: 'What was lost/damaged', type: 'select', opts: ['college ID card', 'library card', 'hall ticket / admit card', 'hostel ID card'], req: 1 },
      { k: 'how', label: 'What happened', ph: 'I lost it while travelling in the metro on 5 November 2026', req: 1 },
      { k: 'fee', label: 'Fee', type: 'select', opts: ['I am ready to pay the prescribed fee', 'I have paid the prescribed fee and attached the receipt'] }
    ],
    sample: { item: 'college ID card', how: 'I lost it while travelling in the metro on 5 November 2026', fee: 'I am ready to pay the prescribed fee' },
    tips: ['For a lost hall ticket before an exam, go to the exam cell in person the same day.'],
    render(v, x) {
      return {
        subject: `Request for duplicate ${v.item}`,
        paras: [
          `${x.t('With due respect, I', 'I', 'I')} ${x.intro()}. ${x.t('I beg to state', 'I would like to inform you', 'I am writing to inform you')} that ${x.lower(v.how || '[what happened]')}, and I have lost my ${v.item}.`,
          `${x.t('I kindly request you to', 'I would be grateful if you could', 'Please')} issue a duplicate ${v.item}. ${v.fee || ''}.`.replace(/\.\./g, '.')
        ]
      };
    }
  });
  add({
    id: 'noc-internship', cat: 'docs', icon: '📝', kind: 'letter', title: 'NOC for internship',
    desc: 'No Objection Certificate from college to do an internship or training.',
    to: 'The Head of Department', toPresets: COLLEGE_TO,
    fields: [
      { k: 'company', label: 'Company / organisation', ph: 'Tata Consultancy Services, Pune', req: 1 },
      { k: 'role', label: 'Role', ph: 'Data Analyst Intern' },
      { k: 'from', label: 'From', type: 'date', req: 1 },
      { k: 'till', label: 'Till', type: 'date', req: 1 },
      { k: 'mode', label: 'Mode', type: 'select', opts: ['in-office', 'remote', 'hybrid'] }
    ],
    sample: { company: 'Tata Consultancy Services, Pune', role: 'Data Analyst Intern', from: '2027-05-15', till: '2027-07-15', mode: 'in-office' },
    tips: ['Attach the offer letter — most HODs won’t sign without it.', 'If the internship overlaps classes, ask about OD/attendance in the same letter.'],
    render(v, x) {
      const span = x.span(v.from, v.till);
      return {
        subject: `Request for No Objection Certificate (NOC) for internship at ${v.company}`,
        paras: [
          `${x.t('With due respect, I', 'I', 'I')} ${x.intro()}. I have been offered ${v.role ? `the position of ${v.role}` : 'an internship'} at ${v.company || '[company]'}${v.mode ? ` (${v.mode})` : ''} ${span.range}.`,
          `The company requires a No Objection Certificate from the college. ${x.t('I kindly request you to', 'I would be grateful if you could', 'Please')} issue the NOC. A copy of the offer letter is attached.`,
          x.long(`This internship will give me practical exposure to my field of study. I will ensure it does not affect my academic responsibilities.`)
        ]
      };
    }
  });

  /* ═══════════ FEES, HOSTEL & ADMIN ═══════════ */
  add({
    id: 'fee-concession', cat: 'fees', icon: '💳', kind: 'letter', title: 'Fee concession / instalment request',
    desc: 'Ask for fee reduction, waiver or permission to pay in instalments.',
    to: 'The Principal', toPresets: COLLEGE_TO,
    fields: [
      { k: 'ask', label: 'Request', type: 'select', opts: ['a fee concession', 'permission to pay the fee in instalments', 'an extension of the fee payment deadline'], req: 1 },
      { k: 'amount', label: 'Fee amount (optional)', ph: '₹68,500 for the 5th semester' },
      { k: 'reason', label: 'Financial situation', type: 'textarea', ph: 'My father is a farmer and this year’s crop was damaged by unseasonal rain.', req: 1 },
      { k: 'plan', label: 'Proposed plan (optional)', ph: 'pay ₹35,000 by 30 November and the balance by 15 January' }
    ],
    sample: { ask: 'permission to pay the fee in instalments', amount: '₹68,500 for the 5th semester', reason: 'My father is a farmer and this year’s crop was badly damaged by unseasonal rain, which has affected our family income.', plan: 'pay ₹35,000 by 30 November 2026 and the balance by 15 January 2027' },
    tips: ['Attach an income certificate if you are asking for a concession.', 'A specific instalment plan is approved more often than an open-ended request.'],
    render(v, x) {
      return {
        subject: `Request for ${v.ask}`,
        paras: [
          `${x.t('With due respect, I', 'I', 'I')} ${x.intro()}. ${x.sentence(v.reason || '[financial situation]')}`,
          `Due to this, it is difficult for my family to pay the ${v.amount ? `fee of ${v.amount}` : 'fee'} at once. ${x.t('I humbly request you to grant me', 'I would be very grateful if you could grant me', 'I request')} ${v.ask}${v.plan ? `, so that I can ${v.plan}` : ''}.`,
          x.long(`I am committed to my studies and do not want financial difficulties to interrupt my education. I will be happy to submit any documents required.`)
        ]
      };
    }
  });
  add({
    id: 'fee-refund', cat: 'fees', icon: '↩️', kind: 'letter', title: 'Fee refund after cancelling admission',
    desc: 'Claim a refund of fees and return of documents after withdrawing admission.',
    to: 'The Registrar', toPresets: COLLEGE_TO,
    fields: [
      { k: 'course', label: 'Course you were admitted to', ph: 'B.Com (Hons), 2026–27 batch', req: 1 },
      { k: 'paid', label: 'Amount paid & date', ph: '₹85,000 paid on 12 July 2026 (receipt no. 4471)', req: 1 },
      { k: 'cancel', label: 'Date you cancelled admission', type: 'date', req: 1 },
      { k: 'reason', label: 'Reason (optional)', ph: 'I have taken admission at another university' },
      { k: 'bank', label: 'Bank details for refund (optional)', ph: 'A/c 1234567890, IFSC SBIN0001234' }
    ],
    sample: { course: 'B.Com (Hons), 2026–27 batch', paid: '₹85,000 paid on 12 July 2026 (receipt no. 4471)', cancel: '2026-08-20', reason: 'I have taken admission at another university', bank: '' },
    tips: ['UGC’s fee refund policy requires a full refund (minus a small processing fee) if you withdraw before its notified cut-off date.', 'Keep copies of the receipt and your cancellation request.', 'Read our guide on checking whether a college is genuine before paying any fee.'],
    render(v, x) {
      return {
        subject: `Request for refund of fees and return of original documents`,
        paras: [
          `I was admitted to ${v.course || '[course]'} and paid ${v.paid || '[amount and date]'}. I withdrew my admission on ${x.date(v.cancel)}${v.reason ? ` as ${x.lower(v.reason)}` : ''}.`,
          `As per the fee refund policy notified by the UGC and the institution, I request you to refund the fees paid and return my original documents at the earliest.${v.bank ? ` My bank details for the refund are: ${v.bank}.` : ''}`,
          x.long(`I have attached copies of the fee receipt and my cancellation request. I would be grateful for a written confirmation of the refund timeline.`)
        ]
      };
    }
  });
  add({
    id: 'hostel-leave', cat: 'fees', icon: '🧳', kind: 'letter', title: 'Hostel leave / night-out permission',
    desc: 'Permission from the warden to go home or stay out.',
    to: 'The Hostel Warden', toPresets: ['The Hostel Warden', 'The Chief Warden'],
    fields: [
      { k: 'room', label: 'Room no. & hostel', ph: 'Room 214, Kaveri Hostel', req: 1 },
      { k: 'dest', label: 'Going to', ph: 'my home in Nagpur', req: 1 },
      { k: 'from', label: 'Leaving on', type: 'date', req: 1 },
      { k: 'till', label: 'Returning on', type: 'date', req: 1 },
      { k: 'reason', label: 'Reason', ph: 'Diwali vacation' },
      { k: 'contact', label: 'Parent contact', ph: 'Mr. Suresh Patil, 98xxxxxx21' }
    ],
    sample: { room: 'Room 214, Kaveri Hostel', dest: 'my home in Nagpur', from: '2026-11-07', till: '2026-11-11', reason: 'Diwali vacation', contact: 'Mr. Suresh Patil (father), +91 98xxxxxx21' },
    tips: ['Most hostels need parental consent by call or email — inform your parents first.'],
    render(v, x) {
      const span = x.span(v.from, v.till);
      return {
        subject: `Request for hostel leave ${span.range}`,
        paras: [
          `I, ${x.v.name || '[name]'}, a resident of ${v.room || '[room/hostel]'}, request permission to leave the hostel to go to ${v.dest || '[destination]'}${v.reason ? ` for ${v.reason}` : ''}. I will leave on ${x.date(v.from)} and return on ${x.date(v.till)}.`,
          v.contact ? `My parents are aware of my travel. Contact: ${v.contact}.` : '',
          `${x.t('Kindly grant me permission.', 'I would be grateful if you could grant me permission.', 'Please grant me permission.')}`
        ]
      };
    }
  });
  add({
    id: 'room-change', cat: 'fees', icon: '🚪', kind: 'letter', title: 'Hostel room change request',
    desc: 'Request a room change for health, study or roommate issues — politely.',
    to: 'The Hostel Warden', toPresets: ['The Hostel Warden', 'The Chief Warden'],
    fields: [
      { k: 'room', label: 'Current room & hostel', ph: 'Room 108, Block B', req: 1 },
      { k: 'reason', label: 'Reason', type: 'textarea', ph: 'The room is next to the common washroom and is very damp, which is worsening my asthma.', req: 1 },
      { k: 'pref', label: 'Preferred room (optional)', ph: 'any vacant room on the 2nd floor' }
    ],
    sample: { room: 'Room 108, Block B', reason: 'The room is next to the common washroom and is very damp, which is worsening my asthma.', pref: 'any vacant room on the 2nd floor' },
    tips: ['Keep it factual. If the issue is ragging or harassment, use the anti-ragging complaint template instead.'],
    render(v, x) {
      return {
        subject: 'Request for change of hostel room',
        paras: [
          `I, ${x.v.name || '[name]'}, currently staying in ${v.room || '[room]'}, request a change of room. ${x.sentence(v.reason || '[reason]')}`,
          `${x.t('I kindly request you to', 'I would be grateful if you could', 'Please')} allot me ${v.pref || 'another room'} at the earliest. I will follow all hostel rules regarding the shift.`
        ]
      };
    }
  });
  add({
    id: 'anti-ragging', cat: 'fees', icon: '🛡️', kind: 'letter', title: 'Complaint about ragging / harassment',
    desc: 'Formal complaint to the Anti-Ragging Committee. Also call the national helpline 1800-180-5522.',
    to: 'The Chairperson, Anti-Ragging Committee', toPresets: ['The Chairperson, Anti-Ragging Committee', 'The Principal', 'The Hostel Warden'],
    fields: [
      { k: 'when', label: 'Date & place of incident', ph: '3 November 2026, around 10 pm, in Block C of the boys’ hostel', req: 1 },
      { k: 'what', label: 'What happened (facts only)', type: 'textarea', ph: 'Three senior students forced me to stand for an hour, verbally abused me and threatened me not to report it.', req: 1 },
      { k: 'who', label: 'Who was involved (if known)', ph: 'names/roll numbers if known' },
      { k: 'witness', label: 'Witnesses / evidence (optional)', ph: 'my roommate; voice recording on my phone' }
    ],
    sample: { when: '3 November 2026, around 10 pm, in Block C of the boys’ hostel', what: 'Three senior students forced me to stand for an hour, verbally abused me and threatened me not to report it.', who: 'I can identify them; I do not know their names', witness: 'my roommate was present' },
    tips: ['You can also complain to the UGC national anti-ragging helpline: 1800-180-5522 or helpline@antiragging.in.', 'Keep a copy of the complaint and note the date you submitted it.', 'If you are in danger, call 112 first.'],
    render(v, x) {
      return {
        subject: 'Formal complaint regarding ragging incident',
        paras: [
          `I ${x.intro()}. I wish to report an incident of ragging that took place on ${v.when || '[date, time and place]'}.`,
          `${x.sentence(v.what || '[what happened]')}${v.who ? ` Persons involved: ${v.who}.` : ''}${v.witness ? ` Witnesses/evidence: ${v.witness}.` : ''}`,
          `This has caused me serious distress and fear. I request the committee to take immediate action as per the UGC Regulations on Curbing the Menace of Ragging, ensure my safety, and keep my identity confidential.`
        ]
      };
    }
  });

  /* ═══════════ PROFESSORS & ACADEMICS ═══════════ */
  add({
    id: 'assignment-extension', cat: 'academic', icon: '⏳', kind: 'email', title: 'Assignment / project deadline extension',
    desc: 'Ask a professor for more time — honestly and specifically.',
    to: 'Prof.', fields: [
      { k: 'prof', label: 'Professor’s name', ph: 'Dr. Meera Iyer', req: 1 },
      { k: 'work', label: 'Assignment / project', ph: 'Operating Systems Lab Assignment 4', req: 1 },
      { k: 'due', label: 'Current deadline', type: 'date', req: 1 },
      { k: 'newdate', label: 'Requested new deadline', type: 'date', req: 1 },
      { k: 'reason', label: 'Reason', ph: 'I was unwell with fever for three days last week', req: 1 },
      { k: 'progress', label: 'Progress so far (optional)', ph: 'I have completed 3 of the 5 programs' }
    ],
    sample: { prof: 'Dr. Meera Iyer', work: 'Operating Systems Lab Assignment 4', due: '2026-11-10', newdate: '2026-11-13', reason: 'I was unwell with fever for three days last week', progress: 'I have completed 3 of the 5 programs' },
    tips: ['Ask before the deadline, not after.', 'Propose a specific new date — it’s easier to say yes to.'],
    render(v, x) {
      return {
        subject: `Request for extension: ${v.work}`,
        greet: `Dear ${v.prof || 'Professor'},`,
        paras: [
          `I hope you are doing well. I am ${x.v.name || '[name]'}${x.v.course ? ` from ${x.v.course}` : ''}${x.v.roll ? ` (Roll No. ${x.v.roll})` : ''}.`,
          `I am writing to request an extension for ${v.work || '[assignment]'}, which is due on ${x.date(v.due)}. ${x.cap(v.reason || '[reason]')}, which has delayed my work.${v.progress ? ` So far, ${x.lower(v.progress)}.` : ''}`,
          `${x.t('Would it be possible to submit it by', 'Could I please submit it by', 'I would like to submit it by')} ${x.date(v.newdate)}? I will make sure the quality of the work is not affected.`,
          x.long(`I understand deadlines are important for the whole class, and I appreciate your consideration.`),
          `Thank you for your time.`
        ]
      };
    }
  });
  add({
    id: 'lor-request', cat: 'academic', icon: '⭐', kind: 'email', title: 'Letter of recommendation (LOR) request',
    desc: 'Ask a professor for an LOR for MS, MBA, jobs or scholarships.',
    fields: [
      { k: 'prof', label: 'Professor’s name', ph: 'Dr. Anil Kulkarni', req: 1 },
      { k: 'purpose', label: 'Applying to', ph: 'MS in Computer Science programmes for Fall 2027', req: 1 },
      { k: 'unis', label: 'Universities / organisations', ph: 'University of Toronto, TU Munich and Georgia Tech' },
      { k: 'deadline', label: 'Earliest deadline', type: 'date', req: 1 },
      { k: 'link', label: 'How they know you', type: 'textarea', ph: 'I took your Machine Learning course (grade A+) and worked on my final-year project on crop disease detection under your guidance.', req: 1 }
    ],
    sample: { prof: 'Dr. Anil Kulkarni', purpose: 'MS in Computer Science programmes for Fall 2027', unis: 'University of Toronto, TU Munich and Georgia Tech', deadline: '2026-12-15', link: 'I took your Machine Learning course (grade A+) and completed my final-year project on crop disease detection under your guidance.' },
    tips: ['Ask at least 4–6 weeks before the deadline.', 'Offer a one-page “brag sheet”: CV, grades in their course, projects, and what you’d like them to highlight.', 'Compare study destinations and costs with the Study Abroad Finder.'],
    render(v, x) {
      return {
        subject: `Request for a letter of recommendation — ${v.purpose}`,
        greet: `Dear ${v.prof || 'Professor'},`,
        paras: [
          `I hope you are doing well. I am ${x.v.name || '[name]'}${x.v.course ? `, ${x.v.course}` : ''}.`,
          `I am applying to ${v.purpose || '[programme]'}${v.unis ? ` at ${v.unis}` : ''}, and I would be honoured if you could write a letter of recommendation for me. ${x.sentence(v.link || '[how they know you]')}`,
          `The earliest deadline is ${x.date(v.deadline)}. To make this easier, I can share my CV, transcript, statement of purpose and a short summary of my work in your course.`,
          x.long(`I completely understand if your schedule does not allow it. Either way, thank you for your guidance — it has shaped my interest in this field.`),
          `Thank you for considering my request.`
        ]
      };
    }
  });
  add({
    id: 'research-internship', cat: 'academic', icon: '🔬', kind: 'email', title: 'Research internship request to a professor',
    desc: 'Cold email to a professor at an IIT/IISc/university for a summer research internship.',
    fields: [
      { k: 'prof', label: 'Professor’s name', ph: 'Prof. Rajesh Menon', req: 1 },
      { k: 'inst', label: 'Institute & department', ph: 'Department of Electrical Engineering, IIT Bombay', req: 1 },
      { k: 'paper', label: 'Their work you read', ph: 'your 2025 paper on low-power edge AI accelerators', req: 1 },
      { k: 'skills', label: 'Your relevant skills/work', type: 'textarea', ph: 'I have built an FPGA-based image classifier (Verilog, 92% accuracy) and completed NPTEL VLSI Design with 88%.', req: 1 },
      { k: 'period', label: 'Availability', ph: 'May–July 2027' }
    ],
    sample: { prof: 'Prof. Rajesh Menon', inst: 'Department of Electrical Engineering, IIT Bombay', paper: 'your 2025 paper on low-power edge AI accelerators', skills: 'I have built an FPGA-based image classifier (Verilog, 92% accuracy) and completed NPTEL VLSI Design with a score of 88%.', period: 'May–July 2027' },
    tips: ['Personalise every email — mention a specific paper or project.', 'Keep it under 200 words and attach a one-page CV.', 'Follow up once after 7–10 days; don’t send more than two follow-ups.'],
    render(v, x) {
      return {
        subject: `Summer research internship (${v.period || 'summer'}) — ${x.v.course || 'student'} interested in your work`,
        greet: `Dear ${v.prof || 'Professor'},`,
        paras: [
          `I am ${x.v.name || '[name]'}, ${x.v.course || '[course]'}${x.v.college ? ` at ${x.v.college}` : ''}. I recently read ${v.paper || '[their work]'} and was particularly interested in its approach.`,
          `${x.sentence(v.skills || '[your skills]')} I would be grateful for an opportunity to work as a research intern in your group at ${v.inst || '[institute]'}${v.period ? ` during ${v.period}` : ''}.`,
          `I have attached my CV. I would be happy to work on any problem your group is exploring and can start with a small task to demonstrate my skills.`,
          `Thank you for your time and consideration.`
        ]
      };
    }
  });
  add({
    id: 'revaluation', cat: 'academic', icon: '🔁', kind: 'letter', title: 'Re-evaluation / answer sheet request',
    desc: 'Request revaluation, retotalling or a photocopy of your answer sheet.',
    to: 'The Controller of Examinations', toPresets: ['The Controller of Examinations', 'The Principal', 'The Dean (Academics)'],
    fields: [
      { k: 'ask', label: 'Request', type: 'select', opts: ['re-evaluation', 're-totalling', 'a photocopy of my answer sheet'], req: 1 },
      { k: 'subject', label: 'Subject & code', ph: 'Engineering Mechanics (ME201)', req: 1 },
      { k: 'exam', label: 'Exam & session', ph: 'end-semester examination, May 2026', req: 1 },
      { k: 'marks', label: 'Marks obtained / expected (optional)', ph: 'I scored 31/100 but expected above 55' }
    ],
    sample: { ask: 're-evaluation', subject: 'Engineering Mechanics (ME201)', exam: 'end-semester examination, May 2026', marks: 'I scored 31/100 but expected above 55 based on my answers' },
    tips: ['Revaluation windows are short (often 7–15 days after results) — apply immediately.', 'Pay the fee and keep the receipt.'],
    render(v, x) {
      return {
        subject: `Application for ${v.ask} — ${v.subject}`,
        paras: [
          `${x.t('With due respect, I', 'I', 'I')} ${x.intro()}. I appeared in the ${v.exam || '[exam]'} for ${v.subject || '[subject]'}.${v.marks ? ` ${x.cap(v.marks)}.` : ''}`,
          `${x.t('I kindly request you to', 'I would be grateful if you could', 'Please')} arrange for ${v.ask} of my answer script. I have paid the prescribed fee and attached the receipt along with a copy of my mark sheet.`
        ]
      };
    }
  });
  add({
    id: 'thank-professor', cat: 'academic', icon: '🙏', kind: 'email', title: 'Thank-you email to a professor / mentor',
    desc: 'After an LOR, internship, project guidance or at the end of a course.',
    fields: [
      { k: 'prof', label: 'Name', ph: 'Dr. Kavita Rao', req: 1 },
      { k: 'for', label: 'Thanking them for', ph: 'writing my recommendation letter', req: 1 },
      { k: 'result', label: 'Outcome / update (optional)', ph: 'I have received an admit from the University of Toronto' }
    ],
    sample: { prof: 'Dr. Kavita Rao', for: 'writing my recommendation letter', result: 'I have received an admit from the University of Toronto for the MS in Computer Science programme' },
    tips: ['Share outcomes — professors appreciate hearing how their help worked out.'],
    render(v, x) {
      return {
        subject: `Thank you, ${v.prof || 'Professor'}`,
        greet: `Dear ${v.prof || 'Professor'},`,
        paras: [
          `I wanted to sincerely thank you for ${v.for || '[what they did]'}.${v.result ? ` I am happy to share that ${x.lower(v.result)}.` : ''}`,
          `Your guidance has made a real difference to my learning and confidence. I will keep you updated on my progress.`,
          `With gratitude,`
        ],
        noClose: true
      };
    }
  });

  /* ═══════════ INTERNSHIPS & JOBS ═══════════ */
  add({
    id: 'internship-application', cat: 'career', icon: '💼', kind: 'email', title: 'Internship application / cold email',
    desc: 'Short, specific email to a company or startup founder for an internship.',
    fields: [
      { k: 'person', label: 'Recipient name (if known)', ph: 'Ms. Priya Nair' },
      { k: 'company', label: 'Company', ph: 'Razorpay', req: 1 },
      { k: 'role', label: 'Role', ph: 'Product Analyst Intern', req: 1 },
      { k: 'why', label: 'Why this company (1 line)', ph: 'I use Razorpay’s payment links for my college fest and admire how simple the onboarding is' },
      { k: 'proof', label: 'Your best proof (projects, numbers)', type: 'textarea', ph: 'I built a SQL + Power BI dashboard analysing 50,000 UPI transactions and found a 12% drop-off at OTP entry.', req: 1 },
      { k: 'period', label: 'Availability', ph: 'January–June 2027, full-time remote' }
    ],
    sample: { person: 'Ms. Priya Nair', company: 'Razorpay', role: 'Product Analyst Intern', why: 'I use Razorpay payment links for our college fest and admire how simple the onboarding is', proof: 'I built a SQL + Power BI dashboard analysing 50,000 UPI transactions and found a 12% drop-off at OTP entry.', period: 'January–June 2027, full-time remote' },
    tips: ['Under 150 words wins. Link your work instead of describing it.', 'Send Tuesday–Thursday mornings.', 'Make your resume ATS-friendly first — see our fresher resume guide.'],
    render(v, x) {
      return {
        subject: `${v.role || 'Internship'} application — ${x.v.name || '[name]'}, ${x.v.course || '[course]'}`,
        greet: `Dear ${v.person || 'Hiring Team'},`,
        paras: [
          `I am ${x.v.name || '[name]'}, ${x.v.course || '[course]'}${x.v.college ? ` at ${x.v.college}` : ''}, and I would love to intern as a ${v.role || '[role]'} at ${v.company || '[company]'}.${v.why ? ` ${x.cap(v.why)}.` : ''}`,
          `${x.sentence(v.proof || '[your proof]')}`,
          `I am available ${v.period || '[availability]'}. My resume is attached${x.v.link ? `, and you can see my work here: ${x.v.link}` : ''}.`,
          x.long(`I would be grateful for a short call to understand how I could contribute to your team.`),
          `Thank you for your time.`
        ]
      };
    }
  });
  add({
    id: 'referral', cat: 'career', icon: '🤝', kind: 'email', title: 'Referral request to an alumnus / LinkedIn contact',
    desc: 'Ask a senior or alumnus for a referral without sounding pushy.',
    fields: [
      { k: 'person', label: 'Their name', ph: 'Rohit', req: 1 },
      { k: 'company', label: 'Company', ph: 'Microsoft', req: 1 },
      { k: 'jobid', label: 'Role & job ID/link', ph: 'Software Engineer – New Grad (Job ID 1785432)', req: 1 },
      { k: 'common', label: 'Connection', ph: 'I am a junior from your college (CSE 2027 batch)' },
      { k: 'fit', label: 'Why you fit (1–2 lines)', type: 'textarea', ph: 'I have solved 600+ DSA problems and interned as a backend developer at a fintech startup.', req: 1 }
    ],
    sample: { person: 'Rohit', company: 'Microsoft', jobid: 'Software Engineer – New Grad (Job ID 1785432)', common: 'I am a junior from your college (CSE 2027 batch)', fit: 'I have solved 600+ DSA problems and interned as a backend developer at a fintech startup, building APIs used by 20,000 users.' },
    tips: ['Send the exact job ID and your resume so they can refer you in 2 minutes.', 'Thank them whether or not they refer you.'],
    render(v, x) {
      return {
        subject: `Referral request — ${v.jobid}`,
        greet: `Hi ${v.person || '[name]'},`,
        paras: [
          `${v.common ? `${x.cap(v.common)}. ` : ''}I hope you are doing well! I came across the ${v.jobid || '[role]'} opening at ${v.company || '[company]'} and believe I am a strong fit.`,
          `${x.sentence(v.fit || '[why you fit]')}`,
          `Would you be comfortable referring me for this role? I have attached my resume. Happy to answer any questions, and I completely understand if it isn’t possible.`,
          `Thanks a lot for your time!`
        ]
      };
    }
  });
  add({
    id: 'follow-up', cat: 'career', icon: '📬', kind: 'email', title: 'Follow-up after applying / interview',
    desc: 'Polite follow-up when you haven’t heard back.',
    fields: [
      { k: 'person', label: 'Recipient name', ph: 'Mr. Arjun Mehta' },
      { k: 'role', label: 'Role', ph: 'Marketing Intern', req: 1 },
      { k: 'company', label: 'Company', ph: 'Zomato', req: 1 },
      { k: 'stage', label: 'Stage', type: 'select', opts: ['after applying', 'after my interview'], req: 1 },
      { k: 'date', label: 'Date of application/interview', type: 'date', req: 1 }
    ],
    sample: { person: 'Mr. Arjun Mehta', role: 'Marketing Intern', company: 'Zomato', stage: 'after my interview', date: '2026-10-28' },
    tips: ['Wait 7–10 days before following up.', 'One follow-up is professional; three is too many.'],
    render(v, x) {
      const iv = v.stage === 'after my interview';
      return {
        subject: `Following up: ${v.role} ${iv ? 'interview' : 'application'} — ${x.v.name || '[name]'}`,
        greet: `Dear ${v.person || 'Hiring Team'},`,
        paras: [
          `I hope you are well. I ${iv ? 'interviewed' : 'applied'} for the ${v.role || '[role]'} position at ${v.company || '[company]'} on ${x.date(v.date)} and wanted to follow up on the status.`,
          `I remain very interested in the role${iv ? ' and enjoyed learning more about the team during our conversation' : ''}. Please let me know if you need any further information from me.`,
          `Thank you for your time.`
        ]
      };
    }
  });
  add({
    id: 'interview-thanks', cat: 'career', icon: '✉️', kind: 'email', title: 'Thank-you email after interview',
    desc: 'Send within 24 hours to stand out.',
    fields: [
      { k: 'person', label: 'Interviewer name', ph: 'Ms. Sneha Gupta', req: 1 },
      { k: 'role', label: 'Role', ph: 'Business Analyst', req: 1 },
      { k: 'company', label: 'Company', ph: 'Deloitte', req: 1 },
      { k: 'point', label: 'Something specific you discussed', ph: 'the client analytics project for the retail team' }
    ],
    sample: { person: 'Ms. Sneha Gupta', role: 'Business Analyst', company: 'Deloitte', point: 'the client analytics project for the retail team' },
    tips: ['Send within 24 hours.', 'Mention one specific thing from the conversation.'],
    render(v, x) {
      return {
        subject: `Thank you — ${v.role} interview`,
        greet: `Dear ${v.person || '[name]'},`,
        paras: [
          `Thank you for taking the time to speak with me today about the ${v.role || '[role]'} role at ${v.company || '[company]'}.${v.point ? ` I especially enjoyed learning about ${v.point}.` : ''}`,
          `Our conversation strengthened my interest in the role, and I am confident my skills would help the team. Please let me know if I can share anything else.`,
          `Thank you again for your time.`
        ]
      };
    }
  });
  add({
    id: 'offer-questions', cat: 'career', icon: '❓', kind: 'email', title: 'Ask HR about offer details (CTC breakup)',
    desc: 'Politely ask for fixed vs variable pay, PF, bonus clawback, bond and notice period.',
    fields: [
      { k: 'person', label: 'HR name', ph: 'Ms. Anjali Verma', req: 1 },
      { k: 'role', label: 'Role', ph: 'Associate Software Engineer', req: 1 },
      { k: 'company', label: 'Company', ph: 'Infosys', req: 1 },
      { k: 'ctc', label: 'Offered CTC', ph: '₹6.5 LPA' }
    ],
    sample: { person: 'Ms. Anjali Verma', role: 'Associate Software Engineer', company: 'Infosys', ctc: '₹6.5 LPA' },
    tips: ['Convert the CTC to in-hand pay with our salary calculator before replying.', 'Read our guide on CTC vs in-hand salary.'],
    render(v, x) {
      return {
        subject: `Clarification on offer — ${v.role}`,
        greet: `Dear ${v.person || '[name]'},`,
        paras: [
          `Thank you for the offer for the ${v.role || '[role]'} position at ${v.company || '[company]'}${v.ctc ? ` (CTC ${v.ctc})` : ''}. I am excited about the opportunity.`,
          `Before I confirm, could you please help me with a few details?\n1. The fixed annual gross and expected monthly in-hand salary\n2. The variable component and how it is calculated\n3. Whether PF is on full basic or capped\n4. Any joining bonus and its clawback terms\n5. Any service agreement/bond, and the notice period\n6. Joining date and work location`,
          `Thank you for your help. I look forward to hearing from you.`
        ]
      };
    }
  });
  add({
    id: 'accept-offer', cat: 'career', icon: '🎉', kind: 'email', title: 'Accept a job / internship offer',
    desc: 'Confirm acceptance, joining date and documents.',
    fields: [
      { k: 'person', label: 'HR name', ph: 'Mr. Karthik Rao', req: 1 },
      { k: 'role', label: 'Role', ph: 'Graduate Engineer Trainee', req: 1 },
      { k: 'company', label: 'Company', ph: 'Larsen & Toubro', req: 1 },
      { k: 'join', label: 'Joining date', type: 'date', req: 1 }
    ],
    sample: { person: 'Mr. Karthik Rao', role: 'Graduate Engineer Trainee', company: 'Larsen & Toubro', join: '2027-07-01' },
    tips: ['Reply within the deadline in the offer letter.', 'Ask which original documents to bring on day one.'],
    render(v, x) {
      return {
        subject: `Offer acceptance — ${v.role}, ${x.v.name || '[name]'}`,
        greet: `Dear ${v.person || '[name]'},`,
        paras: [
          `I am delighted to accept the offer for the position of ${v.role || '[role]'} at ${v.company || '[company]'}. Thank you for this opportunity.`,
          `I confirm that I will join on ${x.date(v.join)}. Please let me know about any documents or formalities I need to complete before joining.`,
          `I look forward to being part of the team.`
        ]
      };
    }
  });
  add({
    id: 'decline-offer', cat: 'career', icon: '🙅', kind: 'email', title: 'Decline an offer politely',
    desc: 'Say no without burning bridges.',
    fields: [
      { k: 'person', label: 'HR name', ph: 'Ms. Ritu Sharma', req: 1 },
      { k: 'role', label: 'Role', ph: 'Sales Trainee', req: 1 },
      { k: 'company', label: 'Company', ph: 'HDFC Bank', req: 1 },
      { k: 'reason', label: 'Reason (optional, brief)', ph: 'I have accepted another role that aligns more closely with my interest in data analytics' }
    ],
    sample: { person: 'Ms. Ritu Sharma', role: 'Sales Trainee', company: 'HDFC Bank', reason: 'I have accepted another role that aligns more closely with my interest in data analytics' },
    tips: ['Decline as soon as you decide — the company may have other candidates waiting.'],
    render(v, x) {
      return {
        subject: `Regarding the ${v.role} offer`,
        greet: `Dear ${v.person || '[name]'},`,
        paras: [
          `Thank you very much for offering me the ${v.role || '[role]'} position at ${v.company || '[company]'} and for your time during the process.`,
          `After careful consideration, I have decided to decline the offer${v.reason ? `, as ${x.lower(v.reason)}` : ''}. This was not an easy decision.`,
          `I truly appreciate the opportunity and hope our paths cross again in the future.`
        ]
      };
    }
  });
  add({
    id: 'negotiate', cat: 'career', icon: '📈', kind: 'email', title: 'Salary negotiation email',
    desc: 'Ask for a better fixed pay or joining bonus — with a reason.',
    fields: [
      { k: 'person', label: 'HR name', ph: 'Ms. Pooja Iyer', req: 1 },
      { k: 'role', label: 'Role', ph: 'Data Analyst', req: 1 },
      { k: 'company', label: 'Company', ph: 'Swiggy', req: 1 },
      { k: 'current', label: 'Offered (fixed)', ph: '₹7 LPA fixed', req: 1 },
      { k: 'ask', label: 'Your ask', ph: '₹8 LPA fixed', req: 1 },
      { k: 'basis', label: 'Basis', type: 'textarea', ph: 'I have a competing offer of ₹8 LPA fixed and 6 months of analytics internship experience with SQL and Python.', req: 1 }
    ],
    sample: { person: 'Ms. Pooja Iyer', role: 'Data Analyst', company: 'Swiggy', current: '₹7 LPA fixed', ask: '₹8 LPA fixed', basis: 'I have a competing offer of ₹8 LPA fixed and bring 6 months of analytics internship experience with SQL and Python.' },
    tips: ['Negotiate fixed pay, not just CTC.', 'Never invent a competing offer — recruiters verify.'],
    render(v, x) {
      return {
        subject: `${v.role} offer — compensation discussion`,
        greet: `Dear ${v.person || '[name]'},`,
        paras: [
          `Thank you for the offer for the ${v.role || '[role]'} role at ${v.company || '[company]'}. I am genuinely excited about the team and would like to join.`,
          `${x.sentence(v.basis || '[basis]')} Given this, I wanted to ask whether there is flexibility to revise the offer from ${v.current || '[current]'} to ${v.ask || '[ask]'}.`,
          `I am keen to find a number that works for both of us and look forward to your response.`
        ]
      };
    }
  });
  add({
    id: 'resignation', cat: 'career', icon: '📤', kind: 'letter', title: 'Resignation letter (first job)',
    desc: 'Professional resignation with notice period and handover.',
    to: 'The Reporting Manager', toPresets: ['The Reporting Manager', 'The HR Manager'], letterTo: v => v.company,
    fields: [
      { k: 'role', label: 'Your designation', ph: 'Associate Software Engineer', req: 1 },
      { k: 'company', label: 'Company', ph: 'Wipro Ltd., Bengaluru', req: 1 },
      { k: 'last', label: 'Last working day', type: 'date', req: 1 },
      { k: 'reason', label: 'Reason (optional)', ph: 'to pursue a master’s degree' }
    ],
    sample: { role: 'Associate Software Engineer', company: 'Wipro Ltd., Bengaluru', last: '2027-01-31', reason: 'to pursue a master’s degree' },
    tips: ['Check your notice period and any bond clause before resigning.', 'Submit on the company portal too, if there is one.'],
    render(v, x) {
      return {
        subject: `Resignation — ${x.v.name || '[name]'}, ${v.role}`,
        paras: [
          `Please accept this letter as formal notice of my resignation from the position of ${v.role || '[designation]'} at ${v.company || '[company]'}${v.reason ? `, as I have decided ${x.lower(v.reason)}` : ''}. As per my notice period, my last working day will be ${x.date(v.last)}.`,
          `I am grateful for the opportunities to learn and grow here. I will ensure a smooth handover of my responsibilities and help train a replacement if needed.`,
          `Thank you for your support and guidance.`
        ]
      };
    }
  });

  /* ═══════════ ADMISSIONS & STUDY ABROAD ═══════════ */
  add({
    id: 'admission-query', cat: 'abroad', icon: '🏫', kind: 'email', title: 'Email to admissions office (query)',
    desc: 'Ask about eligibility, IELTS waiver, deadlines, scholarships or 3-year degree acceptance.',
    fields: [
      { k: 'uni', label: 'University', ph: 'University of Melbourne', req: 1 },
      { k: 'prog', label: 'Programme', ph: 'Master of Information Technology', req: 1 },
      { k: 'q', label: 'Your questions', type: 'textarea', ph: 'Do you accept a 3-year B.Sc from an Indian university? Is an IELTS waiver possible with 85% in CBSE Class 12 English?', req: 1 }
    ],
    sample: { uni: 'University of Melbourne', prog: 'Master of Information Technology', q: 'Do you accept a 3-year B.Sc from an Indian university for this programme? Is an IELTS waiver possible with 85% in CBSE Class 12 English?' },
    tips: ['Check the FAQ page first — admissions teams prefer specific questions.', 'Compare countries, costs and IELTS rules with the Study Abroad Finder.'],
    render(v, x) {
      return {
        subject: `Query about ${v.prog} — prospective student from India`,
        greet: 'Dear Admissions Team,',
        paras: [
          `I am ${x.v.name || '[name]'}, ${x.v.course || '[course]'}${x.v.college ? ` at ${x.v.college}` : ''}, India, and I am interested in applying to the ${v.prog || '[programme]'} at ${v.uni || '[university]'}.`,
          `I would be grateful for clarification on the following:\n${(v.q || '[questions]').split(/(?<=\?)\s+/).map((q, i) => `${i + 1}. ${q.trim()}`).join('\n')}`,
          `Thank you for your help.`
        ]
      };
    }
  });
  add({
    id: 'deferral', cat: 'abroad', icon: '📅', kind: 'email', title: 'Admission deferral request',
    desc: 'Defer your admission to the next intake (visa delay, health, funding).',
    fields: [
      { k: 'uni', label: 'University', ph: 'University of Edinburgh', req: 1 },
      { k: 'prog', label: 'Programme & student ID', ph: 'MSc Data Science, applicant ID S2700123', req: 1 },
      { k: 'from', label: 'Current intake', ph: 'September 2026', req: 1 },
      { k: 'to', label: 'Requested intake', ph: 'January 2027', req: 1 },
      { k: 'reason', label: 'Reason', type: 'textarea', ph: 'My visa decision has been delayed beyond the latest arrival date.', req: 1 }
    ],
    sample: { uni: 'University of Edinburgh', prog: 'MSc Data Science, applicant ID S2700123', from: 'September 2026', to: 'September 2027', reason: 'My education loan disbursement has been delayed, and I will not be able to show the required funds in time for the visa.' },
    tips: ['Ask whether your deposit and any scholarship carry over.'],
    render(v, x) {
      return {
        subject: `Deferral request — ${v.prog}`,
        greet: 'Dear Admissions Team,',
        paras: [
          `I hold an offer for ${v.prog || '[programme]'} at ${v.uni || '[university]'} for the ${v.from || '[intake]'} intake. I am writing to request a deferral to the ${v.to || '[new intake]'} intake.`,
          `${x.sentence(v.reason || '[reason]')}`,
          `I remain fully committed to joining the programme. Could you please confirm whether a deferral is possible, and whether my deposit and any scholarship will carry over?`,
          `Thank you for your understanding.`
        ]
      };
    }
  });
  add({
    id: 'loan-bank', cat: 'abroad', icon: '🏦', kind: 'letter', title: 'Education loan application to bank manager',
    desc: 'Covering letter for an education loan for study in India or abroad.',
    to: 'The Branch Manager', toPresets: ['The Branch Manager'], letterTo: v => v.bank,
    fields: [
      { k: 'bank', label: 'Bank & branch', ph: 'State Bank of India, Rajajinagar Branch, Bengaluru', req: 1 },
      { k: 'prog', label: 'Course & university', ph: 'MS in Computer Science at Arizona State University, USA', req: 1 },
      { k: 'amount', label: 'Loan amount', ph: '₹40,00,000', req: 1 },
      { k: 'cost', label: 'Total cost of course', ph: '₹62,00,000 (tuition and living for 2 years)' },
      { k: 'coapp', label: 'Co-applicant', ph: 'my father, Mr. Ramesh Gowda, a government employee' },
      { k: 'collateral', label: 'Collateral (optional)', ph: 'residential property in Bengaluru' }
    ],
    sample: { bank: 'State Bank of India, Rajajinagar Branch, Bengaluru', prog: 'MS in Computer Science at Arizona State University, USA (Fall 2027)', amount: '₹40,00,000', cost: '₹62,00,000 (tuition and living costs for 2 years)', coapp: 'my father, Mr. Ramesh Gowda, a state government employee', collateral: 'residential property in Bengaluru' },
    tips: ['Compare banks, NBFCs and global lenders in our education loan guide.', 'Attach the admission letter, cost-of-study statement, KYC and co-applicant income proof.'],
    render(v, x) {
      return {
        subject: `Application for education loan of ${v.amount}`,
        paras: [
          `I, ${x.v.name || '[name]'}, have secured admission to ${v.prog || '[course and university]'}. ${v.cost ? `The total cost of the course is ${v.cost}. ` : ''}I request an education loan of ${v.amount || '[amount]'} to fund my studies.`,
          `${v.coapp ? `The co-applicant for the loan will be ${v.coapp}. ` : ''}${v.collateral ? `We can offer ${v.collateral} as collateral. ` : ''}I have attached my admission letter, cost-of-study statement, academic records, KYC documents and the co-applicant’s income proof.`,
          `${x.t('I kindly request you to', 'I would be grateful if you could', 'Please')} process my application at the earliest, as the sanction letter is needed for my visa application.`
        ]
      };
    }
  });

  /* ═══════════ HINDI ═══════════ */
  const hiHead = (x, to) => to;
  add({
    id: 'hi-sick-leave', cat: 'hindi', lang: 'hi', icon: '🤒', kind: 'letter', title: 'बीमारी के कारण अवकाश हेतु प्रार्थना पत्र',
    desc: 'Sick leave application in Hindi for college or school.',
    to: 'सेवा में,\nप्रधानाचार्य महोदय', toPresets: ['सेवा में,\nप्रधानाचार्य महोदय', 'सेवा में,\nविभागाध्यक्ष महोदय', 'सेवा में,\nकक्षा अध्यापक महोदय'],
    fields: [
      { k: 'from', label: 'छुट्टी कब से', type: 'date', req: 1 },
      { k: 'till', label: 'छुट्टी कब तक', type: 'date', req: 1 },
      { k: 'illness', label: 'बीमारी', ph: 'तेज़ बुखार', req: 1 }
    ],
    sample: { from: '2026-11-10', till: '2026-11-12', illness: 'तेज़ बुखार' },
    tips: ['डॉक्टर का प्रमाण पत्र साथ में लगाएँ।'],
    render(v, x) {
      return {
        subject: `${x.dateHi(v.from)} से ${x.dateHi(v.till)} तक अवकाश हेतु प्रार्थना पत्र`,
        paras: [
          `सविनय निवेदन है कि मैं ${x.v.name || '[नाम]'}, ${x.v.course || '[कक्षा/पाठ्यक्रम]'} का छात्र/छात्रा हूँ${x.v.roll ? ` (अनुक्रमांक ${x.v.roll})` : ''}। मुझे ${v.illness || '[बीमारी]'} हो गया है, जिसके कारण डॉक्टर ने मुझे आराम करने की सलाह दी है।`,
          `अतः मैं ${x.dateHi(v.from)} से ${x.dateHi(v.till)} तक महाविद्यालय आने में असमर्थ हूँ। कृपया मुझे इन दिनों का अवकाश प्रदान करने की कृपा करें।`
        ],
        sal: 'महोदय/महोदया,', close1: 'धन्यवाद सहित', close2: 'आपका आज्ञाकारी शिष्य / आपकी आज्ञाकारिणी शिष्या'
      };
    }
  });
  add({
    id: 'hi-urgent-leave', cat: 'hindi', lang: 'hi', icon: '🏠', kind: 'letter', title: 'घरेलू कार्य / विवाह हेतु अवकाश पत्र',
    desc: 'Leave application in Hindi for a family function, wedding or urgent work.',
    to: 'सेवा में,\nप्रधानाचार्य महोदय', toPresets: ['सेवा में,\nप्रधानाचार्य महोदय', 'सेवा में,\nविभागाध्यक्ष महोदय'],
    fields: [
      { k: 'reason', label: 'कारण', type: 'select', opts: ['मेरी बहन का विवाह', 'मेरे भाई का विवाह', 'घर में आवश्यक कार्य', 'परिवार में किसी सदस्य का स्वास्थ्य खराब होना'], req: 1 },
      { k: 'from', label: 'कब से', type: 'date', req: 1 },
      { k: 'till', label: 'कब तक', type: 'date', req: 1 }
    ],
    sample: { reason: 'मेरी बहन का विवाह', from: '2026-12-04', till: '2026-12-08' },
    tips: ['विवाह जैसे कार्यक्रमों के लिए एक सप्ताह पहले आवेदन करें।'],
    render(v, x) {
      return {
        subject: 'अवकाश हेतु प्रार्थना पत्र',
        paras: [
          `सविनय निवेदन है कि मैं ${x.v.name || '[नाम]'}, ${x.v.course || '[कक्षा/पाठ्यक्रम]'} का छात्र/छात्रा हूँ। ${v.reason || '[कारण]'} होने के कारण मुझे घर जाना आवश्यक है।`,
          `अतः मैं ${x.dateHi(v.from)} से ${x.dateHi(v.till)} तक कक्षाओं में उपस्थित नहीं हो सकूँगा/सकूँगी। कृपया मुझे इन दिनों का अवकाश प्रदान करें। मैं छूटे हुए पाठ्यक्रम को पूरा कर लूँगा/लूँगी।`
        ],
        sal: 'महोदय/महोदया,', close1: 'धन्यवाद सहित', close2: 'आपका आज्ञाकारी शिष्य / आपकी आज्ञाकारिणी शिष्या'
      };
    }
  });
  add({
    id: 'hi-fee-concession', cat: 'hindi', lang: 'hi', icon: '💳', kind: 'letter', title: 'फीस माफी / शुल्क में छूट हेतु प्रार्थना पत्र',
    desc: 'Fee concession application in Hindi.',
    to: 'सेवा में,\nप्रधानाचार्य महोदय', toPresets: ['सेवा में,\nप्रधानाचार्य महोदय'],
    fields: [
      { k: 'reason', label: 'आर्थिक स्थिति', type: 'textarea', ph: 'मेरे पिताजी एक छोटे किसान हैं और इस वर्ष फसल खराब होने से घर की आर्थिक स्थिति ठीक नहीं है।', req: 1 },
      { k: 'ask', label: 'अनुरोध', type: 'select', opts: ['पूर्ण फीस माफ', 'आधी फीस माफ', 'फीस किस्तों में जमा करने की अनुमति'] }
    ],
    sample: { reason: 'मेरे पिताजी एक छोटे किसान हैं और इस वर्ष फसल खराब होने से घर की आर्थिक स्थिति ठीक नहीं है।', ask: 'फीस किस्तों में जमा करने की अनुमति' },
    tips: ['आय प्रमाण पत्र की प्रति संलग्न करें।'],
    render(v, x) {
      return {
        subject: 'शुल्क में छूट हेतु प्रार्थना पत्र',
        paras: [
          `सविनय निवेदन है कि मैं ${x.v.name || '[नाम]'}, ${x.v.course || '[कक्षा/पाठ्यक्रम]'} का छात्र/छात्रा हूँ। ${v.reason || '[आर्थिक स्थिति]'}`,
          `ऐसी परिस्थिति में पूरी फीस एक साथ जमा करना मेरे परिवार के लिए संभव नहीं है। अतः आपसे विनम्र निवेदन है कि मुझे ${v.ask || 'फीस में छूट'} प्रदान करने की कृपा करें। मैं सदैव मन लगाकर पढ़ाई करूँगा/करूँगी।`
        ],
        sal: 'महोदय/महोदया,', close1: 'धन्यवाद सहित', close2: 'आपका आज्ञाकारी शिष्य / आपकी आज्ञाकारिणी शिष्या'
      };
    }
  });
  add({
    id: 'hi-tc', cat: 'hindi', lang: 'hi', icon: '🎒', kind: 'letter', title: 'स्थानांतरण प्रमाण पत्र (TC) हेतु प्रार्थना पत्र',
    desc: 'Transfer certificate application in Hindi.',
    to: 'सेवा में,\nप्रधानाचार्य महोदय', toPresets: ['सेवा में,\nप्रधानाचार्य महोदय'],
    fields: [
      { k: 'reason', label: 'कारण', ph: 'मेरे पिताजी का स्थानांतरण दूसरे शहर में हो गया है', req: 1 }
    ],
    sample: { reason: 'मेरे पिताजी का स्थानांतरण भोपाल हो गया है' },
    tips: ['पहले सभी बकाया शुल्क जमा करें और पुस्तकालय की पुस्तकें लौटाएँ।'],
    render(v, x) {
      return {
        subject: 'स्थानांतरण प्रमाण पत्र हेतु प्रार्थना पत्र',
        paras: [
          `सविनय निवेदन है कि मैं ${x.v.name || '[नाम]'}, ${x.v.course || '[कक्षा/पाठ्यक्रम]'} का छात्र/छात्रा हूँ। ${v.reason || '[कारण]'}, जिसके कारण मुझे यह संस्थान छोड़ना पड़ रहा है।`,
          `अतः आपसे निवेदन है कि मुझे स्थानांतरण प्रमाण पत्र (TC) प्रदान करने की कृपा करें। मैंने सभी बकाया शुल्क जमा कर दिए हैं।`
        ],
        sal: 'महोदय/महोदया,', close1: 'धन्यवाद सहित', close2: 'आपका आज्ञाकारी शिष्य / आपकी आज्ञाकारिणी शिष्या'
      };
    }
  });
  add({
    id: 'hi-bonafide', cat: 'hindi', lang: 'hi', icon: '📜', kind: 'letter', title: 'बोनाफाइड (वास्तविक छात्र) प्रमाण पत्र हेतु आवेदन',
    desc: 'Bonafide certificate application in Hindi.',
    to: 'सेवा में,\nप्रधानाचार्य महोदय', toPresets: ['सेवा में,\nप्रधानाचार्य महोदय'],
    fields: [
      { k: 'purpose', label: 'उद्देश्य', type: 'select', opts: ['छात्रवृत्ति हेतु आवेदन', 'बैंक खाता खुलवाने', 'शिक्षा ऋण हेतु आवेदन', 'पासपोर्ट हेतु आवेदन', 'रेलवे रियायत'], req: 1 }
    ],
    sample: { purpose: 'छात्रवृत्ति हेतु आवेदन' },
    tips: ['पहचान पत्र की प्रति संलग्न करें।'],
    render(v, x) {
      return {
        subject: 'बोनाफाइड प्रमाण पत्र हेतु आवेदन',
        paras: [
          `सविनय निवेदन है कि मैं ${x.v.name || '[नाम]'}, ${x.v.course || '[कक्षा/पाठ्यक्रम]'} का नियमित छात्र/छात्रा हूँ${x.v.roll ? ` (अनुक्रमांक ${x.v.roll})` : ''}। मुझे ${v.purpose || '[उद्देश्य]'} के लिए बोनाफाइड प्रमाण पत्र की आवश्यकता है।`,
          `अतः आपसे निवेदन है कि मुझे शीघ्र बोनाफाइड प्रमाण पत्र प्रदान करने की कृपा करें।`
        ],
        sal: 'महोदय/महोदया,', close1: 'धन्यवाद सहित', close2: 'आपका आज्ञाकारी शिष्य / आपकी आज्ञाकारिणी शिष्या'
      };
    }
  });

  /* ═══════════ FORMATTER ═══════════ */
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
  const parse = s => { if (!s) return null; const [y, m, d] = String(s).split('-').map(Number); return y && m && d ? new Date(y, m - 1, d) : null; };
  const fmt = s => { const d = parse(s); return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : (s || '[date]'); };
  const fmtHi = s => { const d = parse(s); return d ? `${d.getDate()} ${MONTHS_HI[d.getMonth()]} ${d.getFullYear()}` : (s || '[दिनांक]'); };
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  function helpers(v, opts, today) {
    const tone = opts.tone || 'formal', len = opts.length || 'standard';
    return {
      v, tone, len,
      t: (formal, polite, confident) => tone === 'polite' ? polite : tone === 'confident' ? confident : formal,
      long: s => (len === 'detailed' ? s : ''),
      date: fmt, dateHi: fmtHi,
      cap: s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s),
      lower: s => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s),
      sentence: s => { s = (s || '').trim(); if (!s) return ''; s = s.charAt(0).toUpperCase() + s.slice(1); return /[.!?।]$/.test(s) ? s : s + '.'; },
      intro: () => {
        const bits = [];
        if (v.name) bits.push(v.name);
        let s = bits.length ? `, ${v.name},` : '';
        s = `am ${v.name ? v.name + ', ' : ''}a student of ${v.course || '[course]'}${v.roll ? ` (Roll No. ${v.roll})` : ''}`;
        return s;
      },
      span: (a, b) => {
        const da = parse(a), db = parse(b);
        if (!da && !db) return { range: 'on the required dates', days: '' };
        if (da && (!db || +da === +db)) return { range: `on ${fmt(a)}`, days: '1 day' };
        if (!da) return { range: `till ${fmt(b)}`, days: '' };
        const n = Math.round((db - da) / 86400000) + 1;
        return { range: `from ${fmt(a)} to ${fmt(b)}`, days: n > 0 ? `${n} day${n > 1 ? 's' : ''}` : '' };
      }
    };
  }

  /** Build the final text. v = profile + template fields; opts = {tone, length, format, closing, salute, to, toName, date} */
  function compose(tpl, v, opts) {
    opts = opts || {};
    const x = helpers(v, opts);
    const r = tpl.render(v, x);
    const hi = tpl.lang === 'hi';
    const paras = r.paras.filter(p => p && p.trim()).map(p => p.trim());
    const format = opts.format || tpl.kind;
    const dateStr = hi ? fmtHi(opts.date || todayISO()) : fmt(opts.date || todayISO());
    const lines = [];
    const sign = [v.name || (hi ? '[नाम]' : '[Your name]')];
    const jobby = tpl.cat === 'career' || tpl.cat === 'abroad';
    if (v.roll && !(format === 'email' && jobby) && tpl.id !== 'resignation' && tpl.id !== 'loan-bank') sign.push(hi ? `अनुक्रमांक: ${v.roll}` : `Roll No.: ${v.roll}`);
    if (v.course) sign.push(v.course);
    if (format === 'email' && v.college) sign.push(v.college);
    if (v.phone) sign.push(hi ? `मोबाइल: ${v.phone}` : `Phone: ${v.phone}`);
    if (format === 'email' && v.email) sign.push(v.email);

    if (format === 'letter') {
      const toBlock = (opts.to || tpl.to || 'The Principal');
      const addr = toBlock.split('\n');
      if (!hi) lines.push('To,');
      if (opts.toName && !hi) addr.push(opts.toName);
      const org = tpl.letterTo ? tpl.letterTo(v) : (tpl.cat === 'career' ? '' : v.college);
      if (org) addr.push(org);
      if (v.city && !tpl.letterTo && tpl.cat !== 'career') addr.push(v.city);
      addr.forEach((l, i) => {
        if (hi || /,$/.test(l)) { lines.push(l); return; }
        const clean = l.replace(/[,.]\s*$/, '');
        lines.push(clean + (i === addr.length - 1 ? '.' : ','));
      });
      lines.push('');
      lines.push(hi ? `दिनांक: ${dateStr}` : `Date: ${dateStr}`);
      lines.push('');
      lines.push(hi ? `विषय: ${r.subject}` : `Subject: ${r.subject}`);
      lines.push('');
      const sal = hi ? (r.sal || 'महोदय/महोदया,') : (opts.salute === 'Sir' ? 'Respected Sir,' : opts.salute === 'Madam' ? 'Respected Madam,' : opts.salute === 'Dear' ? 'Dear Sir/Madam,' : 'Respected Sir/Madam,');
      lines.push(sal);
      lines.push('');
      paras.forEach(p => { lines.push(p); lines.push(''); });
      if (hi) {
        lines.push(r.close1 || 'धन्यवाद सहित'); lines.push(''); lines.push(r.close2 || 'आपका आज्ञाकारी शिष्य'); sign.forEach(s => lines.push(s));
      } else {
        const modern = opts.closing === 'modern' || tpl.cat === 'career' || tpl.cat === 'abroad';
        lines.push('Thanking you,'); lines.push('');
        lines.push(modern ? 'Yours sincerely,' : 'Yours obediently,');
        sign.forEach(s => lines.push(s));
        lines.push('');
        lines.push(`Place: ${v.city || '[City]'}`);
      }
      return { subject: r.subject, text: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim(), format };
    }
    // email
    const greet = r.greet || (opts.toName ? `Dear ${opts.toName},` : 'Dear Sir/Madam,');
    lines.push(greet); lines.push('');
    paras.forEach(p => { lines.push(p); lines.push(''); });
    if (!r.noClose) lines.push(opts.closing === 'traditional' ? 'Thanking you,' : x.t('Regards,', 'Warm regards,', 'Best regards,'));
    sign.forEach(s => lines.push(s));
    return { subject: r.subject, text: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim(), format };
  }

  const PROFILE_SAMPLE = { name: 'Ananya Sharma', roll: '22CS1047', course: 'B.Tech Computer Science, 3rd Year', college: 'Ramaiah Institute of Technology', city: 'Bengaluru', phone: '+91 98xxxxxx10', email: 'ananya.sharma@example.com', link: '' };

  const API = { CATS, TEMPLATES: T, compose, PROFILE_SAMPLE, fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.LW = API;
})(typeof window !== 'undefined' ? window : this);
