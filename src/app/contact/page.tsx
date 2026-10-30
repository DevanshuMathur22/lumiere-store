import Link from 'next/link';
import { auth,authConfigured } from '@/lib/auth';
import { SupportForm } from '@/components/support-form';
export const dynamic='force-dynamic';
export default async function Contact(){const session=authConfigured?await auth():null;return <div className="prose"><span className="eyebrow">CONTACT & CARE</span><h1>A little help, with care.</h1><p>Have a question about an object or an order? Send a care request from your account.</p>{!session?.user&&<div className="notice">{authConfigured?<Link href="/login">Sign in to contact the studio →</Link>:'Customer support will open when account sign-in is connected.'}</div>}<SupportForm enabled={Boolean(session?.user)}/></div>;}
