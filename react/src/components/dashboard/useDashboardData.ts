import { useMemo } from 'react';
import dashboardFixture from '../../data/dashboard.json';
import type { DashboardFixture } from '../../types/dashboard';

/**
 * List of keys the dashboard consumes from the fixture. A missing key
 * produces a render-time console error (especially loud in dev mode)
 * rather than silently rendering `undefined` values.
 */
const REQUIRED_KEYS: (keyof DashboardFixture)[] = [
  'kpis',
  'volume',
  'sla',
  'assistant',
  'pageActions',
  'filters',
];

/**
 * Lightweight documentation of the fixture shape — exported so tests
 * and any future TypeScript migration can reuse the definition. The
 * runtime validator below picks the keys the shape needs; component
 * code narrows types by reading concrete fields (e.g.
 * `kpi.iconVariant`).
 */
export const dashboardPropTypes = {
  kpis: 'Array<{ id, label, value, delta, note, icon, iconVariant, title }>',
  volume:
    '{ title, subtitle, categories: string[], series: { all, incidents, service }: number[][] }',
  sla: '{ title, subtitle, buckets: Array<{ id, label, count, colorToken }> }',
  assistant:
    '{ title, subtitle, bannerLabel, prompts: Array<{ label, prompt }>, conversation: Array<{ id, role, meta?, text?, richText?, citations?, actions? }>, cannedResponses, footer? }',
  pageActions: '{ askAssistant: { label, icon }, refresh: { label, icon } }',
  filters: '{ seriesOptions: Array<{ id, label }> }',
};

function assertFixtureShape(fixture: unknown): fixture is DashboardFixture {
  if (!fixture || typeof fixture !== 'object') {
    console.error('[useDashboardData] fixture is missing or not an object');
    return false;
  }
  const missing = REQUIRED_KEYS.filter((k) => !(k in (fixture as object)));
  if (missing.length > 0) {
    console.error(
      '[useDashboardData] dashboard.json is missing required keys:',
      missing,
    );
    return false;
  }
  return true;
}

export interface UseDashboardDataResult extends DashboardFixture {
  /** Sum of SLA bucket counts (used by the donut centre label). */
  slaCount: number;
  /** The refresh counter as read. */
  refreshKey: number;
}

/**
 * Reads `src/data/dashboard.json`, narrows the shape, and returns the
 * derived slices used by the dashboard. The `refreshKey` parameter is a
 * stability counter — bumping it forces the memo to re-evaluate so the
 * dashboard's "Refresh" button can drive derived-state refresh.
 */
export function useDashboardData(refreshKey: number = 0): UseDashboardDataResult {
  return useMemo<UseDashboardDataResult>(() => {
    assertFixtureShape(dashboardFixture);

    const fixture = dashboardFixture as unknown as DashboardFixture;
    const slaCount = fixture.sla.buckets.reduce(
      (sum, b) => sum + b.count,
      0,
    );

    return {
      kpis: fixture.kpis,
      volume: fixture.volume,
      sla: fixture.sla,
      slaCount,
      assistant: fixture.assistant,
      pageActions: fixture.pageActions,
      filters: fixture.filters,
      refreshKey,
    };
  }, [refreshKey]);
}

export default useDashboardData;
