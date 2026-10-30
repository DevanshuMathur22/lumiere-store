import { getCatalog } from '@/modules/catalog/repository';
import { Catalog } from '@/components/catalog';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'The collection' };
export default async function Collection() { const { products,demo }=await getCatalog(); return <div className="section collection-page"><span className="eyebrow">THE LUMIÈRE COLLECTION</span><h1>Beautiful things.<br/><em>Everyday meaning.</em></h1><p className="lead">Objects chosen for the way they make a space feel.</p>{demo&&<p className="sample-label">Preview collection · Sample products and indicative prices</p>}<Catalog products={products}/></div>; }
