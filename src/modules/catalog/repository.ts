import 'server-only';
import { db } from '@/lib/db';
import { sampleProducts, type CatalogProduct } from './sample';
export async function getCatalog(): Promise<{ products: CatalogProduct[]; demo: boolean }> {
  if (!process.env.DATABASE_URL) return { products: sampleProducts, demo: true };
  const rows = await db().product.findMany({ where: { active: true }, include: { category: true, variants: { include: { balances: true }, orderBy: { sku: 'asc' } } }, orderBy: { createdAt: 'desc' } });
  return { demo: false, products: rows.flatMap(p => p.variants.slice(0, 1).map(v => ({ id: v.id, slug: p.slug, name: p.name, description: p.description, material: p.material, category: p.category.name, categorySlug: p.category.slug, image: p.image, price: v.price, sku: v.sku, stock: v.balances.reduce((n, b) => n + b.onHand - b.reserved, 0), featured: p.featured }))) };
}
