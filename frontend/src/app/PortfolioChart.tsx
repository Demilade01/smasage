'use client';

import React, { useState, useMemo } from 'react';
import {
  AssetAllocation,
  calculatePieSlices,
  generatePiePath,
  calculateLabelPosition,
  normalizeAllocations,
} from '../utils/chartUtils';

interface PortfolioChartProps {
  allocations: AssetAllocation[];
  width?: number;
  height?: number;
  showLegend?: boolean;
  animated?: boolean;
}

interface HoveredSlice {
  index: number;
  name: string;
  percentage: number;
}

export default function PortfolioChart({
  allocations,
  width = 320,
  height = 320,
  showLegend = true,
  animated = true,
}: PortfolioChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<HoveredSlice | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Normalize allocations to ensure they sum to 100%
  const normalizedAllocations = useMemo(
    () => normalizeAllocations(allocations),
    [allocations]
  );

  // Calculate pie slices
  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 20;
  const innerRadius = outerRadius * 0.45; // For donut effect

  const slices = useMemo(
    () => calculatePieSlices(normalizedAllocations, cx, cy, outerRadius),
    [normalizedAllocations, cx, cy, outerRadius]
  );

  const handleMouseEnter = (
    index: number,
    name: string,
    percentage: number,
    event: React.MouseEvent<SVGPathElement>
  ) => {
    const rect = (event.currentTarget.parentElement as Element)?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
    setHoveredSlice({ index, name, percentage });
  };

  const handleMouseLeave = () => {
    setHoveredSlice(null);
  };

  return (
    <div className="portfolio-chart-container">
      <div className="chart-wrapper">
        <svg width={width} height={height} className="portfolio-chart-svg">
          <defs>
            <filter id="chart-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Render pie slices */}
          <g filter="url(#chart-shadow)">
            {slices.map((slice, index) => {
              const isHovered = hoveredSlice?.index === index;
              const path = generatePiePath(
                slice.cx,
                slice.cy,
                slice.radius,
                slice.startAngle,
                slice.endAngle
              );

              // Create donut by drawing inner circle cut-out
              const pathWithDonut =
                index === 0
                  ? path.replace(
                      'Z',
                      ` A ${innerRadius} ${innerRadius} 0 0 0 ${slice.x1} ${slice.y1} Z`
                    )
                  : path.replace(
                      'M ' + cx + ' ' + cy,
                      `M ${slice.x2} ${slice.y2}`
                    ).replace(
                      'Z',
                      ` A ${innerRadius} ${innerRadius} 0 0 ${slice.largeArc ? 0 : 1} ${
                        slices[index - 1].x2
                      } ${slices[index - 1].y2} Z`
                    );

              return (
                <g key={index}>
                  <path
                    d={path}
                    fill={slice.color}
                    opacity={isHovered ? 1 : 0.85}
                    className={`pie-slice ${isHovered ? 'hovered' : ''}`}
                    style={{
                      transition: animated ? 'opacity 0.2s ease' : 'none',
                      cursor: 'pointer',
                      filter: isHovered ? 'brightness(1.2)' : 'brightness(1)',
                    }}
                    onMouseEnter={(e) =>
                      handleMouseEnter(index, slice.name, slice.percentage, e)
                    }
                    onMouseLeave={handleMouseLeave}
                  />
                </g>
              );
            })}
          </g>

          {/* Render percentage labels on donut */}
          {slices.map((slice, index) => {
            const labelPos = calculateLabelPosition(
              slice.cx,
              slice.cy,
              slice.startAngle,
              slice.endAngle,
              innerRadius,
              outerRadius
            );

            // Only show label if percentage >= 5%
            if (slice.percentage < 5) return null;

            return (
              <text
                key={`label-${index}`}
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="chart-label"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  fill: 'var(--text-main)',
                  pointerEvents: 'none',
                  opacity: hoveredSlice?.index === index ? 1 : 0.8,
                  transition: animated ? 'opacity 0.2s ease' : 'none',
                }}
              >
                {slice.percentage.toFixed(0)}%
              </text>
            );
          })}

          {/* Tooltip */}
          {hoveredSlice && (
            <g>
              {/* Tooltip background */}
              <rect
                x={tooltipPos.x - 55}
                y={tooltipPos.y - 40}
                width="110"
                height="50"
                rx="6"
                fill="var(--bg-card)"
                stroke="var(--accent-primary)"
                strokeWidth="1"
                opacity="0.95"
              />
              {/* Tooltip text - Asset name */}
              <text
                x={tooltipPos.x}
                y={tooltipPos.y - 20}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontSize: '11px',
                  fill: 'var(--text-muted)',
                  fontWeight: 500,
                  pointerEvents: 'none',
                }}
              >
                {hoveredSlice.name.split('(')[0].trim()}
              </text>
              {/* Tooltip text - Percentage */}
              <text
                x={tooltipPos.x}
                y={tooltipPos.y - 5}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontSize: '14px',
                  fill: 'var(--text-main)',
                  fontWeight: 700,
                  pointerEvents: 'none',
                }}
              >
                {hoveredSlice.percentage.toFixed(1)}%
              </text>
            </g>
          )}
        </svg>

        {/* Center text for donut */}
        <div className="chart-center-text">
          <div className="chart-center-value">
            {allocations.length > 0 ? 'Portfolio' : 'No Data'}
          </div>
          <div className="chart-center-label">Allocation</div>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="chart-legend">
          {normalizedAllocations.map((allocation, index) => (
            <div
              key={index}
              className="legend-item"
              onMouseEnter={() =>
                setHoveredSlice({
                  index,
                  name: allocation.name,
                  percentage: allocation.percentage,
                })
              }
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <div
                className="legend-color"
                style={{ backgroundColor: allocation.color }}
              />
              <div className="legend-text">
                <div className="legend-name">{allocation.name}</div>
                <div className="legend-percentage">{allocation.percentage}%</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
