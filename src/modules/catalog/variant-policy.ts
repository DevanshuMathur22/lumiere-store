import { z } from 'zod';

export const productSlugSchema = z.string()
  .min(2).max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export type VariantStock = {
  onHand: number;
  reserved: number;
};

export function availableStock(balances: VariantStock[]): number {
  return balances.reduce(
    (sum, b) => sum + Math.max(0, b.onHand - b.reserved),
    0
  );
}

export function canAddToCart(stock: number, quantity: number): boolean {
  return Number.isSafeInteger(quantity)
    && quantity > 0
    && Number.isSafeInteger(stock)
    && stock >= quantity;
}

export function formatVariantPrice(price: number): string {
  if (!Number.isSafeInteger(price) || price < 0)
    throw new Error('Invalid price.');

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(price / 100);
}
