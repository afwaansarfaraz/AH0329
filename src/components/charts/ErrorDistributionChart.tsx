import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { EChartsWrapper } from './EChartsWrapper';
import { DistributionResponse, DecisionInterval } from '../../api/types';

interface ErrorDistributionChartProps {
  distribution?: DistributionResponse | null;
  intervals?: DecisionInterval[];
  isLoading?: boolean;
}

export function ErrorDistributionChart({
  distribution,
  intervals = [],
  isLoading = false,
}: ErrorDistributionChartProps) {
  const [errorType, setErrorType] = useState<'signed' | 'absolute'>('signed');

  const option = useMemo<EChartsOption>(() => {
    // If we have intervals, build actual frequency bins
    const errors = intervals
      .map((i) => (errorType === 'signed' ? i.signedErrorMW : i.absoluteErrorMW))
      .filter((v): v is number => v !== null && v !== undefined && Number.isFinite(v));

    if (errors.length === 0) {
      return {
        backgroundColor: 'transparent',
        title: {
          text: 'No evaluated intervals available for distribution calculation',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#9CAEC3', fontSize: 12, fontWeight: 'normal' },
        },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      };
    }

    const minErr = errorType === 'signed' ? Math.min(-2000, ...errors) : 0;
    const maxErr = Math.max(2000, ...errors);
    const binCount = Math.min(15, Math.max(5, Math.ceil(Math.sqrt(errors.length))));
    const binWidth = (maxErr - minErr) / binCount || 100;

    const bins = Array.from({ length: binCount }, (_, i) => {
      const start = minErr + i * binWidth;
      const end = start + binWidth;
      const count = errors.filter((e) => e >= start && (i === binCount - 1 ? e <= end : e < end)).length;
      const label = `${Math.round(start).toLocaleString()} to ${Math.round(end).toLocaleString()}`;
      return { label, count, binStart: start };
    });

    const xLabels = bins.map((b) => b.label);
    const yCounts = bins.map((b) => b.count);

    return {
      backgroundColor: 'transparent',
      animationDuration: 300,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(11, 20, 37, 0.95)',
        borderColor: '#2A3D56',
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: '#F1F5FA', fontSize: 12 },
        formatter: (params: unknown) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const bin = bins[idx];
          if (!bin) return '';
          return `
            <div style="font-weight: 600; color: #F1F5FA; margin-bottom: 4px;">
              Range: ${bin.label} MW
            </div>
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span style="color: #26D9C4;">Frequency:</span>
              <span style="font-weight: 700;">${bin.count} hours</span>
            </div>
          `;
        },
      },
      grid: {
        left: 5,
        right: 15,
        bottom: 15,
        top: 25,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLine: { lineStyle: { color: '#2A3D56' } },
        axisLabel: {
          color: '#9CAEC3',
          fontSize: 10,
          rotate: 25,
          interval: 2,
        },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: '#9CAEC3', fontSize: 11 },
        splitLine: {
          lineStyle: { color: '#1E2F44', type: 'dashed' },
        },
      },
      series: [
        {
          name: 'Frequency',
          type: 'bar',
          barWidth: '70%',
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: (params: { dataIndex: number }) => {
              const bin = bins[params.dataIndex];
              if (!bin) return '#26D9C4';
              if (errorType === 'signed') {
                if (bin.binStart < 0) return '#38BDF8'; // Underforecast: blue
                if (bin.binStart < 1500) return '#26D9C4'; // Mild overforecast: teal
                return '#B7F36B'; // High overforecast: lime
              }
              return '#26D9C4';
            },
          },
          data: yCounts,
        },
      ],
    };
  }, [intervals, distribution, errorType]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
          {distribution?.p50 !== undefined && distribution?.p50 !== null && (
            <span>Median (P50): <strong style={{ color: 'var(--color-text-primary)' }}>{distribution.p50 > 0 ? '+' : ''}{Math.round(distribution.p50).toLocaleString()} MW</strong></span>
          )}
        </div>
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
            onClick={() => setErrorType('signed')}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px',
              background: errorType === 'signed' ? 'var(--color-surface-panel)' : 'transparent',
              color: errorType === 'signed' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            }}
          >
            Signed Error
          </button>
          <button
            onClick={() => setErrorType('absolute')}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px',
              background: errorType === 'absolute' ? 'var(--color-surface-panel)' : 'transparent',
              color: errorType === 'absolute' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            }}
          >
            Absolute Error
          </button>
        </div>
      </div>
      <EChartsWrapper option={option} loading={isLoading} style={{ height: '240px', width: '100%' }} />
    </div>
  );
}
