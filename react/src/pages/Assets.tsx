import { useCallback, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { Columns, Download } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import AssetFilterRail from '../components/assets/AssetFilterRail';
import AssetToolbar from '../components/assets/AssetToolbar';
import AssetGrid from '../components/assets/AssetGrid';
import AssetsToast from '../components/assets/AssetsToast';
import AssetDetailModal from '../components/assets/AssetDetailModal';
import { DEFAULT_FILTERS } from '../components/assets/useAssetsData';
import type { AssetFilters } from '../components/assets/useAssetsData';
import useAssetsData from '../components/assets/useAssetsData';
import useAssetDetail from '../components/assets/useAssetDetail';
import type { Asset, AssetDetailTabId } from '../types/assets';
import { ASSET_DETAIL_TABS, LOCATION_ALL } from '../types/assets';
import type { Toast, ToastPayload } from '../types/dashboard';
import './Dashboard.css';

const FILTERS_BODY_ID = 'assets-filters-body';
const OPEN_PDF_MESSAGE = 'PDF viewer is reserved for a future change.';
const LINKED_TICKET_MESSAGE = 'Request detail is reserved for a future change.';

function nextToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function parseTabParam(value: string | null): AssetDetailTabId {
  if (value && (ASSET_DETAIL_TABS as readonly string[]).includes(value)) {
    return value as AssetDetailTabId;
  }
  return 'timeline';
}

/**
 * Operational Assets page — renders the existing `PageHeader`
 * with an `Export` primary action (mirrored to the toolbar) and
 * a density toggle placeholder, then an `.assets-body` CSS Grid
 * that holds the filter rail (left), toolbar (top-right), and
 * inventory grid (right).
 *
 * State (filters, search, mobile-filters toggle, toast) is
 * lifted into this page so the rail, toolbar, and grid stay
 * in lock-step through a single `useAssetsData` hook.
 *
 * The asset detail modal is mounted at the page level. Clicking
 * a row in the inventory grid (matching the prototype's
 * `#view-assets` row-click affordance) opens the modal for that
 * row. The modal's own `Start handover` footer button
 * navigates to `/handover?asset=<id>`, so the row click is
 * NOT a navigation — it opens the modal — and the handover
 * flow is reached only through the modal's explicit footer
 * button. Deep links via `?asset=<id>&tab=<tab>` work the same
 * way.
 */
const Assets: FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<AssetFilters>(DEFAULT_FILTERS);
  const [search, setSearch] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const data = useAssetsData(filters, search);
  const { filtered, filteredCount, pageSize } = data;

  // URL bridge for the asset detail modal:
  //   ?asset=<id>  — opens the modal for that asset
  //   ?tab=<tab>   — selects the active tab inside the modal
  const detailAssetId = searchParams.get('asset');
  const detailTab = parseTabParam(searchParams.get('tab'));
  const { asset: detailAsset, viewModel: detailViewModel } =
    useAssetDetail(detailAssetId);

  // Stable filter signature — re-key the grid on change to reset the
  // pager to page 1 (per the build-assets-page spec).
  const filterKey = useMemo<string>(
    () => JSON.stringify(filters) + '|' + search,
    [filters, search],
  );

  const showToast = useCallback((payload: string | ToastPayload) => {
    const body: ToastPayload | undefined =
      typeof payload === 'string' ? { title: payload } : payload;
    if (!body || !body.title) return;
    setToast({ id: nextToastId(), kind: body.kind ?? 'success', ...body });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const handleClear = useCallback(() => {
    setFilters({
      status: [],
        type: [],
        location: LOCATION_ALL,
        aging: false,
    });
  }, []);

  const handleExport = useCallback(() => {
    showToast({
      kind: 'success',
      title: 'Export requested',
      text: `${filteredCount} rows in current filter — placeholder export.`,
    });
  }, [showToast, filteredCount]);

  /**
   * Open the asset detail modal for the given asset. Mirrors
   * the prototype's row-click → `#modal-asset` open by writing
   * the asset's id into the `?asset=<id>` query string; the
   * URL is the single source of truth for the modal's state.
   */
  const openAssetDetail = useCallback(
    (asset: Asset) => {
      const next = new URLSearchParams(searchParams);
      next.set('asset', asset.id);
      if (!next.get('tab')) next.set('tab', 'timeline');
      setSearchParams(next, { replace: false });
    },
    [searchParams, setSearchParams],
  );

  /**
   * Close the asset detail modal. Clears `?asset=<id>` and
   * `?tab=<tab>` from the URL while preserving every other
   * query string entry so unrelated state survives.
   */
  const closeAssetDetail = useCallback(() => {
    if (!searchParams.has('asset') && !searchParams.has('tab')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('asset');
    next.delete('tab');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  /**
   * Switch the modal's active tab. Round-trips through the URL
   * so deep links / browser back button close the modal or
   * restore the previous tab.
   */
  const handleTabChange = useCallback(
    (tab: AssetDetailTabId) => {
      if (!searchParams.has('asset')) return;
      const next = new URLSearchParams(searchParams);
      next.set('tab', tab);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  /**
   * Start the handover flow for the asset currently open in
   * the modal. Closes the modal (clearing the query string) and
   * navigates to `/handover?asset=<id>` so the handover page
   * pre-fills the source asset.
   */
  const handleStartHandover = useCallback(() => {
    const id = detailAssetId;
    closeAssetDetail();
    if (id) {
      navigate(`/handover?asset=${encodeURIComponent(id)}`);
    } else {
      navigate('/handover');
    }
  }, [detailAssetId, closeAssetDetail, navigate]);

  /**
   * Placeholder "Open PDF" action. Surfaces a toast and does
   * not close the modal — the modal stays open so the user can
   * keep inspecting the asset while the toast acknowledges the
   * placeholder. The full PDF viewer is reserved for a future
   * change.
   */
  const handleOpenPdf = useCallback(() => {
    showToast({ kind: 'info', title: 'Open PDF', text: OPEN_PDF_MESSAGE });
  }, [showToast]);

  /**
   * Placeholder "Open request" action for the Linked tickets
   * tab. Surfaces a toast; the request-detail surface is
   * reserved for a future change.
   */
  const handleOpenTicket = useCallback(
    (ticketId: string) => {
      showToast({
        kind: 'info',
        title: 'Open request',
        text: `${ticketId} — ${LINKED_TICKET_MESSAGE}`,
      });
    },
    [showToast],
  );

  const pageHeaderActions = (
    <>
      <ButtonComponent
        cssClass="btn btn--primary page-header__btn"
        onClick={handleExport}
        aria-label="Export current asset filter"
      >
        <Download
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          style={{ marginRight: 6, verticalAlign: '-2px' }}
        />
        Export
      </ButtonComponent>
      <button
        type="button"
        className="icon-btn page-header__icon-btn"
        onClick={() =>
          showToast({
            kind: 'info',
            title: 'Column density',
            text: 'Density toggle is reserved for a future change.',
          })
        }
        aria-label="Toggle column density (placeholder)"
        title="Toggle column density (placeholder)"
      >
        <Columns size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </>
  );

  return (
    <>
      <PageHeader
        title="Assets"
        description="Inventory of laptops, peripherals, and accessories — filter, search, and inspect every assigned device."
        actions={pageHeaderActions}
      />
      <div className="page-body assets-body">
        <AssetFilterRail
          filters={filters}
          counts={data.counts}
          options={data.filterOptions}
          onChange={setFilters}
          onClear={handleClear}
          open={filtersOpen}
          id={FILTERS_BODY_ID}
        />
        <div className="assets-content">
          <AssetToolbar
            search={search}
            onSearchChange={setSearch}
            onExport={handleExport}
            onStartHandover={() => navigate('/handover')}
            filtersOpen={filtersOpen}
            onFiltersToggle={() => setFiltersOpen((open) => !open)}
            filtersId={FILTERS_BODY_ID}
            resultCount={filteredCount}
          />
          <AssetGrid
            rows={filtered}
            pageSize={pageSize}
            filterKey={filterKey}
            isEmpty={filteredCount === 0}
            filtersOpen={filtersOpen}
            onFiltersToggle={() => setFiltersOpen((open) => !open)}
            onRowClick={openAssetDetail}
            onRowDoubleClick={openAssetDetail}
          />
        </div>
      </div>
      <div className="assets-toast-stack">
        <AssetsToast toast={toast} onDismiss={dismissToast} />
      </div>
      <AssetDetailModal
        open={Boolean(detailAssetId && detailAsset)}
        asset={detailAsset}
        viewModel={detailViewModel}
        activeTab={detailTab}
        onClose={closeAssetDetail}
        onTabChange={handleTabChange}
        onStartHandover={handleStartHandover}
        onOpenPdf={handleOpenPdf}
        onOpenTicket={handleOpenTicket}
      />
    </>
  );
};

export default Assets;
