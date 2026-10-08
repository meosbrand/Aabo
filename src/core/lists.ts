/**
 * @fileoverview Small public lists used by the shell (safe link unshortening) and the community engine.
 */

/** URL shorteners hide the real destination. */
export const SHORTENERS = new Set([
  'bit.ly', 'bitly.com', 'tinyurl.com', 't.co', 'goo.gl', 'cutt.ly', 'rb.gy', 'is.gd', 'ow.ly', 'shorturl.at',
  'tiny.cc', 's.id', 'rebrand.ly', 't.ly', 'v.gd', 'buff.ly', 'short.io', 'bl.ink', 'wa.link', 'surl.li', 'x.gd',
]);

/**
 * Multi-tenant hosting and link services: anyone can publish under these domains, so a report or
 * a feed entry says something about one URL, never about the whole domain.
 */
export const SHARED_HOSTS = new Set([
  'web.app',
  'firebaseapp.com',
  'vercel.app',
  'netlify.app',
  'github.io',
  'pages.dev',
  'workers.dev',
  'herokuapp.com',
  'onrender.com',
  'glitch.me',
  'repl.co',
  'replit.app',
  'blogspot.com',
  'wordpress.com',
  'wixsite.com',
  'weebly.com',
  'webflow.io',
  'carrd.co',
  'square.site',
  'godaddysites.com',
  '000webhostapp.com',
  'ngrok.io',
  'ngrok-free.app',
  'linktr.ee',
  'wa.me',
  't.me',
  'forms.gle',
  'google.com',
  'docs.google.com',
  'sites.google.com',
  'drive.google.com',
  'dropbox.com',
  'notion.site',
  'typeform.com',
  'jotform.com',
]);

/** True for domains where only exact URLs, never the whole domain, may be judged. */
export function isSharedPlatform(domain: string): boolean {
  return SHORTENERS.has(domain) || SHARED_HOSTS.has(domain);
}
