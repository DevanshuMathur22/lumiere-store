'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="empty-state"><h1>Something needs a little care.</h1><p>We couldn’t load this page. Please try again shortly.</p><button className="button" onClick={reset}>Try again</button></div>;}
