'use client';

import React from 'react';
import { Wallet, TrendingUp } from 'lucide-react';

export interface PortfolioStatsProps {
  totalValue: number;
  apy: number;
  valueChange: number;
}

export const PortfolioStats: React.FC<PortfolioStatsProps> = ({
  totalValue,
  apy,
  valueChange,
}) => {
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalValue);

  const changeLabel = `${valueChange >= 0 ? '+' : ''}${valueChange.toFixed(1)}%`;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">
          <Wallet size={16} color="var(--accent-primary)" />
          Total Value
        </div>
        <div className="stat-value">
          {formattedValue}
          <span className="stat-sub">{changeLabel}</span>
        </div>
      </div>

      <div className="stat-card secondary">
        <div className="stat-label">
          <TrendingUp size={16} color="var(--accent-secondary)" />
          Est. Monthly APY
        </div>
        <div className="stat-value">
          {apy.toFixed(1)}%
          <span className="stat-sub">Active</span>
        </div>
      </div>
    </div>
  );
};
