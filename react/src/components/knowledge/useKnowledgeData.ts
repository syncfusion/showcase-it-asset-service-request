import { useCallback, useEffect, useMemo, useState } from 'react';
import knowledgeFixture from '../../data/knowledge.json';
import type {
  KbArticle,
  KbCategory,
  KbCategoryId,
  KbFeedbackMap,
  KbFeedback,
  KnowledgeFixture,
} from '../../types/knowledge';
import { KB_CATEGORIES } from '../../types/knowledge';

/**
 * Keys the hook validates against the JSON fixture. A missing key
 * produces a render-time console error (loud in dev) rather than
 * silently rendering `undefined` rows.
 */
const REQUIRED_KEYS: (keyof KnowledgeFixture)[] = ['articles', 'categories'];

function assertFixtureShape(fixture: unknown): fixture is KnowledgeFixture {
  if (!fixture || typeof fixture !== 'object') {
    console.error('[useKnowledgeData] fixture is missing or not an object');
    return false;
  }
  const missing = REQUIRED_KEYS.filter((k) => !(k in (fixture as object)));
  if (missing.length > 0) {
    console.error(
      '[useKnowledgeData] knowledge.json is missing required keys:',
      missing,
    );
    return false;
  }
  return true;
}

/** Per-category count from the unfiltered fixture. */
export type KbCategoryCounts = Record<KbCategory, number>;

/** Result of a feedback toggle — the page passes this to the toast. */
export interface KbFeedbackResult {
  id: string;
  kind: KbFeedback;
}

/** Shape the page receives from `useKnowledgeData`. */
export interface UseKnowledgeDataResult {
  /** The unfiltered fixture rows (stable reference, in id order). */
  articles: KbArticle[];
  /** The composed search ∩ category result set. */
  filtered: KbArticle[];
  /** The category-rail entries (id, label, icon, count). */
  categories: KnowledgeFixture['categories'];
  /** The total fixture size. */
  total: number;
  /** The filtered article count. */
  resultCount: number;
  /** The result-count label the toolbar renders ("Showing X of N articles"). */
  resultCountLabel: string;
  /** Active search text (raw, untrimmed so the input is controlled). */
  search: string;
  /** Active category id. */
  category: KbCategoryId;
  setSearch: (next: string) => void;
  setCategory: (next: KbCategoryId) => void;
  /** Currently selected article id, or `null` if the filtered set is empty. */
  selectedId: string | null;
  setSelectedId: (next: string | null) => void;
  /** The selected article (or `null` if the filtered set is empty). */
  selected: KbArticle | null;
  /** Per-article feedback record. */
  feedback: KbFeedbackMap;
  /** Toggle the per-article feedback vote. Re-clicking the same kind
   *  resets the value to `null`. */
  recordFeedback: (articleId: string, kind: KbFeedback) => KbFeedbackResult;
  /** The default category id the page seeds on first paint. */
  defaultCategory: KbCategoryId;
  /** The default selection the page seeds on first paint — the first
   *  article in the filtered set. */
  defaultSelection: (filtered: KbArticle[]) => string | null;
}

/**
 * Composed predicate: search ∩ category. `category === 'all'` is a
 * no-op; the search matches case-insensitive substrings of `title`
 * and `summary` per the spec.
 */
