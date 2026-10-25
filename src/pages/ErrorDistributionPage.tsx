import { useEffect, useState } from 'react';
import { Activity, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Card } from '../components/common/Card';
import { ErrorDistributionChart } from '../components/charts/ErrorDistributionChart';
import { api, formatSignedMW } from '../api/client';
import { DistributionResponse, DecisionResponse } from '../api/types';

interface ErrorDistributionPageProps {
  selectedDate: string;
  selectedCutoff: string;
}

export function ErrorDistributionPage({
  selectedDate,
  selectedCutoff,
}: ErrorDistributionPageProps) {
  const [distribution, setDistribution] = useState<DistributionResponse | null>(null);
  const [decision, setDecision] = useState<DecisionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);

    Promise.all([api.getAccuracyDistribution(), api.getDecision(selectedDate, selectedCutoff)])
      .then(([dist, dec]) => {
        if (isCurrent) {
          setDistribution(dist);
          setDecision(dec);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load error distribution:', err);
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedDate, selectedCutoff]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Page Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-primary)' }}>
          <Activity size={18} />
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>
            RISK & TAIL ERROR PROFILING
          </span>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
          Historical Error Distributions & Percentiles
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>
          Quantifying procurement volume shortfall risk and signed error skewness across the decision-cutoff evaluation sample.
        </p>
      </div>

      {/* Percentiles Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <Card title="5th Percentile (P5)">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-actual)' }}>
            {formatSignedMW(distribution?.p5)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Wind exceeded forecast (Spill Risk)
          </div>
        </Card>

        <Card title="50th Percentile (Median P50)">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-warning)' }}>
            {formatSignedMW(distribution?.p50, 'Not available')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-warning)', marginTop: '4px' }}>
            Median bias: {formatSignedMW(distribution?.p50, '—')}
          </div>
        </Card>

        <Card title="95th Percentile (P95)">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-error)' }}>
            {formatSignedMW(distribution?.p95, 'Not available')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px' }}>
            Extreme Shortfall Tail Miss
          </div>
        </Card>

        <Card title="Sample Extremes (Min / Max)">
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {formatSignedMW(distribution?.min, '—')} / {formatSignedMW(distribution?.max, '—')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            N = {distribution?.sampleCount ? distribution.sampleCount.toLocaleString() : 'Not available'} evaluated hours
          </div>
        </Card>
      </div>

      {/* Interactive Distribution Histogram */}
      <Card
        title="Empirical Signed Error Histogram"
        subtitle="Distribution of (forecast − actual) errors across January 2026 decision cutoffs"
      >
        <ErrorDistributionChart
          distribution={distribution}
          intervals={decision?.intervals || []}
          isLoading={isLoading}
        />
      </Card>

      {/* Risk Notice & Methodology Disclosure */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            padding: '18px 20px',
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />
            <h4 style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
              Asymmetric Downside Shortfall Risk (P95 = {formatSignedMW(distribution?.p95, 'Not available')})
            </h4>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
            In 5% of hours, wind output fell short of forecast by more than {distribution?.p95 !== null && distribution?.p95 !== undefined ? `${Math.round(distribution.p95).toLocaleString()} MW` : 'the 95th percentile volume'}. For large power buyers, such massive deficits trigger system buy imbalance settlement prices, necessitating dynamic intraday hedging.
          </p>
        </div>

        <div
          style={{
            padding: '18px 20px',
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ShieldAlert size={16} style={{ color: 'var(--color-accent-primary)' }} />
            <h4 style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
              Statistical Assumption Disclosure
            </h4>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
            Empirical historical percentiles reflect only the realized January 2026 winter sample under the D-1 09:20 cutoff. They are not statistical guarantees, formal prediction intervals, or forward-looking probability guarantees.
          </p>
        </div>
      </div>
    </div>
  );
}
