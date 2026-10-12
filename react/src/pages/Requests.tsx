import { useCallback, useMemo, useState } from 'react';
import type { FC } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import RequestsToolbar from '../components/requests/RequestsToolbar';
import KanbanBoard from '../components/requests/KanbanBoard';
import NewRequestDialog from '../components/requests/NewRequestDialog';
import RequestsToast from '../components/requests/RequestsToast';
import useRequestsData from '../components/requests/useRequestsData';
import type { Toast } from '../types/dashboard';
import type {
  NewRequestInput,
  RequestStatus,
} from '../types/requests';
import { REQUEST_STATUS_LABELS } from '../types/requests';
import './Dashboard.css';

function nextToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/**
 * Service Requests page — renders the existing `PageHeader` with a
 * primary `New request` action (mirrored to the toolbar) and the
 * `.requests-body` block that hosts `<RequestsToolbar/>` (top) and
 * `<KanbanBoard/>` (below). The page also includes the
 * `<NewRequestDialog/>` and `<RequestsToast/>` so the dialog can
 * open from either the toolbar or the page header and the toast can
 * surface the `addRequest` confirmation.
 *
 * State (`rows`, `search`, `priority`, dialog open/close, toast,
 * aria-live message) is lifted into this page so the toolbar, board,
 * dialog, and toast stay in lock-step through a single
 * `useRequestsData` hook.
 */
const Requests: FC = () => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [liveMessage, setLiveMessage] = useState<string>('');

  const data = useRequestsData('', 'all');
  const {
    rows,
    filtered,
    columnCounts,
    total,
    filteredTotal,
    priority,
    search,
    setPriority,
    setSearch,
    addRequest,
    moveRequest,
    columnOptions,
    priorityOptions,
    slaOptions,
    ownerOptions,
  } = data;

  /**
   * Stable re-key signature for the kanban. Re-keying on every
   * filter / move forces a remount so Syncfusion's internal card
   * cache stays consistent (matches the assets page's `filterKey`
   * pattern).
   */
  const rowSignature = useMemo<string>(
    () => JSON.stringify(rows.map((r) => `${r.id}:${r.status}`)),
    [rows],
  );

  const showToast = useCallback((payload: Omit<Toast, 'id'>) => {
    setToast({
      id: nextToastId(),
      kind: payload.kind ?? 'success',
      title: payload.title,
      text: payload.text,
    });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const openDialog = useCallback(() => setDialogOpen(true), []);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  /**
   * Move handler — called by the kanban's `dragStop`. Updates the
   * local row state so the moved card lands in the destination
   * column on the next paint and the per-column counts re-derive
   * automatically. Also writes a brief move summary to the page's
   * `aria-live` region so screen readers announce the move.
   */
  const handleMove = useCallback(
    (requestId: string, _from: RequestStatus, to: RequestStatus) => {
      moveRequest(requestId, to);
      setLiveMessage(`${requestId} moved to ${REQUEST_STATUS_LABELS[to]}`);
    },
    [moveRequest],
  );

  const handleSave = useCallback(
    (input: NewRequestInput) => {
      const newRow = addRequest(input);
      setDialogOpen(false);
      setLiveMessage(`Request ${newRow.id} created`);
      showToast({
        kind: 'success',
        title: `Request ${newRow.id} created`,
        text: 'Saved locally — refresh the page to drop this change.',
      });
    },
    [addRequest, showToast],
  );

  const pageHeaderActions = (
    <ButtonComponent
      cssClass="btn btn--primary page-header__btn"
      onClick={openDialog}
      aria-label="Create a new request"
    >
      <Plus
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        style={{ marginRight: 6, verticalAlign: '-2px' }}
      />
      New request
    </ButtonComponent>
  );

  return (
    <>
      <PageHeader
        title="Service requests"
        description="Triage, prioritise, and move requests through the IT service desk pipeline on a single kanban board."
        actions={pageHeaderActions}
      />
      <div className="page-body requests-body">
        <RequestsToolbar
          search={search}
          onSearchChange={setSearch}
          priority={priority}
          priorityOptions={priorityOptions}
          onPriorityChange={setPriority}
          onNewRequest={openDialog}
          resultCount={filteredTotal}
          totalCount={total}
        />
        <KanbanBoard
          rows={filtered}
          columnOptions={columnOptions}
          columnCounts={columnCounts}
          rowSignature={rowSignature}
          onMove={handleMove}
        />
        {/* aria-live region — receives drag-and-drop move summaries
            so screen readers announce the move. */}
        <span className="requests-live" aria-live="polite">
          {liveMessage}
        </span>
      </div>
      <NewRequestDialog
        open={dialogOpen}
        ownerOptions={ownerOptions}
        slaOptions={slaOptions}
        onSave={handleSave}
        onClose={closeDialog}
      />
      <div className="requests-toast-stack">
        <RequestsToast toast={toast} onDismiss={dismissToast} />
      </div>
    </>
  );
};

export default Requests;
