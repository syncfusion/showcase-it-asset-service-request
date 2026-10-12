// Handover form — a presentational three-section enterprise-grade
// form (Asset & custody / Transfer details / Acknowledgment) that
// was previously the body of a Syncfusion `DialogComponent` and is
// now rendered as the body of the dedicated `/handover` page.
//
// The form is split into a small handful of named sub-components
// (defined at module scope so React does not re-mount them on
// every keystroke):
//
//   - `HeaderTemplate`      — two-line title block (kept for
//                             callers that want a custom header).
//   - `AssetPreviewCard`    — locked source asset summary card.
//   - `PersonField`         — From / To dropdown with avatar rows.
//   - `ReasonChips`         — 4-chip toggle group.
//   - `ConditionCards`      — 3-card radio group with coloured
//                             selected state.
//   - `AccessoryChips`      — 4-chip toggle group.
//   - `NotesField`          — TextArea + char counter + AI link.
//   - `AgreementCard`       — clickable label + hidden checkbox.
//   - `FormAlert`           — form-level validation summary.
//
// All form state, validation, draft-notes injection, and typed
// payload building live in the colocated `useHandoverDialog` hook
// (kept under that name for backward-compatibility with the spec
// — it backs a form, not a dialog, but the verb is still
// semantically "the handover dialog's hook"). This component is
// purely presentational — it renders the form controls, wires
// their change events to the hook's setters, and renders the
// alert / per-field error hint based on the hook's `errors`,
// `touched`, `canSubmit`, and `isFieldInvalid` / `isFieldSuccess`
// outputs.
//
// The owning page (see `src/pages/Handover.tsx`) is responsible
// for the surrounding page chrome (header, breadcrumbs, sticky
// action bar with the three primary CTAs).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FC, ReactElement } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import type {
  ChangeEventArgs as DropdownChange,
} from '@syncfusion/ej2-dropdowns';
import {
  DropDownListComponent,
} from '@syncfusion/ej2-react-dropdowns';
import {
  TextAreaComponent,
} from '@syncfusion/ej2-react-inputs';
import { CheckBoxComponent } from '@syncfusion/ej2-react-buttons';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Mail,
  Sparkles,
} from 'lucide-react';
import type {
  HandoverAccessory,
  HandoverCondition,
  HandoverReason,
  HandoverSubmission,
  PeopleFixture,
  Person,
} from '../../types/handover';
import {
  HANDOVER_ACCESSORIES,
  HANDOVER_CONDITIONS,
  HANDOVER_REASONS,
} from '../../types/handover';
import type { Asset } from '../../types/assets';
import {
  useHandoverDialog,
} from './useHandoverDialog';
import './handover.css';

export interface HandoverFormProps {
  /**
   * Source asset preselected by the caller. `null` means the form
   * exposes its own `Source asset` dropdown so the user can pick
   * the asset being handed over.
   */
  sourceAsset: Asset | null;
  /** Full assets list (used to seed the `Source asset` dropdown
   * when no preselected asset is supplied). */
  assets: Asset[];
  /** People fixture (used to seed the `From` and `To` dropdowns). */
  people: PeopleFixture;
  /** Called when the user activates `Submit handover` with a
   * valid form. Receives the typed `HandoverSubmission`
   * payload. */
  onSubmit: (submission: HandoverSubmission) => void;
  /** Called when the user activates the `Draft notes` button so
   * the page can surface a confirmation toast. */
  onDraftNotes?: () => void;
  /**
   * Optional progress callback. Fired whenever any of the
   * values the right-rail checklist / stepper track change
   * (form state, touched map, validity). The owning page can
   * use this to power a stepper progress rail and a
   * live-validation checklist without lifting the form's
   * internal state out of the hook. The callback is throttled
   * via `useEffect` so it never fires during a single commit
   * cycle. Adding this prop is fully backward-compatible —
   * any existing caller that omits `onValidityChange` keeps
   * working unchanged. */
  onValidityChange?: (state: HandoverFormValidity) => void;
}

/** The shape the right rail subscribes to. The right rail
 * never re-derives validity itself — it consumes this
 * pre-computed snapshot so the validation rules stay
 * co-located with `useHandoverDialog`. */
export interface HandoverFormValidity {
  /** Mirrors the hook's `canSubmit` — `true` when every
   *  per-field rule currently passes. */
  isValid: boolean;
  /** Number of completed sections (0..3). Mirrors the
   *  SectionCard's `isComplete` definitions: section 1 needs
   *  an asset + From + To; section 2 needs Reason + Condition
   *  + (Notes when Damaged) + Accessories; section 3 needs
   *  both acknowledgements. */
  completedSteps: number;
  /** Per-section completion flags, indexed by section id. */
  sections: {
    custody: boolean;
    transfer: boolean;
    acknowledgment: boolean;
  };
  /**
   * Per-side acknowledgement completion. The recipient
   * (`ackTo`) is auto-acknowledged the moment a `to` value
   * is selected; the donor (`ackFrom`) is still a manual
   * checkbox. The right-rail checklist and the
   * donor-side row of the form subscribe to these so the
   * visual state stays in lock-step with the underlying
   * form state. */
  acknowledgment: {
    from: boolean;
    to: boolean;
  };
  /** Number of currently-failed form-level rules. */
  errorCount: number;
  /** Currently-failed form-level rules (used by the alert). */
  errors: string[];
  /** The form's current `sourceAssetId` so the rail can
   *  highlight "asset selected" without a second source of
   *  truth. */
  sourceAssetId: string;
  /** Whether the source asset is locked (caller passed a
   *  preselected asset) or whether the user is still picking
   *  one. */
  sourceAssetLocked: boolean;
}

