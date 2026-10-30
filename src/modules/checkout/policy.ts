import { z } from 'zod';
export const addressSchema = z.object({ name: z.string().trim().min(2).max(100), line1: z.string().trim().min(5).max(200), city: z.string().trim().min(2).max(80), state: z.string().trim().min(2).max(80), postalCode: z.string().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit PIN code'), phone: z.string().regex(/^[6-9][0-9]{9}$/, 'Enter a valid 10-digit mobile number'), country: z.literal('IN').default('IN') });
export const checkoutSchema = z.object({ items: z.array(z.object({ variantId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(10) })).min(1).max(40).refine(items => new Set(items.map(i => i.variantId)).size === items.length, 'Duplicate variants are not allowed'), address: addressSchema, idempotencyKey: z.string().uuid() });
export function totals(items: { price: number; quantity: number }[]) {
  if (!items.length || items.some(i => !Number.isSafeInteger(i.price) || i.price < 0 || !Number.isSafeInteger(i.quantity) || i.quantity < 1 || i.quantity > 10)) throw new Error('Invalid order lines');
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  if (!Number.isSafeInteger(subtotal) || subtotal > 100000000) throw new Error('Order exceeds supported amount');
  const shipping = subtotal >= 1000000 ? 0 : 49000;
  return { subtotal, shipping, total: subtotal + shipping };
}
