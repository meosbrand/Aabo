/**
 * @fileoverview WhatsApp & business security self-assessment ("Security checkup").
 * Drives the real protection score on the dashboard (replaces the old mock backup centre).
 */

import type { Bilingual } from '../types';

export interface CheckupItem {
  id: string;
  weight: number;
  title: Bilingual;
  how: Bilingual;
}

export const CHECKUP: CheckupItem[] = [
  {
    id: 'wa_2sv',
    weight: 3,
    title: { en: 'WhatsApp two-step verification is ON', pidgin: 'WhatsApp two-step verification dey ON' },
    how: { en: 'WhatsApp › Settings › Account › Two-step verification › Turn on. Add an email for recovery.', pidgin: 'WhatsApp › Settings › Account › Two-step verification › Turn on. Add email for recovery.' },
  },
  {
    id: 'wa_linked_devices',
    weight: 2,
    title: { en: 'I checked WhatsApp "Linked devices" this month', pidgin: 'I don check WhatsApp "Linked devices" this month' },
    how: { en: 'WhatsApp › Settings › Linked devices. Log out anything you don\'t recognise (keep Ààbò Guardian if you use it).', pidgin: 'WhatsApp › Settings › Linked devices. Log out anything wey you no know (leave Ààbò Guardian if you dey use am).' },
  },
  {
    id: 'wa_backup_e2e',
    weight: 1,
    title: { en: 'WhatsApp chat backup is end-to-end encrypted', pidgin: 'WhatsApp chat backup get end-to-end encryption' },
    how: { en: 'WhatsApp › Settings › Chats › Chat backup › End-to-end encrypted backup.', pidgin: 'WhatsApp › Settings › Chats › Chat backup › End-to-end encrypted backup.' },
  },
  {
    id: 'bank_app_verify',
    weight: 3,
    title: { en: 'We confirm every payment in the bank app before releasing goods', pidgin: 'We dey confirm every payment for bank app before we release goods' },
    how: { en: 'Turn on push notifications in your bank / POS app and make it the only proof of payment your staff accept.', pidgin: 'On notification for your bank / POS app and make am the only proof of payment wey your staff go accept.' },
  },
  {
    id: 'callback_policy',
    weight: 3,
    title: { en: 'No payment to a new account without a call-back check', pidgin: 'No payment to new account without call-back check' },
    how: { en: 'Write it down: any change of bank details is confirmed by calling a known number, and approved by a second person.', pidgin: 'Write am down: any account change must confirm by calling number wey you know, and second person must approve.' },
  },
  {
    id: 'unique_passwords',
    weight: 2,
    title: { en: 'Email and bank use different, strong passwords', pidgin: 'Email and bank dey use different strong passwords' },
    how: { en: 'Use a password manager (Google Password Manager, Bitwarden) so every account has its own password.', pidgin: 'Use password manager (Google Password Manager, Bitwarden) make every account get im own password.' },
  },
  {
    id: 'email_2fa',
    weight: 2,
    title: { en: 'Business email has 2-step verification', pidgin: 'Business email get 2-step verification' },
    how: { en: 'Gmail: myaccount.google.com › Security › 2-Step Verification. Outlook: account.microsoft.com › Security.', pidgin: 'Gmail: myaccount.google.com › Security › 2-Step Verification. Outlook: account.microsoft.com › Security.' },
  },
  {
    id: 'device_lock',
    weight: 1,
    title: { en: 'Phones have a screen lock and Find My Device', pidgin: 'Phone get screen lock and Find My Device' },
    how: { en: 'Set a PIN/fingerprint lock and turn on Find My Device (Android) or Find My (iPhone).', pidgin: 'Put PIN/fingerprint lock and on Find My Device (Android) or Find My (iPhone).' },
  },
  {
    id: 'updates_on',
    weight: 1,
    title: { en: 'Phone and apps update automatically', pidgin: 'Phone and apps dey update by themselves' },
    how: { en: 'Turn on automatic updates in Play Store / App Store and install system updates.', pidgin: 'On automatic update for Play Store / App Store and install system updates.' },
  },
  {
    id: 'staff_trained',
    weight: 2,
    title: { en: 'Staff know the top Nigerian scams', pidgin: 'Staff sabi the top Nigerian scams' },
    how: { en: 'Invite your staff in Team and ask them to finish the Learn lessons (10 minutes).', pidgin: 'Invite your staff for Team make dem finish the Learn lessons (10 minutes).' },
  },
];

export const CHECKUP_TOTAL_WEIGHT = CHECKUP.reduce((s, i) => s + i.weight, 0);
