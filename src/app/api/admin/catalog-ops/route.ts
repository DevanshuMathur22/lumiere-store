import { db } from '@/lib/db';
import {
  requirePermission, sameOrigin,
  readJson, errorResponse, HttpError
} from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';
import { catalogOperationSchema } from
  '@/modules/catalog/operations-schema';

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const actor = await requirePermission('products.write');
    await rateLimit(actor.id, 'catalog-ops', 30);
    const input = catalogOperationSchema.parse(await readJson(request));

    const result = await db().$transaction(async tx => {
      if (input.action === 'category.create') {
        const category = await tx.category.create({
          data: { name: input.name, slug: input.slug }
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: input.action,
            entityId: category.id
          }
        });
        return category;
      }

      if (input.action === 'category.rename') {
        const existing = await tx.category.findUnique({
          where: { id: input.id }
        });
        if (!existing) throw new HttpError(404, 'Category not found.');

        const category = await tx.category.update({
          where: { id: input.id },
          data: { name: input.name }
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: input.action,
            entityId: category.id
          }
        });
        return category;
      }

      if (input.action === 'variant.create') {
        const product = await tx.product.findUnique({
          where: { id: input.productId }
        });
        if (!product) throw new HttpError(404, 'Product not found.');

        const variant = await tx.productVariant.create({
          data: {
            productId: input.productId,
            sku: input.sku,
            name: input.name,
            price: input.price,
            currency: 'INR'
          }
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: input.action,
            entityId: variant.id,
            metadata: {
              productId: input.productId,
              sku: input.sku
            }
          }
        });
        return variant;
      }

      const variant = await tx.productVariant.findUnique({
        where: { id: input.variantId }
      });
      if (!variant) throw new HttpError(404, 'Variant not found.');

      const updated = await tx.productVariant.update({
        where: { id: input.variantId },
        data: { name: input.name, price: input.price }
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: input.action,
          entityId: updated.id,
          metadata: {
            oldPrice: variant.price,
            newPrice: input.price
          }
        }
      });
      return updated;
    });

    return Response.json({ ok: true, result });
  } catch (error) {
    return errorResponse(error);
  }
}
