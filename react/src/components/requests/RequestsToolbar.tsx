import type { ChangeEvent, FC } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { Plus, Search } from 'lucide-react';
import type { PriorityChipId, PriorityOption } from '../../types/requests';
import PriorityChips from './PriorityChips';
import './requests.css';

export interface RequestsToolbarProps {
  search: string;
  onSearchChange: (next: string) => void;
  priority: PriorityChipId;
  priorityOptions: PriorityOption[];
  onPriorityChange: (next: PriorityChipId) => void;
  onNewRequest: () => void;
  resultCount: number;
  totalCount: number;
}

/**
 * Toolbar above the requests kanban board. Hosts:
 * - a search input bound to a controlled `search` value
 * - the priority chip group (single-select)
 * - a primary `New request` button (Syncfusion ButtonComponent with
 *   a `+` icon)
 *
 * The toolbar also surfaces an `aria-live="polite"` result-count
 * line ("Showing X of N requests") so screen-reader users hear the
 * filter effect.
 */
const RequestsToolbar: FC<RequestsToolbarProps> = ({
  search,
  onSearchChange,
  priority,
  priorityOptions,
  onPriorityChange,
  onNewRequest,
  resultCount,
  totalCount,
}) => {
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(e.target.value);
  };

  return (
    <div
      className="toolbar toolbar--requests"
      role="toolbar"
      aria-label="Requests toolbar"
    >
      <label className="toolbar__search">
        <Search size={16} strokeWidth={1.75} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={handleSearchChange}
          placeholder="Ticket ID or title…"
          aria-label="Search requests by ticket id or title"
        />
      </label>

      <PriorityChips
        options={priorityOptions}
        active={priority}
        onChange={onPriorityChange}
      />

      <span className="sr-only" aria-live="polite">
        Showing {resultCount} of {totalCount} requests.
      </span>

      {/* <ButtonComponent
        cssClass="btn btn--primary btn--sm toolbar__new-request"
        onClick={onNewRequest}
        aria-label="Create a new request"
      >
        <Plus
          size={14}
          strokeWidth={2}
          aria-hidden="true"
          style={{ marginRight: 6, verticalAlign: '-2px' }}
        />
        New request
      </ButtonComponent> */}
    </div>
  );
};

export default RequestsToolbar;
