/**
 * @fileoverview The JSON a model returns for a scam assessment, and its conversion to LlmResult.
 * Parsing is lenient (models vary); the result is clamped and trimmed.
 */

import { z } from 'zod';
import { CATEGORIES, type Category, type LlmResult } from '@/core/types';

const CATEGORY_VALUES = [...CATEGORIES, 'none'];

export const ScamAssessmentSchema = z.object({
  riskScore: z.coerce.number(),
  category: z.string().nullable().optional(),
  redFlags: z.array(z.coerce.string()).nullable().optional(),
  explanationEn: z.string().nullable().optional(),
  explanationPidgin: z.string().nullable().optional(),
  extractedText: z.string().nullable().optional(),
});

export type ScamAssessment = z.infer<typeof ScamAssessmentSchema>;

export const SCAM_JSON_SCHEMA = {
  name: 'scam_assessment',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['riskScore', 'category', 'redFlags', 'explanationEn', 'explanationPidgin', 'extractedText'],
    properties: {
      riskScore: { type: 'number', description: '0 = clearly legitimate, 100 = certainly a scam' },
      category: { type: 'string', enum: CATEGORY_VALUES, description: 'Best-fitting scam category, or "none" if legitimate' },
      redFlags: { type: 'array', items: { type: 'string' }, description: 'Up to 5 short, concrete red flags' },
      explanationEn: { type: 'string', description: 'One or two plain-English sentences for a small-business owner' },
      explanationPidgin: { type: 'string', description: 'The same explanation in natural Nigerian Pidgin' },
      extractedText: { type: ['string', 'null'], description: 'All text visible in the attached image, or null when there is no image' },
    },
  } as Record<string, unknown>,
};

export const SCAM_FIELDS =
  `riskScore (number 0-100: 0 = clearly legitimate, 100 = certainly a scam), category (one of: ${CATEGORY_VALUES.join(', ')}), ` +
  'redFlags (array of up to 5 short strings), explanationEn (one or two plain English sentences), ' +
  'explanationPidgin (the same in natural Nigerian Pidgin), extractedText (all text visible in the attached image, or null)';

function isCategory(x: unknown): x is Category {
  return typeof x === 'string' && (CATEGORIES as readonly string[]).includes(x);
}

export function toLlmResult(a: ScamAssessment): LlmResult | null {
  if (!Number.isFinite(a.riskScore)) return null;
  const en = (a.explanationEn ?? '').trim().slice(0, 500);
  const extracted = a.extractedText?.trim();
  return {
    riskScore: Math.max(0, Math.min(100, Math.round(a.riskScore))),
    category: isCategory(a.category) ? a.category : null,
    redFlags: (a.redFlags ?? []).map((f) => f.trim().slice(0, 200)).filter(Boolean).slice(0, 5),
    explanationEn: en || 'An AI assistant reviewed this message.',
    explanationPidgin: (a.explanationPidgin ?? '').trim().slice(0, 500) || en || 'AI don check this message.',
    extractedText: extracted ? extracted.slice(0, 6000) : undefined,
  };
}
