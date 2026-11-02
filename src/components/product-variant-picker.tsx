'use client';

import { useState } from 'react';
import type { CatalogProduct } from
  '@/modules/catalog/sample';
import { productVariants } from
  '@/modules/catalog/variant-resolver';
import { AddToBag, WishlistButton } from './product-card';
import { money } from '@/lib/money';

export function ProductVariantPicker({
  product
}: {
  product: CatalogProduct;
}) {
  const variants = productVariants(product);
  const [selectedId, setSelectedId] = useState(
    variants[0]?.id ?? ''
  );

  const selected = variants.find(v => v.id === selectedId)
    ?? variants[0];

  if (!selected) {
    return <p className="stock">Currently unavailable</p>;
  }

  const selectedProduct = {
    ...product,
    id: selected.id,
    sku: selected.sku,
    price: selected.price,
    stock: selected.stock
  };

  return (
    <div className="variant-picker">
      <p className="detail-price">
        {money(selected.price)}
      </p>

      {variants.length > 1 && (
        <label className="field">
          Choose your variant
          <select
            value={selected.id}
            onChange={e => setSelectedId(e.target.value)}
          >
            {variants.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} · {money(v.price)}
                {v.stock <= 0 ? ' · Sold out' : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      <p className="variant-sku">
        SKU: {selected.sku}
      </p>

      <div className="detail-purchase-actions">
        <AddToBag product={selectedProduct}/>
        <WishlistButton product={product}/>
      </div>

      <p className="stock" aria-live="polite">
        {selected.stock > 0
          ? `${selected.stock} available`
          : 'Currently unavailable'}
      </p>
    </div>
  );
}
