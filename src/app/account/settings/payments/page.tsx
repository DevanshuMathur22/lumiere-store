import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, authConfigured } from '@/lib/auth';
import { db } from '@/lib/db';
import { money } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function PaymentHistoryPage() {
  if (!authConfigured) redirect('/login');
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const orders = await db().order.findMany({
    where: {
      userId: session.user.id,
      payment: { isNot: null }
    },
    select: {
      id: true,
      total: true,
      createdAt: true,
      status: true,
      payment: {
        select: {
          id: true,
          status: true,
          amount: true,
          currency: true,
          providerPaymentId: true,
          capturedAt: true,
          createdAt: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  const payments = orders.filter(o => o.payment !== null);
  const captured = payments.filter(
    o => o.payment?.status === 'CAPTURED'
  );

  const capturedAmount = captured.reduce(
    (sum,o) => sum + (o.payment?.amount || 0), 0
  );

  return (
    <main className="section" style={{
      maxWidth:1100,
      margin:'0 auto'
    }}>
      <Link href="/account/settings" className="text-link">
        ← Back to Settings
      </Link>

      <header style={{margin:'32px 0'}}>
        <span className="eyebrow">YOUR ACCOUNT</span>
        <h1>Payments & Refunds</h1>
        <p>Review recorded transactions linked to your orders.</p>
      </header>

      <div className="order-history-stats">
        <div>
          <span>Payment records</span>
          <strong>{payments.length}</strong>
        </div>
        <div>
          <span>Captured payments</span>
          <strong>{captured.length}</strong>
        </div>
        <div>
          <span>Captured amount</span>
          <strong style={{fontSize:22}}>
            {money(capturedAmount)}
          </strong>
        </div>
      </div>

      <div className="notice" style={{marginBottom:24}}>
        Live payments and refunds are not enabled.
        Transaction history displays existing database records only.
      </div>

      {!payments.length ? (
        <section className="empty-state">
          <h2>No payment records yet</h2>
          <p>
            Your payment history will appear here when a
            transaction is recorded.
          </p>
          <Link href="/account/orders" className="text-link">
            View My Orders →
          </Link>
        </section>
      ) : (
        <section className="order-history-list">
          {payments.map(order => {
            const payment=order.payment!;
            return (
              <article key={payment.id}
                className="order-history-card">
                <div className="order-history-top">
                  <div>
                    <span className="eyebrow">TRANSACTION</span>
                    <h2>
                      Order #{order.id.slice(-8).toUpperCase()}
                    </h2>
                    <p>
                      {payment.createdAt.toLocaleDateString(
                        'en-IN',{
                          timeZone:'Asia/Kolkata',
                          day:'numeric',
                          month:'long',
                          year:'numeric'
                        }
                      )}
                    </p>
                  </div>
                  <div className="order-history-amount">
                    <strong>{money(payment.amount)}</strong>
                    <span>{payment.currency}</span>
                  </div>
                </div>

                <div className="order-history-bottom">
                  <div>
                    <span>Payment status</span>
                    <strong>
                      {payment.status.replaceAll('_',' ')}
                    </strong>
                  </div>

                  <div>
                    <span>Order status</span>
                    <strong>
                      {order.status.replaceAll('_',' ')}
                    </strong>
                  </div>

                  {payment.providerPaymentId && (
                    <div>
                      <span>Transaction reference</span>
                      <strong style={{overflowWrap:'anywhere'}}>
                        {payment.providerPaymentId}
                      </strong>
                    </div>
                  )}

                  <Link
                    href={`/account/orders/${order.id}`}
                    className="text-link"
                  >
                    View Order →
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section style={{
        marginTop:36,
        borderTop:'1px solid #d9d3c9',
        paddingTop:25
      }}>
        <h2>Refunds & Support</h2>
        <p>
          Refund requests and refund tracking are not yet available.
          For assistance with an existing order, contact support.
        </p>
        <Link href="/contact" className="text-link">
          Contact Support →
        </Link>
      </section>
    </main>
  );
}
