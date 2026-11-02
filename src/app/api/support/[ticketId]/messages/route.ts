import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser, sameOrigin, readJson, errorResponse, HttpError } from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';

type Context = { params: Promise<{ ticketId: string }> };
const inputSchema = z.object({ body: z.string().trim().min(1).max(5000) });

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { ticketId } = await context.params;
    const ticket = await db().supportTicket.findFirst({
      where: { id: ticketId, userId: user.id },
      select: { id: true, subject: true, status: true }
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
    const user = await requireUser();
    await rateLimit(user.id, 'support', 10);
    const { ticketId } = await context.params;
    const { body } = inputSchema.parse(await readJson(request));

    const ticket = await db().supportTicket.findFirst({
      where: { id: ticketId, userId: user.id },
      select: { id: true, status: true }
    });
    if (!ticket) throw new HttpError(404, 'Ticket not found.');
    if (ticket.status === 'RESOLVED')
      throw new HttpError(409, 'This ticket is resolved.');

    const message = await db().supportMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: user.id,
        authorRole: 'CUSTOMER',
        body
      },
      select: { id: true, createdAt: true }
    });

    return Response.json({ message }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
