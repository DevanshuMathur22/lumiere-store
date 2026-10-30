import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { sampleProducts } from '../src/modules/catalog/sample';
const url=new URL(process.env.DATABASE_URL||'postgresql://localhost/lumiere_dev');
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.pathname!=='/lumiere_dev'||process.env.SEED_LOCAL!=='true')throw new Error('Seed only supports a local lumiere_dev database with SEED_LOCAL=true.');
const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:url.toString()})});
async function main(){
 const warehouse=await prisma.warehouse.upsert({where:{code:'MAIN'},update:{},create:{code:'MAIN',name:'Main studio'}});
 for(const p of sampleProducts){const category=await prisma.category.upsert({where:{slug:p.categorySlug},update:{},create:{slug:p.categorySlug,name:p.category}});const product=await prisma.product.upsert({where:{slug:p.slug},update:{},create:{name:p.name,slug:p.slug,description:p.description,material:p.material,image:p.image,active:true,featured:p.featured,categoryId:category.id}});const variant=await prisma.productVariant.upsert({where:{sku:p.sku},update:{},create:{id:p.id,sku:p.sku,productId:product.id,name:'Natural',price:p.price}});await prisma.$transaction(async tx=>{const existing=await tx.inventoryBalance.findUnique({where:{variantId_warehouseId:{variantId:variant.id,warehouseId:warehouse.id}}});if(!existing){await tx.inventoryBalance.create({data:{variantId:variant.id,warehouseId:warehouse.id,onHand:p.stock}});await tx.inventoryMovement.create({data:{variantId:variant.id,warehouseId:warehouse.id,delta:p.stock,reason:'LOCAL_DEMO_SEED'}});}});}
 const all=['admin.access','products.read','products.write','inventory.read','inventory.adjust','orders.read','orders.fulfill','customers.read','crm.read','crm.write','reports.read','staff.read','staff.manage'];
 const roles:Record<string,string[]>={'Super Admin':all,'Operations Manager':['admin.access','inventory.read','inventory.adjust','orders.read','orders.fulfill','reports.read'],'Catalog Manager':['admin.access','products.read','products.write'],'Customer Support':['admin.access','customers.read','orders.read','crm.read','crm.write'],'Marketing Manager':['admin.access','reports.read','products.read']};
 for(const [name,keys] of Object.entries(roles)){const role=await prisma.role.upsert({where:{name},update:{},create:{name}});for(const key of keys){const permission=await prisma.permission.upsert({where:{key},update:{},create:{key}});await prisma.rolePermission.upsert({where:{roleId_permissionId:{roleId:role.id,permissionId:permission.id}},update:{},create:{roleId:role.id,permissionId:permission.id}});}}
 console.log('Local sample catalog and role definitions seeded. No staff assignments or customer accounts were created.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
