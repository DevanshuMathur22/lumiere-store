import { z } from 'zod';
import { db } from '@/lib/db';
import { requirePermission,sameOrigin,readJson,errorResponse,HttpError } from '@/lib/security';
import { canTransition } from '@/modules/orders/policy';
import { rateLimit } from '@/lib/rate-limit';
const schema=z.object({orderId:z.string().min(1).max(100),status:z.enum(['PROCESSING','PACKED','SHIPPED','DELIVERED'])});
export async function POST(request:Request){try{sameOrigin(request);const user=await requirePermission('orders.fulfill');await rateLimit(user.id,'orders');const input=schema.parse(await readJson(request));await db().$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${input.orderId} FOR UPDATE`;const order=await tx.order.findUnique({where:{id:input.orderId},include:{payment:true}});if(!order)throw new HttpError(404,'Order not found.');if(order.payment?.status!=='CAPTURED'||!canTransition(order.status,input.status))throw new HttpError(409,'This status transition is not allowed.');await tx.order.update({where:{id:order.id},data:{status:input.status}});await tx.auditLog.create({data:{actorId:user.id,action:'order.fulfill',entityId:order.id,metadata:{from:order.status,to:input.status}}});});return Response.json({ok:true});}catch(e){return errorResponse(e);}}
