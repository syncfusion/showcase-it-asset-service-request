import { useCallback, useRef, useState } from 'react';
import type { FC } from 'react';
import PageHeader from '../components/PageHeader';
import KpiStrip from '../components/dashboard/KpiStrip';
import RequestVolumeChart from '../components/dashboard/RequestVolumeChart';
import SlaHealthChart from '../components/dashboard/SlaHealthChart';
import SlaAtRiskGrid from '../components/dashboard/SlaAtRiskGrid';
import DashboardToast from '../components/dashboard/DashboardToast';
import useDashboardData from '../components/dashboard/useDashboardData';
import useSlaAtRiskRequests from '../components/dashboard/useSlaAtRiskRequests';
import { useTheme } from '../hooks/useTheme';
import { Bot, RefreshCcw } from 'lucide-react';
import type { KpiId, Toast, ToastKind, ToastPayload, VolumeSeriesId } from '../types/dashboard';
import './Dashboard.css';

const FILTER_ALL: VolumeSeriesId = 'all' as unknown as VolumeSeriesId;
const REFRESH_INITIAL = 0;
type ThemeKey = 'light' | 'dark';

function nextToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function readThemeKey(theme: string): ThemeKey {
  return theme === 'dark' ? 'dark' : 'light';
}

function safeClipboardWrite(text: string): Promise<void> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    return navigator.clipboard.writeText(text).catch(() => undefined);
  }
  return Promise.resolve();
}

/**
 * Operations dashboard — KPI strip + request-volume column chart +
 * SLA health doughnut + Ops assistant chat rail. Page-header actions
 * expose "Ask assistant" (focuses the rail composer) and a refresh
 * icon button (re-derives fixtures).
 */
const Dashboard: FC = () => {
  const { theme } = useTheme();
  const themeKey = readThemeKey(theme);

  const [refreshKey, setRefreshKey] = useState<number>(REFRESH_INITIAL);
  const [activeSeries, setActiveSeries] = useState<string>(FILTER_ALL as unknown as string);
  const [toast, setToast] = useState<Toast | null>(null);

  const data = useDashboardData(refreshKey);
  const slaRiskLimit = data.kpis.find((kpi) => kpi.id === 'sla')?.value ?? 0;
  const slaRisks = useSlaAtRiskRequests(refreshKey, slaRiskLimit);
  const railRef = useRef<OpsAssistantRailHandle | null>(null);

  const showToast = useCallback((payload: string | ToastPayload) => {
    const body: ToastPayload | undefined =
      typeof payload === 'string' ? { title: payload } : payload;
    if (!body || !body.title) return;
    const kind: ToastKind = body.kind ?? 'success';
    setToast({ id: nextToastId(), kind, ...body });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const handleKpiActivate = useCallback(
    (kpiId: KpiId) => {
      showToast({
        kind: 'info',
        title: `Drill into ${kpiId}`,
        text: 'Navigation hint: ?drill=' + kpiId,
      });
    },
    [showToast],
  );

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    showToast({
      title: 'Dashboard refreshed',
      text: 'Fixtures re-read — refresh #' + (refreshKey + 1),
    });
  }, [showToast, refreshKey]);

  const handleAskAssistant = useCallback(() => {
    if (railRef.current) {
      railRef.current.scrollIntoView();
      // Focus on the next macrotask so scroll settles before focus
      // is requested (avoids layout-jump focus loss on Safari).
      setTimeout(() => {
        if (railRef.current) railRef.current.focusComposer();
      }, 240);
    } else {
      showToast({ kind: 'error', title: 'Assistant unavailable' });
    }
  }, [showToast]);

  const handleCopy = useCallback(
    ({ text }: { text: string }) => {
      safeClipboardWrite(text || '');
      showToast({ title: 'Summary copied', text: 'Clipboard updated.' });
    },
    [showToast],
  );

  const askAssistantLabel =
    data.pageActions?.askAssistant?.label ?? 'Ask assistant';
  const refreshLabel =
    data.pageActions?.refresh?.label ?? 'Refresh dashboard';

  const pageActions = (
    <>
      <button
        type="button"
        className="btn btn--primary page-header__btn"
        onClick={handleAskAssistant}
      >
        <Bot size={16} strokeWidth={1.75} aria-hidden="true" />
        {askAssistantLabel}
      </button>
      <button
        type="button"
        className="icon-btn page-header__icon-btn"
        onClick={handleRefresh}
        aria-label={refreshLabel}
        title={refreshLabel}
      >
        <RefreshCcw size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </>
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live service-request position across volume, SLA health, and the operations assistant."
        actions={pageActions}
      />
      <div className="page-body dashboard">
        <KpiStrip kpis={data.kpis} onActivate={handleKpiActivate} />
        <div className="dashboard-body">
            <RequestVolumeChart
              volume={data.volume}
              options={data.filters?.seriesOptions ?? []}
              activeId={activeSeries}
              onChange={setActiveSeries}
              themeKey={themeKey}
            />
            <SlaHealthChart
              sla={data.sla}
              slaCount={data.slaCount}
              themeKey={themeKey}
            />
        </div>
        <div className="dashboard-sla-grid">
          <SlaAtRiskGrid
            rows={slaRisks.rows}
            refreshKey={slaRisks.refreshKey}
            themeKey={themeKey}
          />
        </div>
        <div className="dashboard-toast-stack">
          <DashboardToast toast={toast} onDismiss={dismissToast} />
        </div>
      </div>
    </>
  );
};

export default Dashboard;
