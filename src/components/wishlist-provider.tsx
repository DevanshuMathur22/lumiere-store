'use client';

import {
  createContext,
  useContext,
  type ReactNode
} from 'react';
import { useCloudSaved } from './use-cloud-saved';

type WishlistContext = {
  items: string[];
  ready: boolean;
  toggle: (slug: string) => void;
  remove: (slug: string) => void;
  count: number;
  has: (slug: string) => boolean;
};

const Context = createContext<WishlistContext | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { items, ready, update, mutate } =
    useCloudSaved<string[]>('wishlist');

  function remove(slug: string) {
    if (!ready) return;
    update(items.filter(item => item !== slug));
    mutate({ action: 'wishlist.remove', slug });
  }

  function toggle(slug: string) {
    if (!ready || !slug || slug.length > 150) return;

    if (items.includes(slug)) {
      remove(slug);
      return;
    }

    if (items.length >= 100) return;
    update([...items, slug]);
    mutate({ action: 'wishlist.add', slug });
  }

  return (
    <Context.Provider value={{
      items,
      ready,
      toggle,
      remove,
      count: items.length,
      has: slug => items.includes(slug)
    }}>
      {children}
    </Context.Provider>
  );
}

export function useWishlist() {
  const value = useContext(Context);
  if (!value) throw new Error('WishlistProvider is missing');
  return value;
}
