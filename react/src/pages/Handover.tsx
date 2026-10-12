// Handover page — the routed `/handover` page that hosts the
// three-section enterprise-grade form (Asset & custody /
// Transfer details / Acknowledgment) previously rendered
// inside a Syncfusion `DialogComponent` overlay on the
// `/assets` page. Redesigned in the
// `add-asset-handover-dialog` follow-up to a two-pane
// workbench layout: the form sits in the left column inside
// `SfCard`-style section chrome, the right rail hosts the
// source-asset card, activity timeline, live validation
// checklist, a placeholder AI risk score, and the primary
// `Submit handover` CTA so it's always visible alongside
// the rest of the right-rail context.
//
// Routing
// -------
// - `/handover`              — opens the form with no preselected
//                              source asset; the form exposes its
//                              own `Source asset` dropdown.
// - `/handover?asset=<id>`   — opens the form with the named
//                              asset preselected; the form hides
//                              the `Source asset` dropdown and
//                              shows a locked `AssetPreviewCard`
//                              instead. The right rail's
//                              `SourceAssetCard` mirrors the
//                              same selection. The `?asset=<id>`
//                              query param is matched against the
//                              `src/data/assets.json` fixture;
//                              unknown ids fall back to no
//                              preselection (the dropdown is
//                              shown) so an out-of-date link
//                              degrades gracefully.
//
// Lifecycle
// ---------
// The page owns:
//   - the toast pipeline (info / success / error toasts),
//   - the post-submit `app:action` `open-pdf` event dispatch
//     (placeholder for a future PDF viewer surface),
//   - the `navigate('/assets')` post-submit redirect,
//   - the section expand/collapse state (per-section),
//   - the right-rail validity snapshot (subscribed via
//     `HandoverForm.onValidityChange`).
//
// The form's local state (validation, draft notes, typed
// payload) still lives in the colocated `useHandoverDialog`
// hook re-used by `HandoverForm`; the page is the
// composition + page-level chrome wrapper.

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { Loader2, Send } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import HandoverForm from '../components/assets/HandoverForm';
import type { HandoverFormValidity } from '../components/assets/HandoverForm';
import AssetsToast from '../components/assets/AssetsToast';
import SourceAssetCard from '../components/assets/SourceAssetCard';
import HandoffChecklist from '../components/assets/HandoffChecklist';
import HandoverRiskCard from '../components/assets/HandoverRiskCard';
import HandoverActivityTimeline from '../components/assets/HandoverActivityTimeline';
import HandoverStepper from '../components/assets/HandoverStepper';
import assetsFixture from '../data/assets.json';
import peopleFixture from '../data/people.json';
import type { Asset, AssetsFixture } from '../types/assets';
import type {
  HandoverSubmission,
  PeopleFixture,
} from '../types/handover';
import type { Toast, ToastPayload } from '../types/dashboard';
import './Handover.css';

const APP_ACTION_EVENT = 'app:action';
const OPEN_PDF_DETAIL = 'open-pdf';
const ASSET_QUERY_PARAM = 'asset';

function nextToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/**
 * Lightweight fixtures validator. Mirrors the same
 * `assertFixtureShape` pattern the Assets / Dashboard pages
 * use so a missing `assets` / `people` key surfaces a loud
 * render-time console error rather than silently rendering
 * `undefined` rows.
 */
function assertAssetsFixture(fixture: unknown): fixture is AssetsFixture {
  if (!fixture || typeof fixture !== 'object') {
    console.error('[Handover] assets.json is missing or not an object');
    return false;
  }
  const f = fixture as Partial<AssetsFixture>;
  if (!Array.isArray(f.assets) || !f.filterOptions) {
    console.error(
      '[Handover] assets.json is missing required keys:',
      { assets: f.assets, filterOptions: f.filterOptions },
    );
    return false;
  }
  return true;
}

const typedAssets: AssetsFixture = (() => {
  if (assertAssetsFixture(assetsFixture)) return assetsFixture;
  return {
    assets: [],
    filterOptions: { status: [], type: [], location: [], aging: false },
  };
})();

