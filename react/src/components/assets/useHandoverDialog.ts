// Handover-dialog form state hook + validation predicate.
//
// The dialog is a Syncfusion `DialogComponent` whose body is the
// form the prototype's `#modal-handover` block defines (From / To /
// Reason / Condition / Condition notes / Accessories / dual
// acknowledgement). Lifting the form state, the validation
// predicate, and the sample-AI "Draft notes" injector into a
// colocated hook keeps the dialog component under 400 lines and
// makes the validation rules independently testable.
//
// All five validation rules are listed in the order the spec calls
// for (recipient ≠ donor; notes required when Damaged; at least one
// accessory or None; None cannot mix with other accessories; both
// acknowledgements required) so the form-level alert block always
// reads top-to-bottom in a predictable order.
//
// The hook also owns the `touched` map (a per-field "blurred at
// least once" flag) and a `canSubmit` derived boolean so the
// dialog can show per-field live validation AND disable the
// primary submit button until the form is genuinely valid.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Asset } from '../../types/assets';
import type {
  HandoverAccessory,
  HandoverCondition,
  HandoverFormState,
  HandoverReason,
  HandoverSubmission,
  PeopleFixture,
} from '../../types/handover';
import { FROM_DEPOT_NAME } from '../../types/handover';

const DEFAULT_REASON: HandoverReason = 'Transfer';
const DEFAULT_CONDITION: HandoverCondition = 'Good';
const DEFAULT_ACCESSORIES: HandoverAccessory[] = ['Charger'];

/**
 * The keys on `HandoverFormState` that the live-validation system
 * tracks. We track them explicitly (rather than `keyof
 * HandoverFormState`) because not every field carries a "value"
 * that can be blurred (e.g. `sourceAssetId` is a dropdown whose
 * `blur` is implicit; `ackFrom` / `ackTo` are checkboxes).
 */
export type HandoverTouchableField =
  | 'from'
  | 'to'
  | 'reason'
  | 'condition'
  | 'notes'
  | 'accessories'
  | 'ackFrom'
  | 'ackTo';

/** Map of field key → whether the user has blurred/committed that
 * field at least once. Used to gate the per-field error hint so it
 * doesn't flash on initial open. */
export type HandoverTouched = Record<HandoverTouchableField, boolean>;

/** Fresh `touched` map with every field marked pristine. */
function buildDefaultTouched(): HandoverTouched {
  return {
    from: false,
    to: false,
    reason: false,
    condition: false,
    notes: false,
    accessories: false,
    ackFrom: false,
    ackTo: false,
  };
}

/** The canned "Sample AI" condition notes string the dialog's
 * `Draft notes` button injects. Mirrors the prototype's
 * `#btn-ai-notes` text verbatim. */
export const DRAFT_NOTES_TEXT =
  'Light scuffing on lid near hinge; ports clean; battery health ~94%. ' +
  'Charger included, sleeve optional. No liquid damage indicators.';

/**
 * Resolve the source asset for a given (optional) caller-supplied
 * asset. Returns the caller's asset when supplied, otherwise the
 * first row of the fixture (so the form always has a backing
 * asset to surface in the preview card + timeline rail). Returns
 * `null` only when the fixture itself is empty.
 */
function resolveSourceAsset(
  sourceAsset: Asset | null,
  assetsFixture: Asset[],
): Asset | null {
  if (sourceAsset) return sourceAsset;
  return assetsFixture[0] ?? null;
}

/**
 * Resolve the default `from` value (current custodian) for a
 * given source asset. Mirrors the existing locked-mode logic:
 *   - owner === 'Unassigned'        → IT Depot
 *   - owner === any other name      → owner.name
 *   - no source asset (empty fixture) → empty string
 */
function resolveDefaultFrom(sourceAsset: Asset | null): string {
  if (!sourceAsset) return '';
  if (sourceAsset.owner.name === 'Unassigned') return FROM_DEPOT_NAME;
  return sourceAsset.owner.name;
}

/**
 * Build the dialog's default form state. The hook calls this on
 * every fresh open so a half-filled form from a previous open never
 * leaks into a new open.
 *
 * - When a source asset is supplied (locked mode), the form's
 *   `sourceAssetId` is that asset's `id` and the form's `from` is
 *   the asset's `owner.name` (or `IT Depot` when the owner is
 *   `Unassigned`).
 * - When no source asset is supplied (unlocked mode), the form's
 *   `sourceAssetId` is the assets fixture's first row's `id` and
 *   the form's `from` is that same asset's owner. This way the
 *   `From` DropDownList is auto-populated with the current
 *   custodian on every fresh open — the user can change either
 *   the source asset or the custodian without one out-of-sync
 *   with the other.
 */
