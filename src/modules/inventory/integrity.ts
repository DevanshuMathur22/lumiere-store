export type InventoryState = {
  onHand: number;
  reserved: number;
  reorderPoint: number;
};

export type IntegrityIssue =
  | 'INVALID_ON_HAND'
  | 'INVALID_RESERVED'
  | 'OVER_RESERVED'
  | 'INVALID_REORDER_POINT';

export function validateInventory(
  state: InventoryState
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  if (!Number.isSafeInteger(state.onHand) || state.onHand < 0)
    issues.push('INVALID_ON_HAND');

  if (!Number.isSafeInteger(state.reserved) || state.reserved < 0)
    issues.push('INVALID_RESERVED');

  if (Number.isSafeInteger(state.onHand) &&
      Number.isSafeInteger(state.reserved) &&
      state.reserved > state.onHand)
    issues.push('OVER_RESERVED');

  if (!Number.isSafeInteger(state.reorderPoint) ||
      state.reorderPoint < 0)
    issues.push('INVALID_REORDER_POINT');

  return issues;
}

export function inventorySummary(state: InventoryState) {
  const issues = validateInventory(state);
  const available = issues.length
    ? 0
    : state.onHand - state.reserved;

  return {
    available,
    lowStock: available <= state.reorderPoint,
    valid: issues.length === 0,
    issues
  };
}

export function canReserve(
  state: InventoryState,
  quantity: number
): boolean {
  return Number.isSafeInteger(quantity) &&
    quantity > 0 &&
    validateInventory(state).length === 0 &&
    state.onHand - state.reserved >= quantity;
}
