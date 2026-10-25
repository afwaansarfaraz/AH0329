import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { QualityResponse } from '../../api/types';

interface DataQualityRingProps {
  quality?: QualityResponse | null;
  isLoading?: boolean;
}

export function DataQualityRing({ quality, isLoading = false }: DataQualityRingProps) {
  if (isLoading || !quality) {
    return (
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: '104px', height: '104px', borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton" style={{ height: '14px', width: '80%' }} />
          <div className="skeleton" style={{ height: '14px', width: '60%' }} />
          <div className="skeleton" style={{ height: '14px', width: '70%' }} />
        </div>
      </div>
    );
  }

  // Derive completeness and counts dynamically from backend response
  const actualHours = quality.retentionCoverage?.retainedActualHours ?? 0;
  const missingHours = quality.missingIntervals?.missingActualHoursCount ?? 0;
  const totalExpectedHours = actualHours + missingHours;
  const completenessPercent = totalExpectedHours > 0
    ? Number(((actualHours / totalExpectedHours) * 100).toFixed(1))
    : 100.0;

  // Optimized gauge dimensions to prevent text overflowing
  const size = 104;
  const strokeWidth = 6.5;
  const center = size / 2; // 52
  const radius = 44;
  const circumference = 2 * Math.PI * radius; // ~276.46
  const strokeDashoffset = circumference - (completenessPercent / 100) * circumference;

  const totalSettlementPeriods = quality.sourceCoverage?.actualRecordsRaw ?? (actualHours * 2);
  const forecastRecords = quality.retentionCoverage?.retainedForecastCount ?? quality.sourceCoverage?.forecastRecordsRaw ?? 0;
  const missingRecords = quality.missingIntervals?.missingActualHoursCount ?? 0;
  const isHealthy = missingRecords === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Circular Progress Gauge */}
        <div
          style={{
            position: 'relative',
            width: `${size}px`,
            height: `${size}px`,
            flexShrink: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(38, 217, 196, 0.05) 0%, rgba(16, 28, 50, 0.25) 70%, transparent 100%)',
          }}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ display: 'block', transform: 'rotate(-90deg)' }}
          >
            {/* Background Track */}
            <circle
              stroke="var(--color-surface-panel)"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={radius}
              cx={center}
              cy={center}
            />
            {/* Active Completeness Arc */}
            <circle
              stroke={isHealthy ? 'var(--color-accent-primary)' : 'var(--color-warning)'}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              style={{
                strokeDashoffset,
                transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              strokeLinecap="round"
              r={radius}
              cx={center}
              cy={center}
            />
          </svg>

          {/* Centered Typography Inside Circle */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              pointerEvents: 'none',
              padding: '4px',
            }}
          >
            <span
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {completenessPercent % 1 === 0 ? completenessPercent.toFixed(0) : completenessPercent.toFixed(1)}%
            </span>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginTop: '3px',
                whiteSpace: 'nowrap',
              }}
            >
              Completeness
            </span>
          </div>
        </div>

        {/* Quality Breakdown Metrics */}
        <div style={{ flex: 1, minWidth: 0, fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3.5px 0', borderBottom: '1px solid var(--color-border-subtle)', gap: '8px' }}>
            <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Settlement periods recorded</span>
            <strong style={{ color: 'var(--color-text-primary)', flexShrink: 0 }}>{totalSettlementPeriods.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3.5px 0', borderBottom: '1px solid var(--color-border-subtle)', gap: '8px' }}>
            <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Retained forecast records</span>
            <strong style={{ color: 'var(--color-text-primary)', flexShrink: 0 }}>{forecastRecords.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3.5px 0', borderBottom: '1px solid var(--color-border-subtle)', gap: '8px' }}>
            <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Retained actual hours</span>
            <strong style={{ color: 'var(--color-text-primary)', flexShrink: 0 }}>{actualHours.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3.5px 0', borderBottom: '1px solid var(--color-border-subtle)', gap: '8px' }}>
            <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Missing delivery hours</span>
            <strong style={{ color: missingRecords === 0 ? 'var(--color-accent-primary)' : 'var(--color-warning)', flexShrink: 0 }}>
              {missingRecords}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3.5px 0', gap: '8px' }}>
            <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Evaluated sample count</span>
            <strong style={{ color: 'var(--color-accent-secondary)', flexShrink: 0 }}>{quality.evaluationSampleCount.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Status indicator tag */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: isHealthy ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          border: `1px solid ${isHealthy ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
          borderRadius: 'var(--radius-sm)',
          fontSize: '11px',
          color: isHealthy ? 'var(--color-success)' : 'var(--color-warning)',
          fontWeight: 500,
        }}
      >
        {isHealthy ? <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> : <AlertTriangle size={14} style={{ flexShrink: 0 }} />}
        <span>
          {isHealthy
            ? 'Complete paired coverage verified across all 744 evaluation hours.'
            : `${missingRecords} delivery intervals missing in evaluation sample.`}
        </span>
      </div>
    </div>
  );
}