const FROM_DDL_ID = 'handover-form-from';
const TO_DDL_ID = 'handover-form-to';
const SOURCE_DDL_ID = 'handover-form-source';
const NOTES_INPUT_ID = 'handover-form-notes';
const NOTES_MAX_LENGTH = 500;
const NOTES_WARN_LENGTH = 450;
const NOTES_HINT_ID = `${NOTES_INPUT_ID}-hint`;

/** Role label shown under each person row. */
const ROLE_LABEL: Record<Person['role'], string> = {
  'IT admin': 'IT Admin',
  'IT technician': 'IT Technician',
  employee: 'Employee',
  depot: 'IT Depot',
  contractor: 'Contractor',
};

/** CSS-variable-based avatar palette per person. The hooks
 *  return a tuple `[bg-var, fg-var]` and the item template
 *  composes a CSS class from it. Stable per id so the same
 *  person always shows in the same color. */
const AVATAR_PALETTE: ReadonlyArray<[string, string]> = [
  ['var(--color-sf-bg-avatar-blue)', 'var(--color-sf-fg-avatar-blue)'],
  ['var(--color-sf-bg-avatar-violet)', 'var(--color-sf-fg-avatar-violet)'],
  ['var(--color-sf-bg-avatar-amber)', 'var(--color-sf-fg-avatar-amber)'],
  ['var(--color-sf-bg-avatar-green)', 'var(--color-sf-fg-avatar-green)'],
  ['var(--color-sf-bg-avatar-cyan)', 'var(--color-sf-fg-avatar-cyan)'],
  ['var(--color-sf-bg-avatar-slate)', 'var(--color-sf-fg-avatar-slate)'],
];

function avatarPaletteFor(id: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  const [bg, fg] = AVATAR_PALETTE[index];
  return { bg, fg };
}

/** Shape Syncfusion's `DropDownListComponent` `dataSource`
 *  expects. We use `id` for the option value, `label` for the
 *  display text, `subLabel` for the role line, and `avatarColor`
 *  to seed the avatar background. Mirrors the same convention
 *  the `NewRequestDialog` uses. */
interface DdlRow {
  id: string;
  label: string;
  subLabel: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
}

/** Reason-group condition copy (one-line description per chip). */
const REASON_DESCRIPTION: Record<HandoverReason, string> = {
  Transfer: 'Move to another team or location',
  Onboarding: 'New hire setup',
  Offboarding: 'Return on exit',
  Loan: 'Short-term external use',
};

/** Condition-card one-line description per option. */
const CONDITION_DESCRIPTION: Record<HandoverCondition, string> = {
  Good: 'No defects, ready to redeploy',
  Fair: 'Minor wear, fully functional',
  Damaged: 'Needs repair before next use',
};

/** Condition CSS-class suffix per option. */
const CONDITION_CLASS: Record<HandoverCondition, string> = {
  Good: 'good',
  Fair: 'fair',
  Damaged: 'damaged',
};

/* ===========================================================================
 *  Sub-component: HeaderTemplate
 *  Renders the two-row block at the top of the form:
 *    Row 1: "Asset handover" title.
 *    Row 2: subtitle (asset id · title) when locked, otherwise
 *           a muted hint.
 * ========================================================================= */
interface HeaderTemplateProps {
  sourceAssetLocked: boolean;
  lockedAsset: Asset | null;
}

const HeaderTemplate: FC<HeaderTemplateProps> = ({
  sourceAssetLocked,
  lockedAsset,
}) => {
  return (
    <div className="handover-dialog__header">
      <div className="handover-dialog__header-title">Asset handover</div>
      <div className="handover-dialog__header-subtitle">
        {sourceAssetLocked && lockedAsset
          ? `${lockedAsset.id} · ${lockedAsset.title}`
          : 'Select the asset to hand over'}
      </div>
    </div>
  );
};

/* ===========================================================================
 *  Sub-component: AssetPreviewCard
 *  Renders the locked source asset summary card (only when the
 *  caller passed a preselected asset). Shows a 48x48 gradient
 *  placeholder, asset id chip, title, type+status row, and a
 *  "View asset" link-style button.
 * ========================================================================= */
interface AssetPreviewCardProps {
  asset: Asset;
}

const AssetPreviewCard: FC<AssetPreviewCardProps> = ({ asset }) => {
  return (
    <div
      className="handover-dialog__asset-card"
      role="group"
      aria-label={`Source asset ${asset.id}`}
    >
      <div className="handover-dialog__asset-card__art" aria-hidden="true">
        <span className="handover-dialog__asset-card__art-initials">
          {asset.owner.initials || '·'}
        </span>
      </div>
      <div className="handover-dialog__asset-card__body">
        <div className="handover-dialog__asset-card__row">
          <span className="handover-dialog__asset-card__id">{asset.id}</span>
          <span className="handover-dialog__asset-card__title">
            {asset.title}
          </span>
        </div>
        <div className="handover-dialog__asset-card__meta">
          <span>{asset.type}</span>
          <span className="handover-dialog__asset-card__meta-sep" aria-hidden="true">
            ·
          </span>
          <span>{asset.status}</span>
          <span className="handover-dialog__asset-card__meta-sep" aria-hidden="true">
            ·
          </span>
          <span>{asset.location}</span>
        </div>
      </div>
      <button
        type="button"
        className="handover-dialog__asset-card__view"
        aria-label={`View asset ${asset.id}`}
        title="View asset (placeholder)"
        tabIndex={-1}
      >
        View asset
        <ChevronRight
          size={14}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </button>
    </div>
  );
};

