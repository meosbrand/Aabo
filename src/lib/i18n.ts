import type { Bilingual, Lang } from '@/core/types';

/** Pick the right language from a bilingual string. */
export function tr(lang: Lang, text: Bilingual): string {
  return text[lang] ?? text.en;
}

/** Inline bilingual literal helper: L('Hello', 'How far'). */
export function L(en: string, pidgin: string): Bilingual {
  return { en, pidgin };
}
