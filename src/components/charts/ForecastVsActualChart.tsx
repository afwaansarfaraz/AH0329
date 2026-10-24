import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { EChartsWrapper } from './EChartsWrapper';
import { DecisionInterval } from '../../api/types';
import { formatTimeOnly } from '../../api/client';

interface ForecastVsActualChartProps {
  intervals: DecisionInterval[];
  cutoffLondon?: string;
  isLoading?: boolean;
}

export function ForecastVsActualChart({
  intervals,
  cutoffLondon,
  isLoading = false,
}: ForecastVsActualChartProps) {
  const [viewUnit, setViewUnit] = useState<'mw' | 'pct'>('mw');
  const [viewTimeMode, setViewTimeMode] = useState<'hourly' | 'sp'>('hourly');

  // Compute max actual for % scaling if needed
  const maxActual = useMemo(() => {
    const vals = intervals.map((i) => i.actualMW || 0);
    return Math.max(...vals, 1);
  }, [intervals]);

  const option = useMemo<EChartsOption>(() => {
    // Sort intervals chronologically
    const sorted = [...intervals].sort((a, b) =>
      a.deliveryInterval.localeCompare(b.deliveryInterval)
    );

    const xLabels = sorted.map((item) => {
      if (viewTimeMode === 'sp') {
        // Settlement Period is 2*hour + 1
        return `SP ${item.hour * 2 + 1}`;
      }
      return formatTimeOnly(item.deliveryInterval);
    });

    const forecastData = sorted.map((item) => {
      if (item.forecastMW === null || item.forecastMW === undefined) return null;
      return viewUnit === 'pct'
        ? Number(((item.forecastMW / maxActual) * 100).toFixed(1))
        : Math.round(item.forecastMW);
    });

    const actualData = sorted.map((item) => {
      if (item.actualMW === null || item.actualMW === undefined) return null;
      return viewUnit === 'pct'
        ? Number(((item.actualMW / maxActual) * 100).toFixed(1))
        : Math.round(item.actualMW);
    });

    const unitSuffix = viewUnit === 'pct' ? '%' : ' MW';

    return {
      backgroundColor: 'transparent',
      animationDuration: 400,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(11, 20, 37, 0.95)',
        borderColor: '#2A3D56',
        borderWidth: 1,
        padding: [12, 14],
        textStyle: { color: '#F1F5FA', fontSize: 12 },
        formatter: (params: unknown) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const record = sorted[idx];
          if (!record) return '';

          const dtStr = new Date(record.deliveryInterval).toLocaleString('en-GB', {
            timeZone: 'Europe/London',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });

          const fc = record.forecastMW !== null ? `${Math.round(record.forecastMW).toLocaleString()} MW` : '—';
          const act = record.actualMW !== null ? `${Math.round(record.actualMW).toLocaleString()} MW` : '—';
          
          let errorBadge = '—';
          if (record.signedErrorMW !== null && record.signedErrorMW !== undefined) {
            const errVal = Math.round(record.signedErrorMW);
            const isOver = errVal > 0;
            const errColor = isOver ? '#F59E0B' : '#38BDF8';
            errorBadge = `<span style="color: ${errColor}; font-weight: 600;">${errVal > 0 ? '+' : ''}${errVal.toLocaleString()} MW</span> (${isOver ? 'Overforecast' : 'Underforecast'})`;
          }

          return `
            <div style="font-weight: 600; margin-bottom: 8px; color: #F1F5FA;">
              ${dtStr} London (Hour ${record.hour})
            </div>
            <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
              <span style="color: #26D9C4;">● Forecast (D-1 Cutoff):</span>
              <span style="font-weight: 600;">${fc}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 6px;">
              <span style="color: #38BDF8;">● Realized Actual:</span>
              <span style="font-weight: 600;">${act}</span>
            </div>
            <div style="border-top: 1px solid #2A3D56; padding-top: 6px; display: flex; justify-content: space-between; gap: 24px;">
              <span style="color: #9CAEC3;">Signed Error:</span>
              <span>${errorBadge}</span>
            </div>
          `;
        },
      },
      legend: {
        data: ['Forecast (D-1 Cutoff)', 'Actual'],
        right: 120,
        top: 0,
        textStyle: { color: '#9CAEC3', fontSize: 12 },
        icon: 'circle',
        itemGap: 18,
      },
      grid: {
        left: 10,
        right: 15,
        bottom: 25,
        top: 35,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xLabels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#2A3D56' } },
        axisLabel: {
          color: '#9CAEC3',
          fontSize: 11,
          interval: 2,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: {
          color: '#9CAEC3',
          fontSize: 11,
          formatter: (value: number) => `${value.toLocaleString()}${unitSuffix}`,
        },
        splitLine: {
          lineStyle: {
            color: '#1E2F44',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: 'Forecast (D-1 Cutoff)',
          type: 'line',
          smooth: 0.25,
          showSymbol: false,
          symbolSize: 6,
          itemStyle: { color: '#26D9C4' },
          lineStyle: { width: 2.5, color: '#26D9C4' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(38, 217, 196, 0.28)' },
                { offset: 1, color: 'rgba(38, 217, 196, 0.01)' },
              ],
            },
          },
          data: forecastData,
        },
        {
          name: 'Actual',
          type: 'line',
          smooth: 0.25,
          showSymbol: false,
          symbolSize: 6,
          itemStyle: { color: '#38BDF8' },
          lineStyle: { width: 2, color: '#38BDF8' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(56, 189, 248, 0.22)' },
                { offset: 1, color: 'rgba(56, 189, 248, 0.01)' },
              ],
            },
          },
          data: actualData,
        },
      ],
    };
  }, [intervals, viewUnit, viewTimeMode, maxActual]);

  return (
    <div>
      {/* Chart Control Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Cutoff: {cutoffLondon || 'D-1 09:20 London'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Unit Toggle */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--color-surface-deep)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
            }}
          >
            <button
              onClick={() => setViewUnit('mw')}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                background: viewUnit === 'mw' ? 'var(--color-surface-panel)' : 'transparent',
                color: viewUnit === 'mw' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              }}
            >
              MW
            </button>
            <button
              onClick={() => setViewUnit('pct')}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                background: viewUnit === 'pct' ? 'var(--color-surface-panel)' : 'transparent',
                color: viewUnit === 'pct' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              }}
            >
              % Max
            </button>
          </div>

          {/* Time Resolution Toggle */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--color-surface-deep)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
            }}
          >
            <button
              onClick={() => setViewTimeMode('hourly')}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                background: viewTimeMode === 'hourly' ? 'var(--color-surface-panel)' : 'transparent',
                color: viewTimeMode === 'hourly' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              }}
            >
              Hourly
            </button>
            <button
              onClick={() => setViewTimeMode('sp')}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                background: viewTimeMode === 'sp' ? 'var(--color-surface-panel)' : 'transparent',
                color: viewTimeMode === 'sp' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              }}
            >
              Settlement Period
            </button>
          </div>
        </div>
      </div>

      <EChartsWrapper option={option} loading={isLoading} style={{ height: '340px', width: '100%' }} />
    </div>
  );
}
