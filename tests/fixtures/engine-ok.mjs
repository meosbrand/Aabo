// Test fixture: a minimal engine module loaded by path.
export const apiVersion = 1;

export function createEngine() {
  return {
    id: 'fixture',
    version: '1.2.3',
    apiVersion: 1,
    async analyze(input) {
      return {
        level: 'SAFE',
        score: 1,
        category: 'malware',
        reasons: [{ id: 'secret.rule', weight: 0.42, floor: 'DANGEROUS', source: 'rule', text: { en: 'Fixture signal', pidgin: 'Fixture signal' } }],
        actions: [],
        summary: { en: '', pidgin: '' },
        indicators: { urls: [], domains: [], phones: [], accounts: [], emails: [], wallets: [] },
        usedLlm: false,
        fingerprint: 'fp-secret',
        contentHash: 'whatever',
        text: input.text,
      };
    },
  };
}
