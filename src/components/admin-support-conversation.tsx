'use client';

import { useState } from 'react';

type Message={
  id:string;
  body:string;
  authorRole:string;
  createdAt:string;
};

export function AdminSupportConversation({
  ticketId,
  initialStatus
}:{
  ticketId:string;
  initialStatus:string;
}) {
  const [open,setOpen]=useState(false);
  const [status,setStatus]=useState(initialStatus);
  const [messages,setMessages]=useState<Message[]>([]);
  const [body,setBody]=useState('');
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const endpoint=`/api/admin/support/${encodeURIComponent(ticketId)}/messages`;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response=await fetch(endpoint,{
        credentials:'same-origin',
        cache:'no-store'
      });
      const data=await response.json();
      if(!response.ok)
        throw new Error(data.error||'Unable to load conversation.');
      setMessages(Array.isArray(data.messages)?data.messages:[]);
      if(data.ticket?.status)setStatus(data.ticket.status);
    } catch(e) {
      setError(e instanceof Error?e.message:'Unable to load messages.');
    } finally {
      setLoading(false);
    }
  }

  async function send(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(busy||status==='RESOLVED'||!body.trim())return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response=await fetch(endpoint,{
        method:'POST',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({body:body.trim()})
      });
      const data=await response.json();
      if(!response.ok)
        throw new Error(data.error||'Unable to send reply.');
      setBody('');
      setNotice('Reply sent.');
      await load();
    } catch(e) {
      setError(e instanceof Error?e.message:'Unable to send reply.');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(next:string) {
    if(busy||next===status)return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response=await fetch('/api/admin/crm',{
        method:'POST',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ticketId,status:next})
      });
      const data=await response.json();
      if(!response.ok)
        throw new Error(data.error||'Status update failed.');
      setStatus(next);
      setNotice('Ticket status updated.');
    } catch(e) {
      setError(e instanceof Error?e.message:'Status update failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{marginTop:22}}>
      <button type="button" className="text-link"
        onClick={()=>{
          if(open)setOpen(false);
          else {
            setOpen(true);
            void load();
          }
        }}
        aria-expanded={open}>
        {open?'Hide conversation':'Open ticket & reply'}
      </button>

      {open&&(
        <div style={{
          display:'grid',gap:18,
          border:'1px solid #d9d3c9',
          borderRadius:10,
          padding:20,
          marginTop:16
        }}>
          <div style={{
            display:'flex',
            justifyContent:'space-between',
            alignItems:'center',
            flexWrap:'wrap',
            gap:12
          }}>
            <h3 style={{margin:0}}>Conversation</h3>
            <button className="text-link" type="button"
              onClick={load} disabled={busy||loading}>
              Refresh
            </button>
          </div>

          <label className="field">
            Ticket Status
            <select value={status}
              disabled={busy||loading}
              onChange={e=>void changeStatus(e.target.value)}>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </label>

          {error&&<p role="alert" className="notice error">{error}</p>}
          {notice&&<p role="status" className="notice">{notice}</p>}
          {loading&&<p role="status">Loading conversation…</p>}

          {!loading&&messages.length===0&&(
            <p>No follow-up messages yet.</p>
          )}

          {messages.map(message=>(
            <div key={message.id} style={{
              background:message.authorRole==='STAFF'
                ? '#f0ede5':'#f6f7f1',
              border:'1px solid #e1ddd5',
              borderRadius:9,
              padding:16
            }}>
              <strong>
                {message.authorRole==='STAFF'?'Support Team':'Customer'}
              </strong>
              <p style={{fontSize:12,marginTop:5}}>
                {new Date(message.createdAt).toLocaleString('en-IN',{
                  timeZone:'Asia/Kolkata'
                })}
              </p>
              <p style={{
                whiteSpace:'pre-wrap',
                overflowWrap:'anywhere',
                marginTop:12
              }}>{message.body}</p>
            </div>
          ))}

          {status==='RESOLVED'?(
            <p className="notice">
              Ticket resolved. Change status to reopen replies.
            </p>
          ):(
            <form onSubmit={send} style={{display:'grid',gap:12}}>
              <label className="field">
                Reply to customer
                <textarea rows={4} required maxLength={5000}
                  value={body}
                  disabled={busy}
                  onChange={e=>setBody(e.target.value)}
                  placeholder="Write your response…"/>
              </label>
              <button className="button" type="submit"
                disabled={busy||!body.trim()}>
                {busy?'Sending…':'Send Reply'}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
