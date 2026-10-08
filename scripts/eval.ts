/**
 * Prints the loaded engine's confusion matrix and misses on the labelled sample set.
 * Offline (no network, no LLM): `npm run eval`. Add `--verbose` for every row.
 */
import 'dotenv/config';
import { evaluate } from '../src/core/evaluate';
import { COMMUNITY_SAMPLES } from '../src/engines/community/samples';
import { loadEngine } from '../src/server/engine-loader';

async function main() {
  process.env.INTEL_NETWORK_LOOKUPS = '0';
  const verbose = process.argv.includes('--verbose');
  const engine = await loadEngine();
  const r = await evaluate(engine, COMMUNITY_SAMPLES);
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  console.log(`\nÀàbò engine evaluation (${engine.id} ${engine.version}) — ${r.scams} scam / ${r.hams} legitimate samples\n`);
  console.log('             SAFE  SUSPICIOUS  LIKELY_SCAM  DANGEROUS');
  for (const label of ['scam', 'ham'] as const) {
    const c = r.confusion[label];
    console.log(`${label.padEnd(10)} ${String(c.SAFE).padStart(6)} ${String(c.SUSPICIOUS).padStart(11)} ${String(c.LIKELY_SCAM).padStart(12)} ${String(c.DANGEROUS).padStart(10)}`);
  }
  console.log(`\nRecall (≥ SUSPICIOUS):        ${pct(r.recall)}`);
  console.log(`Strict recall (≥ LIKELY_SCAM): ${pct(r.strictRecall)}`);
  console.log(`False positives (ham ≥ LIKELY_SCAM): ${pct(r.falsePositiveRate)}`);
  console.log(`Soft alarms (ham = SUSPICIOUS):      ${pct(r.softAlarmRate)}\n`);

  const misses = r.rows.filter((row) => !row.ok);
  if (misses.length) console.log(`Issues (${misses.length}):`);
  for (const row of verbose ? r.rows : misses) {
    const tag = row.ok ? 'ok  ' : 'MISS';
    console.log(`${tag} [${row.sample.label}] ${row.verdict.level} ${row.verdict.score} ${row.verdict.category ?? '-'} :: ${row.sample.text.slice(0, 90).replace(/\n/g, ' ')}`);
    if (!row.ok) console.log(`      → ${row.problem}; signals: ${row.verdict.reasons.map((x) => `${x.id}(${x.weight})`).join(', ')}`);
  }
}

main();
