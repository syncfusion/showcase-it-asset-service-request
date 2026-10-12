import type { FC, ChangeEvent } from 'react';
import type {
  AssetLocation,
  AssetStatus,
  AssetType,
  LocationSelection,
} from '../../types/assets';
import { LOCATION_ALL, LOCATION_ALL_LABEL } from '../../types/assets';
import type { AssetCounts, AssetFilters } from './useAssetsData';

/** Display labels that match the prototype's filter rail copy. */
const STATUS_LABEL: Record<AssetStatus, string> = {
  InUse: 'In use',
  Available: 'Available',
  InRepair: 'In repair',
  Retired: 'Retired',
};

const TYPE_LABEL: Record<AssetType, string> = {
  Laptop: 'Laptop',
  Monitor: 'Monitor',
  Phone: 'Phone',
  Peripheral: 'Peripheral',
};

const LOCATION_OPTIONS: ReadonlyArray<{
  value: LocationSelection;
  label: string;
}> = [
  { value: LOCATION_ALL, label: LOCATION_ALL_LABEL },
  { value: 'HQ · Floor 3', label: 'HQ · Floor 3' },
  { value: 'West campus', label: 'West campus' },
  { value: 'Remote', label: 'Remote' },
];

export interface AssetFilterRailProps {
  filters: AssetFilters;
  counts: AssetCounts;
  options: {
    status: AssetStatus[];
    type: AssetType[];
    location: AssetLocation[];
    aging: boolean;
  };
  onChange: (filters: AssetFilters) => void;
  onClear: () => void;
  /**
   * Whether the rail is visible. The page toggles this in lock-step
   * with the toolbar's "Filters" button on tablet / mobile.
   */
  open: boolean;
  /** Optional id for the rail's body — used by the toolbar's aria-controls. */
  id?: string;
}

/**
 * Left-hand filter rail. Renders the four filter groups in the same
 * order as the prototype (Status → Type → Location → Age) plus a
 * "Clear" ghost button in the header. The rail is controlled — the
 * parent owns the active filter state and we render straight from it.
 */
const AssetFilterRail: FC<AssetFilterRailProps> = ({
  filters,
  counts,
  options,
  onChange,
  onClear,
  open,
  id,
}) => {
  const handleStatusToggle = (status: AssetStatus) =>
    (e: ChangeEvent<HTMLInputElement>): void => {
      const checked = e.target.checked;
      const next = checked
        ? Array.from(new Set([...filters.status, status]))
        : filters.status.filter((s) => s !== status);
      onChange({ ...filters, status: next });
    };

  const handleTypeToggle = (type: AssetType) =>
    (e: ChangeEvent<HTMLInputElement>): void => {
      const checked = e.target.checked;
      const next = checked
        ? Array.from(new Set([...filters.type, type]))
        : filters.type.filter((t) => t !== type);
      onChange({ ...filters, type: next });
    };

  const handleLocationChange = (value: LocationSelection) =>
    (e: ChangeEvent<HTMLInputElement>): void => {
      if (!e.target.checked) return;
      onChange({ ...filters, location: value });
    };

  const handleAgingToggle = (e: ChangeEvent<HTMLInputElement>): void => {
    onChange({ ...filters, aging: e.target.checked });
  };

  const railClass = `card filter-rail${open ? ' is-open' : ''}`;

  return (
    <aside className={railClass} aria-label="Asset filters">
      <div className="filter-rail__head">
        <h2 className="filter-rail__title">Filters</h2>
        <button
          type="button"
          className="filter-rail__clear"
          onClick={onClear}
          aria-label="Clear filters"
        >
          Clear
        </button>
      </div>
      <div className="filter-rail__body" id={id}>
        <div className="filter-group" role="group" aria-label="Status">
          <p className="filter-group__label">Status</p>
          {options.status.map((s) => (
            <label key={s} className="filter-option">
              <input
                type="checkbox"
                name="status"
                value={s}
                checked={filters.status.includes(s)}
                onChange={handleStatusToggle(s)}
                aria-label={`${STATUS_LABEL[s]} (${counts.status[s] ?? 0})`}
              />
              <span>{STATUS_LABEL[s]}</span>
              <span className="filter-option__count">
                {counts.status[s] ?? 0}
              </span>
            </label>
          ))}
        </div>

        <div className="filter-group" role="group" aria-label="Type">
          <p className="filter-group__label">Type</p>
          {options.type.map((t) => (
            <label key={t} className="filter-option">
              <input
                type="checkbox"
                name="type"
                value={t}
                checked={filters.type.includes(t)}
                onChange={handleTypeToggle(t)}
                aria-label={`${TYPE_LABEL[t]} (${counts.type[t] ?? 0})`}
              />
              <span>{TYPE_LABEL[t]}</span>
              <span className="filter-option__count">
                {counts.type[t] ?? 0}
              </span>
            </label>
          ))}
        </div>

        <div className="filter-group" role="radiogroup" aria-label="Location">
          <p className="filter-group__label">Location</p>
          {LOCATION_OPTIONS.map((opt) => (
            <label key={opt.value} className="filter-option">
              <input
                type="radio"
                name="location"
                value={opt.value}
                checked={filters.location === opt.value}
                onChange={handleLocationChange(opt.value)}
                aria-label={opt.label}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>

        <div className="filter-group" role="group" aria-label="Age">
          <p className="filter-group__label">Age</p>
          <label className="filter-option">
            <input
              type="checkbox"
              name="aging"
              checked={filters.aging}
              onChange={handleAgingToggle}
              aria-label={`Aging (≥ 4 years) (${counts.aging})`}
            />
            <span>Aging (≥ 4 yrs)</span>
            <span className="filter-option__count">{counts.aging}</span>
          </label>
        </div>
      </div>
    </aside>
  );
};

export default AssetFilterRail;
