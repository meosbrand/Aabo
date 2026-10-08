import { z } from 'zod';

export const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Public API / server-action input for a scan. */
export const ScanRequestSchema = z
  .object({
    text: z.string().max(6000).optional(),
    url: z.string().max(2000).optional(),
    phone: z.string().max(40).optional(),
    account: z.string().max(20).optional(),
    context: z.string().max(200).optional(),
    imageBase64: z.string().max(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 8).optional(),
    imageMime: z.enum(IMAGE_MIMES).optional(),
    fileName: z.string().max(200).optional(),
    language: z.enum(['en', 'pidgin']).optional(),
  })
  .refine((v) => Boolean(v.text?.trim() || v.url || v.phone || v.account || v.imageBase64 || v.fileName), {
    message: 'Provide text, url, phone, account, imageBase64 or fileName',
  });

export type ScanRequest = z.infer<typeof ScanRequestSchema>;

export type LookupType = 'phone' | 'account' | 'domain' | 'url' | 'email' | 'wallet';

/** Guess what kind of identifier a user typed into the lookup box. */
export function detectIdentifier(raw: string): { type: LookupType; value: string } | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) return { type: 'email', value: v.toLowerCase() };
  const digits = v.replace(/[\s-]/g, '');
  if (/^\d{10}$/.test(digits)) return { type: 'account', value: digits };
  if (/^\+?\d{8,15}$/.test(digits)) return { type: 'phone', value: digits };
  if (/^(0x[a-f0-9]{40}|bc1[a-z0-9]{25,62}|T[1-9A-HJ-NP-Za-km-z]{33})$/i.test(v)) return { type: 'wallet', value: v };
  if (/^(https?:\/\/)?[^\s/]+\.[a-z]{2,}(\/\S*)?$/i.test(v)) return { type: /^https?:\/\//i.test(v) || v.includes('/') ? 'url' : 'domain', value: v };
  return null;
}
