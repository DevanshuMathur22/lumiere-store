import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser, sameOrigin, readJson, errorResponse, HttpError } from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';

const schema=z.object({
  sellerId:z.string().min(1).max(100),
  status:z.enum(['APPROVED','REJECTED','SUSPENDED'])
}).strict();

async function requireSuperAdmin() {
  const user=await requireUser();
  const role=await db().userRole.findFirst({
    where:{userId:user.id,role:{name:'Super Admin'}},
    select:{userId:true}
  });
  if(!role)throw new HttpError(403,'Super Admin access required.');
  return user;
}

export async function GET() {
  try {
    await requireSuperAdmin();
    const sellers=await db().sellerAccount.findMany({
      select:{
        id:true,businessName:true,status:true,createdAt:true,
        reviewedAt:true,
        user:{select:{name:true,email:true}},
        _count:{select:{products:true}}
      },
      orderBy:{createdAt:'desc'},
      take:100
    });
    return Response.json({sellers},{
      headers:{'Cache-Control':'no-store'}
    });
  } catch(error) {
    return errorResponse(error);
  }
}

export async function PATCH(request:Request) {
  try {
    sameOrigin(request);
    const actor=await requireSuperAdmin();
    await rateLimit(actor.id,'seller-review',20);
    const input=schema.parse(await readJson(request));

    const transitions:Record<string,string[]>={
      PENDING:['APPROVED','REJECTED'],
      APPROVED:['SUSPENDED'],
      SUSPENDED:['APPROVED']
    };

    const seller=await db().$transaction(async tx=>{
      const current=await tx.sellerAccount.findUnique({
        where:{id:input.sellerId},
        select:{id:true,status:true}
      });
      if(!current)throw new HttpError(404,'Seller not found.');
      if(!transitions[current.status]?.includes(input.status))
        throw new HttpError(409,'Seller status transition not allowed.');

      const changed=await tx.sellerAccount.updateMany({
        where:{id:input.sellerId,status:current.status},
        data:{
          status:input.status,
          reviewedById:actor.id,
          reviewedAt:new Date()
        }
      });
      if(changed.count!==1)
        throw new HttpError(409,'Seller status changed. Refresh and retry.');

      await tx.auditLog.create({
        data:{
          actorId:actor.id,
          action:'seller.review',
          entityId:current.id,
          metadata:{from:current.status,to:input.status}
        }
      });
      return tx.sellerAccount.findUnique({
        where:{id:current.id},
        select:{id:true,status:true}
      });
    });

    return Response.json({seller});
  } catch(error) {
    return errorResponse(error);
  }
}
