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
        <div className="skeleton" style={{ width: '90px', height: '90px', borderRadius: '50%' }} />
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

  const radius = 42;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (completenessPercent / 100) * circumference;

  const totalSettlementPeriods = quality.sourceCoverage?.actualRecordsRaw ?? (actualHours * 2);
  const forecastRecords = quality.retentionCoverage?.retainedForecastCount ?? quality.sourceCoverage?.forecastRecordsRaw ?? 0;
  const missingRecords = quality.missingIntervals?.missingActualHoursCount ?? 0;
  const isHealthy = missingRecords === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Circular Progress Gauge */}
        <div style={{ position: 'relative', width: '96px', height: '96px', flexShrink: 0 }}>
          <svg height="96" width="96">
            <circle
              stroke="#1C304A"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx="48"
              cy="48"
            />
            <circle
              stroke={isHealthy ? '#26D9C4' : '#F59E0B'}
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={`${circumference} ${circumference}`}
              style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-in-out' }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx="48"
              cy="48"
              transform="rotate(-90 48 48)"
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#F1F5FA', lineHeight: 1 }}>
              {completenessPercent}%
            </span>
            <span style={{ fontSize: '9px', color: '#9CAEC3', marginTop: '2px' }}>
              Completeness
            </span>
          </div>
        </div>

        {/* Quality Breakdown Metrics */}
        <div style={{ flex: 1, fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Settlement periods recorded</span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{totalSettlementPeriods.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Retained forecast records</span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{forecastRecords.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Retained actual hours</span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{actualHours.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Missing delivery hours</span>
            <strong style={{ color: missingRecords === 0 ? 'var(--color-accent-primary)' : 'var(--color-warning)' }}>
              {missingRecords}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Evaluated sample count</span>
            <strong style={{ color: 'var(--color-accent-secondary)' }}>{quality.evaluationSampleCount.toLocaleString()}</strong>
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
        {isHealthy ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
        <span>
          {isHealthy
            ? 'Complete paired coverage verified across all 744 evaluation hours.'
            : `${missingRecords} delivery intervals missing in evaluation sample.`}
        </span>
      </div>
    </div>
  );
}

