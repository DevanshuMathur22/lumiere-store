import { getCatalog } from '@/modules/catalog/repository';
import { WishlistView } from '@/components/wishlist-view';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your wishlist' };

export default async function WishlistPage() {
  const { products } = await getCatalog();

  return (
    <div className="section collection-page">
      <span className="eyebrow">YOUR SAVED OBJECTS</span>
      <h1>A little collection of favourites.</h1>
      <p className="lead">
        Keep the pieces you love in one thoughtful place.
      </p>
      <WishlistView products={products} />
    </div>
  );
}
