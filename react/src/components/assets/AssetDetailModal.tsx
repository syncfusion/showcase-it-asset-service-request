// Asset detail modal — the canonical "deep dive" surface for any
// individual asset row in the IT Asset & Service Request Portal.
//
// The modal is a Syncfusion `DialogComponent` whose `content`
// slot is a purpose-built body (the `ModalBody` sub-component).
// The body owns the active-tab state and the per-row keyboard
// handlers, so re-opening the modal for a new asset does not
// re-create the Dialog host. The host still mounts/unmounts
// alongside `open` so the Syncfusion focus-trap / Esc /
// backdrop behavior is fully torn down between opens.
//
// The modal renders:
//   - A header (large title, id · serial subtitle, status badge,
//     close button) inside the Syncfusion `header` slot.
//   - An identity column (icon thumbnail, six-field meta-grid,
//     five-step lifecycle stepper) on the left.
//   - A three-tab strip (Timeline / Documents / Linked tickets)
//     on the right, with the body of each tab implemented as
//     a sub-component.
//   - A footer (Close / Open PDF / Start handover) inside the
//     Syncfusion `footerTemplate` slot.

import { useEffect, useMemo, useRef } from 'react';
import type { FC } from 'react';
import {
  DialogComponent,
} from '@syncfusion/ej2-react-popups';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { FileText, Handshake, X } from 'lucide-react';
import type {
  Asset,
  AssetDetailTabId,
  AssetDetailViewModel,
  AssetDocument,
  AssetIconName,
  AssetLinkedTicket,
  AssetTimelineEvent,
} from '../../types/assets';
import {
  ACTIVE_STEP_BY_STATUS,
  ASSET_DETAIL_TAB_LABEL,
  ASSET_DETAIL_TABS,
  LIFECYCLE_STEPS,
} from '../../types/assets';
import type { LucideIcon } from 'lucide-react';
import {
  Cable,
  Check,
  Headphones,
  Keyboard,
  Laptop,
  Monitor,
  Mouse,
  Plug,
  Printer,
  Smartphone,
  Speaker,
  Tablet,
  Webcam,
} from 'lucide-react';
import './assets.css';

export interface AssetDetailModalProps {
  /** Controls the modal's open/close state. */
  open: boolean;
  /** The asset the modal renders. The page resolves this through `useAssetDetail`. */
  asset: Asset | null;
  /** The per-asset supplementary data. The modal renders the empty
   * state (or the asset header alone) when this is `null`. */
  viewModel: AssetDetailViewModel | null;
  /** Active tab. Owned by the page so the URL `?tab=` can round-trip. */
  activeTab: AssetDetailTabId;
  /** Fired on close button, footer `Close`, Escape, or backdrop click. */
  onClose: () => void;
  /** Fired when the user activates a different tab. */
  onTabChange: (tab: AssetDetailTabId) => void;
  /** Fired when the user activates the `Start handover` footer button. */
  onStartHandover: () => void;
  /** Fired when the user activates the `Open PDF` footer button. */
  onOpenPdf: () => void;
  /** Fired when the user activates a linked ticket card. */
  onOpenTicket?: (ticketId: string) => void;
}

const MODAL_DIALOG_ID = 'asset-detail-modal';

/**
 * Lucide icon component map for the modal's identity column. Mirrors
 * the `ICON_MAP` in `AssetGrid.tsx` (the cell template uses the same
 * map, scaled to 64px here) so the asset's icon name resolves to the
 * same glyph the inventory shows.
 */
const ICON_MAP: Record<AssetIconName, LucideIcon> = {
  laptop: Laptop,
  monitor: Monitor,
  smartphone: Smartphone,
  headphones: Headphones,
  mouse: Mouse,
  keyboard: Keyboard,
  webcam: Webcam,
  speaker: Speaker,
  cable: Cable,
  printer: Printer,
  tablet: Tablet,
  dock: Plug,
};

