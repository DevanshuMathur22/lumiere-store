'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { z } from 'zod';
const cartSchema = z.array(z.object({ variantId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(10) })).max(40);
export type CartItem = z.infer<typeof cartSchema>[number];
type Cart = { items: CartItem[]; ready: boolean; add: (id: string) => void; setQuantity: (id: string, n: number) => void; clear: () => void; count: number };
const Context = createContext<Cart | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]), [ready, setReady] = useState(false);
  useEffect(() => { try { const parsed = cartSchema.safeParse(JSON.parse(localStorage.getItem('lumiere-cart-v1') || '[]')); if (parsed.success) setItems([...new Map(parsed.data.map(i => [i.variantId, i])).values()]); } catch {} setReady(true); }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem('lumiere-cart-v1', JSON.stringify(items)); } catch {} } }, [items, ready]);
  function add(id: string) { setItems(old => old.some(i => i.variantId === id) ? old.map(i => i.variantId === id ? { ...i, quantity: Math.min(10, i.quantity + 1) } : i) : old.length < 40 ? [...old, { variantId: id, quantity: 1 }] : old); }
  function setQuantity(id: string, n: number) { setItems(old => n <= 0 ? old.filter(i => i.variantId !== id) : old.map(i => i.variantId === id ? { ...i, quantity: Math.min(10, Math.floor(n)) } : i)); }
  return <Context.Provider value={{ items, ready, add, setQuantity, clear: () => setItems([]), count: items.reduce((n, i) => n + i.quantity, 0) }}>{children}</Context.Provider>;
}
export function useCart() { const value = useContext(Context); if (!value) throw new Error('CartProvider is missing'); return value; }
