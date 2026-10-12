import { useEffect, useRef } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Laptop,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { AppBarComponent } from '@syncfusion/ej2-react-navigations';
import {
  ButtonComponent,
  ChipListComponent,
  ChipsDirective,
  ChipDirective,
} from '@syncfusion/ej2-react-buttons';
import type { BreadcrumbTrail } from '../types/navigation';
import NotificationsPopover, {
  type NotificationsPopoverHandle,
} from './NotificationsPopover';
import './AppBar.css';

export interface AppBarProps {
  /**
   * Called when the user clicks the leading nav toggle. The shell
   * decides whether to collapse the docked sidebar (desktop) or
   * open the mobile drawer (mobile).
   */
  onNavToggle: () => void;
  /**
   * Whether the mobile drawer is currently open. Used to set
   * `aria-expanded` on the toggle and to swap the icon.
   */
  mobileOpen?: boolean;
  /**
   * Whether the docked sidebar is collapsed. Used to set
   * `aria-pressed` and to swap the icon.
   */
  collapsed?: boolean;
  /**
   * Breadcrumb trail rendered immediately to the right of the
   * nav toggle. The last entry is the current page and is
   * rendered as a non-link.
   */
  breadcrumbs?: BreadcrumbTrail;
}

/**
 * Syncfusion top app bar — sticky, light, with the leading nav
 * toggle (visible at all sizes — opens the drawer on mobile,
 * collapses the docked sidebar on desktop), inline breadcrumb,
 * brand mark (visible on small viewports), global search, theme
 * toggle, notifications, and the demo profile pill.
 */
const AppBar: FC<AppBarProps> = ({
  onNavToggle,
  mobileOpen = false,
  collapsed = false,
  breadcrumbs = [],
}) => {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  // Stable id on the bell button so the document-level click handler
  // and the popover can find its DOM element (the bell's ref would
  // resolve to the Syncfusion component instance, not the <button>).
  const NOTIF_BTN_ID = 'it-appbar-notif-btn';
  const notifPopoverRef = useRef<NotificationsPopoverHandle | null>(null);

  // Close the notifications popover when the user clicks anywhere
  // outside the popover and outside the bell button.
  useEffect(() => {
    const handleDocClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      const notifBtnEl = document.getElementById(NOTIF_BTN_ID);
      if (notifBtnEl?.contains(target)) {
        return;
      }
      const popoverEl = document.getElementById('it-notifications-popover');
      if (popoverEl?.contains(target)) {
        return;
      }
      notifPopoverRef.current?.close();
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  // The toggle's accessible label and icon reflect the current
  // state. The shell handler decides what "doing the thing"
  // actually means (drawer on mobile, dock on desktop).
  const navToggleLabel = mobileOpen
    ? 'Close navigation'
    : collapsed
      ? 'Expand sidebar'
      : 'Collapse sidebar';
  const NavToggleIcon = mobileOpen
    ? X
    : collapsed
      ? PanelLeftOpen
      : PanelLeftClose;

  return (
    <>
    <AppBarComponent
      className="it-appbar"
      colorMode="Light"
      position="Top"
      isSticky
    >
      <ButtonComponent
        type="button"
        cssClass="e-round e-flat appbar-icon-btn it-appbar__menu"
        aria-label={navToggleLabel}
        aria-controls="it-sidebar"
        aria-expanded={mobileOpen}
        aria-pressed={!mobileOpen && collapsed}
        title={navToggleLabel}
        onClick={onNavToggle}
      >
        <Menu size={20} strokeWidth={1.75} />
      </ButtonComponent>
      <div className="e-appbar-spacer" />

      <div className="it-appbar__actions">
        <ButtonComponent
          type="button"
          cssClass="e-round e-flat appbar-icon-btn"
          aria-label="Toggle color theme"
          aria-pressed={isDark}
          title="Toggle light / dark"
          onClick={toggle}
        >
          {isDark ? (
            <Sun size={18} strokeWidth={1.75} />
          ) : (
            <Moon size={18} strokeWidth={1.75} />
          )}
        </ButtonComponent>
        <span className="it-appbar__notif-wrap">
          <ButtonComponent
            id={NOTIF_BTN_ID}
            type="button"
            cssClass="e-round e-flat appbar-icon-btn"
            aria-label="Notifications"
            aria-haspopup="dialog"
            aria-expanded={false}
            title="Notifications"
            onClick={() => notifPopoverRef.current?.toggle()}
          >
            <Bell size={18} strokeWidth={1.75} />
          </ButtonComponent>
          <span className="it-appbar__notif-badge" aria-hidden="true">
            10
          </span>
        </span>
        <ChipListComponent
          id="it-profile-pill"
          cssClass="it-profile-pill"
          aria-label="Signed-in profile (demo) — John, IT Admin"
        >
          <ChipsDirective>
            <ChipDirective text="John · IT Admin"/>
          </ChipsDirective>
        </ChipListComponent>
      </div>
    </AppBarComponent>

    <NotificationsPopover ref={notifPopoverRef} />
    </>
  );
};

export default AppBar;
