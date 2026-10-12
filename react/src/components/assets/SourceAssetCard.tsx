// Source asset card — the right-rail "what's being handed over"
// summary that mirrors the visual treatment of the dialog's
// `AssetPreviewCard` but with a larger hero block + location
// chip + "Change asset" affordance. Renders as a non-modal
// inline card so it stays visible while the user scrolls the
// form.
//
// Renders nothing when `asset` is `null` so the page can pass
// the preselected asset straight through without guarding the
// JSX. The owning page composes the right rail top-to-bottom,
// so this card slots in at the top.
//
// The card pulls its color from the existing token palette
// (`--app-card-bg`, `--color-sf-bg-brand-subtle`,
// `--color-sf-fg-brand-primary`) so it stays consistent with
// the form's locked `AssetPreviewCard` and the inventory grid.

import type { FC, ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Monitor } from 'lucide-react';
import type { Asset } from '../../types/assets';

export interface SourceAssetCardProps {
  /** The currently selected source asset. Renders nothing
   *  when `null` (e.g. when the user opened `/handover`
   *  without a `?asset=<id>` query). */
  asset: Asset | null;
  /** The owning page's navigate handler — passed in so the
   *  "Change asset" CTA can route back to the inventory
   *  grid where the user can pick a different row. The page
   *  also owns the post-submit navigation, so this is the
   *  same `navigate` instance. */
  onChangeAsset?: () => void;
}

/** Hero block — 64×64 device glyph + model/serial + location
 *  chip. The icon is rendered as a 64×64 gradient tile (the
 *  same gradient the dialog's `AssetPreviewCard` uses) so the
 *  right rail feels like a natural extension of the form. */
const SourceAssetCard: FC<SourceAssetCardProps> = ({
  asset,
  onChangeAsset,
}) => {
  const navigate = useNavigate();
  if (!asset) return null;

  const handleChangeAsset = (): void => {
    if (typeof onChangeAsset === 'function') {
      onChangeAsset();
      return;
    }
    // Fallback: route back to the inventory grid. The page
    // can override this when a different destination makes
    // more sense (e.g. an asset-picker overlay).
    navigate('/assets');
  };

  return (
    <section
      className="source-asset-card"
      aria-labelledby="source-asset-card-title"
    >
      <header className="source-asset-card__header">
        <div className="source-asset-card__eyebrow">Source asset</div>
        <h3
          className="source-asset-card__title"
          id="source-asset-card-title"
        >
          {asset.id}
        </h3>
      </header>

      <div className="source-asset-card__hero">
        <span className="source-asset-card__hero-icon" aria-hidden="true">
          <DeviceGlyph type={asset.type} />
        </span>
        <div className="source-asset-card__hero-text">
          <div className="source-asset-card__model">{asset.title}</div>
          <div className="source-asset-card__sub">
            <span className="source-asset-card__chip">{asset.type}</span>
            <span
              className="source-asset-card__chip-divider"
              aria-hidden="true"
            >
              ·
            </span>
            <span
              className={`source-asset-card__chip source-asset-card__chip--${asset.status.toLowerCase()}`}
            >
              {asset.status}
            </span>
          </div>
        </div>
      </div>

      <dl className="source-asset-card__meta">
        <div className="source-asset-card__meta-row">
          <dt className="source-asset-card__meta-key">Custodian</dt>
          <dd className="source-asset-card__meta-value">
            {asset.owner.name}
          </dd>
        </div>
        <div className="source-asset-card__meta-row">
          <dt className="source-asset-card__meta-key">Location</dt>
          <dd className="source-asset-card__meta-value">
            <MapPin
              size={12}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span>{asset.location}</span>
          </dd>
        </div>
        <div className="source-asset-card__meta-row">
          <dt className="source-asset-card__meta-key">Purchased</dt>
          <dd className="source-asset-card__meta-value">
            {formatPurchased(asset.purchased)}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        className="source-asset-card__change"
        onClick={handleChangeAsset}
        aria-label={`Change source asset (currently ${asset.id})`}
      >
        Change asset
        <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </section>
  );
};

export default SourceAssetCard;

/* -------------------------------------------------------------------------- */

function formatPurchased(iso: string): string {
  // Render the YYYY-MM-DD purchase date as a human-readable
  // "Mon YYYY" string. The fixture always ships a valid ISO
  // date, so we don't guard against `Invalid Date` — a bad
  // input would just render the raw ISO string.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function DeviceGlyph({ type }: { type: Asset['type'] }): ReactElement {
  // Lightweight inline glyph — the same `lucide-react` icons
  // the asset grid uses, sized to the 64×64 hero tile. The
  // type mapping mirrors `assets.json`'s `AssetIconName`
  // shape, so the hero reads at a glance even without the
  // asset's image.
  switch (type) {
    case 'Laptop':
      return <Monitor size={28} strokeWidth={1.5} />;
    case 'Monitor':
      return <Monitor size={28} strokeWidth={1.5} />;
    case 'Phone':
      return <Monitor size={28} strokeWidth={1.5} />;
    case 'Peripheral':
    default:
      return <Monitor size={28} strokeWidth={1.5} />;
  }
}
