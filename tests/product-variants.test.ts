import { describe, expect, it } from 'vitest';
import {
  availableStock,
  canAddToCart,
  formatVariantPrice,
  productSlugSchema
} from '../src/modules/catalog/variant-policy';

describe('product variant policy', () => {
  it('calculates available stock', () => {
    expect(availableStock([
      { onHand: 12, reserved: 4 },
      { onHand: 6, reserved: 2 }
    ])).toBe(12);
  });

  it('prevents negative available stock', () => {
    expect(availableStock([
      { onHand: 2, reserved: 5 }
    ])).toBe(0);
  });

  it('rejects insufficient stock', () => {
    expect(canAddToCart(3, 4)).toBe(false);
  });

  it('rejects invalid quantities', () => {
    expect(canAddToCart(10, 0)).toBe(false);
    expect(canAddToCart(10, -1)).toBe(false);
    expect(canAddToCart(10, 1.5)).toBe(false);
  });

  it('accepts valid quantity', () => {
    expect(canAddToCart(5, 3)).toBe(true);
  });

  it('validates slugs', () => {
    expect(productSlugSchema.safeParse('studio-vase').success)
      .toBe(true);
    expect(productSlugSchema.safeParse('../admin').success)
      .toBe(false);
  });

  it('formats INR', () => {
    expect(formatVariantPrice(349000)).toContain('3,490');
  });
});
