import { db } from '@/lib/db';
import {
  requireUser, sameOrigin, readJson,
  errorResponse, HttpError
} from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';
import { createProductSchema } from '@/modules/catalog/admin-schema';

const submissionSchema=createProductSchema.omit({
  active:true,
  featured:true
});

export async function GET() {
  try {
    const user=await requireUser();
    const seller=await db().sellerAccount.findUnique({
      where:{userId:user.id},
      select:{id:true,status:true}
    });
    if(!seller||seller.status!=='APPROVED')
      throw new HttpError(403,'Approved seller access required.');

    const products=await db().product.findMany({
      where:{sellerId:seller.id},
      select:{
        id:true,name:true,slug:true,active:true,
        createdAt:true,
        variants:{
          select:{id:true,sku:true,name:true,price:true},
          orderBy:{sku:'asc'}
        }
      },
      orderBy:{createdAt:'desc'},
      take:100
    });

    return Response.json({products},{
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
    await rateLimit(user.id,'seller-products',5);
    const input=submissionSchema.parse(await readJson(request));

    const product=await db().$transaction(async tx=>{
      const seller=await tx.sellerAccount.findUnique({
        where:{userId:user.id},
        select:{id:true,status:true}
      });

      if(!seller||seller.status!=='APPROVED')
        throw new HttpError(403,'Approved seller access required.');

      const category=await tx.category.findUnique({
        where:{slug:input.categorySlug},
        select:{id:true}
      });
      if(!category)
        throw new HttpError(404,'Category not found.');

      const created=await tx.product.create({
        data:{
          sellerId:seller.id,
          categoryId:category.id,
          name:input.name,
          slug:input.slug,
          description:input.description,
          material:input.material,
          image:input.image,
          active:false,
          featured:false,
          variants:{
            create:{
              sku:input.sku,
              name:input.variantName,
              price:input.price,
              currency:'INR'
            }
          }
        },
        select:{
          id:true,name:true,slug:true,active:true,
          sellerId:true
        }
      });

      await tx.auditLog.create({
        data:{
          actorId:user.id,
          action:'seller.product.submit',
          entityId:created.id,
          metadata:{
            sellerId:seller.id,
            sku:input.sku,
            status:'DRAFT'
          }
        }
      });

      return created;
    });

    return Response.json({product},{status:201});
  } catch(error) {
    if(
      error &&
      typeof error==='object' &&
      'code' in error &&
      error.code==='P2002'
    ) {
      return Response.json({
        error:'Product slug or SKU already exists.'
      },{status:409});
    }
    return errorResponse(error);
  }
}
