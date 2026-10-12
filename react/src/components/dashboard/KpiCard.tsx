import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlarmClock,
  FileSignature,
  Hourglass,
  Inbox,
} from 'lucide-react';
import type { Kpi, KpiIconName, KpiId } from '../../types/dashboard';
import './KpiCard.css';

/**
 * Map of KPI icon-variant to the lucide-react icon component.
 * Mirrors the prototype's `kpi-card__icon--{variant}` classes.
 */
const ICON_MAP: Record<KpiIconName, LucideIcon> = {
  inbox: Inbox,
  'alarm-clock': AlarmClock,
  hourglass: Hourglass,
  'file-signature': FileSignature,
};

function getIconComponent(name: KpiIconName): LucideIcon {
  return ICON_MAP[name] || Inbox;
}

export interface KpiCardProps {
  kpi: Kpi;
  onActivate?: (kpiId: KpiId) => void;
}

/**
 * KPI summary tile rendered as a Syncfusion e-card. The root
 * `<button>` keeps the card keyboard-focusable so Enter/Space
 * activate it; the parent (KpiStrip) supplies `onActivate` which
 * receives the card's stable KPI id.
 *
 * Structure follows the Syncfusion Card design pattern
 * (`e-card` > `e-card-header` + `e-card-content`):
 *  - `e-card-header` hosts the icon medallion (top-right) and the
 *    label caption on the left.
 *  - `e-card-content` hosts the value and the delta/note footer.
 */
const KpiCard: FC<KpiCardProps> = ({ kpi, onActivate }) => {
  const Icon = getIconComponent(kpi.icon);

  return (
    <div
      className="e-card kpi-card"
      role="listitem"
      data-kpi={kpi.id}
      title={kpi.title}
      aria-label={`${kpi.label}: ${kpi.value}. ${kpi.note ?? ''}`.trim()}
    >
      <div className="e-card-header kpi-card__header">
        <div className="e-card-header-caption kpi-card__caption">
          <div className="e-card-header-title kpi-card__label">{kpi.label}</div>
        </div>
        <span
          className={`kpi-card__icon kpi-card__icon--${kpi.iconVariant}`}
          aria-hidden="true"
        >
          <Icon size={18} strokeWidth={1.75} />
        </span>
      </div>
      <div className="e-card-content kpi-card__content">
        <span className="kpi-card__value">{kpi.value}</span>
        <span className="kpi-card__note">
          {kpi.delta?.startsWith('+') ? (
            <strong>{kpi.delta}</strong>
          ) : kpi.delta ? (
            kpi.delta
          ) : (
            kpi.note
          )}
        </span>
      </div>
    </div>
  );
};

export default KpiCard;
