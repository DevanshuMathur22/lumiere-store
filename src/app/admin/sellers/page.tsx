import { redirect } from 'next/navigation';
import { auth, authConfigured } from '@/lib/auth';
import { db } from '@/lib/db';
import { AdminSellerManager } from '@/components/admin-seller-manager';

export const dynamic='force-dynamic';

export default async function SellersAdminPage() {
  if(!authConfigured)redirect('/login');
  const session=await auth();
  if(!session?.user?.id)redirect('/login');
  const role=await db().userRole.findFirst({
    where:{userId:session.user.id,role:{name:'Super Admin'}},
    select:{userId:true}
  });
  if(!role)redirect('/admin');

  return (
    <main className="section" style={{maxWidth:1150,margin:'0 auto'}}>
      <header style={{margin:'30px 0'}}>
        <span className="eyebrow">SUPER ADMIN</span>
        <h1>Seller Applications</h1>
        <p>Review registrations and manage seller access.</p>
      </header>
      <AdminSellerManager/>
    </main>
  );
}
