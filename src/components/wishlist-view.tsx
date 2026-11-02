'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CatalogProduct } from '@/modules/catalog/sample';
import { ProductCard } from './product-card';
import { useWishlist } from './wishlist-provider';

export function WishlistView({ products }: { products: CatalogProduct[] }) {
  const { items, ready } = useWishlist();

  if (!ready) {
    return <p role="status">Opening your saved objects…</p>;
  }

  const saved = items
    .map(slug => products.find(product => product.slug === slug))
    .filter((product): product is CatalogProduct => Boolean(product));

  if (!items.length) {
    return (
      <div className="empty-state">
        <h2>Nothing saved just yet.</h2>
        <p>Tap the heart on a product to keep it close.</p>
        <Link className="button" href="/collections">
          Explore the collection <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="wishlist-count">
        {saved.length} saved {saved.length === 1 ? 'object' : 'objects'}
      </p>
      {saved.length > 0 ? (
        <div className="product-grid">
          {saved.map(product => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>These objects are no longer available.</h2>
          <p>Explore the latest collection to find something new.</p>
          <Link href="/collections" className="button">
            Browse products
          </Link>
        </div>
      )}
      <p className="wishlist-note">
        Your wishlist is saved in this browser. Prices and availability may change.
      </p>
    </>
  );
}
