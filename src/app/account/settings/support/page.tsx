import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, authConfigured } from '@/lib/auth';
import { db } from '@/lib/db';
import { SupportForm } from '@/components/support-form';
import { SupportConversation } from '@/components/support-conversation';

export const dynamic = 'force-dynamic';

export default async function SupportHistoryPage({
  searchParams
}: {
  searchParams: Promise<{order?: string}>
}) {
  const { order = '' } = await searchParams;
  if (!authConfigured) redirect('/login');
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const orders = await db().order.findMany({
    where:{userId:session.user.id},
    select:{id:true,createdAt:true},
    orderBy:{createdAt:'desc'},
    take:100
  });

  const tickets = await db().supportTicket.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      subject: true,
      body: true,
      orderId: true,
      status: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  const open = tickets.filter(ticket =>
    ticket.status === 'OPEN'
  ).length;

  return (
    <main className="section" style={{
      maxWidth:1100,
      margin:'0 auto'
    }}>
      <Link href="/account/settings" className="text-link">
        ← Back to Settings
      </Link>

      <header style={{margin:'32px 0'}}>
        <span className="eyebrow">CUSTOMER CARE</span>
        <h1>Support & Care</h1>
        <p>Manage your requests and contact our team.</p>
      </header>

      <div className="order-history-stats">
        <div>
          <span>Recent requests</span>
          <strong>{tickets.length}</strong>
        </div>
        <div>
          <span>Open requests</span>
          <strong>{open}</strong>
        </div>
        <div>
          <span>Other statuses</span>
          <strong>{tickets.length-open}</strong>
        </div>
      </div>

      <section className="order-detail-panel" style={{marginBottom:25}}>
        <h2>New Support Request</h2>
        <p style={{marginBottom:20}}>
          Describe your question or issue. If it concerns an
          order, include your order reference in the message.
        </p>
        <SupportForm enabled={true}
          selectedOrderId={order}
          orders={orders.map(o=>({
            id:o.id,
            createdAt:o.createdAt.toISOString()
          }))}/>
      </section>

      <section>
        <h2 style={{marginBottom:20}}>My Support Requests</h2>

        {!tickets.length ? (
          <div className="empty-state">
            <h2>No support requests yet</h2>
            <p>Your submitted requests will appear here.</p>
          </div>
        ) : (
          <div className="order-history-list">
            {tickets.map(ticket => (
              <article key={ticket.id}
                className="order-history-card">
                <div className="order-history-top">
                  <div>
                    <span className="eyebrow">SUPPORT TICKET</span>
                    <h2>{ticket.subject}</h2>
                    <p>
                      {ticket.createdAt.toLocaleDateString('en-IN',{
                        timeZone:'Asia/Kolkata',
                        day:'numeric',
                        month:'long',
                        year:'numeric'
                      })}
                    </p>
                  </div>
                  <div className="order-history-amount">
                    <strong style={{fontSize:15}}>
                      {ticket.status.replaceAll('_',' ')}
                    </strong>
                  </div>
                </div>

                <p style={{
                  whiteSpace:'pre-wrap',
                  overflowWrap:'anywhere',
                  marginTop:18,
                  lineHeight:1.7
                }}>
                  {ticket.body}
                </p>

                <SupportConversation ticketId={ticket.id}
                  status={ticket.status}/>
                <p className="sample-label" style={{marginTop:15}}>
                  Reference: {ticket.id}
                  {ticket.orderId&&(
                    <>
                      {' · '}
                      <Link href={`/account/orders/${ticket.orderId}`}>
                        View related order
                      </Link>
                    </>
                  )}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="sample-label" style={{marginTop:25}}>
        Showing up to 100 recent requests.
        Open a ticket to view its conversation and send a reply.
        Refresh this page to see newly created tickets.
      </p>
    </main>
  );
}
