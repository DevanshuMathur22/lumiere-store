import 'server-only';
import { db } from '@/lib/db';
import { HttpError } from '@/lib/security';
export async function settleCapturedPayment(eventId: string, payment: { id: string; order_id: string; amount: number; currency: string; status: string }) {
  if (payment.status !== 'captured') throw new HttpError(409, 'Payment is not captured.');
  return db().$transaction(async tx => {
    const found = await tx.payment.findUnique({ where: { providerOrderId: payment.order_id } });
    if (!found) throw new HttpError(409, 'Payment order is not available for reconciliation yet.');
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${found.orderId} FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({ where: { id: found.orderId }, include: { payment: true, reservations: { orderBy: { variantId: 'asc' } } } });
    if (order.total !== payment.amount || order.currency !== payment.currency) throw new HttpError(409, 'Payment amount or currency does not match.');
    if (await tx.webhookEvent.findUnique({ where: { id: eventId } })) return { orderId: order.id, replay: true };
    if (order.payment?.status === 'CAPTURED') { if (order.payment.providerPaymentId !== payment.id) throw new HttpError(409, 'An additional payment requires reconciliation.'); await tx.webhookEvent.create({ data: { id: eventId, kind: 'payment.captured' } }); return { orderId: order.id, replay: true }; }
    if (order.status !== 'PENDING_PAYMENT' || !order.reservations.length || order.reservations.some(r => r.status !== 'HELD')) throw new HttpError(409, 'Order requires manual reconciliation.');
    for (const reservation of order.reservations) {
      await tx.$queryRaw`SELECT id FROM "InventoryBalance" WHERE "variantId" = ${reservation.variantId} AND "warehouseId" = ${reservation.warehouseId} FOR UPDATE`;
      const changed = await tx.inventoryBalance.updateMany({ where: { variantId: reservation.variantId, warehouseId: reservation.warehouseId, reserved: { gte: reservation.quantity }, onHand: { gte: reservation.quantity } }, data: { reserved: { decrement: reservation.quantity }, onHand: { decrement: reservation.quantity } } });
      if (changed.count !== 1) throw new HttpError(409, 'Inventory needs reconciliation.');
      await tx.inventoryMovement.create({ data: { variantId: reservation.variantId, warehouseId: reservation.warehouseId, delta: -reservation.quantity, reason: 'SALE', reference: order.id } });
    }
    await tx.inventoryReservation.updateMany({ where: { orderId: order.id, status: 'HELD' }, data: { status: 'COMMITTED' } });
    await tx.payment.update({ where: { orderId: order.id }, data: { status: 'CAPTURED', providerPaymentId: payment.id, capturedAt: new Date() } });
    await tx.order.update({ where: { id: order.id }, data: { status: 'CONFIRMED' } });
    await tx.webhookEvent.create({ data: { id: eventId, kind: 'payment.captured' } });
    await tx.auditLog.create({ data: { actorId: 'razorpay', action: 'payment.captured', entityId: order.id } });
    return { orderId: order.id, replay: false };
  });
}
