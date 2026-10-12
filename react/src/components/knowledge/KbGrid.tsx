import { useCallback, useMemo, useRef } from 'react';
import type { FC } from 'react';
import { renderToString } from 'react-dom/server';
import {
  ColumnDirective,
  ColumnsDirective,
  GridComponent,
   Page, Inject,
  QueryCellInfoEventArgs,
  RowSelectEventArgs,
} from '@syncfusion/ej2-react-grids';
import type { KbArticle, KbCategory } from '../../types/knowledge';
import './knowledge.css';

/** Maps the fixture's `KbCategory` value to the prototype's badge modifier. */
const CATEGORY_BADGE: Record<KbCategory, { modifier: string; ariaLabel: string }> = {
  Handover: { modifier: 'badge--info', ariaLabel: 'Category: Handover' },
  Hardware: { modifier: 'badge--warning', ariaLabel: 'Category: Hardware' },
  Network: { modifier: 'badge--neutral', ariaLabel: 'Category: Network' },
  Access: { modifier: 'badge--success', ariaLabel: 'Category: Access' },
  Security: { modifier: 'badge--danger', ariaLabel: 'Category: Security' },
  Software: { modifier: 'badge--violet', ariaLabel: 'Category: Software' },
};

/**
 * Escape unsafe HTML characters before injecting strings into innerHTML.
 * The fixture data is local and trusted, but escaping keeps the helper
 * safe if the component is ever reused with remote input.
 */
const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Stable `Intl.DateTimeFormat` for the `Updated` column. The grid
 *  renders cell content through `queryCellInfo` (bypassing Syncfusion's
 *  column-level `format` prop), so the formatter is applied here.
 *  Returns the input unchanged if parsing fails so a malformed date
 *  never throws inside a cell render. */
const UPDATED_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const formatUpdated = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return UPDATED_FORMATTER.format(date);
};

/** Build the Article column cell markup (title + summary). */
const buildArticleCell = (article: KbArticle): string => {
  return `<div class="kb-article-cell" aria-label="${escapeHtml(article.title)} (${escapeHtml(article.id)})">
    <span class="kb-article-cell__title">${escapeHtml(article.title)}</span>
    <span class="kb-article-cell__sub">${escapeHtml(article.summary)}</span>
  </div>`;
};

/** Build the Category column cell markup. */
const buildCategoryCell = (category: KbCategory): string => {
  const cfg = CATEGORY_BADGE[category];
  return `<span class="badge ${cfg.modifier}" aria-label="${cfg.ariaLabel}">${escapeHtml(category)}</span>`;
};

export interface KbGridProps {
  /** The filtered article rows. */
  rows: KbArticle[];
  /**
   * Re-key signature for the grid. Any change to the inputs (search
   * or category) flips the key, forcing the grid to remount so
   * Syncfusion's internal row cache stays consistent.
   */
  rowSignature: string;
  /** The currently selected article id. */
  selectedId: string | null;
  /** Fired when the user activates a row. */
  onRowSelect: (articleId: string) => void;
  /** Whether to show the empty-state message instead of the grid. */
  isEmpty: boolean;
}

/**
 * Knowledge base article grid. Renders the filtered `rows` through
 * Syncfusion's `GridComponent` with four columns (`Article` /
 * `Category` / `Updated` / `Helpful`) in the prototype's order, custom
 * cell templates for the Article (title + summary), Category (badge),
 * and Updated (monospaced ISO date) columns.
 *
 * Cell templates are rendered through `queryCellInfo` rather than the
 * React `template` prop. In this stack (React 19 + Syncfusion v35.x)
 * JSX templates mount but leave the cell empty; injecting static markup
 * at the cell level gives the same visual result while remaining
 * compatible with filtering, sorting, and paging.
 *
 * Why a Syncfusion grid and not a hand-rolled `<table>`: Syncfusion is
 * the project's contract (see `openspec/config.yaml`); the grid
 * provides paging, sorting, and a built-in row-selection event that's
 * keyboard-accessible out of the box.
 */
