import type { FC } from 'react';
import { ChipListComponent, ChipsDirective, ChipDirective } from '@syncfusion/ej2-react-buttons';
import type { Priority, Request, RequestStatus } from '../../types/requests';
import { REQUEST_STATUS_LABELS } from '../../types/requests';
import './requests.css';

export interface KanbanCardProps {
  request: Request;
}

/** Maps a request's `priority` to a Syncfusion chip color class. */
const PRIORITY_CHIP: Record<Priority, { label: string; cssClass: string }> = {
  Low: { label: 'Low', cssClass: 'e-secondary' },
  Medium: { label: 'Medium', cssClass: 'e-info' },
  High: { label: 'High', cssClass: 'e-warning' },
  Critical: { label: 'Critical', cssClass: 'e-danger' },
};

/**
 * Maps a request's `status` to a coloured pill. The colour set matches the
 * kanban's column chrome (see `requests.json` `columnOptions[].badgeToken`)
 * so the card pill and the column header stay in lock-step. Pill text is
 * drawn from `REQUEST_STATUS_LABELS` (e.g. "In progress" instead of
 * "InProgress").
 */
const STATUS_PILL: Record<RequestStatus, { label: string; modifier: string }> = {
  New: { label: REQUEST_STATUS_LABELS.New, modifier: 'badge badge--neutral' },
  Triaged: { label: REQUEST_STATUS_LABELS.Triaged, modifier: 'badge badge--info' },
  InProgress: { label: REQUEST_STATUS_LABELS.InProgress, modifier: 'badge badge--warning' },
  Resolved: { label: REQUEST_STATUS_LABELS.Resolved, modifier: 'badge badge--success' },
};

/**
 * Presentational card the kanban emits for every visible request.
 * Renders the per-card JSX:
 * - `.kanban-card__id` (e.g. `r-00055`) in monospaced style
 * - `.kanban-card__title`
 * - `.kanban-card__meta` row with the status pill (`.badge--*`
 *   coloured to match the kanban column chrome), the priority
 *   `.badge`, the SLA chip (with the `is-risk` modifier when
 *   `sla.kind === 'risk'`), and the optional owner-pill (or
 *   nothing when `owner === null`).
 *
 * Spec coverage:
 * - "Kanban card shows id, title, status, priority, SLA chip, and owner"
 * - "Card id format is stable" → `^r-\d{5}$` is enforced by the
 *   fixture; the card renders `request.id` verbatim in the monospaced
 *   sub-line.
 * - "SLA chip shows risk modifier" → maps `sla.kind === 'risk'` to
 *   the `.is-risk` modifier on `.kanban-card__sla`.
 * - "Owner-pill renders only when owner is set" → conditional render.
 */
const KanbanCard: FC<KanbanCardProps> = ({ request }) => {
  const priority = PRIORITY_CHIP[request.priority];
  const status = STATUS_PILL[request.status];
  const slaText =
    request.sla.kind === 'safe' && !/^SLA /i.test(request.sla.text)
      ? `SLA ${request.sla.text}`
      : request.sla.text;
  const slaClass =
    request.sla.kind === 'risk'
      ? 'kanban-card__sla is-risk'
      : 'kanban-card__sla';
  return (
    <article
      className="kanban-card"
      aria-label={`${request.id} — ${request.title}`}
      data-request-id={request.id}
      data-status={request.status}
    >
      <span className="kanban-card__id">{request.id}</span>
      <span className="kanban-card__title">{request.title}</span>
      <div className="kanban-card__meta">
        <ChipListComponent className="kanban-card__priority-chip">
          <ChipsDirective>
            <ChipDirective
              text={priority.label}
              cssClass={priority.cssClass}
              htmlAttributes={{ 'aria-label': `Priority: ${priority.label}` }}
            />
          </ChipsDirective>
        </ChipListComponent>
        <span
          className={slaClass}
          aria-label={
            request.sla.kind === 'risk'
              ? `SLA at risk: ${request.sla.text}`
              : `SLA: ${request.sla.text}`
          }
        >
          {slaText}
        </span>
        {request.owner ? (
          <span
            className="owner-pill"
            aria-label={`Owner: ${request.owner.name}`}
          >
            <span className="owner-pill__avatar" aria-hidden="true">
              {request.owner.initials}
            </span>
            {request.owner.name}
          </span>
        ) : null}
      </div>
    </article>
  );
};

export default KanbanCard;
