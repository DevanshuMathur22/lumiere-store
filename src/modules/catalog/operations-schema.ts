import { z } from 'zod';

const code = z.string().trim().min(2).max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);

const slug = z.string().trim().min(2).max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const catalogOperationSchema = z.discriminatedUnion(
  'action', [
    z.object({
      action: z.literal('category.create'),
      name: z.string().trim().min(2).max(100),
      slug
    }).strict(),
    z.object({
      action: z.literal('category.rename'),
      id: z.string().min(1),
      name: z.string().trim().min(2).max(100)
    }).strict(),
    z.object({
      action: z.literal('variant.create'),
      productId: z.string().min(1),
      sku: code,
      name: z.string().trim().min(1).max(100),
      price: z.number().int().min(1).max(100000000)
    }).strict(),
    z.object({
      action: z.literal('variant.update'),
      variantId: z.string().min(1),
      name: z.string().trim().min(1).max(100),
      price: z.number().int().min(1).max(100000000)
    }).strict()
  ]
);

export const warehouseOperationSchema = z.discriminatedUnion(
  'action', [
    z.object({
      action: z.literal('warehouse.create'),
      name: z.string().trim().min(2).max(120),
      code
    }).strict(),
    z.object({
      action: z.literal('balance.create'),
      variantId: z.string().min(1),
      warehouseId: z.string().min(1),
      reorderPoint: z.number().int().min(0).max(100000)
    }).strict()
  ]
);
