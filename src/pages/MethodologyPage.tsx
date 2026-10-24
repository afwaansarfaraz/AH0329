import { FileText, ShieldAlert, Cpu, Calculator, Clock, Layers } from 'lucide-react';
import { Card } from '../components/common/Card';

export function MethodologyPage() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Page Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-primary)' }}>
          <FileText size={18} />
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>
            ENGINEERING & DOMAIN SPECIFICATION
          </span>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
          Methodology, Assumptions & Architecture
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>
          Comprehensive documentation of mathematical formulations, anti-leakage filters, and GB power market logic.
        </p>
      </div>

      {/* Prototype Cutoff Assumption Callout */}
      <div
        style={{
          padding: '20px 24px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
        }}
      >
        <ShieldAlert size={24} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '13px', lineHeight: 1.55 }}>
          <h4 style={{ color: 'var(--color-text-primary)', fontSize: '14px', marginBottom: '4px' }}>
            Core Prototype Assumption: D-1 09:20 Europe/London Cutoff
          </h4>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            WindDesk evaluates all historical decisions using a <strong>D-1 09:20 Europe/London decision cutoff</strong>. In the Great Britain electricity market, energy trading desks submit day-ahead orders ahead of power exchange auctions (such as EPEX SPOT UK at 11:00 or N2EX). The 09:20 cutoff represents an internal prototype desk decision point when wind positions are locked for execution. It is an explicit analytical assumption, not a statutory market code rule.
          </p>
        </div>
      </div>

      {/* Grid of Technical Topics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Anti-Leakage Decision Engine */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={16} style={{ color: 'var(--color-accent-primary)' }} />
              <span>Anti-Leakage Decision Engine</span>
            </div>
          }
        >
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '10px' }}>
              In real energy procurement, energy buyers can only trade against forecasts available <em>before</em> the decision cutoff. Post-hoc evaluations often suffer from <strong>look-ahead bias / data leakage</strong> by accidentally selecting forecasts revised after the cutoff or after delivery began.
            </p>
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--color-surface-deep)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-accent-primary)',
                marginBottom: '10px',
              }}
            >
              publishTime &le; T_cutoff AND startTime &gt; publishTime
            </div>
            <p>
              WindDesk programmatically filters all forecast vintages by UTC publication timestamp, ensuring zero data leakage in reported accuracy metrics.
            </p>
          </div>
        </Card>

        {/* Statistical Formulas */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={16} style={{ color: 'var(--color-accent-secondary)' }} />
              <span>Mathematical Formulations</span>
            </div>
          }
        >
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: 'var(--color-text-primary)' }}>Error Convention:</strong>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent-primary)' }}>
                error = forecast − actual
              </div>
              <span>Positive = Overforecasting, Negative = Underforecasting</span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: 'var(--color-text-primary)' }}>Mean Absolute Error (MAE):</strong>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                MAE = (1/N) &Sigma; |forecast_i − actual_i|
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: 'var(--color-text-primary)' }}>Root Mean Squared Error (RMSE):</strong>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                RMSE = &radic;[ (1/N) &Sigma; (forecast_i − actual_i)&sup2; ]
              </div>
            </div>
            <div>
              <strong style={{ color: 'var(--color-text-primary)' }}>Persistence Skill Score:</strong>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent-secondary)' }}>
                Skill = 1 − (MAE_forecast / MAE_persistence)
              </div>
            </div>
          </div>
        </Card>

        {/* Timezone Standards */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: 'var(--color-actual)' }} />
              <span>Timezone Standards & Canonical Storage</span>
            </div>
          }
        >
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '10px' }}>
              Elexon BMRS operates across Great Britain settlement periods, which observe Greenwich Mean Time (GMT) in winter and British Summer Time (BST) in summer.
            </p>
            <ul style={{ paddingLeft: '20px' }}>
              <li><strong>Internal Ingestion & Comparison:</strong> 100% ISO-8601 UTC with explicit trailing <code style={{ color: 'var(--color-accent-primary)' }}>Z</code>.</li>
              <li><strong>Cutoff Interpretation:</strong> Evaluated in <code style={{ color: 'var(--color-accent-primary)' }}>Europe/London</code> wall-clock time, dynamically resolving winter GMT and summer BST offsets.</li>
              <li><strong>User Presentation:</strong> UI formats timestamps in Europe/London for trader clarity.</li>
            </ul>
          </div>
        </Card>

        {/* Known Limitations */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} style={{ color: 'var(--color-warning)' }} />
              <span>Known Limitations & Scope Boundaries</span>
            </div>
          }
        >
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <ul style={{ paddingLeft: '20px' }}>
              <li><strong>Historical Window:</strong> Evaluated strictly on the January 2026 dataset (744 hours). Results reflect winter wind regime dynamics.</li>
              <li><strong>Resolution Asymmetry:</strong> Hourly forecasts are matched against two half-hourly actuals via arithmetic mean. Intra-hour wind ramps are smoothed out.</li>
              <li><strong>Flat Persistence:</strong> The naive persistence benchmark holds constant the last available actual before cutoff; it is not a commercial ML model.</li>
              <li><strong>Static Dataset:</strong> Uses deterministic processed artifacts; live grid telemetry feeds are not connected.</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
