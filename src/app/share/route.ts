/**
 * Web Share Target endpoint (see public/manifest.webmanifest). On Android, users pick
 * "Share → Ààbò" in WhatsApp, Messages, Instagram, Telegram, etc. and land on a verdict.
 */

import { NextResponse } from 'next/server';
import { IMAGE_MIMES, MAX_IMAGE_BYTES } from '@/lib/scan-request';
import { clientIpFrom, rateLimit } from '@/server/rate-limit';
import { runScan } from '@/server/scans';
import { getSessionUser } from '@/server/session';

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.redirect(new URL('/check', req.url), 303);

  const text = [form.get('title'), form.get('text'), form.get('url')]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .join('\n')
    .slice(0, 6000);

  let imageBase64: string | undefined;
  let imageMime: string | undefined;
  const media = form.get('media');
  if (media instanceof File && media.size > 0 && media.size <= MAX_IMAGE_BYTES && (IMAGE_MIMES as readonly string[]).includes(media.type)) {
    imageBase64 = Buffer.from(await media.arrayBuffer()).toString('base64');
    imageMime = media.type;
  }

  if (!text && !imageBase64) return NextResponse.redirect(new URL('/check', req.url), 303);

  const limit = await rateLimit(`check:${clientIpFrom(req)}`, 40, 3_600_000);
  if (!limit.ok) return NextResponse.redirect(new URL(`/check?text=${encodeURIComponent(text)}`, req.url), 303);

  const user = await getSessionUser();
  const { scanId } = await runScan(
    { text, imageBase64, imageMime, channel: 'share', context: 'Shared from another app' },
    { userId: user?.id, orgId: user?.orgId, storeExcerpt: true },
  );
  return NextResponse.redirect(new URL(`/check/${scanId}`, req.url), 303);
}

/** Some launchers fall back to GET with query parameters. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const text = [u.searchParams.get('title'), u.searchParams.get('text'), u.searchParams.get('url')].filter(Boolean).join('\n');
  return NextResponse.redirect(new URL(`/check${text ? `?text=${encodeURIComponent(text.slice(0, 6000))}` : ''}`, req.url), 303);
}
