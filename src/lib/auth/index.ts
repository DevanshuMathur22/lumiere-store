import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';
export const authConfigured = Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: process.env.DATABASE_URL ? PrismaAdapter(db()) : undefined,
  providers: authConfigured ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })] : [],
  session: { strategy: 'database' },
  pages: { signIn: '/login' },
  callbacks: { session({ session, user }) { session.user.id = user.id; return session; } },
});
