import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart, BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';

// Register only the chart types, components, and renderers used by WindDesk
echarts.use([
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer,
]);

interface EChartsWrapperProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  loading?: boolean;
  onEvents?: Record<string, (params: unknown) => void>;
}

export function EChartsWrapper({
  option,
  style = { height: '320px', width: '100%' },
  className = '',
  loading = false,
  onEvents,
}: EChartsWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(containerRef.current, 'dark', {
        renderer: 'canvas',
      });
    }

    const chart = chartInstanceRef.current;

    if (onEvents) {
      Object.entries(onEvents).forEach(([eventName, handler]) => {
        chart.on(eventName, handler);
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      chart.resize({
        animation: {
          duration: 200,
          easing: 'cubicOut',
        },
      });
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (onEvents) {
        Object.keys(onEvents).forEach((eventName) => {
          chart.off(eventName);
        });
      }
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartInstanceRef.current) return;

    if (loading) {
      chartInstanceRef.current.showLoading({
        text: 'Loading chart...',
        color: '#26D9C4',
        textColor: '#9CAEC3',
        maskColor: 'rgba(16, 28, 50, 0.6)',
      });
    } else {
      chartInstanceRef.current.hideLoading();
      chartInstanceRef.current.setOption(option, {
        notMerge: true,
        lazyUpdate: true,
      });
    }
  }, [option, loading]);

  return <div ref={containerRef} style={style} className={className} />;
}
