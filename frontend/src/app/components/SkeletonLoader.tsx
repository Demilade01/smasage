'use client';

import React from 'react';

// Shimmer base — all skeletons share this
const shimmerStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 12,
  position: 'relative',
  overflow: 'hidden',
};

function Bone({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{ ...shimmerStyle, ...style }}>
      <div className="skeleton-shimmer" />
    </div>
  );
}

export function PortfolioStatsSkeleton() {
  return (
    <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
      {[0, 1].map((i) => (
        <div key={i} className="stat-card" style={{ gap: 0 }}>
          <Bone style={{ width: '60%', height: 14, marginBottom: 12 }} />
          <Bone style={{ width: '80%', height: 36 }} />
        </div>
      ))}
    </div>
  );
}

export function GoalTrackerSkeleton() {
  return (
    <div className="goal-section">
      <div className="goal-header">
        <div style={{ flex: 1 }}>
          <Bone style={{ width: '55%', height: 18, marginBottom: 8 }} />
          <Bone style={{ width: '70%', height: 13, marginBottom: 6 }} />
          <Bone style={{ width: '40%', height: 13 }} />
        </div>
        <Bone style={{ width: 32, height: 32, borderRadius: '50%' }} />
      </div>
      <Bone style={{ width: '100%', height: 12, borderRadius: 999, margin: '1rem 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Bone style={{ width: '30%', height: 13 }} />
        <Bone style={{ width: '30%', height: 13 }} />
      </div>
    </div>
  );
}

export function PortfolioChartSkeleton() {
  return (
    <div className="portfolio-chart-container">
      <Bone style={{ width: 280, height: 280, borderRadius: '50%' }} />
      <div className="chart-legend" style={{ width: '100%', maxWidth: 360 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="legend-item" style={{ pointerEvents: 'none' }}>
            <Bone style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <Bone style={{ width: '60%', height: 13, marginBottom: 6 }} />
              <Bone style={{ width: '30%', height: 11 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
