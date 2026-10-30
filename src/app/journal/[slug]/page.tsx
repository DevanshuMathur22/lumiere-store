import { articles } from '@/modules/catalog/journal';
import { notFound } from 'next/navigation';
export default async function Article({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const a=articles.find(a=>a.slug===slug);if(!a)notFound();return <article className="prose"><span className="eyebrow">THE JOURNAL · {a.category}</span><h1>{a.title}</h1><p>{a.intro}</p><img src={a.image} alt={a.title}/>{a.body.map(p=><p key={p}>{p}</p>)}</article>;}
