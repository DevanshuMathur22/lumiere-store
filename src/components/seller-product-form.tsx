'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Category={id:string;name:string;slug:string};

const initial={
  name:'',slug:'',description:'',material:'',
  image:'',categorySlug:'',sku:'',
  variantName:'Standard',price:''
};

export function SellerProductForm({categories}:{categories:Category[]}) {
  const router=useRouter();
  const [form,setForm]=useState(initial);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  function update(key:keyof typeof initial,value:string) {
    setForm(previous=>({...previous,[key]:value}));
  }

  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy)return;
    setError('');
    setNotice('');

    const amount=form.price.trim();
    if(!/^\d+(\.\d{1,2})?$/.test(amount)) {
      setError('Enter a valid INR price with up to two decimals.');
      return;
    }

    const [rupees,paise='']=amount.split('.');
    const price=Number(rupees)*100+Number(paise.padEnd(2,'0'));
    if(!Number.isSafeInteger(price)||price<1||price>100000000) {
      setError('Price is outside the allowed range.');
      return;
    }

    setBusy(true);
    try {
      const payload={
        ...form,
        name:form.name.trim(),
        slug:form.slug.trim(),
        description:form.description.trim(),
        material:form.material.trim(),
        image:form.image.trim(),
        sku:form.sku.trim(),
        variantName:form.variantName.trim(),
        price
      };

      const response=await fetch('/api/seller/products',{
        method:'POST',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
      const result=await response.json();
      if(!response.ok)
        throw new Error(result.error||'Product submission failed.');

      setForm(initial);
      setNotice('Product submitted as a draft. It is not published.');
      router.refresh();
    } catch(e) {
      setError(e instanceof Error?e.message:'Unable to submit product.');
    } finally {
      setBusy(false);
    }
  }

  const fields=[
    ['name','Product name'],
    ['slug','Unique product slug'],
    ['material','Material / specifications'],
    ['image','Image path (/images/...) or HTTPS URL'],
    ['sku','Unique SKU'],
    ['variantName','Variant name'],
    ['price','Price in INR']
  ] as const;

  return (
    <section className="order-detail-panel"
      style={{marginBottom:24}}>
      <span className="eyebrow">SELLER CATALOG</span>
      <h2>Submit a Product</h2>
      <p>New submissions are saved as unpublished drafts.</p>
      <form onSubmit={submit} style={{marginTop:20}}>
        <div className="form-grid">
          {fields.map(([key,label])=>(
            <label className="field" key={key}>
              {label}
              <input
                value={form[key]}
                onChange={e=>update(key,e.target.value)}
                required disabled={busy}
                maxLength={
                  key==='name'?160:
                  key==='material'?250:
                  key==='image'?500:100
                }
                placeholder={key==='price'?'1299.00':undefined}
                inputMode={key==='price'?'decimal':undefined}
              />
            </label>
          ))}
          <label className="field">
            Category
            <select required disabled={busy||!categories.length}
              value={form.categorySlug}
              onChange={e=>update('categorySlug',e.target.value)}>
              <option value="">Select category</option>
              {categories.map(category=>(
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field" style={{marginTop:16}}>
          Product description
          <textarea required minLength={10} maxLength={10000}
            rows={5} disabled={busy}
            value={form.description}
            onChange={e=>update('description',e.target.value)}/>
        </label>

        {!categories.length&&
          <p role="status">No categories available. Contact support.</p>}
        {error&&<p role="alert">{error}</p>}
        {notice&&<p role="status">{notice}</p>}

        <button className="button" type="submit"
          style={{marginTop:18}}
          disabled={busy||!categories.length}>
          {busy?'Submitting…':'Submit Product as Draft'}
        </button>
      </form>
    </section>
  );
}
