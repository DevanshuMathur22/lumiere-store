import { z } from 'zod';
import { db } from '@/lib/db';
import { requirePermission,sameOrigin,readJson,errorResponse,HttpError } from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';
const schema=z.object({ticketId:z.string().min(1).max(100),status:z.enum(['OPEN','IN_PROGRESS','RESOLVED'])});
export async function POST(request:Request){try{sameOrigin(request);const user=await requirePermission('crm.write');await rateLimit(user.id,'crm');const input=schema.parse(await readJson(request));await db().$transaction(async tx=>{const changed=await tx.supportTicket.updateMany({where:{id:input.ticketId},data:{status:input.status}});if(!changed.count)throw new HttpError(404,'Ticket not found.');await tx.auditLog.create({data:{actorId:user.id,action:'ticket.update',entityId:input.ticketId,metadata:{status:input.status}}});});return Response.json({ok:true});}catch(e){return errorResponse(e);}}
