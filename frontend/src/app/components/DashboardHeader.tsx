import React from 'react';
import { WsStatusIndicator } from './WsStatusIndicator';

interface DashboardHeaderProps {
  children?: React.ReactNode;
  wsConnected?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ children, wsConnected = false }) => (
  <header className="dashboard-header" aria-label="Smasage application header">
    <div className="header-content">
      <div className="logo-section">
        <div className="brand">
          <span className="brand-name" aria-label="Smasage">Smasage</span>
          <div
            className="status-pill"
            role="status"
            aria-label={wsConnected ? 'Connection status: Live' : 'Connection status: Connecting'}
          >
            <WsStatusIndicator connected={wsConnected} />
            <span className={`status-text ${wsConnected ? 'live' : 'connecting'}`} aria-hidden="true">
              {wsConnected ? 'Live' : 'Connecting'}
            </span>
          </div>
        </div>
      </div>
      <div className="header-actions">{children}</div>
    </div>
  </header>
);

