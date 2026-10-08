/**
 * @fileoverview Incident playbooks for the panic page ("I've been scammed").
 * Steps follow NITDA's WhatsApp recovery advisory and standard bank-fraud guidance.
 * We deliberately do not list phone numbers: users must use the number on their card / in their bank app.
 */

import type { Bilingual } from '../types';

export interface Playbook {
  id: string;
  title: Bilingual;
  urgent: Bilingual;
  steps: Bilingual[];
  /** Message the user can send to their contacts. */
  warnContacts?: Bilingual;
}

export const PLAYBOOKS: Playbook[] = [
  {
    id: 'whatsapp_hijacked',
    title: { en: 'My WhatsApp was hijacked', pidgin: 'Dem don hijack my WhatsApp' },
    urgent: { en: 'Act now — the hijacker is probably messaging your contacts for money.', pidgin: 'Move now — the hijacker fit dey message your people for money.' },
    steps: [
      { en: 'Reinstall or open WhatsApp and register your number again — you will receive a new 6-digit code by SMS. This logs the hijacker out.', pidgin: 'Reinstall or open WhatsApp and register your number again — new 6-digit code go come by SMS. E go log the hijacker out.' },
      { en: 'If WhatsApp asks for a two-step PIN you never set, wait the 7 days or contact WhatsApp support from the app (Settings › Help).', pidgin: 'If WhatsApp ask for two-step PIN wey you never set, wait the 7 days or contact WhatsApp support for app (Settings › Help).' },
      { en: 'Settings › Linked devices: log out every device.', pidgin: 'Settings › Linked devices: log out every device.' },
      { en: 'Turn on two-step verification with a new PIN and add a recovery email.', pidgin: 'On two-step verification with new PIN and add recovery email.' },
      { en: 'Warn your contacts and groups from another app or number (use the message below).', pidgin: 'Warn your people and groups from another app or number (use the message below).' },
      { en: 'Report the incident to WhatsApp (Settings › Help › Contact us) and to the police cybercrime unit if money was lost.', pidgin: 'Report am give WhatsApp (Settings › Help › Contact us) and police cybercrime unit if money don lost.' },
    ],
    warnContacts: {
      en: '⚠️ My WhatsApp was hacked. If you received any message from me asking for money or a code, please IGNORE it and do not send anything. I am recovering my account. — sent via Ààbò',
      pidgin: '⚠️ Dem don hack my WhatsApp. If you see any message from me wey dey ask for money or code, abeg IGNORE am, no send anything. I dey recover my account. — sent via Ààbò',
    },
  },
  {
    id: 'sent_money',
    title: { en: 'I sent money to a scammer', pidgin: 'I don send money give scammer' },
    urgent: { en: 'Minutes matter. Call your bank now — they can try to block or recall the transfer.', pidgin: 'Every minute matter. Call your bank now — dem fit try block or recall the transfer.' },
    steps: [
      { en: 'Call your bank using the number on the back of your card or inside your bank app (never a number from the scammer or a Google search).', pidgin: 'Call your bank with the number wey dey back of your card or inside your bank app (no be number from scammer or Google).' },
      { en: 'Give them the time, amount, and the recipient account number and bank; ask them to flag the transaction as fraud and request a recall.', pidgin: 'Give dem the time, amount, and the account number and bank wey you send to; tell dem make dem flag am as fraud and recall am.' },
      { en: 'Keep screenshots of the chat, receipts and the scammer\'s numbers.', pidgin: 'Keep screenshot of the chat, receipts and the scammer numbers.' },
      { en: 'Report to the police (cybercrime unit) and to the EFCC through their official website, and keep the reference number.', pidgin: 'Report give police (cybercrime unit) and EFCC through their official website, and keep the reference number.' },
      { en: 'Report the account and number in Ààbò so others are warned.', pidgin: 'Report the account and number for Ààbò make others see warning.' },
      { en: 'Beware of "recovery agents" who promise to get your money back for a fee — that is a second scam.', pidgin: 'Shine your eye for "recovery agents" wey promise to collect your money back if you pay — na second scam be that.' },
    ],
  },
  {
    id: 'shared_details',
    title: { en: 'I shared my PIN, OTP, password or card details', pidgin: 'I don give out my PIN, OTP, password or card details' },
    urgent: { en: 'Lock things down before the scammer uses them.', pidgin: 'Lock everything before the scammer use am.' },
    steps: [
      { en: 'Call your bank (number on your card / in the app) and ask them to block the card and freeze online banking.', pidgin: 'Call your bank (number for your card / app) make dem block the card and freeze online banking.' },
      { en: 'Change your bank app and email passwords from a safe device; turn on 2-step verification.', pidgin: 'Change your bank app and email password from safe phone; on 2-step verification.' },
      { en: 'Check recent transactions and report any you don\'t recognise.', pidgin: 'Check your recent transactions and report anyone wey you no know.' },
      { en: 'If you shared a WhatsApp code, follow the "WhatsApp hijacked" steps too.', pidgin: 'If na WhatsApp code you give, follow the "WhatsApp hijacked" steps too.' },
    ],
  },
  {
    id: 'installed_app',
    title: { en: 'I installed a suspicious app (APK)', pidgin: 'I install app wey no clear (APK)' },
    urgent: { en: 'The app may be reading your SMS codes. Disconnect first.', pidgin: 'The app fit dey read your SMS code. Disconnect first.' },
    steps: [
      { en: 'Turn on airplane mode / switch off mobile data and Wi-Fi.', pidgin: 'On airplane mode / off your data and Wi-Fi.' },
      { en: 'Settings › Apps: uninstall the app. If it can\'t be removed, check Settings › Security › Device admin apps and remove it there first.', pidgin: 'Settings › Apps: uninstall the app. If e no gree comot, check Settings › Security › Device admin apps and remove am there first.' },
      { en: 'From another device, change your bank and email passwords and call your bank to watch your account.', pidgin: 'From another phone, change your bank and email password and call your bank make dem watch your account.' },
      { en: 'Run Google Play Protect (Play Store › profile › Play Protect › Scan).', pidgin: 'Run Google Play Protect (Play Store › profile › Play Protect › Scan).' },
    ],
  },
  {
    id: 'impersonated_business',
    title: { en: 'Someone is pretending to be my business', pidgin: 'Person dey pretend be my business' },
    urgent: { en: 'Warn your customers quickly so they don\'t pay the fake account.', pidgin: 'Warn your customers quick make dem no pay the fake account.' },
    steps: [
      { en: 'Post on your WhatsApp status and pages: your only official numbers and account details.', pidgin: 'Post for your WhatsApp status and pages: your only correct numbers and account details.' },
      { en: 'Report the fake number/page in WhatsApp/Instagram/Facebook (Report contact / Report account).', pidgin: 'Report the fake number/page for WhatsApp/Instagram/Facebook (Report contact / Report account).' },
      { en: 'Report the fake number and account in Ààbò so customers who check it get warned.', pidgin: 'Report the fake number and account for Ààbò so customers wey check am go see warning.' },
    ],
    warnContacts: {
      en: '⚠️ Please note: someone is pretending to be our business. We will NEVER ask you to pay into a new account by WhatsApp. Call us on our usual number before paying. — sent via Ààbò',
      pidgin: '⚠️ Abeg note: person dey pretend be our business. We no go EVER ask you to pay into new account for WhatsApp. Call our normal number before you pay. — sent via Ààbò',
    },
  },
];
