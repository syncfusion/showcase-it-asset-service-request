import { useEffect, useRef } from 'react';
import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';
import type { Toast, ToastKind } from '../../types/dashboard';
import './assets.css';

const KIND_TO_ICON: Record<ToastKind, LucideIcon> = {
  success: CheckCircle2,
  info: Info,
  error: AlertCircle,
};

export interface AssetsToastProps {
  toast: Toast | null;
  onDismiss?: () => void;
}

/**
 * Token-driven toast surface local to the assets folder. Mirrors the
 * dashboard's `DashboardToast` API — accepts the same
 * `{ id, title, text?, kind = 'success' }` shape and shows it for
 * ~2.4s before auto-dismissing. The container is positioned
 * bottom-right inside the page body via `.assets-toast-stack` in
 * `assets.css`.
 */
const AssetsToast: FC<AssetsToastProps> = ({ toast, onDismiss }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return undefined;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (typeof onDismiss === 'function') onDismiss();
    }, 2400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, onDismiss]);

  if (!toast) return null;
  const Icon: LucideIcon = KIND_TO_ICON[toast.kind] ?? Info;

  return (
    <div
      className={`dashboard-toast dashboard-toast--${toast.kind ?? 'success'}`}
      role="status"
      aria-live="polite"
      data-toast-id={toast.id}
    >
      <span className="dashboard-toast__icon" aria-hidden="true">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <div className="dashboard-toast__body">
        <div className="dashboard-toast__title">{toast.title}</div>
        {toast.text ? (
          <div className="dashboard-toast__text">{toast.text}</div>
        ) : null}
      </div>
    </div>
  );
};

export default AssetsToast;
