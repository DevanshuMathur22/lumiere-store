import { z } from 'zod';

export const checkoutLineSchema = z.object({
  variantId: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(10)
}).strict();

export const checkoutLinesSchema = z.array(
  checkoutLineSchema
).min(1).max(40).refine(
  items => new Set(items.map(i => i.variantId)).size === items.length,
  'Duplicate variants are not allowed.'
);

export type CheckoutLine = z.infer<typeof checkoutLineSchema>;

export type StockSnapshot = {
  variantId: string;
  price: number;
  available: number;
  active: boolean;
  currency: string;
};

export type CheckoutIssue = {
  variantId: string;
  code: 'MISSING' | 'INACTIVE' | 'STOCK' | 'PRICE' | 'CURRENCY';
};

export function checkCheckoutAvailability(
  lines: CheckoutLine[],
  snapshots: StockSnapshot[]
): CheckoutIssue[] {
  const issues: CheckoutIssue[] = [];
  const byId = new Map(snapshots.map(s => [s.variantId, s]));

  for (const line of lines) {
    const item = byId.get(line.variantId);

    if (!item) {
      issues.push({ variantId: line.variantId, code: 'MISSING' });
      continue;
    }

    if (!item.active) {
      issues.push({ variantId: line.variantId, code: 'INACTIVE' });
      continue;
    }

    if (item.currency !== 'INR') {
      issues.push({ variantId: line.variantId, code: 'CURRENCY' });
      continue;
    }

    if (!Number.isSafeInteger(item.price) || item.price <= 0) {
      issues.push({ variantId: line.variantId, code: 'PRICE' });
      continue;
    }

    if (!Number.isSafeInteger(item.available) ||
        item.available < line.quantity) {
      issues.push({ variantId: line.variantId, code: 'STOCK' });
    }
  }

  return issues;
}

export function checkoutEnvironment(
  environment: Record<string, string | undefined>
) {
  const database = Boolean(environment.DATABASE_URL);
  const authentication = database &&
    Boolean(environment.AUTH_SECRET) &&
    Boolean(environment.AUTH_GOOGLE_ID) &&
    Boolean(environment.AUTH_GOOGLE_SECRET);

  const testPayments = authentication &&
    environment.PAYMENTS_ENABLED === 'true' &&
    Boolean(environment.RAZORPAY_KEY_ID?.startsWith('rzp_test_')) &&
    Boolean(environment.RAZORPAY_KEY_SECRET);

  return {
    database,
    authentication,
    testPayments,
    livePaymentsRequested: Boolean(
      environment.RAZORPAY_KEY_ID?.startsWith('rzp_live_')
    )
  };
}
