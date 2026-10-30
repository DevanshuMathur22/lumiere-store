import 'server-only';
import { HttpError } from '@/lib/security';
export async function razorpay<T>(path: string, body?: unknown): Promise<T> {
  const key = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (process.env.PAYMENTS_ENABLED !== 'true' || !key?.startsWith('rzp_test_') || !secret) throw new HttpError(503, 'Test payments are not configured. No charge has been made.');
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new HttpError(502, 'Payment provider could not complete the request.');
  return response.json() as Promise<T>;
}
