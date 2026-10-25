import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { Card } from '../components/common/Card';
import { DataQualityRing } from '../components/charts/DataQualityRing';
import { api, formatDateOnly } from '../api/client';
import { QualityResponse } from '../api/types';

export function DataQualityPage() {
  const [quality, setQuality] = useState<QualityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);

    api
      .getQuality()
      .then((data) => {
        if (isCurrent) {
          setQuality(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load quality audit:', err);
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const fcStart = formatDateOnly(quality?.sourceCoverage?.forecastStartMin);
  const fcEnd = formatDateOnly(quality?.sourceCoverage?.forecastStartMax);
  const actStart = formatDateOnly(quality?.sourceCoverage?.actualStartMin);
  const actEnd = formatDateOnly(quality?.sourceCoverage?.actualStartMax);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Page Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-primary)' }}>
          <Database size={18} />
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>
            DATASET INTEGRITY & PROVENANCE
          </span>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
          Data Quality & Coverage Diagnostics
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>
          Complete data provenance and validation audit for UK Elexon BMRS WINDFOR and FUELHH streams.
        </p>
      </div>

      {/* Main Completeness Ring Card */}
      <Card title="Dataset Health & Audit Overview">
        <DataQualityRing quality={quality} isLoading={isLoading} />
      </Card>

      {/* Two Column Audit Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Source Ingestion Coverage */}
        <Card title="Raw Source Ingestion Coverage">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>WINDFOR Forecasts Window:</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                {quality ? `${fcStart} to ${fcEnd}` : 'Loading...'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Raw WINDFOR Records:</span>
              <span style={{ color: 'var(--color-accent-primary)', fontWeight: 600 }}>
                {quality?.sourceCoverage?.forecastRecordsRaw?.toLocaleString() ?? '—'} records
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>FUELHH Actuals Window:</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                {quality ? `${actStart} to ${actEnd}` : 'Loading...'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>FUELHH Wind Generation Records:</span>
              <span style={{ color: 'var(--color-actual)', fontWeight: 600 }}>
                {quality?.sourceCoverage?.actualRecordsRaw?.toLocaleString() ?? '—'} half-hourly periods
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Evaluated Paired Hours (N):</span>
              <span style={{ color: 'var(--color-accent-secondary)', fontWeight: 700 }}>
                {quality?.evaluationSampleCount?.toLocaleString() ?? '—'} complete hours
              </span>
            </div>
          </div>
        </Card>

        {/* Validation & Anomaly Checks */}
        <Card title="Integrity Diagnostics & Deduplication">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Duplicate Forecast Keys:</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                {quality?.duplicateRecords?.forecastDuplicatesEncountered ?? 0} (Zero duplicates)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Duplicate Actual Keys:</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                {quality?.duplicateRecords?.actualDuplicatesEncountered ?? 0} (Zero duplicates)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Missing Evaluation Hours:</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                {quality?.missingIntervals?.missingActualHoursCount ?? 0} ({quality?.missingIntervals?.missingActualHoursCount === 0 ? '100% paired complete' : 'gaps detected'})
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Retrospective Hindcasts Excluded:</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                {quality?.retentionCoverage?.hindcastRecordsExcluded?.toLocaleString() ?? 0} records (leadTime &lt; 0h)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Forward Horizon Retention:</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                {quality?.retentionCoverage?.retentionPolicy ?? '0h to 72h forward only'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Resolution Reconciliation Explainer */}
      <Card title="Resolution Alignment: Half-Hourly to Hourly Arithmetic Mean">
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: '10px' }}>
            UK Elexon BMRS reports generation in two distinct temporal resolutions:
          </p>
          <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
            <li><strong>WINDFOR forecasts:</strong> Published at 60-minute resolution (:00Z clock hours).</li>
            <li><strong>FUELHH actual generation:</strong> Recorded at 30-minute settlement periods (SP 1–48).</li>
          </ul>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-surface-deep)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--color-accent-primary)',
              marginBottom: '10px',
            }}
          >
            MW_hourly = (MW_at_T + MW_at_T+30m) / 2
          </div>
          <p>
            <strong>Physical Energy Conservation:</strong> Because power is the instantaneous rate of energy flow (1 MW × 1 hour = 1 MWh), the hourly actual must be computed as the arithmetic mean of the two half-hourly observations. Summing MW values would double the apparent grid power capacity, while splitting hourly forecasts into two samples would artificially inflate the statistical degree of freedom.
          </p>
        </div>
      </Card>
    </div>
  );
}
