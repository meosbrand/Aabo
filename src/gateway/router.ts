/**
 * @fileoverview Chat router shared by every channel (WhatsApp bot, Telegram, future Cloud API).
 * Turns an inbound message into a command, a scam check (Scamio-style forward-to-check),
 * a Truecaller-style lookup, a quiz step or a Co-pilot answer.
 */

import { QUIZ, findQuiz, randomTip, type QuizQuestion } from '@/core/awareness/content';
import { CATEGORY_LABEL } from '@/core/advice';
import { verdictToChat, warningMessage } from '@/core/format/chat';
import type { Bilingual, Category, Lang } from '@/core/types';
import { logError } from '@/server/log';
import type { ChannelAdapter, InboundMessage } from './channels/types';
import type { Identity, RouterServices } from './services';

export interface RouterOptions {
  /** Pause before replying (ms) so the bot feels human and avoids burst sends. */
  typingDelayMs?: number;
  appUrl?: string;
}

const B = (en: string, pidgin: string): Bilingual => ({ en, pidgin });

const MSG = {
  welcome: B(
    `🛡️ *Welcome to Ààbò* — your scam shield.\n\n*Forward me* any message, link, screenshot or number you're not sure about and I'll tell you if it's a scam.\n\nOther things you can send:\n• *check 0803…* — look up a number, account or link\n• *tip* — a quick safety tip\n• *quiz* — test yourself\n• *pidgin* / *english* — change language\n• Ask me any security question\n\nI never ask for codes, PINs or passwords.`,
    `🛡️ *Welcome to Ààbò* — your scam shield.\n\n*Forward give me* any message, link, screenshot or number wey you no trust, I go tell you if na scam.\n\nOther things wey you fit send:\n• *check 0803…* — check number, account or link\n• *tip* — small safety tip\n• *quiz* — test yourself\n• *pidgin* / *english* — change language\n• Ask me any security question\n\nI no dey ever ask for code, PIN or password.`,
  ),
  noLastScan: B('There is nothing to report yet — forward me a message first.', 'Nothing dey to report yet — forward message give me first.'),
  reported: B('✅ Reported. Thank you — this helps protect everyone using Ààbò.', '✅ We don report am. Thank you — e go help protect everybody.'),
  markedSafe: B('👍 Thanks — noted. We use this to make Ààbò smarter.', '👍 Thank you — we don note am. E go make Ààbò sharp pass.'),
  warnIntro: B('Forward this warning to your customers, staff or family:', 'Forward this warning give your customers, staff or family:'),
  quotaReached: B(
    "You've used today's free checks on chat. You can keep checking for free at {url}/check, or try again tomorrow.",
    'You don finish today free checks for chat. You fit still check free for {url}/check, or try again tomorrow.',
  ),
  lang: B('Language set to English. ✅', 'I don change am to Pidgin. ✅'),
  tipsOn: B('📬 Daily safety tips: ON. Send *stop* anytime to turn them off.', '📬 Daily safety tips: ON. Send *stop* anytime to off am.'),
  tipsOff: B('🔕 Daily tips turned off. You can still forward messages to check them anytime.', '🔕 We don off daily tips. You fit still forward message make I check am anytime.'),
  linked: B('🔗 Linked to your Ààbò account{name}. Your checks will now show on your dashboard.', '🔗 We don link am to your Ààbò account{name}. Your checks go show for your dashboard now.'),
  linkFailed: B('That link code is invalid or expired. Get a new one in the Ààbò app › Settings.', 'That link code no correct or e don expire. Collect new one for Ààbò app › Settings.'),
  lookupFail: B('Send *check* followed by a phone number, 10-digit account number, link or email.', 'Send *check* plus phone number, 10-digit account number, link or email.'),
  quizCorrect: B('✅ Correct!', '✅ Correct!'),
  quizWrong: B('❌ Not quite.', '❌ E no correct.'),
  quizNext: B('Send *quiz* for another question.', 'Send *quiz* for another question.'),
  quizHow: B('Reply with A, B or C.', 'Reply with A, B or C.'),
  tipPrefix: B('💡 *Safety tip*', '💡 *Safety tip*'),
  about: B(
    'Ààbò checks messages for scams using Nigerian scam rules, link checks, community reports and AI. We keep only a short masked excerpt of what you send, never codes or passwords. Send *report* after a verdict to help others.',
    'Ààbò dey check message for scam with Nigerian scam rules, link check, community report and AI. We dey keep only small masked part of wetin you send — no code, no password. Send *report* after verdict to help others.',
  ),
  seen: B('👥 {n} people checked this same message this month.', '👥 {n} people don check this same message this month.'),
  error: B('Sorry, something went wrong while checking. Please try again in a moment.', 'Sorry o, something spoil as I dey check. Abeg try again small time.'),
  forwardIt: B('Forward the message itself to me (or paste it here) and I will check it.', 'Forward the message itself give me (or paste am here) make I check am.'),
  mediaFailed: B("I couldn't open that image. Please send it again, or paste the message text.", 'I no fit open that picture. Abeg send am again, or paste the message text.'),
  checksOnly: B('I can check messages, links, numbers and screenshots here. Forward me anything you are not sure about.', 'For here, I dey check messages, links, numbers and screenshots. Forward anything wey you no trust give me.'),
};

