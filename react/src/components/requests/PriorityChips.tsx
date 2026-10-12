import type { FC } from 'react';
import type { PriorityChipId, PriorityOption } from '../../types/requests';
import './requests.css';

export interface PriorityChipsProps {
  options: PriorityOption[];
  active: PriorityChipId;
  onChange: (next: PriorityChipId) => void;
}

/**
 * Single-select priority chip group rendered above the kanban board.
 * Exactly one chip carries `aria-pressed="true"` at a time. The
 * active chip uses the prototype's brand fill (mapped to
 * `--app-nav-active-bg` / `--app-nav-active-fg` in `requests.css`).
 *
 * Spec coverage:
 * - "Toolbar exposes search, priority chip group, and 'New
 *   request' CTA" → chip group is one of the three controls.
 * - "Priority chip is single-select" → the `onChange` callback emits
 *   the new chip id and the previous active chip is un-pressed.
 * - "Default chip is 'All priorities'" → the page seeds `active =
 *   'all'`; the toolbar wires that through `useRequestsData`.
 */
const PriorityChips: FC<PriorityChipsProps> = ({
  options,
  active,
  onChange,
}) => {
  return (
    <div
      className="chip-group"
      role="group"
      aria-label="Filter by priority"
    >
      {options.map((opt) => {
        const isActive = opt.id === active;
        return (
          <button
            key={opt.id}
            type="button"
            className={`chip${isActive ? ' is-active' : ''}`}
            aria-pressed={isActive ? 'true' : 'false'}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default PriorityChips;
