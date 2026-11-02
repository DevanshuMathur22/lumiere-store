import { db } from '@/lib/db';
import {
  requirePermission, sameOrigin, readJson,
  errorResponse, HttpError
} from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';
import {
  createProductSchema, updateProductSchema,
  archiveProductSchema
} from '@/modules/catalog/admin-schema';

export async function GET() {
  try {
    await requirePermission('products.read');
    const [products, categories] = await Promise.all([
      db().product.findMany({
        include: {
          category: true,
          variants: { orderBy: { sku: 'asc' } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      db().category.findMany({ orderBy: { name: 'asc' } })
    ]);
    return Response.json({ products, categories });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requirePermission('products.write');
    await rateLimit(user.id, 'products');
    const input = createProductSchema.parse(await readJson(request));

    const result = await db().$transaction(async tx => {
      const category = await tx.category.findUnique({
        where: { slug: input.categorySlug }
      });
      if (!category) throw new HttpError(404, 'Category not found.');

      const product = await tx.product.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          material: input.material,
          image: input.image,
          active: input.active,
          featured: input.featured,
          categoryId: category.id,
          variants: {
            create: {
              sku: input.sku,
              name: input.variantName,
              price: input.price,
              currency: 'INR'
            }
          }
        },
        include: { variants: true }
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'product.create',
          entityId: product.id,
          metadata: { sku: input.sku }
        }
      });
      return product;
    });

    return Response.json({ product: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const user = await requirePermission('products.write');
    await rateLimit(user.id, 'products');
    const input = updateProductSchema.parse(await readJson(request));

    const result = await db().$transaction(async tx => {
      const existing = await tx.product.findUnique({
        where: { id: input.id }
      });
      if (!existing) throw new HttpError(404, 'Product not found.');
      if (existing.sellerId !== null)
        throw new HttpError(403, 'Seller products require dedicated review.');

      const category = input.categorySlug
        ? await tx.category.findUnique({
            where: { slug: input.categorySlug }
          })
        : null;
      if (input.categorySlug && !category)
        throw new HttpError(404, 'Category not found.');

      if (input.variantId) {
        const variant = await tx.productVariant.findUnique({
          where: { id: input.variantId }
        });
        if (!variant || variant.productId !== input.id)
          throw new HttpError(404, 'Variant not found.');
      }

      const updated = await tx.product.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.slug !== undefined && { slug: input.slug }),
          ...(input.description !== undefined && {
            description: input.description
          }),
          ...(input.material !== undefined && {
            material: input.material
          }),
          ...(input.image !== undefined && { image: input.image }),
          ...(input.active !== undefined && { active: input.active }),
          ...(input.featured !== undefined && {
            featured: input.featured
          }),
          ...(category && { categoryId: category.id })
        }
      });

      if (input.variantId &&
          (input.price !== undefined ||
           input.variantName !== undefined)) {
        await tx.productVariant.update({
          where: { id: input.variantId },
          data: {
            ...(input.price !== undefined && { price: input.price }),
            ...(input.variantName !== undefined && {
              name: input.variantName
            })
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'product.update',
          entityId: input.id,
          metadata: {
            fields: Object.keys(input).filter(k => k !== 'id')
          }
        }
      });
      return updated;
    });

    return Response.json({ product: result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const user = await requirePermission('products.write');
    await rateLimit(user.id, 'products');
    const { id } = archiveProductSchema.parse(await readJson(request));

    await db().$transaction(async tx => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) throw new HttpError(404, 'Product not found.');
      await tx.product.update({
        where: { id },
        data: { active: false }
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'product.archive',
          entityId: id
        }
      });
    });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