/* ===========================================================================
 *  Sub-component: PersonField
 *  From / To dropdown with a custom item template (avatar +
 *  name + role). The empty / placeholder state shows a muted
 *  "Select current custodian" / "Select recipient…" string.
 * ========================================================================= */
interface PersonFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  people: Person[];
  required: boolean;
  invalid: boolean;
  success: boolean;
  describedBy?: string;
  includeEmptyOption?: boolean;
  emptyLabel?: string;
  invalidHint?: string;
}

const PersonField: FC<PersonFieldProps> = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  people,
  required,
  invalid,
  success,
  describedBy,
  includeEmptyOption,
  emptyLabel,
  invalidHint,
}) => {
  // Stable item template — declared at module scope via the
  // factory below so React does not re-mount on every keystroke.
  const dataSource = useMemo<DdlRow[]>(() => {
    const rows: DdlRow[] = people.map((p) => {
      const palette = avatarPaletteFor(p.id);
      return {
        id: p.name,
        label: p.name,
        subLabel: ROLE_LABEL[p.role] ?? p.role,
        initials: p.initials,
        avatarBg: palette.bg,
        avatarFg: palette.fg,
      };
    });
    if (includeEmptyOption && emptyLabel) {
      return [
        {
          id: '',
          label: emptyLabel,
          subLabel: 'No recipient selected',
          initials: '–',
          avatarBg: 'var(--color-sf-bg-avatar-slate)',
          avatarFg: 'var(--color-sf-fg-avatar-slate)',
        },
        ...rows,
      ];
    }
    return rows;
  }, [people, includeEmptyOption, emptyLabel]);

  const stateClass = invalid
    ? ' is-invalid'
    : success
      ? ' is-success'
      : '';

  const handleChange = (args: DropdownChange): void => {
    const next = args.value;
    onChange(next === null || next === undefined ? '' : String(next));
  };

  return (
    <div
      className={`handover-dialog__field handover-dialog__person-field${stateClass}`}
    >
      <label
        className="handover-dialog__label"
        htmlFor={id}
        data-required={required ? 'true' : undefined}
        data-invalid={invalid ? 'true' : undefined}
        data-success={success ? 'true' : undefined}
      >
        <span>{label}</span>
        {required ? (
          <span className="handover-dialog__required" aria-hidden="true">
            *
          </span>
        ) : null}
        {invalid ? (
          <span
            className="handover-dialog__field-dot"
            aria-hidden="true"
            data-state="error"
          />
        ) : success ? (
          <Check
            className="handover-dialog__field-check"
            size={14}
            strokeWidth={2}
            aria-hidden="true"
          />
        ) : null}
      </label>
      <DropDownListComponent
        id={id}
        cssClass="handover-dialog__input"
        dataSource={
          dataSource as unknown as { [key: string]: object }[]
        }
        fields={{ text: 'label', value: 'id' }}
        value={value}
        change={handleChange}
        blur={onBlur}
        placeholder={placeholder}
        allowFiltering
        itemTemplate={renderPersonItem}
        // valueTemplate={renderPersonValue}
        floatLabelType="Never"
      />
      {invalid && invalidHint ? (
        <span
          className="handover-dialog__field-hint"
          data-state="error"
          id={`${id}-hint`}
        >
          {invalidHint}
        </span>
      ) : null}
      {!invalid && describedBy ? (
        <span
          className="handover-dialog__field-hint"
          id={describedBy}
        >
          {describedBy === `${id}-help`
            ? 'Recipient must be an active employee in the directory.'
            : ''}
        </span>
      ) : null}
    </div>
  );
};

/* Item / value templates for the person dropdown. Declared as
 *  module-scope functions so React re-uses the same DOM nodes
 *  across renders. */
function renderPersonItem(args: { [k: string]: unknown }): ReactElement {
  const row = args as unknown as DdlRow;
  if (!row || !row.id) {
    return (
      <span className="handover-dialog__person-item is-empty">
        <span
          className="handover-dialog__person-avatar"
          style={{ background: row?.avatarBg, color: row?.avatarFg }}
          aria-hidden="true"
        >
          {/* Wrap the text in a span so the avatar becomes a real
              flex item — a bare text node in a flex container is
              not centered reliably by `justify-content: center`. */}
          <span className="handover-dialog__person-avatar-text">
            {row?.initials ?? '–'}
          </span>
        </span>
        <span className="handover-dialog__person-text">
          <span className="handover-dialog__person-name is-muted">
            {row?.label ?? ''}
          </span>
          <span className="handover-dialog__person-role is-muted">
            {row?.subLabel ?? ''}
          </span>
        </span>
      </span>
    );
  }
  return (
    <span className="handover-dialog__person-item">
      <span
        className="handover-dialog__person-avatar"
        style={{ background: row.avatarBg, color: row.avatarFg }}
        aria-hidden="true"
      >
        <span className="handover-dialog__person-avatar-text">
          {row.initials}
        </span>
      </span>
      <span className="handover-dialog__person-text">
        <span className="handover-dialog__person-name">{row.label}</span>
        <span className="handover-dialog__person-role">{row.subLabel}</span>
      </span>
    </span>
  );
}

/**
 * Value template — rendered inside the dropdown's input control
 * (i.e. the compact single-line display shown once a person is
 * selected). Reuses the same avatar chip as the popup row but
 * drops the role line + the wider item padding so the layout
 * fits the input's fixed height without re-purposing the popup
 * row's vertical rhythm (which is taller and includes the
 * `person-item` `padding: 4px 6px`).
 */
