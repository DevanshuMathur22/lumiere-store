import { z } from 'zod';
import { db } from '@/lib/db';
import {
  requireUser, sameOrigin, readJson,
  errorResponse, HttpError
} from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';

const schema=z.object({
  businessName:z.string().trim().min(3).max(120)
}).strict();

export async function GET() {
  try {
    const user=await requireUser();
    const seller=await db().sellerAccount.findUnique({
      where:{userId:user.id},
      select:{
        id:true,
        businessName:true,
        status:true,
        createdAt:true,
        reviewedAt:true
      }
    });

    return Response.json({seller},{
      headers:{'Cache-Control':'no-store'}
    });
  } catch(error) {
    return errorResponse(error);
  }
}

export async function POST(request:Request) {
  try {
    sameOrigin(request);
    const user=await requireUser();
    await rateLimit(user.id,'seller-register',5);

    const input=schema.parse(await readJson(request));

    const existing=await db().sellerAccount.findUnique({
      where:{userId:user.id},
      select:{id:true}
    });

    if(existing)
      throw new HttpError(409,'Seller application already exists.');

    const seller=await db().$transaction(async tx=>{
      const created=await tx.sellerAccount.create({
        data:{
          userId:user.id,
          businessName:input.businessName,
          status:'PENDING'
        },
        select:{
          id:true,
          businessName:true,
          status:true,
          createdAt:true
        }
      });

      await tx.auditLog.create({
        data:{
          actorId:user.id,
          action:'seller.apply',
          entityId:created.id,
          metadata:{businessName:created.businessName}
        }
      });

      return created;
    });

    return Response.json({seller},{status:201});
  } catch(error) {
    return errorResponse(error);
  }
}
