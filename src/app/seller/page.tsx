import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, authConfigured } from '@/lib/auth';
import { db } from '@/lib/db';
import { money } from '@/lib/money';
import { SellerRegistration } from '@/components/seller-registration';
import { SellerProductForm } from '@/components/seller-product-form';

export const dynamic='force-dynamic';

export default async function SellerPage() {
  if(!authConfigured)redirect('/login');
  const session=await auth();
  if(!session?.user?.id)redirect('/login');

  const seller=await db().sellerAccount.findUnique({
    where:{userId:session.user.id},
    select:{
      id:true,businessName:true,status:true,
      createdAt:true,reviewedAt:true
    }
  });

  const approved=seller?.status==='APPROVED';
  const products=approved
    ? await db().product.findMany({
        where:{sellerId:seller.id},
        select:{
          id:true,name:true,slug:true,active:true,
          variants:{
            select:{sku:true,price:true},
            orderBy:{sku:'asc'}
          }
        },
        orderBy:{createdAt:'desc'},
        take:100
      })
    : [];

  const categories=approved
    ? await db().category.findMany({
        select:{id:true,name:true,slug:true},
        orderBy:{name:'asc'}
      })
    : [];

  return (
    <main className="section" style={{maxWidth:1150,margin:'0 auto'}}>
      <Link href="/account/settings" className="text-link">
        ← Back to Account
      </Link>

      <header style={{margin:'34px 0'}}>
        <span className="eyebrow">LUMIÈRE PARTNERS</span>
        <h1>Seller Studio</h1>
        <p>Manage your business presence with LUMIÈRE.</p>
      </header>

      {!seller ? (
        <SellerRegistration/>
      ) : !approved ? (
        <section className="order-detail-panel"
          style={{maxWidth:750}}>
          <span className="eyebrow">SELLER APPLICATION</span>
          <h2 style={{marginTop:12}}>{seller.businessName}</h2>
          <p style={{margin:'16px 0'}}>
            Application status: <strong>
              {seller.status.replaceAll('_',' ')}
            </strong>
          </p>
          {seller.status==='PENDING'&&(
            <p>Your application is awaiting Super Admin review.</p>
          )}
          {seller.status==='REJECTED'&&(
            <p>Your application was not approved.
              Contact support for assistance.</p>
          )}
          {seller.status==='SUSPENDED'&&(
            <p>Seller access is suspended.
              Product management is unavailable.</p>
          )}
          <Link href="/account/settings/support"
            className="text-link">
            Contact Support →
          </Link>
        </section>
      ) : (
        <>
          <section className="order-detail-panel"
            style={{marginBottom:24}}>
            <span className="eyebrow">APPROVED SELLER</span>
            <h2>{seller.businessName}</h2>
            <p>Your seller account is active.</p>
            <div className="order-history-stats">
              <div>
                <span>My products</span>
                <strong>{products.length}</strong>
              </div>
              <div>
                <span>Active products</span>
                <strong>
                  {products.filter(p=>p.active).length}
                </strong>
              </div>
              <div>
                <span>Account status</span>
                <strong style={{fontSize:18}}>Approved</strong>
              </div>
            </div>
          </section>

          <SellerProductForm categories={categories}/>
          <section className="order-detail-panel">
            <h2>My Products</h2>
            {!products.length ? (
              <p>No products submitted yet. Use the form above
                to submit your first draft.</p>
            ) : (
              <div className="order-history-list">
                {products.map(product=>(
                  <article key={product.id}
                    className="order-history-card">
                    <h3>{product.name}</h3>
                    <p>Status: {product.active?'Active':'Draft'}</p>
                    {product.variants.map(variant=>(
                      <p key={variant.sku}>
                        {variant.sku} · {money(variant.price)}
                      </p>
                    ))}
                  </article>
                ))}
              </div>
            )}
          </section>

          <p className="sample-label" style={{marginTop:20}}>
            Product submission is enabled. Editing, publishing,
            inventory and fulfillment controls are not enabled yet.
          </p>
        </>
      )}
    </main>
  );
}
