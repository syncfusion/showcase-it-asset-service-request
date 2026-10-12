import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { CSSProperties } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import {
  getNotifications,
  getUnreadCount,
  type NotificationItem,
} from '../data/notifications';

export interface NotificationsPopoverHandle {
  /** Open the popover. */
  open: () => void;
  /** Close the popover if it is open. */
  close: () => void;
  /** Toggle visibility. */
  toggle: () => void;
}

const POPOVER_WIDTH = 360;

/**
 * Non-modal Syncfusion Dialog positioned below the app bar near
 * the bell, listing at-a-glance notification items derived from
 * the fixture data in
 * [notifications.ts](../data/notifications.ts). Items are rendered
 * as read-only rows — there are no clickable actions on purpose.
 *
 * The dialog's content is grouped into two sections the popup
 * surfaces visually:
 *   - **Requests** — per-ticket items (SLA at risk, Critical,
 *     Unassigned). Dots are red (`danger`) or amber (`warning`).
 *   - **System** — per-KPI items derived from the dashboard. Dot
 *     colour tracks the KPI's `iconVariant` (info / danger /
 *     warning / success).
 *
 * The popover re-derives the list on every render. The fixture
 * data is bundled as a static asset by Vite, so the cost is
 * negligible and the re-derivation keeps the count + lists in
 * lock-step without any memoisation.
 */
const NotificationsPopover = forwardRef<NotificationsPopoverHandle>(
  (_props, ref) => {
    const dialogRef = useRef<DialogComponent | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    // Re-derived on every render — cheap (small static JSON) and
    // guarantees the header count + the rendered list always agree.
    const items = getNotifications();
    const requestItems = items.filter((i) => i.group === 'requests');
    const systemItems = items.filter((i) => i.group === 'system');
    const unreadCount = getUnreadCount();

    const open = useCallback(() => {
      setIsOpen(true);
      // Wait one frame so the Dialog has `isOpen` reflected on
      // the `visible` prop before being shown imperatively.
      requestAnimationFrame(() => {
        dialogRef.current?.show();
      });
    }, []);

    const close = useCallback(() => {
      dialogRef.current?.hide();
      setIsOpen(false);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        open,
        close,
        toggle: () => (isOpen ? close() : open()),
      }),
      [open, close, isOpen],
    );

    return (
      <DialogComponent
        ref={dialogRef}
        id="it-notifications-popover"
        className="it-notifications"
        showCloseIcon
        closeOnEscape
        width={`${POPOVER_WIDTH}px`}
        visible={isOpen}
        animationSettings={{ effect: 'FadeZoom', duration: 120, delay: 0 }}
        header="Notifications"
        open={() => setIsOpen(true)}
        close={() => setIsOpen(false)}
      >
        <div className="it-notifications__body">
          {items.length === 0 ? (
            <div className="it-notifications__empty">
              <CheckCircle2 size={28} strokeWidth={1.75} aria-hidden />
              <p className="it-notifications__empty-title">
                No new notifications
              </p>
              <p className="it-notifications__empty-hint">
                You&apos;re all caught up. New alerts will appear here.
              </p>
            </div>
          ) : (
            <>
              {requestItems.length > 0 ? (
                <NotificationSection
                  heading="Requests"
                  items={requestItems}
                />
              ) : null}
              {systemItems.length > 0 ? (
                <NotificationSection
                  heading="System"
                  items={systemItems}
                />
              ) : null}
            </>
          )}
        </div>
      </DialogComponent>
    );
  },
);

NotificationsPopover.displayName = 'NotificationsPopover';

export default NotificationsPopover;

/* ------------------------------------------------------------------ */
/*                            Subcomponents                           */
/* ------------------------------------------------------------------ */

interface NotificationSectionProps {
  heading: string;
  items: NotificationItem[];
}

const NotificationSection = ({ heading, items }: NotificationSectionProps) => (
  <section className="it-notifications__section">
    <h3 className="it-notifications__heading">{heading}</h3>
    <ul className="it-notifications__list">
      {items.map((item) => (
        <li key={item.id}>
          <NotificationRow item={item} />
        </li>
      ))}
    </ul>
  </section>
);

const SEVERITY_DOT_CLASS: Record<NotificationItem['severity'], string> = {
  danger: 'it-notifications__dot--danger',
  warning: 'it-notifications__dot--warning',
  info: 'it-notifications__dot--info',
  success: 'it-notifications__dot--success',
};

/**
 * Read-only row. `role="presentation"` keeps the row in the a11y
 * tree (so screen readers announce the title + subtitle) but
 * opts the row out of the clickable / focusable roles.
 */
const NotificationRow = ({ item }: { item: NotificationItem }) => {
  const rowStyle: CSSProperties = { cursor: 'default' };
  return (
    <div
      className="it-notifications__item"
      role="presentation"
      style={rowStyle}
    >
      <span
        className={`it-notifications__dot ${SEVERITY_DOT_CLASS[item.severity]}`}
        aria-hidden
      />
      <div className="it-notifications__text">
        <span className="it-notifications__item-title">{item.title}</span>
        <span className="it-notifications__item-sub">{item.subtitle}</span>
      </div>
    </div>
  );
};