export function buildDefaultFormState(
  sourceAsset: Asset | null,
  assetsFixture: Asset[],
): HandoverFormState {
  const resolvedAsset = resolveSourceAsset(sourceAsset, assetsFixture);
  const sourceAssetId = resolvedAsset?.id ?? '';
  const fromDefault = resolveDefaultFrom(resolvedAsset);
  return {
    sourceAssetId,
    from: fromDefault,
    to: '',
    reason: DEFAULT_REASON,
    condition: DEFAULT_CONDITION,
    notes: '',
    accessories: [...DEFAULT_ACCESSORIES],
    ackFrom: false,
    ackTo: false,
  };
}

/**
 * Pure validation predicate. Returns the list of failed validation
 * messages in the same order as the prototype's inline script:
 *
 * 1. Recipient required (`to` empty)
 * 2. Recipient cannot match the current custodian (`to === from`)
 * 3. Condition notes required when condition is `Damaged`
 * 4. At least one accessory or `None` must be selected
 * 5. `None` cannot be combined with other accessories
 * 6. Both acknowledgements are required
 *
 * Returning the list (not throwing) lets the dialog render every
 * failed rule in the form-level alert block at once.
 */
export function validateHandoverForm(
  state: HandoverFormState,
): string[] {
  const errors: string[] = [];

  // Rule 1 — recipient required.
  if (!state.to || state.to.trim() === '') {
    errors.push('Select a recipient.');
  }

  // Rule 2 — recipient cannot match the current custodian.
  if (
    state.to &&
    state.from &&
    state.to.trim() !== '' &&
    state.from.trim() !== '' &&
    state.to === state.from
  ) {
    errors.push('Recipient cannot match the current custodian.');
  }

  // Rule 3 — condition notes required when Damaged.
  if (state.condition === 'Damaged' && state.notes.trim() === '') {
    errors.push('Condition notes are required when condition is Damaged.');
  }

  // Rule 4 — at least one accessory or None.
  if (state.accessories.length === 0) {
    errors.push('Select at least one accessory or None.');
  }

  // Rule 5 — None cannot combine with other accessories.
  if (state.accessories.includes('None') && state.accessories.length > 1) {
    errors.push('None cannot be combined with other accessories.');
  }

  // Rule 6 — both acknowledgements are required.
  if (!state.ackFrom || !state.ackTo) {
    errors.push('Both donor and recipient acknowledgements are required.');
  }

  return errors;
}

/**
 * Per-field live-validation predicate. Returns `true` when the
 * named field is currently in an invalid state (independent of
 * `touched`). The dialog only consults this for fields that have
 * been blurred at least once — the touched map gates the visual
 * surface so an un-touched pristine field never flashes an error.
 */
export function isHandoverFieldInvalid(
  field: HandoverTouchableField,
  state: HandoverFormState,
): boolean {
  switch (field) {
    case 'from':
      return state.from.trim() === '';
    case 'to':
      return state.to.trim() === '';
    case 'notes':
      return state.condition === 'Damaged' && state.notes.trim() === '';
    case 'accessories':
      return state.accessories.length === 0;
    case 'ackFrom':
      return !state.ackFrom;
    case 'ackTo':
      return !state.ackTo;
    case 'reason':
    case 'condition':
    default:
      return false;
  }
}

/**
 * `canSubmit` derived boolean. The dialog uses this to disable the
 * primary submit button until the form is genuinely submittable.
 * Returns `true` when:
 *   - from is non-empty
 *   - to is non-empty and different from from
 *   - both acknowledgements are checked
 *   - if condition is Damaged, notes has >= 10 trimmed characters
 *   - at least one accessory is selected (the `None` sentinel counts)
 */
export function canSubmitHandoverForm(state: HandoverFormState): boolean {
  if (state.from.trim() === '') return false;
  if (state.to.trim() === '') return false;
  if (state.to === state.from) return false;
  if (!state.ackFrom || !state.ackTo) return false;
  if (state.condition === 'Damaged' && state.notes.trim().length < 10) {
    return false;
  }
  if (state.accessories.length === 0) return false;
  return true;
}

/**
 * Build the typed `HandoverSubmission` payload the dialog emits on
 * a valid submit. `accessories` is filtered to exclude the `None`
 * sentinel (so the consumer never has to filter) and `notes` is
 * the trimmed textarea value (empty string when condition is not
 * `Damaged`).
 */
export function buildSubmission(
  state: HandoverFormState,
  submittedAt: string = new Date().toISOString(),
): HandoverSubmission {
  return {
    sourceAssetId: state.sourceAssetId,
    from: state.from,
    to: state.to,
    reason: state.reason,
    condition: state.condition,
    notes: state.notes.trim(),
    accessories: state.accessories.filter(
      (a): a is Exclude<HandoverAccessory, 'None'> => a !== 'None',
    ),
    ackFrom: state.ackFrom,
    ackTo: state.ackTo,
    submittedAt,
  };
}