/**
 * Status → badge CSS class + label. Mirrors the `STATUS_CHIP` map the
 * inventory cell template uses, so the modal header badge matches the
 * chip in the grid cell.
 */
const STATUS_CHIP: Record<
  Asset['status'],
  { label: string; cssClass: string }
> = {
  InUse: { label: 'In use', cssClass: 'badge--info' },
  Available: { label: 'Available', cssClass: 'badge--success' },
  InRepair: { label: 'In repair', cssClass: 'badge--danger' },
  Retired: { label: 'Retired', cssClass: 'badge--neutral' },
};

/**
 * Maps the fixture's `AssetLinkedTicket.priority` to a badge variant
 * matching the kanban card style. Mirrors the prototype's
 * `.badge--{danger,warning,info,neutral}` semantic.
 */
const PRIORITY_BADGE: Record<AssetLinkedTicket['priority'], string> = {
  Critical: 'badge--danger',
  High: 'badge--warning',
  Medium: 'badge--info',
  Low: 'badge--neutral',
};

/**
 * Format `byte` count as a human-readable size (e.g. `186 KB`).
 * Mirrors the prototype's `KB` / `MB` truncation.
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format an ISO `YYYY-MM-DD` date. Defensive: returns the input
 * unchanged when it doesn't parse.
 */
function formatDate(iso: string): string {
  if (!iso) return '';
  // Truncate any time component so we always render `YYYY-MM-DD`.
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}

/* ============================================================================
   Sub-component: LifecycleStepper
   Renders the five-step Procured → Imaged → Assigned → Refresh →
   Retired stepper. The active step is sourced from
   `ACTIVE_STEP_BY_STATUS[asset.status]`. Every step before the
   active one is marked `is-complete`, the active one `is-active`,
   and the rest are left as the future state.
   ========================================================================= */
interface LifecycleStepperProps {
  status: Asset['status'];
}

