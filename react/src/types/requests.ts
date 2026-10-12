// Shared shape types for the Service Requests surface. Mirrors
// `src/data/requests.json` so the JSON import and the React tree agree
// on the same vocabulary (per the build-requests-page spec).
//
// The four column keys (`New` / `Triaged` / `In progress` / `Resolved`)
// use a stable internal enum (`RequestStatus`) so the type checker
// keeps the lookup tables in lock-step. The on-screen label is a
// separate field on `ColumnOption` so we can re-label a column without
// breaking the kanban's `keyField` mapping.

/** Priority buckets the fixture and toolbar both consume. */
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

/**
 * Stable internal column keys. The Syncfusion kanban's `keyField`
 * looks up cards against these values, so the JSON fixture uses
 * them verbatim. Display labels live on `ColumnOption.label`.
 */
export type RequestStatus = 'New' | 'Triaged' | 'InProgress' | 'Resolved';

/** SLA chip variants the card and dialog both render. */
export type SlaKind = 'safe' | 'risk';

/**
 * The SLA chip the card shows. `kind: 'safe'` renders as "SLA Nd";
 * `kind: 'risk'` carries the at-risk modifier and renders the raw
 * `text` (e.g. "2h 10m").
 */
export interface SlaChip {
  kind: SlaKind;
  text: string;
}

/**
 * Owner is either a named user (name + initials) or `null` for
 * unassigned requests. The dialog's "Assign to" dropdown also
 * surfaces a sentinel `(Unassigned)` option that maps to `null`.
 */
export type Owner = {
  name: string;
  initials: string;
} | null;

/** A single service-request row, sourced from `requests.json`. */
export interface Request {
  id: string;
  title: string;
  priority: Priority;
  status: RequestStatus;
  sla: SlaChip;
  owner: Owner;
  /** ISO `YYYY-MM-DD` for the request's created-at date. */
  createdAt: string;
}

/**
 * The kanban's per-column chrome. The prototype's column order is
 * enforced by the `key` ordering inside `columnOptions` — the
 * toolbar / board render the columns in the order they appear here.
 */
export interface ColumnOption {
  key: RequestStatus;
  label: string;
  /** Maps to the prototype's per-column badge colour. */
  badgeToken: 'neutral' | 'info' | 'warning' | 'success';
}

/**
 * Toolbar priority chip id. `'all'` is the no-op default; the other
 * three values map to a priority bucket or to the SLA risk flag.
 */
export type PriorityChipId = 'all' | Priority | 'sla-risk';

export interface PriorityOption {
  id: PriorityChipId;
  label: string;
}

/** SLA dropdown option for the new-request dialog. */
export interface SlaOption {
  id: string;
  label: string;
  chip: SlaChip;
}

/** Owner dropdown option for the new-request dialog. */
export interface OwnerOption {
  id: string;
  label: string;
  name: string;
  initials: string;
}

/** Single source of truth for the requests surface. */
export interface RequestsFixture {
  requests: Request[];
  columnOptions: ColumnOption[];
  priorityOptions: PriorityOption[];
  slaOptions: SlaOption[];
  ownerOptions: OwnerOption[];
}

/**
 * Form input the `NewRequestDialog` emits. The dialog's `addRequest`
 * callback receives this shape and the page's `useRequestsData`
 * hook normalises it into a full `Request` row.
 */
export interface NewRequestInput {
  title: string;
  priority: Priority;
  /** `null` for `(Unassigned)`, otherwise the owner option's id. */
  ownerId: string | null;
  sla: SlaChip;
  status: RequestStatus;
}

/**
 * The default form values the new-request dialog seeds on open.
 * Mirrors the spec's "form's default values" list.
 */
export const DEFAULT_NEW_REQUEST: NewRequestInput = {
  title: '',
  priority: 'Medium',
  ownerId: null,
  sla: { kind: 'safe', text: 'SLA 3d' },
  status: 'New',
};

/**
 * Ordered status key list — used by the toolbar to enumerate the
 * columns and by the hook to build the per-column count record.
 */
export const REQUEST_STATUSES: readonly RequestStatus[] = [
  'New',
  'Triaged',
  'InProgress',
  'Resolved',
] as const;

/**
 * Convenience: human-readable labels keyed by `RequestStatus`. The
 * dialog and column chrome consume this when they need to render the
 * on-screen name (`In progress` instead of `InProgress`).
 */
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  New: 'New',
  Triaged: 'Triaged',
  InProgress: 'In progress',
  Resolved: 'Resolved',
};
