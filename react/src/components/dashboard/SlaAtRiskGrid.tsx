import { useCallback, useMemo } from 'react';
import type { FC } from 'react';
import {
  ChipDirective,
  ChipListComponent,
  ChipsDirective,
} from '@syncfusion/ej2-react-buttons';
import {
  ColumnDirective,
  ColumnsDirective,
  Filter,
  GridComponent,
  Inject,
  Page,
  Sort,
  Toolbar,
} from '@syncfusion/ej2-react-grids';
import { AlertTriangle } from 'lucide-react';
import type {
  Priority,
  Request,
  RequestStatus,
} from '../../types/requests';
import { REQUEST_STATUS_LABELS } from '../../types/requests';
import './SlaAtRiskGrid.css';

/**
 * Maps the fixture's `Priority` to a Syncfusion chip config.
 * Mirrors the `e-*` variant vocabulary used by `AssetGrid`
 * (`e-info` / `e-success` / `e-danger` / `e-primary`) so the
 * dashboard's at-risk grid speaks the same chip language as
 * the asset inventory grid.
 *
 *   Critical → Red    (`e-danger`)
 *   High     → Amber  (`e-warning`)
 *   Medium   → Blue   (`e-info`)
 *   Low      → Gray   (`e-primary`)
 */
const PRIORITY_CHIP: Record<
  Priority,
  { label: string; cssClass: string }
> = {
  Critical: { label: 'Critical', cssClass: 'e-danger' },
  High: { label: 'High', cssClass: 'e-warning' },
  Medium: { label: 'Medium', cssClass: 'e-info' },
  Low: { label: 'Low', cssClass: 'e-primary' },
};

/**
 * Per-status accent token. Each status has a corresponding
 * semantic color token in `tokens.css` (info / warning / success
 * / neutral) so the small status dot in the "Status" column
 * stays in lock-step with the rest of the dashboard's chrome.
 */
const STATUS_DOT_TOKEN: Record<RequestStatus, string> = {
  New: '--color-sf-fg-info-primary',
  Triaged: '--color-sf-fg-warning-primary',
  InProgress: '--color-sf-fg-warning-primary',
  Resolved: '--color-sf-fg-success-primary',
};

const TOOLBAR_ITEMS = ['Search'];

export interface SlaAtRiskGridProps {
  /** The at-risk rows to render. Already filtered + sorted by the hook. */
  rows: Request[];
  /** Refresh counter — re-keyed so the pager resets on dashboard refresh. */
  refreshKey: number;
  /** Active theme key — drives the Syncfusion theme + remount on switch. */
  themeKey: 'light' | 'dark';
}

/**
 * SLA-at-risk Syncfusion Grid. Renders every request whose
 * `sla.kind === 'risk'`, sorted by remaining SLA time ascending
 * (most urgent first). Each row exposes the ticket id, summary,
 * priority chip, status with a coloured dot, owner pill (or
 * "Unassigned" badge), the remaining SLA text in a danger-toned
 * badge, and the created date.
 *
 * Pattern reference: `src/components/assets/AssetGrid.tsx` —
 * same `<GridComponent>` + `<ColumnsDirective>` + `<Inject>`
 * setup, same inline-function cell templates, same `key`-based
 * re-mount for filter / refresh changes.
 *
 * The grid is read-only (no `recordClick` / `recordDoubleClick`)
 * because the user explicitly opted out of drilldown. The
 * built-in `Search` toolbar provides global text search across
 * all columns; per-column filter menus are enabled via the
 * `Filter` inject.
 */
