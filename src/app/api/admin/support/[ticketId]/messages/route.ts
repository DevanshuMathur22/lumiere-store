import { z } from 'zod';
import { db } from '@/lib/db';
import { requirePermission, sameOrigin, readJson, errorResponse, HttpError } from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';

type Context = { params: Promise<{ ticketId: string }> };
const inputSchema = z.object({ body: z.string().trim().min(1).max(5000) });

export async function GET(_request: Request, context: Context) {
  try {
    await requirePermission('crm.read');
    const { ticketId } = await context.params;
    const ticket = await db().supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true, userId: true, orderId: true,
        subject: true, body: true, status: true
      }
    });
    if (!ticket) throw new HttpError(404, 'Ticket not found.');

    const messages = await db().supportMessage.findMany({
      where: { ticketId: ticket.id },
      select: { id: true, body: true, authorRole: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100
    });

    return Response.json({ ticket, messages: messages.reverse() }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const user = await requirePermission('crm.write');
    await rateLimit(user.id, 'crm');
    const { ticketId } = await context.params;
    const { body } = inputSchema.parse(await readJson(request));

    const message = await db().$transaction(async tx => {
      const ticket = await tx.supportTicket.findUnique({
        where: { id: ticketId },
        select: { id: true, status: true }
      });
      if (!ticket) throw new HttpError(404, 'Ticket not found.');
      if (ticket.status === 'RESOLVED')
        throw new HttpError(409, 'This ticket is resolved.');

      const saved = await tx.supportMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: user.id,
          authorRole: 'STAFF',
          body
        },
        select: { id: true, createdAt: true }
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'ticket.reply',
          entityId: ticket.id,
          metadata: { messageId: saved.id }
        }
      });
      return saved;
    });

    return Response.json({ message }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