/** Where replies go: any adapter that can send (and optionally show "typing…"). */
export type ReplyTarget = Pick<ChannelAdapter, 'send' | 'typing'>;

const RE = {
  greeting: /^(hi+|hello+|hey|helo|menu|help|start|\/start|\/help|good (morning|afternoon|evening)|how far|wetin dey|hi aabo|hi ààbò|hello aabo|hello ààbò)[\s!.?🙏🏾👋]*$/i,
  report: /^(report|\/report|scam|na scam|report am)[\s!.]*$/i,
  safe: /^(safe|\/safe|e safe|not (a )?scam|false alarm)[\s!.]*$/i,
  warn: /^(warn|\/warn|warning)[\s!.]*$/i,
  check: /^(?:check|lookup|look up|\/check|\/lookup|who is|wetin be)\s+(.+)$/i,
  checkQuoted: /^(check|scan|check am|\/check)[\s!.?]*$/i,
  tip: /^(tip|tips|\/tip|tip of the day)[\s!.]*$/i,
  tipsOn: /^(tips on|daily tips|subscribe|\/subscribe)[\s!.]*$/i,
  stop: /^(stop|tips off|unsubscribe|\/stop)[\s!.]*$/i,
  quiz: /^(quiz|\/quiz|test me)[\s!.]*$/i,
  pidgin: /^(pidgin|\/pidgin|naija|pidgin english)[\s!.]*$/i,
  english: /^(english|\/english|eng)[\s!.]*$/i,
  link: /^(?:link|\/link)\s+([a-z0-9-]{4,12})[\s!.]*$/i,
  about: /^(about|privacy|\/about|\/privacy)[\s!.]*$/i,
  quizAnswer: /^\s*([abc123])[\s).!.]*$/i,
  question:
    /\?\s*$|^(how|what|why|when|which|who|is|are|can|could|should|do|does|will|abeg how|abeg wetin|wetin|how i fit|how do|i wan know|explain)\b/i,
  hasIndicator: /https?:\/\/|www\.|\b[\w-]+\.(com|ng|xyz|top|net|org|info|link|site|online|app|ly)\b|\b0[789][01]\d{8}\b|\+?234\d{10}\b|\b\d{10}\b/i,
};

const LETTERS = ['A', 'B', 'C'];

function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

