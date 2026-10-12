import type { ChangeEvent, FC } from 'react';
import { Search } from 'lucide-react';
import './knowledge.css';

export interface KbToolbarProps {
  /** The current search value (controlled). */
  search: string;
  /** Fired on every keystroke. */
  onSearchChange: (next: string) => void;
  /** The result-count label the toolbar renders in the
   *  `aria-live="polite"` line (e.g. "Showing X of N articles"). */
  resultCountLabel: string;
}

/**
 * Knowledge base toolbar. Renders a `.toolbar` row with a
 * `<label class="toolbar__search">` containing a Lucide `search`
 * icon and a native `<input type="search">` with placeholder
 * "Search knowledge base…". The toolbar also includes the
 * `aria-live="polite"` result-count line that updates as the user
 * types or activates a category.
 *
 * The toolbar is controlled — the page owns the search value and
 * the toolbar emits `(onSearchChange)` on each keystroke. The
 * result-count label is passed in as a prop so the toolbar does
 * not need to re-derive the count.
 */
const KbToolbar: FC<KbToolbarProps> = ({
  search,
  onSearchChange,
  resultCountLabel,
}) => {
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(e.target.value);
  };

  return (
    <div className="toolbar toolbar--kb" role="toolbar" aria-label="Knowledge toolbar">
      <label className="toolbar__search">
        <Search size={16} strokeWidth={1.75} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search knowledge base…"
          aria-label="Search knowledge base"
        />
      </label>
      <span className="toolbar__result-count" aria-live="polite">
        {resultCountLabel}
      </span>
    </div>
  );
};

export default KbToolbar;