function renderPersonValue(args: { [k: string]: unknown }): ReactElement {
  const row = args as unknown as DdlRow;
  if (!row || !row.id) {
    return <span className="handover-dialog__person-value is-empty" />;
  }
  return (
    <span className="handover-dialog__person-value">
      <span
        className="handover-dialog__person-avatar"
        style={{ background: row.avatarBg, color: row.avatarFg }}
        aria-hidden="true"
      >
        <span className="handover-dialog__person-avatar-text">
          {row.initials}
        </span>
      </span>
      <span className="handover-dialog__person-value-name">{row.label}</span>
    </span>
  );
}

/* ===========================================================================
 *  Sub-component: ReasonChips
 *  4-chip toggle group. Selected chip has primary border +
 *  filled background; unselected chip uses `e-outline` style.
 * ========================================================================= */
interface ReasonChipsProps {
  value: HandoverReason;
  onChange: (value: HandoverReason) => void;
}

const ReasonChips: FC<ReasonChipsProps> = ({ value, onChange }) => {
  return (
    <div
      className="handover-dialog__chips"
      role="radiogroup"
      aria-label="Handover reason"
    >
      {HANDOVER_REASONS.map((r) => {
        const selected = value === r;
        return (
          <ButtonComponent
            key={r}
            type="button"
            aria-checked={selected}
            cssClass={`handover-dialog__chip${selected ? ' is-selected' : ''}`}
            content={r}
            title={REASON_DESCRIPTION[r]}
            onClick={() => onChange(r)}
          />
        );
      })}
    </div>
  );
};

/* ===========================================================================
 *  Sub-component: ConditionCards
 *  3-card radio group. Each card is a clickable <label> wrapping
 *  a hidden radio + visual content (icon + label + description).
 *  Selected card has a 2px solid border in the matching token.
 * ========================================================================= */
interface ConditionCardsProps {
  value: HandoverCondition;
  onChange: (value: HandoverCondition) => void;
  onBlur: () => void;
}

const ConditionCards: FC<ConditionCardsProps> = ({
  value,
  onChange,
  onBlur,
}) => {
  return (
    <div
      className="handover-dialog__conditions"
      role="radiogroup"
      aria-label="Asset condition"
      onBlur={onBlur}
    >
      {HANDOVER_CONDITIONS.map((c) => {
        const selected = value === c;
        const stateClass = ` handover-dialog__condition--${CONDITION_CLASS[c]}`;
        const selectedClass = selected
          ? ' is-selected'
          : '';
        return (
          <label
            key={c}
            className={`handover-dialog__condition${stateClass}${selectedClass}`}
            data-selected={selected ? 'true' : 'false'}
          >
            <input
              type="radio"
              name="handover-condition"
              value={c}
              checked={selected}
              onChange={() => onChange(c)}
              className="handover-dialog__condition-input"
            />
            <span
              className="handover-dialog__condition-icon"
              aria-hidden="true"
              data-state={CONDITION_CLASS[c]}
            >
              {c === 'Good' ? (
                <Check size={20} strokeWidth={2.5} />
              ) : c === 'Fair' ? (
                <span className="handover-dialog__condition-dot" />
              ) : (
                <AlertTriangle size={20} strokeWidth={2.5} />
              )}
            </span>
            <span className="handover-dialog__condition-text">
              <span className="handover-dialog__condition-label">{c}</span>
              <span className="handover-dialog__condition-desc">
                {CONDITION_DESCRIPTION[c]}
              </span>
            </span>
            {selected ? (
              <span
                className="handover-dialog__condition-check"
                aria-hidden="true"
              >
                <Check size={12} strokeWidth={3} />
              </span>
            ) : null}
          </label>
        );
      })}
    </div>
  );
};

/* ===========================================================================
 *  Sub-component: AccessoryChips
 *  4-chip toggle group. Selected chip uses secondary-token
 *  background; unselected chip uses outline. Reuses the
 *  existing `HANDOVER_ACCESSORIES` enum.
 * ========================================================================= */
interface AccessoryChipsProps {
  value: HandoverAccessory[];
  onToggle: (acc: HandoverAccessory) => void;
  onBlur: () => void;
}

const AccessoryChips: FC<AccessoryChipsProps> = ({
  value,
  onToggle,
  onBlur,
}) => {
  return (
    <div
      className="handover-dialog__chips handover-dialog__chips--accessories"
      role="group"
      aria-label="Accessories included with this handover"
      onBlur={onBlur}
    >
      {HANDOVER_ACCESSORIES.map((acc) => {
        const selected = value.includes(acc);
        return (
          <ButtonComponent
            key={acc}
            type="button"
            aria-pressed={selected}
            cssClass={`handover-dialog__chip handover-dialog__chip--accessory${selected ? ' is-selected' : ''}`}
            content={acc}
            onClick={() => onToggle(acc)}
          />
        );
      })}
    </div>
  );
};

/* ===========================================================================
 *  Sub-component: NotesField
 *  TextArea + character counter + Sample AI inline link. Shows
 *  the per-field "Required when condition is Damaged" warning
 *  when condition is Damaged AND notes is empty (replaces the
 *  old `showNotesHint`).
 * ========================================================================= */
interface NotesFieldProps {
  value: string;
  condition: HandoverCondition;
  onChange: (value: string) => void;
  onBlur: () => void;
  onDraft: () => void;
  errored: boolean;
  /** When the field is in the "live error" state (touched AND
   *  currently empty while condition is Damaged). */
  liveInvalid: boolean;
  /** When the field is in the "live success" state. */
  liveSuccess: boolean;
}

