import { useCallback, useMemo, useState } from 'react';
import requestsFixture from '../../data/requests.json';
import type {
  ColumnOption,
  NewRequestInput,
  Owner,
  OwnerOption,
  PriorityChipId,
  PriorityOption,
  Request,
  RequestStatus,
  RequestsFixture,
  SlaChip,
  SlaOption,
} from '../../types/requests';
import {
  DEFAULT_NEW_REQUEST,
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
} from '../../types/requests';

/**
 * Keys the hook validates against the JSON fixture. A missing key
 * produces a render-time console error (loud in dev) rather than
 * silently rendering `undefined` rows.
 */
const REQUIRED_KEYS: (keyof RequestsFixture)[] = [
  'requests',
  'columnOptions',
  'priorityOptions',
  'slaOptions',
  'ownerOptions',
];

function assertFixtureShape(fixture: unknown): fixture is RequestsFixture {
  if (!fixture || typeof fixture !== 'object') {
    console.error('[useRequestsData] fixture is missing or not an object');
    return false;
  }
  const missing = REQUIRED_KEYS.filter((k) => !(k in (fixture as object)));
  if (missing.length > 0) {
    console.error(
      '[useRequestsData] requests.json is missing required keys:',
      missing,
    );
    return false;
  }
  return true;
}

/** Per-column card counts derived from the filtered row set. */
export type ColumnCounts = Record<RequestStatus, number>;

/** Shape the page receives from `useRequestsData`. */
export interface UseRequestsDataResult {
  /** The full local row set (fixture + locally-created). */
  rows: Request[];
  /** The composed filter + search result set. */
  filtered: Request[];
  /** Per-column counts derived from `filtered`. */
  columnCounts: ColumnCounts;
  /** Total rows in the local row set (fixture + new). */
  total: number;
  /** The filtered row count. */
  filteredTotal: number;
  /** Active priority chip id. */
  priority: PriorityChipId;
  /** Active search text (raw, untrimmed so the input is controlled). */
  search: string;
  setPriority: (next: PriorityChipId) => void;
  setSearch: (next: string) => void;
  /**
   * Prepends a new `Request` derived from the dialog's form output
   * to the local row set and returns the new row. The id is the
   * next `r-NNNNN` suffix greater than the largest current suffix.
   */
  addRequest: (input: NewRequestInput) => Request;
  /**
   * Updates an existing row's `status` field (used by the kanban's
   * drag-and-drop `dragStop` handler). No-op if the id is not in
   * the local row set or the destination matches the current
   * status.
   */
  moveRequest: (id: string, to: RequestStatus) => void;
  /** The next id the next `addRequest` call will assign. */
  nextId: string;
  /** Lookup tables consumed by the toolbar and the dialog. */
  columnOptions: ColumnOption[];
  priorityOptions: PriorityOption[];
  slaOptions: SlaOption[];
  ownerOptions: OwnerOption[];
  /** Human-readable labels for the four status keys. */
  requestStatusLabels: Record<RequestStatus, string>;
}

function emptyCounts(): ColumnCounts {
  return REQUEST_STATUSES.reduce<ColumnCounts>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as ColumnCounts);
}

function parseSuffix(id: string): number {
  const match = /^r-(\d+)$/.exec(id);
  if (!match) return 0;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) ? n : 0;
}

function formatId(n: number): string {
  return `r-${String(n).padStart(5, '0')}`;
}

function findOwner(options: OwnerOption[], ownerId: string | null): Owner {
  if (!ownerId) return null;
  const found = options.find((o) => o.id === ownerId);
  if (!found) return null;
  return { name: found.name, initials: found.initials };
}

function findSla(options: SlaOption[], slaId: string | null): SlaChip {
  if (!slaId) return DEFAULT_NEW_REQUEST.sla;
  const found = options.find((o) => o.id === slaId);
  return found ? found.chip : DEFAULT_NEW_REQUEST.sla;
}

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Composed predicate: search ∩ priority. `priority === 'all'` is a
 * no-op; `priority === 'sla-risk'` matches `sla.kind === 'risk'`;
 * any other value matches the request's `priority` field.
 */
