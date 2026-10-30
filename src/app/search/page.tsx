import { getCatalog } from '@/modules/catalog/repository';
import { Catalog } from '@/components/catalog';
export const dynamic = 'force-dynamic';
export default async function Search({searchParams}:{searchParams:Promise<{q?:string}>}) {const {products}=await getCatalog(); const {q}=await searchParams;return <div className="section collection-page"><span className="eyebrow">A LITTLE DISCOVERY</span><h1>Find your next favourite.</h1><Catalog products={products} initialQuery={q||''}/></div>;}
