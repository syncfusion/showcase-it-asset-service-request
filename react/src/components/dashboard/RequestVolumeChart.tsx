import { useMemo } from 'react';
import type { FC } from 'react';
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  ColumnSeries,
  Category,
  Tooltip,
} from '@syncfusion/ej2-react-charts';
import SeriesFilter from './SeriesFilter';
import { useChartTokens } from './useChartPalette';
import type { SeriesOption, Volume, VolumeSeriesId } from '../../types/dashboard';
import './RequestVolumeChart.css';

const GRADIENT_ID = 'dashboard-volume-gradient';

const CHART_TOKEN_NAMES = [
  '--color-sf-chart-1',
  '--color-sf-border-primary',
  '--color-sf-fg-secondary',
] as const;

type ChartTokenSet = Record<(typeof CHART_TOKEN_NAMES)[number], string>;

interface ChartPoint {
  x: string;
  count: number;
}

export interface RequestVolumeChartProps {
  volume: Volume;
  options: SeriesOption[];
  activeId: VolumeSeriesId | string;
  onChange: (id: string) => void;
  themeKey: 'light' | 'dark';
}

/**
 * Request-volume column chart plus its series filter. Reads the
 * `volume` slice from the fixture (14 categories × 3 series options).
 */
const RequestVolumeChart: FC<RequestVolumeChartProps> = ({
  volume,
  options,
  activeId,
  onChange,
  themeKey,
}) => {
  const chartData = useMemo<ChartPoint[]>(() => {
    const series = volume.series as unknown as Record<string, number[] | undefined>;
    const counts = series[activeId] ?? series.all ?? [];
    return volume.categories.map((cat, i) => ({
      x: cat,
      count: counts[i] ?? 0,
    }));
  }, [volume, activeId]);

  const total = useMemo(
    () => chartData.reduce((sum, d) => sum + d.count, 0),
    [chartData],
  );

  // Subscribe to data-theme changes directly off the document root
  // so the chart palette always tracks the active theme, even if a
  // parent missed the React state update. Without this, navigating
  // away and back left the gradient stop stuck on the previous
  // theme's colour until the next full reload.
  const tokens = useChartTokens<ChartTokenSet>(CHART_TOKEN_NAMES);
  const primary = tokens['--color-sf-chart-1'] || '#175cd3';
  const grid = tokens['--color-sf-border-primary'] || '#e5e9f0';
  const label = tokens['--color-sf-fg-secondary'] || '#667085';

  // Syncfusion charts only read the `theme` prop on mount, so we
  // re-mount the chart when the active theme changes. This guarantees
  // the column fill, axis label colour, and gridline colour all
  // switch to the Tailwind3/Tailwind3Dark palette in lock-step with
  // the rest of the app.
  const sfTheme = themeKey === 'dark' ? 'Tailwind3Dark' : 'Tailwind3';

  return (
    <section className="card chart-card" aria-label={volume.title}>
      <header className="card__header">
        <div>
          <h2 className="card__title">{volume.title}</h2>
          <p className="card__subtitle">{volume.subtitle}</p>
          <p className="chart-card__sum" aria-live="polite">
            <strong>{total}</strong>
            <span> requests in the last 14 days</span>
          </p>
        </div>
        <SeriesFilter
          options={options}
          activeId={activeId}
          onChange={onChange}
        />
      </header>
      <div className="card__body">
        <ChartComponent
          key={`dashboard-request-volume-${themeKey}`}
          id="dashboard-request-volume"
          className="bar-chart-sf"
          theme={sfTheme}
          primaryXAxis={{
            valueType: 'Category',
            majorGridLines: { width: 0 },
            majorTickLines: { width: 0 },
            labelIntersectAction: 'Rotate45',
            labelStyle: { color: label, size: '0.625rem' },
          } as unknown as object}
          primaryYAxis={{
            labelFormat: '{value}',
            majorGridLines: { width: 1, color: grid },
            majorTickLines: { width: 0 },
            lineStyle: { width: 0 },
            labelStyle: { color: label, size: '0.6875rem' },
          }}
          tooltip={{
            enable: true,
            shared: true,
            format: '${point.x} · ${series.name}: <b>${point.y}</b>',
          }}
          chartArea={{ border: { width: 0 } }}
          background="transparent"
          height="232px"
          width="100%"
        >
          <Inject services={[ColumnSeries, Category, Tooltip]} />
          <SeriesCollectionDirective>
            <SeriesDirective
              dataSource={chartData}
              xName="x"
              yName="count"
              name="Requests"
              type="Column"
              cornerRadius={{ topLeft: 4, topRight: 4 }}
              fill={`url(#${GRADIENT_ID}-${themeKey})`}
              dataLabel={{ visible: false }}
              width={2}
              border={{ width: 0 }}
            />
          </SeriesCollectionDirective>
        </ChartComponent>
        <svg
          aria-hidden="true"
          focusable="false"
          width="0"
          height="0"
          className="chart-defs-svg"
        >
          <defs>
            <linearGradient
              id={`${GRADIENT_ID}-${themeKey}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor={primary} stopOpacity="1" />
              <stop offset="100%" stopColor={primary} stopOpacity="0.55" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </section>
  );
};

export default RequestVolumeChart;
