// Shared shape types for the asset-handover surface. Mirrors the
// `src/data/people.json` fixture and the prototype's
// `#modal-handover` form so the JSON import and the React tree
// agree on the same vocabulary (per the add-asset-handover-dialog
// spec).

/**
 * The four `Reason` values the prototype's `#ho-reason` select
 * surfaces. Stable internal enum so the form / submission /
// validation rules can refer to a closed set of strings.
 */
export type HandoverReason =
  | 'Transfer'
  | 'Onboarding'
  | 'Offboarding'
  | 'Loan';

/** The three `Condition` values the prototype's `#ho-condition` select
 * surfaces. Mirrors the prototype's `Good` / `Fair` / `Damaged`
 * labels verbatim. */
export type HandoverCondition = 'Good' | 'Fair' | 'Damaged';

/** The four `Accessories` checkbox values the prototype's
 * `#ho-acc-*` checkboxes surface. `None` is the sentinel that
 * mutually excludes the other three. */
export type HandoverAccessory = 'Charger' | 'Sleeve' | 'Dongle' | 'None';

/** Ordered list of accessories for the dialog's checkbox rendering. */
export const HANDOVER_ACCESSORIES: readonly HandoverAccessory[] = [
  'Charger',
  'Sleeve',
  'Dongle',
  'None',
] as const;

/** Ordered list of reason enum values. */
export const HANDOVER_REASONS: readonly HandoverReason[] = [
  'Transfer',
  'Onboarding',
  'Offboarding',
  'Loan',
] as const;

/** Ordered list of condition enum values. */
export const HANDOVER_CONDITIONS: readonly HandoverCondition[] = [
  'Good',
  'Fair',
  'Damaged',
] as const;

/** A single entry in the `src/data/people.json` fixture. */
export interface Person {
  id: string;
  name: string;
  role: 'employee' | 'IT admin' | 'IT technician' | 'depot' | 'contractor';
  initials: string;
}

/** Top-level shape of `src/data/people.json`. */
export interface PeopleFixture {
  people: Person[];
}

/**
 * The in-flight form state the dialog owns. The `useHandoverDialog`
 * hook seeds this shape on every fresh open and updates it through
 * the form's change handlers.
 */
export interface HandoverFormState {
  sourceAssetId: string;
  from: string;
  to: string;
  reason: HandoverReason;
  condition: HandoverCondition;
  notes: string;
  accessories: HandoverAccessory[];
  ackFrom: boolean;
  ackTo: boolean;
}

/**
 * The typed payload the dialog's `onSave` callback emits on a
 * successful submit. Stable contract — the spec calls out that
 * additive changes (e.g. `pdfReceiptId`, `signatureImage`) are
 * forward-compatible because the type uses `readonly` arrays and
 * union-string enums.
 *
 * `accessories` excludes `None` (the sentinel cannot be combined
 * with other accessories) so the consumer never has to filter.
 */
export interface HandoverSubmission {
  sourceAssetId: string;
  from: string;
  to: string;
  reason: HandoverReason;
  condition: HandoverCondition;
  notes: string;
  accessories: Exclude<HandoverAccessory, 'None'>[];
  ackFrom: boolean;
  ackTo: boolean;
  /** ISO 8601 timestamp captured at the moment of submit. */
  submittedAt: string;
}

/** The fixture's `from` value when the source asset's owner is
 * `Unassigned` — used so an in-depot asset can be handed out
 * from the depot. */
export const FROM_DEPOT_NAME = 'IT Depot';
