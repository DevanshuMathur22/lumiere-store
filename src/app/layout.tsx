import type { Metadata } from 'next';
import { CartProvider } from '@/components/cart-provider';
import { WishlistProvider } from '@/components/wishlist-provider';
import { SiteToastProvider } from '@/components/site-toast';
import { Header, Footer } from '@/components/chrome';
import './globals.css';
export const metadata: Metadata = { title: { default: 'LUMIÈRE — Objects of quiet luxury', template: '%s | LUMIÈRE' }, description: 'Considered home objects, natural textures, and everyday rituals. Discover the LUMIÈRE collection.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><SiteToastProvider><WishlistProvider><CartProvider><a className="skip-link" href="#main">Skip to content</a><Header/><main id="main">{children}</main><Footer/></CartProvider></WishlistProvider></SiteToastProvider></body></html>; }