const typedPeople: PeopleFixture = (() => {
  const fixture = peopleFixture as unknown;
  if (
    !fixture ||
    typeof fixture !== 'object' ||
    !('people' in (fixture as object))
  ) {
    console.error('[Handover] people.json is missing the required `people` key');
    return { people: [] };
  }
  return fixture as PeopleFixture;
})();

/**
 * Initial validity snapshot used until the form publishes
 * its first `onValidityChange` event. Mirrors the empty
 * form's expected state so the right rail / stepper don't
 * flash an incorrect "all done" state on first paint.
 */
const INITIAL_VALIDITY: HandoverFormValidity = {
  isValid: false,
  completedSteps: 0,
  sections: { custody: false, transfer: false, acknowledgment: false },
  acknowledgment: { from: false, to: false },
  errorCount: 0,
  errors: [],
  sourceAssetId: '',
  sourceAssetLocked: false,
};

/**
 * Handover page — the `/handover` route. Composes the
 * `HandoverForm` inside a two-pane workbench:
 *   - Left column (8/12): the form's three section cards.
 *   - Right column (4/12): the source-asset card, the
//     activity timeline, the live validation checklist, the
//     AI risk placeholder, and the primary `Submit handover`
//     CTA. The right column is sticky on desktop and
//     collapses to a single accordion above the form on
//     tablet / mobile.
 */
