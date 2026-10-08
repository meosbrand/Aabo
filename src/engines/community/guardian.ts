/**
 * @fileoverview Basic Guardian behaviour, used when the loaded engine has no Guardian policy.
 */

import type { GuardianPolicy } from '@/core/engine';
import { verdictToChat } from '@/core/format/chat';

export const basicGuardianPolicy: GuardianPolicy = {
  contextSize: 3,
  contextTtlMs: 10 * 60_000,
  dedupeMs: 10 * 60_000,
  toScanInput(msg, history) {
    const text = msg.text?.trim() ?? '';
    if (!text && !msg.document) return null;
    return {
      channel: 'guardian',
      text,
      fileName: msg.document?.fileName,
      fileMime: msg.document?.mime,
      senderPhone: msg.senderPhone,
      isForwarded: msg.isForwarded,
      conversation: history,
      context: msg.isGroup ? 'WhatsApp group message' : 'Incoming WhatsApp message',
    };
  },
  shouldAlert: () => true,
  notice(verdict, msg, prefs) {
    const who = [msg.senderName, msg.senderPhone].filter(Boolean).join(' · ') || (prefs.language === 'pidgin' ? 'person wey you no know' : 'an unknown sender');
    const head =
      prefs.language === 'pidgin'
        ? `🛡️ *Ààbò Guardian*: check this message from *${who}* well before you do anything.`
        : `🛡️ *Ààbò Guardian*: be careful with this message from *${who}*.`;
    return `${head}\n\n${verdictToChat(verdict, prefs.language, { footer: false })}`;
  },
};
