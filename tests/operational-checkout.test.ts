import { describe, expect, it } from 'vitest';
import {
  checkCheckoutAvailability,
  checkoutLinesSchema
} from '../src/modules/checkout/readiness';
import {
  canReserve,
  inventorySummary
} from '../src/modules/inventory/integrity';

const snapshot = {
  variantId: 'sku-a',
  price: 149900,
  currency: 'INR',
  available: 3,
  active: true
};

describe('operational commerce integration policies', () => {
  it('accepts a valid checkout', () => {
    const lines = [{ variantId: 'sku-a', quantity: 2 }];
    expect(checkoutLinesSchema.safeParse(lines).success).toBe(true);
    expect(checkCheckoutAvailability(lines, [snapshot]))
      .toEqual([]);
  });

  it('detects changed stock before checkout', () => {
    const lines = [{ variantId: 'sku-a', quantity: 3 }];
    expect(checkCheckoutAvailability(
      lines, [{ ...snapshot, available: 2 }]
    )[0].code).toBe('STOCK');
  });

  it('rejects discontinued products', () => {
    expect(checkCheckoutAvailability(
      [{ variantId: 'sku-a', quantity: 1 }],
      [{ ...snapshot, active: false }]
    )[0].code).toBe('INACTIVE');
  });

  it('rejects unsupported currency', () => {
    expect(checkCheckoutAvailability(
      [{ variantId: 'sku-a', quantity: 1 }],
      [{ ...snapshot, currency: 'USD' }]
    )[0].code).toBe('CURRENCY');
  });

  it('does not reserve beyond availability', () => {
    expect(canReserve({
      onHand: 8, reserved: 6, reorderPoint: 2
    }, 3)).toBe(false);
  });

  it('allows exact available quantity', () => {
    expect(canReserve({
      onHand: 8, reserved: 6, reorderPoint: 2
    }, 2)).toBe(true);
  });

  it('detects corrupted inventory balances', () => {
    expect(inventorySummary({
      onHand: 2, reserved: 4, reorderPoint: 5
    }).valid).toBe(false);
  });

  it('rejects duplicate checkout variants', () => {
    expect(checkoutLinesSchema.safeParse([
      { variantId: 'sku-a', quantity: 1 },
      { variantId: 'sku-a', quantity: 2 }
    ]).success).toBe(false);
  });
});
