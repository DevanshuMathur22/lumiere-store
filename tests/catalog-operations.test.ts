import { describe,it,expect } from 'vitest';
import {
  catalogOperationSchema,
  warehouseOperationSchema
} from '../src/modules/catalog/operations-schema';

describe('enterprise catalog operations',()=>{
  it('accepts category creation',()=>{
    expect(catalogOperationSchema.safeParse({
      action:'category.create',
      name:'Sculptural Objects',
      slug:'sculptural-objects'
    }).success).toBe(true);
  });

  it('rejects unsafe category slug',()=>{
    expect(catalogOperationSchema.safeParse({
      action:'category.create',
      name:'Bad Category',
      slug:'../admin'
    }).success).toBe(false);
  });

  it('accepts variant creation',()=>{
    expect(catalogOperationSchema.safeParse({
      action:'variant.create',
      productId:'product-1',
      sku:'LUM-NEW-002',
      name:'Large',
      price:549000
    }).success).toBe(true);
  });

  it('rejects zero price',()=>{
    expect(catalogOperationSchema.safeParse({
      action:'variant.create',
      productId:'product-1',
      sku:'LUM-NEW-002',
      name:'Large',
      price:0
    }).success).toBe(false);
  });

  it('accepts warehouse creation',()=>{
    expect(warehouseOperationSchema.safeParse({
      action:'warehouse.create',
      name:'Main Studio',
      code:'MAIN-01'
    }).success).toBe(true);
  });

  it('rejects negative reorder point',()=>{
    expect(warehouseOperationSchema.safeParse({
      action:'balance.create',
      variantId:'v1',
      warehouseId:'w1',
      reorderPoint:-2
    }).success).toBe(false);
  });

  it('rejects initial stock injection',()=>{
    expect(warehouseOperationSchema.safeParse({
      action:'balance.create',
      variantId:'v1',
      warehouseId:'w1',
      reorderPoint:5,
      onHand:999
    }).success).toBe(false);
  });
});
