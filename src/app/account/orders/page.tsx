import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, authConfigured } from '@/lib/auth';
import { db } from '@/lib/db';
import { money } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  if (!authConfigured) redirect('/login');
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const orders = await db().order.findMany({
    where: { userId: session.user.id },
    include: {
      payment: {
        select: { status: true, capturedAt: true }
      },
      items: {
        select: { quantity: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  const totalOrders = orders.length;
  const delivered = orders.filter(o => o.status === 'DELIVERED').length;
  const active = orders.filter(o =>
    ['CONFIRMED','PROCESSING','PACKED','SHIPPED'].includes(o.status)
  ).length;

  return (
    <main className="section" style={{maxWidth:1150,margin:'0 auto'}}>
      <Link href="/account/settings" className="text-link">
        ← Back to Settings
      </Link>

      <div style={{margin:'34px 0'}}>
        <span className="eyebrow">YOUR SHOPPING HISTORY</span>
        <h1>My Orders</h1>
        <p>Review purchases, payments and order progress.</p>
      </div>

      <div className="order-history-stats">
        <div>
          <span>Total recent orders</span>
          <strong>{totalOrders}</strong>
        </div>
        <div>
          <span>In progress</span>
          <strong>{active}</strong>
        </div>
        <div>
          <span>Delivered</span>
          <strong>{delivered}</strong>
        </div>
      </div>

      {!orders.length ? (
        <section className="empty-state">
          <h2>No orders yet</h2>
          <p>Your shopping history will appear here.</p>
          <Link href="/collections" className="button">
            Explore collection
          </Link>
        </section>
      ) : (
        <div className="order-history-list">
          {orders.map(order => (
            <article key={order.id} className="order-history-card">
              <div className="order-history-top">
                <div>
                  <span className="eyebrow">ORDER</span>
                  <h2>#{order.id.slice(-8).toUpperCase()}</h2>
                  <p>
                    {order.createdAt.toLocaleDateString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="order-history-amount">
                  <strong>{money(order.total)}</strong>
                  <span>{order.items.reduce(
                    (sum, item) => sum + item.quantity, 0
                  )} items</span>
                </div>
              </div>

              <div className="order-history-bottom">
                <div>
                  <span>Order status</span>
                  <strong>{order.status.replaceAll('_',' ')}</strong>
                </div>
                <div>
                  <span>Payment status</span>
                  <strong>
                    {order.payment
                      ? order.payment.status.replaceAll('_',' ')
                      : 'Not recorded'}
                  </strong>
                </div>
                <Link
                  className="text-link"
                  href={`/account/orders/${order.id}`}
                >
                  View Order Details →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="sample-label" style={{marginTop:25}}>
        Showing up to 100 most recent orders. Shipping tracking,
        invoices and refund requests will be added when those
        services are available.
      </p>
    </main>
  );
}
