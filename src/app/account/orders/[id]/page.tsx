import { redirect,notFound } from 'next/navigation';
import { auth,authConfigured } from '@/lib/auth';
import { db } from '@/lib/db';
import { money } from '@/lib/money';
export const dynamic='force-dynamic';
export default async function Order({params}:{params:Promise<{id:string}>}){if(!authConfigured)redirect('/login');const session=await auth();if(!session?.user?.id)redirect('/login');const {id}=await params;const order=await db().order.findFirst({where:{id,userId:session.user.id},include:{items:true,payment:true}});if(!order)notFound();return <div className="prose"><span className="eyebrow">ORDER {order.id.slice(-8).toUpperCase()}</span><h1>Your considered collection.</h1><div className="notice">{order.status.replaceAll('_',' ')} · Payment {order.payment?.status.toLowerCase().replaceAll('_',' ')||'pending'}</div>{order.items.map(i=><div className="summary-line" key={i.id}><span>{i.productName} × {i.quantity}</span><span>{money(i.unitPrice*i.quantity)}</span></div>)}<div className="summary-line"><span>Delivery</span><span>{money(order.shipping)}</span></div><div className="summary-line total"><span>Total</span><span>{money(order.total)}</span></div></div>;}