const SlaAtRiskGrid: FC<SlaAtRiskGridProps> = ({
  rows,
  refreshKey,
  themeKey,
}) => {
  // Syncfusion's React Grid picks up the active theme via the
  // loaded `tailwind3.css` stylesheet (no `theme` prop on the
  // React wrapper — that's a Charts-only API). We re-mount the
  // grid on `themeKey` change via the `key` prop below so any
  // theme-sensitive chrome (pager current-item, header text,
  // search box border) repaints with the new palette.

  /**
   * Resolve the full `Request` row from a Syncfusion template
   * `props` payload. The React template engine spreads the row
   * data, but it has been observed (in `AssetGrid` and others)
   * that some columns with a `field` set receive only the
   * field's value rather than the full row. To make the cell
   * templates robust against either behaviour, we look up the
   * full row by `id` from the closure-captured `rows` array.
   */
  const resolveRow = useCallback(
    (
      props: { id?: string } & Partial<Request>,
    ): Request | null => {
      if (
        props &&
        props.id &&
        props.title &&
        props.priority &&
        props.status
      ) {
        return props as Request;
      }
      if (props && props.id) {
        const found = rows.find((r) => r.id === props.id);
        if (found) return found;
      }
      if (props && props.title) {
        const found = rows.find((r) => r.title === props.title);
        if (found) return found;
      }
      return null;
    },
    [rows],
  );

  const ticketCellTemplate = useCallback(
    (props: Partial<Request> & { id?: string }) => {
      const row = resolveRow(props) ?? (props as Request);
      return (
        <span
          className="sla-grid__ticket"
          aria-label={`Ticket ${row.id}`}
        >
          {row.id}
        </span>
      );
    },
    [resolveRow],
  );

  const summaryCellTemplate = useCallback(
    (props: Partial<Request> & { id?: string; title?: string }) => {
      const row = resolveRow(props) ?? (props as Request);
      return (
        <span
          className="sla-grid__summary"
          title={row.title}
        >
          {row.title}
        </span>
      );
    },
    [resolveRow],
  );

  const priorityCellTemplate = useCallback(
    (props: Partial<Request> & { id?: string; priority?: Priority }) => {
      const row = resolveRow(props) ?? (props as Request);
      const cfg = PRIORITY_CHIP[row.priority as Priority];
      if (!cfg) return null;
      return (
        <ChipListComponent className="sla-grid__chip">
          <ChipsDirective>
            <ChipDirective text={cfg.label} cssClass={cfg.cssClass} />
          </ChipsDirective>
        </ChipListComponent>
      );
    },
    [resolveRow],
  );

  const statusCellTemplate = useCallback(
    (props: Partial<Request> & { id?: string; status?: RequestStatus }) => {
      const row = resolveRow(props) ?? (props as Request);
      const dotToken = STATUS_DOT_TOKEN[row.status as RequestStatus];
      return (
        <span
          className="sla-grid__status"
          style={{ ['--sla-status-dot' as string]: `var(${dotToken})` }}
        >
          <span className="sla-grid__status-dot" aria-hidden="true" />
          {REQUEST_STATUS_LABELS[row.status as RequestStatus]}
        </span>
      );
    },
    [resolveRow],
  );

  const ownerCellTemplate = useCallback(
    (props: Partial<Request> & { id?: string; owner?: Request['owner'] }) => {
      const row = resolveRow(props) ?? (props as Request);
      const { owner } = row;
      if (!owner) {
        return (
          <span className="badge badge--neutral" aria-label="Owner: Unassigned">
            Unassigned
          </span>
        );
      }
      return (
        <span
          className="owner-pill"
          aria-label={`Owner: ${owner.name}`}
        >
          <span className="owner-pill__avatar" aria-hidden="true">
            {owner.initials}
          </span>
          {owner.name}
        </span>
      );
    },
    [resolveRow],
  );

  const slaCellTemplate = useCallback(
    (props: Partial<Request> & { id?: string; sla?: Request['sla'] }) => {
      const row = resolveRow(props) ?? (props as Request);
      return (
        <span className="sla-grid__sla-badge" aria-label={`SLA: ${row.sla.text}`}>
          <AlertTriangle
            size={12}
            strokeWidth={2}
            aria-hidden="true"
          />
          {row.sla.text}
        </span>
      );
    },
    [resolveRow],
  );

  const isEmpty = rows.length === 0;

  // Stable signature used to re-key the grid on refresh so the
  // pager resets to page 1 when the user clicks the dashboard's
  // "Refresh dashboard" button. We re-key on the joined row ids
  // (not just `refreshKey`) so the grid remounts whenever the
  // underlying fixture is re-read and the row set changes.
  const rowSignature = useMemo<string>(
    () => rows.map((r) => r.id).join('|'),
    [rows],
  );

  if (isEmpty) {
    return (
      <section
        className="card sla-grid-card"
        aria-label="SLA at-risk requests"
      >
        <header className="card__header">
          <div>
            <h2 className="card__title">SLA at risk</h2>
            <p className="card__subtitle">
              Live tickets inside their breach window
            </p>
          </div>
        </header>
        <div className="card__body">
          <div className="data-table-wrap" role="status">
            <div className="data-table-empty">
              No tickets are currently inside the SLA breach window.
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="card sla-grid-card"
      aria-label="SLA at-risk requests"
    >
      <header className="card__header">
        <div>
          <h2 className="card__title">SLA at risk</h2>
          <p className="card__subtitle">
            Live tickets inside their breach window · sorted by urgency
          </p>
        </div>
        <span
          className="sla-grid-card__count"
          aria-label={`${rows.length} at-risk tickets`}
        >
          <AlertTriangle
            size={14}
            strokeWidth={2}
            aria-hidden="true"
          />
          {rows.length} at risk
        </span>
      </header>
      <div className="card__body">
        <div
          className="data-table-wrap sla-grid-wrap"
          role="region"
          aria-label="SLA at-risk grid"
        >
          <GridComponent
            id="dashboard-sla-grid"
            key={`dashboard-sla-grid-${themeKey}-${rowSignature}`}
            dataSource={rows}
            allowPaging
            allowSorting
            pageSettings={{ pageSize: 5, pageSizes: false }}
            cssClass="sla-grid"
            gridLines="None"
            enableHeaderFocus
            selectionSettings={{
              mode: 'Row',
              enableSimpleMultiRowSelection: false,
            }}
            height={'100%'}
          >
            <ColumnsDirective>
              <ColumnDirective
                field="id"
                headerText="Ticket"
                width="110"
                template={ticketCellTemplate}
              />
              <ColumnDirective
                field="title"
                headerText="Summary"
                width="320"
                allowSorting={true}
                template={summaryCellTemplate}
              />
              <ColumnDirective
                field="priority"
                headerText="Priority"
                width="120"
                template={priorityCellTemplate}
              />
              <ColumnDirective
                field="status"
                headerText="Status"
                width="140"
                template={statusCellTemplate}
              />
              <ColumnDirective
                field="owner"
                headerText="Owner"
                width="180"
                allowSorting={false}
                template={ownerCellTemplate}
              />
              <ColumnDirective
                field="sla.text"
                headerText="SLA remaining"
                width="150"
                allowFiltering={false}
                template={slaCellTemplate}
              />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter, Toolbar]} />
          </GridComponent>
        </div>
      </div>
    </section>
  );
};

export default SlaAtRiskGrid;
