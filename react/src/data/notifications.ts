// Notification derivation for the AppBar bell.
//
// The fixture data already carries the right "at-a-glance" signals:
//   - `requests.json` -> `sla.kind === 'risk'` (8 entries) ∪
//                       `priority === 'Critical'` (5) ∪
//                       `owner === null` (2)
//   - `dashboard.json` -> `kpis[]` (4 KPI tiles)
//
// This helper reads the JSONs, derives a flat `NotificationItem[]`
// (capped at 10), and groups them into the two sections the popup
// renders: "Requests" (per-ticket items) and "System" (per-KPI items).
//
// The JSON files are imported eagerly because Vite bundles them as
// static assets — no network round trip. Re-derivation is cheap (the
// popup re-renders on every open) so we don't bother memoising.

import requestsFixture from './requests.json';
import dashboardFixture from './dashboard.json';
import type { Request } from '../types/requests';

/** Shape of a single notification surfaced in the AppBar bell popup. */
export interface NotificationItem {
  id: string;
  /** Which section of the popup this item lives in. */
  group: 'requests' | 'system';
  /**
   * Granular kind used for icon + label + severity colour:
   *  - `sla-risk`     -> red dot    (request whose SLA window is at risk)
   *  - `critical`     -> red dot    (Critical-priority request)
   *  - `unassigned`   -> amber dot  (request with no owner assigned)
   *  - `kpi-sla`      -> red dot    (dashboard "SLA at risk" KPI)
   *  - `kpi-open`     -> info dot   (dashboard "Open requests" KPI)
   *  - `kpi-aging`    -> amber dot  (dashboard "Aging assets" KPI)
   *  - `kpi-handover` -> success dot(dashboard "Pending handovers" KPI)
   */
  kind:
    | 'sla-risk'
    | 'critical'
    | 'unassigned'
    | 'kpi-sla'
    | 'kpi-open'
    | 'kpi-aging'
    | 'kpi-handover';
  /** Token used by the popup to colour the severity dot. */
  severity: 'danger' | 'warning' | 'info' | 'success';
  /** Primary line — used as the row title. */
  title: string;
  /** Secondary line — request id / context / KPI delta. */
  subtitle: string;
  /** Router path the item links to when clicked. */
  href: string;
}

/**
 * Cap so a long fixture never produces an overwhelming list. We pick
 * 14 so both the "Requests" and "System" sections always render —
 * 9 SLA risk + 1 unassigned + 4 KPIs = 14.
 */
const MAX_ITEMS = 14;

const REQUESTS = (requestsFixture as { requests: Request[] }).requests;
const KPIS = (dashboardFixture as { kpis: { id: string; label: string; value: number; delta: string; iconVariant: string }[] }).kpis;

const iconVariantToSeverity = (
  variant: string,
): NotificationItem['severity'] => {
  if (variant === 'danger') return 'danger';
  if (variant === 'warning') return 'warning';
  if (variant === 'success') return 'success';
  return 'info';
};

/**
 * Build the full list of notification items from the fixture data.
 * Order: SLA risk (newest first) → Critical → Unassigned → System KPIs.
 */
export const getNotifications = (): NotificationItem[] => {
  const items: NotificationItem[] = [];

  // --- Requests: SLA at risk ---------------------------------------------
  REQUESTS.filter((r) => r.sla.kind === 'risk')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .forEach((r) => {
      items.push({
        id: `sla-${r.id}`,
        group: 'requests',
        kind: 'sla-risk',
        severity: 'danger',
        title: r.title,
        subtitle: `${r.id} · SLA ${r.sla.text}`,
        href: `/requests?id=${encodeURIComponent(r.id)}`,
      });
    });

  // --- Requests: Critical (not already in SLA list, dedupe by id) -------
  const seen = new Set(items.map((i) => i.id.replace(/^sla-/, '')));
  REQUESTS.filter((r) => r.priority === 'Critical' && !seen.has(r.id))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .forEach((r) => {
      items.push({
        id: `crit-${r.id}`,
        group: 'requests',
        kind: 'critical',
        severity: 'danger',
        title: r.title,
        subtitle: `${r.id} · Critical · ${r.status}`,
        href: `/requests?id=${encodeURIComponent(r.id)}`,
      });
    });

  // --- Requests: Unassigned ----------------------------------------------
  const seen2 = new Set(items.map((i) => i.id.replace(/^(sla|crit)-/, '')));
  REQUESTS.filter((r) => r.owner === null && !seen2.has(r.id))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .forEach((r) => {
      items.push({
        id: `unas-${r.id}`,
        group: 'requests',
        kind: 'unassigned',
        severity: 'warning',
        title: r.title,
        subtitle: `${r.id} · Unassigned · ${r.priority}`,
        href: `/requests?id=${encodeURIComponent(r.id)}`,
      });
    });

  // --- System: dashboard KPIs --------------------------------------------
  KPIS.forEach((k) => {
    const kindMap: Record<string, NotificationItem['kind']> = {
      open: 'kpi-open',
      sla: 'kpi-sla',
      aging: 'kpi-aging',
      handovers: 'kpi-handover',
    };
    const kind = kindMap[k.id];
    if (!kind) return;
    items.push({
      id: `kpi-${k.id}`,
      group: 'system',
      kind,
      severity: iconVariantToSeverity(k.iconVariant),
      title: `${k.value} ${k.label.toLowerCase()}`,
      subtitle: k.delta,
      // System items link into the page each KPI represents.
      href:
        k.id === 'sla' || k.id === 'open'
          ? '/requests'
          : k.id === 'aging'
            ? '/assets'
            : '/handover',
    });
  });

  return items.slice(0, MAX_ITEMS);
};

/**
 * Unread count surfaced as a small badge on the bell.
 * We count *request* items only (KPIs are aggregate, not "unread").
 */
export const getUnreadCount = (): number => {
  return getNotifications().filter((n) => n.group === 'requests').length;
};
