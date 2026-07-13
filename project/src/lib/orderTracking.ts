export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

export type TrackingReference = {
  orderId: string;
  trackingToken: string;
};

export const TRACKING_REFRESH_INTERVAL_MS = 30_000;

export const ORDER_STATUS_SEQUENCE: Exclude<OrderStatus, 'cancelled'>[] = [
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Recue',
  confirmed: 'Confirmee',
  preparing: 'En preparation',
  shipped: 'Expediee',
  delivered: 'Livree',
  cancelled: 'Annulee',
};

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getAllowedOrderTransitions(status: OrderStatus) {
  return ALLOWED_TRANSITIONS[status];
}

export function getOrderTrackingStepIndex(status: OrderStatus) {
  if (status === 'cancelled') return -1;
  return ORDER_STATUS_SEQUENCE.indexOf(status);
}

export function buildTrackingReference(orderId: string, trackingToken: string) {
  return `${orderId}:${trackingToken}`;
}

export function parseTrackingReference(value: string): TrackingReference | null {
  const normalized = value.trim();
  const separatorIndex = normalized.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex !== normalized.lastIndexOf(':')) return null;

  const orderId = normalized.slice(0, separatorIndex).trim();
  const trackingToken = normalized.slice(separatorIndex + 1).trim();
  if (!UUID_PATTERN.test(orderId) || !UUID_PATTERN.test(trackingToken)) return null;

  return { orderId, trackingToken };
}

export function buildTrackingPath(reference: TrackingReference) {
  return `/order-tracking/${reference.orderId}?token=${encodeURIComponent(reference.trackingToken)}`;
}

export function isLikelyNetworkError(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : '';
  return /fetch|network|connexion|connection|timeout|socket|load failed/i.test(message);
}
