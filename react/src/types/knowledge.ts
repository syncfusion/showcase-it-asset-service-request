// Shared shape types for the Knowledge base surface. Mirrors
// `src/data/knowledge.json` so the JSON import and the React tree agree
// on the same vocabulary (per the build-knowledge-page spec).
//
// The six `KbCategory` values form a closed union so the category rail
// and the category-cell badge color mapping stay in lock-step. The
// fixture uses them verbatim; if a new category is added, both the
// `KbCategoryOption` list and the badge modifier map in `KbGrid` need
// to grow with it.

/** The six article categories the fixture and rail both consume. */
export type KbCategory =
  | 'Handover'
  | 'Hardware'
  | 'Network'
  | 'Access'
  | 'Security'
  | 'Software';

/** Closed list of categories — drives the rail's per-category counts. */
export const KB_CATEGORIES: readonly KbCategory[] = [
  'Handover',
  'Hardware',
  'Network',
  'Access',
  'Security',
  'Software',
] as const;

/**
 * Owner is a named user (name + initials). The fixture uses this shape
 * uniformly; no `Unassigned` sentinel because the prototype never
 * surfaces an article without an owner.
 */
export interface KbOwner {
  name: string;
  initials: string;
}

/**
 * A single article row sourced from `knowledge.json`. The `id` is the
 * stable `kb-<slug>` format (e.g. `kb-handover`, `kb-power`); `body`
 * is a sequence of paragraphs the detail aside renders with the
 * prototype's `p + p { margin-top }` rule.
 */
export interface KbArticle {
  id: string;
  title: string;
  /** One-line subtitle that appears under the title in the table cell. */
  summary: string;
  category: KbCategory;
  /** ISO `YYYY-MM-DD` for the article's last-updated date. */
  updated: string;
  /** Integer percent in `[0, 100]`. */
  helpful: number;
  /** Revision string (e.g. `Rev 3.2`) shown in the meta strip. */
  revision: string;
  owner: KbOwner;
  /** Body paragraphs the detail aside renders. */
  body: string[];
}

/**
 * A single entry in the category rail. The `'all'` sentinel is the
 * "All articles" default; the prototype's rail order is
 * `all` / `Handover` / `Hardware` / `Network` / `Access`, with
 * `Security` / `Software` added by the showcase per the spec.
 */
export type KbCategoryId = 'all' | KbCategory;

/** Lucide icon name used by the rail button (consumer maps to the icon). */
export type KbCategoryIcon =
  | 'library'
  | 'handshake'
  | 'cpu'
  | 'wifi'
  | 'key-round'
  | 'shield-check'
  | 'app-window';

export interface KbCategoryOption {
  id: KbCategoryId;
  label: string;
  icon: KbCategoryIcon;
  /**
   * Per-category count from the **unfiltered** fixture so the rail
   * always shows the stable per-category totals (per the
   * build-knowledge-page spec). The rail's "All articles" count
   * equals the fixture's total.
   */
  count: number;
}

/** Per-article feedback vote. */
export type KbFeedback = 'up' | 'down' | null;

/** Map of article id → recorded feedback. Re-clicking the same button
 *  resets the value to `null` per the spec. */
export type KbFeedbackMap = Record<string, KbFeedback>;

/** Single source of truth for the knowledge surface. */
export interface KnowledgeFixture {
  articles: KbArticle[];
  categories: KbCategoryOption[];
}
