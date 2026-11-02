import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser,sameOrigin,readJson,errorResponse,HttpError } from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';
const schema=z.object({subject:z.string().trim().min(5).max(120),body:z.string().trim().min(10).max(5000),orderId:z.string().min(1).max(100).optional()});
export async function POST(request:Request){try{sameOrigin(request);const user=await requireUser();await rateLimit(user.id,'support',5);const input=schema.parse(await readJson(request));if(input.orderId){
      const order=await db().order.findFirst({
        where:{id:input.orderId,userId:user.id},
        select:{id:true}
      });
      if(!order)throw new HttpError(400,'Invalid order selection.');
    }
    const ticket=await db().supportTicket.create({
      data:{...input,userId:user.id}
    });return Response.json({id:ticket.id},{status:201});}catch(e){return errorResponse(e);}}


export async function GET() {
  try {
    const user = await requireUser();
    const tickets = await db().supportTicket.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        subject: true,
        body: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return Response.json({ tickets }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
