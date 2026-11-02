import { db } from '@/lib/db';
import {
  requirePermission, errorResponse
} from '@/lib/security';
import {
  inventorySummary
} from '@/modules/inventory/integrity';

export async function GET() {
  try {
    await requirePermission('inventory.read');

    const balances = await db().inventoryBalance.findMany({
      include: {
        variant: {
          select: {
            sku: true,
            product: { select: { name: true } }
          }
        },
        warehouse: {
          select: {
            code: true,
            name: true
          }
        }
      },
      orderBy: { id: 'asc' },
      take: 1000
    });

    const reviewed = balances.map(b => {
      const summary = inventorySummary({
        onHand: b.onHand,
        reserved: b.reserved,
        reorderPoint: b.reorderPoint
      });

      return {
        balanceId: b.id,
        sku: b.variant.sku,
        product: b.variant.product.name,
        warehouse: b.warehouse.code,
        onHand: b.onHand,
        reserved: b.reserved,
        reorderPoint: b.reorderPoint,
        ...summary
      };
    });

    return Response.json({
      inspected: reviewed.length,
      limited: reviewed.length === 1000,
      invalid: reviewed.filter(b => !b.valid),
      lowStock: reviewed.filter(b => b.valid && b.lowStock),
      summary: {
        invalidCount: reviewed.filter(b => !b.valid).length,
        lowStockCount: reviewed.filter(
          b => b.valid && b.lowStock
        ).length
      },
      readOnly: true
    });
  } catch (error) {
    return errorResponse(error);
  }
}
