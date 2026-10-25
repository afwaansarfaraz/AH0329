import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, HelpCircle } from 'lucide-react';
import { Card } from '../components/common/Card';
import { HorizonAccuracyChart } from '../components/charts/HorizonAccuracyChart';
import { api, formatMW, formatSignedMW, formatWape, formatSkill } from '../api/client';
import { AccuracySummaryResponse, HorizonResponse } from '../api/types';

export function ForecastAccuracyPage() {
  const [accuracy, setAccuracy] = useState<AccuracySummaryResponse | null>(null);
  const [horizon, setHorizon] = useState<HorizonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);

    Promise.all([api.getAccuracySummary(), api.getAccuracyHorizon()])
      .then(([acc, hor]) => {
        if (isCurrent) {
          setAccuracy(acc);
          setHorizon(hor);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load accuracy analytics:', err);
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const sampleCountStr = accuracy?.sampleCount
    ? `${accuracy.sampleCount.toLocaleString()} paired hourly intervals`
    : '744 paired hourly intervals';

  const isOverforecast = (accuracy?.bias ?? 0) > 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Page Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-primary)' }}>
          <BarChart3 size={18} />
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>
            STATISTICAL ACCURACY BENCHMARK
          </span>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
          Forecast Accuracy & Lead-Time Horizons
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>
          Verified evaluation over {sampleCountStr} (Jan 2 – Feb 1, 2026) under the D-1 09:20 London procurement cutoff.
        </p>
      </div>

      {/* Accuracy Summary Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <Card title="Mean Absolute Error (MAE)">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {formatMW(accuracy?.mae, 'Not available')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Linear average of |forecast − actual|
          </div>
        </Card>

        <Card title="Root Mean Squared Error (RMSE)">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
            {formatMW(accuracy?.rmse, 'Not available')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Penalises large tail misses heavily
          </div>
        </Card>

        <Card title="Mean Error / Bias">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-warning)' }}>
            {formatSignedMW(accuracy?.bias, 'Not available')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-warning)', marginTop: '4px' }}>
            ● {isOverforecast ? 'Persistent Overforecasting' : 'Systematic Underforecasting'}
          </div>
        </Card>

        <Card title="Weighted Abs % Error (WAPE)">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-actual)' }}>
            {formatWape(accuracy?.wape, 'Not available')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Volume-weighted across all MWh
          </div>
        </Card>

        <Card title="Naive Persistence Skill">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-accent-secondary)' }}>
            {formatSkill(accuracy?.persistenceSkill, 'Not available')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Baseline MAE: {formatMW(accuracy?.naivePersistenceMae, '—')}
          </div>
        </Card>
      </div>

      {/* Horizon Degradation Chart */}
      <Card
        title="Accuracy Degradation Across Lead-Time Horizons"
        subtitle="Analyzing error growth as forecast delivery extends from 0 to 72 hours ahead"
      >
        <HorizonAccuracyChart buckets={horizon?.buckets || []} isLoading={isLoading} />
      </Card>

      {/* Horizon Detailed Breakdown Table */}
      <Card title="Lead-Time Horizon Metric Breakdown" subtitle="Five deterministic forward lead-time segments">
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '10px 14px' }}>Horizon Bucket</th>
                <th style={{ padding: '10px 14px' }}>Lead Range</th>
                <th style={{ padding: '10px 14px' }}>Observations</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>MAE</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>RMSE</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Bias</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>WAPE</th>
              </tr>
            </thead>
            <tbody>
              {(horizon?.buckets || []).map((b, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: '1px solid var(--color-border-subtle)',
                    transition: 'background-color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-panel)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    <span className="badge badge-teal">{b.bucket}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>
                    {b.minLeadHours}h to {b.maxLeadHours}h
                  </td>
                  <td style={{ padding: '12px 14px' }}>{b.sampleCount.toLocaleString()}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--color-accent-primary)' }}>
                    {formatMW(b.mae)}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>
                    {formatMW(b.rmse)}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--color-warning)' }}>
                    {formatSignedMW(b.bias)}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>
                    {formatWape(b.wape)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Trading Interpretation & Baseline Callout */}
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
            <TrendingUp size={16} style={{ color: 'var(--color-warning)' }} />
            <h4 style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
              Procurement Impact of Forecast Bias ({formatSignedMW(accuracy?.bias, '—')})
            </h4>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
            Because National Grid ESO forecasts systematically overestimated actual wind generation throughout January 2026, an unhedged buyer relying strictly on the day-ahead forecast would have over-procured power, facing imbalance cashout penalties on the physical deficit.
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
            <HelpCircle size={16} style={{ color: 'var(--color-accent-secondary)' }} />
            <h4 style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
              Persistence Skill Benchmark Note
            </h4>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
            The naive persistence benchmark holds the last observed generation prior to the decision cutoff constant across the delivery day. While the {formatSkill(accuracy?.persistenceSkill, 'positive')} skill score confirms WINDFOR outperforms a flat baseline, flat persistence is an elementary reference, not a commercial forecasting model.
          </p>
        </div>
      </div>
    </div>
  );
}
