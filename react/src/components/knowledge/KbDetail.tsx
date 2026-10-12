import type { FC, MouseEvent } from 'react';
import { BookOpen, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import type {
  KbArticle,
  KbCategory,
  KbFeedback,
  KbFeedbackMap,
} from '../../types/knowledge';
import './knowledge.css';

const CATEGORY_BADGE: Record<KbCategory, string> = {
  Handover: 'badge--info',
  Hardware: 'badge--warning',
  Network: 'badge--neutral',
  Access: 'badge--success',
  Security: 'badge--danger',
  Software: 'badge--violet',
};

export interface KbDetailProps {
  /** The currently selected article, or `null` for the empty state. */
  article: KbArticle | null;
  /** The per-article feedback record. */
  feedback: KbFeedbackMap;
  /** Fired when the user activates the Yes or No feedback button. */
  onFeedback: (articleId: string, kind: KbFeedback) => void;
  /**
   * Fired when the user activates the close (X) button. Omit the
   * prop to render without a close button (e.g. for the always-
   * visible aside pattern).
   */
  onClose?: () => void;
  /**
   * Visual variant. `'panel'` adds a `.kb-detail--panel` modifier so
   * the stylesheet can target the side-panel drawer (sticky right
   * column, header bar). `'aside'` (default) keeps the original
   * right-aside card styling.
   */
  variant?: 'aside' | 'panel';
}

/**
 * Right-hand article detail aside. Renders the selected article's
 * title, meta strip (badge + revision + updated + owner), the body
 * paragraphs, and a feedback row with Yes / No buttons. When
 * `article === null` the component renders a token-driven empty
 * state with a Lucide `BookOpen` icon and the prototype's caption.
 *
 * The detail aside is controlled — the page owns the selected
 * article and the feedback map. The component emits
 * `(onFeedback)` whenever the user activates a feedback button.
 */
const KbDetail: FC<KbDetailProps> = ({
  article,
  feedback,
  onFeedback,
  onClose,
  variant = 'aside',
}) => {
  const rootClassName =
    variant === 'panel' ? 'card kb-detail kb-detail--panel' : 'card kb-detail';
  if (!article) {
    return (
      <aside className={rootClassName} aria-label="Article detail">
        <div className="kb-detail__empty" role="status">
          <BookOpen size={32} strokeWidth={1.5} aria-hidden="true" />
          <span>Select an article to read it here.</span>
        </div>
      </aside>
    );
  }

  const currentFeedback = feedback[article.id] ?? null;
  const badgeModifier = CATEGORY_BADGE[article.category];

  const handleFeedback = (kind: KbFeedback) => (
    _e: MouseEvent<HTMLButtonElement>,
  ): void => {
    onFeedback(article.id, kind);
  };

  return (
    <aside
      className={rootClassName}
      aria-label={`Article detail: ${article.title}`}
    >
      {onClose ? (
        <header className="kb-detail__header">
          <span className="kb-detail__eyebrow">Article detail</span>
          <ButtonComponent
            cssClass="kb-detail__close btn btn--secondary btn--sm"
            onClick={onClose}
            aria-label="Close article detail"
            title="Close"
          >
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </ButtonComponent>
        </header>
      ) : null}
      <article className="kb-article" data-panel={article.id}>
        <h2 className="kb-article__title">{article.title}</h2>
        <div className="kb-article__meta">
          <span
            className={`badge ${badgeModifier}`}
            aria-label={`Category: ${article.category}`}
          >
            {article.category}
          </span>
          <span className="kb-meta-text">{article.revision}</span>
          <span className="kb-meta-text" aria-hidden="true">·</span>
          <span className="kb-meta-text">Updated {article.updated}</span>
          <span className="kb-meta-text" aria-hidden="true">·</span>
          <span className="kb-meta-text">Owner: {article.owner.name}</span>
        </div>
        <div className="kb-article__body">
          {article.body.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
        <div className="feedback-row">
          <span>Was this helpful?</span>
          <ButtonComponent
            cssClass="btn btn--secondary btn--sm"
            data-feedback="up"
            aria-pressed={currentFeedback === 'up' ? 'true' : 'false'}
            aria-label="Yes, this was helpful"
            onClick={handleFeedback('up')}
          >
            <ThumbsUp
              size={14}
              strokeWidth={1.75}
              aria-hidden="true"
              style={{ marginRight: 6, verticalAlign: '-2px' }}
            />
            Yes
          </ButtonComponent>
          <ButtonComponent
            cssClass="btn btn--secondary btn--sm"
            data-feedback="down"
            aria-pressed={currentFeedback === 'down' ? 'true' : 'false'}
            aria-label="No, this was not helpful"
            onClick={handleFeedback('down')}
          >
            <ThumbsDown
              size={14}
              strokeWidth={1.75}
              aria-hidden="true"
              style={{ marginRight: 6, verticalAlign: '-2px' }}
            />
            No
          </ButtonComponent>
        </div>
      </article>
    </aside>
  );
};

export default KbDetail;
