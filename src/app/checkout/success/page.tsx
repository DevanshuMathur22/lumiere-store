import { redirect } from 'next/navigation';
export default async function Success({searchParams}:{searchParams:Promise<{order?:string}>}){const {order}=await searchParams;redirect(order?`/account/orders/${encodeURIComponent(order)}`:'/account');}
