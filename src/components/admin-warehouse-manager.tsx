'use client';

import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';

type Warehouse = { id:string; name:string; code:string };
type Product = {
  id:string;name:string;
  variants:{id:string;sku:string;name:string}[]
};

export function AdminWarehouseManager({demo}:{demo:boolean}) {
  const router=useRouter();
  const [warehouses,setWarehouses]=useState<Warehouse[]>([]);
  const [products,setProducts]=useState<Product[]>([]);
  const [name,setName]=useState('');
  const [code,setCode]=useState('');
  const [warehouseId,setWarehouseId]=useState('');
  const [variantId,setVariantId]=useState('');
  const [reorderPoint,setReorderPoint]=useState('5');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  async function load() {
    const response=await fetch('/api/admin/warehouses',{
      cache:'no-store'
    });
    if(!response.ok) throw new Error('Unable to load warehouses.');
    const data=await response.json();
    setWarehouses(data.warehouses);
    setProducts(data.products);
  }

  useEffect(()=>{
    if(!demo) load().catch(e=>setMessage(e.message));
  },[demo]);

  async function send(payload:unknown) {
    setBusy(true);
    setMessage('');
    try {
      const response=await fetch('/api/admin/warehouses',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
      const data=await response.json();
      if(!response.ok)
        throw new Error(data.error||'Operation failed.');
      setMessage('Warehouse operation completed.');
      await load();
      router.refresh();
    }catch(error){
      setMessage(error instanceof Error?error.message:'Operation failed.');
    }finally{
      setBusy(false);
    }
  }

  if(demo)return null;

  return (
    <section className="panel" style={{marginTop:24}}>
      <h3>Warehouse Management</h3>
      <p>Create warehouses and initialize SKU balances at zero stock.</p>

      <form style={{marginTop:20}} onSubmit={e=>{
        e.preventDefault();
        void send({action:'warehouse.create',name,code});
      }}>
        <h3>Create warehouse</h3>
        <div className="form-grid">
          <label className="field">
            Warehouse name
            <input required value={name}
              onChange={e=>setName(e.target.value)}/>
          </label>
          <label className="field">
            Warehouse code
            <input required value={code}
              onChange={e=>setCode(e.target.value)}/>
          </label>
        </div>
        <button className="button" disabled={busy}
          style={{marginTop:15}}>Create warehouse</button>
      </form>

      <form style={{marginTop:30}} onSubmit={e=>{
        e.preventDefault();
        void send({
          action:'balance.create',
          variantId,
          warehouseId,
          reorderPoint:Number(reorderPoint)
        });
      }}>
        <h3>Initialize inventory balance</h3>
        <div className="form-grid">
          <label className="field">
            Warehouse
            <select required value={warehouseId}
              onChange={e=>setWarehouseId(e.target.value)}>
              <option value="">Choose warehouse</option>
              {warehouses.map(w=><option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>)}
            </select>
          </label>

          <label className="field">
            Product variant
            <select required value={variantId}
              onChange={e=>setVariantId(e.target.value)}>
              <option value="">Choose SKU</option>
              {products.flatMap(p=>p.variants.map(v=>
                <option key={v.id} value={v.id}>
                  {p.name} · {v.sku}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Reorder point
            <input type="number" required min="0"
              value={reorderPoint}
              onChange={e=>setReorderPoint(e.target.value)}/>
          </label>
        </div>
        <button className="button" disabled={busy}
          style={{marginTop:15}}>Initialize balance</button>
      </form>

      <div className="table-wrap" style={{marginTop:30}}>
        <h3>Warehouses</h3>
        <table>
          <thead><tr><th>Name</th><th>Code</th></tr></thead>
          <tbody>{warehouses.map(w=><tr key={w.id}>
            <td>{w.name}</td><td>{w.code}</td>
          </tr>)}</tbody>
        </table>
      </div>

      {message&&<p role="status" style={{marginTop:20}}>
        {message}
      </p>}
    </section>
  );
}