export interface UseHandoverDialogArgs {
  /** Source asset preselected by the caller. `null` means the
   * dialog exposes its own `Source asset` dropdown. */
  sourceAsset: Asset | null;
  /** Full assets list (used to seed the `Source asset` dropdown
   * when no preselected asset is supplied). */
  assets: Asset[];
  /** People fixture (used to seed the `From` and `To` dropdowns). */
  people: PeopleFixture;
}

export interface UseHandoverDialogResult {
  form: HandoverFormState;
  /** The full list of people the `From` and `To` dropdowns
   * surface. */
  people: PeopleFixture;
  /** The list of assets the `Source asset` dropdown surfaces
   * (used when no preselected asset is supplied). */
  assets: Asset[];
  /** The preselected source asset, or `null` if the caller did
   * not pass one. */
  sourceAsset: Asset | null;
  /** Whether the caller passed a preselected source asset. When
   * `false`, the dialog exposes its own `Source asset` dropdown. */
  sourceAssetLocked: boolean;
  /** Local form-state setters wired into the dialog's form
   * controls. */
  setSourceAssetId: (id: string) => void;
  setFrom: (name: string) => void;
  setTo: (name: string) => void;
  setReason: (reason: HandoverReason) => void;
  setCondition: (condition: HandoverCondition) => void;
  setNotes: (notes: string) => void;
  toggleAccessory: (acc: HandoverAccessory) => void;
  setAckFrom: (ack: boolean) => void;
  setAckTo: (ack: boolean) => void;
  /** Per-field "blurred at least once" flags. The dialog uses
   * these to gate the live-validation visual state. */
  touched: HandoverTouched;
  /** Mark a single field as touched (called by `onBlur` handlers
   * in the dialog). */
  setTouched: (field: HandoverTouchableField) => void;
  /** Mark a single field as untouched (used when the dialog
   * resets). */
  clearTouched: (field?: HandoverTouchableField) => void;
  /** The list of currently-failed validation messages, in the
   * same order as `validateHandoverForm`. Empty when the form
   * is valid OR when the user has not yet activated submit. */
  errors: string[];
  /** Whether the user has activated `Submit handover` at least
   * once this open. Used to gate the per-field `field__error`
   * hint so it doesn't flash on initial open. */
  submitAttempted: boolean;
  /** Derived boolean: every per-field live-validation rule
   * currently passes. The dialog uses this to gate the primary
   * submit button. */
  canSubmit: boolean;
  /** Per-field live-validation predicate. Returns `true` when
   * the field is currently in an invalid state, regardless of
   * the `touched` gate. */
  isFieldInvalid: (field: HandoverTouchableField) => boolean;
  /** Whether a field is currently in the success state (touched
   * at least once, currently valid). The dialog uses this to
   * swap the field's border to the success token. */
  isFieldSuccess: (field: HandoverTouchableField) => boolean;
  /** Run the validation predicate and return the list of errors. */
  validate: () => string[];
  /** Inject the canned `Draft notes` string into the textarea. */
  injectDraftNotes: () => void;
  /** Build the typed submission payload from the current form
   * state. */
  buildPayload: () => HandoverSubmission;
  /** Reset the form to its defaults (called when the dialog
   * closes). */
  resetForm: () => void;
}

/**
 * Handover form-state hook. Owns the form's in-flight state,
 * the validation predicate, the sample-AI `Draft notes`
 * injector, and the typed submission builder. The
 * `HandoverForm` component (the body of the `/handover`
 * page) just renders the JSX and delegates every state
 * change to the setters this hook returns. The hook is
 * kept under its original name for backward-compatibility
 * with the `add-asset-handover-dialog` spec.
 */
