import { getCatalog } from '@/modules/catalog/repository';
import { Catalog } from '@/components/catalog';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function Collection({params}:{params:Promise<{slug:string}>}) { const {slug}=await params; const {products,demo}=await getCatalog(); const category=products.find(p=>p.categorySlug===slug)?.category; if(!category) notFound(); return <div className="section collection-page"><span className="eyebrow">THE COLLECTION</span><h1>{category}</h1><p className="lead">Thoughtful pieces for the spaces you love.</p>{demo&&<p className="sample-label">Preview collection · Sample products</p>}<Catalog products={products} initialCategory={category}/></div>; }