const Handover: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Resolve the optional `?asset=<id>` query param into an
  // `Asset` from the fixture. Unknown / missing ids return
  // `null` so the form falls back to the `Source asset`
  // dropdown path.
  const preselectedAsset = useMemo<Asset | null>(() => {
    const id = searchParams.get(ASSET_QUERY_PARAM);
    if (!id) return null;
    return typedAssets.assets.find((a) => a.id === id) ?? null;
  }, [searchParams]);

  // Page-level toast pipeline — mirrors the Assets page's
  // `useState<Toast | null>(null)` pattern so the user gets
  // identical confirmation copy on the post-submit path.
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback(
    (payload: string | ToastPayload) => {
      const body: ToastPayload | undefined =
        typeof payload === 'string' ? { title: payload } : payload;
      if (!body || !body.title) return;
      setToast({
        id: nextToastId(),
        kind: body.kind ?? 'success',
        ...body,
      });
    },
    [],
  );

  const dismissToast = useCallback(() => setToast(null), []);

  // Validity snapshot — published by `HandoverForm` via
  // the `onValidityChange` callback. The right rail and
  // stepper consume this snapshot; the page itself uses it
  // to drive the sticky submit button's `disabled` state
  // and the section progress rail.
  const [validity, setValidity] =
    useState<HandoverFormValidity>(INITIAL_VALIDITY);

  // Submitting state — drives the `ProgressButton`
  // spinner's visibility. The page owns the state so the
  // form's submit-bridge click and the action bar's
  // primary button share the same flag.
  const [submitting, setSubmitting] = useState<boolean>(false);

  /**
   * Confirmation toast for the form's `Draft notes` button.
   */
  const handleDraftNotes = useCallback(() => {
    showToast({
      kind: 'info',
      title: 'Draft inserted',
      text: 'Sample AI condition notes — review before submit.',
    });
  }, [showToast]);

  /**
   * Post-submit handler. Mirrors the dialog's success
   * path: toast, `app:action` event, navigate.
   */
  const handleSubmit = useCallback(
    (submission: HandoverSubmission) => {
      setSubmitting(false);
      showToast({
        kind: 'success',
        title: 'Handover submitted',
        text: `PDF receipt would be generated and linked to ${submission.sourceAssetId}.`,
      });
      try {
        if (
          typeof window !== 'undefined' &&
          typeof CustomEvent === 'function'
        ) {
          window.dispatchEvent(
            new CustomEvent(APP_ACTION_EVENT, {
              detail: {
                action: OPEN_PDF_DETAIL,
                assetId: submission.sourceAssetId,
              },
            }),
          );
        }
      } catch (_) {
        // Non-DOM environments (tests) — ignore.
      }
      window.setTimeout(() => {
        navigate('/assets');
      }, 800);
    },
    [showToast, navigate],
  );

  const handleCancel = useCallback(() => {
    navigate('/assets');
  }, [navigate]);

  /**
   * Trigger the form's submit bridge directly (e.g. from
   * the action bar's primary CTA). The bridge handles
   * `validate()` + the alert display; if validation
   * passes, the form's own `onSubmit` fires and the page
   * takes over with the success toast + redirect.
   *
   * The `submitting` flag is a visual flag only — the form
   * owns the actual validation predicate. If validation
   * fails, the form never calls `onSubmit`, so we use a
   * safety timer to reset `submitting` after a short
   * window so the spinner doesn't get stuck on a failed
   * submit.
   */
  const triggerSubmit = useCallback(() => {
    if (typeof document === 'undefined') return;
    const bridge = document.querySelector<HTMLButtonElement>(
      '[data-handover-submit="true"]',
    );
    if (bridge && !bridge.disabled) {
      setSubmitting(true);
      bridge.click();
      // Safety net — if the bridge click does NOT lead to
      // a successful `onSubmit` (i.e. validation failed
      // and the form showed the alert instead), reset the
      // submitting flag so the spinner doesn't get stuck.
      // 600ms comfortably exceeds the form's synchronous
      // validation + alert render but is short enough to
      // feel responsive.
      window.setTimeout(() => {
        setSubmitting(false);
      }, 600);
    }
  }, []);

  // Wire a keyboard shortcut: pressing Cmd/Ctrl + Enter from
  // anywhere in the form triggers the hidden submit bridge
  // inside HandoverForm. Saves the user from reaching for
  // the right-rail Submit button in the middle of a long
  // text entry.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const bridge = document.querySelector<HTMLButtonElement>(
          '[data-handover-submit="true"]',
        );
        if (bridge && !bridge.disabled) {
          e.preventDefault();
          bridge.click();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // Page-level actions for the `PageHeader` — secondary
  // Cancel only; the primary Submit CTA now lives at the
  // bottom of the right rail so the two CTAs are visually
  // distinct and the form's body can still grow without
  // the rail jumping.
  const pageHeaderActions = (
    <button
      type="button"
      className="icon-btn page-header__icon-btn"
      onClick={handleCancel}
      aria-label="Cancel handover"
      title="Cancel handover"
    >
      Cancel
    </button>
  );

  const isSubmitDisabled = !validity.isValid || submitting;
  const submitLabel = submitting ? 'Submitting…' : 'Submit handover';

  return (
    <>
      <PageHeader
        title="Handover"
        description="Capture the asset, transfer details, and acknowledgement required to reassign custody of a device."
        actions={pageHeaderActions}
      />
      <div className="page-body handover-page">
        <div className="handover-workbench" data-handover-workbench="true">
          {/* Left column — primary surface hosting the form. */}
          <div className="handover-workbench__primary">
            <div className="handover-workbench__form-card">
              <HandoverForm
                sourceAsset={preselectedAsset}
                assets={typedAssets.assets}
                people={typedPeople}
                onSubmit={handleSubmit}
                onDraftNotes={handleDraftNotes}
                onValidityChange={setValidity}
              />
            </div>
            <HandoverStepper validity={validity} />
          </div>

          {/* Right column — sticky side rail (collapses to a
              stacked column on tablet / mobile). */}
          <aside
            className="handover-workbench__rail"
            aria-label="Handover side rail"
          >
            <SourceAssetCard
              asset={preselectedAsset}
              onChangeAsset={handleCancel}
            />
            <HandoverActivityTimeline
              sourceAssetId={preselectedAsset?.id ?? null}
            />
            <HandoffChecklist
              validity={validity}
              sourceAssetLocked={validity.sourceAssetLocked}
            />
            <HandoverRiskCard
              initialScore={12}
              onShowToast={({ kind, title, text }) =>
                showToast({ kind, title, text })
              }
            />
            <ButtonComponent
              cssClass="handover-rail-submit"
              onClick={triggerSubmit}
              disabled={isSubmitDisabled}
              isPrimary
              aria-label={submitLabel}
            >
              <span className="handover-rail-submit__label">
                {submitting ? (
                  <Loader2
                    size={14}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="handover-rail-submit__spinner"
                  />
                ) : (
                  <Send
                    size={14}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                )}
                {submitLabel}
              </span>
            </ButtonComponent>
          </aside>
        </div>
      </div>

      <div className="assets-toast-stack">
        <AssetsToast toast={toast} onDismiss={dismissToast} />
      </div>
    </>
  );
};

export default Handover;
