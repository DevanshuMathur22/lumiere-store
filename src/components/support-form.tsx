'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type SupportOrder = {
  id: string;
  createdAt: string;
};

export function SupportForm({
  enabled,
  orders = [],
  selectedOrderId = ''
}: {
  enabled: boolean;
  orders?: SupportOrder[];
  selectedOrderId?: string;
}) {
  const router=useRouter();
  const [message,setMessage]=useState('');
  const [error,setError]=useState(false);
  const [busy,setBusy]=useState(false);

  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(busy)return;
    setBusy(true);
    setMessage('');
    setError(false);

    const form=e.currentTarget;
    const input=Object.fromEntries(new FormData(form));
    if(!input.orderId)delete input.orderId;

    try {
      const response=await fetch('/api/support',{
        method:'POST',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(input)
      });
      const result=await response.json();
      if(!response.ok)
        throw new Error(result.error||'Unable to submit request.');

      setMessage(`Support request created. Reference: ${result.id}`);
      form.reset();
      router.refresh();
    } catch(e) {
      setError(true);
      setMessage(e instanceof Error?e.message:'Unable to save request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        {orders.length>0&&(
          <label className="field wide">
            Related order (optional)
            <select name="orderId" defaultValue={
              orders.some(o=>o.id===selectedOrderId)
                ? selectedOrderId : ''
            } disabled={!enabled||busy}>
              <option value="">General enquiry · No order</option>
              {orders.map(order=>(
                <option key={order.id} value={order.id}>
                  Order #{order.id.slice(-8).toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="field wide">
          Subject
          <input name="subject" required minLength={5}
            maxLength={120} disabled={!enabled||busy}/>
        </label>

        <label className="field wide">
          How can we help?
          <textarea name="body" required minLength={10}
            maxLength={5000} rows={5} disabled={!enabled||busy}/>
        </label>
      </div>

      <button className="button" style={{marginTop:24}}
        disabled={!enabled||busy}>
        {busy?'Saving…':'Send care request'}
      </button>

      {message&&(
        <p role={error?'alert':'status'}>{message}</p>
      )}
    </form>
  );
}
