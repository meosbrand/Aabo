/**
 * @fileoverview Small public lists used by the shell (safe link unshortening) and the community engine.
 */

/** URL shorteners hide the real destination. */
export const SHORTENERS = new Set([
  'bit.ly', 'bitly.com', 'tinyurl.com', 't.co', 'goo.gl', 'cutt.ly', 'rb.gy', 'is.gd', 'ow.ly', 'shorturl.at',
  'tiny.cc', 's.id', 'rebrand.ly', 't.ly', 'v.gd', 'buff.ly', 'short.io', 'bl.ink', 'wa.link', 'surl.li', 'x.gd',
]);
