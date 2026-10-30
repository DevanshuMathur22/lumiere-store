import { getCatalog } from '@/modules/catalog/repository';
import { auth, authConfigured } from '@/lib/auth';
import { CheckoutForm } from '@/components/checkout-form';
export const dynamic='force-dynamic';
export default async function Checkout(){const {products}=await getCatalog();const session=authConfigured?await auth():null;const enabled=authConfigured&&process.env.PAYMENTS_ENABLED==='true'&&Boolean(process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')&&process.env.RAZORPAY_KEY_SECRET);return <div className="section"><div className="page-title"><span className="eyebrow">ONE STEP CLOSER TO HOME</span><h1>The finishing touches.</h1></div><CheckoutForm products={products} enabled={enabled} signedIn={Boolean(session?.user)}/></div>;}
