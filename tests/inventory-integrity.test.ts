import { describe, expect, it } from 'vitest';
import {
  validateInventory,
  inventorySummary,
  canReserve
} from '../src/modules/inventory/integrity';

describe('inventory integrity', () => {
  it('accepts a valid stock balance', () => {
    expect(validateInventory({
      onHand: 20, reserved: 5, reorderPoint: 3
    })).toEqual([]);
  });

  it('rejects negative on-hand stock', () => {
    expect(validateInventory({
      onHand: -1, reserved: 0, reorderPoint: 3
    })).toContain('INVALID_ON_HAND');
  });

  it('rejects negative reserved stock', () => {
    expect(validateInventory({
      onHand: 10, reserved: -1, reorderPoint: 3
    })).toContain('INVALID_RESERVED');
  });

  it('detects over-reservation', () => {
    expect(validateInventory({
      onHand: 2, reserved: 5, reorderPoint: 3
    })).toContain('OVER_RESERVED');
  });

  it('calculates available stock', () => {
    expect(inventorySummary({
      onHand: 10, reserved: 4, reorderPoint: 2
    }).available).toBe(6);
  });

  it('detects low stock', () => {
    expect(inventorySummary({
      onHand: 5, reserved: 4, reorderPoint: 3
    }).lowStock).toBe(true);
  });

  it('allows a safe reservation', () => {
    expect(canReserve({
      onHand: 10, reserved: 4, reorderPoint: 2
    }, 6)).toBe(true);
  });

  it('rejects overselling', () => {
    expect(canReserve({
      onHand: 10, reserved: 4, reorderPoint: 2
    }, 7)).toBe(false);
  });
});
