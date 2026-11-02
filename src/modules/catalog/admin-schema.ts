import { z } from 'zod';

const slug = z.string().trim().min(2).max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const base = z.object({
  name: z.string().trim().min(2).max(160),
  slug,
  description: z.string().trim().min(10).max(10000),
  material: z.string().trim().min(2).max(250),
  image: z.string().trim().min(1).max(500)
    .refine(v => v.startsWith('/images/') || /^https:\/\//.test(v)),
  categorySlug: slug,
  featured: z.boolean().default(false),
  active: z.boolean().default(false)
}).strict();

export const createProductSchema = base.extend({
  sku: z.string().trim().min(3).max(100)
    .regex(/^[A-Za-z0-9_-]+$/),
  variantName: z.string().trim().min(1).max(100),
  price: z.number().int().min(1).max(100000000)
});

export const updateProductSchema = base.partial()
  .extend({
    id: z.string().min(1).max(100),
    variantId: z.string().min(1).max(100).optional(),
    price: z.number().int().min(1).max(100000000).optional(),
    variantName: z.string().trim().min(1).max(100).optional()
  }).strict().refine(
    v => v.price === undefined ||
      v.variantId !== undefined,
    'Variant ID required when changing price.'
  );

export const archiveProductSchema = z.object({
  id: z.string().min(1).max(100)
}).strict();
