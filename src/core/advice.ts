/**
 * @fileoverview "What to do now" advice and one-line summaries, in English and Pidgin.
 * Advice follows the Nigerian guidance collected in research/aabo (NITDA, POS fraud
 * reporting, BEC guidance): verify in your bank app, never share codes, use a second channel.
 */

import type { Bilingual, Category, Level } from './types';

export const CATEGORY_LABEL: Record<Category, Bilingual> = {
  account_takeover: { en: 'Account takeover (code theft)', pidgin: 'Account hijack (code thief)' },
  fake_alert: { en: 'Fake payment / alert', pidgin: 'Fake alert / fake payment' },
  impersonation: { en: 'Impersonation', pidgin: 'Person wey dey pretend' },
  phishing: { en: 'Phishing link', pidgin: 'Fake link (phishing)' },
  investment: { en: 'Investment / Ponzi scam', pidgin: 'Ponzi / fake investment' },
  loan: { en: 'Fake loan offer', pidgin: 'Fake loan' },
  job: { en: 'Job scam', pidgin: 'Fake job' },
  giveaway: { en: 'Fake giveaway', pidgin: 'Fake giveaway' },
  bec: { en: 'Payment redirection (bank details change)', pidgin: 'Account change wahala (dem wan redirect payment)' },
  advance_fee: { en: 'Advance-fee scam', pidgin: 'Pay-first scam' },
  romance: { en: 'Romance / package scam', pidgin: 'Love scam / package scam' },
  malware: { en: 'Malicious app or file', pidgin: 'Bad app or file' },
  spam: { en: 'Spam', pidgin: 'Spam' },
  other: { en: 'Suspicious message', pidgin: 'Message wey no clear' },
};

export const LEVEL_LABEL: Record<Level, Bilingual> = {
  SAFE: { en: 'Looks safe', pidgin: 'E be like say e safe' },
  SUSPICIOUS: { en: 'Be careful', pidgin: 'Shine your eye' },
  LIKELY_SCAM: { en: 'Likely a scam', pidgin: 'E fit be scam' },
  DANGEROUS: { en: 'Dangerous — scam', pidgin: 'Danger — na scam' },
};

export const LEVEL_EMOJI: Record<Level, string> = {
  SAFE: '🟢',
  SUSPICIOUS: '🟡',
  LIKELY_SCAM: '🟠',
  DANGEROUS: '🔴',
};

