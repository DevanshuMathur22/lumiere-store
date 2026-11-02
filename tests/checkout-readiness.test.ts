import { describe, expect, it } from 'vitest';
import {
  checkoutLinesSchema,
  checkCheckoutAvailability,
  checkoutEnvironment
} from '../src/modules/checkout/readiness';

const stock = [{
  variantId: 'v1',
  price: 349000,
  available: 5,
  active: true,
  currency: 'INR'
}];

describe('checkout readiness policy', () => {
  it('accepts valid cart lines', () => {
    expect(checkoutLinesSchema.safeParse([
      { variantId: 'v1', quantity: 2 }
    ]).success).toBe(true);
  });

  it('rejects duplicate variants', () => {
    expect(checkoutLinesSchema.safeParse([
      { variantId: 'v1', quantity: 1 },
      { variantId: 'v1', quantity: 2 }
    ]).success).toBe(false);
  });

  it('rejects excessive quantities', () => {
    expect(checkoutLinesSchema.safeParse([
      { variantId: 'v1', quantity: 11 }
    ]).success).toBe(false);
  });

  it('accepts sufficient stock', () => {
    expect(checkCheckoutAvailability([
      { variantId: 'v1', quantity: 3 }
    ], stock)).toEqual([]);
  });

  it('detects insufficient stock', () => {
    expect(checkCheckoutAvailability([
      { variantId: 'v1', quantity: 6 }
    ], stock)[0].code).toBe('STOCK');
  });

  it('detects missing variants', () => {
    expect(checkCheckoutAvailability([
      { variantId: 'missing', quantity: 1 }
    ], stock)[0].code).toBe('MISSING');
  });

  it('blocks inactive variants', () => {
    expect(checkCheckoutAvailability([
      { variantId: 'v1', quantity: 1 }
    ], [{ ...stock[0], active: false }])[0].code)
      .toBe('INACTIVE');
  });

  it('blocks invalid currency', () => {
    expect(checkCheckoutAvailability([
      { variantId: 'v1', quantity: 1 }
    ], [{ ...stock[0], currency: 'USD' }])[0].code)
      .toBe('CURRENCY');
  });

  it('does not enable checkout without credentials', () => {
    expect(checkoutEnvironment({}).testPayments).toBe(false);
  });

  it('never treats live keys as test credentials', () => {
    expect(checkoutEnvironment({
      DATABASE_URL: 'configured',
      AUTH_SECRET: 'configured',
      AUTH_GOOGLE_ID: 'configured',
      AUTH_GOOGLE_SECRET: 'configured',
      PAYMENTS_ENABLED: 'true',
      RAZORPAY_KEY_ID: 'rzp_live_example',
      RAZORPAY_KEY_SECRET: 'configured'
    }).testPayments).toBe(false);
  });
});
