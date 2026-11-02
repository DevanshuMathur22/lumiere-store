import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, authConfigured } from '@/lib/auth';
import { CustomerAddresses } from '@/components/customer-addresses';

export const dynamic = 'force-dynamic';

export default async function AddressesPage() {
  if (!authConfigured) redirect('/login');
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  return (
    <main className="section" style={{maxWidth:980,margin:'0 auto'}}>
      <Link className="text-link" href="/account/settings">
        ← Back to Settings
      </Link>
      <div style={{margin:'35px 0'}}>
        <span className="eyebrow">YOUR ACCOUNT</span>
        <h1>Saved Addresses</h1>
        <p>Manage your delivery destinations securely.</p>
      </div>
      <CustomerAddresses />
    </main>
  );
}
