// Navigation chrome shared between the AppBar (which renders the
// breadcrumb) and the AppShell (which derives the trail from the
// current route). Keeping it here means each page stops having to
// pass a `breadcrumbs` prop to `<PageHeader>` and the trail stays
// in lock-step with the routes registered in AppShell.

/** A single breadcrumb step. When `to` is omitted the trail entry
 *  renders as a non-link (used for the current page). */
export interface Breadcrumb {
  label: string;
  to?: string;
}

/** A breadcrumb trail — first entry is the "root" link, last entry
 *  is the current page. */
export type BreadcrumbTrail = readonly Breadcrumb[];

/**
 * Route → breadcrumb map. Every key here MUST have a matching
 * `<Route>` registered in `AppShell.tsx`; the AppShell falls back
 * to the Dashboard trail for unknown paths.
 *
 * `to` values are React-Router `to` props (relative to the
 * BrowserRouter's basename). The AppBar's `Link` is what actually
 * navigates.
 */
export const ROUTE_BREADCRUMBS: Record<string, BreadcrumbTrail> = {
  '/': [{ label: 'Home', to: '/' }, { label: 'Dashboard' }],
  '/assets': [{ label: 'Home', to: '/' }, { label: 'Assets' }],
  '/requests': [{ label: 'Home', to: '/' }, { label: 'Requests' }],
  '/knowledge': [{ label: 'Home', to: '/' }, { label: 'Knowledge' }],
  '/handover': [
    { label: 'Home', to: '/' },
    { label: 'Assets', to: '/assets' },
    { label: 'Handover' },
  ],
};

/** Resolve a pathname to a breadcrumb trail. The fallback matches
 *  the catch-all `*` route in AppShell, which is the Dashboard. */
export function breadcrumbsForPathname(pathname: string): BreadcrumbTrail {
  // Strip trailing slashes so `/assets/` resolves the same as
  // `/assets` (React-Router normalises the latter on render, but
  // useLocation can hand back either).
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (ROUTE_BREADCRUMBS[normalised]) {
    return ROUTE_BREADCRUMBS[normalised];
  }
  return ROUTE_BREADCRUMBS['/'];
}
