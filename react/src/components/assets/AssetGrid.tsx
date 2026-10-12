import { useCallback, useRef } from 'react';
import type { FC } from 'react';
import {
  ChipDirective,
  ChipListComponent,
  ChipsDirective,
} from '@syncfusion/ej2-react-buttons';
import {
  ColumnDirective,
  ColumnsDirective,
  Filter,
  GridComponent,
  Inject,
  Page,
  PageSettingsModel,
  Sort,
  Toolbar,
  ToolbarItems,
} from '@syncfusion/ej2-react-grids';
import {
  Cable,
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
import type {
  Asset,
  AssetOwner,
  AssetStatus,
  AssetIconName,
} from '../../types/assets';
import './assets.css';

/**
 * Lucide icon component map for the asset thumbnail column. Each
 * `AssetIconName` resolves to the lucide icon that best represents
 * the underlying asset category:
 *   - laptop / monitor / smartphone / tablet — the device itself
 *   - headphones / speaker — audio output peripherals
 *   - mouse / keyboard — input peripherals
 *   - webcam — video input peripheral
 *   - cable / plug / dock — connectivity peripherals (USB-C hub,
 *     docking station, etc.)
 *   - printer — hard-copy output
 * The map is `Record<AssetIconName, …>` so the compiler flags any
 * missing icon at build time when a new value is added to
 * `AssetIconName`.
 */
const ICON_MAP: Record<
  AssetIconName,
  FC<{ size?: number; strokeWidth?: number }>
> = {
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
 * Maps the fixture's `AssetStatus` value to a Syncfusion
 * `ChipDirective` config: `label` is the rendered text and
 * `cssClass` is one of Syncfusion's built-in semantic color
 * variants (`e-info` / `e-success` / `e-danger` / `e-primary`)
 * which Syncfusion's chip stylesheet applies to the inner
 * `.e-chip` element. The colour scheme is the asset-lifecycle
 * palette documented in the design tokens:
 *
 *   Allocated  → Blue   (`e-info` / `--app-status-info-*`)
 *   Available  → Green  (`e-success` / `--app-status-success-*`)
 *   InRepair   → Red    (`e-danger` / `--app-status-danger-*`)
 *   Retired    → Gray   (`e-primary` / `--app-status-neutral-*`)
 *
 * The TypeScript value stays `InUse` (the lifecycle semantic in
 * the JSON fixture), but the chip renders "Allocated" so the
 * label matches the IT request surface's vocabulary.
 */
const STATUS_CHIP: Record<
  AssetStatus,
  { label: string; cssClass: string }
> = {
  InUse: { label: 'Allocated', cssClass: 'e-info' },
  Available: { label: 'Available', cssClass: 'e-success' },
  InRepair: { label: 'In repair', cssClass: 'e-danger' },
  Retired: { label: 'Retired', cssClass: 'e-primary' },
};

/* ============================================================================
   Column template functions
   Each cell is rendered through an inline arrow function passed to
   `ColumnDirective.template`. The function is defined inside the
   `AssetGrid` component (see below) so it has closure access to
   the current `rows` array; the function looks up the full row by
   `id` to render the correct icon, status chip, or owner pill.
   ========================================================================== */

export interface AssetGridProps {
  rows: Asset[];
  pageSize: number;
  /**
   * Active filter signature used to re-key the grid. Any change to
   * the inputs (filters or search) flips the key, forcing the grid
   * to remount so its pager resets to page 1.
   */
  filterKey: string;
  /** Whether to show the empty-state message instead of the grid. */
  isEmpty: boolean;
  /**
   * Whether the side filter rail is currently open. The grid's
   * "Filters" toolbar tab mirrors this so the two stay in
   * lock-step with the page-level `AssetFilterRail` toggle.
   */
  filtersOpen?: boolean;
  /**
   * Callback fired when the user clicks the grid's "Filters"
   * toolbar tab. The page owns the rail's open/close state and
   * listens for this so the rail and the grid tab stay in sync.
   */
  onFiltersToggle?: () => void;
  /**
   * Fired when the user single-clicks a row. The page uses this
   * to open the asset detail modal for the clicked row (matching
   * the prototype's `#view-assets` row-click affordance). The
   * grid does NOT navigate anywhere on its own.
   */
  onRowClick?: (asset: Asset) => void;
  /**
   * Fired when the user double-clicks a row. Mirrors the
   * single-click affordance for keyboard activation (`Enter` on
   * a focused row) and for trackpad gestures. Defaults to the
   * same handler as `onRowClick` when omitted.
   */
  onRowDoubleClick?: (asset: Asset) => void;
}

const PAGE_SETTINGS: PageSettingsModel = {
  pageSize: 6,
  pageSizes: false,
  template: undefined,
};

/**
 * Grid toolbar definition. We expose the built-in `Search` box
 * (Syncfusion's grid search adds a cross-column text filter)
 * plus a custom "Filters" tab that toggles the side filter rail
 * and, when opened, pops the Status column's filter menu so the
 * user has an immediate drop-down of every `Status` / `Type`
 * value to pick from.
 */
const TOOLBAR_ITEMS: ToolbarItems[] = [
  'Search',
  {
    text: 'Filters',
    tooltipText: 'Toggle the asset filter rail',
    prefixIcon: 'e-icons e-filter',
    id: 'asset-grid-filters',
    align: 'Right',
  },
];

/**
 * Asset inventory grid. Renders the filtered `rows` through Syncfusion's
 * `GridComponent` with React component cell templates (Asset, Status, Owner)
 * attached via `ColumnDirective.template`. The grid is re-keyed on the active
 * filter signature so a filter change resets the pager to page 1.
 *
 * Filter UX: the grid enables `allowFiltering` with the
 * `Menu` filter type (one row per column with operator + value
 * inputs) and exposes a "Filters" tab in the grid toolbar.
 * Clicking the tab toggles the side filter rail and — for
 * convenience — opens the `Status` column's filter menu so the
 * user can drill down without scrolling the grid header.
 *
 * Why a Syncfusion grid and not a hand-rolled `<table>`: Syncfusion
 * is the project's contract (see `openspec/config.yaml`); the grid
 * provides paging, sorting, column-level filter UI, and a built-in
 * pager that's keyboard-accessible out of the box.
 */
const AssetGrid: FC<AssetGridProps> = ({
  rows,
  pageSize,
  filterKey,
  isEmpty,
  filtersOpen,
  onFiltersToggle,
  onRowClick,
  onRowDoubleClick,
}) => {
  const gridRef = useRef<GridComponent | null>(null);

  /**
   * Resolve the full row from Syncfusion's template `props`.
   *
   * Syncfusion's React template engine spreads the row data onto
   * the component's `props`, but it has been observed (in this
   * repo and others) that some columns with a `field` set receive
   * only the field's value rather than the full row. To make the
   * cell templates robust against either behaviour, we look up the
   * full row by `id` from the closure-captured `rows` array. If
   * the row is found, we use it; otherwise we fall back to whatever
   * was on `props` so the cell still renders.
   */
  const resolveRow = useCallback(
    (props: { id?: string } & Partial<Asset>): Asset | null => {
      if (props && props.icon && props.title && props.status) {
        return props as Asset;
      }
      if (props && props.id) {
        const found = rows.find((r) => r.id === props.id);
        if (found) return found;
      }
      if (props && props.title) {
        const found = rows.find((r) => r.title === props.title);
        if (found) return found;
      }
      return null;
    },
    [rows],
  );

  /**
   * Inline-function template for the Asset (title) column. The
   * Syncfusion React template engine calls the function with the
   * row data spread on `props`; we resolve the full row through
   * `resolveRow` (which falls back to a closure lookup by `id`)
   * and render the icon + title + sub line.
   */
  const assetCellTemplate = useCallback(
    (props: Partial<Asset> & { id?: string }) => {
      const row = resolveRow(props) ?? (props as Asset);
      const { icon, title, sub, id } = row;
      const Icon = ICON_MAP[icon as AssetIconName] ?? Laptop;
      return (
        <div className="asset-cell" aria-label={`${title} (${id})`}>
          <div className="asset-thumb" aria-hidden="true">
            <Icon size={20} strokeWidth={1.75} />
          </div>
          <div className="asset-cell__meta">
            <span className="asset-cell__title">{title}</span>
            <span className="asset-cell__sub">{sub}</span>
          </div>
        </div>
      );
    },
    [resolveRow],
  );

  /**
   * Inline-function template for the Status column. Resolves the
   * full row through `resolveRow` and renders a Syncfusion chip
   * whose `cssClass` maps to the asset-lifecycle color palette.
   */
  const statusCellTemplate = useCallback(
    (props: Partial<Asset> & { id?: string; status?: AssetStatus }) => {
      const row = resolveRow(props) ?? (props as Asset);
      const cfg = STATUS_CHIP[row.status as AssetStatus];
      if (!cfg) return null;
      return (
        <ChipListComponent className="asset-chip">
          <ChipsDirective>
            <ChipDirective text={cfg.label} cssClass={cfg.cssClass} />
          </ChipsDirective>
        </ChipListComponent>
      );
    },
    [resolveRow],
  );

  /**
   * Inline-function template for the Owner column. Resolves the
   * full row through `resolveRow` and renders an avatar pill or
   * the "Unassigned" neutral badge.
   */
  const ownerCellTemplate = useCallback(
    (props: Partial<Asset> & { id?: string; owner?: Asset['owner'] }) => {
      const row = resolveRow(props) ?? (props as Asset);
      const { owner } = row;
      if (!owner) return null;
      if (owner.name === 'Unassigned') {
        return (
          <span className="badge badge--neutral" aria-label="Owner: Unassigned">
            Unassigned
          </span>
        );
      }
      return (
        <span className="owner-pill" aria-label={`Owner: ${owner.name}`}>
          <span className="owner-pill__avatar" aria-hidden="true">
            {owner.initials}
          </span>
          {owner.name}
        </span>
      );
    },
    [resolveRow],
  );

  /**
   * Toolbar click handler. Wires the custom "Filters" tab to
   * the page's filter-rail toggle so the two stay in sync.
   */
  const handleToolbarClick = useCallback(
    (args: { item?: { id?: string } }) => {
      if (args?.item?.id === 'asset-grid-filters' && typeof onFiltersToggle === 'function') {
        onFiltersToggle();
      }
    },
    [onFiltersToggle],
  );

  /**
   * Resolve the full `Asset` row from a Syncfusion grid event's
   * payload. Defends against the template-engine spreading
   * behaviour by falling back to a closure lookup by `id`.
   */
  const resolveAsset = useCallback(
    (data: Asset | { id?: string } | undefined | null): Asset | null => {
      if (!data || !data.id) return null;
      const found = rows.find((r) => r.id === data.id);
      if (found) return found;
      if ('title' in data && data.title) {
        const byTitle = rows.find((r) => r.title === data.title);
        if (byTitle) return byTitle;
      }
      return data as Asset;
    },
    [rows],
  );

  /**
   * Row click → fire the page-level `onRowClick` callback so the
   * page can open the asset detail modal for the clicked row.
   * This mirrors the prototype's `#view-assets` row-click
   * affordance (a single click on a row opens the
   * `#modal-asset` block). The grid does NOT navigate anywhere
   * on its own — the asset detail modal's own `Start handover`
   * footer button is the only place the user is taken to the
   * `/handover` route.
   */
  const handleRecordClick = useCallback(
    (args: { data?: Asset | { id?: string }; rowData?: Asset | { id?: string } }) => {
      const asset = resolveAsset(args?.rowData ?? args?.data);
      if (!asset) return;
      if (typeof onRowClick === 'function') {
        onRowClick(asset);
      } else if (typeof onRowDoubleClick === 'function') {
        // Fallback so a parent that only wired double-click still
        // gets the row's intent — the modal open is the same path.
        onRowDoubleClick(asset);
      }
    },
    [resolveAsset, onRowClick, onRowDoubleClick],
  );

  /**
   * Row double-click → fire the page-level `onRowDoubleClick`
   * callback. Falls back to the same handler as a single click
   * when no double-click handler is registered.
   */
  const handleRecordDoubleClick = useCallback(
    (args: { data?: Asset | { id?: string }; rowData?: Asset | { id?: string } }) => {
      const asset = resolveAsset(args?.rowData ?? args?.data);
      if (!asset) return;
      if (typeof onRowDoubleClick === 'function') {
        onRowDoubleClick(asset);
      } else if (typeof onRowClick === 'function') {
        onRowClick(asset);
      }
    },
    [resolveAsset, onRowClick, onRowDoubleClick],
  );

  if (isEmpty) {
    return (
      <div
        className="data-table-wrap"
        role="region"
        aria-label="Asset inventory"
      >
        <div className="data-table-empty" role="status">
          No assets match the current filters.
        </div>
      </div>
    );
  }

  return (
    <div
      className={`data-table-wrap asset-grid-wrap${filtersOpen ? ' is-filtering' : ''}`}
      role="region"
      aria-label="Asset inventory"
    >
      <GridComponent
        ref={gridRef}
        id="asset-grid"
        key={filterKey}
        dataSource={rows}
        allowPaging
        allowSorting
        // toolbar={TOOLBAR_ITEMS}
        // toolbarClick={handleToolbarClick}
        // pageSettings={{ pageSize: 10 }}
        cssClass="asset-grid"
        gridLines="None"
        enableHeaderFocus
        selectionSettings={{ mode: 'Row', enableSimpleMultiRowSelection: false }}
        // recordClick={handleRecordClick}
        // recordDoubleClick={handleRecordDoubleClick}
        height={'100%'}
      >
        <ColumnsDirective>
          <ColumnDirective
            field="title"
            headerText="Asset"
            width="320"
            allowSorting={false}
            template={assetCellTemplate}
          />
          <ColumnDirective
            field="type"
            headerText="Type"
            width="120"
            filter={{ params: { showSpinButton: false } }}
          />
          <ColumnDirective
            field="status"
            headerText="Status"
            width="130"
            template={statusCellTemplate}
          />
          <ColumnDirective
            field="owner"
            headerText="Owner"
            width="220"
            allowSorting={false}
            template={ownerCellTemplate}
          />
          <ColumnDirective
            field="location"
            headerText="Location"
            width="180"
          />
          <ColumnDirective
            field="purchased"
            headerText="Purchased"
            width="120"
            type="date"
            format="yMd"
          />
        </ColumnsDirective>
        <Inject services={[Page, Sort, Filter, Toolbar]} />
      </GridComponent>
    </div>
  );
};

export default AssetGrid;
