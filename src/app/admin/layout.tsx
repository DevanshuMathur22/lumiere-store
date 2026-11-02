import { auth as sellerNavAuth } from '@/lib/auth';
import { db as sellerNavDb } from '@/lib/db';
import Link from 'next/link';
import { LayoutDashboard, Package, Warehouse, ShoppingBag, Users, MessagesSquare, ChartNoAxesCombined, ShieldCheck } from 'lucide-react';
import { requirePermission, HttpError } from '@/lib/security';
import { redirect } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function AdminLayout({children}:{children:React.ReactNode}) {if(process.env.DATABASE_URL){try{await requirePermission('admin.access');}catch(e){if(e instanceof HttpError&&e.status===401)redirect('/login');return <div className="prose"><h1>Studio access required.</h1><p>Sign in with an authorized staff account. Store administrators manage access through database-backed roles.</p><Link className="button" href="/login">Sign in</Link></div>;}}const sellerNavSession=process.env.DATABASE_URL
  ? await sellerNavAuth()
  : null;
const sellerNavRole=sellerNavSession?.user?.id
  ? await sellerNavDb().userRole.findFirst({
      where:{
        userId:sellerNavSession.user.id,
        role:{name:'Super Admin'}
      },
      select:{userId:true}
    })
  : null;
const nav=[['Overview','/admin',LayoutDashboard],['Products','/admin/products',Package],['Inventory','/admin/inventory',Warehouse],['Orders','/admin/orders',ShoppingBag],['Customers','/admin/customers',Users],['Customer care','/admin/crm',MessagesSquare],['Analytics','/admin/analytics',ChartNoAxesCombined],['Staff & roles','/admin/staff',ShieldCheck]] as const;return <div className="admin-layout"><aside className="admin-sidebar"><h3>The studio</h3><span className="eyebrow">LUMIÈRE COMMERCE</span>{nav.map(([name,href,Icon])=><Link key={href} href={href}><Icon size={17} strokeWidth={1.5}/>{name}</Link>)}
    {sellerNavRole&&(
      <Link href="/admin/sellers">
        <ShieldCheck size={17} strokeWidth={1.5}/>
        Seller Management
      </Link>
    )}
    </aside><div className="admin-main">{children}</div></div>;}