function applyFilters(
  rows: Request[],
  priority: PriorityChipId,
  search: string,
): Request[] {
  const needle = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (priority !== 'all') {
      if (priority === 'sla-risk') {
        if (row.sla.kind !== 'risk') return false;
      } else if (row.priority !== priority) {
        return false;
      }
    }
    if (needle) {
      const haystack = `${row.id} ${row.title}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

function buildColumnCounts(filtered: Request[]): ColumnCounts {
  const counts = emptyCounts();
  for (const row of filtered) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}

/**
 * Reads `src/data/requests.json`, narrows the shape, owns the page's
 * `rows` / `search` / `priority` state, and returns the composed
 * filter + search result set, the per-column counts, the `addRequest`
 * helper for the new-request dialog, and the lookup tables consumed
 * by the toolbar and dialog.
 *
 * The page re-derives the result by passing `search` + `priority` in,
 * so the toolbar's `onSearchChange` / `onPriorityChange` callbacks are
 * thin pass-throughs to the hook's setters.
 */
export function useRequestsData(
  initialSearch: string = '',
  initialPriority: PriorityChipId = 'all',
): UseRequestsDataResult {
  // Stabilise the fixture reference once per mount.
  const fixture = useMemo<RequestsFixture>(() => {
    assertFixtureShape(requestsFixture);
    return requestsFixture as unknown as RequestsFixture;
  }, []);

  // Local row state. The fixture is the seed; `addRequest` prepends
  // to this list. The list is dropped on page reload (intentional —
  // matches the spec's "Locally-created cards are dropped on page
  // reload" scenario).
  const [rows, setRows] = useState<Request[]>(() => fixture.requests);
  const [search, setSearch] = useState<string>(initialSearch);
  const [priority, setPriority] = useState<PriorityChipId>(initialPriority);

  // Compose the filter + search into the visible card set.
  const filtered = useMemo<Request[]>(
    () => applyFilters(rows, priority, search),
    [rows, priority, search],
  );

  // Per-column counts re-derive from the filtered set so the count
  // always reflects the user's current intent.
  const columnCounts = useMemo<ColumnCounts>(
    () => buildColumnCounts(filtered),
    [filtered],
  );

  // The next `r-NNNNN` id the next addRequest call will assign.
  const nextSuffix = useMemo<number>(() => {
    let max = 0;
    for (const row of rows) {
      const s = parseSuffix(row.id);
      if (s > max) max = s;
    }
    return max + 1;
  }, [rows]);
  const nextId = useMemo<string>(() => formatId(nextSuffix), [nextSuffix]);

  /**
   * Prepends a new `Request` derived from the dialog's form output
   * to the local row set and returns the new row.
   */
  const addRequest = useCallback(
    (input: NewRequestInput): Request => {
      const owner = findOwner(fixture.ownerOptions, input.ownerId);
      // Sla is supplied directly in the input (the dialog's slaId
      // resolution happens in the dialog's onSave before this
      // callback fires), but we double-check by id-fallback in
      // case the dialog passes a chip directly.
      const sla: SlaChip = input.sla ?? findSla(fixture.slaOptions, null);
      const newRow: Request = {
        id: formatId(nextSuffix),
        title: input.title.trim(),
        priority: input.priority,
        status: input.status,
        sla,
        owner,
        createdAt: todayIso(),
      };
      setRows((prev) => [newRow, ...prev]);
      return newRow;
    },
    [fixture.ownerOptions, fixture.slaOptions, nextSuffix],
  );

  /**
   * Update an existing row's `status` field. Used by the kanban's
   * `dragStop` handler. No-op when the id is missing or the
   * destination matches the current status.
   */
  const moveRequest = useCallback(
    (id: string, to: RequestStatus) => {
      setRows((prev) => {
        let mutated = false;
        const next = prev.map((row) => {
          if (row.id !== id) return row;
          if (row.status === to) return row;
          mutated = true;
          return { ...row, status: to };
        });
        return mutated ? next : prev;
      });
    },
    [],
  );

  return {
    rows,
    filtered,
    columnCounts,
    total: rows.length,
    filteredTotal: filtered.length,
    priority,
    search,
    setPriority,
    setSearch,
    addRequest,
    moveRequest,
    nextId,
    columnOptions: fixture.columnOptions,
    priorityOptions: fixture.priorityOptions,
    slaOptions: fixture.slaOptions,
    ownerOptions: fixture.ownerOptions,
    requestStatusLabels: REQUEST_STATUS_LABELS,
  };
}

export default useRequestsData;
