/**
 * Loads the configured detection engine through the app's loader and checks a few verdicts.
 * Used to confirm a separately built engine works with this version of the app:
 *   AABO_ENGINE=module AABO_ENGINE_MODULE=../aabo-engine/dist/index.js AABO_ENGINE_REQUIRED=1 npx tsx scripts/smoke-engine.ts
 */
import 'dotenv/config';
import { levelAtLeast } from '../src/core/levels';
import { normalizeVerdict } from '../src/core/normalize';
import type { Level, ScanInput } from '../src/core/types';
import { engineInfo, loadEngine } from '../src/server/engine-loader';

const CASES: Array<{ name: string; input: ScanInput; min?: Level; max?: Level }> = [
  { name: 'app sent in chat', input: { channel: 'whatsapp', text: 'install this update', fileName: 'Bank_Update.apk' }, min: 'LIKELY_SCAM' },
  { name: 'one-time code request', input: { channel: 'web', text: 'Please forward the OTP you just received, I sent it to your number by mistake' }, min: 'SUSPICIOUS' },
  { name: 'ordinary message', input: { channel: 'web', text: 'Good morning, what time will you open the shop today?' }, max: 'SAFE' },
  { name: 'screenshot without AI', input: { channel: 'web', imageBase64: 'aGVsbG8=', imageMime: 'image/png' }, max: 'SAFE' },
];

async function main() {
  process.env.INTEL_NETWORK_LOOKUPS = '0';
  const engine = await loadEngine();
  const info = engineInfo();
  console.log(`engine: ${engine.id} ${engine.version} (requested ${info?.requested}${info?.fallback ? `, FELL BACK: ${info.error}` : ''})`);
  console.log(`policies: prompt=${engine.llmPrompt?.id ?? '-'} reputation=${Boolean(engine.reputation)} feeds=${Boolean(engine.feeds)} guardian=${Boolean(engine.guardian)} seeds=${Boolean(engine.curatedIndicators)}`);
  let failed = info?.fallback && process.env.AABO_ENGINE_REQUIRED === '1';
  for (const c of CASES) {
    const v = normalizeVerdict(await engine.analyze(c.input, {}), c.input, { id: engine.id, version: engine.version });
    const ok = (!c.min || levelAtLeast(v.level, c.min)) && (!c.max || levelAtLeast(c.max, v.level));
    if (!ok) failed = true;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.name}: ${v.level} ${v.score}`);
  }
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
