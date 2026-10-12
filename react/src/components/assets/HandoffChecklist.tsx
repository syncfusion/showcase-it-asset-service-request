// Handoff checklist — the right-rail live-computed list of
// validation rules that mirrors the dialog's existing
// `useHandoverDialog` validation. The component is purely
// presentational: it consumes the `HandoverFormValidity`
// snapshot the page passes down and re-renders each rule's
// checkbox as either `checked` (success token) or unchecked
// (idle token). Tooltips on each rule explain the condition
// in a one-liner so the user gets the same content they'd
// see in the form-level alert, but in a more compact format.
//
// The checklist is intentionally tied to the same rules the
// dialog enforces. When the rules change in
// `useHandoverDialog.ts`, update this list to match — the
// order is the same order the form-level alert renders.
//
// Each row is a `<li>` with a leading checkbox (read-only
// `SfCheckBoxComponent`), label, and tooltip wrapper. We use
// the Syncfusion `CheckBoxComponent` here so the look matches
// the form's `AcknowledgementRow` checkbox exactly, but with
// `disabled` + `readonly` so the user can't toggle it.

import type { FC, ReactElement } from 'react';
import { Check, Info } from 'lucide-react';
import { CheckBoxComponent } from '@syncfusion/ej2-react-buttons';
import { TooltipComponent } from '@syncfusion/ej2-react-popups';
import type { HandoverFormValidity } from './HandoverForm';

export interface HandoffChecklistProps {
  /** The latest validity snapshot the form emitted via
   *  `onValidityChange`. The checklist re-derives each row
   *  from this snapshot — no internal validity logic. */
  validity: HandoverFormValidity;
  /** Whether the source asset is locked (i.e. preselected
   *  via `?asset=<id>`) or whether the user still needs to
   *  pick one. The first checklist row's rule text
   *  adapts. */
  sourceAssetLocked: boolean;
}

interface ChecklistRow {
  /** Stable id used as React `key` + DOM id (for the
   *  tooltip's target). */
  id: string;
  /** Human-readable label. */
  label: string;
  /** One-line tooltip explaining the rule. */
  hint: string;
  /** Whether the rule currently passes. */
  done: boolean;
}

/**
 * Handoff checklist — the live-computed list of validation
 * rules the right rail shows alongside the form. Each row
 * tracks a single rule; the row's `done` flag drives the
 * checkbox + check-mark rendering.
 */
const HandoffChecklist: FC<HandoffChecklistProps> = ({
  validity,
  sourceAssetLocked,
}) => {
  const rows = buildRows(validity, sourceAssetLocked);
  const completed = rows.filter((r) => r.done).length;
  const total = rows.length;
  const allDone = completed === total;

  return (
    <section
      className="handoff-checklist"
      aria-labelledby="handoff-checklist-title"
    >
      <header className="handoff-checklist__header">
        <h3
          className="handoff-checklist__title"
          id="handoff-checklist-title"
        >
          Handoff checklist
        </h3>
        <span
          className={`handoff-checklist__counter${allDone ? ' is-complete' : ''}`}
          aria-live="polite"
        >
          {completed} / {total}
        </span>
      </header>

      <ul
        className="handoff-checklist__list"
        aria-live="polite"
        aria-relevant="text"
      >
        {rows.map((row) => (
          <li
            key={row.id}
            className={`handoff-checklist__row${row.done ? ' is-done' : ''}`}
            data-rule-id={row.id}
          >
            <TooltipComponent
              content={row.hint}
              target={`#handoff-checklist-target-${row.id}`}
              position="LeftCenter"
              showTipPointer
            >
              <span
                className="handoff-checklist__checkbox"
                id={`handoff-checklist-target-${row.id}`}
                aria-hidden="true"
              >
                <CheckBoxComponent
                  checked={row.done}
                  disabled
                  cssClass="handoff-checklist__cb"
                />
              </span>
            </TooltipComponent>
            <span className="handoff-checklist__label">
              {row.done ? (
                <Check
                  size={14}
                  strokeWidth={2.5}
                  className="handoff-checklist__check"
                  aria-hidden="true"
                />
              ) : (
                <Info
                  size={14}
                  strokeWidth={1.75}
                  className="handoff-checklist__info"
                  aria-hidden="true"
                />
              )}
              <span>{row.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default HandoffChecklist;

/* -------------------------------------------------------------------------- */

/**
 * Build the rule list from the latest validity snapshot.
 * The order here matches the form-level alert's order so a
 * failing rule reads the same way in both places. Each rule
 * only depends on the form state — never on the right rail
 * or any external source of truth.
 */
function buildRows(
  validity: HandoverFormValidity,
  sourceAssetLocked: boolean,
): ChecklistRow[] {
  const hasAsset = validity.sourceAssetId.trim() !== '';
  const hasFrom = validity.sections.custody;
  const toSet =
    validity.completedSteps >= 1 ||
    (validity.errorCount > 0 && !validity.sections.custody);
  void toSet;
  void sourceAssetLocked;

  return [
    {
      id: 'asset-selected',
      label: 'Asset selected',
      hint: 'Pick a source asset from the dropdown (or use ?asset=<id> in the URL).',
      done: hasAsset,
    },
    {
      id: 'transfer-details',
      label: 'Transfer details complete',
      hint: 'Reason, condition, accessories, and (when condition is Damaged) condition notes are all set.',
      done: validity.sections.transfer,
    },
    {
      id: 'ack-from',
      label: 'From acknowledgement',
      hint: 'The current custodian must acknowledge the handover before submit.',
      done: validity.acknowledgment.from,
    },
    {
      id: 'ack-to',
      label: 'To acknowledgement',
      hint: 'Auto-confirmed the moment a recipient is selected.',
      done: validity.acknowledgment.to,
    },
    {
      id: 'effective-range',
      label: 'Ready to submit',
      hint: 'Every required field is valid. The submit button is enabled.',
      done: validity.isValid,
    },
  ];
}
