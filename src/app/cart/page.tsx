import { getCatalog } from '@/modules/catalog/repository';
import { CartView } from '@/components/cart-view';
export const dynamic='force-dynamic';
export default async function Cart(){const data=await getCatalog();return <div className="section"><div className="page-title"><span className="eyebrow">YOUR CONSIDERED COLLECTION</span><h1>The shopping bag.</h1></div><CartView {...data}/></div>;}
