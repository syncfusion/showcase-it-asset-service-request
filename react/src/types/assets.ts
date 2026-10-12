// Shared shape types for the IT asset inventory surface. Mirrors the
// `src/data/assets.json` fixture so the JSON import and the React
// tree agree on the same vocabulary (per the build-assets-page spec).

export type AssetStatus = 'InUse' | 'Available' | 'InRepair' | 'Retired';

export type AssetType = 'Laptop' | 'Monitor' | 'Phone' | 'Peripheral';

export type AssetLocation =
  | 'HQ · Floor 3'
  | 'West campus'
  | 'Remote'
  | 'Depot · Repair bay'
  | 'Archive · Bay 2';

/**
 * Owner is either a named user (name + initials) or the sentinel
 * `Unassigned` value the prototype uses for free pool assets. The
 * `Unassigned` case is represented as `{ name: 'Unassigned',
 * initials: '' }` so the cell template can read it uniformly.
 */
export interface AssetOwner {
  name: string;
  initials: string;
}

export type AssetIconName =
  | 'laptop'
  | 'monitor'
  | 'smartphone'
  | 'headphones'
  | 'mouse'
  | 'keyboard'
  | 'webcam'
  | 'speaker'
  | 'cable'
  | 'printer'
  | 'tablet'
  | 'dock';

export interface Asset {
  id: string;
  title: string;
  sub: string;
  type: AssetType;
  status: AssetStatus;
  owner: AssetOwner;
  location: AssetLocation;
  purchased: string; // ISO YYYY-MM-DD
  icon: AssetIconName;
}

export interface AssetFilterOptions {
  status: AssetStatus[];
  type: AssetType[];
  location: AssetLocation[];
  aging: boolean;
}

export interface AssetsFixture {
  assets: Asset[];
  filterOptions: AssetFilterOptions;
}

/**
 * The Status filter the prototype seeds with: `In use` and
 * `Available` are checked by default; `In repair` and `Retired` are
 * unchecked. Mirrors the `checked` attributes on
 * `prototype/index.html`'s `#view-assets` Status checkboxes.
 */
export const DEFAULT_STATUS_CHECKED: readonly AssetStatus[] = [
  'InUse',
  'Available',
];

/**
 * The Type filter the prototype seeds with: `Laptop` and `Monitor`
 * are checked; `Phone` and `Peripheral` are unchecked. Mirrors the
 * `checked` attributes on the prototype's Type checkboxes.
 */
export const DEFAULT_TYPE_CHECKED: readonly AssetType[] = [
  'Laptop',
  'Monitor',
];

/** Sentinel Location value for the "All sites" radio. */
export const LOCATION_ALL: 'all' = 'all' as const;
export type LocationSelection =
  | typeof LOCATION_ALL
  | AssetLocation;

/**
 * Sentinel value for the Location filter radio that means "match any
 * location". Stored as `'all'` (not a real AssetLocation) so the
 * fixture's typed `AssetLocation` stays closed.
 */
export const LOCATION_ALL_LABEL = 'All sites';

/* ============================================================================
   Asset detail view-model — supplementary data sourced from
   `src/data/assetDetail.json` so the asset detail modal can render
   per-asset timeline events, attached documents, and the linked
   service requests without re-deriving them at render time.
   ========================================================================= */

/**
 * Document stub — a small attached-file descriptor used inside a
 * timeline event's `attachments` list. The view-model's main
 * `documents` array uses the superset `AssetDocument` (which adds
 * a stable `view` affordance).
 */
