import { useMemo } from 'react';
import assetsFixture from '../../data/assets.json';
import type {
  Asset,
  AssetFilterOptions,
  AssetLocation,
  AssetStatus,
  AssetType,
  AssetsFixture,
  LocationSelection,
} from '../../types/assets';
import {
  DEFAULT_STATUS_CHECKED,
  DEFAULT_TYPE_CHECKED,
  LOCATION_ALL,
} from '../../types/assets';

/**
 * Keys the hook validates against the JSON fixture. A missing key
 * produces a render-time console error (loud in dev) rather than
 * silently rendering `undefined` rows.
 */
const REQUIRED_KEYS: (keyof AssetsFixture)[] = ['assets', 'filterOptions'];

function assertFixtureShape(fixture: unknown): fixture is AssetsFixture {
  if (!fixture || typeof fixture !== 'object') {
    console.error('[useAssetsData] fixture is missing or not an object');
    return false;
  }
  const missing = REQUIRED_KEYS.filter((k) => !(k in (fixture as object)));
  if (missing.length > 0) {
    console.error(
      '[useAssetsData] assets.json is missing required keys:',
      missing,
    );
    return false;
  }
  return true;
}

/**
 * Active filter selections lifted into the page and fed back into the
 * hook. `status` / `type` are OR-within-group sets, `location` is a
 * radio (single value), `aging` is a single boolean toggle.
 */
export interface AssetFilters {
  status: AssetStatus[];
  type: AssetType[];
  location: LocationSelection;
  aging: boolean;
}

/** The unfiltered seed for "Clear" — mirrors the prototype's defaults. */
export const DEFAULT_FILTERS: AssetFilters = {
  status: [...DEFAULT_STATUS_CHECKED],
  type: [...DEFAULT_TYPE_CHECKED],
  location: LOCATION_ALL,
  aging: false,
};

export interface AssetCounts {
  /** Per-status row count from the unfiltered fixture. */
  status: Record<AssetStatus, number>;
  /** Per-type row count from the unfiltered fixture. */
  type: Record<AssetType, number>;
  /** Aging bucket count from the unfiltered fixture (≥ 4 years). */
  aging: number;
}

export interface UseAssetsDataResult {
  /** The unfiltered fixture rows (stable reference, in id order). */
  rows: Asset[];
  /** The composed filter + search result set. */
  filtered: Asset[];
  /** The total fixture size. */
  total: number;
  /** The filtered row count. */
  filteredCount: number;
  /** Per-option counts derived from the unfiltered fixture. */
  counts: AssetCounts;
  /** Pager page size the grid renders. */
  pageSize: number;
  /** The fixture's filter-option contract. */
  filterOptions: AssetFilterOptions;
  /** The default filter set the page seeds on first paint / "Clear". */
  defaultFilters: AssetFilters;
}

const PAGE_SIZE = 6;
const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;
const AGING_YEARS = 4;

function isAging(purchased: string, now: Date): boolean {
  const purchasedDate = new Date(purchased);
  if (Number.isNaN(purchasedDate.getTime())) return false;
  const years = (now.getTime() - purchasedDate.getTime()) / MS_PER_YEAR;
  return years >= AGING_YEARS;
}

function buildCounts(rows: Asset[], options: AssetFilterOptions): AssetCounts {
  const status = options.status.reduce<Record<AssetStatus, number>>(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    { InUse: 0, Available: 0, InRepair: 0, Retired: 0 } as Record<
      AssetStatus,
      number
    >,
  );
  const type = options.type.reduce<Record<AssetType, number>>(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    { Laptop: 0, Monitor: 0, Phone: 0, Peripheral: 0 } as Record<
      AssetType,
      number
    >,
  );
  const now = new Date();
  let aging = 0;
  for (const row of rows) {
    status[row.status] = (status[row.status] ?? 0) + 1;
    type[row.type] = (type[row.type] ?? 0) + 1;
    if (isAging(row.purchased, now)) aging++;
  }
  return { status, type, aging };
}

function applyFilters(
  rows: Asset[],
  filters: AssetFilters,
  search: string,
): Asset[] {
  const searchLower = search.trim().toLowerCase();
  const statusSet = new Set<AssetStatus>(filters.status);
  const typeSet = new Set<AssetType>(filters.type);
  const locationIsAll = filters.location === LOCATION_ALL;
  const now = new Date();

  return rows.filter((row) => {
    if (statusSet.size > 0 && !statusSet.has(row.status)) return false;
    if (typeSet.size > 0 && !typeSet.has(row.type)) return false;
    if (
      !locationIsAll &&
      (filters.location as AssetLocation) !== row.location
    ) {
      return false;
    }
    if (filters.aging && !isAging(row.purchased, now)) return false;
    if (searchLower) {
      const haystack = [
        row.id,
        row.title,
        row.sub,
        row.owner.name,
        row.location,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(searchLower)) return false;
    }
    return true;
  });
}

/**
 * Reads `src/data/assets.json`, narrows the shape, and returns the
 * composed filter + search result set, the per-option counts, the
 * total fixture size, and the pager page size. The hook's body runs
 * only when the `(filters, search)` tuple changes — the fixture
 * reference and the counts are stable across renders that don't
 * change those inputs.
 */
export function useAssetsData(
  filters: AssetFilters = DEFAULT_FILTERS,
  search: string = '',
): UseAssetsDataResult {
  // Stabilise the fixture reference once per mount.
  const fixture = useMemo<AssetsFixture>(() => {
    assertFixtureShape(assetsFixture);
    return assetsFixture as unknown as AssetsFixture;
  }, []);

  // Stable reference for the row list (the JSON import is frozen).
  const rows = useMemo<Asset[]>(() => fixture.assets, [fixture]);

  // Counts come from the unfiltered fixture so they stay useful as the
  // user toggles other filters (per the build-assets-page spec).
  const counts = useMemo<AssetCounts>(
    () => buildCounts(rows, fixture.filterOptions),
    [rows, fixture.filterOptions],
  );

  // Memoize the composed predicate on (filters, search).
  const filtered = useMemo<Asset[]>(
    () => applyFilters(rows, filters, search),
    [rows, filters, search],
  );

  return {
    rows,
    filtered,
    total: rows.length,
    filteredCount: filtered.length,
    counts,
    pageSize: PAGE_SIZE,
    filterOptions: fixture.filterOptions,
    defaultFilters: DEFAULT_FILTERS,
  };
}

export default useAssetsData;
