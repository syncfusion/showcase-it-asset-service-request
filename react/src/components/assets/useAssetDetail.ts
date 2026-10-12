// `useAssetDetail(id)` — resolves the per-asset supplementary data
// the asset detail modal renders against (timeline, documents,
// linked tickets, cost center, warranty end date).
//
// The hook imports `src/data/assets.json` and
// `src/data/assetDetail.json` once at module scope and indexes the
// asset detail entries into a `Map<Asset.id, AssetDetailViewModel>`
// for O(1) lookup. The page passes the modal's active `Asset.id`
// (from the URL query string) and the hook returns the matching
// `Asset` (from `assets.json`) and `viewModel` (from
// `assetDetail.json`), with `null` fallbacks when either is
// missing.
//
// Memoization follows the same `useMemo` discipline the rest of
// the assets surface (see `useAssetsData.ts`) uses, so the
// `Map<id, …>` is built once per module load rather than once
// per render.

import { useMemo } from 'react';
import assetsFixture from '../../data/assets.json';
import assetDetailFixture from '../../data/assetDetail.json';
import type {
  Asset,
  AssetDetailFixture,
  AssetDetailViewModel,
  AssetsFixture,
} from '../../types/assets';

const ASSETS_FIXTURE = assetsFixture as AssetsFixture;
const DETAIL_FIXTURE = assetDetailFixture as AssetDetailFixture;

/**
 * Module-scope `Map<Asset.id, Asset>`. Built once on module load so
 * the modal can resolve the full `Asset` row in O(1) without
 * re-scanning the 200+ row fixture on every render.
 */
const ASSET_BY_ID: Map<string, Asset> = new Map(
  ASSETS_FIXTURE.assets.map((row) => [row.id, row]),
);

/**
 * Module-scope `Map<Asset.id, AssetDetailViewModel>`. Mirrors the
 * `useAssetsData` pattern: indexing the JSON once at module load
 * makes the per-asset lookup O(1) and keeps the `useMemo` stable
 * for the consumer.
 */
const DETAIL_BY_ID: Map<string, AssetDetailViewModel> = new Map(
  Object.entries(DETAIL_FIXTURE.details ?? {}),
);

export interface UseAssetDetailResult {
  /** The matching `Asset` from `assets.json`, or `null`. */
  asset: Asset | null;
  /** The matching `AssetDetailViewModel` from `assetDetail.json`, or `null`. */
  viewModel: AssetDetailViewModel | null;
}

/**
 * Resolve the per-asset supplementary data the asset detail modal
 * renders against. Both `asset` and `viewModel` return `null` when
 * the supplied `id` is `null` or has no match in the corresponding
 * fixture, so the modal can short-circuit the render without
 * special-casing either side.
 *
 * The hook is intentionally stable across renders — the lookup
 * tables are built once at module scope, so each call is an O(1)
 * `Map.get`. A `useMemo` keeps the result reference stable when
 * the `id` argument hasn't changed, which lets the modal's
 * downstream `useState` and `useEffect` hooks skip work.
 */
export function useAssetDetail(id: string | null): UseAssetDetailResult {
  return useMemo<UseAssetDetailResult>(() => {
    if (!id) {
      return { asset: null, viewModel: null };
    }
    return {
      asset: ASSET_BY_ID.get(id) ?? null,
      viewModel: DETAIL_BY_ID.get(id) ?? null,
    };
  }, [id]);
}

export default useAssetDetail;
