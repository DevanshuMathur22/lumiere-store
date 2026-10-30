'use client';
import Link from 'next/link';
import { Plus, Check } from 'lucide-react';
import { useState } from 'react';
import type { CatalogProduct } from '@/modules/catalog/sample';
import { useCart } from './cart-provider';
import { money } from '@/lib/money';
export function AddToBag({ product, compact = false }: { product: CatalogProduct; compact?: boolean }) { const { add, items, ready } = useCart(); const [added, setAdded] = useState(false); const quantity = items.find(i => i.variantId === product.id)?.quantity || 0; const unavailable = quantity >= Math.min(product.stock, 10); return <button disabled={!ready || product.stock <= 0 || unavailable} className={compact ? 'quick-add' : 'button full'} aria-label={`Add ${product.name} to bag`} onClick={() => { add(product.id); setAdded(true); setTimeout(() => setAdded(false), 1800); }}>{compact ? added ? <Check size={18}/> : <Plus size={18}/> : <>{product.stock <= 0 ? 'Currently unavailable' : unavailable ? 'Bag limit reached' : added ? 'Added to your bag' : 'Add to bag'} <span>{money(product.price)}</span></>}</button>; }
export function ProductCard({ product, index = 0 }: { product: CatalogProduct; index?: number }) { return <article className="product-card"><div className="product-image"><Link href={`/products/${product.slug}`}><img src={product.image} alt={product.name} loading="lazy"/></Link>{index === 0 && <span className="product-tag">A QUIET FAVOURITE</span>}<AddToBag product={product} compact/></div><div className="product-meta"><span className="eyebrow">{product.category}</span><span>{money(product.price)}</span></div><h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3></article>; }