const CATEGORY_ACTIONS: Partial<Record<Category, Bilingual[]>> = {
  account_takeover: [
    { en: 'Do NOT share any code with anyone — not even friends, family or "WhatsApp support".', pidgin: 'NO give anybody any code — even friend, family or "WhatsApp support".' },
    { en: 'Turn on WhatsApp two-step verification: Settings › Account › Two-step verification.', pidgin: 'On WhatsApp two-step verification: Settings › Account › Two-step verification.' },
    { en: 'If you already shared it: log out of all devices, reinstall WhatsApp, request a new code and warn your contacts from another app.', pidgin: 'If you don already give am: log out from all devices, reinstall WhatsApp, request new code and warn your people through another app.' },
  ],
  fake_alert: [
    { en: 'Check your bank app (not SMS or screenshots) and only release goods when the money is there.', pidgin: 'Check your bank app (no be SMS or screenshot) — release goods only when the money land.' },
    { en: 'Never "refund" an overpayment until your bank confirms the original credit is real.', pidgin: 'No "refund" any extra money until your bank confirm say the first money real.' },
  ],
  impersonation: [
    { en: 'Contact the organisation only through its official app, website or a number you already trust.', pidgin: 'Contact the company only through their official app, website or number wey you trust.' },
    { en: 'If it claims to be a friend or relative, call them on their usual number before sending anything.', pidgin: 'If dem talk say na your friend or family, call the person for im normal number before you send anything.' },
  ],
  phishing: [
    { en: 'Do not open the link or enter any details. Type the official website address yourself.', pidgin: 'No open the link or put any details. Type the real website address by yourself.' },
  ],
  investment: [
    { en: 'Do not deposit. Check the platform on the SEC Nigeria website — guaranteed returns are always a red flag.', pidgin: 'No deposit. Check the platform for SEC Nigeria website — any "guaranteed profit" na red flag.' },
    { en: 'Never pay a "fee" or "tax" to withdraw your own money.', pidgin: 'No pay any "fee" or "tax" to withdraw your own money.' },
  ],
  loan: [
    { en: 'Only borrow from lenders registered with the FCCPC, and never pay a fee before receiving a loan.', pidgin: 'Borrow only from lender wey register with FCCPC — no pay any fee before dem give you loan.' },
  ],
  job: [
    { en: 'Real employers do not charge for forms, training, uniforms or letters. Verify on the organisation\'s official website.', pidgin: 'Real employer no dey collect money for form, training, uniform or letter. Check the company official website.' },
  ],
  giveaway: [
    { en: 'Do not click, share or enter your number. Check the brand\'s verified page — they will say if a promo is real.', pidgin: 'No click, no share, no put your number. Check the company verified page — dem go talk if the promo real.' },
  ],
  bec: [
    { en: 'Call the supplier on a phone number you already have (not one in this message) to confirm any new account.', pidgin: 'Call the supplier for number wey you already get (no be the one for this message) to confirm the new account.' },
    { en: 'Make it a rule in your business: no bank-detail changes without a call-back check.', pidgin: 'Make am rule for your business: nobody go change account details without call-back check.' },
  ],
  advance_fee: [
    { en: 'Never pay a fee to receive money, goods, a job or a prize.', pidgin: 'No pay any fee to receive money, goods, job or prize.' },
  ],
  romance: [
    { en: 'Never send money or gift cards to someone you have not met in person.', pidgin: 'No send money or gift card give person wey you never see face to face.' },
  ],
  malware: [
    { en: 'Do not install it. Delete the file. Only install apps from Google Play or the App Store.', pidgin: 'No install am. Delete the file. Install app only from Google Play or App Store.' },
    { en: 'If you installed it: switch off data, uninstall it, and call your bank from the number on your card.', pidgin: 'If you don install am: off your data, uninstall am, and call your bank with the number wey dey your card.' },
  ],
};

const GENERIC_ACTIONS: Record<Level, Bilingual[]> = {
  SAFE: [
    { en: 'No common scam signs found. Still, never share codes or PINs, and verify payments in your bank app.', pidgin: 'We no see common scam signs. But still, no give anybody code or PIN, and confirm payment for your bank app.' },
  ],
  SUSPICIOUS: [
    { en: 'Slow down. Verify through a channel you already trust before you click, pay or reply.', pidgin: 'Calm down small. Confirm through channel wey you trust before you click, pay or reply.' },
  ],
  LIKELY_SCAM: [
    { en: 'Do not reply, click or pay. Block the sender and report it to Ààbò.', pidgin: 'No reply, no click, no pay. Block the person and report am give Ààbò.' },
  ],
  DANGEROUS: [
    { en: 'Do not reply, click or pay. Block and report the sender.', pidgin: 'No reply, no click, no pay. Block and report the person.' },
    { en: 'If you already paid or shared details, call your bank immediately using the number on your card.', pidgin: 'If you don already pay or give details, call your bank sharp-sharp with the number wey dey your card.' },
  ],
};

export function actionsFor(level: Level, category: Category | null): Bilingual[] {
  const specific = level === 'SAFE' || !category ? [] : CATEGORY_ACTIONS[category] ?? [];
  return [...specific, ...GENERIC_ACTIONS[level]].slice(0, 4);
}

export function summaryFor(level: Level, category: Category | null): Bilingual {
  const head = LEVEL_LABEL[level];
  if (level === 'SAFE' || !category) return head;
  const cat = CATEGORY_LABEL[category];
  return { en: `${head.en}: ${cat.en}`, pidgin: `${head.pidgin}: ${cat.pidgin}` };
}
