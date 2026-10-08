/**
 * @fileoverview Better Auth configuration (email + password, optional Google).
 * New users get their own SME workspace (Organization) so team features work immediately.
 */

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from './db';

const adminEmails = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
    : undefined;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: (process.env.DATABASE_URL ?? '').startsWith('postgres') ? 'postgresql' : 'sqlite',
  }),
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
  socialProviders: google,
  rateLimit: { enabled: true, window: 60, max: 30 },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const isAdmin = adminEmails.includes(user.email.toLowerCase());
          await prisma.user.update({ where: { id: user.id }, data: { role: isAdmin ? 'admin' : 'user' } });
          const org = await prisma.organization.create({ data: { name: `${user.name || 'My'}'s business` } });
          await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role: 'owner' } });
        },
      },
    },
  },
  plugins: [nextCookies()],
});
