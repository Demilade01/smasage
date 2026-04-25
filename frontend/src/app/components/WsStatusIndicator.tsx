'use client';

import React from 'react';

interface WsStatusIndicatorProps {
  connected: boolean;
}

export const WsStatusIndicator: React.FC<WsStatusIndicatorProps> = ({ connected }) => (
  <span
    className={`ws-indicator ${connected ? 'connected' : 'connecting'}`}
    aria-hidden="true"
  />
);
