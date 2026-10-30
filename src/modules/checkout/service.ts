import 'server-only';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { checkoutSchema, totals } from './policy';
import { HttpError } from '@/lib/security';
import { razorpay } from '@/modules/payments/razorpay';
export async function prepareCheckout(userId: string, input: unknown) {
  if (process.env.PAYMENTS_ENABLED !== 'true' || !process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') || !process.env.RAZORPAY_KEY_SECRET) throw new HttpError(503, 'Checkout is in preview mode. Test payments have not been enabled.');
  const data = checkoutSchema.parse(input);
  data.items.sort((a, b) => a.variantId.localeCompare(b.variantId));
  const requestHash = createHash('sha256').update(JSON.stringify({ items: data.items, address: data.address })).digest('hex');
  const result = await db().$transaction(async tx => {
    // Per-customer lock serializes retry keys and concurrent checkout requests.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const previous = await tx.order.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: data.idempotencyKey } }, include: { payment: true } });
    if (previous) { if (previous.requestHash !== requestHash) throw new HttpError(409, 'This checkout key was already used for different details.'); return { order: previous, created: false }; }
    const variants = await tx.productVariant.findMany({ where: { id: { in: data.items.map(i => i.variantId) }, product: { active: true }, currency: 'INR' }, include: { product: true } });
    if (variants.length !== data.items.length) throw new HttpError(409, 'An item is no longer available.');
    const lines = data.items.map(i => { const v = variants.find(v => v.id === i.variantId)!; return { ...i, price: v.price, productName: v.product.name, variantName: v.name, sku: v.sku }; });
    const amount = totals(lines);
    const order = await tx.order.create({ data: { userId, idempotencyKey: data.idempotencyKey, requestHash, ...amount, address: data.address, items: { create: lines.map(i => ({ variantId: i.variantId, quantity: i.quantity, unitPrice: i.price, productName: i.productName, variantName: i.variantName, sku: i.sku })) }, payment: { create: { amount: amount.total } } }, include: { payment: true } });
    for (const line of lines) {
      await tx.$queryRaw`SELECT id FROM "InventoryBalance" WHERE "variantId" = ${line.variantId} ORDER BY id FOR UPDATE`;
      const balance = (await tx.inventoryBalance.findMany({ where: { variantId: line.variantId }, orderBy: { id: 'asc' } })).find(b => b.onHand - b.reserved >= line.quantity);
      if (!balance) throw new HttpError(409, `${line.productName} does not have enough stock at one warehouse.`);
      await tx.inventoryBalance.update({ where: { id: balance.id }, data: { reserved: { increment: line.quantity } } });
      await tx.inventoryReservation.create({ data: { orderId: order.id, variantId: line.variantId, warehouseId: balance.warehouseId, quantity: line.quantity, reviewAfter: new Date(Date.now() + 30 * 60 * 1000) } });
    }
    return { order, created: true };
  });
  if (!result.created) { if (result.order.payment?.status === 'CAPTURED') throw new HttpError(409, 'This order is already paid.'); if (!result.order.payment?.providerOrderId) throw new HttpError(409, 'This checkout is still being reconciled. Please do not start another payment.'); return { orderId: result.order.id, providerOrderId: result.order.payment.providerOrderId, amount: result.order.total, key: process.env.RAZORPAY_KEY_ID }; }
  try {
    const provider = await razorpay<{ id: string; amount: number; currency: string }>('orders', { amount: result.order.total, currency: 'INR', receipt: result.order.id });
    if (!provider.id || provider.amount !== result.order.total || provider.currency !== 'INR') throw new Error('Provider order mismatch');
    await db().payment.update({ where: { orderId: result.order.id }, data: { providerOrderId: provider.id, status: 'PENDING' } });
    return { orderId: result.order.id, providerOrderId: provider.id, amount: result.order.total, key: process.env.RAZORPAY_KEY_ID };
  } catch (error) {
    // A network error does not prove that the remote order was not created.
    // Retain the reservation and never automatically retry remote creation.
    await db().payment.update({ where: { orderId: result.order.id }, data: { status: 'NEEDS_REVIEW' } });
    throw error;
  }
}