function applyFilters(
  rows: KbArticle[],
  category: KbCategoryId,
  search: string,
): KbArticle[] {
  const needle = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (category !== 'all' && row.category !== category) return false;
    if (needle) {
      const haystack = `${row.title} ${row.summary}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

/**
 * Counts per category from the unfiltered fixture. Returns a
 * closed record so callers can index by `KbCategory` without an
 * `undefined` check.
 */
function buildCategoryCounts(rows: KbArticle[]): KbCategoryCounts {
  const counts = KB_CATEGORIES.reduce<KbCategoryCounts>(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {} as KbCategoryCounts,
  );
  for (const row of rows) {
    counts[row.category] = (counts[row.category] ?? 0) + 1;
  }
  return counts;
}

/**
 * Reads `src/data/knowledge.json`, narrows the shape, owns the page's
 * `search` / `category` / `selectedId` / `feedback` state, and returns
 * the composed filter + search result set, the per-category counts,
 * the default-selection helper, and the feedback recorder.
 *
 * The page re-derives the result by passing `search` + `category` in,
 * so the toolbar's `onSearchChange` and the rail's `onSelect`
 * callbacks are thin pass-throughs to the hook's setters.
 */
export function useKnowledgeData(): UseKnowledgeDataResult {
  // Stabilise the fixture reference once per mount.
  const fixture = useMemo<KnowledgeFixture>(() => {
    assertFixtureShape(knowledgeFixture);
    return knowledgeFixture as unknown as KnowledgeFixture;
  }, []);

  // Stable reference for the row list (the JSON import is frozen).
  const articles = useMemo<KbArticle[]>(() => fixture.articles, [fixture]);

  // Page state — lifted into the hook so the rail, toolbar, grid,
  // and detail stay in lock-step through a single source of truth.
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<KbCategoryId>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<KbFeedbackMap>({});

  // Compose the filter + search into the visible article set.
  const filtered = useMemo<KbArticle[]>(
    () => applyFilters(articles, category, search),
    [articles, category, search],
  );

  // Default-selection helper. The first article in the filtered set
  // matches the prototype's behaviour: on first paint the first row
  // in the unfiltered fixture is selected; activating a category or
  // typing in the search input keeps the current selection if the
  // article is still in the filtered set, otherwise falls back to the
  // first article in the new filtered set.
  const defaultSelection = useCallback(
    (nextFiltered: KbArticle[]): string | null => {
      if (nextFiltered.length === 0) return null;
      return nextFiltered[0].id;
    },
    [],
  );

  // Effect: when the filtered set changes and the current selection
  // is no longer in the set, fall back to the first article in the
  // new filtered set. Also handles the empty case (clears
  // selectedId) and the first-paint case (no selection yet).
  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    const stillInSet = selectedId
      ? filtered.some((a) => a.id === selectedId)
      : false;
    if (!stillInSet) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  // Per-category counts (from the unfiltered fixture so the rail
  // stays stable across filter changes per the spec).
  const counts = useMemo<KbCategoryCounts>(
    () => buildCategoryCounts(articles),
    [articles],
  );

  // Build the rail's category options. The fixture ships a baseline
  // list; we overwrite the `count` field with the live counts so the
  // rail always reflects the current fixture.
  const categories = useMemo<KnowledgeFixture['categories']>(
    () =>
      fixture.categories.map((opt) => {
        if (opt.id === 'all') {
          return { ...opt, count: articles.length };
        }
        return { ...opt, count: counts[opt.id as KbCategory] ?? 0 };
      }),
    [fixture.categories, articles.length, counts],
  );

  /**
   * Toggle the per-article feedback vote. Re-clicking the same kind
   * sets the value back to `null` (per the spec). Returns the
   * article id + the (possibly cleared) kind for the toast surface.
   */
  const recordFeedback = useCallback(
    (articleId: string, kind: KbFeedback): KbFeedbackResult => {
      let nextKind: KbFeedback = kind;
      setFeedback((prev) => {
        const current = prev[articleId] ?? null;
        // Toggle off if the user re-clicks the active button.
        const resolved: KbFeedback =
          current === kind ? null : kind;
        nextKind = resolved;
        if (resolved === null) {
          // Avoid leaving a stale key in the map.
          const { [articleId]: _omit, ...rest } = prev;
          return rest;
        }
        return { ...prev, [articleId]: resolved };
      });
      return { id: articleId, kind: nextKind };
    },
    [],
  );

  const selected = useMemo<KbArticle | null>(() => {
    if (!selectedId) return null;
    return articles.find((a) => a.id === selectedId) ?? null;
  }, [articles, selectedId]);

  const resultCount = filtered.length;
  const resultCountLabel = `Showing ${resultCount} of ${articles.length} articles`;

  return {
    articles,
    filtered,
    categories,
    total: articles.length,
    resultCount,
    resultCountLabel,
    search,
    category,
    setSearch,
    setCategory,
    selectedId,
    setSelectedId,
    selected,
    feedback,
    recordFeedback,
    defaultCategory: 'all',
    defaultSelection,
  };
}

export default useKnowledgeData;
