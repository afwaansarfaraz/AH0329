import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { EChartsWrapper } from './EChartsWrapper';
import { HorizonBucketMetrics } from '../../api/types';

interface HorizonAccuracyChartProps {
  buckets: HorizonBucketMetrics[];
  isLoading?: boolean;
}

export function HorizonAccuracyChart({
  buckets,
  isLoading = false,
}: HorizonAccuracyChartProps) {
  const [metric, setMetric] = useState<'mae' | 'rmse' | 'wape'>('mae');

  const option = useMemo<EChartsOption>(() => {
    if (!buckets || buckets.length === 0) {
      return {
        backgroundColor: 'transparent',
        title: {
          text: 'No lead-time horizon buckets available',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#9CAEC3', fontSize: 12, fontWeight: 'normal' },
        },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      };
    }

    const xLabels = buckets.map((b) => b.bucket);
    const yValues = buckets.map((b) => {
      const val = b[metric];
      if (val === null || val === undefined || !Number.isFinite(val)) return null;
      return metric === 'wape'
        ? Number((val > 1 ? val : val * 100).toFixed(1))
        : Math.round(val);
    });

    const unitLabel = metric === 'wape' ? '%' : ' MW';

    return {
      backgroundColor: 'transparent',
      animationDuration: 300,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#FFFFFF',
        borderColor: '#DCE8F0',
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: '#172B4D', fontSize: 12 },
        extraCssText: 'box-shadow: 0 4px 12px rgba(23, 43, 77, 0.1); border-radius: 8px;',
        formatter: (params: unknown) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const b = buckets[idx];
          if (!b) return '';
          const valStr =
            metric === 'wape' && b.wape !== null
              ? `${(b.wape > 1 ? b.wape : b.wape * 100).toFixed(1)}%`
              : b[metric] !== null
              ? `${Math.round(b[metric] as number).toLocaleString()} MW`
              : '—';

          return `
            <div style="font-weight: 700; color: #172B4D; margin-bottom: 4px;">
              Lead-Time Horizon: ${b.bucket}
            </div>
            <div style="color: #64748B; font-size: 11px; margin-bottom: 6px;">
              Range: ${b.minLeadHours}h to ${b.maxLeadHours}h (${b.sampleCount.toLocaleString()} observations)
            </div>
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span style="color: #0D9488; font-weight: 600;">${metric.toUpperCase()}:</span>
              <span style="font-weight: 700; color: #172B4D;">${valStr}</span>
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
        axisLine: { lineStyle: { color: '#DCE8F0' } },
        axisLabel: { color: '#64748B', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: {
          color: '#64748B',
          fontSize: 11,
          formatter: (v: number) => `${v.toLocaleString()}${unitLabel}`,
        },
        splitLine: {
          lineStyle: { color: '#DCE8F0', type: 'dashed' },
        },
      },
      series: [
        {
          name: metric.toUpperCase(),
          type: 'line',
          smooth: 0.3,
          symbolSize: 7,
          itemStyle: { color: '#0D9488' },
          lineStyle: { width: 2.5, color: '#0D9488' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(13, 148, 136, 0.22)' },
                { offset: 1, color: 'rgba(13, 148, 136, 0.01)' },
              ],
            },
          },
          data: yValues,
        },
      ],
    };
  }, [buckets, metric]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '10px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--color-surface-panel)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px',
          }}
        >
          {(['mae', 'rmse', 'wape'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                background: metric === m ? 'var(--color-surface-elevated)' : 'transparent',
                color: metric === m ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                boxShadow: metric === m ? 'var(--shadow-card)' : 'none',
                textTransform: 'uppercase',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <EChartsWrapper option={option} loading={isLoading} style={{ height: '240px', width: '100%' }} />
    </div>
  );
}
