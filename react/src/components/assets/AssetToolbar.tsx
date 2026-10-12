import type { FC, ChangeEvent } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { Download, Handshake, Search, SlidersHorizontal } from 'lucide-react';

export interface AssetToolbarProps {
  search: string;
  onSearchChange: (next: string) => void;
  onExport: () => void;
  onStartHandover: () => void;
  /**
   * Mobile / tablet Filters toggle. When `null` the button is hidden
   * (desktop / `≥ 1024px`).
   */
  filtersOpen: boolean | null;
  onFiltersToggle: () => void;
  /**
   * Optional id of the rail body the Filters toggle controls. When
   * set, the toggle exposes `aria-controls` for screen readers.
   */
  filtersId?: string;
  /**
   * Live result count for the aria-live region. The page renders the
   * matched-row count in the table footer; we mirror it here so the
   * toolbar can also expose it for AT users who focus the toolbar.
   */
  resultCount: number;
}

/**
 * Toolbar above the asset grid. Hosts:
 * - a `Filters` toggle (visible only ≤ 1023px) that opens the rail drawer
 * - a search input bound to a controlled `search` value
 * - an `Export` button (secondary) that surfaces a confirmation toast
 * - a `Start handover` button (primary) that dispatches the
 *   `data-action="open-handover"` event the future handover flow
 *   subscribes to (now replaced by a `navigate('/handover')`
 *   call from the owning page).
 */
const AssetToolbar: FC<AssetToolbarProps> = ({
  search,
  onSearchChange,
  onExport,
  onStartHandover,
  filtersOpen,
  onFiltersToggle,
  filtersId,
  resultCount,
}) => {
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(e.target.value);
  };

  return (
    <div className="toolbar" role="toolbar" aria-label="Asset toolbar">
      {filtersOpen !== null ? (
        <button
          type="button"
          className="toolbar__filter-toggle"
          onClick={onFiltersToggle}
          aria-pressed={filtersOpen ? 'true' : 'false'}
          aria-controls={filtersId}
          aria-label={
            filtersOpen ? 'Hide asset filters' : 'Show asset filters'
          }
        >
          <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
          Filters
        </button>
      ) : null}

      <label className="toolbar__search">
        <Search size={16} strokeWidth={1.75} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={handleSearchChange}
          placeholder="Tag, serial, owner…"
          aria-label="Search assets by tag, serial, or owner"
        />
      </label>

      <span className="sr-only" aria-live="polite">
        {resultCount} assets match the current filters.
      </span>

      <ButtonComponent
        cssClass="btn btn--secondary btn--sm"
        onClick={onExport}
        aria-label="Export current asset filter"
      >
        <Download
          size={14}
          strokeWidth={1.75}
          aria-hidden="true"
          style={{ marginRight: 6, verticalAlign: '-2px' }}
        />
        {/* Export */}
      </ButtonComponent>

      <ButtonComponent
        cssClass="btn btn--primary btn--sm"
        onClick={onStartHandover}
        aria-label="Start handover"
      >
        <Handshake
          size={14}
          strokeWidth={1.75}
          aria-hidden="true"
          style={{ marginRight: 6, verticalAlign: '-2px' }}
        />
        {/* Start handover */}
      </ButtonComponent>
    </div>
  );
};

export default AssetToolbar;
