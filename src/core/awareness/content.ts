/**
 * @fileoverview Awareness content: daily tips, quiz questions and short lessons in English
 * and Pidgin. Built around the Nigerian scam taxonomy (research/aabo/.../04-ng-scam-taxonomy.md)
 * and Hoxhunt-style positive reinforcement: short, practical, never blaming.
 */

import type { Bilingual, Category } from '../types';

export const TIPS: Bilingual[] = [
  { en: 'Never share a WhatsApp or bank code (OTP) — not even with family. Whoever has the code owns the account.', pidgin: 'No ever give anybody your WhatsApp or bank code (OTP) — even family. Anybody wey get the code don own the account.' },
  { en: 'Turn on WhatsApp two-step verification today: Settings › Account › Two-step verification.', pidgin: 'On WhatsApp two-step verification today: Settings › Account › Two-step verification.' },
  { en: 'A payment is only real when it shows in YOUR bank app — not an SMS, not a screenshot.', pidgin: 'Payment no real until e show for YOUR bank app — no be SMS, no be screenshot.' },
  { en: 'Supplier says "we changed our account"? Call them on the number you already have before you pay.', pidgin: 'Supplier talk say "we don change account"? Call dem for the number wey you already get before you pay.' },
  { en: '"This is my new number, send me money urgently" — call the old number first. Most times it is a scammer.', pidgin: '"Na my new number be this, send me money sharp" — call the old number first. Most times na scammer.' },
  { en: 'EFCC, police and CBN do not collect fines or bail by WhatsApp or transfer. Hang up and report.', pidgin: 'EFCC, police and CBN no dey collect fine or bail through WhatsApp or transfer. Cut the call and report.' },
  { en: 'Any investment that guarantees profit is a red flag. Check the company on the SEC Nigeria website first.', pidgin: 'Any investment wey guarantee profit na red flag. Check the company for SEC Nigeria website first.' },
  { en: 'Never pay a "fee" to withdraw your own money, receive a loan, a job or a prize.', pidgin: 'No pay any "fee" to withdraw your own money, collect loan, job or prize.' },
  { en: 'Only install apps from Play Store or App Store. Apps sent on WhatsApp (.apk) can steal your bank codes.', pidgin: 'Install app only from Play Store or App Store. App wey dem send for WhatsApp (.apk) fit thief your bank code.' },
  { en: 'Check links before you tap: gtbank-verify.xyz is NOT gtbank.com. Scammers copy big names.', pidgin: 'Check link before you tap: gtbank-verify.xyz NO BE gtbank.com. Scammers dey copy big names.' },
  { en: 'Your bank will never ask for your PIN, password, card number or token — by call, SMS or WhatsApp.', pidgin: 'Your bank no go ever ask for your PIN, password, card number or token — by call, SMS or WhatsApp.' },
  { en: 'Free data, free airtime, free grants that ask you to "share to 10 groups" are always fake.', pidgin: 'Free data, free airtime, free grant wey say "share am to 10 groups" — na fake every time.' },
  { en: 'Use a different password for your email and your bank app. If one leaks, the other stays safe.', pidgin: 'Use different password for your email and your bank app. If one leak, the other one go still safe.' },
  { en: 'Give staff a simple rule: no payment to a new account without a call-back check by two people.', pidgin: 'Give your staff simple rule: no payment to new account without call-back check by two people.' },
  { en: 'Hold WhatsApp security for your business number: enable two-step, and review Linked devices every week.', pidgin: 'Secure your business WhatsApp: on two-step, and check Linked devices every week.' },
  { en: 'Scammers rush you. If a message says "urgent" or "within 30 minutes", slow down and verify.', pidgin: 'Scammers dey rush person. If message talk "urgent" or "within 30 minutes", calm down and confirm.' },
  { en: 'Customer care will not DM you first on WhatsApp or Instagram. Use the number inside your bank app.', pidgin: 'Customer care no go first message you for WhatsApp or Instagram. Use the number wey dey inside your bank app.' },
  { en: 'A job that asks you to pay for forms, training or uniforms before you start is a scam.', pidgin: 'Job wey say make you pay for form, training or uniform before you start — na scam.' },
  { en: 'Back up your WhatsApp with end-to-end encryption on: Settings › Chats › Chat backup › End-to-end encrypted backup.', pidgin: 'Backup your WhatsApp with end-to-end encryption: Settings › Chats › Chat backup › End-to-end encrypted backup.' },
  { en: 'If your WhatsApp is hijacked: log out of all devices, reinstall, request a new code and warn contacts from another app.', pidgin: 'If dem hijack your WhatsApp: log out from all devices, reinstall, request new code and warn your people through another app.' },
];

