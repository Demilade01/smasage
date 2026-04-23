import React from 'react';
import { WsStatusIndicator } from './WsStatusIndicator';

interface DashboardHeaderProps {
  children?: React.ReactNode;
  wsConnected?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ children, wsConnected = false }) => (
  <header
    className="dashboard-header"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 2rem',
      borderBottom: '1px solid #eee',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontWeight: 700, fontSize: '1.5rem' }}>Smasage</span>
      <WsStatusIndicator connected={wsConnected} />
      <span style={{ fontSize: '0.75rem', color: wsConnected ? '#10b981' : '#f59e0b' }}>
        {wsConnected ? 'Live' : 'Connecting…'}
      </span>
    </div>
    <div>{children}</div>
  </header>
);
