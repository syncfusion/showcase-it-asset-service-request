// Handover risk card — the right-rail "AI risk score" placeholder.
// The spec calls for a Syncfusion `SfLinearGauge` reading 0–100
// with a "Regenerate" CTA; the project does not currently ship
// `@syncfusion/ej2-react-lineargauge`, so we render a token-driven
// CSS progress bar that mirrors the same visual + a11y surface.
// The component is intentionally a placeholder: a click on
// "Regenerate" fires a synthetic toast and rolls a new
// pseudo-random score in the [0..40] "low" band so the
// percentage moves convincingly without inventing a real model.
//
// The card stays out of the data path: no real model,
// no real telemetry. Just enough visual to make the
// "AI risk" affordance discoverable for a future wire.

import { useCallback, useState } from 'react';
import type { FC } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { MessageComponent } from '@syncfusion/ej2-react-notifications';

export interface HandoverRiskCardProps {
  /**
   * Page-level toast pipeline. The "Regenerate" CTA calls
   * this with an `info` payload so the existing page toast
   * surface shows the "Risk model recalculating…" copy.
   */
  onShowToast?: (payload: { kind: 'info'; title: string; text?: string }) => void;
  /**
   * Optional initial score. Defaults to `12` to match the
   * "Handover risk: Low (12)" copy the spec calls for. Kept
   * configurable so the page can re-seed the score when the
   * preselected asset changes (the placeholder is not
   * wired to a real model, but the visual should re-key on
   * asset change so the user doesn't see a stale score
   * across two handovers in a row).
   */
  initialScore?: number;
}

const LOW_BAND = 40;
const MEDIUM_BAND = 70;

/** Map a 0..100 score to a human-readable label + token. */
function bandFor(score: number): { label: string; tone: 'low' | 'medium' | 'high' } {
  if (score < LOW_BAND) return { label: 'Low', tone: 'low' };
  if (score < MEDIUM_BAND) return { label: 'Medium', tone: 'medium' };
  return { label: 'High', tone: 'high' };
}

const HandoverRiskCard: FC<HandoverRiskCardProps> = ({
  onShowToast,
  initialScore = 12,
}) => {
  const [score, setScore] = useState<number>(clampScore(initialScore));
  const [busy, setBusy] = useState<boolean>(false);

  const handleRegenerate = useCallback(() => {
    if (busy) return;
    setBusy(true);
    if (typeof onShowToast === 'function') {
      onShowToast({
        kind: 'info',
        title: 'Risk model recalculating…',
        text: 'This may take a few seconds.',
      });
    }
    // Roll a new score in the [0..40] "low" band after a
    // short delay so the user sees the progress bar
    // visually update. The delay is intentionally short
    // (450ms) — long enough to feel like a re-compute,
    // short enough to not block the form.
    window.setTimeout(() => {
      const next = Math.floor(Math.random() * LOW_BAND);
      setScore(clampScore(next));
      setBusy(false);
    }, 450);
  }, [busy, onShowToast]);

  const band = bandFor(score);

  return (
    <section
      className="handover-risk-card"
      aria-labelledby="handover-risk-card-title"
    >
      <header className="handover-risk-card__header">
        <span className="handover-risk-card__icon" aria-hidden="true">
          <ShieldCheck size={16} strokeWidth={1.75} />
        </span>
        <div className="handover-risk-card__header-text">
          <h3
            className="handover-risk-card__title"
            id="handover-risk-card-title"
          >
            Handover risk
          </h3>
          <p className="handover-risk-card__subtitle">
            Sample AI risk score — placeholder.
          </p>
        </div>
      </header>

      <div className="handover-risk-card__score-row">
        <div
          className={`handover-risk-card__score-label is-${band.tone}`}
          aria-live="polite"
        >
          <span className="handover-risk-card__score-band">{band.label}</span>
          <span className="handover-risk-card__score-divider" aria-hidden="true">
            ·
          </span>
          <span className="handover-risk-card__score-value">{score}</span>
          <span className="handover-risk-card__score-unit">/100</span>
        </div>
      </div>

      {/* Custom progress bar — `SfLinearGauge` is not
          installed. Mirrors the same a11y + token usage so
          the gauge can be swapped in later without any
          layout churn. */}
      <div
        className={`handover-risk-card__gauge is-${band.tone}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label={`Handover risk score: ${band.label} (${score} of 100)`}
      >
        <div
          className="handover-risk-card__gauge-fill"
          style={{ width: `${score}%` }}
        />
        <div
          className="handover-risk-card__gauge-marker"
          style={{ left: `${LOW_BAND}%` }}
          aria-hidden="true"
          title="Low / Medium boundary"
        />
        <div
          className="handover-risk-card__gauge-marker"
          style={{ left: `${MEDIUM_BAND}%` }}
          aria-hidden="true"
          title="Medium / High boundary"
        />
      </div>

      <div className="handover-risk-card__legend" aria-hidden="true">
        <span className="handover-risk-card__legend-item is-low">0��39</span>
        <span className="handover-risk-card__legend-item is-medium">40–69</span>
        <span className="handover-risk-card__legend-item is-high">70–100</span>
      </div>

      <MessageComponent
        id="handover-risk-card-warning"
        severity="Warning"
        cssClass="handover-risk-card__message"
        showCloseIcon={false}
        content="This score is a placeholder. The risk model is reserved for a future change."
      />

      <div className="handover-risk-card__actions">
        <ButtonComponent
          cssClass="handover-risk-card__regen"
          onClick={handleRegenerate}
          disabled={busy}
          aria-label="Regenerate risk score"
        >
          <RefreshCw
            size={14}
            strokeWidth={1.75}
            className={busy ? 'is-spinning' : ''}
            aria-hidden="true"
          />
          {busy ? 'Recalculating…' : 'Regenerate'}
        </ButtonComponent>
      </div>
    </section>
  );
};

export default HandoverRiskCard;

/* -------------------------------------------------------------------------- */

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}
