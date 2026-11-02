'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useCart } from './cart-provider';
import { addressSchema, totals } from '@/modules/checkout/policy';
import type { CatalogProduct } from '@/modules/catalog/sample';
import { money } from '@/lib/money';
import { resolveVariant } from '@/modules/catalog/variant-resolver';

type SavedAddress = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  addressType: string;
  building: string | null;
  floor: string | null;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
};

function checkoutFields(address: SavedAddress | undefined) {
  if (!address) return {} as Record<string, string>;
  const street = [
    address.line1,
    address.building,
    address.floor,
    address.line2
  ].filter(Boolean).join(', ');
  return {
    name: address.name,
    phone: address.phone,
    line1: street,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode
  } as Record<string, string>;
}

type PaymentResult={razorpay_payment_id:string;razorpay_signature:string};
declare global{interface Window{Razorpay?:new(options:Record<string,unknown>)=>{open:()=>void}}}
export function CheckoutForm({products,enabled,signedIn}:{products:CatalogProduct[];enabled:boolean;signedIn:boolean}) {const cart=useCart(),router=useRouter();
const [savedAddresses,setSavedAddresses]=useState<SavedAddress[]>([]);
const [selectedAddressId,setSelectedAddressId]=useState('manual');
const [addressesLoading,setAddressesLoading]=useState(signedIn);
const [addressesError,setAddressesError]=useState('');
const selectedAddress=savedAddresses.find(a=>a.id===selectedAddressId);
const addressValues=checkoutFields(selectedAddress);

useEffect(()=>{
  if(!signedIn){
    return;
  }
  const controller=new AbortController();
  fetch('/api/customer/addresses',{
    credentials:'same-origin',
    cache:'no-store',
    signal:controller.signal
  }).then(async response=>{
    if(!response.ok)throw new Error('Saved addresses unavailable');
    return response.json();
  }).then(data=>{
    if(controller.signal.aborted)return;
    const list:SavedAddress[]=Array.isArray(data.addresses)
      ? data.addresses : [];
    setSavedAddresses(list);
    const preferred=list.find(a=>a.isDefault)||list[0];
    if(preferred)setSelectedAddressId(preferred.id);
  }).catch(()=>{
    if(!controller.signal.aborted)
      setAddressesError('Saved addresses could not load. Enter your address manually.');
  }).finally(()=>{
    if(!controller.signal.aborted)setAddressesLoading(false);
  });
  return ()=>controller.abort();
},[signedIn]);
const [error,setError]=useState(''),[busy,setBusy]=useState(false),[scriptReady,setScriptReady]=useState(false);const [key,setKey]=useState('');useEffect(()=>{try{let saved=sessionStorage.getItem('lumiere-checkout-key');if(!saved){saved=crypto.randomUUID();sessionStorage.setItem('lumiere-checkout-key',saved);}setKey(saved);}catch{setKey(crypto.randomUUID());}},[]);const lines=cart.items.map(i=>({...i,product:resolveVariant(products,i.variantId)}));const valid=lines.length>0&&lines.every(i=>i.product&&i.quantity<=i.product.stock);const amount=valid?totals(lines.map(i=>({quantity:i.quantity,price:i.product!.price}))):null;
async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setError('');const data=Object.fromEntries(new FormData(event.currentTarget));const parsed=addressSchema.safeParse({...data,country:'IN'});if(!parsed.success){setError(parsed.error.issues[0].message);return;}if(!valid){setError('Your bag needs updating.');return;}setBusy(true);try{const response=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:cart.items,address:parsed.data,idempotencyKey:key})});const result=await response.json();if(!response.ok)throw new Error(result.error);if(!window.Razorpay)throw new Error('Payment window could not load. Your checkout can be retried safely.');const checkout=new window.Razorpay({key:result.key,order_id:result.providerOrderId,amount:result.amount,currency:'INR',name:'LUMIÈRE',description:'Your considered collection',prefill:{name:parsed.data.name,contact:parsed.data.phone},theme:{color:'#555b43'},modal:{ondismiss:()=>setBusy(false)},handler:async(payment:PaymentResult)=>{try{const res=await fetch('/api/payments/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payment,orderId:result.orderId})});const body=await res.json();if(!res.ok)throw new Error(body.error);cart.clear();sessionStorage.removeItem('lumiere-checkout-key');router.push(`/checkout/success?order=${encodeURIComponent(body.orderId)}`);}catch(e){setError(e instanceof Error?e.message:'Payment verification is pending. Please check your account orders.');setBusy(false);}}});checkout.open();}catch(e){setError(e instanceof Error?e.message:'Checkout could not be prepared.');setBusy(false);}}
if(!cart.ready)return <p role="status">Preparing your bag…</p>;if(!cart.items.length)return <div className="empty-state"><h2>Your bag is empty.</h2><Link href="/collections" className="button">Explore the collection</Link></div>;return <>{enabled&&<Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={()=>setScriptReady(true)} onError={()=>setError('Payment window is unavailable. Please try again later.')}/>} {!enabled&&<div className="notice">Checkout preview · Payments are unavailable until the store’s database, sign-in, and Razorpay test account are connected. No payment will be collected.</div>}{enabled&&!signedIn&&<div className="notice"><Link href="/login">Sign in to place your order →</Link></div>}<div className="cart-layout"><form className="checkout-form" onSubmit={submit}><h2 className="form-heading">Where should we send your objects?</h2>{signedIn&&(
  <div style={{margin:'20px 0'}}>
    <label className="field">
      Saved delivery address
      <select
        value={selectedAddressId}
        onChange={e=>setSelectedAddressId(e.target.value)}
        disabled={addressesLoading}
        style={{
          width:'100%',
          padding:'14px',
          border:'1px solid #cfc9bd',
          borderRadius:5,
          fontFamily:'Arial,sans-serif',
          fontSize:15
        }}
      >
        <option value="manual">Enter New Address</option>
        {savedAddresses.map(a=>(
          <option key={a.id} value={a.id}>
            {a.addressType} · {a.name} · {a.city}
            {a.isDefault?' (Default)':''}
          </option>
        ))}
      </select>
    </label>
    {addressesLoading&&<p role="status">Loading saved addresses…</p>}
    {addressesError&&<p role="status">{addressesError}</p>}
    <p style={{marginTop:10,fontSize:13}}>
      <Link href="/account/settings/addresses">
        Manage saved addresses →
      </Link>
    </p>
  </div>
)}
<div className="form-grid" key={selectedAddressId}>{[['name','Full name','name'],['phone','Mobile number','tel'],['line1','Street address','street-address'],['city','City','address-level2'],['state','State','address-level1'],['postalCode','PIN code','postal-code']].map(([name,label,auto])=><label className={`field ${name==='line1'?'wide':''}`} key={name}>{label}<input name={name} defaultValue={addressValues[name]||''} required autoComplete={auto} type={name==='phone'?'tel':'text'} maxLength={name==='phone'?10:name==='postalCode'?6:200} inputMode={['phone','postalCode'].includes(name)?'numeric':undefined}/></label>)}</div>{error&&<div className="notice error" role="alert" style={{marginTop:24}}>{error}</div>}<button className="button full" disabled={!enabled||!signedIn||!valid||busy||!scriptReady||!key}>{busy?'Preparing secure payment…':enabled?'Continue to test payment':'Payments not yet enabled'}</button><p className="sample-label" style={{marginTop:15}}>India delivery only. Payment confirmation is verified securely by the server.</p><Link href="/cart" className="text-link">← Return to your bag</Link></form><aside className="summary-card"><h2>Your collection</h2>{lines.map(i=><div className="summary-line" key={i.variantId}><span>{i.product ? `${i.product.name} · ${i.product.variantName}` : 'Unavailable object'} × {i.quantity}</span><span>{i.product?money(i.product.price*i.quantity):'—'}</span></div>)}{amount?<><div className="summary-line"><span>Delivery</span><span>{amount.shipping?money(amount.shipping):'Complimentary'}</span></div><div className="summary-line total"><span>Total</span><span>{money(amount.total)}</span></div></>:<p>Please update your bag before continuing.</p>}</aside></div></>;}
