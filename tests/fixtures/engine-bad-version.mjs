// Test fixture: an engine module built for a different contract version.
export const apiVersion = 99;

export function createEngine() {
  return { id: 'future', version: '9.0.0', apiVersion: 99, analyze: async () => null };
}
