import type { FC } from 'react';
import KpiCard from './KpiCard';
import type { Kpi, KpiId } from '../../types/dashboard';
import './KpiCard.css';

export interface KpiStripProps {
  kpis: Kpi[];
  onActivate?: (kpiId: KpiId) => void;
}

/**
 * Renders the four KPI summary cards at the top of the dashboard.
 * Activations are dispatched to `onActivate(kpiId)` which the
 * dashboard wires into its toast surface.
 */
const KpiStrip: FC<KpiStripProps> = ({ kpis, onActivate }) => {
  return (
    <div className="kpi-strip" role="list" aria-label="Key performance indicators">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} onActivate={onActivate} />
      ))}
    </div>
  );
};

export default KpiStrip;