export interface QuizQuestion {
  id: string;
  category: Category;
  question: Bilingual;
  options: Bilingual[];
  answer: number;
  explanation: Bilingual;
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 'q.otp',
    category: 'account_takeover',
    question: { en: 'A friend messages: "I sent my code to your number by mistake, please send it back." What do you do?', pidgin: 'Your friend message you: "I mistakenly send my code to your number, abeg send am back." Wetin you go do?' },
    options: [
      { en: 'Send the code — it is my friend', pidgin: 'Send the code — na my friend' },
      { en: 'Do not send it; call my friend on another line', pidgin: 'I no go send am; I go call my friend for another line' },
      { en: 'Send only half of the code', pidgin: 'Send only half of the code' },
    ],
    answer: 1,
    explanation: { en: 'That code would let someone take over YOUR WhatsApp. Your friend\'s account is probably already hijacked.', pidgin: 'That code go make person hijack YOUR WhatsApp. Your friend account fit don already dey hijacked.' },
  },
  {
    id: 'q.alert',
    category: 'fake_alert',
    question: { en: 'A customer shows a "transfer successful" screen and says the alert will come soon. What do you do?', pidgin: 'Customer show you "transfer successful" for im phone, talk say alert go soon come. Wetin you go do?' },
    options: [
      { en: 'Release the goods — the screen says successful', pidgin: 'Release the goods — the screen talk say successful' },
      { en: 'Wait until the money shows in my own bank app', pidgin: 'Wait until the money show for my own bank app' },
      { en: 'Ask for a screenshot and release', pidgin: 'Collect screenshot then release' },
    ],
    answer: 1,
    explanation: { en: 'Fake transfer apps and screenshots are common. Only your bank app is proof.', pidgin: 'Fake transfer app and screenshot plenty. Na only your bank app be proof.' },
  },
  {
    id: 'q.bec',
    category: 'bec',
    question: { en: 'Your supplier sends: "Our account changed, pay into this new account today." What first?', pidgin: 'Your supplier send: "We don change account, pay into this new account today." Wetin first?' },
    options: [
      { en: 'Pay quickly so goods are not delayed', pidgin: 'Pay quick make goods no delay' },
      { en: 'Reply on WhatsApp to confirm', pidgin: 'Reply for WhatsApp to confirm' },
      { en: 'Call the supplier on the number I already have', pidgin: 'Call the supplier for the number wey I already get' },
    ],
    answer: 2,
    explanation: { en: 'If their WhatsApp or email is hijacked, replying there reaches the scammer. Use a known number.', pidgin: 'If dem don hijack their WhatsApp or email, if you reply there na scammer you dey talk to. Use number wey you know.' },
  },
  {
    id: 'q.bvn',
    category: 'impersonation',
    question: { en: 'An SMS says your BVN will be blocked unless you update it at a link. Is it real?', pidgin: 'SMS talk say dem go block your BVN if you no update am for one link. E real?' },
    options: [
      { en: 'Yes, banks do this', pidgin: 'Yes, bank dey do am' },
      { en: 'No — banks don\'t ask you to update BVN by link', pidgin: 'No — bank no dey ask you to update BVN through link' },
      { en: 'Only if the link has the bank\'s name', pidgin: 'Only if the link get the bank name' },
    ],
    answer: 1,
    explanation: { en: 'BVN updates happen in your bank app or branch. Links with bank names are often look-alike sites.', pidgin: 'BVN update dey happen for your bank app or branch. Link wey get bank name fit be fake website.' },
  },
  {
    id: 'q.invest',
    category: 'investment',
    question: { en: 'A platform promises 30% profit every week. What is the biggest red flag?', pidgin: 'One platform promise 30% profit every week. Wetin be the biggest red flag?' },
    options: [
      { en: 'Guaranteed high returns', pidgin: 'Dem guarantee big profit' },
      { en: 'It has a WhatsApp group', pidgin: 'E get WhatsApp group' },
      { en: 'It accepts naira', pidgin: 'E dey collect naira' },
    ],
    answer: 0,
    explanation: { en: 'No real investment guarantees profit. CBEX promised 100% in 30 days before it collapsed.', pidgin: 'No real investment dey guarantee profit. CBEX promise 100% in 30 days before e crash.' },
  },
  {
    id: 'q.apk',
    category: 'malware',
    question: { en: 'Someone sends "Invoice.apk" on WhatsApp. What should you do?', pidgin: 'Person send "Invoice.apk" for WhatsApp. Wetin you suppose do?' },
    options: [
      { en: 'Open it to see the invoice', pidgin: 'Open am make I see the invoice' },
      { en: 'Delete it — invoices are never apps', pidgin: 'Delete am — invoice no dey ever be app' },
      { en: 'Forward it to my accountant', pidgin: 'Forward am give my accountant' },
    ],
    answer: 1,
    explanation: { en: '.apk files are apps. A fake "invoice app" can read your SMS codes and empty your account.', pidgin: '.apk na app. Fake "invoice app" fit read your SMS code and wipe your account.' },
  },
  {
    id: 'q.job',
    category: 'job',
    question: { en: 'You are "shortlisted" for a job but must pay ₦15,000 for your appointment letter. Real?', pidgin: 'Dem "shortlist" you for job but say make you pay ₦15,000 for appointment letter. E real?' },
    options: [
      { en: 'Yes, letters cost money', pidgin: 'Yes, letter dey cost money' },
      { en: 'Only if it is a government job', pidgin: 'Only if na government job' },
      { en: 'No — real employers never charge to hire you', pidgin: 'No — real employer no dey collect money to employ you' },
    ],
    answer: 2,
    explanation: { en: 'FAAN, EFCC and others have warned about fake recruitment that demands payment.', pidgin: 'FAAN, EFCC and others don warn about fake recruitment wey dey collect money.' },
  },
  {
    id: 'q.2sv',
    category: 'account_takeover',
    question: { en: 'Which setting stops someone using a stolen WhatsApp code?', pidgin: 'Which setting go stop person wey thief your WhatsApp code?' },
    options: [
      { en: 'Two-step verification PIN', pidgin: 'Two-step verification PIN' },
      { en: 'Dark mode', pidgin: 'Dark mode' },
      { en: 'Disappearing messages', pidgin: 'Disappearing messages' },
    ],
    answer: 0,
    explanation: { en: 'With two-step on, a thief also needs your 6-digit PIN to register your number.', pidgin: 'If two-step dey on, thief still need your 6-digit PIN before e fit register your number.' },
  },
];

