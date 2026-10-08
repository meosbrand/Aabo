/** Defang a URL for display so it can't be tapped by accident: https://a.b → hxxps://a[.]b */
export function defang(url: string): string {
  return url.replace(/^http/i, 'hxxp').replace(/\./g, '[.]');
}
