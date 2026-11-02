'use client';

import {
  createContext,
  useContext,
  type ReactNode
} from 'react';
import {
  useCloudSaved,
  type SavedCartLine
} from './use-cloud-saved';

export type CartItem = SavedCartLine;

type Cart = {
  items: CartItem[];
  ready: boolean;
  add: (id: string) => void;
  setQuantity: (id: string, n: number) => void;
  clear: () => void;
  count: number;
};

const Context = createContext<Cart | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { items, ready, update, mutate } =
    useCloudSaved<CartItem[]>('cart');

  function setQuantity(id: string, quantity: number) {
    if (!ready || !id || id.length > 100) return;
    const n = Math.max(0, Math.min(10, Math.floor(quantity)));
    const next = n === 0
      ? items.filter(item => item.variantId !== id)
      : items.map(item =>
          item.variantId === id ? { ...item, quantity: n } : item
        );

    update(next);
    mutate({ action: 'cart.set', variantId: id, quantity: n });
  }

  function add(id: string) {
    if (!ready || !id || id.length > 100) return;
    const existing = items.find(item => item.variantId === id);
    if (!existing && items.length >= 40) return;
    if (existing && existing.quantity >= 10) return;

    const next = existing
      ? items.map(item =>
          item.variantId === id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      : [...items, { variantId: id, quantity: 1 }];

    update(next);
    mutate({
      action: 'cart.set',
      variantId: id,
      quantity: existing ? existing.quantity + 1 : 1
    });
  }

  function clear() {
    if (!ready) return;
    update([]);
    mutate({ action: 'cart.clear' });
  }

  return (
    <Context.Provider value={{
      items,
      ready,
      add,
      setQuantity,
      clear,
      count: items.reduce((n, item) => n + item.quantity, 0)
    }}>
      {children}
    </Context.Provider>
  );
}

export function useCart() {
  const value = useContext(Context);
  if (!value) throw new Error('CartProvider is missing');
  return value;
}
