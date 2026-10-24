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
      .filter((v): v is number => v !== null && v !== undefined);

    let bins: { label: string; count: number; binStart: number }[] = [];

    if (errors.length > 0) {
      const minErr = errorType === 'signed' ? Math.min(-3000, ...errors) : 0;
      const maxErr = Math.max(3000, ...errors);
      const binCount = 15;
      const binWidth = (maxErr - minErr) / binCount;

      bins = Array.from({ length: binCount }, (_, i) => {
        const start = minErr + i * binWidth;
        const end = start + binWidth;
        const count = errors.filter((e) => e >= start && e < end).length;
        const label = `${Math.round(start).toLocaleString()} to ${Math.round(end).toLocaleString()}`;
        return { label, count, binStart: start };
      });
    } else {
      // Fallback synthetic bins
      bins = [
        { label: '< -1000', count: 4, binStart: -2000 },
        { label: '-1000 to 0', count: 12, binStart: -1000 },
        { label: '0 to 1000', count: 35, binStart: 0 },
        { label: '1000 to 2000', count: 68, binStart: 1000 },
        { label: '2000 to 3000', count: 42, binStart: 2000 },
        { label: '3000 to 4000', count: 18, binStart: 3000 },
        { label: '> 4000', count: 6, binStart: 4000 },
      ];
    }

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
          {distribution?.p50 !== undefined && (
            <span>Median: <strong style={{ color: 'var(--color-text-primary)' }}>+{Math.round(distribution.p50 ?? 0)} MW</strong></span>
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
