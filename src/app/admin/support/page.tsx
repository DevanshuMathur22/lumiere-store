import Link from 'next/link';
import { requirePermission } from '@/lib/security';
import { db } from '@/lib/db';
import { AdminSupportConversation } from '@/components/admin-support-conversation';

export const dynamic = 'force-dynamic';

export default async function AdminSupportPage() {
  await requirePermission('crm.read');

  const tickets = await db().supportTicket.findMany({
    select: {
      id: true,
      subject: true,
      body: true,
      status: true,
      orderId: true,
      createdAt: true,
      user: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  return (
    <main className="section" style={{maxWidth:1200,margin:'0 auto'}}>
      <Link href="/admin/crm" className="text-link">
        ← Back to CRM
      </Link>

      <header style={{margin:'32px 0'}}>
        <span className="eyebrow">CUSTOMER RELATIONSHIPS</span>
        <h1>Support Desk</h1>
        <p>Review customer requests and manage conversations.</p>
      </header>

      <div className="order-history-stats">
        <div>
          <span>Recent tickets</span>
          <strong>{tickets.length}</strong>
        </div>
        <div>
          <span>Open</span>
          <strong>{tickets.filter(t=>t.status==='OPEN').length}</strong>
        </div>
        <div>
          <span>In progress</span>
          <strong>{tickets.filter(t=>t.status==='IN_PROGRESS').length}</strong>
        </div>
      </div>

      {!tickets.length ? (
        <section className="empty-state">
          <h2>No support tickets</h2>
          <p>Customer requests will appear here.</p>
        </section>
      ) : (
        <div className="order-history-list">
          {tickets.map(ticket=>(
            <article className="order-history-card" key={ticket.id}>
              <div className="order-history-top">
                <div>
                  <span className="eyebrow">
                    TICKET #{ticket.id.slice(-8).toUpperCase()}
                  </span>
                  <h2>{ticket.subject}</h2>
                  <p>{ticket.user.name||ticket.user.email||'Customer'}</p>
                  <p>{ticket.createdAt.toLocaleDateString('en-IN',{
                    timeZone:'Asia/Kolkata',
                    day:'numeric',
                    month:'long',
                    year:'numeric'
                  })}</p>
                </div>
                <strong>{ticket.status.replaceAll('_',' ')}</strong>
              </div>

              <p style={{
                marginTop:20,
                whiteSpace:'pre-wrap',
                overflowWrap:'anywhere'
              }}>
                {ticket.body}
              </p>

              {ticket.orderId&&(
                <p className="sample-label">
                  Related order: {ticket.orderId}
                </p>
              )}

              <AdminSupportConversation
                ticketId={ticket.id}
                initialStatus={ticket.status}
              />
            </article>
          ))}
        </div>
      )}

      <p className="sample-label" style={{marginTop:20}}>
        Showing up to 100 recent tickets.
      </p>
    </main>
  );
}
