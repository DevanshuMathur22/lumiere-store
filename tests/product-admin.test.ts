import { describe, expect, it } from 'vitest';
import {
  createProductSchema,
  updateProductSchema,
  archiveProductSchema
} from '../src/modules/catalog/admin-schema';

const valid = {
  name: 'Studio Vase',
  slug: 'studio-vase',
  description: 'A handcrafted ceramic studio vase.',
  material: 'Stoneware',
  image: '/images/vase.jpg',
  categorySlug: 'ceramics',
  sku: 'LUM-STUDIO-001',
  variantName: 'Standard',
  price: 349000,
  active: false,
  featured: false
};

describe('admin product validation', () => {
  it('accepts a valid product', () => {
    expect(createProductSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid prices', () => {
    expect(createProductSchema.safeParse({
      ...valid, price: -1
    }).success).toBe(false);
  });

  it('rejects unsafe slugs', () => {
    expect(createProductSchema.safeParse({
      ...valid, slug: '../admin'
    }).success).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(createProductSchema.safeParse({
      ...valid, isAdmin: true
    }).success).toBe(false);
  });

  it('requires variant ID for price updates', () => {
    expect(updateProductSchema.safeParse({
      id: 'p1', price: 300000
    }).success).toBe(false);
  });

  it('accepts archival identifiers', () => {
    expect(archiveProductSchema.safeParse({
      id: 'p1'
    }).success).toBe(true);
  });
});
