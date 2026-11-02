'use client';

import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { CatalogProduct } from '@/modules/catalog/sample';
import { ProductCard } from './product-card';

type Props = {
  products: CatalogProduct[];
  initialCategory?: string;
  initialQuery?: string;
};

const priceOptions = [
  { label: 'Any price', value: '0' },
  { label: 'Under ₹2,500', value: '250000' },
  { label: 'Under ₹5,000', value: '500000' },
  { label: 'Under ₹10,000', value: '1000000' },
  { label: 'Under ₹20,000', value: '2000000' },
];

export function Catalog({
  products,
  initialCategory = '',
  initialQuery = '',
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState('curated');
  const [maxPrice, setMaxPrice] = useState('0');
  const [inStock, setInStock] = useState(false);

  const categories = useMemo(
    () => [...new Set(products.map(p => p.category))],
    [products]
  );

  const shown = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    const limit = Number(maxPrice);

    return products
      .filter(p => {
        const matchesCategory =
          !category || p.category.toLowerCase() === category.toLowerCase();
        const matchesQuery =
          !term ||
          `${p.name} ${p.category} ${p.description} ${p.material} ${p.sku}`
            .toLocaleLowerCase()
            .includes(term);

        return (
          matchesCategory &&
          matchesQuery &&
          (!limit || p.price <= limit) &&
          (!inStock || p.stock > 0)
        );
      })
      .sort((a, b) => {
        if (sort === 'low') return a.price - b.price;
        if (sort === 'high') return b.price - a.price;
        if (sort === 'name') return a.name.localeCompare(b.name);
        return Number(b.featured) - Number(a.featured);
      });
  }, [products, query, category, sort, maxPrice, inStock]);

  const filtered =
    Boolean(query.trim() || category || inStock || maxPrice !== '0');

  function reset() {
    setQuery('');
    setCategory('');
    setSort('curated');
    setMaxPrice('0');
    setInStock(false);
  }

  return (
    <>
      <div className="catalog-controls">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search products"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Find something beautiful…"
          />
        </label>
        <label className="sort">
          <SlidersHorizontal size={16} aria-hidden="true" />
          <select
            aria-label="Sort products"
            value={sort}
            onChange={event => setSort(event.target.value)}
          >
            <option value="curated">Our curated edit</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </label>
      </div>

      <div className="filter-row">
        <div>
          {['', ...categories].map(value => (
            <button
              type="button"
              key={value}
              aria-pressed={category.toLowerCase() === value.toLowerCase()}
              className={
                category.toLowerCase() === value.toLowerCase()
                  ? 'selected'
                  : ''
              }
              onClick={() => setCategory(value)}
            >
              {value || 'All objects'}
            </button>
          ))}
        </div>
        <span aria-live="polite">{shown.length} objects</span>
      </div>

      <div className="catalog-extra-filters">
        <label>
          Price range
          <select
            aria-label="Maximum product price"
            value={maxPrice}
            onChange={event => setMaxPrice(event.target.value)}
          >
            {priceOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="catalog-stock-filter">
          <input
            type="checkbox"
            checked={inStock}
            onChange={event => setInStock(event.target.checked)}
          />
          In stock only
        </label>

        {filtered && (
          <button
            type="button"
            className="catalog-clear"
            onClick={reset}
          >
            <X size={15} aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>

      {shown.length ? (
        <div className="product-grid">
          {shown.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No objects found.</h2>
          <p>Try a different search, category or price range.</p>
          <button type="button" className="button" onClick={reset}>
            View all objects
          </button>
        </div>
      )}
    </>
  );
}
