'use client';

import { useCallback, useEffect, useState } from 'react';

type Seller={
  id:string;
  businessName:string;
  status:string;
  createdAt:string;
  reviewedAt:string|null;
  user:{name:string|null;email:string|null};
  _count:{products:number};
};

const transitions:Record<string,{label:string;value:string}[]>={
  PENDING:[
    {label:'Approve',value:'APPROVED'},
    {label:'Reject',value:'REJECTED'}
  ],
  APPROVED:[{label:'Suspend',value:'SUSPENDED'}],
  SUSPENDED:[{label:'Restore approval',value:'APPROVED'}]
};

export function AdminSellerManager() {
  const [sellers,setSellers]=useState<Seller[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const load=useCallback(async()=>{
    const response=await fetch('/api/admin/sellers',{
      credentials:'same-origin',cache:'no-store'
    });
    const result=await response.json();
    if(!response.ok)
      throw new Error(result.error||'Unable to load sellers.');
    setSellers(result.sellers);
  },[]);

  useEffect(()=>{
    let active=true;
    load().catch(e=>{
      if(active)setError(e instanceof Error?e.message:'Load failed.');
    }).finally(()=>{
      if(active)setLoading(false);
    });
    return()=>{active=false;};
  },[load]);

  async function review(seller:Seller,status:string) {
    if(busy)return;
    setBusy(seller.id);
    setError('');
    setNotice('');
    try {
      const response=await fetch('/api/admin/sellers',{
        method:'PATCH',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({sellerId:seller.id,status})
      });
      const result=await response.json();
      if(!response.ok)
        throw new Error(result.error||'Review failed.');
      await load();
      setNotice('Seller status updated.');
    } catch(e) {
      setError(e instanceof Error?e.message:'Review failed.');
    } finally {
      setBusy('');
    }
  }

  return <section style={{display:'grid',gap:18}}>
    {error&&<p role="alert" className="notice error">{error}</p>}
    {notice&&<p role="status" className="notice">{notice}</p>}
    {loading?<p>Loading applications…</p>:
      sellers.length===0?<p>No seller applications yet.</p>:
      sellers.map(seller=>(
        <article key={seller.id} className="order-history-card">
          <div className="order-history-top">
            <div>
              <h2>{seller.businessName}</h2>
              <p>{seller.user.name||'Applicant'}</p>
              <p>{seller.user.email||'No email'}</p>
              <p>{new Date(seller.createdAt).toLocaleDateString(
                'en-IN',{timeZone:'Asia/Kolkata'}
              )}</p>
            </div>
            <strong>{seller.status.replaceAll('_',' ')}</strong>
          </div>
          <p style={{marginTop:16}}>
            {seller._count.products} products
          </p>
          <div style={{
            display:'flex',gap:12,flexWrap:'wrap',marginTop:18
          }}>
            {(transitions[seller.status]||[]).map(action=>(
              <button key={action.value}
                type="button"
                className="button"
                disabled={Boolean(busy)}
                onClick={()=>review(seller,action.value)}>
                {busy===seller.id?'Updating…':action.label}
              </button>
            ))}
          </div>
        </article>
      ))
    }
  </section>;
}
