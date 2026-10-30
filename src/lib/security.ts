import 'server-only';
import { auth, authConfigured } from '@/lib/auth';
import { db } from '@/lib/db';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function requireUser() { if (!authConfigured) throw new HttpError(503, 'Sign-in is not configured yet.'); const session = await auth(); if (!session?.user?.id) throw new HttpError(401, 'Please sign in to continue.'); return { ...session.user, id: session.user.id }; }
export async function requirePermission(key: string) { const user = await requireUser(); const grant = await db().userRole.findFirst({ where: { userId: user.id, role: { permissions: { some: { permission: { key } } } } } }); if (!grant) throw new HttpError(403, 'You do not have access to this action.'); return user; }
export function sameOrigin(request: Request) { const expected = process.env.APP_ORIGIN; if (!expected || request.headers.get('origin') !== new URL(expected).origin) throw new HttpError(403, 'Invalid request origin.'); }
export function errorResponse(error: unknown) { if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status }); if (error instanceof Error && error.name === 'ZodError') return Response.json({ error: 'Please check the submitted information.' }, { status: 400 }); console.error('Request failed', error instanceof Error ? error.name : 'UnknownError'); return Response.json({ error: 'Unable to complete the request. Please try again.' }, { status: 500 }); }
export async function readJson(request: Request) { const raw = await request.text(); if (raw.length > 32768) throw new HttpError(413, 'Request is too large.'); try { return JSON.parse(raw); } catch { throw new HttpError(400, 'Invalid JSON.'); } }
