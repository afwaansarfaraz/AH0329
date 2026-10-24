import { ReactNode } from 'react';
import { Info } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  unit?: string;
  icon: ReactNode;
  iconColor?: string;
  iconBg?: string;
  trendText?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  badgeText?: string;
  badgeVariant?: 'teal' | 'lime' | 'amber' | 'blue' | 'red';
  tooltip?: string;
  sparklineData?: number[];
  isLoading?: boolean;
}

export function KpiCard({
  title,
  value,
  unit,
  icon,
  iconColor = 'var(--color-accent-primary)',
  iconBg = 'var(--color-accent-primary-dim)',
  trendText,
  trendDirection = 'neutral',
  badgeText,
  badgeVariant = 'teal',
  tooltip,
  sparklineData,
  isLoading = false,
}: KpiCardProps) {
  // Sparkline path generator
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 120;
    const height = 24;
    const points = sparklineData
      .map((val, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible', opacity: 0.8 }}
      >
        <polyline
          fill="none"
          stroke={iconColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div
      className="card-elevated card-interactive"
      style={{
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '135px',
      }}
    >
      {/* Header row: Icon & Title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: iconBg,
              color: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
            }}
          >
            {title}
          </span>
        </div>
        {tooltip && (
          <span
            title={tooltip}
            style={{
              color: 'var(--color-text-muted)',
              cursor: 'help',
              display: 'inline-flex',
            }}
          >
            <Info size={14} />
          </span>
        )}
      </div>

      {/* Value */}
      <div style={{ margin: '4px 0 10px 0' }}>
        {isLoading ? (
          <div className="skeleton" style={{ height: '32px', width: '70%' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              {value}
            </span>
            {unit && (
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--color-text-muted)',
                }}
              >
                {unit}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Sparkline & Badge/Trend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: '6px',
        }}
      >
        <div>{renderSparkline()}</div>
        <div>
          {badgeText && (
            <span className={`badge badge-${badgeVariant}`}>
              {badgeText}
            </span>
          )}
          {trendText && !badgeText && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color:
                  trendDirection === 'up'
                    ? 'var(--color-accent-secondary)'
                    : trendDirection === 'down'
                    ? 'var(--color-accent-primary)'
                    : 'var(--color-text-muted)',
              }}
            >
              {trendText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
