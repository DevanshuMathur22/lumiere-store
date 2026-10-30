import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
let pg:PGlite;
beforeAll(async()=>{pg=new PGlite();await pg.exec(await readFile('prisma/migrations/202610300001_initial/migration.sql','utf8'));await pg.exec(`INSERT INTO "User" (id,email) VALUES ('user1','one@example.test'); INSERT INTO "Category" (id,slug,name) VALUES ('cat1','ceramics','Ceramics'); INSERT INTO "Product" (id,slug,name,description,material,image,"categoryId","updatedAt") VALUES ('p1','vase','Vase','Sample','Stoneware','/vase.jpg','cat1',NOW()); INSERT INTO "ProductVariant" (id,"productId",sku,name,price) VALUES ('v1','p1','SKU1','Natural',10000); INSERT INTO "Warehouse" (id,name,code) VALUES ('w1','Main','MAIN'); INSERT INTO "InventoryBalance" (id,"variantId","warehouseId","onHand",reserved) VALUES ('b1','v1','w1',1,0); INSERT INTO "Order" (id,"userId","idempotencyKey","requestHash",subtotal,shipping,total,address,"updatedAt") VALUES ('o1','user1','key1','hash1',10000,49000,59000,'{}',NOW());`);});
afterAll(async()=>{await pg?.close();});
describe('PostgreSQL migration constraints (PGlite)',()=>{
 it('creates the complete schema',async()=>{const result=await pg.query<{count:string}>(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'`);expect(Number(result.rows[0].count)).toBeGreaterThanOrEqual(24);});
 it('forbids reserving more stock than exists',async()=>{await expect(pg.exec(`UPDATE "InventoryBalance" SET reserved=2 WHERE id='b1'`)).rejects.toThrow();});
 it('forbids negative stock',async()=>{await expect(pg.exec(`UPDATE "InventoryBalance" SET "onHand"=-1 WHERE id='b1'`)).rejects.toThrow();});
 it('forbids inconsistent totals',async()=>{await expect(pg.exec(`UPDATE "Order" SET total=1 WHERE id='o1'`)).rejects.toThrow();});
 it('forbids negative variant price',async()=>{await expect(pg.exec(`UPDATE "ProductVariant" SET price=-1 WHERE id='v1'`)).rejects.toThrow();});
 it('enforces per-customer idempotency',async()=>{await expect(pg.exec(`INSERT INTO "Order" (id,"userId","idempotencyKey","requestHash",subtotal,shipping,total,address,"updatedAt") VALUES ('o2','user1','key1','hash2',10000,49000,59000,'{}',NOW())`)).rejects.toThrow();});
 it('enforces unique payment events',async()=>{await pg.exec(`INSERT INTO "WebhookEvent" (id,kind) VALUES ('evt1','payment.captured')`);await expect(pg.exec(`INSERT INTO "WebhookEvent" (id,kind) VALUES ('evt1','payment.captured')`)).rejects.toThrow();});
 it('rolls back stock changes when another operation fails',async()=>{try{await pg.transaction(async tx=>{await tx.exec(`UPDATE "InventoryBalance" SET reserved=1 WHERE id='b1'`);await tx.exec(`UPDATE "Order" SET total=-1 WHERE id='o1'`);});}catch{}const result=await pg.query<{reserved:number}>(`SELECT reserved FROM "InventoryBalance" WHERE id='b1'`);expect(result.rows[0].reserved).toBe(0);});
 it('protects customer records referenced by orders',async()=>{await expect(pg.exec(`DELETE FROM "User" WHERE id='user1'`)).rejects.toThrow();});
});
