import { db } from '@/lib/db';
import {
  requireUser, sameOrigin, readJson, errorResponse,
  HttpError
} from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';
import {
  checkoutLinesSchema,
  checkCheckoutAvailability
} from '@/modules/checkout/readiness';

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    await rateLimit(user.id, 'checkout-availability', 20);

    if (!process.env.DATABASE_URL)
      throw new HttpError(503, 'Database is not configured.');

    const lines = checkoutLinesSchema.parse(
      await readJson(request)
    );

    const ids = lines.map(line => line.variantId);

    const variants = await db().productVariant.findMany({
      where: { id: { in: ids }, product: { OR: [
          { sellerId: null },
          {
            reviewStatus: 'APPROVED',
            seller: { is: { status: 'APPROVED' } }
          }
        ] } },
      select: {
        id: true,
        price: true,
        currency: true,
        product: {
          select: { active: true }
        },
        balances: {
          select: {
            onHand: true,
            reserved: true
          }
        }
      }
    });

    const snapshots = variants.map(v => ({
      variantId: v.id,
      price: v.price,
      currency: v.currency,
      active: v.product.active,
      available: v.balances.reduce(
        (sum, b) =>
          sum + Math.max(0, b.onHand - b.reserved),
        0
      )
    }));

    const issues = checkCheckoutAvailability(
      lines, snapshots
    );

    return Response.json({
      available: issues.length === 0,
      issues,
      checkedAt: new Date().toISOString(),
      note: 'Advisory snapshot only. Stock is reserved during checkout.'
    });
  } catch (error) {
    return errorResponse(error);
  }
}
