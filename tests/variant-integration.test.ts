import { describe, expect, it } from 'vitest';
import { sampleProducts } from
  '../src/modules/catalog/sample';
import {
  productVariants,
  resolveVariant
} from '../src/modules/catalog/variant-resolver';

const product = {
  ...sampleProducts[0],
  variants: [
    {
      id: 'small-id',
      sku: 'SMALL-001',
      name: 'Small',
      price: 200000,
      stock: 8
    },
    {
      id: 'large-id',
      sku: 'LARGE-001',
      name: 'Large',
      price: 400000,
      stock: 2
    },
    {
      id: 'sold-out-id',
      sku: 'SOLD-001',
      name: 'Special',
      price: 600000,
      stock: 0
    }
  ]
};

describe('variant-aware cart integration', () => {
  it('loads all available variants', () => {
    expect(productVariants(product)).toHaveLength(3);
  });

  it('resolves selected SKU', () => {
    expect(resolveVariant([product], 'large-id')?.sku)
      .toBe('LARGE-001');
  });

  it('resolves selected price', () => {
    expect(resolveVariant([product], 'large-id')?.price)
      .toBe(400000);
  });

  it('resolves selected stock', () => {
    expect(resolveVariant([product], 'large-id')?.stock)
      .toBe(2);
  });

  it('keeps sold out variants unavailable', () => {
    expect(resolveVariant([product], 'sold-out-id')?.stock)
      .toBe(0);
  });

  it('rejects unknown variant IDs', () => {
    expect(resolveVariant([product], 'invalid'))
      .toBeUndefined();
  });

  it('preserves demo products', () => {
    const variants = productVariants(sampleProducts[0]);
    expect(variants[0].id).toBe(sampleProducts[0].id);
  });
});
