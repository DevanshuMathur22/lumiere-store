import { db } from '@/lib/db';
import {
  requirePermission, sameOrigin,
  readJson, errorResponse, HttpError
} from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';
import { warehouseOperationSchema } from
  '@/modules/catalog/operations-schema';

export async function GET() {
  try {
    await requirePermission('inventory.read');
    const [warehouses, products] = await Promise.all([
      db().warehouse.findMany({
        include: { balances: true },
        orderBy: { code: 'asc' }
      }),
      db().product.findMany({
        include: { variants: true },
        orderBy: { name: 'asc' },
        take: 200
      })
    ]);
    return Response.json({ warehouses, products });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const actor = await requirePermission('inventory.adjust');
    await rateLimit(actor.id, 'warehouse-ops', 30);
    const input = warehouseOperationSchema.parse(await readJson(request));

    const result = await db().$transaction(async tx => {
      if (input.action === 'warehouse.create') {
        const warehouse = await tx.warehouse.create({
          data: { name: input.name, code: input.code }
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: input.action,
            entityId: warehouse.id
          }
        });
        return warehouse;
      }

      const [variant, warehouse] = await Promise.all([
        tx.productVariant.findUnique({
          where: { id: input.variantId }
        }),
        tx.warehouse.findUnique({
          where: { id: input.warehouseId }
        })
      ]);

      if (!variant || !warehouse)
        throw new HttpError(404, 'Variant or warehouse not found.');

      const existing = await tx.inventoryBalance.findUnique({
        where: {
          variantId_warehouseId: {
            variantId: input.variantId,
            warehouseId: input.warehouseId
          }
        }
      });
      if (existing)
        throw new HttpError(409, 'Inventory balance already exists.');

      const balance = await tx.inventoryBalance.create({
        data: {
          variantId: input.variantId,
          warehouseId: input.warehouseId,
          onHand: 0,
          reserved: 0,
          reorderPoint: input.reorderPoint
        }
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: input.action,
          entityId: balance.id,
          metadata: {
            variantId: input.variantId,
            warehouseId: input.warehouseId
          }
        }
      });
      return balance;
    });

    return Response.json({ ok: true, result });
  } catch (error) {
    return errorResponse(error);
  }
}
