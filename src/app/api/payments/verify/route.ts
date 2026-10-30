import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser, sameOrigin, readJson, errorResponse, HttpError } from '@/lib/security';
import { verifySignature } from '@/modules/payments/signature';
import { razorpay } from '@/modules/payments/razorpay';
import { settleCapturedPayment } from '@/modules/payments/settle';
const schema = z.object({ orderId: z.string().min(1), razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/), razorpay_signature: z.string() });
export async function POST(request: Request) { try { sameOrigin(request); const user = await requireUser(); const input = schema.parse(await readJson(request)); const order = await db().order.findFirst({ where: { id: input.orderId, userId: user.id }, include: { payment: true } }); if (!order?.payment?.providerOrderId) throw new HttpError(404, 'Order not found.'); if (!verifySignature(`${order.payment.providerOrderId}|${input.razorpay_payment_id}`, input.razorpay_signature, process.env.RAZORPAY_KEY_SECRET || '')) throw new HttpError(401, 'Invalid payment signature.'); const payment = await razorpay<{ id: string; order_id: string; amount: number; currency: string; status: string }>(`payments/${input.razorpay_payment_id}`); if (payment.order_id !== order.payment.providerOrderId || payment.id !== input.razorpay_payment_id) throw new HttpError(409, 'Payment does not match this order.'); return Response.json(await settleCapturedPayment(`verify:${payment.id}`, payment)); } catch (e) { return errorResponse(e); } }