export interface AssetDocumentStub {
  id: string;
  name: string;
  kind: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * A document attached to an asset. The `view` flag is `true` for
 * documents the modal exposes a `View` button for, and `false` for
 * internal-only attachments that surface as plain text.
 */
export interface AssetDocument extends AssetDocumentStub {
  view: boolean;
}

/**
 * A single timeline event the modal's `Timeline` tab renders. Events
 * sort newest-first; the modal itself does not re-sort — the JSON
 * fixture ships events in the order the prototype's HTML defines.
 */
export interface AssetTimelineEvent {
  /** ISO `YYYY-MM-DD` for the event timestamp. */
  at: string;
  /** Free-form actor label (e.g. "Dana Quinn", "AppleCare+"). */
  actor: string;
  /** Short headline for the event. */
  title: string;
  /** Optional human-readable note line. */
  note?: string;
  /** Optional list of attached documents (stubs only). */
  attachments?: AssetDocumentStub[];
}

/**
 * SLA chip on a linked-ticket card. Mirrors the kanban card's
 * `SlaChip` shape so the linked-ticket card can re-use the same
 * styling and accessibility surface.
 */
export interface AssetLinkedTicketSla {
  kind: 'safe' | 'risk';
  text: string;
}

/**
 * A service request linked to the asset. The card surfaces the
 * ticket's id / title / priority / status / SLA / owner so the
 * user can pivot from the asset modal into the request
 * (place-holder toast in this change).
 */
export interface AssetLinkedTicket {
  id: string;
  title: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: string;
  sla: AssetLinkedTicketSla;
  owner: AssetOwner;
}

/**
 * The supplementary data the asset detail modal renders for one
 * asset. The fixtures key the map by `Asset.id` so the
 * `useAssetDetail` hook can look up the matching entry in O(1).
 */
export interface AssetDetailViewModel {
  /** Cost center code (e.g. "CC-IT-440") — surfaces in the meta-grid. */
  costCenter: string;
  /** ISO `YYYY-MM-DD` for the warranty end date — surfaces in the meta-grid. */
  warrantyEndsAt: string;
  /** Ordered lifecycle events (modal renders reverse-chronologically). */
  timeline: AssetTimelineEvent[];
  /** Attached documents for the `Documents` tab. */
  documents: AssetDocument[];
  /** Linked service requests for the `Linked tickets` tab. */
  linkedTickets: AssetLinkedTicket[];
}

/**
 * Top-level shape of `src/data/assetDetail.json`. The hook reads
 * `details` and indexes the entries by `Asset.id` for O(1) lookup.
 */
export interface AssetDetailFixture {
  details: Record<string, AssetDetailViewModel>;
}

/**
 * Maps an `AssetStatus` to the active stepper index in the
 * `Asset detail modal` lifecycle stepper. The stepper is
 * `Procured | Imaged | Assigned | Refresh | Retired` (indices 0-4).
 */
export const LIFECYCLE_STEPS: readonly string[] = [
  'Procured',
  'Imaged',
  'Assigned',
  'Refresh',
  'Retired',
] as const;

/**
 * Index of the active stepper step for each `AssetStatus`. Mirrors
 * the spec for the `Linked tickets` / `asset-detail-view` modal:
 *   - InUse     → 2 (Assigned)
 *   - Available → 1 (Imaged)
 *   - InRepair  → 3 (Refresh)
 *   - Retired   → 4 (Retired)
 */
export const ACTIVE_STEP_BY_STATUS: Record<AssetStatus, number> = {
  InUse: 2,
  Available: 1,
  InRepair: 3,
  Retired: 4,
};

/**
 * Identifier for the three tabs the modal exposes. The active tab
 * is a single source of truth initialised to `'timeline'` and
 * synced with the URL query string (`?tab=docs`).
 */
export type AssetDetailTabId = 'timeline' | 'docs' | 'tickets';

export const ASSET_DETAIL_TABS: readonly AssetDetailTabId[] = [
  'timeline',
  'docs',
  'tickets',
] as const;

/**
 * The human-readable label for each tab id. Kept in the types
 * module so the modal's tab strip and the page's URL bridge share
 * the same vocabulary.
 */
export const ASSET_DETAIL_TAB_LABEL: Record<AssetDetailTabId, string> = {
  timeline: 'Timeline',
  docs: 'Documents',
  tickets: 'Linked tickets',
};
