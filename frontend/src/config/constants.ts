// WebSocket
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

// Currency formatting
export const CURRENCY_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

// Notification / reconnect
export const WS_MAX_RECONNECT_ATTEMPTS = 5;
export const WS_MAX_RECONNECT_DELAY_MS = 30_000;
