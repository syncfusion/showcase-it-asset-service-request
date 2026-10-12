import { useMemo } from 'react';
import type { FC } from 'react';
import {
  AccumulationChartComponent,
  AccumulationSeriesCollectionDirective,
  AccumulationSeriesDirective,
  Inject,
  PieSeries,
  AccumulationTooltip,
} from '@syncfusion/ej2-react-charts';
import type { Sla } from '../../types/dashboard';
import { useChartTokens } from './useChartPalette';
import './SlaHealthChart.css';

const SLICE_TOKEN_NAMES = ['--app-card-bg', '--color-sf-fg-primary'] as const;
type SliceTokenSet = Record<(typeof SLICE_TOKEN_NAMES)[number], string>;

interface DonutPoint {
  id: string;
  x: string;
  y: number;
  colorToken: string;
  color: string;
}

function readTokenOnce(name: string): string {
  if (typeof window === 'undefined') return '';
  return window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export interface SlaHealthChartProps {
  sla: Sla;
  slaCount: number;
  themeKey: 'light' | 'dark';
}

/**
 * SLA health doughnut chart with a token-driven legend and a centred
 * total label. Renders four slices from `sla.buckets`, uses the bucket's
 * `colorToken` as its raw colour, and hides Syncfusion's built-in
 * legend so the custom `.legend` markup (matching the prototype's
 * `role="img"` caption) is the canonical surface.
 */
const SlaHealthChart: FC<SlaHealthChartProps> = ({ sla, slaCount, themeKey }) => {
  // Subscribe to data-theme changes directly off the document root
  // so the donut centre label colour and the slice fills always
  // track the active theme, even if a parent missed the React state
  // update. Without this, navigating away and back left the donut
  // stuck on the previous theme's colour until the next full
  // reload.
  const tokens = useChartTokens<SliceTokenSet>(SLICE_TOKEN_NAMES);

  // Syncfusion accumulation charts only read the `theme` prop on
  // mount, so we re-mount the donut when the active theme changes.
  // This guarantees the slice fill colours (and any theme-driven
  // axis / border colours) switch to the Tailwind3/Tailwind3Dark
  // palette in lock-step with the rest of the app.
  const sfTheme = themeKey === 'dark' ? 'Tailwind3Dark' : 'Tailwind3';

  const dataPoints = useMemo<DonutPoint[]>(
    () =>
      sla.buckets.map((b) => ({
        id: b.id,
        x: b.label,
        y: b.count,
        colorToken: b.colorToken,
        color: readTokenOnce(b.colorToken) || '#175cd3',
      })),
    // Re-derive when theme changes so the `color` field on each
    // point picks up the new value of the underlying CSS variable
    // (the donut's `pointColorMapping="color"` reads this directly).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sla, themeKey, tokens],
  );

  return (
    <section className="card chart-card" aria-label={sla.title}>
      <header className="card__header">
        <div>
          <h2 className="card__title">{sla.title}</h2>
          <p className="card__subtitle">{sla.subtitle}</p>
        </div>
      </header>
      <div className="card__body">
        <div className="donut-wrap">
          <div
            className="donut"
            role="img"
            aria-label={`SLA distribution donut: ${dataPoints
              .map((d) => `${d.x} ${d.y}`)
              .join(', ')}`}
          >
            <AccumulationChartComponent
              key={`dashboard-sla-donut-${themeKey}`}
              id="dashboard-sla-donut"
              className="donut-chart-sf"
              theme={sfTheme}
              legendSettings={{ visible: false }}
              tooltip={{ enable: true, format: '${point.x}: <b>${point.y}</b>' }}
              background="transparent"
              height="180px"
              width="180px"
            >
              <Inject
                services={[
                  PieSeries,
                  AccumulationTooltip,
                ]}
              />
              <AccumulationSeriesCollectionDirective>
                <AccumulationSeriesDirective
                  dataSource={dataPoints}
                  xName="x"
                  yName="y"
                  name="SLA"
                  type="Pie"
                  innerRadius="62%"
                  radius="100%"
                  pointColorMapping="color"
                  dataLabel={{ visible: false }}
                  startAngle={0}
                  endAngle={360}
                />
              </AccumulationSeriesCollectionDirective>
            </AccumulationChartComponent>
            <div
              className="donut__center"
              aria-hidden="true"
              style={{ color: tokens['--color-sf-fg-primary'] || '#172033' }}
            >
              <strong>{slaCount}</strong>
              <span>open</span>
            </div>
          </div>
          <ul className="legend">
            {sla.buckets.map((b) => (
              <li key={b.id} className="legend__item">
                <span
                  className="legend__swatch"
                  style={{ background: `var(${b.colorToken})` }}
                  aria-hidden="true"
                />
                <span className="legend__label">{b.label}</span>
                <span className="legend__value">{b.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default SlaHealthChart;
