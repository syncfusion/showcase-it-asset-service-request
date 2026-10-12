import { useCallback, useMemo, useRef } from 'react';
import type { FC, ReactElement } from 'react';
import {
  ColumnDirective,
  ColumnsDirective,
  KanbanComponent,
} from '@syncfusion/ej2-react-kanban';
import type { DragEventArgs } from '@syncfusion/ej2-kanban';
import type { ColumnCounts } from './useRequestsData';
import type {
  ColumnOption,
  Request,
  RequestStatus,
} from '../../types/requests';
import { REQUEST_STATUS_LABELS } from '../../types/requests';
import KanbanCard from './KanbanCard';
import './requests.css';

export interface KanbanBoardProps {
  rows: Request[];
  columnOptions: ColumnOption[];
  columnCounts: ColumnCounts;
  /**
   * Re-key signature — flipping this string remounts the kanban so a
   * filter / drag-and-drop change forces Syncfusion's internal card
   * cache to redraw consistently. Mirrors the assets page's
   * `filterKey` re-key pattern.
   */
  rowSignature: string;
  /**
   * Fired when a card is dropped in a different column. The page
   * updates its `rows` state.
   */
  onMove: (
    requestId: string,
    from: RequestStatus,
    to: RequestStatus,
  ) => void;
}

/** Maps a `ColumnOption.badgeToken` to a CSS class on the column header. */
const BADGE_TO_HEADER_CLASS: Record<ColumnOption['badgeToken'], string> = {
  neutral: 'kanban-col-header--neutral',
  info: 'kanban-col-header--info',
  warning: 'kanban-col-header--warning',
  success: 'kanban-col-header--success',
};

/**
 * Kanban board — renders the four fixed columns (`New` / `Triaged` /
 * `In progress` / `Resolved`) through Syncfusion's
 * `KanbanComponent`, with:
 * - a custom **card** template (`KanbanCard`) that emits the
 *   per-card JSX (id, title, priority badge, SLA chip, owner-pill)
 * - a custom **column** template per column that renders the
 *   prototype's column chrome (status badge + filtered count)
 * - `allowDragAndDrop` so cards can be moved between columns
 * - a `dragStop` handler that surfaces the move to the page
 *
 * Filtered counts: the per-column count we render is the
 * `columnCounts` map the page passes in (derived from the filtered
 * set, per the spec's "Column count re-derives from the filtered
 * set" scenario). We disable Syncfusion's built-in `showItemCount`
 * (it would render the count from the kanban's own data source,
 * which is the unfiltered `rows`) and instead render our own
 * filtered count in the column header template.
 *
 * Drag-and-drop: a card drop fires `dragStop`. We forward the move
 * to the page; the page updates its row state, re-derives the
 * filtered set and the per-column counts, and announces the move
 * via the page's `aria-live` region.
 *
 * Re-key: the kanban wrapper is re-keyed on `rowSignature` so a
 * status change forces a remount and Syncfusion's internal card
 * cache stays consistent (per the assets page's `filterKey`
 * pattern).
 */
