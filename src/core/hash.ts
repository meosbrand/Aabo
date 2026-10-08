/**
 * @fileoverview Stable content hashing used for "N people checked this" counts and report keys.
 * Computed by the app shell (not the engine) so it is identical whichever engine is loaded.
 */

import { createHash } from 'node:crypto';
import { cleanText } from './extract';
import type { ScanInput } from './types';

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/** Longest message text an engine is asked to analyse. */
export const MAX_SCAN_TEXT = 6000;

export function contentHashOf(input: Pick<ScanInput, 'text' | 'url' | 'phone' | 'account' | 'fileName' | 'imageBase64'>): string {
  const text = (input.text ?? '').slice(0, MAX_SCAN_TEXT);
  const clean = cleanText([text, input.url, input.phone, input.account].filter(Boolean).join('\n'));
  return sha256([clean, input.fileName ?? '', input.imageBase64 ? sha256(input.imageBase64) : ''].join('|'));
}
