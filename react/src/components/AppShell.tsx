import { useCallback, useMemo, useRef, useState } from 'react';
import type { FC, RefObject } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import type { SidebarComponent } from '@syncfusion/ej2-react-navigations';
import AppBar from './AppBar';
import Sidebar from './Sidebar';
import Dashboard from '../pages/Dashboard';
import Assets from '../pages/Assets';
import Requests from '../pages/Requests';
import Knowledge from '../pages/Knowledge';
import Handover from '../pages/Handover';
import { breadcrumbsForPathname } from '../types/navigation';
import type { BreadcrumbTrail } from '../types/navigation';
import './AppShell.css';

/**
 * Top-level shell — a CSS Grid that places the Syncfusion Sidebar in
 * the first column, AppBar in the top-right cell, and the routed main
 * column below the AppBar. This mirrors the prototype's `index.html`
 * layout exactly (see `.app-shell { grid-template-areas }` in
 * `AppShell.css`).
 *
 * Why a grid instead of letting Syncfusion `Push` push its sibling:
 * Syncfusion wraps itself in a `<ejs-sidebar>` custom element that
 * becomes `position: fixed` in its theme CSS and pushes the *next
 * sibling* via `margin-left`. We tried that route first, but the
 * theme's push rules are scoped under `.e-sidebarcontainer` (which
 * isn't in our DOM) and the JS-driven `margin-left` ends up targeting
 * `.app-shell__right`'s first child rather than the column itself,
 * which doubled up the offset. Mirroring the prototype's grid keeps
 * the layout deterministic.
 *
 * Mobile (≤ 1023px in app-shell terms, ≤ 768px by viewport query):
 * the sidebar floats over content as a drawer, with a backdrop, and
 * the grid collapses to a single column. The Sidebar component owns
 * its own mobile open/close state via Syncfusion's `Over` type.
 *
 * The AppBar's leading toggle button has two jobs:
 *   - On mobile, it opens the drawer (`mobileOpen`).
 *   - On desktop, it collapses / expands the docked sidebar.
 * The Sidebar's own "Collapse" shortcut still works — it flips the
 * same `collapsed` state through `onCollapseToggle` so the two
 * entry points stay in sync.
 */
const AppShell: FC = () => {
  const sidebarRef = useRef<SidebarComponent | null>(null);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const location = useLocation();

  const breadcrumbs: BreadcrumbTrail = useMemo(
    () => breadcrumbsForPathname(location.pathname),
    [location.pathname],
  );

  const openMobileNav = useCallback(() => {
    if (sidebarRef.current && typeof sidebarRef.current.show === 'function') {
      sidebarRef.current.show();
    }
    setMobileOpen(true);
  }, []);

  const closeMobileNav = useCallback(() => {
    if (sidebarRef.current && typeof sidebarRef.current.hide === 'function') {
      sidebarRef.current.hide();
    }
    setMobileOpen(false);
  }, []);

  /**
   * Header toggle handler. On a wide viewport this collapses or
   * expands the docked sidebar; on a narrow viewport it slides the
   * drawer in (or closes it on the second tap).
   */
  const handleHeaderNavToggle = useCallback(() => {
    if (typeof window === 'undefined') {
      // SSR safe — fall through to the mobile path.
      openMobileNav();
      return;
    }
    const isNarrow = window.matchMedia('(max-width: 1023px)').matches;
    if (isNarrow) {
      if (mobileOpen) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    } else {
      setCollapsed((c) => !c);
    }
  }, [mobileOpen, openMobileNav, closeMobileNav]);

  return (
    <div className={`app-shell${collapsed ? ' sidebar-collapsed' : ''}`}>
      <div className="app-shell__sidebar">
        <Sidebar
          ref={sidebarRef as RefObject<SidebarComponent | null>}
          mobileOpen={mobileOpen}
          collapsed={collapsed}
          onMobileClose={closeMobileNav}
          onCollapseToggle={() => setCollapsed((c) => !c)}
        />
      </div>
      <div className="app-shell__appbar">
        <AppBar
          onNavToggle={handleHeaderNavToggle}
          mobileOpen={mobileOpen}
          collapsed={collapsed}
          breadcrumbs={breadcrumbs}
        />
      </div>
      <main className="app-shell__main" id="main-column">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/handover" element={<Handover />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
      {/* Mobile drawer backdrop. Toggled by the Sidebar's
          onClose / onNav-click path via a class flip on app-shell. */}
      <button
        type="button"
        className="app-shell__backdrop"
        aria-label="Close navigation"
        tabIndex={-1}
        onClick={closeMobileNav}
      />
    </div>
  );
};

export default AppShell;
