import { useEffect, useState } from 'react';
import {
  TrendingUp,
  BarChart2,
  Scale,
  Percent,
  Crosshair,
  Info,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { KpiCard } from '../components/common/KpiCard';
import { ForecastVsActualChart } from '../components/charts/ForecastVsActualChart';
import { HorizonAccuracyChart } from '../components/charts/HorizonAccuracyChart';
import { ErrorDistributionChart } from '../components/charts/ErrorDistributionChart';
import { DataQualityRing } from '../components/charts/DataQualityRing';
import { api, formatMW, formatSignedMW, formatWape, formatSkill } from '../api/client';
import {
  DecisionResponse,
  AccuracySummaryResponse,
  HorizonResponse,
  DistributionResponse,
  QualityResponse,
} from '../api/types';
import { NavTab } from '../components/layout/Sidebar';

interface DecisionOverviewPageProps {
  selectedDate: string;
  selectedCutoff: string;
  onNavigateTab: (tab: NavTab) => void;
}

export function DecisionOverviewPage({
  selectedDate,
  selectedCutoff,
  onNavigateTab,
}: DecisionOverviewPageProps) {
  const [decision, setDecision] = useState<DecisionResponse | null>(null);
  const [overallAccuracy, setOverallAccuracy] = useState<AccuracySummaryResponse | null>(null);
  const [horizon, setHorizon] = useState<HorizonResponse | null>(null);
  const [distribution, setDistribution] = useState<DistributionResponse | null>(null);
  const [quality, setQuality] = useState<QualityResponse | null>(null);

  const [isLoadingDecision, setIsLoadingDecision] = useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch decision data when date or cutoff changes
  useEffect(() => {
    let isCurrent = true;
    setIsLoadingDecision(true);
    setErrorMsg(null);

    api
      .getDecision(selectedDate, selectedCutoff)
      .then((data) => {
        if (isCurrent) {
          setDecision(data);
          setIsLoadingDecision(false);
        }
      })
      .catch((err) => {
        if (isCurrent) {
          setErrorMsg(err.message || 'Failed to load decision data for this date.');
          setIsLoadingDecision(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedDate, selectedCutoff]);

  // Fetch global accuracy, horizon, distribution, and quality data once
  useEffect(() => {
    let isCurrent = true;
    setIsLoadingAnalytics(true);

    Promise.all([
      api.getAccuracySummary(),
      api.getAccuracyHorizon(),
      api.getAccuracyDistribution(),
      api.getQuality(),
    ])
      .then(([acc, hor, dist, qual]) => {
        if (isCurrent) {
          setOverallAccuracy(acc);
          setHorizon(hor);
          setDistribution(dist);
          setQuality(qual);
          setIsLoadingAnalytics(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load secondary analytics data:', err);
        if (isCurrent) setIsLoadingAnalytics(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  // Compute local daily metrics or fallback to summary
  const summary = decision?.summary;
  const isOverforecasting = (summary?.bias ?? overallAccuracy?.bias ?? 0) > 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Hero Welcome Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 28px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, rgba(23, 38, 64, 0.95) 0%, rgba(16, 28, 50, 0.98) 100%)',
          border: '1px solid var(--color-border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '680px', zIndex: 2 }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            Good morning
          </span>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: '4px 0 8px 0',
              lineHeight: 1.15,
            }}
          >
            Wind insights for <span style={{ color: 'var(--color-accent-primary)' }}>better decisions.</span>
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Analyse day-ahead wind forecasts, compare vintages, and understand forecast performance for smarter procurement.
          </p>
        </div>

        {/* UK Wind Context Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(11, 20, 37, 0.75)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            zIndex: 2,
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              UK Wind Fleet
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              January 2026 Historical Data
            </div>
          </div>
          <div
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-accent-primary-dim)',
              color: 'var(--color-accent-primary)',
            }}
          >
            <Info size={16} />
          </div>
        </div>
      </div>

      {/* KPI Cards Row (5 Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard
          title="Forecast MAE"
          value={formatMW(summary?.mae ?? overallAccuracy?.mae, 'Not available')}
          icon={<TrendingUp size={18} />}
          iconColor="var(--color-accent-primary)"
          iconBg="var(--color-accent-primary-dim)"
          trendText="Mean Absolute Error"
          trendDirection="down"
          tooltip="Average magnitude of forecast error per hour in MW."
          isLoading={isLoadingDecision}
        />

        <KpiCard
          title="Forecast RMSE"
          value={formatMW(summary?.rmse ?? overallAccuracy?.rmse, 'Not available')}
          icon={<BarChart2 size={18} />}
          iconColor="var(--color-accent-primary)"
          iconBg="var(--color-accent-primary-dim)"
          trendText="Root Mean Squared Error"
          trendDirection="down"
          tooltip="Penalises large volatility forecast swings heavily."
          isLoading={isLoadingDecision}
        />

        <KpiCard
          title="Forecast Bias"
          value={formatSignedMW(summary?.bias ?? overallAccuracy?.bias, 'Not available')}
          icon={<Scale size={18} />}
          iconColor="var(--color-warning)"
          iconBg="var(--color-warning-dim)"
          badgeText={isOverforecasting ? 'Overforecasting' : 'Underforecasting'}
          badgeVariant={isOverforecasting ? 'amber' : 'blue'}
          tooltip="Forecast minus Actual. Positive values mean model over-estimated wind generation."
          isLoading={isLoadingDecision}
        />

        <KpiCard
          title="WAPE"
          value={formatWape(summary?.wape ?? overallAccuracy?.wape, 'Not available')}
          icon={<Percent size={18} />}
          iconColor="var(--color-actual)"
          iconBg="var(--color-actual-dim)"
          trendText="Weighted % Error"
          trendDirection="down"
          tooltip="Total absolute error divided by total actual generation."
          isLoading={isLoadingDecision}
        />

        <KpiCard
          title="Persistence Skill"
          value={formatSkill(overallAccuracy?.persistenceSkill, 'Not available')}
          icon={<Crosshair size={18} />}
          iconColor="var(--color-accent-secondary)"
          iconBg="var(--color-accent-secondary-dim)"
          badgeText="vs Naive Baseline"
          badgeVariant="lime"
          tooltip="Relative skill score improvement over flat 1-hour lag persistence baseline."
          isLoading={isLoadingAnalytics}
        />
      </div>

      {/* Main Analysis Section: Forecast vs Actual & Right Panels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)',
          gap: '20px',
        }}
      >
        {/* Left 2/3: Forecast vs Actual Chart */}
        <Card
          title="Forecast vs Actual Wind Generation"
          subtitle={`Day-ahead procurement profile for ${selectedDate} under ${decision?.cutoffLondon || 'D-1 09:20'}`}
        >
          {errorMsg ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--color-error)',
                background: 'var(--color-error-dim)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {errorMsg}
            </div>
          ) : (
            <ForecastVsActualChart
              intervals={decision?.intervals || []}
              cutoffLondon={decision?.cutoffLondon}
              isLoading={isLoadingDecision}
            />
          )}
        </Card>

        {/* Right 1/3: Selected Vintage & Quick Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Selected Vintage Card */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} style={{ color: 'var(--color-accent-primary)' }} />
                <span>Selected Vintage</span>
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {decision?.cutoffLondon || 'D-1 09:20 (Prototype)'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Cutoff UTC: <code style={{ color: 'var(--color-accent-primary)' }}>{decision?.cutoffUtc || '—'}</code>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge badge-amber">Prototype cutoff</span>
                <span className="badge badge-teal">Anti-leakage enforced</span>
              </div>

              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.45,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-surface-deep)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                D-1 09:20 is a prototype assumption used for procurement decision analysis, not an official statutory market rule.
              </div>
            </div>
          </Card>

          {/* Quick Insights Card */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} style={{ color: 'var(--color-accent-secondary)' }} />
                <span>Quick Insights</span>
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}>↗</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Forecasts show a persistent <strong style={{ color: 'var(--color-text-primary)' }}>{isOverforecasting ? 'overforecasting bias' : 'underforecasting bias'}</strong> ({formatSignedMW(overallAccuracy?.bias, '—')} monthly average), increasing physical imbalance cashout exposure.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--color-accent-primary)', fontWeight: 700 }}>■</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Largest errors occur in the <strong style={{ color: 'var(--color-text-primary)' }}>12–24h lead horizon</strong>, aligning directly with day-ahead trading delivery hours.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--color-accent-secondary)', fontWeight: 700 }}>↑</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Model demonstrates <strong style={{ color: 'var(--color-text-primary)' }}>{formatSkill(overallAccuracy?.persistenceSkill, 'positive')} skill</strong> over the naive flat persistence benchmark.
                </span>
              </div>

              <button
                onClick={() => onNavigateTab('accuracy')}
                className="btn-ghost"
                style={{
                  marginTop: '6px',
                  width: '100%',
                  justifyContent: 'center',
                  fontSize: '11px',
                }}
              >
                Deep Accuracy Analysis
                <ArrowRight size={14} />
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Row: 3 Columns matching Reference Image */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Column 1: Forecast Accuracy by Horizon */}
        <Card
          title="Forecast Accuracy by Horizon"
          subtitle="MAE across 5 forward lead-time buckets"
          action={
            <button
              onClick={() => onNavigateTab('accuracy')}
              title="View full accuracy report"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <ArrowRight size={14} />
            </button>
          }
        >
          <HorizonAccuracyChart
            buckets={horizon?.buckets || []}
            isLoading={isLoadingAnalytics}
          />
        </Card>

        {/* Column 2: Error Distribution */}
        <Card
          title="Error Distribution"
          subtitle="Signed error frequency (forecast − actual)"
          action={
            <button
              onClick={() => onNavigateTab('distribution')}
              title="View distribution details"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <ArrowRight size={14} />
            </button>
          }
        >
          <ErrorDistributionChart
            distribution={distribution}
            intervals={decision?.intervals || []}
            isLoading={isLoadingAnalytics}
          />
        </Card>

        {/* Column 3: Data Quality */}
        <Card
          title="Data Quality"
          subtitle="January 2026 Elexon BMRS completeness audit"
          action={
            <button
              onClick={() => onNavigateTab('quality')}
              title="View complete data quality audit"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <ArrowRight size={14} />
            </button>
          }
        >
          <DataQualityRing quality={quality} isLoading={isLoadingAnalytics} />
        </Card>
      </div>
    </div>
  );
}
