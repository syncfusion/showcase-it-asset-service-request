import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { ForwardedRef, RefObject } from 'react';
import { NavLink } from 'react-router-dom';
import { SidebarComponent } from '@syncfusion/ej2-react-navigations';
import {
  BookOpen,
  Handshake,
  LayoutDashboard,
  Laptop,
  PanelLeftClose,
  PanelLeftOpen,
  Ticket,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './Sidebar.css';

interface PrimaryNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: string;
}

const PRIMARY_ITEMS: PrimaryNavItem[] = [
  { to: '', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: 'assets', label: 'Assets', icon: Laptop },
  { to: 'requests', label: 'Requests', icon: Ticket, badge: '18' },
  { to: 'handover', label: 'Handover', icon: Handshake },
  { to: 'knowledge', label: 'Knowledge', icon: BookOpen },
];

export interface SidebarProps {
  /**
   * Controlled open state for mobile drawer.
   */
  mobileOpen?: boolean;
  /**
   * Whether the docked sidebar is currently collapsed. Drives the
   * icon / label of the in-sidebar "Collapse" shortcut so it
   * stays in lock-step with the AppBar's leading toggle.
   */
  collapsed?: boolean;
  /**
   * Called when the user dismisses the mobile drawer (backdrop click,
   * Esc, or a NavLink).
   */
  onMobileClose?: () => void;
  /**
   * Toggles the shell's docked state (collapses the first grid column
   * to 64px).
   */
  onCollapseToggle?: () => void;
  /**
   * Forwarded so the AppBar can call the Syncfusion instance's
   * `show()` / `hide()` methods.
   */
  sidebarRef?: RefObject<SidebarComponent | null>;
}

/**
 * Sidebar — content owned by React, layout owned by the parent grid.
 *
 * The previous round relied on Syncfusion's default `Push` / `Auto`
 * layout, which writes a `margin-left` on the sidebar's *next sibling*
 * to push the page. In our shell that target was the wrapper
 * `.app-shell__right`'s first child instead of the column itself, so
 * the page never lined up cleanly with the sidebar and the nav items
 * slid off-screen.
 *
 * The fix mirrors the prototype's `index.html`: the shell owns a CSS
 * Grid that places the sidebar in the first column. The Sidebar
 * component here just renders Syncfusion's SidebarComponent with
 * `type="Over"` (always over-content — no sibling push) and lets the
 * grid cell hold it open on desktop. On mobile the grid collapses and
 * the sidebar slides in as a CSS drawer driven by the `data-mobile-
 * open` attribute the parent sets.
 */
const Sidebar = forwardRef<SidebarComponent | null, SidebarProps>(function Sidebar(
  { mobileOpen = false, collapsed = false, onMobileClose, onCollapseToggle, sidebarRef },
  ref: ForwardedRef<SidebarComponent | null>,
) {
  const internalRef = useRef<SidebarComponent | null>(null);
  const fallbackRef: RefObject<SidebarComponent | null> = (sidebarRef ?? internalRef) as RefObject<SidebarComponent | null>;

  // The forwardRef `ref` is what Vite/React calls with the parent's
  // ref object when this component is consumed with `<Sidebar ref={…}>`.
  // Use the existing forwardRef mechanism rather than ignoring it.
  useImperativeHandle(ref, () => fallbackRef.current as SidebarComponent);

  const [isNarrow, setIsNarrow] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 1023px)').matches
      : false
  );

  // The icon + label on the in-sidebar "Collapse" shortcut mirror
  // the AppBar's leading toggle so the two entry points agree.
  const CollapseIcon: LucideIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const collapseLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar';

  // Keep `isNarrow` in sync with viewport so we only call
  // show()/hide() on the mobile drawer path. On desktop the panel is
  // held open by the grid cell so Syncfusion's open/close machinery
  // is a no-op cost.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 1023px)');
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  // Mirror the mobile drawer state to the shell wrapper so CSS can
  // dim the backdrop and slide the sidebar cell in/out without any
  // extra state.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const shell = document.querySelector('.app-shell');
    if (!shell) return;
    if (mobileOpen && isNarrow) shell.setAttribute('data-mobile-open', 'true');
    else shell.removeAttribute('data-mobile-open');
  }, [mobileOpen, isNarrow]);

  // When the user navigates on mobile, close the drawer.
  const handleNavClick = useCallback(() => {
    if (isNarrow && typeof onMobileClose === 'function') {
      onMobileClose();
    }
  }, [isNarrow, onMobileClose]);

  return (
    <SidebarComponent
      id="it-sidebar"
      ref={fallbackRef}
      className="it-sidebar"
      type="Over"
      width="240px"
      showBackdrop={false}
      closeOnDocumentClick={false}
      isOpen={!isNarrow || mobileOpen}
      close={onMobileClose}
    >
      <div className="it-sidebar__inner">
        <div className="it-sidebar__brand">
          <div className="it-sidebar__brand-mark" aria-hidden="true">
            <Laptop size={18} strokeWidth={1.75} />
          </div>
          <div className="it-sidebar__brand-text">
            <span className="it-sidebar__brand-title">IT Asset Portal</span>
            <span className="it-sidebar__brand-sub">Service desk</span>
          </div>
        </div>

        <nav className="it-sidebar__nav" aria-label="Main navigation">
          <p className="it-sidebar__section-label">Workspace</p>
          <ul>
            {PRIMARY_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `it-nav-item${isActive ? ' is-active' : ''}`
                    }
                  >
                    <span className="it-nav-item__icon" aria-hidden="true">
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <span className="it-nav-item__label">{item.label}</span>
                    {item.badge ? (
                      <span
                        className="it-nav-item__badge"
                        title={`${item.badge} open requests`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </NavLink>
                </li>
              );
            })}
          </ul>

          {/* <p className="it-sidebar__section-label">Shortcuts</p>
          <ul>
            <li>
              <NavLink
                to="handover"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `it-nav-item${isActive ? ' is-active' : ''}`
                }
                title="Start asset handover"
              >
                <span className="it-nav-item__icon" aria-hidden="true">
                  <Handshake size={18} strokeWidth={1.75} />
                </span>
                <span className="it-nav-item__label">Handover</span>
              </NavLink>
            </li>
          </ul> */}
        </nav>

        <div className="it-sidebar__footer">
          Prototype · visual reference only
        </div>
      </div>
    </SidebarComponent>
  );
});

export default Sidebar;
