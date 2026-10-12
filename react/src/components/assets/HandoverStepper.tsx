// Handover stepper — the section progress rail between the
// three left-column section cards. The spec calls for a
// `SfStepper` in `linear` mode + `readOnly` so it acts as a
// passive indicator, not a navigation control.
//
// We render the stepper as a custom `<ol>` with a CSS rail
// for the same reason the activity timeline avoids
// `ejs-timeline`: Syncfusion's `Stepper` template engine
// drops React children for the per-step content. The
// component reads the `HandoverFormValidity` snapshot and
// colours each dot/connector based on completion.

import type { FC } from 'react';
import { Check } from 'lucide-react';
import type { HandoverFormValidity } from './HandoverForm';

export interface HandoverStepperProps {
  /** The latest validity snapshot. The stepper derives
   *  per-step completion from the `sections` map. */
  validity: HandoverFormValidity;
}

interface StepDescriptor {
  id: 'custody' | 'transfer' | 'acknowledgment';
  label: string;
  shortLabel: string;
}

const STEPS: StepDescriptor[] = [
  { id: 'custody', label: 'Asset & custody', shortLabel: 'Custody' },
  { id: 'transfer', label: 'Transfer details', shortLabel: 'Transfer' },
  { id: 'acknowledgment', label: 'Acknowledgment', shortLabel: 'Ack' },
];

const HandoverStepper: FC<HandoverStepperProps> = ({ validity }) => {
  const completedCount = STEPS.filter(
    (s) => validity.sections[s.id],
  ).length;
  const currentStep = STEPS.findIndex((s) => !validity.sections[s.id]);
  const activeIndex = currentStep === -1 ? STEPS.length - 1 : currentStep;

  return (
    <nav
      className="handover-stepper"
      aria-label="Handover progress"
      data-completed={completedCount}
    >
      <ol className="handover-stepper__list">
        {STEPS.map((step, idx) => {
          const done = validity.sections[step.id];
          const isActive = idx === activeIndex;
          const stateClass = done
            ? 'is-done'
            : isActive
              ? 'is-active'
              : 'is-pending';
          return (
            <li
              key={step.id}
              className={`handover-stepper__step ${stateClass}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <span
                className="handover-stepper__dot"
                aria-hidden="true"
              >
                {done ? (
                  <Check size={12} strokeWidth={3} />
                ) : (
                  <span className="handover-stepper__dot-number">
                    {idx + 1}
                  </span>
                )}
              </span>
              <span className="handover-stepper__label">
                {step.label}
              </span>
              {idx < STEPS.length - 1 ? (
                <span
                  className="handover-stepper__connector"
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="handover-stepper__summary" aria-live="polite">
        Step {Math.min(completedCount + 1, STEPS.length)} of{' '}
        {STEPS.length} · {completedCount} complete
      </p>
    </nav>
  );
};

export default HandoverStepper;
