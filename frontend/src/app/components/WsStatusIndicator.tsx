'use client';

import React from 'react';

interface WsStatusIndicatorProps {
  connected: boolean;
}

export const WsStatusIndicator: React.FC<WsStatusIndicatorProps> = ({ connected }) => (
  <span
    title={connected ? 'Live — WebSocket connected' : 'Connecting…'}
    aria-label={connected ? 'WebSocket connected' : 'WebSocket connecting'}
    style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      flexShrink: 0,
      backgroundColor: connected ? '#10b981' : '#f59e0b',
      boxShadow: connected
        ? '0 0 0 2px rgba(16,185,129,0.25)'
        : '0 0 0 2px rgba(245,158,11,0.25)',
      animation: connected ? 'ws-pulse 2s ease-in-out infinite' : 'ws-blink 1.2s step-start infinite',
    }}
  />
);
