import type {
  CatalogProduct,
  CatalogVariant
} from './sample';

export type ResolvedVariant = CatalogProduct & {
  variantName: string;
};

export function productVariants(
  product: CatalogProduct
): CatalogVariant[] {
  return product.variants?.length
    ? product.variants
    : [{
        id: product.id,
        sku: product.sku,
        name: 'Standard',
        price: product.price,
        stock: product.stock
      }];
}

export function resolveVariant(
  products: CatalogProduct[],
  variantId: string
): ResolvedVariant | undefined {
  for (const product of products) {
    const variant = productVariants(product)
      .find(v => v.id === variantId);

    if (variant) {
      return {
        ...product,
        id: variant.id,
        sku: variant.sku,
        price: variant.price,
        stock: variant.stock,
        variantName: variant.name
      };
    }
  }

  return undefined;
}
