import { describe,it,expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { totals,checkoutSchema,addressSchema } from '../src/modules/checkout/policy';
import { verifySignature } from '../src/modules/payments/signature';
import { canTransition } from '../src/modules/orders/policy';
const address={name:'Test Customer',line1:'12 Sample Road',city:'Jaipur',state:'Rajasthan',postalCode:'302001',phone:'9876543210',country:'IN'};
describe('server pricing',()=>{
 it('uses integer paise and charges shipping below threshold',()=>expect(totals([{price:349000,quantity:2}])).toEqual({subtotal:698000,shipping:49000,total:747000}));
 it('grants free shipping at the exact threshold',()=>expect(totals([{price:500000,quantity:2}]).shipping).toBe(0));
 it.each([NaN,Infinity,-1,1.5])('rejects invalid price %s',price=>expect(()=>totals([{price,quantity:1}])).toThrow());
 it.each([0,-1,1.5,11,NaN])('rejects invalid quantity %s',quantity=>expect(()=>totals([{price:100,quantity}])).toThrow());
 it('rejects empty orders',()=>expect(()=>totals([])).toThrow());
 it('rejects amounts above the supported maximum',()=>expect(()=>totals([{price:100000001,quantity:1}])).toThrow());
});
describe('checkout input',()=>{
 const input={items:[{variantId:'variant-1',quantity:1}],address,idempotencyKey:'d4b137fd-0747-4af3-8af4-e862f1473cc9'};
 it('accepts a valid domestic address',()=>expect(addressSchema.safeParse(address).success).toBe(true));
 it('rejects unsupported country',()=>expect(addressSchema.safeParse({...address,country:'US'}).success).toBe(false));
 it('rejects malformed PIN',()=>expect(addressSchema.safeParse({...address,postalCode:'000000'}).success).toBe(false));
 it('rejects duplicate variant lines',()=>expect(checkoutSchema.safeParse({...input,items:[...input.items,...input.items]}).success).toBe(false));
 it('strips client-supplied pricing and identity',()=>expect(checkoutSchema.parse({...input,total:1,userId:'someone-else'})).not.toHaveProperty('total'));
 it('requires an idempotency key',()=>expect(checkoutSchema.safeParse({...input,idempotencyKey:''}).success).toBe(false));
});
describe('Razorpay signatures',()=>{
 const secret='test-secret';const body='{"event":"payment.captured"}';const signature=createHmac('sha256',secret).update(body).digest('hex');
 it('accepts only a valid HMAC',()=>expect(verifySignature(body,signature,secret)).toBe(true));
 it('rejects changed body whitespace',()=>expect(verifySignature(`${body} `,signature,secret)).toBe(false));
 it('rejects wrong secret',()=>expect(verifySignature(body,signature,'wrong')).toBe(false));
 it.each(['','not-hex','a'.repeat(63),'z'.repeat(64)])('rejects malformed signature %s',s=>expect(verifySignature(body,s,secret)).toBe(false));
 it('fails closed with missing secret',()=>expect(verifySignature(body,signature,'')).toBe(false));
});
describe('order transitions',()=>{
 it('permits the fulfillment sequence',()=>expect(canTransition('PACKED','SHIPPED')).toBe(true));
 it('rejects shipping an unpaid order',()=>expect(canTransition('PENDING_PAYMENT','SHIPPED')).toBe(false));
 it('rejects reverting a delivered order',()=>expect(canTransition('DELIVERED','PROCESSING')).toBe(false));
 it('rejects invented states',()=>expect(canTransition('UNKNOWN','CONFIRMED')).toBe(false));
});
