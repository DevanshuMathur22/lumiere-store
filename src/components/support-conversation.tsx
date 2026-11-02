'use client';

import { useState } from 'react';

type Message = {
  id: string;
  body: string;
  authorRole: string;
  createdAt: string;
};

export function SupportConversation({
  ticketId,
  status
}: {
  ticketId: string;
  status: string;
}) {
  const [open,setOpen]=useState(false);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [messages,setMessages]=useState<Message[]>([]);
  const [body,setBody]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const endpoint=`/api/support/${encodeURIComponent(ticketId)}/messages`;

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
    } catch(e) {
      setError(e instanceof Error?e.message:'Unable to load messages.');
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    if(open){
      setOpen(false);
      return;
    }
    setOpen(true);
    await load();
  }

  async function send(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(busy||!body.trim()||status==='RESOLVED')return;
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
        throw new Error(data.error||'Unable to send message.');
      setBody('');
      setNotice('Reply sent successfully.');
      await load();
    } catch(e) {
      setError(e instanceof Error?e.message:'Unable to send reply.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{marginTop:20}}>
      <button type="button" className="text-link"
        onClick={toggle} aria-expanded={open}>
        {open?'Hide conversation':'View conversation & reply'}
      </button>

      {open&&(
        <div style={{
          marginTop:18,
          padding:18,
          border:'1px solid #d9d3c9',
          borderRadius:10,
          display:'grid',
          gap:15
        }}>
          <div style={{
            display:'flex',
            justifyContent:'space-between',
            alignItems:'center',
            gap:12
          }}>
            <h3 style={{margin:0}}>Conversation</h3>
            <button type="button" className="text-link"
              onClick={load} disabled={loading||busy}>
              Refresh
            </button>
          </div>

          {loading&&<p role="status">Loading messages…</p>}
          {error&&<p role="alert" className="notice error">{error}</p>}
          {notice&&<p role="status" className="notice">{notice}</p>}

          {!loading&&messages.length===0&&(
            <p>No follow-up messages yet.</p>
          )}

          {messages.map(message=>(
            <div key={message.id} style={{
              padding:15,
              borderRadius:9,
              background:message.authorRole==='STAFF'
                ? '#f0ede5':'#f6f7f1',
              border:'1px solid #e1ddd5'
            }}>
              <strong style={{fontFamily:'Arial,sans-serif',fontSize:13}}>
                {message.authorRole==='STAFF'
                  ? 'LUMIÈRE Support':'You'}
              </strong>
              <span style={{marginLeft:12,fontSize:12}}>
                {new Date(message.createdAt).toLocaleString(
                  'en-IN',{timeZone:'Asia/Kolkata'}
                )}
              </span>
              <p style={{
                whiteSpace:'pre-wrap',
                overflowWrap:'anywhere',
                margin:'10px 0 0'
              }}>
                {message.body}
              </p>
            </div>
          ))}

          {status==='RESOLVED'?(
            <p className="notice">
              This ticket is resolved. Replies are closed.
            </p>
          ):(
            <form onSubmit={send} style={{display:'grid',gap:12}}>
              <label className="field">
                Your reply
                <textarea value={body}
                  onChange={e=>setBody(e.target.value)}
                  minLength={1}
                  maxLength={5000}
                  rows={4}
                  required
                  disabled={busy}
                  placeholder="Write your follow-up message…"/>
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
