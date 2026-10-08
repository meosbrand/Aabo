/**
 * @fileoverview Verdict formatting for chat channels (WhatsApp / Telegram) and share links.
 * WhatsApp formatting: *bold*, _italic_. Links are always defanged so they can't be tapped.
 */

import { CATEGORY_LABEL, LEVEL_EMOJI, LEVEL_LABEL } from '../advice';
import { defang } from '../defang';
import type { Lang, Verdict } from '../types';

const MAX_REASONS = 4;

export function verdictToChat(v: Verdict, lang: Lang, opts: { footer?: boolean } = {}): string {
  const lines: string[] = [];
  lines.push(`${LEVEL_EMOJI[v.level]} *${LEVEL_LABEL[v.level][lang]}*  (${v.score}/100)`);
  if (v.category) lines.push(`_${CATEGORY_LABEL[v.category][lang]}_`);

  const why = v.reasons.filter((r) => r.weight > 0 && r.source !== 'llm').slice(0, MAX_REASONS);
  const llm = v.reasons.find((r) => r.source === 'llm' && r.weight > 0);
  const safe = v.reasons.filter((r) => r.weight < 0).slice(0, 2);
  const notes = v.reasons.filter((r) => r.weight === 0).slice(0, 2);
  if (why.length || llm) {
    lines.push('', lang === 'pidgin' ? '*Why we talk am:*' : '*Why:*');
    for (const r of why) lines.push(`• ${r.text[lang]}`);
    if (llm && why.length < MAX_REASONS) lines.push(`• ${llm.text[lang]}`);
  }
  if (safe.length && v.level !== 'DANGEROUS') {
    lines.push('', lang === 'pidgin' ? '*Wetin look correct:*' : '*Good signs:*');
    for (const r of safe) lines.push(`• ${r.text[lang]}`);
  }
  for (const r of notes) lines.push(`ℹ️ ${r.text[lang]}`);

  lines.push('', lang === 'pidgin' ? '*Wetin to do now:*' : '*What to do now:*');
  v.actions.forEach((a, i) => lines.push(`${i + 1}. ${a[lang]}`));

  if (v.indicators.urls.length && v.level !== 'SAFE') {
    lines.push('', lang === 'pidgin' ? 'Links (we don disable dem):' : 'Links (disabled for safety):');
    for (const u of v.indicators.urls.slice(0, 3)) lines.push(`  ${defang(u)}`);
  }

  if (opts.footer !== false) {
    lines.push(
      '',
      lang === 'pidgin'
        ? 'Reply *REPORT* if na scam, *SAFE* if we miss am, or *WARN* to get message wey you fit send your people.'
        : 'Reply *REPORT* to report this scam, *SAFE* if we got it wrong, or *WARN* for a warning you can forward.',
    );
  }
  return lines.join('\n');
}

/** A short warning people can forward to customers, staff or family. */
export function warningMessage(v: Verdict, lang: Lang): string {
  const cat = v.category ? CATEGORY_LABEL[v.category][lang] : LEVEL_LABEL[v.level][lang];
  const top = v.reasons.find((r) => r.weight > 0);
  const what = v.actions[0]?.[lang] ?? '';
  if (lang === 'pidgin') {
    return `⚠️ SCAM ALERT (${cat})\n${top ? top.text.pidgin : ''}\n${what}\n— Checked with Ààbò 🛡️`;
  }
  return `⚠️ SCAM ALERT (${cat})\n${top ? top.text.en : ''}\n${what}\n— Checked with Ààbò 🛡️`;
}

/** wa.me link that opens WhatsApp with the warning pre-filled (user picks the recipient). */
export function whatsappShareLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
