import { useCallback, useMemo, useState } from 'react';
import type { FC } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { BookOpen, MousePointerClick } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import KbCategoryRail from '../components/knowledge/KbCategoryRail';
import KbToolbar from '../components/knowledge/KbToolbar';
import KbGrid from '../components/knowledge/KbGrid';
import KbDetail from '../components/knowledge/KbDetail';
import KbToast from '../components/knowledge/KbToast';
import useKnowledgeData from '../components/knowledge/useKnowledgeData';
import type { KbCategoryId, KbFeedback } from '../types/knowledge';
import type { Toast } from '../types/dashboard';
import './Dashboard.css';
import '../components/knowledge/knowledge.css';

function nextToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/**
 * Knowledge base page — renders the existing `PageHeader` with a
 * primary `Request article` action and a `.kb-body` CSS Grid that
 * holds the category rail (left) and the centre column with the
 * `<KbToolbar/>` and `<KbGrid/>` (full width). Clicking a grid row
 * opens a dedicated side-panel drawer (`.kb-detail-panel`) on the
 * right that hosts the article's title, meta strip, body, and
 * feedback row. The panel hides when no article is selected so the
 * grid is always full-width. The page also includes the `<KbToast/>`
 * so the feedback confirmation and the `Request article` action
 * toast can surface from a single stack.
 *
 * State (`search`, `category`, `selectedId`, `feedback`, `toast`,
 * `panelDismissed`) is owned by `useKnowledgeData` + the page so
 * the rail, toolbar, grid, and side panel stay in lock-step through
 * a single source of truth.
 */
const Knowledge: FC = () => {
  const [toast, setToast] = useState<Toast | null>(null);
  /** When the user closes the side panel, hide it until a new
   *  row is clicked. The selection in the hook is preserved so
   *  re-clicking the same row re-opens the panel. */
  const [panelDismissed, setPanelDismissed] = useState<boolean>(true);

  const data = useKnowledgeData();
  const {
    filtered,
    categories,
    selectedId,
    selected,
    feedback,
    search,
    category,
    setSearch,
    setCategory,
    setSelectedId,
    recordFeedback,
    resultCount,
    resultCountLabel,
  } = data;

  /**
   * Stable re-key signature for the grid. Re-keying on every
   * filtered-set change forces a remount so Syncfusion's internal
   * row cache stays consistent (matches the assets / requests page
   * patterns).
   */
  const rowSignature = useMemo<string>(
    () => JSON.stringify(filtered.map((a) => a.id)),
    [filtered],
  );

  const showToast = useCallback((payload: Omit<Toast, 'id'>) => {
    setToast({
      id: nextToastId(),
      kind: payload.kind ?? 'success',
      title: payload.title,
      text: payload.text,
    });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const handleCategorySelect = useCallback(
    (id: KbCategoryId) => {
      setCategory(id);
    },
    [setCategory],
  );

  const handleRowSelect = useCallback(
    (articleId: string) => {
      // Always open the side panel on a row click, even when the
      // clicked id is already the active selection — e.g. the user
      // dismisses the panel, then re-clicks the same row. The
      // `useKnowledgeData` effect re-seeds `selectedId` to the
      // first filtered article on first paint, so a guard on
      // `articleId !== selectedId` would skip the panel-open
      // path for the very first row the user clicks.
      if (!articleId) return;
      if (articleId !== selectedId) {
        setSelectedId(articleId);
      }
      setPanelDismissed(false);
    },
    [selectedId, setSelectedId],
  );

  const handleClosePanel = useCallback(() => {
    setPanelDismissed(true);
  }, []);

  const handleFeedback = useCallback(
    (articleId: string, kind: KbFeedback) => {
      const result = recordFeedback(articleId, kind);
      if (result.kind === 'up') {
        showToast({
          kind: 'success',
          title: 'Thanks for the feedback',
        });
      } else if (result.kind === 'down') {
        showToast({
          kind: 'info',
          title: "Thanks — we'll improve this article",
        });
      } else {
        // Toggle-off clears the toast without surfacing a new one.
        dismissToast();
      }
    },
    [recordFeedback, showToast, dismissToast],
  );

  const handleRequestArticle = useCallback(() => {
    showToast({
      kind: 'info',
      title: 'Article requests open in a future change.',
    });
  }, [showToast]);

  const pageHeaderActions = (
    <ButtonComponent
      cssClass="btn btn--primary page-header__btn"
      onClick={handleRequestArticle}
      aria-label="Request a new knowledge article"
    >
      <BookOpen
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        style={{ marginRight: 6, verticalAlign: '-2px' }}
      />
      Request article
    </ButtonComponent>
  );

  const showPanel = Boolean(selected) && !panelDismissed;
  /**
   * When the user has an article selected but the side panel is
   * dismissed (or has just been closed), show a small hint under
   * the grid telling them to click a row to display the KB. The
   * hint is hidden while the panel itself is on screen so it never
   * duplicates the open detail.
   */
  const showGridHint = Boolean(selected) && panelDismissed;

  return (
    <>
      <PageHeader
        title="Knowledge base"
        description="Searchable IT runbooks, policies, and how-to articles curated by the service desk."
        actions={pageHeaderActions}
      />
      <div className="page-body kb-body">
        <KbCategoryRail
          categories={categories}
          activeId={category}
          onSelect={handleCategorySelect}
        />
        <div className="kb-content">
          <KbToolbar
            search={search}
            onSearchChange={setSearch}
            resultCountLabel={resultCountLabel}
          />
          <KbGrid
            rows={filtered}
            rowSignature={rowSignature}
            selectedId={selectedId}
            onRowSelect={handleRowSelect}
            isEmpty={resultCount === 0}
          />
          {showGridHint && selected ? (
            <div
              className="kb-grid-hint"
              role="status"
              aria-live="polite"
            >
              <span className="kb-grid-hint__icon" aria-hidden="true">
                <MousePointerClick size={12} strokeWidth={2} />
              </span>
              <span>
                Click on the row to display the KB
                {selected ? ` “${selected.title}”` : ''}.
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <div
        className={`kb-detail-panel${showPanel ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="false"
        aria-label="Knowledge base article detail"
        aria-hidden={showPanel ? 'false' : 'true'}
      >
        {showPanel ? (
          <KbDetail
            article={selected}
            feedback={feedback}
            onFeedback={handleFeedback}
            onClose={handleClosePanel}
            variant="panel"
          />
        ) : null}
      </div>
      {showPanel ? (
        <button
          type="button"
          className="kb-detail-panel__scrim"
          aria-label="Close article detail"
          onClick={handleClosePanel}
        />
      ) : null}
      <div className="kb-toast-stack">
        <KbToast toast={toast} onDismiss={dismissToast} />
      </div>
    </>
  );
};

export default Knowledge;
