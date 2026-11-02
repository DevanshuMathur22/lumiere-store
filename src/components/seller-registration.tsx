'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SellerRegistration() {
  const router=useRouter();
  const [businessName,setBusinessName]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(busy)return;
    setBusy(true);
    setError('');
    try {
      const response=await fetch('/api/seller/register',{
        method:'POST',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({businessName:businessName.trim()})
      });
      const result=await response.json();
      if(!response.ok)
        throw new Error(result.error||'Application failed.');
      router.refresh();
    } catch(e) {
      setError(e instanceof Error?e.message:'Unable to register.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="order-detail-panel"
      style={{maxWidth:650,display:'grid',gap:20}}>
      <h2>Register your business</h2>
      <p>Submit your business name for review by LUMIÈRE.</p>
      <label className="field">
        Business name
        <input value={businessName}
          onChange={e=>setBusinessName(e.target.value)}
          required minLength={3} maxLength={120}
          autoComplete="organization"
          disabled={busy}
          placeholder="Enter registered business name"/>
      </label>
      {error&&<p role="alert" className="notice error">{error}</p>}
      <button className="button" type="submit"
        disabled={busy||businessName.trim().length<3}>
        {busy?'Submitting…':'Apply to Become a Seller'}
      </button>
    </form>
  );
}