const LifecycleStepper: FC<LifecycleStepperProps> = ({ status }) => {
  const activeIndex = ACTIVE_STEP_BY_STATUS[status];
  return (
    <ol className="stepper" aria-label="Asset lifecycle">
      {LIFECYCLE_STEPS.map((label, idx) => {
        const state =
          idx < activeIndex
            ? 'is-complete'
            : idx === activeIndex
              ? 'is-active'
              : '';
        const isComplete = idx < activeIndex;
        return (
          <li
            key={label}
            className={`stepper__step ${state}`.trim()}
            aria-current={idx === activeIndex ? 'step' : undefined}
          >
            <span className="stepper__dot" aria-hidden="true">
              {isComplete ? (
                <Check size={12} strokeWidth={2.5} />
              ) : (
                <span>{idx + 1}</span>
              )}
            </span>
            <span className="stepper__label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
};

/* ============================================================================
   Sub-component: IdentityColumn
   Renders the modal's left-hand identity column: large icon
   thumbnail, six-field meta-grid, lifecycle stepper.
   ========================================================================= */
interface IdentityColumnProps {
  asset: Asset;
  viewModel: AssetDetailViewModel | null;
}

const IdentityColumn: FC<IdentityColumnProps> = ({ asset, viewModel }) => {
  const Icon: LucideIcon = ICON_MAP[asset.icon] ?? Laptop;
  const costCenter = viewModel?.costCenter ?? '—';
  const warrantyEndsAt = viewModel?.warrantyEndsAt ?? '';
  return (
    <div className="asset-detail__identity">
      <div className="asset-photo" aria-hidden="true">
        <Icon size={64} strokeWidth={1.5} />
      </div>
      <div className="meta-grid">
        <div className="meta-item">
          <span className="meta-item__label">Type</span>
          <span className="meta-item__value">{asset.type}</span>
        </div>
        <div className="meta-item">
          <span className="meta-item__label">Owner</span>
          <span className="meta-item__value">
            {asset.owner.name === 'Unassigned' ? 'Unassigned' : asset.owner.name}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-item__label">Location</span>
          <span className="meta-item__value">{asset.location}</span>
        </div>
        <div className="meta-item">
          <span className="meta-item__label">Purchased</span>
          <span className="meta-item__value">{formatDate(asset.purchased)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-item__label">Warranty</span>
          <span className="meta-item__value">
            {warrantyEndsAt
              ? `Warranty ends ${formatDate(warrantyEndsAt)}`
              : '—'}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-item__label">Cost center</span>
          <span className="meta-item__value mono">{costCenter}</span>
        </div>
      </div>
      <div>
        <p className="meta-item__label" style={{ marginBottom: 8 }}>
          Lifecycle
        </p>
        <LifecycleStepper status={asset.status} />
      </div>
    </div>
  );
};

/* ============================================================================
   Sub-component: TimelinePanel
   Renders the `Timeline` tab body as an ordered list of
   `AssetTimelineEvent`s, newest-first. Each event shows its
   timestamp, actor, title, optional note, and any attachments.
   ========================================================================= */
interface TimelinePanelProps {
  events: AssetTimelineEvent[];
  onAttachment: (doc: AssetDocument) => void;
}

const TimelinePanel: FC<TimelinePanelProps> = ({ events, onAttachment }) => {
  if (events.length === 0) {
    return (
      <div className="asset-detail__empty">No timeline events recorded.</div>
    );
  }
  // The fixture ships events newest-first; sort defensively so a
  // re-ordered fixture still renders chronologically newest first.
  const sorted = useMemo(
    () =>
      [...events].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)),
    [events],
  );
  return (
    <ol className="timeline" aria-label="Asset timeline">
      {sorted.map((event, idx) => (
        <li className="timeline__item" key={`${event.at}-${idx}`}>
          <div className="timeline__rail" aria-hidden="true">
            <span className="timeline__dot" />
          </div>
          <div className="timeline__content">
            <p className="timeline__title">{event.title}</p>
            <p className="timeline__meta">
              {formatDate(event.at)} · {event.actor}
            </p>
            {event.note ? (
              <p className="timeline__note">{event.note}</p>
            ) : null}
            {event.attachments && event.attachments.length > 0 ? (
              <ul className="timeline__attachments">
                {event.attachments.map((att) => (
                  <li key={att.id} className="timeline__attachment">
                    <button
                      type="button"
                      className="timeline__attachment-link"
                      onClick={() =>
                        onAttachment({
                          ...att,
                          view: true,
                        })
                      }
                      aria-label={`Open ${att.name}`}
                    >
                      <FileText size={14} strokeWidth={1.75} aria-hidden="true" />
                      <span>{att.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
};

/* ============================================================================
   Sub-component: DocumentsPanel
   Renders the `Documents` tab body. Each row shows the file's
   name, kind/size subtitle, and a secondary `View` button.
   ========================================================================= */
interface DocumentsPanelProps {
  documents: AssetDocument[];
  onView: (doc: AssetDocument) => void;
}

const DocumentsPanel: FC<DocumentsPanelProps> = ({ documents, onView }) => {
  if (documents.length === 0) {
    return (
      <div className="asset-detail__empty">No documents attached.</div>
    );
  }
  return (
    <ul className="asset-detail__docs" aria-label="Attached documents">
      {documents.map((doc) => (
        <li className="asset-detail__doc-row" key={doc.id}>
          <span className="asset-detail__doc-icon" aria-hidden="true">
            <FileText size={18} strokeWidth={1.75} />
          </span>
          <div className="asset-detail__doc-body">
            <strong className="asset-detail__doc-name">{doc.name}</strong>
            <span className="asset-detail__doc-sub">
              {doc.kind} · {formatSize(doc.sizeBytes)}
            </span>
          </div>
          {doc.view ? (
            <ButtonComponent
              cssClass="btn btn--secondary btn--sm"
              onClick={() => onView(doc)}
              aria-label={`View ${doc.name}`}
            >
              View
            </ButtonComponent>
          ) : null}
        </li>
      ))}
    </ul>
  );
};

/* ============================================================================
   Sub-component: LinkedTicketsPanel
   Renders the `Linked tickets` tab body as a stack of
   kanban-card-style rows. Each card surfaces the ticket's id,
   title, priority badge, status badge, SLA chip, and owner pill.
   ========================================================================= */
interface LinkedTicketsPanelProps {
  tickets: AssetLinkedTicket[];
  onOpenTicket?: (ticketId: string) => void;
}

const LinkedTicketsPanel: FC<LinkedTicketsPanelProps> = ({
  tickets,
  onOpenTicket,
}) => {
  if (tickets.length === 0) {
    return (
      <div className="asset-detail__empty">No linked service requests.</div>
    );
  }
  return (
    <ul className="asset-detail__tickets" aria-label="Linked service requests">
      {tickets.map((ticket) => (
        <li key={ticket.id}>
          <button
            type="button"
            className="kanban-card asset-detail__ticket"
            onClick={() => onOpenTicket?.(ticket.id)}
            data-request={ticket.id}
            aria-label={`Open request ${ticket.id}`}
          >
            <div className="kanban-card__id">{ticket.id}</div>
            <h3 className="kanban-card__title">{ticket.title}</h3>
            <div className="kanban-card__meta">
              <span className={`badge ${PRIORITY_BADGE[ticket.priority]}`}>
                {ticket.priority}
              </span>
              <span className="badge badge--warning">{ticket.status}</span>
              <span
                className={`kanban-card__sla${
                  ticket.sla.kind === 'risk' ? ' is-risk' : ''
                }`}
              >
                {ticket.sla.text}
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
};

/* ============================================================================
   Sub-component: ModalBody
   Renders the inner `.asset-detail` two-column layout (identity +
   tab strip). The body is rendered as a child of the Syncfusion
   `DialogComponent` so it inherits the dialog's `role="dialog"`
   / `aria-modal` / focus-trap surface.
   ========================================================================= */
interface ModalBodyProps {
  asset: Asset;
  viewModel: AssetDetailViewModel | null;
  activeTab: AssetDetailTabId;
  onTabChange: (tab: AssetDetailTabId) => void;
  onOpenPdf: (doc?: AssetDocument) => void;
  onOpenTicket?: (ticketId: string) => void;
}

const ModalBody: FC<ModalBodyProps> = ({
  asset,
  viewModel,
  activeTab,
  onTabChange,
  onOpenPdf,
  onOpenTicket,
}) => {
  const events = viewModel?.timeline ?? [];
  const documents = viewModel?.documents ?? [];
  const tickets = viewModel?.linkedTickets ?? [];
  return (
    <div className="asset-detail">
      <IdentityColumn asset={asset} viewModel={viewModel} />
      <div>
        <div
          className="detail-tabs"
          role="tablist"
          aria-label="Asset detail sections"
        >
          {ASSET_DETAIL_TABS.map((tab) => {
            const selected = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={selected ? 'true' : 'false'}
                aria-controls={`asset-detail-panel-${tab}`}
                id={`asset-detail-tab-${tab}`}
                className="detail-tab"
                onClick={() => onTabChange(tab)}
              >
                {ASSET_DETAIL_TAB_LABEL[tab]}
              </button>
            );
          })}
        </div>
        <div
          className="tab-panel"
          role="tabpanel"
          aria-labelledby={`asset-detail-tab-${activeTab}`}
          id={`asset-detail-panel-${activeTab}`}
          hidden={activeTab !== 'timeline'}
        >
          <TimelinePanel
            events={events}
            onAttachment={(doc) => onOpenPdf(doc)}
          />
        </div>
        <div
          className="tab-panel"
          role="tabpanel"
          aria-labelledby="asset-detail-tab-docs"
          id="asset-detail-panel-docs"
          hidden={activeTab !== 'docs'}
        >
          <DocumentsPanel documents={documents} onView={onOpenPdf} />
        </div>
        <div
          className="tab-panel"
          role="tabpanel"
          aria-labelledby="asset-detail-tab-tickets"
          id="asset-detail-panel-tickets"
          hidden={activeTab !== 'tickets'}
        >
          <LinkedTicketsPanel tickets={tickets} onOpenTicket={onOpenTicket} />
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   Top-level AssetDetailModal
   ========================================================================= */
const AssetDetailModal: FC<AssetDetailModalProps> = ({
  open,
  asset,
  viewModel,
  activeTab,
  onClose,
  onTabChange,
  onStartHandover,
  onOpenPdf,
  onOpenTicket,
}) => {
  const dialogRef = useRef<DialogComponent | null>(null);

  /**
   * Sync the dialog's `visible` flag with the parent's `open`
   * prop. The Syncfusion `Dialog` is happy to render unmounted
   * (it just won't show), but we still call `show()` / `hide()`
   * so the focus-trap and Esc handler stay in lock-step with
   * the React tree.
   */
  useEffect(() => {
    if (!dialogRef.current) return;
    if (open && !dialogRef.current.visible) {
      dialogRef.current.show();
    } else if (!open && dialogRef.current.visible) {
      dialogRef.current.hide();
    }
  }, [open]);

  if (!asset) return null;

  const statusCfg = STATUS_CHIP[asset.status];

  return (
    <DialogComponent
      ref={dialogRef}
      id={MODAL_DIALOG_ID}
      cssClass="asset-detail-dialog modal__dialog--lg"
      showCloseIcon={false}
      closeOnEscape
      close={onClose}
      width="1080px"
      visible={open}
      target=".app-shell__main"
      animationSettings={{ effect: 'Fade', duration: 200 }}
      header={() => (
        <div className="modal__header asset-detail-dialog__header">
          <div className="asset-detail-dialog__title-block">
            <h2 className="modal__title" id="asset-modal-title">
              {asset.title}
            </h2>
            <p className="modal__subtitle">
              {asset.id} · {asset.sub}
            </p>
          </div>
          <span
            className={`badge ${statusCfg.cssClass}`}
            style={{ marginTop: 4 }}
            aria-label={`Status: ${statusCfg.label}`}
          >
            {statusCfg.label}
          </span>
          <button
            type="button"
            className="icon-btn modal__close"
            onClick={onClose}
            aria-label="Close asset detail"
          >
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      )}
      footerTemplate={() => (
        <div className="modal__footer">
          <ButtonComponent
            cssClass="btn btn--ghost"
            onClick={onClose}
            aria-label="Close asset detail"
          >
            Close
          </ButtonComponent>
          <ButtonComponent
            cssClass="btn btn--secondary"
            onClick={() => onOpenPdf()}
            aria-label="Open PDF (placeholder)"
          >
            <FileText
              size={16}
              strokeWidth={1.75}
              aria-hidden="true"
              style={{ marginRight: 6, verticalAlign: '-2px' }}
            />
            Open PDF
          </ButtonComponent>
          <ButtonComponent
            cssClass="btn btn--primary"
            onClick={onStartHandover}
            aria-label="Start handover for this asset"
          >
            <Handshake
              size={16}
              strokeWidth={1.75}
              aria-hidden="true"
              style={{ marginRight: 6, verticalAlign: '-2px' }}
            />
            Start handover
          </ButtonComponent>
        </div>
      )}
    >
      <div className="modal__body asset-detail-dialog__body">
        <ModalBody
          asset={asset}
          viewModel={viewModel}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onOpenPdf={onOpenPdf}
          onOpenTicket={onOpenTicket}
        />
      </div>
    </DialogComponent>
  );
};

export default AssetDetailModal;
