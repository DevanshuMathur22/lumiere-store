import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth, authConfigured } from '@/lib/auth';
import { db } from '@/lib/db';
import { money } from '@/lib/money';

export const dynamic = 'force-dynamic';

const stages = [
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED'
] as const;

function readable(value: string) {
  return value.replaceAll('_', ' ');
}

function displayAddress(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return [];

  const data = value as Record<string, unknown>;
  const get = (key: string) =>
    typeof data[key] === 'string' ? (data[key] as string).trim() : '';

  const lines = [
    get('name'),
    get('phone'),
    [get('line1'),get('building'),get('floor'),get('line2')]
      .filter(Boolean).join(', '),
    [get('city'),get('state'),get('postalCode')]
      .filter(Boolean).join(', '),
    get('country') === 'IN' ? 'India' : get('country')
  ];

  return lines.filter(Boolean);
}

export default async function OrderDetail({
  params
}: {
  params: Promise<{id:string}>
}) {
  if (!authConfigured) redirect('/login');

  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;
  const order = await db().order.findFirst({
    where: { id, userId: session.user.id },
    include: { items: true, payment: true }
  });

  if (!order) notFound();

  const status = String(order.status);
  const current = stages.findIndex(stage => stage === status);
  const address = displayAddress(order.address);
  const paymentStatus = order.payment
    ? readable(String(order.payment.status))
    : 'Not recorded';

  return (
    <main className="section order-detail-page">
      <Link href="/account/orders" className="text-link">
        ← My Orders
      </Link>

      <header className="order-detail-header">
        <span className="eyebrow">YOUR ORDER</span>
        <h1>Order #{order.id.slice(-8).toUpperCase()}</h1>
        <p>
          Placed on {order.createdAt.toLocaleDateString('en-IN',{
            timeZone:'Asia/Kolkata',
            day:'numeric',
            month:'long',
            year:'numeric'
          })}
        </p>
        <div className="order-detail-tags">
          <span>Order: {readable(status)}</span>
          <span>Payment: {paymentStatus}</span>
        </div>
      </header>

      <div className="order-detail-grid">
        <div className="order-detail-main">
          <section className="order-detail-panel">
            <h2>Delivery Progress</h2>
            {current >= 0 ? (
              <ol className="order-progress">
                {stages.map((stage,index) => (
                  <li key={stage}
                    className={index < current ? 'complete' :
                      index === current ? 'current' : 'upcoming'}
                    aria-current={index === current ? 'step' : undefined}>
                    <span className="order-progress-marker">
                      {index < current ? '✓' : index + 1}
                    </span>
                    <div>
                      <strong>{readable(stage)}</strong>
                      <p>{index < current ? 'Completed stage' :
                        index === current ? 'Current order status' :
                        'Not reached'}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="notice">
                Current status: {readable(status)}.
                Delivery progress is not available for this status.
              </div>
            )}
            <p className="sample-label">
              This timeline reflects the current order status,
              not individual stage timestamps or courier tracking.
            </p>
          </section>

          <section className="order-detail-panel">
            <h2>Items Ordered</h2>
            {order.items.map(item => (
              <div className="summary-line" key={item.id}>
                <span>
                  {item.productName}
                  <span className="order-detail-muted">
                    {' '}× {item.quantity}
                  </span>
                </span>
                <span>{money(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
            <div className="summary-line">
              <span>Subtotal</span>
              <span>{money(order.subtotal)}</span>
            </div>
            <div className="summary-line">
              <span>Delivery charge</span>
              <span>{money(order.shipping)}</span>
            </div>
            <div className="summary-line total">
              <span>Total</span>
              <span>{money(order.total)}</span>
            </div>
          </section>
        </div>

        <aside className="order-detail-sidebar">
          <section className="order-detail-panel">
            <h2>Delivery Address</h2>
            {address.length ? (
              <address className="order-detail-address">
                {address.map((line,index) => (
                  <span key={index}>{line}</span>
                ))}
              </address>
            ) : (
              <p>Delivery address unavailable.</p>
            )}
          </section>

          <section className="order-detail-panel">
            <h2>Payment Details</h2>
            <dl className="order-detail-facts">
              <div>
                <dt>Payment status</dt>
                <dd>{paymentStatus}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{money(order.total)}</dd>
              </div>
              {order.payment?.capturedAt && (
                <div>
                  <dt>Captured on</dt>
                  <dd>
                    {order.payment.capturedAt.toLocaleDateString(
                      'en-IN',{timeZone:'Asia/Kolkata'}
                    )}
                  </dd>
                </div>
              )}
            </dl>
            <Link href="/account/settings/payments"
              className="text-link">
              Payment History →
            </Link>
          </section>

          <section className="order-detail-panel">
            <h2>Need Help?</h2>
            <p>Contact our team about this order.</p>
            <p className="order-detail-muted">
              Reference: {order.id}
            </p>
            <Link href={`/account/settings/support?order=${encodeURIComponent(order.id)}`} className="text-link">
              Contact Support →
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