const KbGrid: FC<KbGridProps> = ({
  rows,
  rowSignature,
  selectedId,
  onRowSelect,
  isEmpty,
}) => {
  const gridRef = useRef<GridComponent | null>(null);

  /**
   * Row select handler. Syncfusion's `rowSelected` event may fire on
   * initial mount as well as on click, so we guard the callback with
   * a not-null check and forward only the article id to the page.
   */
  const handleRowSelected = useCallback(
    (args: RowSelectEventArgs) => {
      const data = args.data as KbArticle | KbArticle[] | undefined;
      if (!data) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (row && typeof row.id === 'string') {
        onRowSelect(row.id);
      }
    },
    [onRowSelect],
  );

  /**
   * Cell renderer for the Article, Category, and Updated columns.
   * Injected through `queryCellInfo` so the React 19 + Syncfusion
   * v35.x `template` prop's empty-cell quirk is bypassed.
   */
  const handleQueryCellInfo = useCallback((args: QueryCellInfoEventArgs) => {
    const data = args.data as KbArticle | undefined;
    const field = args.column?.field;
    if (!data || !field) return;
    const cell = args.cell as HTMLTableCellElement | undefined;
    if (!cell) return;
    if (field === 'title') {
      cell.innerHTML = buildArticleCell(data);
    } else if (field === 'category') {
      cell.innerHTML = buildCategoryCell(data.category);
    } else if (field === 'updated') {
      const formatted = formatUpdated(data.updated);
      cell.innerHTML = `<span class="kb-updated" aria-label="Updated ${escapeHtml(formatted)}">${escapeHtml(formatted)}</span>`;
    } else if (field === 'helpful') {
      cell.innerHTML = `<span class="kb-helpful" aria-label="${data.helpful} percent helpful">${data.helpful}%</span>`;
    }
  }, []);

  /**
   * After the grid renders, apply the `is-selected` class to the
   * row whose `id` matches `selectedId`. Syncfusion manages its
   * own selection state internally; we mirror the page's selection
   * onto the row's class list so the prototype's brand fill renders
   * on the active row.
   */
   const pageOptions = {
        pageSize: 10,
        pageCount: 3,
        pageSizes: true
    };
  const handleRowDataBound = useCallback(() => {
    const grid = gridRef.current;
    if (!grid || !selectedId) return;
    try {
      const rowEls = grid.element.querySelectorAll('.e-row');
      rowEls.forEach((el) => {
        const rowData = (el as HTMLElement & { __data?: KbArticle }).__data;
        if (rowData && rowData.id === selectedId) {
          el.classList.add('is-selected');
        } else {
          el.classList.remove('is-selected');
        }
      });
    } catch (_) {
      // Non-DOM environments (tests) — ignore.
    }
  }, [selectedId]);

  // Memoize the column set so the grid only re-renders when the row
  // list or signature changes.
  const columnSet = useMemo(
    () => (
      <ColumnsDirective>
        <ColumnDirective
          field="title"
          headerText="Article"
          width="320"
          allowSorting={false}
        />
        <ColumnDirective
          field="category"
          headerText="Category"
          width="130"
          allowSorting={false}
        />
        <ColumnDirective
          field="updated"
          headerText="Updated Date"
          width="130"
          allowSorting={false}
        />
        <ColumnDirective
          field="helpful"
          headerText="Helpful"
          width="100"
          allowSorting={false}
        />
      </ColumnsDirective>
    ),
    [],
  );

  if (isEmpty) {
    return (
      <div
        className="data-table-wrap"
        role="region"
        aria-label="Knowledge base articles"
      >
        <div className="data-table-empty" role="status">
          No articles match the current search and category.
        </div>
      </div>
    );
  }

  return (
    <div
      className="data-table-wrap kb-grid-wrap"
      role="region"
      aria-label="Knowledge base articles"
    >
      <GridComponent
        ref={gridRef}
        id="kb-grid"
        key={rowSignature}
        dataSource={rows}
        rowSelected={handleRowSelected}
        cssClass="kb-grid"
        gridLines="None"
        enableHeaderFocus
        enableHover
        allowPaging={true} pageSettings={pageOptions}
        queryCellInfo={handleQueryCellInfo}
        rowDataBound={handleRowDataBound}
      >
        {columnSet}
        <Inject services={[Page]} />
      </GridComponent>
    </div>
  );
};

export default KbGrid;
