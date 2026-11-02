import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, authConfigured, signOut } from '@/lib/auth';
import { db } from '@/lib/db';
import { money } from '@/lib/money';

export const dynamic = 'force-dynamic';

const panel: React.CSSProperties = {
  padding: '24px',
  border: '1px solid rgba(120,105,85,.22)',
  borderRadius: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  minHeight: 190,
  background: 'rgba(255,255,255,.3)'
};

export default async function SettingsPage() {
  if (!authConfigured) redirect('/login');
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const [addresses, orders] = await Promise.all([
    db().address.findMany({
      where: { userId },
      select: { id: true, city: true, state: true },
      take: 20
    }),
    db().order.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        payment: {
          select: { status: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ]);

  const cards = [
    {
      title: 'My Orders',
      detail: `${orders.length} recent orders · View history and status`,
      href: '/account/orders',
      action: 'View orders'
    },
    {
      title: 'Saved Addresses',
      detail: `${addresses.length} saved addresses · Add, edit and delete`,
      href: '/account/settings/addresses',
      action: 'Manage addresses'
    },
    {
      title: 'Payments & Refunds',
      detail: 'Review payment status in your order details. Payments are currently disabled.',
      href: '/account/settings/payments',
      action: 'View payment history'
    },
    {
      title: 'Wishlist',
      detail: 'Your saved favourite pieces',
      href: '/wishlist',
      action: 'Open wishlist'
    },
    {
      title: 'Shopping Bag',
      detail: 'Manage your selected pieces',
      href: '/cart',
      action: 'Open bag'
    },
    {
      title: 'LUMIÈRE Rewards',
      detail: 'Points, tiers and referrals · Not launched yet',
      href: '',
      action: ''
    },
    {
      title: 'Personal Profile & Security',
      detail: 'Google account sign-in is active. Profile editing and session management are planned.',
      href: '/account',
      action: 'Account'
    },
    {
      title: 'Seller Studio',
      detail: 'Become a seller, track your application and manage your products',
      href: '/seller',
      action: 'Open Seller Studio'
    },
    {
      title: 'Support & Care',
      detail: 'Questions about your orders or products',
      href: '/account/settings/support',
      action: 'View support requests'
    }
  ];

  return (
    <main className="section" style={{maxWidth:1200,margin:'0 auto'}}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR PERSONAL SPACE</span>
          <h1 style={{marginTop:14}}>Account & Settings</h1>
          <p>Welcome back, {session.user.name || 'there'}.</p>
        </div>
      </div>

      <details className="settings-navigation">
        <summary className="settings-menu-trigger">
          <span className="settings-hamburger" aria-hidden="true">
            <span></span><span></span><span></span>
          </span>
          <span>Settings Menu</span>
        </summary>
        <nav className="settings-menu-links" aria-label="Account settings">
          {cards.map(card => card.href
            ? <Link key={card.title} href={card.href}>
                {card.title}<span>›</span>
              </Link>
            : <span className="settings-menu-disabled" key={card.title}>
                {card.title}<small>Coming soon</small>
              </span>
          )}
        </nav>
      </details>

      <section className="settings-account-profile">
        <div>
          <span className="eyebrow">ACCOUNT INFORMATION</span>
          <h2>Personal Profile</h2>
          <p><strong>Name:</strong> {session.user.name || 'Not provided'}</p>
          <p><strong>Email:</strong> {session.user.email || 'Not provided'}</p>
          <p><strong>Sign-in:</strong> Google Account</p>
        </div>
        <form action={async () => {
          'use server';
          await signOut({ redirectTo: '/' });
        }}>
          <button type="submit" className="settings-signout">
            Sign Out
          </button>
        </form>
      </section>

      <div className="settings-vertical-list">
        {cards.map(card => (
          <section className="settings-list-item" key={card.title}>
            <div>
              <h2>{card.title}</h2>
              <p>{card.detail}</p>
            </div>
            {card.href
              ? <Link className="text-link" href={card.href}>
                  {card.action} →
                </Link>
              : <span className="sample-label">COMING SOON</span>}
          </section>
        ))}
      </div>

      <h2 style={{margin:'35px 0 20px'}}>Recent activity</h2>
      {orders.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Order status</th>
                <th>Payment</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0,5).map(order => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/account/orders/${order.id}`}>
                      {order.id.slice(-8).toUpperCase()}
                    </Link>
                  </td>
                  <td>{order.createdAt.toLocaleDateString('en-IN')}</td>
                  <td>{order.status.replaceAll('_',' ')}</td>
                  <td>{order.payment?.status.replaceAll('_',' ') || 'Not recorded'}</td>
                  <td>{money(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="empty-state">
        <p>No orders placed yet.</p>
        <Link href="/collections" className="text-link">
          Explore the collection
        </Link>
      </div>}
    </main>
  );
}