const NotesField: FC<NotesFieldProps> = ({
  value,
  condition,
  onChange,
  onBlur,
  onDraft,
  errored,
  liveInvalid,
  liveSuccess,
}) => {
  const count = value.length;
  const isOverWarn = count > NOTES_WARN_LENGTH;
  const isOverMax = count > NOTES_MAX_LENGTH;
  const counterClass = isOverMax
    ? ' is-danger'
    : isOverWarn
      ? ' is-warning'
      : '';

  const stateClass = liveInvalid
    ? ' is-invalid'
    : liveSuccess
      ? ' is-success'
      : '';

  const handleChange = (args: { value: string | null }): void => {
    onChange(args.value ?? '');
  };

  // The "Required when Damaged" inline hint fires only when
  // (a) the user has activated submit at least once (via the
  //     `errored` prop), OR
  // (b) the field is in the live-error state.
  const showHint = condition === 'Damaged' && (errored || liveInvalid);

  return (
    <div
      className={`handover-dialog__field handover-dialog__notes-field${stateClass}`}
    >
      <label
        className="handover-dialog__label"
        htmlFor={NOTES_INPUT_ID}
        data-invalid={liveInvalid ? 'true' : undefined}
        data-success={liveSuccess ? 'true' : undefined}
      >
        <span>Condition notes</span>
        {liveInvalid ? (
          <span
            className="handover-dialog__field-dot"
            aria-hidden="true"
            data-state="error"
          />
        ) : liveSuccess ? (
          <Check
            className="handover-dialog__field-check"
            size={14}
            strokeWidth={2}
            aria-hidden="true"
          />
        ) : null}
      </label>
      <TextAreaComponent
        id={NOTES_INPUT_ID}
        cssClass="handover-dialog__input handover-dialog__textarea"
        value={value}
        change={handleChange}
        blur={onBlur}
        placeholder="Describe wear, damage, or outstanding issues…"
        rows={3}
        floatLabelType="Never"
        aria-describedby={showHint ? NOTES_HINT_ID : undefined}
        aria-invalid={liveInvalid ? 'true' : 'false'}
        maxLength={NOTES_MAX_LENGTH + 50}
      />
      <div className="handover-dialog__notes-footer">
        <div className="handover-dialog__notes-footer-left">
          {showHint ? (
            <span
              className="handover-dialog__field-hint"
              data-state="error"
              id={NOTES_HINT_ID}
              aria-live="polite"
            >
              Required when condition is Damaged.
            </span>
          ) : null}
        </div>
        <div className="handover-dialog__notes-footer-right">
          <button
            type="button"
            className="handover-dialog__ai-link"
            onClick={onDraft}
            aria-label="Draft condition notes with Sample AI"
            title="Sample AI draft"
          >
            <Sparkles
              size={12}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            Draft with Sample AI
          </button>
          <span
            className={`handover-dialog__char-counter${counterClass}`}
            aria-live="polite"
            aria-label={`${count} of ${NOTES_MAX_LENGTH} characters used`}
          >
            {count} / {NOTES_MAX_LENGTH}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ===========================================================================
 *  Sub-component: AgreementCard
 *  Clickable <label> wrapping a hidden checkbox + heading +
 *  body. Unchecked cards have a 1px token-divider border;
 *  checked cards get a 2px primary border and a check badge.
 *  The underlying Syncfusion `CheckBoxComponent` is what carries
 *  the form value.
 * ========================================================================= */
interface AcknowledgementRowProps {
  person: Person | null;
  kind: 'from' | 'to';
  checked: boolean;
  onChange: (checked: boolean) => void;
  onBlur: () => void;
  invalid: boolean;
  success: boolean;
}

/** Avatar + name + role for the acknowledgement row. */
function AcknowledgementPerson({
  person,
  checked,
}: {
  person: Person | null;
  checked: boolean;
}): ReactElement {
  if (!person) {
    return (
      <span className="handover-dialog__ack-person is-empty">
        <span className="handover-dialog__ack-person-avatar is-empty" aria-hidden="true">
          <span className="handover-dialog__ack-person-avatar-text">–</span>
        </span>
        <span className="handover-dialog__ack-person-text">
          <span className="handover-dialog__ack-person-placeholder">
            Select {checked ? 'a' : 'the'} person above
          </span>
        </span>
      </span>
    );
  }
  const { bg, fg } = avatarPaletteFor(person.id);
  return (
    <span className="handover-dialog__ack-person">
      <span
        className="handover-dialog__ack-person-avatar"
        style={{ background: bg, color: fg }}
        aria-hidden="true"
      >
        <span className="handover-dialog__ack-person-avatar-text">
          {person.initials}
        </span>
      </span>
      <span className="handover-dialog__ack-person-text">
        <span className="handover-dialog__ack-person-name">{person.name}</span>
        <span className="handover-dialog__ack-person-role">
          {ROLE_LABEL[person.role] ?? person.role}
        </span>
      </span>
    </span>
  );
}

const AcknowledgementRow: FC<AcknowledgementRowProps> = ({
  person,
  kind,
  checked,
  onChange,
  onBlur,
  invalid,
  success,
}) => {
  const stateClass = invalid
    ? ' is-invalid'
    : success
      ? ' is-success'
      : '';
  const labelText = kind === 'from' ? 'From' : 'To';
  const inputId = `handover-ack-${kind}`;

  return (
    <label
      className={`handover-dialog__ack-row${stateClass}`}
      data-checked={checked ? 'true' : 'false'}
      htmlFor={inputId}
    >
      <span className="handover-dialog__ack-main">
        <AcknowledgementPerson person={person} checked={checked} />
        <span className="handover-dialog__ack-status">
          {checked ? (
            <>
              <span
                className="handover-dialog__ack-status-icon"
                aria-hidden="true"
              >
                <Check size={12} strokeWidth={3} />
              </span>
              <span className="handover-dialog__ack-status-text">
                Notification sent
              </span>
            </>
          ) : (
            <>
              <span
                className="handover-dialog__ack-status-icon is-muted"
                aria-hidden="true"
              >
                <Mail size={12} strokeWidth={2} />
              </span>
              <span className="handover-dialog__ack-status-text is-muted">
                Awaiting acknowledgement
              </span>
            </>
          )}
        </span>
      </span>
      <span className="handover-dialog__ack-action" aria-hidden="true">
        <CheckBoxComponent
          cssClass="handover-dialog__ack-input"
          checked={checked}
          change={(args: { checked?: boolean }) => {
            onChange(Boolean(args.checked));
            onBlur();
          }}
        />
      </span>
    </label>
  );
};

/* ===========================================================================
 *  Sub-component: FormAlert
 *  Form-level validation summary. Redesigned: danger-token
 *  background + text + 4px left border, `AlertTriangle` icon,
 *  bullet list of errors, "Dismiss" link in the top-right.
 *  Dismissing the alert visually only — the underlying error
 *  state is owned by the hook and re-shows on the next submit.
 * ========================================================================= */
interface FormAlertProps {
  errors: string[];
  onDismiss: () => void;
}

const FormAlert: FC<FormAlertProps> = ({ errors, onDismiss }) => {
  if (errors.length === 0) return null;
  return (
    <div
      className="handover-dialog__alert"
      role="alert"
      aria-live="assertive"
    >
      <span className="handover-dialog__alert-icon" aria-hidden="true">
        <AlertTriangle size={18} strokeWidth={1.75} />
      </span>
      <div className="handover-dialog__alert-body">
        <div className="handover-dialog__alert-row">
          <strong>Fix validation issues</strong>
          <button
            type="button"
            className="handover-dialog__alert-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss alert"
          >
            Dismiss
          </button>
        </div>
        <ul className="handover-dialog__alert-list">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/* ===========================================================================
 *  Main component: HandoverForm
 *  Composes the sub-components above into a single
 *  scrollable form. Owns the form-level alert dismiss state
 *  and the submit handler. The owning page (see
 *  `src/pages/Handover.tsx`) is responsible for the page-level
 *  chrome (header, breadcrumbs, sticky action bar).
 * ========================================================================= */
const HandoverForm: FC<HandoverFormProps> = ({
  sourceAsset,
  assets,
  people,
  onSubmit,
  onDraftNotes,
  onValidityChange,
}) => {
  const hook = useHandoverDialog({ sourceAsset, assets, people });
  const {
    form,
    people: peopleFixture,
    assets: assetsFixture,
    sourceAsset: lockedAsset,
    sourceAssetLocked,
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
    errors,
    submitAttempted,
    canSubmit,
    isFieldInvalid,
    isFieldSuccess,
    validate,
    injectDraftNotes,
    buildPayload,
  } = hook;

  // DOM ref used to scope the submit-bridge query when the
  // page's keyboard shortcut fires; avoids clicking a stale
  // bridge if multiple handover forms are ever mounted.
  const formRef = useRef<HTMLDivElement>(null);

  // Track whether the form-level alert has been visually
  // dismissed by the user. Reset every time the page is opened
  // / re-mounted (the hook resets form state on `sourceAsset`
  // change, so the alert follows that lifecycle).
  const [alertDismissed, setAlertDismissed] = useState<boolean>(false);
  useEffect(() => {
    setAlertDismissed(false);
  }, [sourceAsset?.id]);

  // Validity snapshot — emitted to the page (when the optional
  // `onValidityChange` callback is supplied) so the right-rail
  // checklist + stepper progress rail can subscribe without
  // re-deriving the rules. We compute the snapshot here (in
  // the same component that owns the hook) and use a single
  // `useEffect` to publish it. The effect intentionally only
  // depends on the values that actually affect the snapshot,
  // so a single commit cycle triggers at most one downstream
  // re-render.
  const validity = useMemo<HandoverFormValidity>(() => {
    const custody =
      sourceAssetLocked &&
      form.from.trim() !== '' &&
      form.to.trim() !== '' &&
      form.to !== form.from;
    const transfer =
      form.reason !== undefined &&
      form.condition !== undefined &&
      form.accessories.length > 0 &&
      !(form.accessories.includes('None') && form.accessories.length > 1) &&
      !(form.condition === 'Damaged' && form.notes.trim() === '');
    // Per-side acknowledgement. The recipient (`to`) is
    // auto-acknowledged the moment a value is picked (see
    // `useHandoverDialog`'s `setTo`); the donor (`from`)
    // is still a manual checkbox. The composite
    // `acknowledgment` flag is the AND of both so the
    // stepper's third step still reads as "in progress"
    // until the donor has confirmed.
    const ackFrom = form.ackFrom;
    const ackTo = form.to.trim() !== '' ? true : form.ackTo;
    const acknowledgment = ackFrom && ackTo;
    const completedSteps =
      (custody ? 1 : 0) + (transfer ? 1 : 0) + (acknowledgment ? 1 : 0);
    return {
      isValid: canSubmit && errors.length === 0,
      completedSteps,
      sections: { custody, transfer, acknowledgment },
      acknowledgment: { from: ackFrom, to: ackTo },
      errorCount: errors.length,
      errors,
      sourceAssetId: form.sourceAssetId,
      sourceAssetLocked,
    };
  }, [
    form.from,
    form.to,
    form.reason,
    form.condition,
    form.notes,
    form.accessories,
    form.ackFrom,
    form.ackTo,
    form.sourceAssetId,
    sourceAssetLocked,
    canSubmit,
    errors,
  ]);

  useEffect(() => {
    if (typeof onValidityChange === 'function') {
      onValidityChange(validity);
    }
  }, [validity, onValidityChange]);

  // Pre-compute the asset preview card metadata even when the
  // source asset is unlocked so the form never causes a layout
  // shift between source-asset selections.
  const previewAsset = useMemo<Asset | null>(() => {
    if (sourceAssetLocked && lockedAsset) return lockedAsset;
    if (assetsFixture.length === 0) return null;
    return (
      assetsFixture.find((a) => a.id === form.sourceAssetId) ??
      assetsFixture[0]
    );
  }, [sourceAssetLocked, lockedAsset, assetsFixture, form.sourceAssetId]);

  const handleReasonChange = (value: HandoverReason): void => {
    setReason(value);
    setTouched('reason');
  };

  const handleConditionChange = (value: HandoverCondition): void => {
    setCondition(value);
    setTouched('condition');
  };

  const handleSourceAssetChange = (args: DropdownChange): void => {
    const value = String(args.value ?? '');
    setSourceAssetId(value);
  };

  const handleNotesChange = (args: { value: string | null }): void => {
    setNotes(args.value ?? '');
  };

  const handleAccessoryToggle = (acc: HandoverAccessory) => (): void => {
    toggleAccessory(acc);
    setTouched('accessories');
  };

  const handleAckFromChange = (checked: boolean): void => {
    setAckFrom(checked);
    setTouched('ackFrom');
  };

  const handleAckToChange = (checked: boolean): void => {
    setAckTo(checked);
    setTouched('ackTo');
  };

  const handleDraftNotes = (): void => {
    injectDraftNotes();
    if (typeof onDraftNotes === 'function') {
      onDraftNotes();
    }
  };

  /**
   * Page-level submit handler. Runs the validation predicate;
   * if any rule fails, surfaces the form-level alert and
   * returns. Otherwise, emits the typed payload to the page.
   * The page owns the toast + post-submit navigation.
   */
  const handleSubmit = (): void => {
    const errs = validate();
    if (errs.length > 0) {
      setAlertDismissed(false);
      return;
    }
    if (!canSubmit) {
      // canSubmit may be false even after a clean validation
      // pass (e.g. notes < 10 chars when Damaged). Bail out so
      // we never emit a partially valid payload.
      setAlertDismissed(false);
      return;
    }
    onSubmit(buildPayload());
  };

  // Map selected From / To names back to full Person rows for the
  // acknowledgement section (avatar, role, initials).
  const selectedFromPerson = useMemo<Person | null>(
    () => peopleFixture.people.find((p) => p.name === form.from) ?? null,
    [peopleFixture.people, form.from],
  );
  const selectedToPerson = useMemo<Person | null>(
    () => peopleFixture.people.find((p) => p.name === form.to) ?? null,
    [peopleFixture.people, form.to],
  );

  // From / To / Source-asset dropdown data sources.
  const fromDataSource: DdlRow[] = peopleFixture.people.map((p) => {
    const palette = avatarPaletteFor(p.id);
    return {
      id: p.name,
      label: p.name,
      subLabel: ROLE_LABEL[p.role] ?? p.role,
      initials: p.initials,
      avatarBg: palette.bg,
      avatarFg: palette.fg,
    };
  });
  const toDataSource: DdlRow[] = [
    {
      id: '',
      label: 'Select recipient…',
      subLabel: 'No recipient selected',
      initials: '–',
      avatarBg: 'var(--color-sf-bg-avatar-slate)',
      avatarFg: 'var(--color-sf-fg-avatar-slate)',
    },
    ...fromDataSource,
  ];
  const sourceAssetDataSource: DdlRow[] = assetsFixture.map((a) => ({
    id: a.id,
    label: `${a.id} · ${a.title}`,
    subLabel: `${a.type} · ${a.status}`,
    initials: a.owner.initials || '·',
    avatarBg: 'var(--color-sf-bg-avatar-blue)',
    avatarFg: 'var(--color-sf-fg-avatar-blue)',
  }));

  // Show the alert block when (a) the user has attempted submit
  // at least once, (b) there are errors, and (c) the user has
  // not visually dismissed it.
  const showAlert =
    submitAttempted && errors.length > 0 && !alertDismissed;

  // Live per-field validation: a field is "live" only after
  // the user has touched it (blurred at least once) so pristine
  // fields never flash an error.
  const fromInvalid = touched.from && isFieldInvalid('from');
  const toInvalid = touched.to && isFieldInvalid('to');
  const notesInvalid = touched.notes && isFieldInvalid('notes');
  const ackFromInvalid = touched.ackFrom && isFieldInvalid('ackFrom');
  const ackToInvalid = touched.ackTo && isFieldInvalid('ackTo');
  const fromSuccess = isFieldSuccess('from');
  const toSuccess = isFieldSuccess('to');
  const notesSuccess = isFieldSuccess('notes');
  const ackFromSuccess = isFieldSuccess('ackFrom');
  const ackToSuccess = isFieldSuccess('ackTo');

  return (
    <div className="handover-form" data-handover-form="true" ref={formRef}>
      {/* <HeaderTemplate
        sourceAssetLocked={sourceAssetLocked}
        lockedAsset={lockedAsset}
      /> */}

      <div className="handover-form__scroll">
        <div className="handover-form__body">
          <FormAlert
            errors={errors}
            onDismiss={() => setAlertDismissed(true)}
          />

          {/* Section 1 — Asset & custody (what & who) */}
          <section
            className="handover-dialog__section"
            aria-labelledby="handover-dialog-section-1"
            data-section="custody"
          >
            <h3
              className="handover-dialog__section-title"
              id="handover-dialog-section-1"
            >
              Asset &amp; custody
            </h3>
            <p className="handover-dialog__section-hint">
              Identify the asset being handed over and confirm the
              current custodian + recipient.
            </p>

            {sourceAssetLocked && previewAsset ? (
              <AssetPreviewCard asset={previewAsset} />
            ) : (
              <div className="handover-dialog__field handover-dialog__field--full">
                <label
                  className="handover-dialog__label"
                  htmlFor={SOURCE_DDL_ID}
                  data-required="true"
                >
                  <span>Source asset</span>
                  <span
                    className="handover-dialog__required"
                    aria-hidden="true"
                  >
                    *
                  </span>
                </label>
                <DropDownListComponent
                  id={SOURCE_DDL_ID}
                  cssClass="handover-dialog__input"
                  dataSource={
                    sourceAssetDataSource as unknown as {
                      [key: string]: object;
                    }[]
                  }
                  fields={{ text: 'label', value: 'id' }}
                  value={form.sourceAssetId}
                  change={handleSourceAssetChange}
                  placeholder="Select the asset to hand over"
                  allowFiltering
                />
              </div>
            )}

            <div className="handover-dialog__people">
              <PersonField
                id={FROM_DDL_ID}
                label="From (current custodian)"
                placeholder="Select current custodian"
                value={form.from}
                onChange={(v) =>
                  setFrom(v)
                }
                onBlur={() => setTouched('from')}
                people={peopleFixture.people}
                required
                invalid={fromInvalid}
                success={fromSuccess}
                invalidHint="Select a custodian."
                describedBy={`${FROM_DDL_ID}-help`}
              />
              <PersonField
                id={TO_DDL_ID}
                label="To (recipient)"
                placeholder="Select recipient…"
                value={form.to}
                onChange={(v) =>
                  setTo(v)
                }
                onBlur={() => setTouched('to')}
                people={peopleFixture.people}
                required
                invalid={toInvalid}
                success={toSuccess}
                invalidHint={
                  form.to && form.to === form.from
                    ? 'Recipient cannot match the current custodian.'
                    : 'Select a recipient.'
                }
                includeEmptyOption
                emptyLabel="Select recipient…"
                describedBy={`${TO_DDL_ID}-help`}
              />
            </div>
          </section>

          {/* Section 2 — Transfer details (how) */}
          <section
            className="handover-dialog__section"
            aria-labelledby="handover-dialog-section-2"
            data-section="transfer"
          >
            <h3
              className="handover-dialog__section-title"
              id="handover-dialog-section-2"
            >
              Transfer details
            </h3>
            <p className="handover-dialog__section-hint">
              Choose a reason, capture the asset condition, and list
              any accessories that travel with the handover.
            </p>

            <div className="handover-dialog__field handover-dialog__field--full">
              <span className="handover-dialog__label">Reason</span>
              <ReasonChips
                value={form.reason}
                onChange={handleReasonChange}
              />
            </div>

            <div className="handover-dialog__field handover-dialog__field--full">
              <span className="handover-dialog__label">Condition</span>
              <ConditionCards
                value={form.condition}
                onChange={handleConditionChange}
                onBlur={() => setTouched('condition')}
              />
            </div>

            <NotesField
              value={form.notes}
              condition={form.condition}
              onChange={(v: string) => {
                handleNotesChange({ value: v });
              }}
              onBlur={() => setTouched('notes')}
              onDraft={handleDraftNotes}
              errored={submitAttempted}
              liveInvalid={notesInvalid}
              liveSuccess={notesSuccess}
            />

            <div className="handover-dialog__field handover-dialog__field--full">
              <span className="handover-dialog__label">Accessories</span>
              <AccessoryChips
                value={form.accessories}
                onToggle={toggleAccessory}
                onBlur={() => setTouched('accessories')}
              />
            </div>
          </section>

          {/* Section 3 — Acknowledgment (consent) */}
          <section
            className="handover-dialog__section"
            aria-labelledby="handover-dialog-section-3"
            data-section="acknowledgment"
          >
            <h3
              className="handover-dialog__section-title"
              id="handover-dialog-section-3"
            >
              Acknowledgment
            </h3>
            <p className="handover-dialog__section-hint">
              Both parties must confirm the handover before it can
              be submitted.
            </p>
            <div className="handover-dialog__agreements">
              <AcknowledgementRow
                person={selectedFromPerson}
                kind="from"
                checked={form.ackFrom}
                onChange={handleAckFromChange}
                onBlur={() => setTouched('ackFrom')}
                invalid={ackFromInvalid}
                success={ackFromSuccess}
              />
              <AcknowledgementRow
                person={selectedToPerson}
                kind="to"
                checked={form.ackTo}
                onChange={handleAckToChange}
                onBlur={() => setTouched('ackTo')}
                invalid={ackToInvalid}
                success={ackToSuccess}
              />
            </div>
          </section>
        </div>
      </div>

      {/* Hidden submit bridge — the form still exposes a stable
         `[data-handover-submit]` element so existing callers (keyboard
         shortcut, dev harnesses) keep working. The visible Submit
         CTA now lives inside this container and is rendered directly
         by the form. */}
      <div className="handover-form__footer">
        <button
          type="button"
          className="handover-form__submit-bridge"
          aria-hidden="true"
          tabIndex={-1}
          onClick={handleSubmit}
          data-handover-submit="true"
          disabled={!canSubmit}
        />
        <ButtonComponent
          cssClass="btn btn--primary handover-form__footer-submit"
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label="Submit handover"
        >
          Submit handover
        </ButtonComponent>
      </div>
    </div>
  );
};

export default HandoverForm;