export interface Lesson {
  id: string;
  category: Category;
  title: Bilingual;
  minutes: number;
  points: Bilingual[];
  quizIds: string[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'l.whatsapp-hijack',
    category: 'account_takeover',
    title: { en: 'Protect your WhatsApp from hijackers', pidgin: 'Protect your WhatsApp from hijackers' },
    minutes: 3,
    points: [
      { en: 'Hijackers trick you into sharing the 6-digit code WhatsApp sends when someone registers your number.', pidgin: 'Hijackers dey trick you make you give dem the 6-digit code wey WhatsApp send when person wan register your number.' },
      { en: 'Variants: "I sent my code to you by mistake", fake WhatsApp support, voting links that ask for a pairing code.', pidgin: 'Different styles: "I mistakenly send my code to you", fake WhatsApp support, voting link wey ask for pairing code.' },
      { en: 'Defence: two-step verification PIN + never share codes + check Settings › Linked devices weekly.', pidgin: 'Defence: two-step verification PIN + no share any code + check Settings › Linked devices every week.' },
      { en: 'If hijacked: log out everywhere, reinstall, re-register, enable two-step, warn contacts from another app.', pidgin: 'If dem hijack am: log out everywhere, reinstall, register again, on two-step, warn your people through another app.' },
    ],
    quizIds: ['q.otp', 'q.2sv'],
  },
  {
    id: 'l.fake-alerts',
    category: 'fake_alert',
    title: { en: 'Fake alerts and "transfer successful" screens', pidgin: 'Fake alert and fake "transfer successful" screen' },
    minutes: 3,
    points: [
      { en: 'Scammers use apps that generate fake alerts and receipts, then pressure you to release goods fast.', pidgin: 'Scammers dey use app wey fit create fake alert and receipt, then rush you make you release goods.' },
      { en: 'Classic lines: "network delay", "it will reflect", "my driver is outside", "I sent excess, refund the balance".', pidgin: 'Their normal lines: "network delay", "e go soon reflect", "my driver dey outside", "I send extra, refund the balance".' },
      { en: 'Rule: only release when the money is in your bank app. Never refund an "overpayment" until your bank confirms.', pidgin: 'Rule: release only when money land for your bank app. No refund any "extra money" until your bank confirm.' },
    ],
    quizIds: ['q.alert'],
  },
  {
    id: 'l.supplier-change',
    category: 'bec',
    title: { en: '"We changed our bank account" — payment redirection', pidgin: '"We don change our account" — payment wahala' },
    minutes: 4,
    points: [
      { en: 'Criminals hijack a supplier\'s WhatsApp/email or pretend to be them, then send "new account" details.', pidgin: 'Criminals dey hijack supplier WhatsApp/email or pretend be dem, then send "new account" details.' },
      { en: 'Instant transfers make recovery almost impossible, so prevention is everything.', pidgin: 'Instant transfer dey make am almost impossible to recover money, so prevention na everything.' },
      { en: 'Policy: any bank-detail change needs a call-back on a known number and a second person\'s approval.', pidgin: 'Policy: any account change need call-back for number wey you know and second person approval.' },
    ],
    quizIds: ['q.bec'],
  },
  {
    id: 'l.impersonation',
    category: 'impersonation',
    title: { en: 'Fake banks, fake CBN, fake EFCC', pidgin: 'Fake bank, fake CBN, fake EFCC' },
    minutes: 3,
    points: [
      { en: 'Threats like "your BVN will be blocked" or "warrant of arrest" are designed to scare you into acting fast.', pidgin: 'Threat like "dem go block your BVN" or "warrant of arrest" na to scare you make you act fast.' },
      { en: 'Banks never ask for PIN, password, card number or token. Agencies never collect fines by transfer.', pidgin: 'Bank no dey ask for PIN, password, card number or token. Agency no dey collect fine through transfer.' },
      { en: 'Use only contact details inside your bank app or the agency\'s official .gov.ng website.', pidgin: 'Use only contact wey dey inside your bank app or the agency official .gov.ng website.' },
    ],
    quizIds: ['q.bvn'],
  },
  {
    id: 'l.money-schemes',
    category: 'investment',
    title: { en: 'Ponzi, crypto doubling and loan apps', pidgin: 'Ponzi, crypto doubling and loan app' },
    minutes: 4,
    points: [
      { en: 'Guaranteed returns, referral bonuses and "withdrawal fees" are the signature of Ponzi schemes like CBEX.', pidgin: 'Guaranteed profit, referral bonus and "withdrawal fee" na the sign of Ponzi like CBEX.' },
      { en: 'Fake loan apps are shared as APKs, steal contacts and harass borrowers. Real lenders are FCCPC-registered.', pidgin: 'Fake loan app dey come as APK, dey thief contacts and disgrace borrowers. Real lender don register with FCCPC.' },
      { en: 'Never pay to unlock tasks, VIP levels or withdrawals.', pidgin: 'No pay to unlock task, VIP level or withdrawal.' },
    ],
    quizIds: ['q.invest', 'q.apk'],
  },
  {
    id: 'l.jobs',
    category: 'job',
    title: { en: 'Job and admission scams', pidgin: 'Job and admission scam' },
    minutes: 2,
    points: [
      { en: 'Fake offer letters use real names (FAAN, EFCC, Shell) and ask for processing, medical or training fees.', pidgin: 'Fake offer letter dey use real names (FAAN, EFCC, Shell) and ask for processing, medical or training fee.' },
      { en: 'Nobody can buy JAMB scores, admission or NYSC postings for you.', pidgin: 'Nobody fit buy JAMB score, admission or NYSC posting for you.' },
      { en: 'Overseas job offers with upfront fees can lead to trafficking. Verify with the employer directly.', pidgin: 'Abroad job wey dem collect money first fit lead to trafficking. Confirm with the employer directly.' },
    ],
    quizIds: ['q.job'],
  },
];

/** Deterministic "tip of the day" so everyone gets the same tip on a given day. */
export function tipOfTheDay(date = new Date()): Bilingual {
  const day = Math.floor(date.getTime() / 86_400_000);
  return TIPS[day % TIPS.length];
}

export function randomTip(): Bilingual {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}

export function findQuiz(id: string): QuizQuestion | undefined {
  return QUIZ.find((q) => q.id === id);
}