function quizText(q: QuizQuestion, lang: Lang): string {
  return [`🧠 *Quiz*`, q.question[lang], ...q.options.map((o, i) => `${LETTERS[i]}. ${o[lang]}`), '', MSG.quizHow[lang]].join('\n');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createRouter(services: RouterServices, opts: RouterOptions = {}) {
  const typingDelay = opts.typingDelayMs ?? 700;
  const appUrl = (opts.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://aabo.app').replace(/\/$/, '');
  async function reply(adapter: ReplyTarget, chatId: string, text: string) {
    await adapter.typing?.(chatId).catch(() => undefined);
    if (typingDelay > 0) await sleep(typingDelay + Math.floor(Math.random() * typingDelay * 0.5));
    await adapter.send(chatId, text);
  }

  async function runCheck(adapter: ReplyTarget, msg: InboundMessage, identity: Identity, overrideText?: string) {
    const quota = await services.consumeCheck(identity);
    const lang = identity.language;
    if (!quota.ok) return reply(adapter, msg.chatId, fill(MSG.quotaReached[lang], { url: appUrl }));

    const { scanId, verdict, seenCount } = await services.scan(
      {
        channel: msg.channel === 'telegram' ? 'telegram' : 'whatsapp',
        text: overrideText ?? msg.text,
        imageBase64: overrideText ? undefined : msg.image?.base64,
        imageMime: overrideText ? undefined : msg.image?.mime,
        fileName: overrideText ? undefined : msg.document?.fileName,
        fileMime: overrideText ? undefined : msg.document?.mime,
        isForwarded: msg.isForwarded,
        context: msg.isForwarded ? `Forwarded on ${msg.channel}` : `Sent to the Ààbò ${msg.channel} bot`,
      },
      identity,
    );
    await services.updateIdentity(identity.id, { lastScanId: scanId });
    let text = verdictToChat(verdict, lang);
    if (seenCount > 1) text += `\n\n${fill(MSG.seen[lang], { n: seenCount })}`;
    return reply(adapter, msg.chatId, text);
  }

  async function runLookup(adapter: ReplyTarget, chatId: string, raw: string, lang: Lang) {
    const res = await services.lookup(raw);
    if (!res) return reply(adapter, chatId, MSG.lookupFail[lang]);
    const cat = res.category && CATEGORY_LABEL[res.category as Category] ? ` (${CATEGORY_LABEL[res.category as Category][lang]})` : '';
    const head = res.confirmed
      ? `🔴 *${res.value}* — ${lang === 'pidgin' ? 'confirmed scam' : 'confirmed scam'}${cat}. ${res.reports} ${lang === 'pidgin' ? 'reports' : 'reports'}.`
      : res.safe
        ? `🟢 *${res.value}* — ${lang === 'pidgin' ? 'verified correct' : 'verified legitimate'}${res.label ? ` (${res.label})` : ''}.`
        : res.reports > 0
          ? `🟠 *${res.value}* — ${lang === 'pidgin' ? `people don report am ${res.reports} times` : `reported ${res.reports} time(s) by the community`}${cat}.`
          : `⚪ *${res.value}* — ${lang === 'pidgin' ? 'nobody report am yet. No report no mean say e safe.' : "no reports yet. No reports doesn't guarantee it's safe."}`;
    const extra = res.verdict.reasons.some((r) => r.weight !== 0) ? `\n\n${verdictToChat(res.verdict, lang, { footer: false })}` : '';
    return reply(adapter, chatId, head + extra);
  }

  async function handle(msg: InboundMessage, adapter: ReplyTarget): Promise<void> {
    if (msg.isGroup) return;
    const identity = await services.getIdentity(msg.channel, msg.senderId, { displayName: msg.senderName, phone: msg.senderPhone });
    if (identity.blocked) return;
    const lang = identity.language;
    const text = (msg.text ?? '').trim();

    try {
      // Pending quiz answer.
      const quiz = identity.pendingQuizId ? findQuiz(identity.pendingQuizId) : undefined;
      if (quiz && (identity.pendingQuizExpires ?? 0) > Date.now() && RE.quizAnswer.test(text) && !msg.image && !msg.document) {
        await services.updateIdentity(identity.id, { pendingQuizId: null, pendingQuizExpires: null });
        const q = quiz;
        const raw = RE.quizAnswer.exec(text)![1].toUpperCase();
        const choice = /\d/.test(raw) ? Number(raw) - 1 : LETTERS.indexOf(raw);
        const correct = choice === q.answer;
        await services.recordQuiz(identity, q.id, correct);
        return reply(adapter, msg.chatId, `${correct ? MSG.quizCorrect[lang] : MSG.quizWrong[lang]} ${q.explanation[lang]}\n\n${MSG.quizNext[lang]}`);
      }

      if (msg.unreadableMedia && !text && !msg.image && !msg.document) return reply(adapter, msg.chatId, MSG.mediaFailed[lang]);

      // Media and contacts are always checked.
      if (msg.document || msg.image) return runCheck(adapter, msg, identity);
      if (msg.contact?.phones.length) return runLookup(adapter, msg.chatId, msg.contact.phones[0], lang);
      if (!text) return reply(adapter, msg.chatId, MSG.welcome[lang]);

      if (!msg.isForwarded) {
        if (RE.greeting.test(text)) return reply(adapter, msg.chatId, MSG.welcome[lang]);
        if (RE.pidgin.test(text) || RE.english.test(text)) {
          const next: Lang = RE.pidgin.test(text) ? 'pidgin' : 'en';
          await services.updateIdentity(identity.id, { language: next });
          return reply(adapter, msg.chatId, MSG.lang[next]);
        }
        if (RE.report.test(text)) {
          if (!identity.lastScanId) return reply(adapter, msg.chatId, MSG.noLastScan[lang]);
          await services.report(identity.lastScanId, identity);
          return reply(adapter, msg.chatId, MSG.reported[lang]);
        }
        if (RE.safe.test(text)) {
          if (!identity.lastScanId) return reply(adapter, msg.chatId, MSG.noLastScan[lang]);
          await services.markSafe(identity.lastScanId);
          return reply(adapter, msg.chatId, MSG.markedSafe[lang]);
        }
        if (RE.warn.test(text)) {
          const v = identity.lastScanId ? await services.getVerdict(identity.lastScanId) : null;
          if (!v) return reply(adapter, msg.chatId, MSG.noLastScan[lang]);
          await reply(adapter, msg.chatId, MSG.warnIntro[lang]);
          return adapter.send(msg.chatId, warningMessage(v, lang));
        }
        if (RE.checkQuoted.test(text)) {
          return msg.quotedText ? runCheck(adapter, msg, identity, msg.quotedText) : reply(adapter, msg.chatId, MSG.forwardIt[lang]);
        }
        const check = RE.check.exec(text);
        if (check) return runLookup(adapter, msg.chatId, check[1], lang);
        if (RE.tip.test(text)) return reply(adapter, msg.chatId, `${MSG.tipPrefix[lang]}\n${randomTip()[lang]}`);
        if (RE.tipsOn.test(text)) {
          await services.updateIdentity(identity.id, { tipsOptIn: true });
          return reply(adapter, msg.chatId, MSG.tipsOn[lang]);
        }
        if (RE.stop.test(text)) {
          await services.updateIdentity(identity.id, { tipsOptIn: false });
          return reply(adapter, msg.chatId, MSG.tipsOff[lang]);
        }
        if (RE.quiz.test(text)) {
          const q = QUIZ[Math.floor(Math.random() * QUIZ.length)];
          await services.updateIdentity(identity.id, { pendingQuizId: q.id, pendingQuizExpires: Date.now() + 15 * 60_000 });
          return reply(adapter, msg.chatId, quizText(q, lang));
        }
        const link = RE.link.exec(text);
        if (link) {
          const res = await services.linkAccount(link[1], identity);
          return reply(adapter, msg.chatId, res.ok ? fill(MSG.linked[lang], { name: res.name ? ` (${res.name})` : '' }) : MSG.linkFailed[lang]);
        }
        if (RE.about.test(text)) return reply(adapter, msg.chatId, MSG.about[lang]);

        // A plain question (no links/numbers) goes to the Co-pilot.
        if (RE.question.test(text) && !RE.hasIndicator.test(text) && text.length < 400) {
          const answer = await services.ask(text, identity);
          return reply(adapter, msg.chatId, answer ?? MSG.checksOnly[lang]);
        }
      }

      // Everything else is something to check.
      return runCheck(adapter, msg, identity);
    } catch (err) {
      logError('router', err);
      return reply(adapter, msg.chatId, MSG.error[lang]).catch(() => undefined);
    }
  }

  return { handle };
}

export type Router = ReturnType<typeof createRouter>;
