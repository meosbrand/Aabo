/**
 * @fileoverview Community engine signals. Each one is a plain, explainable check with an English
 * and a Pidgin explanation. Ids start with "c." so they are recognisable anywhere they show up.
 */

import { defang } from '@/core/defang';
import { SHORTENERS } from '@/core/lists';
import type { Category, Extracted, IndicatorInfo, IndicatorType, Level, ParsedUrl, Reason, ScanInput } from '@/core/types';
import { trustedDomains, trustedNames } from './trusted';

interface TextSignal {
  id: string;
  weight: number;
  category?: Category;
  floor?: Level;
  en: string;
  pidgin: string;
  test(t: string, x: Extracted): boolean;
}

function reason(s: Pick<TextSignal, 'id' | 'weight' | 'category' | 'floor' | 'en' | 'pidgin'>, source: Reason['source'] = 'rule'): Reason {
  const r: Reason = { id: s.id, weight: s.weight, source, text: { en: s.en, pidgin: s.pidgin } };
  if (s.category) r.category = s.category;
  if (s.floor) r.floor = s.floor;
  return r;
}

const NEGATED = /(don'?t|do not|never|no|not to)\s+$/;

/** True when `verb … object` appears in one sentence and the verb is not negated ("don't share"). */
function asks(t: string, verbs: string, objects: string, gap = 50): boolean {
  const re = new RegExp(`\\b(${verbs})\\b[^.?!\\n]{0,${gap}}?\\b(${objects})\\b`, 'g');
  for (const m of t.matchAll(re)) {
    const before = t.slice(Math.max(0, (m.index ?? 0) - 12), m.index);
    if (!NEGATED.test(before)) return true;
  }
  return false;
}

const has = (re: RegExp) => (t: string) => re.test(t);

const TEXT_SIGNALS: TextSignal[] = [
  {
    id: 'c.code_request',
    weight: 0.7,
    category: 'account_takeover',
    floor: 'LIKELY_SCAM',
    en: 'It asks you to pass on a one-time code or PIN. No genuine person or company ever needs your codes.',
    pidgin: 'E dey ask make you send code or PIN wey dem send you. No correct person or company go ever ask for your code.',
    test: (t) =>
      asks(t, 'send|share|forward|give|tell|read|drop|screenshot', 'otps?|codes?|pins?|tokens?|verification number') ||
      /\b(otp|code|pin)\b[^.?!\n]{0,40}\b(sent|came|enter(ed)?)\b[^.?!\n]{0,30}\b(by mistake|mistakenly|wrongly)\b/.test(t),
  },
  {
    id: 'c.card_details',
    weight: 0.6,
    category: 'phishing',
    floor: 'LIKELY_SCAM',
    en: 'It asks for card details or a PIN. Your bank will never ask for these by message.',
    pidgin: 'E dey ask for your card details or PIN. Your bank no go ever ask for am for message.',
    test: (t) => asks(t, 'send|provide|enter|confirm|update|share|give|input|reply with', 'cvv|card number|card details|atm pin|card pin|expiry date|internet banking password', 40),
  },
  {
    id: 'c.id_numbers',
    weight: 0.45,
    category: 'phishing',
    en: 'It asks you to verify or update your BVN/NIN. Do this only inside your bank app or at a branch.',
    pidgin: 'E dey ask make you verify or update your BVN/NIN. Do am only for your bank app or for branch.',
    test: (t) => /\b(bvn|nin)\b/.test(t) && /\b(link|update|verify|validate|revalidate|suspend\w*|block\w*|restrict\w*|deactivat\w*)\b/.test(t),
  },
  {
    id: 'c.account_threat',
    weight: 0.3,
    category: 'phishing',
    en: 'It threatens that your account, line or wallet will be blocked. Scammers use fear to rush you.',
    pidgin: 'E dey threaten say dem go block your account, line or wallet. Scammers dey use fear take rush person.',
    test: has(/\b(account|wallet|line|sim|whatsapp|card)\b[^.?!\n]{0,30}\b(will be|has been|have been|is|is now|are)\s+(blocked|suspended|restricted|deactivated|closed|frozen|flagged|disabled)\b/),
  },
  {
    id: 'c.pressure',
    weight: 0.15,
    en: 'It pushes you to act fast. Take your time — real organisations give you time to check.',
    pidgin: 'E dey rush you. Take your time — correct company go give you time to check.',
    test: has(/\b(urgent(ly)?|immediately|right now|now now|asap|(within|in) \d+ ?(hours?|hrs|minutes|mins)|before midnight|last warning|final notice|today only|expires today)\b/),
  },
  {
    id: 'c.upfront_fee',
    weight: 0.4,
    category: 'advance_fee',
    en: 'It asks you to pay a fee first to receive money, a job, a loan or a prize. That is the classic advance-fee trick.',
    pidgin: 'E dey ask make you pay fee first before you collect money, work, loan or prize. Na the old 419 style be that.',
    test: (t) =>
      asks(t, 'pay|send|transfer|deposit|remit', 'fee|charge|levy|registration|activation|processing|clearance|unlock|unlocking|tax|commission', 40) &&
      !/\b(delivery|shipping|school|tuition|exam|service) (fee|charge)/.test(t),
  },
  {
    id: 'c.job_fee',
    weight: 0.3,
    category: 'job',
    en: 'A job offer that comes with a payment. Real employers do not charge you to hire you.',
    pidgin: 'Job offer wey get payment inside. Correct employer no dey collect money before dem employ you.',
    test: (t) => /\b(job|employment|vacancy|vacancies|appointment letter|shortlisted|recruitment|interview)\b/.test(t) && /\b(pay|fee|charge|transfer)\b/.test(t),
  },
  {
    id: 'c.prize',
    weight: 0.4,
    category: 'giveaway',
    en: 'It says you won or were selected for something you never entered.',
    pidgin: 'E talk say you win or dem select you for something wey you no enter.',
    test: (t) => /\byou (have |'ve )?(won|been selected|been chosen|qualified)\b/.test(t) || (/\bcongrat\w*/.test(t) && /\b(won|winner|selected|reward|prize|grant|gift)\b/.test(t)),
  },
  {
    id: 'c.free_money',
    weight: 0.35,
    category: 'giveaway',
    en: 'It promises free money, data or airtime. Giveaways like this are almost always bait.',
    pidgin: 'E promise free money, data or airtime. Dis kind giveaway na bait almost every time.',
    test: has(/\b(free|claim|collect)\b[^.?!\n]{0,25}\b(data|airtime|cash|money|grant|palliative|giveaway|bonus)\b/),
  },
  {
    id: 'c.chain_share',
    weight: 0.3,
    category: 'giveaway',
    en: 'It asks you to share it with groups or contacts to qualify. That is how scams spread.',
    pidgin: 'E talk say make you share am give groups or contacts before you qualify. Na so scam dey spread.',
    test: has(/\b(share|forward|send) (this|it|am)?\s?[^.?!\n]{0,20}\b(\d+ )?(groups|contacts|friends)\b/),
  },
  {
    id: 'c.big_returns',
    weight: 0.5,
    category: 'investment',
    en: 'It promises guaranteed or very high returns. Real investments never guarantee profit.',
    pidgin: 'E promise sure profit or big returns. No correct investment dey guarantee profit.',
    test: has(/\b(double your (money|investment|cash)|(send|pay|get|receive) (you )?(back )?double|guaranteed (returns?|profit|income)|risk[- ]free (investment|returns?)|\d{2,3}\s?% (daily|weekly|monthly|profit|returns?|interest|roi))\b/),
  },
  {
    id: 'c.authority_pay',
    weight: 0.5,
    category: 'impersonation',
    en: 'It claims to be the police, EFCC or a court and asks for money. Law enforcement does not collect payments by message.',
    pidgin: 'E claim say na police, EFCC or court, and e dey ask for money. Police no dey collect money for message.',
    test: (t) => /\b(efcc|police|dss|court|warrant|arrest|interpol)\b/.test(t) && /\b(pay|fee|fine|transfer|settle)\b/.test(t),
  },
  {
    id: 'c.new_bank_details',
    weight: 0.45,
    category: 'bec',
    en: 'It asks you to pay into new or changed bank details. Confirm by calling a number you already have.',
    pidgin: 'E dey ask make you pay enter new account. Call the person for number wey you don get before before you pay.',
    test: (t) => /\b(new|changed|updated|different|another)\b[^.?!\n]{0,25}\b(account|bank details|account number|bank account)\b/.test(t) && /\b(pay|payment|transfer|remit|invoice)\b/.test(t),
  },
  {
    id: 'c.keep_secret',
    weight: 0.2,
    en: 'It asks you to keep it secret. Scammers do not want you to ask anyone for advice.',
    pidgin: 'E talk say make you no tell anybody. Scammers no want make you ask person for advice.',
    test: has(/\b(don'?t tell|do not tell|keep (this|it) (secret|private|between us)|tell no one)\b/),
  },
];

export function textSignals(x: Extracted): Reason[] {
  const out = TEXT_SIGNALS.filter((s) => s.test(x.text, x)).map((s) => reason(s));
  if (x.wallets.length && /\b(send|transfer|deposit|invest)\b/.test(x.text)) {
    out.push(
      reason({
        id: 'c.crypto_payment',
        weight: 0.3,
        category: 'investment',
        en: 'It asks you to send crypto to a wallet. Crypto payments cannot be reversed.',
        pidgin: 'E dey ask make you send crypto enter wallet. Crypto payment no dey reverse.',
      }),
    );
  }
  return out;
}

const EXECUTABLE = /\.(apk|xapk|apks|exe|msi|scr|bat|cmd|com|vbs|vbe|jar|ps1|js|wsf|hta|lnk)$/i;

export function fileSignals(input: ScanInput): Reason[] {
  const name = input.fileName?.trim();
  if (!name) return [];
  if (EXECUTABLE.test(name) || input.fileMime === 'application/vnd.android.package-archive') {
    return [
      reason(
        {
          id: 'c.file_executable',
          weight: 0.9,
          category: 'malware',
          floor: 'DANGEROUS',
          en: `"${name.slice(0, 80)}" is an app or program, not a document. Do not open it — apps sent in chats are used to steal codes and bank logins.`,
          pidgin: `"${name.slice(0, 80)}" na app or program, e no be document. No open am — dem dey use app wey dem send for chat take steal code and bank login.`,
        },
        'file',
      ),
    ];
  }
  return [];
}

export interface LinkCheck {
  reasons: Reason[];
  trusted: boolean;
}

export function linkSignals(u: ParsedUrl): LinkCheck {
  const shown = defang(u.href).slice(0, 120);
  const domain = u.domain ?? u.hostname;
  const out: Reason[] = [];
  if (trustedDomains().has(domain)) {
    return {
      trusted: true,
      reasons: [
        reason(
          {
            id: 'c.link_trusted',
            weight: -0.25,
            en: `${defang(domain)} is an official website.`,
            pidgin: `${defang(domain)} na official website.`,
          },
          'safe',
        ),
      ],
    };
  }
  if (u.isIp) {
    out.push(reason({ id: 'c.link_ip', weight: 0.45, category: 'phishing', en: `The link ${shown} uses a bare IP address instead of a name. Real companies do not do this.`, pidgin: `The link ${shown} dey use only number (IP) instead of name. Correct company no dey do am like that.` }, 'url'));
  }
  if (u.hostname.split('.').some((l) => l.startsWith('xn--'))) {
    out.push(reason({ id: 'c.link_lookalike_letters', weight: 0.45, category: 'phishing', en: `The link ${shown} uses look-alike letters to imitate another website.`, pidgin: `The link ${shown} dey use letters wey resemble another website own.` }, 'url'));
  }
  if (SHORTENERS.has(domain)) {
    out.push(reason({ id: 'c.link_short', weight: 0.2, en: `${shown} is a short link that hides where it really goes.`, pidgin: `${shown} na short link wey hide where e dey really go.` }, 'url'));
  }
  const brand = trustedNames().find((n) => u.hostname.replace(/[^a-z0-9]/g, '').includes(n));
  if (brand) {
    out.push(
      reason(
        {
          id: 'c.link_brand_name',
          weight: 0.5,
          category: 'phishing',
          en: `The link ${shown} uses the name "${brand}" but is not its official website.`,
          pidgin: `The link ${shown} dey use "${brand}" name but e no be their official website.`,
        },
        'url',
      ),
    );
  }
  if (u.href.startsWith('http://') && /\/(login|log-in|signin|verify|update|secure|account|bvn|claim)/i.test(u.href)) {
    out.push(reason({ id: 'c.link_insecure_login', weight: 0.25, category: 'phishing', en: `${shown} asks you to sign in or verify on an insecure page.`, pidgin: `${shown} dey ask make you login or verify for page wey no secure.` }, 'url'));
  }
  return { trusted: false, reasons: out };
}

function describe(type: IndicatorType, value: string): { en: string; pidgin: string } {
  switch (type) {
    case 'phone':
      return { en: `The number ${value}`, pidgin: `This number ${value}` };
    case 'account':
      return { en: `The account number ${value}`, pidgin: `This account number ${value}` };
    case 'domain':
    case 'url':
      return { en: `The link ${defang(value).slice(0, 120)}`, pidgin: `This link ${defang(value).slice(0, 120)}` };
    case 'wallet':
      return { en: `The wallet ${value.slice(0, 12)}…`, pidgin: `This wallet ${value.slice(0, 12)}…` };
    case 'email':
      return { en: `The email ${value}`, pidgin: `This email ${value}` };
    default:
      return { en: 'This exact message', pidgin: 'This same message' };
  }
}

export function reputationSignal(info: IndicatorInfo, confirmedAt: number): Reason {
  const who = describe(info.type, info.value);
  const label = info.label ? ` (${info.label.slice(0, 80)})` : '';
  if (info.safe) {
    return reason({ id: `c.rep_good.${info.type}`, weight: -0.4, en: `${who.en} is a verified legitimate contact${label}.`, pidgin: `${who.pidgin} na verified correct contact${label}.` }, 'safe');
  }
  const category = info.category ?? undefined;
  if (info.confidence >= confirmedAt) {
    return reason(
      { id: `c.rep_confirmed.${info.type}`, weight: 0.85, category, floor: 'DANGEROUS', en: `${who.en} is a confirmed scam${label}.`, pidgin: `${who.pidgin} na confirmed scam${label}.` },
      'reputation',
    );
  }
  if (info.source.startsWith('feed:')) {
    return reason(
      { id: `c.rep_feed.${info.type}`, weight: 0.8, category, floor: 'LIKELY_SCAM', en: `${who.en} is on a public list of phishing and malware links.`, pidgin: `${who.pidgin} dey for public list of scam and virus links.` },
      'feed',
    );
  }
  const times = info.reports === 1 ? 'once' : `${info.reports} times`;
  return reason(
    {
      id: `c.rep_reported.${info.type}`,
      weight: Math.min(0.6, 0.2 + 0.4 * info.confidence),
      category,
      en: `${who.en} has been reported as a scam ${times} by other users.`,
      pidgin: `${who.pidgin} don dey reported as scam ${times} by other people.`,
    },
    'reputation',
  );
}

export function ocrUnavailable(): Reason {
  return {
    id: 'ocr.unavailable',
    weight: 0,
    source: 'llm',
    text: {
      en: "We couldn't read this screenshot. Paste the message text to check it properly.",
      pidgin: 'We no fit read this screenshot. Paste the message make we check am well.',
    },
  };
}
