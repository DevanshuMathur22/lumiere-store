import 'server-only';
import { db } from '@/lib/db';
import {
  sampleProducts,
  type CatalogProduct
} from './sample';
import { availableStock } from './variant-policy';

export async function getCatalog(): Promise<{
  products: CatalogProduct[];
  demo: boolean;
}> {
  if (!process.env.DATABASE_URL)
    return { products: sampleProducts, demo: true };

  const rows = await db().product.findMany({
    where: { active: true,
        OR: [
          { sellerId: null },
          {
            reviewStatus: 'APPROVED',
            seller: { is: { status: 'APPROVED' } }
          }
        ]
      },
    include: {
      category: true,
      variants: {
        include: { balances: true },
        orderBy: { sku: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return {
    demo: false,
    products: rows.flatMap(p => {
      const variants = p.variants
        .filter(v => v.currency === 'INR')
        .map(v => ({
          id: v.id,
          sku: v.sku,
          name: v.name,
          price: v.price,
          stock: availableStock(v.balances)
        }));

      if (!variants.length) return [];

      const first = variants[0];

      return [{
        id: first.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        material: p.material,
        category: p.category.name,
        categorySlug: p.category.slug,
        image: p.image,
        price: first.price,
        sku: first.sku,
        stock: first.stock,
        featured: p.featured,
        variants
      }];
    })
  };
}
