export const transitions: Record<string, readonly string[]> = { PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['PROCESSING'], PROCESSING: ['PACKED'], PACKED: ['SHIPPED'], SHIPPED: ['DELIVERED'], DELIVERED: [], CANCELLED: [] };
export function canTransition(from: string, to: string) { return transitions[from]?.includes(to) ?? false; }
