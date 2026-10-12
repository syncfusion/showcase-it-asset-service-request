import type { FC } from 'react';
import {
  BookOpen,
  Cpu,
  Handshake,
  KeyRound,
  Library,
  ShieldCheck,
  Wifi,
  AppWindow,
} from 'lucide-react';
import type {
  KbCategoryIcon,
  KbCategoryId,
  KbCategoryOption,
} from '../../types/knowledge';
import './knowledge.css';

/** Lucide icon component map for the category rail. */
const ICON_MAP: Record<KbCategoryIcon, FC<{ size?: number; strokeWidth?: number }>> = {
  library: BookOpen,
  handshake: Handshake,
  cpu: Cpu,
  wifi: Wifi,
  'key-round': KeyRound,
  'shield-check': ShieldCheck,
  'app-window': AppWindow,
};

export interface KbCategoryRailProps {
  /** The category-rail entries (id, label, icon, count). */
  categories: KbCategoryOption[];
  /** The currently active category id. */
  activeId: KbCategoryId;
  /** Fired when the user activates a category button. */
  onSelect: (id: KbCategoryId) => void;
}

/**
 * Left-hand category rail. Renders a vertical list of `.kb-cat`
 * buttons, each with a Lucide icon, the label, and a right-aligned
 * `.kb-cat__count` chip. The active button carries
 * `aria-current="true"` and the prototype's brand fill.
 *
 * The rail is controlled — the parent owns the active category id
 * and we render straight from it. The rail emits `(onSelect)` with
 * the new category id and does not own selection state internally.
 */
const KbCategoryRail: FC<KbCategoryRailProps> = ({
  categories,
  activeId,
  onSelect,
}) => {
  return (
    <aside
      className="card kb-categories"
      aria-label="Knowledge base categories"
    >
      {categories.map((cat) => {
        const Icon = ICON_MAP[cat.icon] ?? BookOpen;
        const isActive = cat.id === activeId;
        return (
          <button
            key={cat.id}
            type="button"
            className="kb-cat"
            aria-current={isActive ? 'true' : 'false'}
            data-cat={cat.id}
            onClick={() => onSelect(cat.id)}
            aria-label={`${cat.label} (${cat.count})`}
          >
            <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>{cat.label}</span>
            <span className="kb-cat__count" aria-hidden="true">
              {cat.count}
            </span>
          </button>
        );
      })}
    </aside>
  );
};

export default KbCategoryRail;
