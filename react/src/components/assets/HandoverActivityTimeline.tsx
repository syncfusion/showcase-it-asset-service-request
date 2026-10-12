// Handover activity timeline — the right-rail "recent custody
// events" list. The spec calls for a pure-CSS `<ol>` with dot +
// connector (NOT `ejs-timeline` — its `content` template engine
// drops React children; this is already a known workaround
// documented in the project's user-memory notes).
//
// The component reads events from
// `src/data/assetDetail.json` (the same fixture the asset
// detail modal's Timeline tab uses) so the right rail and the
// modal agree on the same vocabulary. When the preselected
// asset has no entry in the detail fixture (e.g. the user
// opened `/handover` with a fresh asset id that hasn't been
// added yet), the component renders an empty-state row that
// invites the user to add the first event from the asset
// detail modal.
//
// The visual matches the asset detail modal's timeline as
// closely as possible: a left vertical rail with circular
// dots, an event title, an actor label, an ISO date stamp,
// and an optional note line.

import type { FC } from 'react';
import { FileText } from 'lucide-react';
import type {
  AssetDetailViewModel,
  AssetTimelineEvent,
} from '../../types/assets';
import useAssetDetail from './useAssetDetail';

export interface HandoverActivityTimelineProps {
  /**
   * The currently selected source asset's id. Renders an
   * empty state when `null` so the parent can pass the
   * asset id straight through without guarding the JSX.
   */
  sourceAssetId: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const HandoverActivityTimeline: FC<HandoverActivityTimelineProps> = ({
  sourceAssetId,
}) => {
  const { viewModel } = useAssetDetail(sourceAssetId);
  const events = viewModel?.timeline ?? [];

  if (!sourceAssetId) {
    return (
      <section
        className="handover-activity"
        aria-labelledby="handover-activity-title"
      >
        <header className="handover-activity__header">
          <h3
            className="handover-activity__title"
            id="handover-activity-title"
          >
            Activity
          </h3>
        </header>
        <p className="handover-activity__empty">
          Select a source asset to see its custody history.
        </p>
      </section>
    );
  }

  return (
    <section
      className="handover-activity"
      aria-labelledby="handover-activity-title"
    >
      <header className="handover-activity__header">
        <h3
          className="handover-activity__title"
          id="handover-activity-title"
        >
          Activity
        </h3>
        {events.length > 0 ? (
          <span className="handover-activity__count">
            {events.length} event{events.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </header>

      {events.length === 0 ? (
        <p className="handover-activity__empty">
          No custody history for this asset yet.
        </p>
      ) : (
        <ol className="handover-activity__list">
          {events.map((ev, idx) => (
            <TimelineRow
              key={`${ev.at}-${idx}`}
              event={ev}
              isLast={idx === events.length - 1}
            />
          ))}
        </ol>
      )}
    </section>
  );
};

export default HandoverActivityTimeline;

/* -------------------------------------------------------------------------- */

interface TimelineRowProps {
  event: AssetTimelineEvent;
  isLast: boolean;
}

const TimelineRow: FC<TimelineRowProps> = ({ event, isLast }) => {
  return (
    <li
      className={`handover-activity__row${isLast ? ' is-last' : ''}`}
      data-has-attachments={
        event.attachments && event.attachments.length > 0 ? 'true' : 'false'
      }
    >
      <span
        className="handover-activity__dot"
        aria-hidden="true"
      />
      <div className="handover-activity__content">
        <div className="handover-activity__row-meta">
          <span className="handover-activity__actor">{event.actor}</span>
          <span
            className="handover-activity__date"
            aria-label={`On ${formatDate(event.at)}`}
          >
            {formatDate(event.at)}
          </span>
        </div>
        <div className="handover-activity__title-line">
          {event.title}
        </div>
        {event.note ? (
          <p className="handover-activity__note">{event.note}</p>
        ) : null}
        {event.attachments && event.attachments.length > 0 ? (
          <ul className="handover-activity__attachments">
            {event.attachments.map((a) => (
              <li
                key={a.id}
                className="handover-activity__attachment"
              >
                <FileText
                  size={12}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span className="handover-activity__attachment-name">
                  {a.name}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
};

/** Re-export the view-model type for callers that want to
 *  use the timeline in tests. */
export type { AssetDetailViewModel };
