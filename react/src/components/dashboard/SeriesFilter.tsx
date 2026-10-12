import type { FC } from 'react';
import type { SeriesOption } from '../../types/dashboard';
import './SeriesFilter.css';

export interface SeriesFilterProps {
  options: SeriesOption[];
  activeId: string;
  onChange?: (id: string) => void;
}

/**
 * Filter chip group for the request-volume chart. Keeps a single chip
 * active at a time; renders the same `aria-pressed` semantics as the
 * prototype's `.chip-group` so AT can identify the active option.
 *
 * Note: we render plain `<button class="chip">` elements rather than
 * Syncfusion's `ButtonComponent` because the EJ2 button does not
 * expose `aria-pressed` directly. The prototype's chip styling is also
 * a pure-token chip overlay that does not benefit from Syncfusion's
 * `e-btn` chrome.
 */
const SeriesFilter: FC<SeriesFilterProps> = ({ options, activeId, onChange }) => {
  const handleClick = (id: string) => (): void => {
    if (typeof onChange === 'function') onChange(id);
  };

  const handleKeyDown = (id: string) => (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (typeof onChange !== 'function') return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(id);
    }
  };

  return (
    <div className="chip-group" role="group" aria-label="Series filter">
      {options.map((option) => {
        const isActive = option.id === activeId;
        return (
          <button
            key={option.id}
            type="button"
            className={'chip' + (isActive ? ' is-active' : '')}
            aria-pressed={isActive ? 'true' : 'false'}
            onClick={handleClick(option.id)}
            onKeyDown={handleKeyDown(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default SeriesFilter;
