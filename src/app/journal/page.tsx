import Link from 'next/link';
import { articles } from '@/modules/catalog/journal';
export default function Journal(){return <div className="section"><span className="eyebrow">NOTES ON CONSIDERED LIVING</span><h1 style={{marginTop:18}}>The journal.</h1><div className="journal-grid">{articles.map(a=><Link href={`/journal/${a.slug}`} key={a.slug}><img src={a.image} alt={a.title}/><span className="eyebrow">{a.category}</span><h2>{a.title}</h2><p>{a.intro}</p></Link>)}</div></div>;}
