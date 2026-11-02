import { z } from 'zod';
import { db } from '@/lib/db';
import {
  requireUser,sameOrigin,readJson,errorResponse,HttpError
} from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';

const schema=z.object({
  productId:z.string().min(1).max(100),
  action:z.enum(['APPROVE','REJECT','PUBLISH','UNPUBLISH'])
}).strict();

async function superAdmin() {
  const user=await requireUser();
  const grant=await db().userRole.findFirst({
    where:{userId:user.id,role:{name:'Super Admin'}},
    select:{userId:true}
  });
  if(!grant)throw new HttpError(403,'Super Admin access required.');
  return user;
}

export async function GET() {
  try {
    await superAdmin();
    const products=await db().product.findMany({
      where:{sellerId:{not:null}},
      select:{
        id:true,name:true,slug:true,active:true,
        reviewStatus:true,createdAt:true,reviewedAt:true,
        seller:{
          select:{id:true,businessName:true,status:true}
        },
        category:{select:{name:true}},
        variants:{select:{sku:true,price:true}}
      },
      orderBy:{createdAt:'desc'},
      take:100
    });
    return Response.json({products},{
      headers:{'Cache-Control':'no-store'}
    });
  }catch(error){
    return errorResponse(error);
  }
}

export async function PATCH(request:Request) {
  try {
    sameOrigin(request);
    const actor=await superAdmin();
    await rateLimit(actor.id,'seller-product-review',20);
    const input=schema.parse(await readJson(request));

    const result=await db().$transaction(async tx=>{
      const current=await tx.product.findUnique({
        where:{id:input.productId},
        select:{
          id:true,sellerId:true,reviewStatus:true,active:true,
          seller:{select:{status:true}}
        }
      });

      if(!current||!current.sellerId)
        throw new HttpError(404,'Seller product not found.');

      if(input.action==='APPROVE'&&
        current.reviewStatus!=='PENDING')
        throw new HttpError(409,'Only pending products can be approved.');

      if(input.action==='REJECT'&&
        !['PENDING','APPROVED'].includes(current.reviewStatus))
        throw new HttpError(409,'Product cannot be rejected.');

      if(input.action==='PUBLISH'&&
        (current.reviewStatus!=='APPROVED'||
         current.seller?.status!=='APPROVED'))
        throw new HttpError(409,'Product and seller approval required.');

      if(input.action==='UNPUBLISH'&&!current.active)
        throw new HttpError(409,'Product is already unpublished.');

      const data=
        input.action==='APPROVE'
          ? {reviewStatus:'APPROVED',reviewedById:actor.id,
             reviewedAt:new Date(),active:false}
        : input.action==='REJECT'
          ? {reviewStatus:'REJECTED',reviewedById:actor.id,
             reviewedAt:new Date(),active:false}
        : {active:input.action==='PUBLISH'};

      const changed=await tx.product.updateMany({
        where:{
          id:current.id,
          sellerId:current.sellerId,
          reviewStatus:current.reviewStatus,
          active:current.active,
          ...(input.action==='PUBLISH'&&{
            seller:{is:{status:'APPROVED'}}
          })
        },
        data
      });

      if(changed.count!==1)
        throw new HttpError(409,'Product changed. Refresh and retry.');

      await tx.auditLog.create({
        data:{
          actorId:actor.id,
          action:'seller.product.'+input.action.toLowerCase(),
          entityId:current.id,
          metadata:{
            sellerId:current.sellerId,
            previousReviewStatus:current.reviewStatus,
            previousActive:current.active
          }
        }
      });

      return tx.product.findUnique({
        where:{id:current.id},
        select:{
          id:true,reviewStatus:true,active:true
        }
      });
    });

    return Response.json({product:result});
  }catch(error){
    return errorResponse(error);
  }
}
