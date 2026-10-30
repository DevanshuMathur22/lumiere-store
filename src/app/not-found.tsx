import Link from 'next/link';
export default function NotFound(){return <div className="empty-state"><span className="eyebrow">A LITTLE DETOUR</span><h1 style={{marginTop:20}}>This corner is still quiet.</h1><p>We couldn’t find the page you were looking for.</p><Link href="/collections" className="button">Back to the collection →</Link></div>;}
