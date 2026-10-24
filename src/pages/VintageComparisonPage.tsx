import { useState, useEffect } from 'react';
import { Layers, Clock, Filter, AlertCircle } from 'lucide-react';
import { Card } from '../components/common/Card';
import { VintageCurveChart } from '../components/charts/VintageCurveChart';
import { api, formatMW, formatDateTime, formatTimeOnly } from '../api/client';
import { VintageRecord } from '../api/types';

interface VintageComparisonPageProps {
  selectedDate: string;
}

export function VintageComparisonPage({ selectedDate }: VintageComparisonPageProps) {
  const [vintages, setVintages] = useState<VintageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<string>('all');

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setErrorMsg(null);

    api
      .getVintages({ deliveryDate: selectedDate, limit: 300 })
      .then((data) => {
        if (isCurrent) {
          setVintages(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isCurrent) {
          setErrorMsg(err.message || 'Failed to fetch forecast vintages.');
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedDate]);

  // Extract distinct delivery intervals for filter
  const deliveryIntervals = Array.from(new Set(vintages.map((v) => v.startTime))).sort();

  // Filtered vintages
  const displayVintages =
    selectedInterval === 'all'
      ? vintages
      : vintages.filter((v) => v.startTime === selectedInterval);

  // Group publication runs count
  const distinctPublishRuns = Array.from(new Set(vintages.map((v) => v.publishTime))).length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Page Title & Context */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-primary)' }}>
            <Layers size={18} />
            <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>
              VINTAGE TRAJECTORY ANALYSIS
            </span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
            Forecast Publication Vintages
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Inspect how National Grid ESO forecast revisions evolved across successive publication runs for {selectedDate}.
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
            }}
          >
            <Filter size={15} style={{ color: 'var(--color-text-muted)' }} />
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Delivery Interval:</span>
            <select
              value={selectedInterval}
              onChange={(e) => setSelectedInterval(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all" style={{ background: '#0B1425' }}>All 24 Hours</option>
              {deliveryIntervals.map((st) => (
                <option key={st} value={st} style={{ background: '#0B1425' }}>
                  {formatTimeOnly(st)} London
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div className="badge badge-teal" style={{ padding: '6px 12px', fontSize: '12px' }}>
          <Clock size={14} />
          <span>{distinctPublishRuns} Distinct Publication Runs</span>
        </div>
        <div className="badge badge-blue" style={{ padding: '6px 12px', fontSize: '12px' }}>
          <span>{vintages.length} Total Vintage Records</span>
        </div>
        <div className="badge badge-lime" style={{ padding: '6px 12px', fontSize: '12px' }}>
          <span>Anti-leakage audit enabled</span>
        </div>
      </div>

      {/* Multi-Run Vintage Curves Chart */}
      <Card
        title="Successive Forecast Trajectories vs Delivery Hours"
        subtitle="Comparing forecast profiles published at different lead times for the target delivery date"
      >
        {errorMsg ? (
          <div
            style={{
              padding: '30px',
              textAlign: 'center',
              color: 'var(--color-error)',
              background: 'var(--color-error-dim)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <AlertCircle size={20} style={{ margin: '0 auto 8px' }} />
            {errorMsg}
          </div>
        ) : (
          <VintageCurveChart vintages={displayVintages} isLoading={isLoading} />
        )}
      </Card>

      {/* Detailed Vintages Audit Table */}
      <Card
        title="Publication Vintage Records"
        subtitle={`Showing ${displayVintages.length} forecast updates published for this delivery window`}
      >
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
                <th style={{ padding: '10px 12px' }}>Publication Timestamp (London)</th>
                <th style={{ padding: '10px 12px' }}>Delivery Hour (UTC)</th>
                <th style={{ padding: '10px 12px' }}>Lead Time</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Forecast Generation</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} style={{ padding: '8px 12px' }}>
                      <div className="skeleton" style={{ height: '20px', width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : displayVintages.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No vintage records available for this selection.
                  </td>
                </tr>
              ) : (
                displayVintages.slice(0, 50).map((v, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: '1px solid var(--color-border-subtle)',
                      transition: 'background-color var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-panel)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
                      {formatDateTime(v.publishTime)}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-primary)' }}>
                      {formatTimeOnly(v.startTime)} (:00Z)
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="badge badge-teal">+{v.leadHours.toFixed(1)}h ahead</span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-accent-primary)' }}>
                      {formatMW(v.generation)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