const KanbanBoard: FC<KanbanBoardProps> = ({
  rows,
  columnOptions,
  columnCounts,
  rowSignature,
  onMove,
}) => {
  const kanbanRef = useRef<KanbanComponent | null>(null);
  // Track the source status of each card during drag to recover the
  // source column key in dragStop (Syncfusion's dragStop event carries
  // the destination keyField, not the source). The dragStart event fires
  // with the unmodified source record, so we capture it here and read it
  // in dragStop before clearing the entry.
  const sourceStatusById = useRef<Map<string, RequestStatus>>(new Map());

  /**
   * Syncfusion's card template — returns a JSX node for each row.
   * The kanban mounts the JSX into a `<div>` per card.
   */
  const cardTemplate = useCallback(
    (data: Record<string, unknown>) => {
      return <KanbanCard request={data as unknown as Request} />;
    },
    [],
  );

  /**
   * Per-column header template builder. Returns a stable JSX node
   * for the column's chrome. Syncfusion mounts this JSX into the
   * column header slot.
   */
  const buildColumnHeaderTemplate = useCallback(
    (key: RequestStatus) => {
      return (data: { keyField?: string | number }) => {
        const opt = columnOptions.find((c) => c.key === key);
        if (!opt) return <span>{REQUEST_STATUS_LABELS[key]}</span>;
        const count = columnCounts[key] ?? 0;
        const headerClass = `kanban-col__header kanban-col__header--${opt.badgeToken}`;
        return (
          <div className={headerClass}>
            <div className="kanban-col__title">
              <span
                className={`badge badge--${opt.badgeToken}`}
                aria-hidden="true"
              >
                {REQUEST_STATUS_LABELS[key]}
              </span>
            </div>
            <span
              className="kanban-col__count"
              aria-label={`${count} cards in ${REQUEST_STATUS_LABELS[key]}`}
            >
              {count}
            </span>
          </div>
        );
      };
    },
    [columnOptions, columnCounts],
  );

  /**
   * dragStart handler. Fires when the user begins dragging a card.
   * At this point, args.data carries the unmodified source record with
   * the source keyField intact. We stash the source status by card id
   * so we can recover it in dragStop (where args.data has already been
   * mutated to carry the destination keyField).
   */
  const handleDragStart = useCallback(
    (args: DragEventArgs) => {
      const data = args.data?.[0] as Record<string, unknown> | undefined;
      if (!data) return;
      const id = String(data.id ?? '');
      const status = data.status as RequestStatus | undefined;
      if (id && status) {
        sourceStatusById.current.set(id, status);
      }
    },
    [],
  );

  /**
   * dragStop handler. Syncfusion's DragEventArgs exposes the moved
   * card's data with the destination `keyField` already written.
   * We recover the source keyField from sourceStatusById (captured
   * during dragStart) and call onMove only when the column changed.
   */
  const handleDragStop = useCallback(
    (args: DragEventArgs) => {
      const data = args.data?.[0] as Record<string, unknown> | undefined;
      if (!data) return;
      const id = String(data.id ?? '');
      const to = data.status as RequestStatus | undefined;
      const from = sourceStatusById.current.get(id) ?? null;
      // Clear the entry so the map doesn't grow unbounded across many drags.
      sourceStatusById.current.delete(id);
      if (from && to && from !== to) {
        onMove(id, from, to);
      }
    },
    [onMove],
  );

  // Pre-compute per-column header templates so the render output is
  // stable across renders.
  const columnTemplates = useMemo(() => {
    return columnOptions.reduce<
      Record<
        RequestStatus,
        (data: { keyField?: string | number }) => ReactElement
      >
    >(
      (acc, col) => {
        acc[col.key] = buildColumnHeaderTemplate(col.key);
        return acc;
      },
      {} as Record<
        RequestStatus,
        (data: { keyField?: string | number }) => ReactElement
      >,
    );
  }, [columnOptions, buildColumnHeaderTemplate]);

  return (
    <div
      className="kanban-host requests-kanban"
      data-row-signature={rowSignature}
      key={rowSignature}
    >
      <KanbanComponent
        ref={kanbanRef}
        id="requests-kanban"
        cssClass="requests-kanban"
        keyField="status"
        dataSource={rows as unknown as Record<string, unknown>[]}
        allowDragAndDrop
        cardSettings={{
          headerField: 'id',
          showHeader: true,
          template: cardTemplate as unknown as null,
        }}
        dragStart={handleDragStart as unknown as undefined}
        dragStop={handleDragStop as unknown as undefined}
      >
        <ColumnsDirective>
          {columnOptions.map((col) => (
            <ColumnDirective
              key={col.key}
              keyField={col.key}
              headerText={REQUEST_STATUS_LABELS[col.key]}
              showItemCount={false}
              allowDrag
              allowDrop
              template={columnTemplates[col.key] as unknown as null}
            />
          ))}
        </ColumnsDirective>
      </KanbanComponent>

      {/* Empty-state overlay per column — only rendered when the
         filtered set yields zero cards for that column. The kanban
         itself doesn't expose an "empty column" hook, so we render
         the empty state via CSS pseudo-elements keyed off the
         `:empty` selector on the kanban's column body. The overlay
         is `aria-hidden` so screen readers don't double-announce. */}
      <div className="kanban-empty-overlay" aria-hidden="true">
        {columnOptions.map((col) => {
          const count = columnCounts[col.key] ?? 0;
          if (count !== 0) return null;
          return (
            <span
              key={col.key}
              className="kanban-col__empty"
              data-status={col.key}
            >
              No tickets match.
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;
