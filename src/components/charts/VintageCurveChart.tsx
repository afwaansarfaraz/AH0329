import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { EChartsWrapper } from './EChartsWrapper';
import { VintageRecord, HourlyActual } from '../../api/types';
import { formatTimeOnly, formatDateTime } from '../../api/client';

interface VintageCurveChartProps {
  vintages: VintageRecord[];
  actuals?: Record<string, HourlyActual>;
  isLoading?: boolean;
}

export function VintageCurveChart({
  vintages,
  actuals = {},
  isLoading = false,
}: VintageCurveChartProps) {
  const option = useMemo<EChartsOption>(() => {
    // Group vintages by publishTime
    const byPublishTime: Record<string, VintageRecord[]> = {};
    vintages.forEach((v) => {
      if (!byPublishTime[v.publishTime]) {
        byPublishTime[v.publishTime] = [];
      }
      byPublishTime[v.publishTime].push(v);
    });

    // Get unique startTimes across all vintages for x-axis
    const allStartTimes = Array.from(new Set(vintages.map((v) => v.startTime))).sort();

    const xLabels = allStartTimes.map((st) => formatTimeOnly(st));

    // Color palette for vintages
    const vintageColors = ['#0D9488', '#F59E0B', '#16A34A', '#8B5CF6', '#EC4899', '#D97706'];

    const series: EChartsOption['series'] = Object.entries(byPublishTime)
      .slice(0, 5) // Display up to 5 vintage runs
      .map(([pubTime, records], idx) => {
        const recordMap = new Map(records.map((r) => [r.startTime, r.generation]));
        const data = allStartTimes.map((st) => recordMap.get(st) ?? null);
        const color = vintageColors[idx % vintageColors.length];

        return {
          name: `Run: ${formatDateTime(pubTime)}`,
          type: 'line',
          smooth: 0.25,
          showSymbol: false,
          itemStyle: { color },
          lineStyle: { width: 2, color },
          data,
        };
      });

    // Add Actual line if available
    const actualData = allStartTimes.map((st) => actuals[st]?.actualMW ?? null);
    if (actualData.some((v) => v !== null)) {
      series.push({
        name: 'Realized Actual',
        type: 'line',
        smooth: 0.25,
        showSymbol: false,
        itemStyle: { color: '#3B82F6' },
        lineStyle: { width: 2.5, color: '#3B82F6', type: 'dashed' },
        data: actualData,
      });
    }

    return {
      backgroundColor: 'transparent',
      animationDuration: 300,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#FFFFFF',
        borderColor: '#DCE8F0',
        borderWidth: 1,
        textStyle: { color: '#172B4D', fontSize: 12 },
        extraCssText: 'box-shadow: 0 4px 12px rgba(23, 43, 77, 0.1); border-radius: 8px;',
      },
      legend: {
        type: 'scroll',
        top: 0,
        textStyle: { color: '#64748B', fontSize: 11 },
        icon: 'circle',
      },
      grid: {
        left: 10,
        right: 15,
        bottom: 25,
        top: 40,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xLabels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#DCE8F0' } },
        axisLabel: { color: '#64748B', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: {
          color: '#64748B',
          fontSize: 11,
          formatter: (v: number) => `${v.toLocaleString()} MW`,
        },
        splitLine: { lineStyle: { color: '#DCE8F0', type: 'dashed' } },
      },
      series,
    };
  }, [vintages, actuals]);

  return (
    <EChartsWrapper
      option={option}
      loading={isLoading}
      style={{ height: '360px', width: '100%' }}
    />
  );
}