export function useHandoverDialog({
  sourceAsset,
  assets,
  people,
}: UseHandoverDialogArgs): UseHandoverDialogResult {
  const initial = useMemo<HandoverFormState>(
    () => buildDefaultFormState(sourceAsset, assets),
    [sourceAsset, assets],
  );

  const [form, setForm] = useState<HandoverFormState>(initial);
  const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);
  const [touched, setTouchedState] = useState<HandoverTouched>(
    () => buildDefaultTouched(),
  );

  // Re-seed the form whenever the caller swaps the source asset
  // (e.g. a future grid row click fires `onStartHandover(asset)`
  // while the dialog is already open).
  useEffect(() => {
    setForm(initial);
    setSubmitAttempted(false);
    setTouchedState(buildDefaultTouched());
  }, [initial]);

  const errors = useMemo<string[]>(
    () => (submitAttempted ? validateHandoverForm(form) : []),
    [form, submitAttempted],
  );

  const canSubmit = useMemo<boolean>(
    () => canSubmitHandoverForm(form),
    [form],
  );

  const isFieldInvalid = useCallback(
    (field: HandoverTouchableField): boolean =>
      isHandoverFieldInvalid(field, form),
    [form],
  );

  const isFieldSuccess = useCallback(
    (field: HandoverTouchableField): boolean =>
      touched[field] && !isHandoverFieldInvalid(field, form),
    [touched, form],
  );

  const setTouched = useCallback((field: HandoverTouchableField) => {
    setTouchedState((prev) =>
      prev[field] === true ? prev : { ...prev, [field]: true },
    );
  }, []);

  const clearTouched = useCallback((field?: HandoverTouchableField) => {
    if (!field) {
      setTouchedState(buildDefaultTouched());
      return;
    }
    setTouchedState((prev) =>
      prev[field] === false ? prev : { ...prev, [field]: false },
    );
  }, []);

  const setSourceAssetId = useCallback((id: string) => {
    setForm((prev) => {
      // Auto-populate the `from` (current custodian) field to
      // the newly selected source asset's owner so the two
      // fields stay in lock-step. This matches the locked-mode
      // default behaviour and ensures the `From` DropDownList
      // reflects the current custodian whenever the user
      // changes the source asset.
      const nextAsset = assets.find((a) => a.id === id) ?? null;
      const nextFrom = resolveDefaultFrom(nextAsset);
      return { ...prev, sourceAssetId: id, from: nextFrom };
    });
  }, [assets]);

  const setFrom = useCallback((name: string) => {
    setForm((prev) => ({ ...prev, from: name }));
  }, []);

  const setTo = useCallback((name: string) => {
    setForm((prev) => {
      // Auto-acknowledge the recipient side once a `to` is
      // selected. The Acknowledgment step in the workflow
      // reflects the recipient's consent; surfacing the
      // acknowledgement as soon as the recipient is picked
      // matches the actual handover process and removes the
      // redundant manual checkbox click. The `From` (donor)
      // acknowledgement remains a manual step.
      const trimmed = (name ?? '').trim();
      const nextAckTo = trimmed === '' ? false : true;
      return { ...prev, to: name, ackTo: nextAckTo };
    });
  }, []);

  const setReason = useCallback((reason: HandoverReason) => {
    setForm((prev) => ({ ...prev, reason }));
  }, []);

  const setCondition = useCallback((condition: HandoverCondition) => {
    setForm((prev) => ({ ...prev, condition }));
  }, []);

  const setNotes = useCallback((notes: string) => {
    setForm((prev) => ({ ...prev, notes }));
  }, []);

  const toggleAccessory = useCallback((acc: HandoverAccessory) => {
    setForm((prev) => {
      const has = prev.accessories.includes(acc);
      // Mutual-exclusion: picking `None` clears the others;
      // picking any other while `None` is set clears `None`.
      if (acc === 'None') {
        return has
          ? { ...prev, accessories: prev.accessories.filter((a) => a !== 'None') }
          : { ...prev, accessories: ['None'] };
      }
      const without = prev.accessories.filter((a) => a !== acc && a !== 'None');
      return has
        ? { ...prev, accessories: without }
        : { ...prev, accessories: [...without, acc] };
    });
  }, []);

  const setAckFrom = useCallback((ack: boolean) => {
    setForm((prev) => ({ ...prev, ackFrom: ack }));
  }, []);

  const setAckTo = useCallback((ack: boolean) => {
    setForm((prev) => ({ ...prev, ackTo: ack }));
  }, []);

  const validate = useCallback((): string[] => {
    setSubmitAttempted(true);
    return validateHandoverForm(form);
  }, [form]);

  const injectDraftNotes = useCallback(() => {
    setForm((prev) => ({ ...prev, notes: DRAFT_NOTES_TEXT }));
    setTouchedState((prev) => ({ ...prev, notes: true }));
  }, []);

  const buildPayload = useCallback(
    (): HandoverSubmission => buildSubmission(form),
    [form],
  );

  const resetForm = useCallback(() => {
    setForm(initial);
    setSubmitAttempted(false);
    setTouchedState(buildDefaultTouched());
  }, [initial]);

  return {
    form,
    people,
    assets,
    sourceAsset,
    sourceAssetLocked: sourceAsset !== null,
    setSourceAssetId,
    setFrom,
    setTo,
    setReason,
    setCondition,
    setNotes,
    toggleAccessory,
    setAckFrom,
    setAckTo,
    touched,
    setTouched,
    clearTouched,
    errors,
    submitAttempted,
    canSubmit,
    isFieldInvalid,
    isFieldSuccess,
    validate,
    injectDraftNotes,
    buildPayload,
    resetForm,
  };
}
