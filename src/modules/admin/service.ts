import 'server-only';
import { db } from '@/lib/db';
import { sampleProducts } from '@/modules/catalog/sample';
import { requirePermission } from '@/lib/security';
export const sections = ['products','inventory','orders','customers','crm','analytics','staff'] as const;
export type Section = typeof sections[number];
export const sectionPermissions: Record<Section,string> = {products:'products.read',inventory:'inventory.read',orders:'orders.read',customers:'customers.read',crm:'crm.read',analytics:'reports.read',staff:'staff.read'};
export async function overview() {
  if(!process.env.DATABASE_URL) return {demo:true,revenue:1248000,orders:34,customers:128,lowStock:2,bars:[28,42,35,58,47,72,90], recent:[{id:'LM-1048',customer:'Aarav S.',total:578000,status:'CONFIRMED'},{id:'LM-1047',customer:'Priya M.',total:899000,status:'PROCESSING'},{id:'LM-1046',customer:'Ananya K.',total:349000,status:'SHIPPED'}]};
  await requirePermission('reports.read');
  const since=new Date(Date.now()-30*86400000);
  const [revenue,orders,customers,balances,recent,payments]=await Promise.all([db().payment.aggregate({where:{status:'CAPTURED',capturedAt:{gte:since}},_sum:{amount:true}}),db().order.count({where:{createdAt:{gte:since}}}),db().user.count(),db().inventoryBalance.findMany(),db().order.findMany({take:8,orderBy:{createdAt:'desc'},include:{user:true}}),db().payment.findMany({where:{status:'CAPTURED',capturedAt:{gte:new Date(Date.now()-7*86400000)}},select:{amount:true,capturedAt:true}})]);
  const bars=Array.from({length:7},(_,i)=>{const start=Date.now()-(7-i)*86400000;return payments.filter(p=>p.capturedAt&&p.capturedAt.getTime()>=start&&p.capturedAt.getTime()<start+86400000).reduce((sum,p)=>sum+p.amount,0);});
  return {demo:false,revenue:revenue._sum.amount||0,orders,customers,lowStock:balances.filter(b=>b.onHand-b.reserved<=b.reorderPoint).length,bars,recent:recent.map(o=>({id:o.id,customer:o.user.name||'Customer',total:o.total,status:o.status}))};
}
export type AdminTable={columns:string[];rows:string[][];demo:boolean};
export async function sectionTable(section:Section):Promise<AdminTable>{
  const demo=!process.env.DATABASE_URL;
  if(!demo)await requirePermission(sectionPermissions[section]);
  switch(section){
    case 'products': {const rows=demo?sampleProducts.map(p=>[p.name,p.sku,p.category,`₹${p.price/100}`,'Sample']):(await db().productVariant.findMany({include:{product:{include:{category:true}}},take:100,orderBy:{sku:'asc'}})).map(v=>[v.product.name,v.sku,v.product.category.name,`₹${v.price/100}`,v.product.active?'Active':'Draft']);return{columns:['Product','SKU','Category','Price','Status'],rows,demo};}
    case 'inventory': {const rows=demo?sampleProducts.map(p=>[p.name,p.sku,'Main studio',`${p.stock}`,'0',`${p.stock}`]):(await db().inventoryBalance.findMany({include:{variant:{include:{product:true}},warehouse:true},take:100,orderBy:{id:'asc'}})).map(b=>[b.variant.product.name,b.variant.sku,b.warehouse.name,`${b.onHand}`,`${b.reserved}`,`${b.onHand-b.reserved}`]);return{columns:['Product','SKU','Warehouse','On hand','Reserved','Available'],rows,demo};}
    case 'orders': {const rows=demo?[['LM-1048','Aarav S.','₹5,780','CONFIRMED'],['LM-1047','Priya M.','₹8,990','PROCESSING'],['LM-1046','Ananya K.','₹3,490','SHIPPED']]:(await db().order.findMany({include:{user:true},take:100,orderBy:{createdAt:'desc'}})).map(o=>[o.id,o.user.name||'Customer',`₹${o.total/100}`,o.status]);return{columns:['Order','Customer','Total','Status'],rows,demo};}
    case 'customers': {const rows=demo?[['Aarav S.','Illustrative customer','3'],['Priya M.','Illustrative customer','2']]:(await db().user.findMany({include:{_count:{select:{orders:true}}},take:100,orderBy:{createdAt:'desc'}})).map(u=>[u.name||'Customer',u.email||'—',`${u._count.orders}`]);return{columns:['Customer','Email','Orders'],rows,demo};}
    case 'crm': {const rows=demo?[['T-001','Product care question','OPEN','Sample customer'],['T-002','Delivery enquiry','OPEN','Sample customer']]:(await db().supportTicket.findMany({include:{user:true},take:100,orderBy:{createdAt:'desc'}})).map(t=>[t.id,t.subject,t.status,t.user.name||'Customer']);return{columns:['Ticket','Subject','Status','Customer'],rows,demo};}
    case 'staff': {const rows=demo?[['Operations Manager','orders.fulfill · inventory.adjust'],['Customer Support','customers.read · crm.write'],['Catalog Manager','products.read · products.write']]:(await db().role.findMany({include:{permissions:{include:{permission:true}}},orderBy:{name:'asc'}})).map(r=>[r.name,r.permissions.map(p=>p.permission.key).join(' · ')]);return{columns:['Role','Permissions'],rows,demo};}
    case 'analytics':{const data=await overview();return{columns:['Metric','Value','Definition'],rows:[['Captured receipts',`₹${data.revenue/100}`,'Last 30 days; includes shipping, before refunds'],['Orders',`${data.orders}`,'Created in last 30 days; includes pending'],['Customers',`${data.customers}`,'All registered accounts'],['Low stock',`${data.lowStock}`,'Available balance ≤ reorder point']],demo};}
  }
}
