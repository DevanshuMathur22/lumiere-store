'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Category = { id: string; name: string; slug: string };
type Variant = {
  id: string; sku: string; name: string; price: number
};
type Product = {
  id: string; name: string; variants: Variant[]
};

export function AdminCatalogOperations({demo}:{demo:boolean}) {
  const router = useRouter();
  const [categories,setCategories] = useState<Category[]>([]);
  const [products,setProducts] = useState<Product[]>([]);
  const [categoryName,setCategoryName] = useState('');
  const [categorySlug,setCategorySlug] = useState('');
  const [productId,setProductId] = useState('');
  const [sku,setSku] = useState('');
  const [variantName,setVariantName] = useState('');
  const [price,setPrice] = useState('');
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);

  async function load() {
    const response = await fetch('/api/admin/products',{
      cache:'no-store'
    });
    if(!response.ok) throw new Error('Unable to load catalog.');
    const data = await response.json();
    setProducts(data.products);
    setCategories(data.categories);
  }

  useEffect(()=>{
    if(!demo) load().catch(e=>setMessage(e.message));
  },[demo]);

  async function send(payload:unknown) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/catalog-ops',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
      const data = await response.json();
      if(!response.ok)
        throw new Error(data.error||'Operation failed.');
      setMessage('Catalog operation completed.');
      await load();
      router.refresh();
    } catch(error) {
      setMessage(error instanceof Error?
        error.message:'Unable to complete operation.');
    } finally {
      setBusy(false);
    }
  }

  if(demo) return null;

  return (
    <section className="panel" style={{marginTop:24}}>
      <h3>Categories & Variants</h3>
      <p>Manage product categories and additional SKUs.</p>

      <form style={{marginTop:20}} onSubmit={e=>{
        e.preventDefault();
        void send({
          action:'category.create',
          name:categoryName,
          slug:categorySlug
        });
      }}>
        <h3>Create category</h3>
        <div className="form-grid">
          <label className="field">
            Category name
            <input required value={categoryName}
              onChange={e=>setCategoryName(e.target.value)}/>
          </label>
          <label className="field">
            Category slug
            <input required value={categorySlug}
              onChange={e=>setCategorySlug(e.target.value)}/>
          </label>
        </div>
        <button className="button" disabled={busy}
          style={{marginTop:15}}>Add category</button>
      </form>

      <form style={{marginTop:30}} onSubmit={e=>{
        e.preventDefault();
        void send({
          action:'variant.create',
          productId,
          sku,
          name:variantName,
          price:Math.round(Number(price)*100)
        });
      }}>
        <h3>Create product variant</h3>
        <div className="form-grid">
          <label className="field">
            Product
            <select required value={productId}
              onChange={e=>setProductId(e.target.value)}>
              <option value="">Choose product</option>
              {products.map(p=><option key={p.id} value={p.id}>
                {p.name}
              </option>)}
            </select>
          </label>
          <label className="field">
            SKU
            <input required value={sku}
              onChange={e=>setSku(e.target.value)}/>
          </label>
          <label className="field">
            Variant name
            <input required value={variantName}
              onChange={e=>setVariantName(e.target.value)}/>
          </label>
          <label className="field">
            Price (INR)
            <input required type="number" min="0.01" step="0.01"
              value={price}
              onChange={e=>setPrice(e.target.value)}/>
          </label>
        </div>
        <button className="button" disabled={busy}
          style={{marginTop:15}}>Add variant</button>
      </form>

      <div className="table-wrap" style={{marginTop:30}}>
        <h3>Existing categories</h3>
        <table>
          <thead><tr><th>Name</th><th>Slug</th></tr></thead>
          <tbody>{categories.map(c=><tr key={c.id}>
            <td>{c.name}</td><td>{c.slug}</td>
          </tr>)}</tbody>
        </table>
      </div>

      <div className="table-wrap" style={{marginTop:30}}>
        <h3>Existing variants</h3>
        <table>
          <thead><tr>
            <th>Product</th><th>SKU</th><th>Variant</th><th>Price</th>
          </tr></thead>
          <tbody>{products.flatMap(p=>p.variants.map(v=>
            <tr key={v.id}>
              <td>{p.name}</td>
              <td>{v.sku}</td>
              <td>{v.name}</td>
              <td>₹{(v.price/100).toFixed(2)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {message&&<p role="status" style={{marginTop:20}}>
        {message}
      </p>}
    </section>
  );
}
