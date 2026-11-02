import { db } from '@/lib/db';
import { sampleProducts } from '@/modules/catalog/sample';
import {
  availableStock,
  productSlugSchema
} from '@/modules/catalog/variant-policy';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    if (!productSlugSchema.safeParse(slug).success)
      return Response.json({ error: 'Invalid slug.' }, { status: 400 });

    if (!process.env.DATABASE_URL) {
      const p = sampleProducts.find(p => p.slug === slug);

      if (!p)
        return Response.json(
          { error: 'Product not found.' },
          { status: 404 }
        );

      return Response.json({
        demo: true,
        product: { slug: p.slug, name: p.name },
        variants: [{
          id: p.id,
          sku: p.sku,
          name: 'Standard',
          price: p.price,
          currency: 'INR',
          stock: p.stock,
          available: p.stock > 0
        }]
      });
    }

    const product = await db().product.findUnique({
      where: { slug, active: true,
        OR: [
          { sellerId: null },
          {
            reviewStatus: 'APPROVED',
            seller: { is: { status: 'APPROVED' } }
          }
        ]
      },
      select: {
        slug: true,
        name: true,
        variants: {
          orderBy: { sku: 'asc' },
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            currency: true,
            balances: {
              select: {
                onHand: true,
                reserved: true
              }
            }
          }
        }
      }
    });

    if (!product)
      return Response.json(
        { error: 'Product not found.' },
        { status: 404 }
      );

    return Response.json({
      demo: false,
      product: {
        slug: product.slug,
        name: product.name
      },
      variants: product.variants.map(v => {
        const stock = availableStock(v.balances);

        return {
          id: v.id,
          sku: v.sku,
          name: v.name,
          price: v.price,
          currency: v.currency,
          stock,
          available: stock > 0
        };
      })
    });
  } catch {
    return Response.json(
      { error: 'Unable to load product variants.' },
      { status: 500 }
    );
  }
}
